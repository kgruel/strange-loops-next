use loops::json::Json;
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(crate) fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vectors")
}
pub(crate) fn json_files(dir: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    for entry in fs::read_dir(dir).expect("vector directory") {
        let path = entry.expect("directory entry").path();
        if path.is_dir() {
            files.extend(json_files(&path));
        } else if path.extension().is_some_and(|e| e == "json") {
            files.push(path);
        }
    }
    files.sort();
    files
}

/// Test-only OUTPUT decoding: integral lexemes are exact Lean Ints. Using the
/// production binary64 INPUT decoder here would round valid large fold sums.
pub(crate) fn expected(v: &Value) -> Json {
    match v {
        Value::Null => Json::Null,
        Value::Bool(b) => Json::Bool(*b),
        Value::String(s) => Json::Str(s.clone()),
        Value::Array(xs) => Json::Arr(xs.iter().map(expected).collect()),
        Value::Object(kvs) => {
            Json::Obj(kvs.iter().map(|(k, v)| (k.clone(), expected(v))).collect())
        }
        Value::Number(n) => {
            let raw = n.to_string();
            if raw.contains(['.', 'e', 'E']) {
                loops_eval::parse_json(&raw).expect("finite expected number")
            } else {
                Json::Int(raw.parse().expect("exact expected Int"))
            }
        }
    }
}
