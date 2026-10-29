//! The process boundary is input-only, deterministic, and separates decoding from I/O.
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
};

struct Directory(PathBuf);
impl Directory {
    fn new() -> Self {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        let path = std::env::temp_dir().join(format!(
            "loops-eval-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&path).expect("unique test directory");
        Self(path)
    }
    fn path(&self) -> &Path {
        &self.0
    }
}
impl Drop for Directory {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).expect("remove test directory");
    }
}

#[test]
fn recursive_sorted_jsonl_ignores_expect_and_keeps_decoder_errors() {
    let dir = Directory::new();
    fs::create_dir(dir.path().join("nested")).expect("nested directory");
    let valid = r#"{"layer":"fold/count","input":{"orders":[[]]},"expect":1e999}"#;
    fs::write(dir.path().join("z.json"), valid).expect("vector");
    fs::write(
        dir.path().join("a.json"),
        r#"{"layer":"unknown","input":{},"expect":0}"#,
    )
    .expect("refusal");
    fs::write(
        dir.path().join("nested/b.json"),
        valid.replace("1e999", r#"{"ignored":true}"#),
    )
    .expect("nested vector");
    fs::write(dir.path().join("nested/c.json"), "[").expect("bad JSON");
    fs::write(dir.path().join("ignored.txt"), "not JSON").expect("ignored extension");
    let output = Command::new(env!("CARGO_BIN_EXE_loops-eval"))
        .arg("--batch")
        .arg(dir.path())
        .output()
        .expect("run evaluator");
    assert!(output.status.success(), "{output:?}");
    assert_eq!(output.stderr, Vec::<u8>::new());
    let text = String::from_utf8(output.stdout).expect("UTF8 JSONL");
    assert!(text.ends_with('\n'));
    let lines: Vec<Value> = text
        .lines()
        .map(|line| serde_json::from_str(line).expect("JSONL"))
        .collect();
    assert_eq!(lines.len(), 4);
    for (row, file) in lines
        .iter()
        .zip(["a.json", "nested/b.json", "nested/c.json", "z.json"])
    {
        assert_eq!(
            row["file"],
            dir.path().join(file).to_str().expect("UTF8 path")
        );
        assert_eq!(row.as_object().expect("row object").len(), 2);
    }
    assert!(lines[0]["error"].is_string());
    assert_eq!(lines[1]["expect"], 0);
    assert!(lines[2]["error"].is_string());
    assert_eq!(lines[3]["expect"], 0);
}

#[test]
fn process_io_and_usage_fail_nonzero() {
    let dir = Directory::new();
    let binary = env!("CARGO_BIN_EXE_loops-eval");
    let missing = dir.path().join("missing");
    let file = dir.path().join("input.json");
    fs::write(&file, "null").expect("file");
    for args in [
        vec![],
        vec!["--help".into()],
        vec!["--batch".into()],
        vec!["--batch".into(), missing.into_os_string()],
        vec!["--batch".into(), file.into_os_string()],
    ] {
        let output = Command::new(binary)
            .args(args)
            .output()
            .expect("run evaluator");
        assert!(!output.status.success());
        assert_ne!(output.stderr, Vec::<u8>::new());
    }
    // This is a file read failure, not a syntactically malformed JSON string.
    fs::write(dir.path().join("invalid-utf8.json"), [0xff]).expect("invalid UTF8");
    let output = Command::new(binary)
        .arg("--batch")
        .arg(dir.path())
        .output()
        .expect("run evaluator");
    assert!(!output.status.success());
    assert_ne!(output.stderr, Vec::<u8>::new());
}
