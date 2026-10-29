//! Selection dependencies pulled forward from model/Loops/Spec.lean.
use loops::{
    families::Tri,
    json::Json,
    number::{Int, Nat},
    occurred::Claim,
    record::{Record, Val, id_text},
    where_::{
        Arg, Cond, EnvField, Field, FieldType, Item, Op, RefusalCode, parse_arg, parse_bound,
        parse_op, parse_where,
    },
};

fn error_type<E: std::error::Error + Send + Sync + 'static>(_: &E) {}

fn obj(xs: Vec<(&str, Json)>) -> Json {
    Json::Obj(xs.into_iter().map(|(k, v)| (k.into(), v)).collect())
}
fn text(s: &str) -> Json {
    Json::Str(s.into())
}
fn cond(name: &str, op: Op) -> Cond {
    Cond {
        field: Field::of_name(name).expect("test field"),
        op,
    }
}

#[test]
fn field_reads_preserve_raw_lists_and_first_lookup() {
    let r = Record {
        kind: "k".into(),
        observer: "o:x".into(),
        about: vec!["z".into(), "a".into(), "z".into()],
        prev: vec![Nat::from(2), Nat::from(1), Nat::from(2)],
        under: Some(Nat::from(4)),
        erases: vec![Nat::from(8), Nat::from(8)],
        fields: vec![
            ("score".into(), Val::Int(Int::from(6_i64))),
            ("score".into(), Val::Bool(true)),
        ],
        ..Record::default()
    };
    let item = |s: &str| Item::Val(Val::Str(s.into()));
    assert_eq!(Field::Env(EnvField::Kind).read(&r), Some(vec![item("k")]));
    assert_eq!(
        Field::Env(EnvField::Observer).read(&r),
        Some(vec![item("o:x")])
    );
    assert_eq!(
        Field::Env(EnvField::About).read(&r),
        Some(vec![item("z"), item("a"), item("z")])
    );
    for (f, ns) in [
        (EnvField::Prev, vec![2, 1, 2]),
        (EnvField::Under, vec![4]),
        (EnvField::Erases, vec![8, 8]),
    ] {
        assert_eq!(
            Field::Env(f).read(&r),
            Some(
                ns.into_iter()
                    .map(|n| item(&id_text(&Nat::from(n))))
                    .collect()
            )
        );
    }
    assert_eq!(
        Field::of_name("score").expect("field").read(&r),
        Some(vec![Item::Val(Val::Int(Int::from(6_i64)))])
    );
    assert_eq!(
        Field::of_name("missing").expect("field").read(&r),
        Some(vec![])
    );
    for hidden in [r.withhold(), r.erase()] {
        assert_eq!(Field::of_name("score").expect("field").read(&hidden), None);
        assert_eq!(
            Field::of_name("missing").expect("field").read(&hidden),
            None
        );
        for f in EnvField::ALL {
            assert_eq!(Field::Env(f).read(&hidden), Field::Env(f).read(&r), "{f:?}");
            assert!(Field::Env(f).on_envelope());
            assert_eq!(Field::of_name(&Field::Env(f).name()), Some(Field::Env(f)));
        }
    }
    assert!(!Field::of_name("kind").expect("payload").on_envelope());
    for bad in ["", "env.", "env.typo"] {
        assert_eq!(Field::of_name(bad), None);
    }
}

#[test]
fn time_equality_is_span_but_bounds_use_start_and_missing_is_known_empty() {
    let day = Claim::of("2026-03-02").expect("day");
    let approx = Claim::of("2026-03-02?").expect("approx day");
    let point = Claim::of("2026-03-02T00:00:00Z").expect("point");
    let r = Record {
        occurred: Some(day.clone()),
        ..Record::default()
    };
    let read = Field::Env(EnvField::Occurred)
        .read(&r)
        .expect("envelope known");
    assert!(Op::Is(Arg::Time(approx)).test(&read));
    assert!(!Op::Is(Arg::Time(point.clone())).test(&read));
    assert!(Op::AtLeast(Arg::Time(point.clone())).test(&read));
    assert!(!Op::Below(Arg::Time(point)).test(&read));
    assert!(Op::Below(Arg::Time(Claim::of("2026-03-03").expect("day"))).test(&read));
    let no_occurred = Record::default();
    assert_eq!(
        Field::Env(EnvField::Occurred).read(&no_occurred),
        Some(vec![])
    );
    assert_eq!(
        cond("env.occurred", Op::Not(Arg::Time(day))).eval(&no_occurred),
        Tri::Yes
    );
    assert_eq!(
        cond("env.occurred", Op::Absent).eval(&no_occurred),
        Tri::Yes
    );
    assert_eq!(
        cond("env.occurred", Op::Present).eval(&no_occurred),
        Tri::No
    );
    assert_eq!(
        cond("missing", Op::Absent).eval(&no_occurred.withhold()),
        Tri::Unknown
    );
    assert!(!Item::Val(Val::Bool(true)).at_least(&Arg::Val(Val::Int(Int::default()))));
    let emitted = Field::Env(EnvField::Emitted).read(&r).expect("emitted");
    assert!(Op::Is(Arg::Time(Claim::of(r.emitted.text()).expect("stamp claim"))).test(&emitted));
    assert!(!Op::Is(Arg::Val(Val::Str("not a time".into()))).test(&read));
}

