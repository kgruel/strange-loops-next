//! Gen.Run.foldAnswer/selectRun and Gen.Encode.jPerThing.
use super::reader::{list, members, record, required};
use loops::{
    families::{self, Result as FoldResult},
    fold::{self, LatestBy},
    json::Json,
    number::Int,
    record::{Record, Shown, id_text},
    things::per_thing,
    where_::{Cond, parse_where},
};
pub(super) fn integer(i: impl std::fmt::Display) -> Json {
    Json::Int(i.to_string().parse().expect("unbounded integer result"))
}
fn object(kvs: Vec<(&str, Json)>) -> Json {
    Json::Obj(kvs.into_iter().map(|(k, v)| (k.into(), v)).collect())
}
fn optional_int(i: Option<Int>) -> Json {
    i.map_or(Json::Null, Json::Int)
}
fn result<T>(r: FoldResult<T>, render: impl FnOnce(T) -> Json) -> Json {
    object(vec![
        ("value", render(r.value)),
        ("unread", integer(r.unread)),
    ])
}
fn ids(xs: &[Record]) -> Json {
    Json::Arr(xs.iter().map(|r| Json::Str(id_text(&r.id))).collect())
}
fn winner(s: &LatestBy) -> Json {
    s.winner().map_or(Json::Null, |r| Json::Str(id_text(&r.id)))
}
fn latest(s: &LatestBy) -> Json {
    object(vec![("winner", winner(s)), ("others", ids(s.others()))])
}
/// Gen.Encode.jPerThing (model/Gen/Encode.lean), complete per-thing fold state.
pub(super) fn thing_states(xs: &[Record]) -> Json {
    Json::Obj(
        per_thing(xs)
            .into_iter()
            .map(|(thing, s)| {
                (
                    thing,
                    object(vec![
                        ("heads", ids(&s.heads)),
                        ("winner", winner(&s)),
                        ("others", ids(s.others())),
                    ]),
                )
            })
            .collect(),
    )
}
fn over_whole_heads<T>(f: impl FnOnce(&LatestBy) -> T, xs: &[Record]) -> T {
    f(&fold::latest_fold(xs))
}
fn one(layer: &str, xs: &[Record], cs: &[Cond]) -> Result<Json, String> {
    Ok(match layer {
        "fold/count" => integer(fold::count_fold(0_u64.into(), xs)),
        "fold/sum" => Json::Int(fold::sum_fold(0_i64.into(), xs)),
        "fold/extrema" => object(vec![
            ("min", optional_int(fold::min_fold(None, xs))),
            ("max", optional_int(fold::max_fold(None, xs))),
        ]),
        "fold/latest" => latest(&fold::latest_fold(xs)),
        "fold/latest-by" => thing_states(xs),
        "fold/heads" => over_whole_heads(
            |s| {
                object(vec![
                    ("max", result(s.max_heads(), optional_int)),
                    ("limit-2", ids(s.limit(&2_u64.into()))),
                ])
            },
            xs,
        ),
        "fold/view" => over_whole_heads(
            |s| {
                let heads = s
                    .heads
                    .iter()
                    .map(|h| {
                        object(vec![
                            ("id", Json::Str(id_text(&h.id))),
                            (
                                "shown",
                                Json::Str(
                                    match h.shown {
                                        Shown::Here => "here",
                                        Shown::Withheld => "withheld",
                                        Shown::Erased => "erased",
                                    }
                                    .into(),
                                ),
                            ),
                        ])
                    })
                    .collect();
                object(vec![
                    ("heads", Json::Arr(heads)),
                    ("max", result(s.max_heads(), optional_int)),
                ])
            },
            xs,
        ),
        "fold/select" => {
            let ev = |r: &Record| Cond::all(cs, r);
            object(vec![
                (
                    "count",
                    result(families::count_acc().select(ev, xs), integer),
                ),
                ("sum", result(families::sum_acc().select(ev, xs), Json::Int)),
            ])
        }
        _ => return Err(format!("unknown fold layer {layer}")),
    })
}

