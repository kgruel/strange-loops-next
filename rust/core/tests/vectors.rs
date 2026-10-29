//! Record, occurred, fold, and spec vectors from model/Gen.

mod support;

use ed25519_dalek::{Signer, SigningKey};
use loops::{base32, envelope::Env, json::Json, occurred, stored};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
};

const IMPLEMENTED: &[(&str, usize)] =
    &[("record", 26), ("occurred", 8), ("fold", 37), ("spec", 70)];
// Shrink only. Standard includes external non-integer JCS and crypto fixtures;
// it is not claimed as Lean integer-JSON conformance by this layer.
const REMAINING: &[&str] = &["realm", "scenario", "batch", "lens", "standard"];

fn json_files(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).expect("vector directory exists") {
        let path = entry.expect("read vector directory entry").path();
        if path.is_dir() {
            out.extend(json_files(&path));
        } else if path.extension().is_some_and(|e| e == "json") {
            out.push(path);
        }
    }
    out.sort();
    out
}

fn hash(bytes: &[u8]) -> Vec<u8> {
    Sha256::digest(bytes).to_vec()
}
fn text(value: &Value) -> &str {
    value.as_str().expect("vector text")
}
fn texts(value: &Value) -> Vec<String> {
    value.as_array().map_or_else(Vec::new, |xs| {
        xs.iter().map(|v| text(v).to_owned()).collect()
    })
}
fn env(value: &Value) -> Env {
    Env {
        kind: text(&value["kind"]).into(),
        observer: text(&value["observer"]).into(),
        emitted: text(&value["emitted"]).into(),
        occurred: value.get("occurred").map(|v| text(v).into()),
        about: texts(&value["about"]),
        prev: texts(&value["prev"]),
        under: value.get("under").map(|v| text(v).into()),
        erases: texts(&value["erases"]),
    }
}
fn object(members: Vec<(&str, Json)>) -> Json {
    Json::Obj(members.into_iter().map(|(k, v)| (k.into(), v)).collect())
}
fn string(s: impl Into<String>) -> Json {
    Json::Str(s.into())
}

fn member<'a>(value: &'a Json, key: &str) -> &'a Json {
    let Json::Obj(members) = value else {
        panic!("vector object expected")
    };
    &members
        .iter()
        .find(|(k, _)| k == key)
        .expect("vector member")
        .1
}

fn record_payloads(input: &Json) -> Vec<Json> {
    let Json::Obj(members) = input else {
        panic!("vector input object expected")
    };
    if let Some((_, Json::Str(raw))) = members.iter().find(|(key, _)| key == "payload_text") {
        vec![support::parse(raw)]
    } else {
        let Json::Arr(payloads) = member(input, "payloads") else {
            panic!("payload variants expected")
        };
        payloads.clone()
    }
}

fn record_answer(input: &Value, payloads: &[Json]) -> Value {
    let envs: Vec<_> = input["envs"]
        .as_array()
        .expect("envs")
        .iter()
        .map(env)
        .collect();
    let salt = support::decode(text(&input["salt"]));
    let mut answer = None;
    // Check every Cartesian variant, including every refusal, rather than just
    // assuming Gen.Records' agreement assertion holds for this implementation.
    for e in &envs {
        for p in payloads {
            let got = match stored::write(e.clone(), salt.clone(), p.clone()) {
                Err(error) => json!({"refused": error.to_string()}),
                Ok(w) => {
                    let r = w.stored();
                    let commit = r.commit(&hash);
                    let id = r.id(&hash);
                    assert!(stored::opens(&hash, &commit, &salt, p));
                    let erased = r.erase(&hash);
                    assert_eq!(erased.id(&hash), id);
                    assert_eq!(erased.erase(&hash), erased);
                    let seed: [u8; 32] = support::decode(text(&input["seed"]))
                        .try_into()
                        .expect("32-byte seed");
                    let key = SigningKey::from_bytes(&seed);
                    let key_text = format!("k:{}", base32::base32(&key.verifying_key().to_bytes()));
                    let sig = base32::base32(&key.sign(&stored::signing_input(&id)).to_bytes());
                    let signature =
                        object(vec![("key", string(&key_text)), ("ed25519", string(&sig))]);
                    let line = object(vec![
                        ("id", string(&id)),
                        ("env", e.to_json()),
                        ("salt", string(base32::base32(&salt))),
                        ("payload", p.clone()),
                        ("sig", signature.clone()),
                    ]);
                    let erased_line = object(vec![
                        ("id", string(&id)),
                        ("env", e.to_json()),
                        ("commit", string(&commit)),
                        ("sig", signature),
                    ]);
                    json!({"env_canonical":e.to_json().canon(), "payload_canonical":p.canon(),
                    "commit":commit, "id_preimage":stored::id_preimage(e,&r.commit(&hash)),
                    "id":id, "signing_input":String::from_utf8(stored::signing_input(&r.id(&hash))).expect("UTF8"),
                    "key":key_text, "ed25519":sig, "line":line.canon(), "erased_line":erased_line.canon()})
                }
            };
            if let Some(first) = &answer {
                assert_eq!(&got, first, "variant disagreement");
            } else {
                answer = Some(got);
            }
        }
    }
    answer.expect("nonempty record variants")
}

