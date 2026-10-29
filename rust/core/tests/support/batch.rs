//! Batch fixture decoding and answers from Gen.Read and Gen.Run.
use super::reader::{bytes, list, members, optional, required, text, texts};
use loops::{
    batch::{self, Draft},
    envelope::Env,
    json::Json,
};
use sha2::{Digest, Sha256};

fn env(path: &str, j: &Json) -> Result<Env, String> {
    let kvs = members(
        path,
        &[
            "kind", "observer", "emitted", "occurred", "about", "prev", "under", "erases",
        ],
        j,
    )?;
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

fn draft(path: &str, j: &Json) -> Result<Draft, String> {
    let kvs = members(path, &["label", "env", "salt", "payload"], j)?;
    Ok(Draft {
        label: optional(kvs, "label")
            .map(|v| text(&format!("{path}.label"), v).map(str::to_owned))
            .transpose()?,
        env: env(&format!("{path}.env"), required(path, kvs, "env")?)?,
        salt: bytes(&format!("{path}.salt"), required(path, kvs, "salt")?)?,
        payload: required(path, kvs, "payload")?.clone(),
    })
}

/// Lean: `Gen.batchRun`, model/Gen/Run.lean.
/// Computes complete batch answers after strict fixture decoding.
pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "batch" {
        return Err(format!("unknown layer {layer}"));
    }
    let kvs = members("input", &["held", "drafts"], input)?;
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
    let drafts: Vec<_> = list("input.drafts", required("input", kvs, "drafts")?)?
        .iter()
        .enumerate()
        .map(|(i, j)| draft(&format!("input.drafts[{i}]"), j))
        .collect::<Result<_, _>>()?;
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
    use super::{answers, bytes, draft, env};
    use crate::support::parse;
    use loops::json::Json;

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
        assert!(bytes("salt", &Json::Str("aa".into())).is_ok());
        let empty = parse(r#"{"held":[],"drafts":[]}"#);
        assert_eq!(
            answers("batch", &empty).expect("shape"),
            vec![parse(r#"{"records":[]}"#)]
        );
        assert!(answers("batch/other", &empty).is_err());
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
        let id = format!("r:{}", "a".repeat(52));
        let input = format!(
            r#"{{"held":[{{"id":"arbitrary","about":[]}},{{"id":"{id}","about":["thing:one"]}},{{"id":"{id}","about":["thing:two"]}}],"drafts":[{{"env":{{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z","about":["thing:one"],"prev":["{id}"]}},"salt":"aaaaaaaaaaaaaaaaaaaaaaaaaa","payload":null}}]}}"#
        );
        let result = answers("batch", &parse(&input)).expect("shape");
        assert!(matches!(&result[0], Json::Obj(m) if m[0].0 == "records"));
    }

    #[test]
    fn raw_payload_and_optional_fields() {
        let input = parse(
            r#"{"held":[],"drafts":[{"env":{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z"},"salt":"aaaaaaaaaaaaaaaaaaaaaaaaaa","payload":{"x":1,"x":2}}]}"#,
        );
        assert_eq!(
            answers("batch", &input).expect("shape"),
            vec![parse(r#"{"refused":"member-duplicate"}"#)]
        );
        let large = parse(
            r#"{"held":[],"drafts":[{"env":{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z"},"salt":"aaaaaaaaaaaaaaaaaaaaaaaaaa","payload":999999999999999999999999999999999999999999999999999999}]}"#,
        );
        assert_eq!(
            answers("batch", &large).expect("shape"),
            vec![parse(r#"{"refused":"number-out-of-range"}"#)]
        );
        let input = parse(
            r#"{"held":[],"drafts":[{"label":null,"env":{"kind":"note","observer":"person:x","emitted":"2025-01-01T00:00:00Z"},"salt":"aaaaaaaaaaaaaaaaaaaaaaaaaa","payload":null}]}"#,
        );
        assert!(answers("batch", &input).is_err());
    }
}
