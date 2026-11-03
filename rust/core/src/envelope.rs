//! Env validation and canonical wire data from model/Loops/Envelope.lean.
use crate::read::{members, optional, required, text, texts};
use crate::{
    json::{self, Json},
    occurred,
    stored::Error,
    time,
};

/// The raw envelope has an unknown field.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ShapeError;

impl std::fmt::Display for ShapeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("envelope-field-unknown")
    }
}
impl std::error::Error for ShapeError {}

/// Checks raw envelope member names without inspecting values.
///
/// # Errors
/// Returns `ShapeError` if any member name is unknown.
pub fn check_keys<'a>(keys: impl IntoIterator<Item = &'a str>) -> Result<(), ShapeError> {
    const KEYS: &[&str] = &[
        "kind", "observer", "emitted", "occurred", "about", "prev", "under", "erases",
    ];
    if keys.into_iter().any(|key| !KEYS.contains(&key)) {
        Err(ShapeError)
    } else {
        Ok(())
    }
}

/// Checks all raw envelopes before any value decoding.
///
/// # Errors
/// Returns a shape error if any object has an unknown envelope field.
pub fn check_all_keys<'a>(envs: impl IntoIterator<Item = &'a Json>) -> Result<(), ShapeError> {
    for env in envs {
        if let Json::Obj(fields) = env {
            check_keys(fields.iter().map(|(key, _)| key.as_str()))?;
        }
    }
    Ok(())
}

/// Decodes one raw envelope, checking its keys before its values.
///
/// # Errors
/// Returns a raw input error for duplicate or unknown keys or invalid values.
pub fn read(path: &str, j: &Json) -> Result<Env, crate::read::Error> {
    if let Json::Obj(raw) = j {
        check_keys(raw.iter().map(|(k, _)| k.as_str()))
            .map_err(|e| crate::read::Error::from(e.to_string()))?;
    }
    decode_values(path, j)
}

/// Decodes variants. A singleton uses the one-envelope boundary directly.
///
/// # Errors
/// Returns a raw input error for invalid keys, shapes or values.
pub fn read_all(path: &str, j: &Json) -> Result<Vec<Env>, crate::read::Error> {
    let raw = crate::read::list(path, j)?;
    if let [one] = raw {
        return Ok(vec![read(&format!("{path}[0]"), one)?]);
    }
    check_all_keys(raw).map_err(|e| crate::read::Error::from(e.to_string()))?;
    raw.iter()
        .enumerate()
        .map(|(i, j)| decode_values(&format!("{path}[{i}]"), j))
        .collect()
}

pub(crate) fn decode_values(path: &str, j: &Json) -> Result<Env, crate::read::Error> {
    let Json::Obj(raw) = j else {
        return Err(crate::read::Error::from(format!("{path}: expected object")));
    };
    let names: Vec<_> = raw.iter().map(|(k, _)| k.as_str()).collect();
    let kvs = members(path, &names, j)?;
    let required_text =
        |k: &str| text(&format!("{path}.{k}"), required(path, kvs, k)?).map(str::to_owned);
    let optional_text = |k: &str| {
        optional(kvs, k)
            .map(|v| text(&format!("{path}.{k}"), v).map(str::to_owned))
            .transpose()
    };
    let array = |k: &str| {
        optional(kvs, k)
            .map(|v| texts(&format!("{path}.{k}"), v))
            .transpose()
            .map(Option::unwrap_or_default)
    };
    let kind = required_text("kind")?;
    let observer = required_text("observer")?;
    let emitted = required_text("emitted")?;
    let occurred = optional_text("occurred")?;
    let under = optional_text("under")?;
    Ok(Env {
        kind,
        observer,
        emitted,
        occurred,
        about: array("about")?,
        prev: array("prev")?,
        under,
        erases: array("erases")?,
    })
}

