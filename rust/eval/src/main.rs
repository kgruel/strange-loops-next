//! `Gen.Run --batch` process boundary; I/O failures are fatal.
use loops::json::Json;
use std::{
    env, fs,
    io::{self, Write},
    path::{Path, PathBuf},
    process::ExitCode,
};

fn json_files(dir: &Path, out: &mut Vec<PathBuf>) -> io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if entry.file_type()?.is_dir() {
            json_files(&path, out)?;
        } else if path.extension().is_some_and(|e| e == "json") {
            out.push(path);
        }
    }
    Ok(())
}
fn batch(dir: &Path, output: &mut impl Write) -> io::Result<()> {
    if !fs::metadata(dir)?.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            format!("not a directory: {}", dir.display()),
        ));
    }
    let mut files = Vec::new();
    json_files(dir, &mut files)?;
    files.sort();
    for file in files {
        let source = fs::read_to_string(&file)?;
        let name = file
            .to_str()
            .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "non-UTF8 file path"))?;
        let mut members = vec![("file".into(), Json::Str(name.into()))];
        members.push(match loops_eval::evaluate(&source) {
            Ok(answer) => ("expect".into(), answer),
            Err(error) => ("error".into(), Json::Str(error.to_string())),
        });
        writeln!(output, "{}", Json::Obj(members).canon())?;
    }
    output.flush()
}
fn run() -> io::Result<()> {
    let args: Vec<_> = env::args_os().skip(1).collect();
    match args.as_slice() {
        [flag, dir] if flag == "--batch" => {
            batch(Path::new(dir), &mut io::BufWriter::new(io::stdout().lock()))
        }
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "usage: loops-eval --batch <dir>",
        )),
    }
}
#[expect(
    clippy::print_stderr,
    reason = "The CLI reports fatal process errors to stderr."
)]
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("loops-eval: {error}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::batch;
    use std::{io, path::Path};

    struct BrokenOutput;
    impl io::Write for BrokenOutput {
        fn write(&mut self, _: &[u8]) -> io::Result<usize> {
            Err(io::Error::new(
                io::ErrorKind::BrokenPipe,
                "test output closed",
            ))
        }
        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn output_io_errors_are_fatal_not_decoder_rows() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vectors/fold");
        assert_eq!(
            batch(&dir, &mut BrokenOutput)
                .expect_err("broken output")
                .kind(),
            io::ErrorKind::BrokenPipe
        );
    }
}
