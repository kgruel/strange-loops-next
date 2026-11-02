//! Input-only fixture evaluator for the seven `Gen.Run` families.
//!
//! The pure `loops` crate owns the model. This boundary owns RFC 8259
//! decoding, fixture shape checks, SHA-256 and Ed25519. It does not read a
//! fixture's `expect`, route sources, or perform storage/network operations.
//! Arrival-order answers remain separate until agreement is checked.
mod batch;
mod fold;
mod json;
mod lens;
mod reader;
mod realm;
mod record;
mod scenario;
mod spec;

pub use json::parse_json;
use loops::json::Json;
use std::fmt;

/// A JSON syntax, fixture decoding, or arrival-order disagreement error.
/// Writer refusals are successful answers containing `refused`, not errors.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Error(String);
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for Error {}
impl From<String> for Error {
    fn from(message: String) -> Self {
        Self(message)
    }
}
impl From<serde_json::Error> for Error {
    fn from(error: serde_json::Error) -> Self {
        Self(error.to_string())
    }
}

/// Compute every arrival-order (or record variant/realm rotation) answer.
///
/// Accepts `record`, `fold/*`, `spec/{parse,run}`, `realm`, `scenario`,
/// `lens/section`, and `batch`; other layers fail closed. No expected answer
/// is supplied. Keeping all answers makes disagreement observable to callers.
///
/// # Errors
/// Returns malformed input/unknown-layer errors. It does not silently select
/// one answer when orders differ; use [`evaluate`] for checked agreement.
pub fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, Error> {
    let run = match layer.split('/').next() {
        Some("record") => record::answers,
        Some("fold") => fold::answers,
        Some("spec") => spec::answers,
        Some("realm") => realm::answers,
        Some("scenario") => scenario::answers,
        Some("lens") => lens::answers,
        Some("batch") => batch::answers,
        _ => return Err(Error(format!("layer: unknown layer {layer}"))),
    };
    run(layer, input).map_err(Error::from)
}

/// Evaluate a vector's `layer` and `input` only, checking all answers agree.
///
/// Metadata, including `expect`, is not used as an answer. Its strings are
/// validated as Unicode scalars without converting numbers. The envelope must be a
/// syntactically valid JSON object with distinct member names. Unknown
/// metadata is allowed, matching `Gen.Run.readVector`.
///
/// # Errors
/// Returns JSON/shape errors, empty answer lists, or differing order answers.
pub fn evaluate(text: &str) -> Result<Json, Error> {
    let envelope: json::Envelope = serde_json::from_str(text)?;
    for (name, value) in &envelope.0 {
        if name != "layer" && name != "input" {
            json::validate_metadata(value)?;
        }
    }
    let required = |name: &str| {
        envelope
            .0
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.get())
            .ok_or_else(|| Error(format!("the vector: missing {name}")))
    };
    let layer: String = serde_json::from_str(required("layer")?)?;
    let input = parse_json(required("input")?)?;
    let mut values = answers(&layer, &input)?.into_iter();
    let first = values
        .next()
        .ok_or_else(|| Error("input: no arrival order given".into()))?;
    let canonical = first.canon();
    for (i, value) in values.enumerate() {
        if value.canon() != canonical {
            return Err(Error(format!(
                "input.orders[{}]: gives a different answer than input.orders[0]",
                i + 1
            )));
        }
    }
    Ok(first)
}

#[cfg(test)]
fn parse(text: &str) -> Json {
    parse_json(text).expect("test input JSON")
}

#[cfg(test)]
mod tests {
    use super::{answers, evaluate, parse_json};

    #[test]
    fn expect_is_never_decoded_or_used() {
        for metadata in [
            "",
            r#", "expect":1e999"#,
            r#", "expect":{"arbitrary":[true,null]}"#,
        ] {
            let raw = format!(r#"{{"layer":"fold/count","input":{{"orders":[[]]}}{metadata}}}"#);
            assert_eq!(evaluate(&raw).expect("input-only").canon(), "0");
        }
        assert!(
            evaluate(r#"{"layer":"fold/count","layer":"fold/sum","input":{"orders":[[]]}}"#)
                .is_err()
        );
        assert!(evaluate(r#"{"layer":"future","input":{},"expect":0}"#).is_err());
    }

    #[test]
    fn ignored_metadata_requires_unicode_scalars() {
        for metadata in [
            r#""expect":"\ud800""#,
            r#""expect":"\udc00""#,
            r#""other":[{"nested":["\ud800"]}]"#,
            r#""expect":{"nested":{"\udc00":0}}"#,
        ] {
            let raw = format!(r#"{{"layer":"fold/count","input":{{"orders":[[]]}},{metadata}}}"#);
            assert!(evaluate(&raw).is_err(), "{metadata}");
        }
        for metadata in [
            r#""expect":"\ud834\udd1e""#,
            r#""expect":{"\ud834\udd1e":[1e999,{"x":1,"x":2}]}"#,
            r#""expect":1e999"#,
        ] {
            let raw = format!(r#"{{"layer":"fold/count","input":{{"orders":[[]]}},{metadata}}}"#);
            assert_eq!(
                evaluate(&raw).expect("valid metadata").canon(),
                "0",
                "{metadata}"
            );
        }
    }

    #[test]
    fn differing_orders_are_not_silently_selected() {
        let form = r#"{"id":"r:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","kind":"","observer":"","about":[],"prev":[],"emitted":"2026-01-01T00:00:00Z","value":"","n":0}"#;
        let input = format!(r#"{{"orders":[[],[{form}]]}}"#);
        assert_eq!(
            answers("fold/count", &parse_json(&input).expect("JSON"))
                .expect("answers")
                .len(),
            2
        );
        let raw = format!(r#"{{"layer":"fold/count","input":{input}}}"#);
        assert!(
            evaluate(&raw)
                .expect_err("different answers")
                .to_string()
                .contains("different answer")
        );
        assert!(evaluate(r#"{"layer":"fold/count","input":{"orders":[]}}"#).is_err());
    }
}
