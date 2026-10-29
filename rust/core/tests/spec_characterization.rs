//! Layer-three parser and execution checks against model/Loops/Spec.lean.
mod support;
use loops::{
    families::Result as FoldResult,
    json::Json,
    number::Nat,
    record::{Digest, Record, Shown, Val, id_text},
    spec::{self, FoldType, Slot, SlotValue, Source, Spec},
    things,
    where_::{Tests, parse_where},
};

fn json(raw: &str) -> Json {
    support::parse(raw)
}
fn spec(raw: &str) -> Spec {
    Spec::of_json(&json(raw)).expect("valid spec")
}
fn slot(raw: &str) -> Slot {
    spec::parse_slot("s", &json(raw)).expect("valid slot")
}
fn rec(n: u8) -> Record {
    let mut bytes = [0; 32];
    bytes[31] = n;
    let id = Digest(bytes);
    assert_eq!(support::decode(&id_text(&id)[2..]), bytes);
    Record {
        id,
        kind: "task".into(),
        observer: "sl:alice".into(),
        about: vec!["task:one".into()],
        ..Record::default()
    }
}
fn count(value: u64, unread: u64) -> SlotValue {
    SlotValue::Nat(FoldResult {
        value: Nat::from(value),
        unread: Nat::from(unread),
    })
}

