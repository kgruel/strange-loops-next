//! Gen.Run.recordRun, with all Cartesian variants retained for agreement.
use super::{
    parse_json,
    reader::{bytes, list, members, optional, required, text},
};
use ed25519_dalek::{Signer, SigningKey};
use loops::{base32, envelope::Env, json::Json, stored};
use sha2::{Digest, Sha256};

fn hash(bytes: &[u8]) -> Vec<u8> {
    Sha256::digest(bytes).to_vec()
}
fn object(kvs: Vec<(&str, Json)>) -> Json {
    Json::Obj(kvs.into_iter().map(|(k, v)| (k.into(), v)).collect())
}
fn string(s: impl Into<String>) -> Json {
    Json::Str(s.into())
}

fn one(e: &Env, salt: &[u8], payload: &Json, seed: Option<&[u8; 32]>) -> Result<Json, String> {
    let w = match stored::write(e.clone(), salt.to_vec(), payload.clone()) {
        Ok(w) => w,
        Err(e) => return Ok(object(vec![("refused", string(e.to_string()))])),
    };
    let seed = seed.ok_or("input.seed: expected a canonical 32-byte signing seed")?;
    let r = w.stored();
    let commit = r.commit(&hash);
    let id = r.id(&hash);
    #[cfg(test)]
    tests::assert_opening_laws(&r, &commit, salt, payload, &id);
    let key = SigningKey::from_bytes(seed);
    let key_text = format!("k:{}", base32::base32(&key.verifying_key().to_bytes()));
    let sig = base32::base32(&key.sign(&stored::signing_input(&id)).to_bytes());
    let signature = object(vec![("key", string(&key_text)), ("ed25519", string(&sig))]);
    let line = object(vec![
        ("id", string(&id)),
        ("env", e.to_json()),
        ("salt", string(base32::base32(salt))),
        ("payload", payload.clone()),
        ("sig", signature.clone()),
    ]);
    let erased_line = object(vec![
        ("id", string(&id)),
        ("env", e.to_json()),
        ("commit", string(&commit)),
        ("sig", signature),
    ]);
    Ok(object(vec![
        ("env_canonical", string(e.to_json().canon())),
        ("payload_canonical", string(payload.canon())),
        ("commit", string(&commit)),
        ("id_preimage", string(stored::id_preimage(e, &commit))),
        ("id", string(&id)),
        ("signing_input", string(format!("loops/record/v1:{id}"))),
        ("key", string(key_text)),
        ("ed25519", string(sig)),
        ("line", string(line.canon())),
        ("erased_line", string(erased_line.canon())),
    ]))
}

pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    match answers_decoded(layer, input) {
        Err(e) if e == "envelope-field-unknown" => {
            Ok(vec![Json::Obj(vec![("refused".into(), Json::Str(e))])])
        }
        other => other,
    }
}

fn answers_decoded(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "record" {
        return Err(format!("unknown record layer {layer}"));
    }
    let kvs = members(
        "input",
        &["envs", "payloads", "payload_text", "salt", "seed"],
        input,
    )?;
    let envs = loops::envelope::read_all("input.envs", required("input", kvs, "envs")?)
        .map_err(|e| e.to_string())?;
    let payloads = match (optional(kvs, "payloads"), optional(kvs, "payload_text")) {
        (Some(ps), None) => list("input.payloads", ps)?.to_vec(),
        (None, Some(raw)) => vec![
            parse_json(text("input.payload_text", raw)?)
                .map_err(|e| format!("input.payload_text: {e}"))?,
        ],
        _ => return Err("input: takes one of payloads and payload_text".into()),
    };
    if envs.is_empty() {
        return Err("input.envs: no envelope given".into());
    }
    if payloads.is_empty() {
        return Err("input.payloads: no payload given".into());
    }
    let salt = bytes("input.salt", required("input", kvs, "salt")?)?;
    // A refused writer input needs no seed. Successful variants all require
    // exactly 32 canonical decoded bytes; malformed seeds never panic.
    let needs_seed = envs.iter().any(|e| {
        payloads
            .iter()
            .any(|p| stored::write(e.clone(), salt.clone(), p.clone()).is_ok())
    });
    let seed: Option<[u8; 32]> = if needs_seed {
        Some(
            bytes("input.seed", required("input", kvs, "seed")?)?
                .try_into()
                .map_err(|_| "input.seed: expected 32 bytes")?,
        )
    } else {
        None
    };
    envs.iter()
        .flat_map(|e| payloads.iter().map(|p| one(e, &salt, p, seed.as_ref())))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{answers, hash};
    use crate::{evaluate, parse};
    use loops::{json::Json, stored};

    // Preserve the original vector runner's independent stored-record laws,
    // keeping assertions outside the fallible production boundary.
    pub(super) fn assert_opening_laws(
        r: &stored::Stored,
        commit: &str,
        salt: &[u8],
        payload: &Json,
        id: &str,
    ) {
        assert!(stored::opens(&hash, commit, salt, payload));
        let erased = r.erase(&hash);
        assert_eq!(erased.id(&hash), id);
        assert_eq!(erased.erase(&hash), erased);
    }

    #[test]
    fn every_record_variant_keeps_openings_and_erasure_laws() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vectors/record");
        let mut files = std::fs::read_dir(root)
            .expect("record fixtures")
            .map(|entry| entry.expect("record entry").path())
            .filter(|path| path.extension().is_some_and(|e| e == "json"))
            .collect::<Vec<_>>();
        files.sort();
        let mut failures = Vec::new();
        for path in files {
            let raw = std::fs::read_to_string(&path).expect("record fixture");
            if let Err(error) = evaluate(&raw) {
                failures.push(format!("{path:?}: {error}"));
            }
        }
        assert_eq!(
            failures,
            Vec::<String>::new(),
            "all record variants executed"
        );
    }

    #[test]
    fn all_shapes_precede_envelope_values_and_salt() {
        for envs in [
            r#"[{"kind":7},{"extra":1}]"#,
            r#"[{"extra":1},{"kind":7}]"#,
            r#"[7,{"extra":1}]"#,
            r#"[{"extra":1},7]"#,
            r#"[{"extra":1}]"#,
            r#"[{"kind":7,"extra":1}]"#,
        ] {
            let input = parse(&format!(
                r#"{{"envs":{envs},"salt":"!","payloads":[null]}}"#
            ));
            assert_eq!(
                answers("record", &input).expect("shape refusal"),
                vec![parse(r#"{"refused":"envelope-field-unknown"}"#)]
            );
        }
    }

    #[test]
    fn seed_and_variant_shapes_fail_without_panics() {
        let env = r#"{"kind":"note","observer":"sl:a","emitted":"2026-01-01T00:00:00Z","about":["thing:a"]}"#;
        for seed in [r#""""#, r#""a""#, r#""aa""#, r#""A""#, "null"] {
            let input = parse(&format!(
                r#"{{"envs":[{env}],"payloads":[null],"salt":"00000000000000000000000000","seed":{seed}}}"#
            ));
            assert!(answers("record", &input).is_err(), "{seed}");
        }
        for input in [
            r#"{"envs":[],"payloads":[null],"salt":""}"#,
            r#"{"envs":[],"payloads":[],"payload_text":"null","salt":""}"#,
            r#"{"envs":[],"payload_text":"[","salt":""}"#,
        ] {
            assert!(answers("record", &parse(input)).is_err());
        }
    }
}
