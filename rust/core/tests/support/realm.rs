//! Gen.Run.realmRun and Gen.RealmVectors.realmJ/rotations from model/Gen.
use super::{
    fold::{integer, thing_states},
    reader::{list, members, record, required},
};
use loops::{
    families::{self, Tri},
    json::Json,
    record::{Record, Shown, id_text},
    things,
};

fn object(kvs: Vec<(&str, Json)>) -> Json {
    Json::Obj(kvs.into_iter().map(|(k, v)| (k.into(), v)).collect())
}
fn one(xs: &[Record]) -> Json {
    let settled = things::settle(xs);
    let refused = settled
        .iter()
        .filter_map(|r| {
            things::refusal_of(&settled, r, |_, _| true).map(|why| {
                object(vec![
                    ("id", Json::Str(id_text(&r.id))),
                    ("code", Json::Str(why.to_string())),
                ])
            })
        })
        .collect();
    let kept = things::realm(xs, |_, _| true);
    let sum = families::sum_acc().select(|_| Tri::Yes, &kept);
    object(vec![
        (
            "settled",
            Json::Arr(
                settled
                    .iter()
                    .map(|r| {
                        object(vec![
                            ("id", Json::Str(id_text(&r.id))),
                            (
                                "shown",
                                Json::Str(
                                    match r.shown {
                                        Shown::Here => "here",
                                        Shown::Withheld => "withheld",
                                        Shown::Erased => "erased",
                                    }
                                    .into(),
                                ),
                            ),
                        ])
                    })
                    .collect(),
            ),
        ),
        ("refused", Json::Arr(refused)),
        ("things", thing_states(&kept)),
        (
            "sum",
            object(vec![
                ("value", Json::Int(sum.value)),
                ("unread", integer(sum.unread)),
            ]),
        ),
    ])
}

/// Gen.Run.realmRun and Gen.RealmVectors.rotations, model/Gen/{Run,Realm}.lean.
/// Computes every rotation's complete answer, or one empty answer for an empty realm.
pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "realm" {
        return Err(format!("unknown realm layer {layer}"));
    }
    let kvs = members("input", &["forms"], input)?;
    let mut forms = list("input.forms", required("input", kvs, "forms")?)?
        .iter()
        .enumerate()
        .map(|(i, r)| record(&format!("input.forms[{i}]"), r))
        .collect::<Result<Vec<_>, _>>()?;
    let mut answers = Vec::new();
    for _ in 0..forms.len().max(1) {
        answers.push(one(&forms));
        if !forms.is_empty() {
            forms.rotate_left(1);
        }
    }
    Ok(answers)
}

#[cfg(test)]
mod tests {
    use super::answers;
    use crate::support::parse;
    use loops::json::Json;

    #[test]
    fn closed_dispatch_and_strict_forms_shape() {
        for (layer, raw) in [
            ("realm/future", r#"{"forms":[]}"#),
            ("realm", "{}"),
            ("realm", r#"{"forms":null}"#),
            ("realm", r#"{"forms":[{}]}"#),
            ("realm", r#"{"forms":[],"extra":1}"#),
            ("realm", r#"{"forms":[],"forms":[]}"#),
        ] {
            assert!(answers(layer, &parse(raw)).is_err(), "{layer} {raw}");
        }
        assert_eq!(
            answers("realm", &parse(r#"{"forms":[]}"#)).expect("empty realm"),
            vec![parse(
                r#"{"settled":[],"refused":[],"things":{},"sum":{"value":0,"unread":0}}"#
            )]
        );
    }

    #[test]
    fn every_rotation_keeps_the_full_unbounded_answer() {
        let n = "170141183460469231731687303715884105728000";
        let form = |n: &str| {
            format!(
                r#"{{"id":"r:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","kind":"","observer":"","about":[],"prev":[],"emitted":"2026-01-01T00:00:00Z","value":"","n":{n}}}"#
            )
        };
        let a = form(n);
        let negative = format!("-{n}");
        let b = form(&negative);
        // These forms violate Forms. Each rotation must retain its own first here payload.
        let input = parse(&format!(r#"{{"forms":[{a},{b},{a}]}}"#));
        let got = answers("realm", &input).expect("reader forms");
        assert_eq!(got.len(), 3, "one answer per rotation");
        for (answer, value) in got.iter().zip([n, &negative, n]) {
            let Json::Obj(kvs) = answer else {
                panic!("realm answer object")
            };
            let sum = &kvs.iter().find(|(k, _)| k == "sum").expect("sum field").1;
            assert_eq!(sum, &parse(&format!(r#"{{"value":{value},"unread":0}}"#)));
        }
    }
}
