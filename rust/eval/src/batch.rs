//! Batch fixture answers from Gen.Run; raw drafts decode in the core library.
use super::reader::{list, members, required, text, texts};
use loops::{batch, json::Json};
use sha2::{Digest, Sha256};

/// Lean: `Gen.batchRun`, model/Gen/Run.lean.
/// Computes complete batch answers after strict fixture decoding.
pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    match answers_decoded(layer, input) {
        Err(e) if e == "envelope-field-unknown" => {
            Ok(vec![Json::Obj(vec![("refused".into(), Json::Str(e))])])
        }
        other => other,
    }
}

fn answers_decoded(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "batch" {
        return Err(format!("unknown layer {layer}"));
    }
    let kvs = members("input", &["held", "drafts"], input)?;
    let (held, drafts) = batch::read_all("input.drafts", required("input", kvs, "drafts")?, || {
        let held: Vec<(String, Vec<String>)> = list("input.held", required("input", kvs, "held")?)?
            .iter()
            .enumerate()
            .map(|(i, j)| {
                let p = format!("input.held[{i}]");
                let k = members(&p, &["id", "about"], j)?;
                Ok((
                    text(&format!("{p}.id"), required(&p, k, "id")?)?.to_owned(),
                    texts(&format!("{p}.about"), required(&p, k, "about")?)?,
                ))
            })
            .collect::<Result<_, String>>()?;
        Ok(held)
    })
    .map_err(|e| e.to_string())?;
    let hash = |b: &[u8]| Sha256::digest(b).to_vec();
    let lookup = |id: &str| {
        held.iter()
            .find(|(key, _)| key == id)
            .map(|(_, about)| about.clone())
    };
    let answer = match batch::resolve_batch(&hash, &lookup, &drafts) {
        Ok(records) => Json::Obj(vec![(
            "records".into(),
            Json::Arr(
                records
                    .iter()
                    .map(|w| {
                        let r = w.stored();
                        Json::Obj(vec![
                            ("id".into(), Json::Str(r.id(&hash))),
                            ("env_canonical".into(), Json::Str(r.env.to_json().canon())),
                        ])
                    })
                    .collect(),
            ),
        )]),
        Err(e) => Json::Obj(vec![("refused".into(), Json::Str(e.to_string()))]),
    };
    Ok(vec![answer])
}

#[cfg(test)]
mod tests {
    use super::answers;
    use crate::reader::bytes;
    fn env(path: &str, j: &loops::json::Json) -> Result<loops::envelope::Env, String> {
        loops::envelope::read(path, j).map_err(|e| e.to_string())
    }
    fn draft(path: &str, j: &loops::json::Json) -> Result<loops::batch::Draft, String> {
        loops::batch::read(path, j).map_err(|e| e.to_string())
    }
    use crate::parse;
    use loops::json::Json;