fn occurred_answer(input: &Value, vector_name: &str) -> Value {
    let texts = texts(&input["occurred"]);
    if vector_name == "08-order" {
        let mut spans: Vec<_> = texts
            .into_iter()
            .map(|s| {
                let span = occurred::occurred_span(&s).expect("order vector valid span");
                (s, span)
            })
            .collect();
        spans.sort_by(|a, b| a.1.cmp(&b.1));
        json!({"oldest-first":spans.into_iter().map(|(s,_)| s).collect::<Vec<_>>()})
    } else {
        let spans: Vec<_> = texts
            .iter()
            .map(|s| match occurred::occurred_span(s) {
                None => json!({"refused":"occurred-not-span"}),
                Some(span) => {
                    json!({"start":support::utc(span.start()), "end":span.stop().map(support::utc)})
                }
            })
            .collect();
        json!({"spans":spans})
    }
}

#[test]
fn every_registered_vector_and_every_expect() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("vectors");
    let mut seen = Vec::new();
    let mut checked = 0;
    let mut deferred = 0;
    for entry in fs::read_dir(&root).expect("repository vectors") {
        let path = entry.expect("vector entry").path();
        if !path.is_dir() {
            assert_ne!(
                path.extension().and_then(|x| x.to_str()),
                Some("json"),
                "unregistered root JSON {path:?}"
            );
            continue;
        }
        let family = path
            .file_name()
            .expect("family")
            .to_str()
            .expect("UTF8")
            .to_owned();
        let files = json_files(&path);
        if let Some((_, count)) = IMPLEMENTED.iter().find(|(name, _)| *name == family) {
            assert_eq!(
                files.len(),
                *count,
                "{family} recursive vector count changed; review registry"
            );
            for file in files {
                let source = fs::read_to_string(&file).expect("vector file");
                let raw = support::parse(&source);
                let Json::Str(layer) = member(&raw, "layer") else {
                    panic!("vector layer text");
                };
                if family == "fold" || family == "spec" {
                    let dispatch = if family == "fold" {
                        support::fold::answers
                    } else {
                        support::spec::answers
                    };
                    let answers = dispatch(layer, member(&raw, "input"))
                        .unwrap_or_else(|e| panic!("{file:?}: {e}"));
                    assert!(!answers.is_empty(), "{file:?}: checker returns no answers");
                    for (i, got) in answers.iter().enumerate() {
                        assert_eq!(got, member(&raw, "expect"), "{file:?} order {i}");
                    }
                    checked += 1;
                    continue;
                }
                assert_eq!(layer, &family, "{file:?}");
                let vector: Value = serde_json::from_str(&source).expect("vector JSON");
                let got = match family.as_str() {
                    "record" => {
                        record_answer(&vector["input"], &record_payloads(member(&raw, "input")))
                    }
                    "occurred" => occurred_answer(&vector["input"], text(&vector["vector"])),
                    _ => unreachable!("registered checker missing"),
                };
                assert_eq!(Some(&got), vector.get("expect"), "{file:?}");
                checked += 1;
            }
        } else {
            assert!(
                REMAINING.contains(&family.as_str()),
                "unknown vector directory {path:?}"
            );
            deferred += files.len();
        }
        seen.push(family);
    }
    for (family, _) in IMPLEMENTED {
        assert!(seen.iter().any(|s| s == family), "missing {family}");
    }
    for family in REMAINING {
        assert!(seen.iter().any(|s| s == family), "stale allowlist {family}");
    }
    assert_eq!(checked, 141);
    assert_eq!(checked + deferred, 184);
    assert_eq!(
        checked + deferred,
        json_files(&root).len(),
        "JSON skipped outside registered families"
    );
}
