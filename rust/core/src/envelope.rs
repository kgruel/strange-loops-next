//! Env validation and canonical wire data from model/Loops/Envelope.lean.
use crate::{
    json::{self, Json},
    occurred,
    stored::Error,
    time,
};

/// Env (model/Loops/Envelope.lean): raw lists remain lists until toJson canonicalizes sets.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Env {
    /// Env.kind.
    pub kind: String,
    /// Env.observer.
    pub observer: String,
    /// Env.emitted.
    pub emitted: String,
    /// Env.occurred.
    pub occurred: Option<String>,
    /// Env.about.
    pub about: Vec<String>,
    /// Env.prev.
    pub prev: Vec<String>,
    /// Env.under.
    pub under: Option<String>,
    /// Env.erases.
    pub erases: Vec<String>,
}
/// typedRef (model/Loops/Envelope.lean); Lean Char.isLower/isDigit are ASCII predicates.
pub fn typed_ref(s: &str) -> bool {
    let Some((prefix, value)) = s.split_once(':') else {
        return false;
    };
    let mut chars = prefix.bytes();
    !value.is_empty()
        && chars.next().is_some_and(|c| c.is_ascii_lowercase())
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}
/// recordId (model/Loops/Envelope.lean); validates alphabet/length, not final padding bits.
pub fn record_id(s: &str) -> bool {
    s.strip_prefix("r:").is_some_and(|rest| {
        rest.len() == 52
            && rest
                .bytes()
                .all(|c| c.is_ascii_lowercase() || (b'2'..=b'7').contains(&c))
    })
}
impl Env {
    /// Env.toJson (model/Loops/Envelope.lean): nonempty sorted sets, optional fields omitted.
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
    /// Env.problem (model/Loops/Envelope.lean), in its exact first-refusal order.
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
