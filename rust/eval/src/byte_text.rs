//! Canonical fixed-width byte text fixture answers.
use crate::reader::{members, required, text, texts};
use loops::{base32, json::Json};

pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "byte-text" {
        return Err(format!("unknown layer {layer}"));
    }
    let kvs = members("input", &["bytes", "prefix", "texts"], input)?;
    let count = required("input", kvs, "bytes")?;
    let n = match count {
        Json::Int(value) => value.to_string(),
        _ => return Err("input.bytes: expected a nonnegative byte count".into()),
    };
    if n.starts_with('-') {
        return Err("input.bytes: expected a nonnegative byte count".into());
    }
    let prefix = text("input.prefix", required("input", kvs, "prefix")?)?;
    let strings = texts("input.texts", required("input", kvs, "texts")?)?;
    let accepted = strings
        .iter()
        .map(|s| {
            Json::Bool(
                s.strip_prefix(prefix)
                    .and_then(base32::decode)
                    .is_some_and(|b| b.len().to_string() == n),
            )
        })
        .collect();
    Ok(vec![Json::Obj(vec![(
        "accepted".into(),
        Json::Arr(accepted),
    )])])
}
