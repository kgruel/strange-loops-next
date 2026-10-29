//! Gen.Run.scenarioRun and Gen.ScenarioVectors.outcome, model/Gen/{Run,Scenario}.lean.
use super::{
    lens as fixture_lens,
    reader::{list, members, reader_id, record, required, shown, text, texts},
    spec::{parsed, shown_ids, slot},
};
use loops::{
    json::Json,
    lens,
    record::{Record, Shown, id_text},
    spec::Spec,
    things,
};

fn object(xs: Vec<(&str, Json)>) -> Json {
    Json::Obj(xs.into_iter().map(|(k, v)| (k.into(), v)).collect())
}
fn ids(xs: &[Record]) -> Json {
    Json::Arr(xs.iter().map(|r| Json::Str(id_text(&r.id))).collect())
}
fn outcome(sp: &Spec, thing: &str, forms: &[Record]) -> Json {
    let settled = things::settle(forms);
    let admitted = things::admit(&settled, |_, _| true);
    // Already admitted: do not cross the realm-normalizing state_in boundary twice.
    let state = loops::fold::latest_fold(
        &admitted
            .iter()
            .filter(|r| r.is_about(thing))
            .cloned()
            .collect::<Vec<_>>(),
    );
    object(vec![
        (
            "settled",
            shown_ids(settled.iter().map(|r| (r.id, r.shown)).collect()),
        ),
        ("admitted", ids(&admitted)),
        ("heads", ids(&state.heads)),
        (
            "winner",
            state
                .winner()
                .map_or(Json::Null, |r| Json::Str(id_text(&r.id))),
        ),
        (
            "slots",
            Json::Obj(
                sp.run(&settled)
                    .into_iter()
                    .map(|(n, v)| (n, slot(v)))
                    .collect(),
            ),
        ),
    ])
}
fn step(sp: &Spec, thing: &str, pool: &[Record], path: &str, j: &Json) -> Result<Json, String> {
    let kvs = members(path, &["name", "forms", "orders"], j)?;
    text(&format!("{path}.name"), required(path, kvs, "name")?)?;
    let forms = list(&format!("{path}.forms"), required(path, kvs, "forms")?)?
        .iter()
        .enumerate()
        .map(|(i, j)| {
            let p = format!("{path}.forms[{i}]");
            let kv = members(&p, &["id", "shown"], j)?;
            let id = reader_id(&format!("{p}.id"), required(&p, kv, "id")?)?;
            let r = pool
                .iter()
                .find(|r| r.id == id)
                .ok_or_else(|| format!("{p}.id: unknown record"))?;
            Ok(
                match shown(&format!("{p}.shown"), required(&p, kv, "shown")?)? {
                    Shown::Here => r.clone(),
                    Shown::Withheld => r.withhold(),
                    Shown::Erased => r.erase(),
                },
            )
        })
        .collect::<Result<Vec<_>, String>>()?;
    for (i, r) in forms.iter().enumerate() {
        if forms[..i].iter().any(|x| x.id == r.id) {
            return Err(format!("{path}.forms: duplicate id"));
        }
    }
    let orders = list(&format!("{path}.orders"), required(path, kvs, "orders")?)?;
    let want = outcome(sp, thing, &forms);
    for (i, order) in orders.iter().enumerate() {
        let p = format!("{path}.orders[{i}]");
        let ordered = list(&p, order)?
            .iter()
            .enumerate()
            .map(|(j, v)| {
                let id = reader_id(&format!("{p}[{j}]"), v)?;
                forms
                    .iter()
                    .find(|r| r.id == id)
                    .cloned()
                    .ok_or_else(|| format!("{p}[{j}]: unknown form"))
            })
            .collect::<Result<Vec<_>, String>>()?;
        if outcome(sp, thing, &ordered) != want {
            return Err(format!("{p}: outcome differs from forms"));
        }
    }
    Ok(want)
}
pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "scenario" {
        return Err(format!("unknown scenario layer {layer}"));
    }
    let kv = members(
        "input",
        &["spec", "thing", "records", "steps", "lens"],
        input,
    )?;
    let sp = parsed(required("input", kv, "spec")?)?;
    let thing = text("input.thing", required("input", kv, "thing")?)?;
    let pool = list("input.records", required("input", kv, "records")?)?
        .iter()
        .enumerate()
        .map(|(i, j)| record(&format!("input.records[{i}]"), j))
        .collect::<Result<Vec<_>, _>>()?;
    for (i, r) in pool.iter().enumerate() {
        if pool[..i].iter().any(|x| x.id == r.id) {
            return Err("input.records: duplicate id".into());
        }
    }
    let steps = list("input.steps", required("input", kv, "steps")?)?
        .iter()
        .enumerate()
        .map(|(i, j)| step(&sp, thing, &pool, &format!("input.steps[{i}]"), j))
        .collect::<Result<Vec<_>, _>>()?;
    let lk = members(
        "input.lens",
        &["base", "text"],
        required("input", kv, "lens")?,
    )?;
    let base = fixture_lens::sections("input.lens.base", required("input.lens", lk, "base")?)?;
    let edit = texts("input.lens.text", required("input.lens", lk, "text")?)?;
    let outcomes = lens::edit(&base, &edit).ok_or("input.lens.text: invalid sections")?;
    Ok(vec![object(vec![
        ("steps", Json::Arr(steps)),
        (
            "lens",
            object(vec![
                ("rendered", fixture_lens::lines(&lens::render(&base))),
                (
                    "outcomes",
                    Json::Arr(outcomes.iter().map(fixture_lens::outcome).collect()),
                ),
                ("applied", fixture_lens::doc(&lens::apply(&base, &outcomes))),
            ]),
        ),
    ])])
}

