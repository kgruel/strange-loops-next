//! Env validation and canonical wire data from model/Loops/Envelope.lean.
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
