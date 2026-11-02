//! Every immutable JSON fixture is registered and executed; no skip allowlist.
mod common;
use common::{expected, json_files, root};
use loops::{json::Json, occurred, time::Moment};
use serde_json::{Value, json};
use std::fs;

const FAMILIES: &[(&str, usize)] = &[
    ("record", 82),
    ("occurred", 9),
    ("byte-text", 5),
    ("fold", 48),
    ("spec", 110),
    ("realm", 15),
    ("scenario", 5),
    ("lens", 16),
    ("batch", 13),
    ("standard", 12),
];

fn member<'a>(j: &'a Json, key: &str) -> &'a Json {
    let Json::Obj(kvs) = j else {
        panic!("object expected")
    };
    &kvs.iter().find(|(k, _)| k == key).expect("member").1
}
// Gen.OccurredVectors.utc, independent of the evaluator's seven fuzz families.
fn utc(moment: &Moment) -> String {
    let seconds = moment.seconds();
    let shifted_day = seconds.div_euclid(86400) + 719_468;
    let era = shifted_day.div_euclid(146_097);
    let doe = shifted_day - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year_number = yoe + era * 400 + i64::from(month <= 2);
    let year = if year_number < 0 {
        format!("-{:04}", -year_number)
    } else {
        format!("{year_number:04}")
    };
    let day_seconds = seconds.rem_euclid(86400);
    let frac = if moment.fraction().is_empty() {
        String::new()
    } else {
        format!(
            ".{}",
            moment
                .fraction()
                .iter()
                .map(u8::to_string)
                .collect::<String>()
        )
    };
    format!(
        "{year}-{month:02}-{day:02}T{:02}:{:02}:{:02}{frac}Z",
        day_seconds / 3600,
        day_seconds / 60 % 60,
        day_seconds % 60
    )
}
fn occurred_answer(vector: &Value) -> Value {
    let texts: Vec<_> = vector["input"]["occurred"]
        .as_array()
        .expect("occurred")
        .iter()
        .map(|v| v.as_str().expect("text"))
        .collect();
    if vector["vector"] == "08-order" {
        let mut spans: Vec<_> = texts
            .into_iter()
            .map(|s| (s, occurred::occurred_span(s).expect("span")))
            .collect();
        spans.sort_by(|a, b| a.1.cmp(&b.1));
        json!({"oldest-first":spans.into_iter().map(|(s,_)| s).collect::<Vec<_>>()})
    } else {
        json!({"spans":texts.iter().map(|s| match occurred::occurred_span(s) {
            None => json!({"refused":"occurred-not-span"}),
            Some(span) => json!({"start":utc(span.start()),"end":span.stop().map(utc)}),
        }).collect::<Vec<_>>()})
    }
}

#[test]
fn every_registered_json_and_every_arrival_order() {
    let root = root();
    let mut checked = 0;
    let mut seen = Vec::new();
    let mut failures = Vec::new();
    for entry in fs::read_dir(&root).expect("vectors") {
        let path = entry.expect("family").path();
        if !path.is_dir() {
            assert_ne!(
                path.extension().and_then(|x| x.to_str()),
                Some("json"),
                "unregistered root JSON"
            );
            continue;
        }
        let family = path
            .file_name()
            .expect("name")
            .to_str()
            .expect("UTF8")
            .to_owned();
        let (_, count) = FAMILIES
            .iter()
            .find(|(f, _)| *f == family)
            .expect("registered family");
        let files = json_files(&path);
        assert_eq!(
            files.len(),
            *count,
            "{family}: update exact registry after review"
        );
        if family == "standard" {
            // Each input and output is consumed once, as six byte-for-byte pairs.
            let inputs = json_files(&path.join("jcs/input"));
            let outputs = json_files(&path.join("jcs/output"));
            assert_eq!((inputs.len(), outputs.len()), (6, 6));
            for input in inputs {
                let output = path
                    .join("jcs/output")
                    .join(input.file_name().expect("name"));
                let got = loops_eval::parse_json(&fs::read_to_string(&input).expect("JCS input"))
                    .expect("RFC8259")
                    .canon();
                let want = fs::read(&output).expect("JCS output");
                if got.as_bytes() != want {
                    failures.push(format!("{input:?}: JCS bytes differ"));
                }
                checked += 2;
            }
        } else {
            for file in files {
                let source = fs::read_to_string(&file).expect("vector");
                let vector: Value = serde_json::from_str(&source).expect("vector JSON");
                let want = expected(vector.get("expect").expect("fixture expect"));
                if family == "occurred" {
                    assert_eq!(
                        expected(&occurred_answer(&vector)).canon(),
                        want.canon(),
                        "{file:?}"
                    );
                } else {
                    // The actual evaluator gets the original text, never a Value
                    // rewrite that could lose input ordering/repeated members.
                    match loops_eval::evaluate(&source) {
                        Ok(got) if got.canon() == want.canon() => (),
                        Ok(got) => failures.push(format!(
                            "{file:?}: got {} expected {}",
                            got.canon(),
                            want.canon()
                        )),
                        Err(error) => failures.push(format!("{file:?}: {error}")),
                    }
                    let raw = loops_eval::parse_json(&source).expect("raw vector");
                    let Json::Str(layer) = member(&raw, "layer") else {
                        panic!("layer")
                    };
                    if let Ok(answers) = loops_eval::answers(layer, member(&raw, "input")) {
                        assert!(!answers.is_empty(), "{file:?}");
                        for (i, answer) in answers.iter().enumerate() {
                            if answer.canon() != want.canon() {
                                failures.push(format!("{file:?}: order/variant {i} differs"));
                            }
                        }
                    }
                }
                checked += 1;
            }
        }
        seen.push(family);
    }
    for (family, _) in FAMILIES {
        assert!(seen.iter().any(|s| s == family), "missing {family}");
    }
    assert_eq!(checked, 315);
    assert_eq!(checked, json_files(&root).len(), "unconsumed JSON");
    assert_eq!(
        failures,
        Vec::<String>::new(),
        "all registered files executed"
    );
}

#[test]
fn expectation_integers_are_not_rounded_like_input_numbers() {
    let raw = "18014398509481981";
    let v: Value = serde_json::from_str(raw).expect("output JSON");
    assert_eq!(expected(&v).canon(), raw);
    assert_ne!(
        loops_eval::parse_json(raw).expect("input JSON").canon(),
        raw
    );
}