/// Lean: `Loops.Env`, model/Loops/Envelope.lean.
/// An unchecked writer envelope keeps text spellings and raw lists.
/// Only `to_json` sorts its set fields and removes repeats.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Env {
    /// The name for the record's kind.
    pub kind: String,
    /// The typed reference for the observer who emits the record.
    pub observer: String,
    /// The observer's current time in UTC.
    pub emitted: String,
    /// The observer's claim about past time, if any.
    pub occurred: Option<String>,
    /// The typed references for the things this record concerns.
    pub about: Vec<String>,
    /// The text ids of the records this record supersedes.
    pub prev: Vec<String>,
    /// The text id of the grant this record uses, if any.
    pub under: Option<String>,
    /// The text ids of the records whose payloads this record erases.
    pub erases: Vec<String>,
}
/// Lean: `Loops.typedRef`, model/Loops/Envelope.lean.
/// Checks a lowercase ASCII prefix and a nonempty value after the first colon.
pub fn typed_ref(s: &str) -> bool {
    let Some((prefix, value)) = s.split_once(':') else {
        return false;
    };
    let mut chars = prefix.bytes();
    !value.is_empty()
        && chars.next().is_some_and(|c| c.is_ascii_lowercase())
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}
/// Lean: `Loops.recordId`, model/Loops/Envelope.lean.
/// Checks the `r:` prefix and canonical encoding of a 32-byte digest.
pub fn record_id(s: &str) -> bool {
    s.strip_prefix("r:")
        .and_then(crate::base32::decode)
        .is_some_and(|bytes| bytes.len() == 32)
}
impl Env {
    /// Lean: `Loops.Env.toJson`, model/Loops/Envelope.lean.
    /// Writes the envelope, sorts its set fields, and removes repeats.
    /// Omits empty sets and optional fields with no value.
    pub fn to_json(&self) -> Json {
        let mut xs = vec![
            ("kind".into(), Json::Str(self.kind.clone())),
            ("observer".into(), Json::Str(self.observer.clone())),
            ("emitted".into(), Json::Str(self.emitted.clone())),
        ];
        if let Some(s) = &self.occurred {
            xs.push(("occurred".into(), Json::Str(s.clone())));
        }
        for (k, values) in [("about", &self.about), ("prev", &self.prev)] {
            if !values.is_empty() {
                xs.push((
                    k.into(),
                    Json::Arr(json::canon_set(values).into_iter().map(Json::Str).collect()),
                ));
            }
        }
        if let Some(s) = &self.under {
            xs.push(("under".into(), Json::Str(s.clone())));
        }
        if !self.erases.is_empty() {
            xs.push((
                "erases".into(),
                Json::Arr(
                    json::canon_set(&self.erases)
                        .into_iter()
                        .map(Json::Str)
                        .collect(),
                ),
            ));
        }
        Json::Obj(xs)
    }
    /// Lean: `Loops.Env.problem`, model/Loops/Envelope.lean.
    /// Returns the first envelope refusal in protocol check order.
    pub fn problem(&self) -> Option<Error> {
        if self.kind.is_empty() {
            Some(Error::KindEmpty)
        } else if !typed_ref(&self.observer) {
            Some(Error::ObserverNotTyped)
        } else if !time::valid_emitted(&self.emitted) {
            Some(Error::EmittedNotRfc3339)
        } else if self
            .occurred
            .as_deref()
            .is_some_and(|s| occurred::occurred_span(s).is_none())
        {
            Some(Error::OccurredNotSpan)
        } else if !self.about.iter().all(|s| typed_ref(s)) {
            Some(Error::AboutNotTyped)
        } else if !self.prev.iter().all(|s| record_id(s)) {
            Some(Error::PrevNotRecordId)
        } else if self.under.as_deref().is_some_and(|s| !record_id(s)) {
            Some(Error::UnderNotRecordId)
        } else if !self.erases.iter().all(|s| record_id(s)) {
            Some(Error::ErasesNotRecordId)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod raw_tests {
    use super::*;

    #[test]
    fn raw_shape_precedes_singleton_and_variant_values() {
        let unknown = Json::Obj(vec![("extra".into(), Json::Null)]);
        let number_kind = Json::Obj(vec![("kind".into(), Json::Int(7_i64.into()))]);
        for raw in [
            unknown.clone(),
            Json::Obj(vec![
                ("kind".into(), Json::Int(7_i64.into())),
                ("extra".into(), Json::Null),
            ]),
        ] {
            assert_eq!(
                read("env", &raw).expect_err("shape").to_string(),
                "envelope-field-unknown"
            );
            assert_eq!(
                read_all("envs", &Json::Arr(vec![raw]))
                    .expect_err("singleton shape")
                    .to_string(),
                "envelope-field-unknown"
            );
        }
        for malformed in [Json::Null, number_kind] {
            for raw in [
                vec![malformed.clone(), unknown.clone()],
                vec![unknown.clone(), malformed.clone()],
            ] {
                assert_eq!(
                    read_all("envs", &Json::Arr(raw))
                        .expect_err("all shape")
                        .to_string(),
                    "envelope-field-unknown"
                );
            }
        }
        let duplicate = Json::Obj(vec![
            ("extra".into(), Json::Null),
            ("extra".into(), Json::Null),
        ]);
        assert_eq!(
            read("env", &duplicate)
                .expect_err("raw shape first")
                .to_string(),
            "envelope-field-unknown"
        );
    }
}
