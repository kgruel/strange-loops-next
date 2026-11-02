//! Raw JSON decoding shared by envelope and batch input boundaries.
use crate::{base32, json::Json};

/// A raw input decoding error, separate from typed writer refusals.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Error(pub(crate) String);

impl From<String> for Error {
    fn from(message: String) -> Self {
        Self(message)
    }
}
impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for Error {}

/// Loops.Read.members? (model/Loops/Read.lean), duplicates before unknown members.
pub(crate) fn members<'a>(
    path: &str,
    allowed: &[&str],
    j: &'a Json,
) -> Result<&'a [(String, Json)], Error> {
    let Json::Obj(kvs) = j else {
        return Err(Error(format!("{path}: expected object")));
    };
    // Loops.Read.object checks duplicates before members? checks unknown keys.
    for (i, (k, _)) in kvs.iter().enumerate() {
        if kvs[..i].iter().any(|(earlier, _)| earlier == k) {
            return Err(Error(format!("{path}: duplicate member {k}")));
        }
    }
    for (k, _) in kvs {
        if !allowed.contains(&k.as_str()) {
            return Err(Error(format!("{path}: unknown member {k}")));
        }
    }
    Ok(kvs)
}
/// Loops.Read.req (model/Loops/Read.lean), no hidden fixture defaults.
pub(crate) fn required<'a>(
    path: &str,
    kvs: &'a [(String, Json)],
    name: &str,
) -> Result<&'a Json, Error> {
    optional(kvs, name).ok_or_else(|| Error(format!("{path}: missing {name}")))
}
pub(crate) fn optional<'a>(kvs: &'a [(String, Json)], name: &str) -> Option<&'a Json> {
    kvs.iter().find(|(k, _)| k == name).map(|(_, v)| v)
}
/// Loops.Read.list (model/Loops/Read.lean), strict array shape.
pub(crate) fn list<'a>(path: &str, j: &'a Json) -> Result<&'a [Json], Error> {
    match j {
        Json::Arr(xs) => Ok(xs),
        _ => Err(Error(format!("{path}: expected array"))),
    }
}
pub(crate) fn text<'a>(path: &str, j: &'a Json) -> Result<&'a str, Error> {
    match j {
        Json::Str(s) => Ok(s),
        _ => Err(Error(format!("{path}: expected text"))),
    }
}
pub(crate) fn texts(path: &str, j: &Json) -> Result<Vec<String>, Error> {
    list(path, j)?
        .iter()
        .enumerate()
        .map(|(i, j)| text(&format!("{path}[{i}]"), j).map(str::to_owned))
        .collect()
}
/// Loops.Read.unbase32 (model/Loops/Read.lean), canonical lowercase byte spelling.
fn unbase32(path: &str, s: &str) -> Result<Vec<u8>, Error> {
    base32::decode(s).ok_or_else(|| Error(format!("{path}: noncanonical base32hex")))
}
/// Loops.Read.bytes (model/Loops/Read.lean), strict text and canonical byte decoding.
pub(crate) fn bytes(path: &str, j: &Json) -> Result<Vec<u8>, Error> {
    unbase32(path, text(path, j)?)
}