/// Gen.Run.foldAnswer/selectRun (model/Gen/Run.lean), Gen.Encode.jPerThing (model/Gen/Encode.lean).
/// Every order is independent; caller compares its complete integer-JSON answer to expect.
pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    // Gen.Run.answer dispatch is closed, even if there are no orders.
    if ![
        "fold/count",
        "fold/sum",
        "fold/extrema",
        "fold/latest",
        "fold/latest-by",
        "fold/heads",
        "fold/view",
        "fold/select",
    ]
    .contains(&layer)
    {
        return Err(format!("unknown fold layer {layer}"));
    }
    let allowed = if layer == "fold/select" {
        &["where", "orders"][..]
    } else {
        &["orders"][..]
    };
    let kvs = members("input", allowed, input)?;
    let cs = if layer == "fold/select" {
        let w = required("input", kvs, "where")?;
        if !w.keys_distinct() {
            return Err("input.where: repeats key".into());
        }
        parse_where("where", w).map_err(|e| e.to_string())?.conds()
    } else {
        Vec::new()
    };
    let orders = list("input.orders", required("input", kvs, "orders")?)?;
    if orders.is_empty() {
        return Err("input.orders: no arrival order".into());
    }
    orders
        .iter()
        .enumerate()
        .map(|(i, o)| {
            let path = format!("input.orders[{i}]");
            let xs = list(&path, o)?
                .iter()
                .enumerate()
                .map(|(j, r)| record(&format!("{path}[{j}]"), r))
                .collect::<Result<Vec<_>, _>>()?;
            one(layer, &xs, &cs)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{answers, record};
    use crate::parse;

    #[test]
    fn decoder_has_no_hidden_defaults_or_payloads() {
        let valid = r#"{"id":"r:0000000000000000000000000000000000000000000000000000","kind":"","observer":"","about":[],"prev":[],"emitted":"2026-01-01T00:00:00Z","value":"","n":0}"#;
        let raw = parse(valid);
        assert!(
            record("r", &raw).is_ok(),
            "reader does not enforce writer kind/ref rules"
        );
        for key in [
            "id", "kind", "observer", "about", "prev", "emitted", "value", "n",
        ] {
            let mut missing = raw.clone();
            let loops::json::Json::Obj(kvs) = &mut missing else {
                unreachable!()
            };
            kvs.retain(|(k, _)| k != key);
            assert!(record("r", &missing).is_err(), "required {key}");
        }
        for extra in [
            r#","shown":"hidden""#,
            r#","shown":"withheld""#,
            r#","under":null"#,
            r#","fields":{"n":1}"#,
            r#","fields":{"x":1,"x":2}"#,
            r#","unknown":1"#,
            r#","n":1"#,
        ] {
            let modified = format!("{}{extra}}}", &valid[..valid.len() - 1]);
            assert!(record("r", &parse(&modified)).is_err(), "{extra}");
        }
        let mut hidden = raw;
        let loops::json::Json::Obj(kvs) = &mut hidden else {
            unreachable!()
        };
        kvs.retain(|(k, _)| k != "value" && k != "n");
        kvs.push(("shown".into(), loops::json::Json::Str("erased".into())));
        let r = record("r", &hidden).expect("valid erased form");
        assert_eq!(r.n, loops::number::Int::default());
        assert_eq!(r.value, "");
        let bad_id = valid.replace(
            "0000000000000000000000000000000000000000000000000000",
            "0000000000000000000000000000000000000000000000000001",
        );
        assert!(
            record("r", &parse(&bad_id)).is_err(),
            "reject nonzero base32 padding"
        );
    }

    #[test]
    fn fixture_numbers_round_to_binary64_before_whole_readability() {
        let n = "170141183460469231731687303715884105728000";
        let input = format!(
            r#"{{"orders":[[{{"id":"r:0000000000000000000000000000000000000000000000000000","kind":"","observer":"","about":[],"prev":[],"emitted":"2026-01-01T00:00:00Z","value":"","n":{n}}}]]}}"#
        );
        let raw = parse(&input);
        let loops::json::Json::Obj(root) = &raw else {
            unreachable!()
        };
        let loops::json::Json::Arr(orders) = &root[0].1 else {
            unreachable!()
        };
        let loops::json::Json::Arr(xs) = &orders[0] else {
            unreachable!()
        };
        let record = record("r", &xs[0]).expect("big fixture");
        assert!(record.n_number.is_some());
        assert_eq!(
            answers("fold/sum", &raw).expect("big answer"),
            vec![parse("0")]
        );
        assert_eq!(
            answers("fold/extrema", &raw).expect("big extrema"),
            vec![parse(r#"{"min":0,"max":0}"#)]
        );
        // A genuine member with serde_json's number sentinel spelling stays an object.
        let sentinel = parse(r#"{"$serde_json::private::Number":"12"}"#);
        assert!(matches!(sentinel, loops::json::Json::Obj(_)));
        for (spelling, whole) in [("1.0", "1"), ("1e2", "100"), ("-2E0", "-2")] {
            assert_eq!(parse(spelling), parse(whole));
        }
    }

    #[test]
    fn unknown_layers_and_empty_orders_are_rejected() {
        let input = parse(r#"{"orders":[]}"#);
        assert!(answers("fold/future", &input).is_err());
        assert!(answers("fold/count", &input).is_err());
    }
}