#[test]
fn no_dominates_unknown_in_both_orders_and_empty_conjunction_holds() {
    assert_eq!(Tri::default(), Tri::Yes);
    for a in [Tri::No, Tri::Unknown, Tri::Yes] {
        for b in [Tri::No, Tri::Unknown, Tri::Yes] {
            let expected = if a == Tri::No || b == Tri::No {
                Tri::No
            } else if a == Tri::Unknown || b == Tri::Unknown {
                Tri::Unknown
            } else {
                Tri::Yes
            };
            assert_eq!(a.and(b), expected);
        }
    }
    let hidden = Record::default().withhold();
    let unknown = cond("score", Op::Present);
    let no = cond("env.kind", Op::Is(Arg::Val(Val::Str("wrong kind".into()))));
    assert_eq!(Cond::all(&[], &hidden), Tri::Yes);
    assert_eq!(Cond::all(&[unknown.clone(), no.clone()], &hidden), Tri::No);
    assert_eq!(Cond::all(&[no, unknown.clone()], &hidden), Tri::No);
    assert_eq!(Cond::all(&[unknown], &hidden), Tri::Unknown);
}

#[test]
fn parser_retains_written_field_operator_and_duplicate_order() {
    let is = |v| obj(vec![("is", v)]);
    let raw = obj(vec![
        (
            "z",
            obj(vec![
                ("below", Json::Int(Int::from(9_i64))),
                ("present", Json::Bool(true)),
            ]),
        ),
        ("a", is(text(""))),
        ("z", is(Json::Bool(false))),
    ]);
    let parsed = parse_where("where", &raw).expect("duplicates belong to outer boundary");
    assert_eq!(
        parsed.0.iter().map(|(f, _)| f.name()).collect::<Vec<_>>(),
        vec!["z", "a", "z"]
    );
    let cs = parsed.conds();
    assert!(matches!(cs[0].op, Op::Below(_)));
    assert_eq!(cs[1].op, Op::Present);
    assert_eq!(cs[2].op, Op::Is(Arg::Val(Val::Str(String::new()))));
    assert_eq!(cs[3].op, Op::Is(Arg::Val(Val::Bool(false))));
    let duplicate_op = obj(vec![(
        "score",
        obj(vec![("is", text("x")), ("is", text("y"))]),
    )]);
    assert_eq!(
        parse_where("where", &duplicate_op)
            .expect("no recursive distinct check")
            .conds()
            .len(),
        2
    );
    let first = obj(vec![
        ("z", obj(vec![("present", Json::Bool(false))])),
        ("env.nope", is(text("x"))),
    ]);
    let err = parse_where("where", &first).expect_err("first invalid field");
    assert_eq!(err.code, RefusalCode::WhereInvalid);
    assert_eq!(err.code(), "where-invalid");
    assert_eq!(err.path, "where.z");
    assert_eq!(err.to_string(), "where-invalid at where.z");
    error_type(&err);
    for (j, path) in [
        (Json::Null, "where"),
        (obj(vec![]), "where"),
        (obj(vec![("", is(text("x")))]), "where."),
        (obj(vec![("env.nope", is(text("x")))]), "where.env.nope"),
        (obj(vec![("env.kind", obj(vec![]))]), "where.env.kind"),
        (obj(vec![("env.kind", Json::Bool(true))]), "where.env.kind"),
        (
            obj(vec![("n", obj(vec![("z-unknown", text("x"))]))]),
            "where.n",
        ),
    ] {
        assert_eq!(parse_where("where", &j).expect_err("invalid").path, path);
    }
}

#[test]
fn parser_domains_bounds_and_true_only_operators_are_closed() {
    let huge: Int = "170141183460469231731687303715884105728000"
        .parse()
        .expect("big Int");
    for j in [text(""), Json::Int(huge.clone()), Json::Bool(false)] {
        assert!(parse_arg(FieldType::Payload, "p", &j).is_ok());
    }
    for ty in [
        FieldType::Text,
        FieldType::Refs,
        FieldType::Ids,
        FieldType::Time,
    ] {
        for j in [
            text(""),
            Json::Int(huge.clone()),
            Json::Bool(true),
            Json::Null,
            Json::Arr(vec![]),
        ] {
            assert!(parse_arg(ty, "p", &j).is_err(), "{ty:?}: {j:?}");
        }
    }
    for (ty, s) in [
        (FieldType::Text, "nonempty"),
        (FieldType::Refs, "t:thing"),
        (
            FieldType::Ids,
            "r:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab",
        ),
        (FieldType::Time, "2026-01"),
        (FieldType::Time, "2026-01-01?"),
    ] {
        assert!(parse_arg(ty, "p", &text(s)).is_ok(), "{ty:?}: {s}");
    }
    // Id arguments use envelope.recordId, not the stricter fixture base32 decoder.
    assert!(parse_arg(FieldType::Ids, "p", &text("r:bad")).is_err());
    assert!(parse_arg(FieldType::Refs, "p", &text("not a ref")).is_err());
    assert!(parse_bound(FieldType::Payload, "p", &Json::Int(huge)).is_ok());
    assert!(parse_bound(FieldType::Payload, "p", &text("12")).is_err());
    assert!(parse_bound(FieldType::Payload, "p", &Json::Bool(true)).is_err());
    assert!(parse_bound(FieldType::Time, "p", &text("2026-01-01/..")).is_ok());
    for ty in [FieldType::Text, FieldType::Refs, FieldType::Ids] {
        assert!(parse_bound(ty, "p", &text("x")).is_err());
    }
    for op in ["present", "absent"] {
        assert!(parse_op(FieldType::Payload, "p", op, &Json::Bool(true)).is_ok());
        assert!(parse_op(FieldType::Payload, "p", op, &Json::Bool(false)).is_err());
        assert!(parse_op(FieldType::Payload, "p", op, &text("true")).is_err());
    }
}