#[test]
fn duplicate_metadata_precedes_all_shape_checks() {
    for (raw, path) in [
        (r#"[{"hidden":{"x":1,"x":2}}]"#, "hidden.x"),
        (r#"{"":{"x":1,"x":2},"vertex":null}"#, ".x"),
        (r#"{"":1,"":2}"#, ""),
        (r#"{"query":{"z":1,"z":2},"vertex":null}"#, "query.z"),
        (
            r#"{"vertex":"x","fold":{"s":{"count":true,"note":[{"x":1,"x":2}]}},"vertex":"y"}"#,
            "fold.s.note.x",
        ),
        (r#"{"note":{"": [{"":1,"":2}]},"oops":false}"#, "note.."),
        (r#"{"note":{"x":{},"x":{"y":1,"y":2}}}"#, "note.x"),
    ] {
        let e = Spec::of_json(&json(raw)).expect_err("duplicate first");
        assert_eq!(
            (e.code(), e.path.as_str()),
            ("member-duplicate", path),
            "{raw}"
        );
    }
    assert_eq!(spec::member_path(None, "x"), "x");
    assert_eq!(spec::member_path(Some(""), "x"), ".x");
    assert!(
        matches!(Spec::of_json(&Json::Null), Err(e) if e.code() == "spec-not-object" && e.path.is_empty())
    );
}

#[test]
fn refusal_priority_follows_fixed_checks_not_written_order() {
    for (raw, code, path) in [
        (
            r#"{"fold":false,"from":false,"vertex":false,"z":0,"a":0}"#,
            "unknown-key",
            "z",
        ),
        (r#"{"fold":false,"from":false}"#, "vertex-missing", "vertex"),
        (
            r#"{"fold":false,"from":false,"vertex":""}"#,
            "vertex-invalid",
            "vertex",
        ),
        (r#"{"fold":false,"vertex":"x"}"#, "from-missing", "from"),
        (
            r#"{"vertex":"x","fold":false,"from":[]}"#,
            "from-missing",
            "from",
        ),
        (
            r#"{"vertex":"x","fold":false,"from":false}"#,
            "from-invalid",
            "from",
        ),
        (
            r#"{"vertex":"x","from":[{"store":"."}],"fold":false}"#,
            "fold-invalid",
            "fold",
        ),
    ] {
        let e = Spec::of_json(&json(raw)).expect_err("invalid spec");
        assert_eq!((e.code(), e.path.as_str()), (code, path), "{raw}");
    }
    for (raw, code, path) in [
        (
            r#"{"where":{},"sum":false,"follow":false,"limit":0,"other":0}"#,
            "unknown-key",
            "fold.s.other",
        ),
        (
            r#"{"where":{},"count":false,"sum":false,"follow":false,"limit":0}"#,
            "fold-type",
            "fold.s",
        ),
        (
            r#"{"where":{},"count":false,"follow":false,"limit":0}"#,
            "follow-invalid",
            "fold.s.follow",
        ),
        (
            r#"{"where":{},"latest-by":false,"limit":0}"#,
            "follow-missing",
            "fold.s.follow",
        ),
        (
            r#"{"where":{},"count":false,"limit":0}"#,
            "limit-invalid",
            "fold.s.limit",
        ),
        (
            r#"{"where":{},"count":false}"#,
            "fold-argument",
            "fold.s.count",
        ),
        (
            r#"{"where":{"x":{"matches":true},"env.id":{}},"count":true}"#,
            "where-invalid",
            "fold.s.where.x",
        ),
    ] {
        let e = spec::parse_slot("s", &json(raw)).expect_err("invalid slot");
        assert_eq!((e.code(), e.path.as_str()), (code, path), "{raw}");
    }
    assert_eq!(
        spec::parse_slot("", &json(r#"{"bad":false}"#))
            .expect_err("empty name")
            .path,
        "fold."
    );
    for (raw, path) in [
        (
            r#"{"about":false,"kind":false,"store":false,"bad":0}"#,
            "from.bad",
        ),
        (
            r#"{"about":false,"kind":false,"store":false}"#,
            "from.store",
        ),
        (r#"{"about":false,"kind":false,"store":"."}"#, "from.kind"),
        (r#"{"about":false,"store":"."}"#, "from.about"),
    ] {
        let e = spec::parse_source(&json(raw)).expect_err("invalid source");
        assert_eq!(e.path, path);
    }
}

#[test]
fn low_level_parsers_do_not_add_boundary_checks() {
    let raw = json(
        r#"{"vertex":"first","vertex":"second","from":[{"store":".","store":"other"}],"note":{"x":1,"x":2}}"#,
    );
    let sp = Spec::of_object(&raw).expect("raw helper accepts repeats");
    assert_eq!(sp.vertex, "first");
    assert_eq!(sp.sources[0].store, ".");
    assert!(Spec::of_json(&raw).is_err());
    let repeated = json(r#"{"count":true,"count":true}"#);
    let Json::Obj(kvs) = &repeated else {
        unreachable!()
    };
    assert_eq!(
        spec::slot_type("p", kvs)
            .expect_err("two written types")
            .code(),
        "fold-type"
    );
    assert!(spec::check_keys(&["count"], None, kvs).is_ok());
    assert!(
        spec::parse_slot(
            "s",
            &json(r#"{"count":true,"where":{"x":{"is":1,"is":2}}}"#)
        )
        .is_ok()
    );
    assert_eq!(
        spec::fold_type("p", "count", true, Some(0_u64.into()), &Json::Bool(true))
            .expect("raw fold ignores follow and limit"),
        FoldType::Count
    );
    assert!(!spec::slot_follow("p", "unknown", None).expect("raw no follow"));
    assert_eq!(
        spec::slot_limit("p", "unknown", None).expect("raw no limit"),
        None
    );
    assert_eq!(
        spec::source_kinds(None).expect("no kinds"),
        Vec::<String>::new()
    );
    assert_eq!(spec::source_about(None).expect("no about"), None);
    assert_eq!(
        spec::spec_slots(None).expect("no slots"),
        Vec::<Slot>::new()
    );
    assert_eq!(
        spec::slot_tests("p", None).expect("no tests"),
        Tests::default()
    );
    assert_eq!(
        spec::parse_kinds("p", &json(r#"["task","task"]"#)).expect("ordered kinds"),
        vec!["task", "task"]
    );
    assert_eq!(
        spec::field_arg("p", &Json::Str("env.fake".into())).expect("opaque payload name"),
        "env.fake"
    );
    for raw in [
        "null",
        "false",
        "0",
        "[]",
        r#"[""]"#,
        r#"["task",0]"#,
        r#""task""#,
    ] {
        assert!(spec::parse_kinds("p", &json(raw)).is_err(), "{raw}");
    }
    for raw in ["null", "false", "0", r#""""#, r#""untyped""#] {
        assert!(spec::source_about(Some(&json(raw))).is_err(), "{raw}");
    }
    for raw in ["null", "false", "0", r#""""#] {
        assert!(spec::source_store(Some(&json(raw))).is_err(), "{raw}");
        assert!(spec::field_arg("p", &json(raw)).is_err(), "{raw}");
    }
    for raw in ["0", "-1", "true", r#""1""#] {
        assert!(
            spec::slot_limit("p", "collect", Some(&json(raw))).is_err(),
            "{raw}"
        );
    }
    for raw in ["null", "false", r#""next""#] {
        assert!(
            spec::slot_follow("p", "collect", Some(&json(raw))).is_err(),
            "{raw}"
        );
    }
}

#[test]
fn serialization_retains_spelling_orders_and_only_runtime_members() {
    let input = r#"{"note":{"anything":true},"vertex":"x","from":[{"about":"task:one","kind":["task","task"],"store":"."},{"store":"other"}],"fold":{"z":{"where":{"env.occurred":{"below":"2026-10-01T01:00:00+01:00","is":"2026-09"},"env.kind":{"not":"draft"}},"limit":2,"follow":"prev","collect":true,"note":"drop"},"a":{"sum":"n"},"b":{"min":"n"},"c":{"max":"n"},"d":{"count":true},"e":{"follow":"prev","latest-by":"about"}},"ticks":[],"order":{},"resolve":true,"window":null,"boundary":[],"param":0,"covers":{},"into":false,"bundle":[]}"#;
    let sp = spec(input);
    let expected = json(
        r#"{"vertex":"x","from":[{"store":".","kind":["task","task"],"about":"task:one"},{"store":"other"}],"fold":{"z":{"collect":true,"follow":"prev","limit":2,"where":{"env.occurred":{"below":"2026-10-01T01:00:00+01:00","is":"2026-09"},"env.kind":{"not":"draft"}}},"a":{"sum":"n"},"b":{"min":"n"},"c":{"max":"n"},"d":{"count":true},"e":{"latest-by":"about","follow":"prev"}}}"#,
    );
    assert_eq!(sp.to_json(), expected);
    assert_eq!(Spec::of_json(&expected).expect("round trip"), sp);
    let other = spec(&input.replace("2026-10-01T01:00:00+01:00", "2026-10-01T00:00:00Z"));
    assert_ne!(sp, other, "full spec equality includes claim text");
    let stamp = loops::time::instant("2026-10-01T01:00:00+01:00").expect("instant");
    assert_eq!(support::utc(&stamp), "2026-10-01T00:00:00Z");
    let raw = json(
        r#"{"z":{"is":true,"not":false,"present":true,"absent":true},"a":{"below":5,"at-least":-3},"z":{"is":""}}"#,
    );
    assert_eq!(
        parse_where("w", &raw)
            .expect("raw repeated tests")
            .to_json(),
        raw
    );
    assert_eq!(
        Val::Int("99999999999999999999999999".parse().expect("big int")).to_json(),
        json("99999999999999999999999999")
    );
}

#[test]
fn admission_uses_all_held_targets_original_input_and_envelopes() {
    let a = rec(1);
    let mut b = rec(2);
    b.prev = vec![a.id, a.id, rec(99).id];
    assert!(things::entitled(std::slice::from_ref(&a), &b, |r, q| r
        .observer
        == q.observer));
    assert!(!things::entitled(std::slice::from_ref(&a), &b, |_, _| {
        false
    }));
    assert!(
        things::entitled(&[], &b, |_, _| false),
        "unknown prev passes"
    );
    let bad = Record {
        about: vec!["task:other".into()],
        ..a.clone()
    };
    assert!(
        !things::entitled(&[a.clone(), bad], &b, |_, _| true),
        "every matching target must share a thing"
    );
    let bad = Record {
        observer: "sl:bob".into(),
        ..a.clone()
    };
    assert!(
        !things::entitled(&[a.clone(), bad], &b, |r, q| r.observer == q.observer),
        "every matching target must pass may"
    );
    let hidden = a.withhold();
    assert!(things::entitled(&[hidden], &b.withhold(), |r, q| r
        .observer
        == q.observer));
    let q = Record {
        prev: vec![a.id],
        about: vec!["task:other".into()],
        ..rec(2)
    };
    let r = Record {
        prev: vec![q.id],
        ..rec(3)
    };
    let xs = [a.clone(), q, r.clone()];
    assert_eq!(things::admit(&xs, |_, _| true), vec![a.clone()]);
    assert!(
        things::entitled(std::slice::from_ref(&a), &r, |_, _| true),
        "iterative removal would revive r"
    );
    assert_eq!(
        things::ids_of(&[r.clone(), a.clone(), r]),
        vec![a.id, rec(3).id]
    );
    let sp = spec(r#"{"vertex":"x","from":[{"store":"."}],"fold":{"c":{"count":true}}}"#);
    assert_eq!(sp.run(&xs)[0].1, count(1, 0));
    assert_eq!(
        sp.run_with(&[a.clone(), b.clone()], |_, _| false)[0].1,
        count(1, 0)
    );
    assert_eq!(sp.run(&[a, b])[0].1, count(2, 0));
}

#[test]
fn supersession_precedes_sources_envelope_and_payload_tests() {
    let old = Record {
        fields: vec![("status".into(), Val::Str("open".into()))],
        ..rec(1)
    };
    let successor = Record {
        prev: vec![old.id],
        kind: "done".into(),
        observer: "sl:bob".into(),
        ..rec(2)
    };
    for new in [successor.clone(), successor.withhold()] {
        let xs = [old.clone(), new];
        let sp = spec(
            r#"{"vertex":"x","from":[{"store":".","kind":["task"]}],"fold":{"l":{"latest-by":"about","follow":"prev"},"f":{"collect":true,"follow":"prev"},"all":{"collect":true}}}"#,
        );
        let values = sp.run(&xs);
        assert_eq!(
            values[0].1,
            SlotValue::Things {
                things: vec![],
                unread: 0_u64.into()
            }
        );
        assert_eq!(
            values[1].1,
            SlotValue::Heads {
                heads: vec![],
                unread: 0_u64.into()
            }
        );
        assert_eq!(
            values[2].1,
            SlotValue::Heads {
                heads: vec![(old.id, Shown::Here)],
                unread: 0_u64.into()
            }
        );
    }
    let xs = [
        old.clone(),
        Record {
            kind: "task".into(),
            ..successor
        },
    ];
    for raw in [
        r#"{"latest-by":"about","follow":"prev","where":{"env.observer":{"is":"sl:alice"}}}"#,
        r#"{"latest-by":"about","follow":"prev","where":{"status":{"is":"open"}}}"#,
    ] {
        assert_eq!(
            slot(raw).run(|_| true, &xs),
            SlotValue::Things {
                things: vec![],
                unread: 0_u64.into()
            }
        );
    }
    let hidden = Record {
        prev: vec![old.id],
        ..rec(2)
    }
    .withhold();
    assert_eq!(
        slot(r#"{"latest-by":"about","follow":"prev","where":{"status":{"is":"open"}}}"#)
            .run(|_| true, &[old, hidden]),
        SlotValue::Things {
            things: vec![],
            unread: 1_u64.into()
        }
    );
}

#[test]
fn hidden_payloads_and_unknown_counts_differ_by_slot() {
    let mut a = rec(1).withhold();
    a.about.push("task:two".into());
    let b = a.erase();
    let xs = [a.clone(), b];
    let latest = slot(r#"{"latest-by":"about","follow":"prev","where":{"x":{"present":true}}}"#);
    assert_eq!(
        latest.run(|_| true, &xs),
        SlotValue::Things {
            things: vec![],
            unread: 1_u64.into()
        }
    );
    let collect =
        slot(r#"{"collect":true,"follow":"prev","limit":1,"where":{"x":{"present":true}}}"#);
    assert_eq!(
        collect.run(|_| true, &xs),
        SlotValue::Heads {
            heads: vec![],
            unread: 2_u64.into()
        }
    );
    assert_eq!(slot(r#"{"count":true}"#).run(|_| true, &xs), count(2, 0));
    assert_eq!(
        slot(r#"{"count":true,"where":{"x":{"present":true}}}"#).run(|_| true, &xs),
        count(0, 2)
    );
    assert_eq!(
        slot(r#"{"collect":true}"#).run(|_| true, std::slice::from_ref(&a)),
        SlotValue::Heads {
            heads: vec![(a.id, Shown::Withheld)],
            unread: 0_u64.into()
        }
    );
    assert_eq!(
        slot(r#"{"latest-by":"about","follow":"prev"}"#).run(|_| true, std::slice::from_ref(&a)),
        SlotValue::Things {
            things: vec![
                ("task:one".into(), vec![(a.id, Shown::Withheld)]),
                ("task:two".into(), vec![(a.id, Shown::Withheld)])
            ],
            unread: 0_u64.into()
        }
    );
    assert_eq!(
        slot(r#"{"collect":true,"follow":"prev"}"#).run(|_| true, std::slice::from_ref(&a)),
        SlotValue::Heads {
            heads: vec![(a.id, Shown::Withheld)],
            unread: 0_u64.into()
        },
        "one head shared by two things appears once"
    );
    let known = rec(2);
    let heads = slot(r#"{"collect":true,"limit":1,"where":{"x":{"absent":true}}}"#)
        .run(|_| true, &[a, known, rec(3)]);
    assert_eq!(
        heads,
        SlotValue::Heads {
            heads: vec![(rec(3).id, Shown::Here)],
            unread: 1_u64.into()
        }
    );
}

#[test]
fn run_keeps_raw_duplicate_ids_and_does_not_settle_or_dedup() {
    let a = rec(1);
    let b = Record {
        value: "different".into(),
        ..a.clone()
    };
    assert_eq!(spec::newest_first(&[a.clone(), b.clone()]).len(), 2);
    let linked = Record {
        prev: vec![rec(99).id],
        ..a.clone()
    };
    assert_eq!(
        spec::newest_first(&[a.clone(), linked]),
        vec![a.clone()],
        "equality follows link removal"
    );
    let sp = spec(
        r#"{"vertex":"x","from":[{"store":"."}],"fold":{"c":{"count":true},"all":{"collect":true}}}"#,
    );
    assert_eq!(sp.run(&[a.clone(), a.clone(), b.clone()])[0].1, count(3, 0));
    assert_eq!(
        sp.run(&[a.clone(), b])[1].1,
        SlotValue::Heads {
            heads: vec![(a.id, Shown::Here), (a.id, Shown::Here)],
            unread: 0_u64.into()
        }
    );
    let forms = [a.clone(), a.withhold()];
    assert_eq!(
        sp.run(&forms)[0].1,
        count(2, 0),
        "run does not settle the forms"
    );
    assert_eq!(sp.select(&forms), forms);
    let absent = Spec {
        sources: vec![],
        ..sp
    };
    assert!(!absent.takes(&a));
    assert_eq!(absent.select(&forms), Vec::<Record>::new());
    let anchor = Record {
        about: vec![],
        ..a.clone()
    };
    let source = Source {
        store: "ignored-at-run".into(),
        kinds: vec![],
        about: Some(id_text(&a.id)),
    };
    assert!(source.takes(&anchor));
}

#[test]
fn spec_limits_arguments_and_numeric_results_remain_unbounded() {
    let big = "340282366920938463463374607431768211457";
    let mut a = rec(1);
    a.n = big.parse().expect("big int");
    let mut b = rec(2);
    b.n = a.n.clone();
    let xs = [a.clone(), b.clone(), rec(3).withhold()];
    assert_eq!(
        slot(r#"{"sum":"n"}"#).run(|_| true, &xs),
        SlotValue::Int(FoldResult {
            value: "680564733841876926926749214863536422914"
                .parse()
                .expect("big sum"),
            unread: 1_u64.into()
        })
    );
    assert_eq!(
        slot(r#"{"min":"n"}"#).run(|_| true, &xs),
        SlotValue::Opt(FoldResult {
            value: Some(a.n.clone()),
            unread: 1_u64.into()
        })
    );
    assert_eq!(
        slot(r#"{"max":"n"}"#).run(|_| true, &xs),
        SlotValue::Opt(FoldResult {
            value: Some(a.n.clone()),
            unread: 1_u64.into()
        })
    );
    for limit in ["18446744073709551616", "18446744073709551617", big] {
        let raw = format!(r#"{{"collect":true,"limit":{limit}}}"#);
        let s = slot(&raw);
        assert_eq!(s.to_json().1, json(&raw));
        assert_eq!(
            s.run(|_| true, &[a.clone(), b.clone()]),
            SlotValue::Heads {
                heads: vec![(b.id, Shown::Here), (a.id, Shown::Here)],
                unread: 0_u64.into()
            }
        );
    }
    let tests = slot(&format!(
        r#"{{"count":true,"where":{{"n":{{"is":{big}}}}}}}"#
    ));
    assert_eq!(tests.run(|_| true, &[a, b]), count(2, 0));
    let empty: &[i32] = &[];
    assert_eq!(spec::limit_to(Some(&0_u64.into()), &[1, 2]), empty);
    assert_eq!(spec::limit_to(None, &[1, 2]), &[1, 2]);
}