    #[test]
    fn shape_preflight_precedes_all_draft_and_held_values() {
        let bad = r#"{"env":{"extra":1}}"#;
        let malformed = r#"{"label":7,"env":{"kind":7},"salt":"!"}"#;
        for drafts in [
            format!("[{bad},{malformed}]"),
            format!("[{malformed},{bad}]"),
        ] {
            let input = parse(&format!(r#"{{"held":null,"drafts":{drafts}}}"#));
            assert_eq!(
                answers("batch", &input).expect("shape refusal"),
                vec![parse(r#"{"refused":"envelope-field-unknown"}"#)]
            );
        }
    }

    #[test]
    fn strict_shapes_and_base32() {
        for s in [
            "{}",
            r#"{"held":[],"drafts":[],"extra":1}"#,
            r#"{"held":[],"held":[],"drafts":[]}"#,
            r#"{"held":[{"id":1,"about":[]}],"drafts":[]}"#,
            r#"{"held":[{"id":"x"}],"drafts":[]}"#,
            r#"{"held":[],"drafts":null}"#,
        ] {
            assert!(answers("batch", &parse(s)).is_err(), "{s}");
        }
        for s in ["A", "a", "ab", "aaa", "aa="] {
            assert!(bytes("salt", &Json::Str(s.into())).is_err(), "{s}");
        }
        assert!(bytes("salt", &Json::Str("00".into())).is_ok());
        let empty = parse(r#"{"held":[],"drafts":[]}"#);
        assert_eq!(
            answers("batch", &empty).expect("shape"),
            vec![parse(r#"{"records":[]}"#)]
        );
        assert!(answers("batch/other", &empty).is_err());
    }

    #[test]
    fn unknown_envelope_field_precedes_values() {
        for raw in [r#"{"extra":1,"kind":""}"#, r#"{"kind":3,"extra":1}"#] {
            assert_eq!(
                env("env", &parse(raw)),
                Err("envelope-field-unknown".into())
            );
        }
        let raw = parse(
            r#"{"held":[],"drafts":[{"env":{"extra":1,"kind":""},"salt":"","payload":null}]}"#,
        );
        assert_eq!(
            answers("batch", &raw).expect("refusal"),
            vec![parse(r#"{"refused":"envelope-field-unknown"}"#)]
        );
        let duplicate = parse(r#"{"extra":1,"extra":2}"#);
        assert_eq!(
            env("env", &duplicate).expect_err("unknown field"),
            "envelope-field-unknown"
        );
    }

    #[test]
    fn draft_and_envelope_shapes_precede_writer_checks() {
        for input in [
            r#"{"env":{},"salt":"","payload":null,"extra":0}"#,
            r#"{"label":"@a","label":"@b","env":{},"salt":"","payload":null}"#,
            r#"{"env":{"kind":"","observer":"","emitted":""},"salt":3,"payload":null}"#,
            r#"{"env":{"kind":"","observer":"","emitted":""},"salt":""}"#,
        ] {
            assert!(draft("draft", &parse(input)).is_err(), "{input}");
        }
        for input in [
            r#"{"kind":"","observer":"","emitted":"","under":null}"#,
            r#"{"kind":"","observer":"","emitted":"","about":null}"#,
            r#"{"kind":"","observer":"","emitted":"","prev":[3]}"#,
            r#"{"kind":"","observer":"","emitted":"","erases":{}}"#,
            r#"{"kind":"","kind":"x","observer":"","emitted":""}"#,
        ] {
            assert!(env("env", &parse(input)).is_err(), "{input}");
        }
        let invalid = parse(r#"{"kind":"","observer":"","emitted":"","about":0,"under":0}"#);
        assert_eq!(env("env", &invalid), Err("env.under: expected text".into()));
        let raw = parse(r#"{"kind":"","observer":"","emitted":""}"#);
        assert!(
            env("env", &raw).is_ok(),
            "writer checks follow fixture shape checks"
        );
    }

    #[test]
    fn held_first_match_and_arbitrary_ids() {
        let id = format!("r:{}", "0".repeat(52));
        let input = format!(
            r#"{{"held":[{{"id":"arbitrary","about":[]}},{{"id":"{id}","about":["thing:one"]}},{{"id":"{id}","about":["thing:two"]}}],"drafts":[{{"env":{{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z","about":["thing:one"],"prev":["{id}"]}},"salt":"00000000000000000000000000","payload":null}}]}}"#
        );
        let result = answers("batch", &parse(&input)).expect("shape");
        assert!(matches!(&result[0], Json::Obj(m) if m[0].0 == "records"));
    }

    #[test]
    fn raw_payload_and_optional_fields() {
        let input = parse(
            r#"{"held":[],"drafts":[{"env":{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z"},"salt":"00000000000000000000000000","payload":{"x":1,"x":2}}]}"#,
        );
        assert_eq!(
            answers("batch", &input).expect("shape"),
            vec![parse(r#"{"refused":"member-duplicate"}"#)]
        );
        let large = parse(
            r#"{"held":[],"drafts":[{"env":{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z"},"salt":"00000000000000000000000000","payload":999999999999999999999999999999999999999999999999999999}]}"#,
        );
        assert_eq!(
            answers("batch", &large).expect("finite binary64 payload"),
            vec![parse(r#"{"refused":"number-out-of-range"}"#)]
        );
        // Keep the original unchecked-Int refusal characterization separately:
        // the RFC boundary correctly rounds the lexical input to Number.
        let Json::Obj(mut root) = large else {
            panic!("input object")
        };
        let Json::Arr(drafts) = &mut root
            .iter_mut()
            .find(|(k, _)| k == "drafts")
            .expect("drafts")
            .1
        else {
            panic!("draft array")
        };
        let Json::Obj(draft) = &mut drafts[0] else {
            panic!("draft object")
        };
        draft
            .iter_mut()
            .find(|(k, _)| k == "payload")
            .expect("payload")
            .1 = Json::Int(
            "999999999999999999999999999999999999999999999999999999"
                .parse()
                .expect("raw unbounded Int"),
        );
        assert_eq!(
            answers("batch", &Json::Obj(root)).expect("raw shape"),
            vec![parse(r#"{"refused":"number-out-of-range"}"#)]
        );
        let input = parse(
            r#"{"held":[],"drafts":[{"label":null,"env":{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z"},"salt":"00000000000000000000000000","payload":null}]}"#,
        );
        assert!(answers("batch", &input).is_err());
    }
}