#[cfg(test)]
mod tests {
    use super::answers;
    use crate::parse;
    use loops::json::Json;

    #[test]
    fn lf_adapter_keeps_carriage_returns_and_trailing_empty_lines() {
        // The schema supplies explicit arrays: they are not normalized or split
        // again. The fixture pins the separate text-to-lines adapter's LF rule.
        let raw = include_str!("../../../vectors/scenario/gap11-line-adapter.json");
        let Json::Obj(vector) = parse(raw) else {
            panic!("vector")
        };
        let input = &vector.iter().find(|(k, _)| k == "input").expect("input").1;
        let want = &vector
            .iter()
            .find(|(k, _)| k == "expect")
            .expect("expect")
            .1;
        assert_eq!(
            answers("scenario", input).expect("line scenario"),
            vec![want.clone()]
        );
        assert_eq!(
            "one\r\ntwo\n".split('\n').collect::<Vec<_>>(),
            ["one\r", "two", ""]
        );
        assert_eq!("\nnext\n".split('\n').collect::<Vec<_>>(), ["", "next", ""]);
    }

    #[test]
    #[expect(
        clippy::too_many_lines,
        reason = "The fixture mutations share one setup."
    )]
    fn rejects_invalid_scenario_inputs() {
        let raw = std::fs::read_to_string(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../vectors/scenario/01-decision.json"
        ))
        .expect("scenario fixture");
        let Json::Obj(vector) = parse(&raw) else {
            panic!("vector object")
        };
        let input = vector
            .into_iter()
            .find(|(k, _)| k == "input")
            .expect("input")
            .1;
        assert!(answers("scenario", &input).is_ok());
        assert!(answers("other", &input).is_err());
        let Json::Obj(members) = input else {
            panic!("input object")
        };
        for key in ["spec", "thing", "records", "steps", "lens"] {
            let mut bad = members.clone();
            bad.retain(|(k, _)| k != key);
            assert!(
                answers("scenario", &Json::Obj(bad)).is_err(),
                "missing {key}"
            );
        }
        for variant in 0..7 {
            let mut bad = members.clone();
            let records = &mut bad
                .iter_mut()
                .find(|(k, _)| k == "records")
                .expect("records")
                .1;
            if let Json::Arr(records) = records {
                if variant == 0 {
                    records.push(records[0].clone());
                }
            }
            let steps = &mut bad.iter_mut().find(|(k, _)| k == "steps").expect("steps").1;
            let Json::Arr(steps) = steps else {
                panic!("steps")
            };
            let Json::Obj(step) = &mut steps[0] else {
                panic!("step")
            };
            match variant {
                1 => step.retain(|(k, _)| k != "orders"),
                2 => {
                    let Json::Arr(forms) = &mut step
                        .iter_mut()
                        .find(|(k, _)| k == "forms")
                        .expect("forms")
                        .1
                    else {
                        panic!("forms")
                    };
                    forms.push(forms[0].clone());
                }
                3 | 4 => {
                    let Json::Arr(forms) = &mut step
                        .iter_mut()
                        .find(|(k, _)| k == "forms")
                        .expect("forms")
                        .1
                    else {
                        panic!("forms")
                    };
                    let Json::Obj(form) = &mut forms[0] else {
                        panic!("form")
                    };
                    form.iter_mut().find(|(k, _)| k == "id").expect("id").1 =
                        Json::Str(if variant == 3 {
                            "bad".into()
                        } else {
                            format!("r:{}", "a".repeat(52))
                        });
                }
                5 => {
                    step.iter_mut()
                        .find(|(k, _)| k == "orders")
                        .expect("orders")
                        .1 = Json::Arr(vec![Json::Arr(vec![])]);
                }
                6 => {
                    step.iter_mut()
                        .find(|(k, _)| k == "orders")
                        .expect("orders")
                        .1 = Json::Arr(vec![Json::Arr(vec![Json::Str(format!(
                        "r:{}",
                        "a".repeat(52)
                    ))])]);
                }
                _ => (),
            }
            assert!(
                answers("scenario", &Json::Obj(bad)).is_err(),
                "variant {variant}"
            );
        }
        let mut bad = members;
        let steps = &mut bad.iter_mut().find(|(k, _)| k == "steps").expect("steps").1;
        let Json::Arr(steps) = steps else {
            panic!("steps array")
        };
        let Json::Obj(step) = &mut steps[0] else {
            panic!("step object")
        };
        let orders = &mut step
            .iter_mut()
            .find(|(k, _)| k == "orders")
            .expect("orders")
            .1;
        *orders = Json::Arr(vec![]);
        assert!(answers("scenario", &Json::Obj(bad)).is_ok());
    }
}
