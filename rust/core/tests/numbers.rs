//! Numeric boundaries, canonical text, and raw versus readable fold behavior.
use loops::{
    envelope::Env,
    families::{self, Tri},
    fold::{self, LatestBy},
    json::Json,
    number::{Int, Nat, Number},
    record::{Digest, Record, Shown, Val},
    stored::{self, Error},
    where_::{self, FieldType},
};

fn number(text: &str) -> Number {
    text.parse().expect("the test contains a finite number")
}

#[test]
fn rounds_once_before_testing_safe_whole_bounds() {
    for (text, expected) in [
        ("9007199254740990.5", Some(9_007_199_254_740_990_i64)),
        ("9007199254740991", Some(9_007_199_254_740_991)),
        ("9007199254740991.1", Some(9_007_199_254_740_991)),
        ("9007199254740991.5", None),
        ("-9007199254740991.1", Some(-9_007_199_254_740_991)),
        ("-9007199254740991.5", None),
        ("1.0000000000000001", Some(1)),
        ("1.5", None),
        ("1e-400", Some(0)),
    ] {
        assert_eq!(number(text).whole(), expected.map(Int::from), "{text}");
    }
    // An integer intermediate rounds this input to the wrong binary64 value.
    assert_eq!(
        number("9007199254740993.0001").bits(),
        9_007_199_254_740_994_f64.to_bits()
    );
}

#[test]
fn refuses_nonfinite_and_invalid_numbers() {
    for value in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        assert!(Number::new(value).is_err(), "{value}");
    }
    for text in ["NaN", "inf", "-inf", "1e400", "not a number", ""] {
        assert!(text.parse::<Number>().is_err(), "{text}");
    }
}

#[test]
fn canonical_notation_uses_ecmascript_boundaries() {
    for (text, expected) in [
        ("1e-6", "0.000001"),
        ("1e-7", "1e-7"),
        ("1e20", "100000000000000000000"),
        ("1e21", "1e+21"),
        ("-1.25e21", "-1.25e+21"),
        ("4.50", "4.5"),
        ("333333333.33333329", "333333333.3333333"),
        ("1e30", "1e+30"),
        ("5e-324", "5e-324"),
        ("1.7976931348623157e308", "1.7976931348623157e+308"),
        ("1e-5", "0.00001"),
        ("-12.345", "-12.345"),
    ] {
        assert_eq!(number(text).canon(), expected, "{text}");
    }
}

#[test]
fn shortest_decimal_ties_choose_the_even_coefficient() {
    // es6-numbers.txt row 167 is exactly 1424953923781206.25, not its shortest text.
    let row = 0x4314_3ff3_c1cb_0959_u64;
    for (bits, expected) in [
        (row - 3, "1424953923781205.5"),
        (row - 2, "1424953923781205.8"),
        (row - 1, "1424953923781206"),
        (row, "1424953923781206.2"),
        (row + 1, "1424953923781206.5"),
        (row + 2, "1424953923781206.8"),
        (row + 3, "1424953923781207"),
        (row + 4, "1424953923781207.2"),
    ] {
        for (bits, expected) in [
            (bits, expected.to_owned()),
            (bits | (1 << 63), format!("-{expected}")),
        ] {
            let value = Number::new(f64::from_bits(bits)).expect("the test bits are finite");
            let canonical = value.canon();
            assert_eq!(canonical, expected, "bits {bits:016x}");
            assert_eq!(number(&canonical).bits(), bits, "roundtrip {canonical}");
        }
    }
}

#[test]
fn notation_boundary_neighbors_preserve_shortest_roundtrips() {
    for (text, expected) in [
        ("9.999999999999997e-7", "9.999999999999997e-7"),
        ("1e-6", "0.000001"),
        ("1.0000000000000002e-6", "0.0000010000000000000002"),
        ("999999999999999900000", "999999999999999900000"),
        ("1e21", "1e+21"),
        ("1.0000000000000001e21", "1.0000000000000001e+21"),
    ] {
        for text in [text.to_owned(), format!("-{text}")] {
            let value = number(&text);
            let canonical = value.canon();
            let sign = if text.starts_with('-') { "-" } else { "" };
            assert_eq!(canonical, format!("{sign}{expected}"), "{text}");
            assert_eq!(number(&canonical).bits(), value.bits(), "roundtrip {text}");
        }
    }
}

#[test]
fn signed_zero_keeps_bits_but_writes_zero() {
    let positive = number("0");
    let negative = number("-0");
    assert_ne!(positive, negative);
    assert_eq!(negative.bits(), (-0.0_f64).to_bits());
    for zero in [positive, negative, number("-1e-400")] {
        assert_eq!(zero.canon(), "0");
        assert_eq!(zero.whole(), Some(Int::from(0_i64)));
    }
}

#[test]
fn json_keeps_raw_validation_and_utf16_first_wins() {
    let json = Json::Obj(vec![
        ("\u{e000}".into(), Json::Number(number("1e21"))),
        ("\u{1f600}".into(), Json::Number(number("1.5"))),
        (
            "\u{1f600}".into(),
            Json::Int(Int::from(9_007_199_254_740_992_i64)),
        ),
    ]);
    assert_eq!(json.canon(), "{\"😀\":1.5,\"\u{e000}\":1e+21}");
    assert!(!json.keys_distinct());
    assert!(!json.in_range());
    assert!(!Json::Number(number("1e308")).in_range());
    assert!(Json::Int(Int::from(9_007_199_254_740_991_i64)).in_range());
}

#[test]
fn writer_checks_rounded_magnitude_not_whole_number_readability() {
    let env = Env {
        kind: "note".into(),
        observer: "o:test".into(),
        emitted: "2026-10-21T00:00:00Z".into(),
        ..Env::default()
    };
    for text in [
        "9007199254740991",
        "-9007199254740991",
        "9007199254740991.1",
        "-9007199254740991.1",
        "1.5",
        "-1.5",
        "1424953923781206.25",
        "5e-324",
        "-0",
    ] {
        let n = number(text);
        assert!(n.in_range(), "{text}");
        assert!(
            stored::write(env.clone(), vec![0; 16], Json::Number(n)).is_ok(),
            "{text}"
        );
    }
    for text in [
        "9007199254740992",
        "-9007199254740992",
        "9007199254740991.5",
        "-9007199254740991.5",
        "1e30",
        "-1e30",
        "1.7976931348623157e308",
        "-1.7976931348623157e308",
    ] {
        let n = number(text);
        assert!(!n.in_range(), "{text}");
        assert_eq!(
            number(&n.canon()).bits(),
            n.bits(),
            "canon remains unrestricted: {text}"
        );
        let payload = Json::Obj(vec![("__proto__".into(), Json::Arr(vec![Json::Number(n)]))]);
        assert_eq!(
            stored::write_problem(&env, &[0; 16], &payload),
            Some(Error::NumberOutOfRange),
            "{text}"
        );
        assert_eq!(
            stored::write_problem(&env, &[], &payload),
            Some(Error::SaltNot16Bytes),
            "{text}"
        );
        let bad_env = Env {
            kind: String::new(),
            ..env.clone()
        };
        assert_eq!(
            stored::write_problem(&bad_env, &[], &payload),
            Some(Error::KindEmpty),
            "{text}"
        );
        let duplicate = Json::Obj(vec![("n".into(), Json::Null), ("n".into(), payload)]);
        assert_eq!(
            stored::write_problem(&env, &[0; 16], &duplicate),
            Some(Error::MemberDuplicate),
            "{text}"
        );
    }
}

#[test]
fn numeric_reads_require_visible_normalized_safe_whole_integers() {
    let record = Record {
        n: Int::from(99_i64),
        n_number: Some(number("2.0")),
        fields: vec![
            ("whole".into(), Val::Int(Int::from(-3_i64))),
            ("raw-whole".into(), Val::Number(number("2"))),
            ("fraction".into(), Val::Number(number("1.5"))),
            (
                "large".into(),
                Val::Int(Int::from(9_007_199_254_740_992_i64)),
            ),
        ],
        ..Record::default()
    };
    assert_eq!(record.get("n"), Some(Val::Number(number("2"))));
    assert_eq!(record.num("whole"), Some(Int::from(-3_i64)));
    for name in ["n", "raw-whole", "fraction", "large", "missing", "value"] {
        assert_eq!(record.num(name), None, "{name}");
    }
    let normalized = Record {
        n: Int::from(2_i64),
        n_number: None,
        ..record.clone()
    };
    assert_eq!(normalized.num("n"), Some(Int::from(2_i64)));
    assert_eq!(normalized.num("whole"), Some(Int::from(-3_i64)));
    for hidden in [
        record.withhold(),
        record.erase(),
        normalized.withhold(),
        normalized.erase(),
    ] {
        assert_eq!(hidden.n_number, None);
        assert_eq!(hidden.num("n"), None);
        assert_eq!(hidden.n, Int::default());
        assert_eq!(hidden.fields, Vec::<(String, Val)>::new());
    }
}

#[test]
fn selected_arithmetic_counts_unread_but_raw_arithmetic_keeps_raw_n() {
    let records = vec![
        Record {
            n: Int::from(4_i64),
            ..Record::default()
        },
        Record {
            n: Int::from(9_i64),
            n_number: Some(number("1.5")),
            ..Record::default()
        },
        Record {
            n: Int::from(7_i64),
            shown: Shown::Withheld,
            ..Record::default()
        },
        Record {
            n: Int::from(9_007_199_254_740_992_i64),
            ..Record::default()
        },
    ];
    let sum = families::sum_acc().select(|_| Tri::Yes, &records);
    assert_eq!(sum.value, Int::from(4_i64));
    assert_eq!(sum.unread, Nat::from(3_u64));
    for result in [
        families::min_acc().select(|_| Tri::Yes, &records),
        families::max_acc().select(|_| Tri::Yes, &records),
    ] {
        assert_eq!(result.value, Some(Int::from(4_i64)));
        assert_eq!(result.unread, Nat::from(3_u64));
    }
    assert_eq!(
        families::sum_acc().fold(&records),
        Int::from(9_007_199_254_741_012_i64)
    );
    assert_eq!(
        fold::sum_fold(Int::default(), &records),
        Int::from(9_007_199_254_741_012_i64)
    );
    assert_eq!(families::min_acc().fold(&records), Some(Int::from(4_i64)));
    assert_eq!(
        families::max_acc().fold(&records),
        Some(Int::from(9_007_199_254_740_992_i64))
    );
    let override_record = Record {
        n: Int::from(99_i64),
        n_number: Some(number("2")),
        ..Record::default()
    };
    let records = [override_record];
    let sum = families::sum_acc().select(|_| Tri::Yes, &records);
    assert_eq!(sum.value, Int::default());
    assert_eq!(sum.unread, Nat::from(1_u64));
    for result in [
        families::min_acc().select(|_| Tri::Yes, &records),
        families::max_acc().select(|_| Tri::Yes, &records),
    ] {
        assert_eq!(result.value, None);
        assert_eq!(result.unread, Nat::from(1_u64));
    }
    assert_eq!(families::sum_acc().fold(&records), Int::from(99_i64));
    assert_eq!(families::min_acc().fold(&records), Some(Int::from(99_i64)));
    assert_eq!(families::max_acc().fold(&records), Some(Int::from(99_i64)));
    assert_eq!(families::sum_on("n").fold(&records), Int::default());
    let normalized = [Record {
        n: Int::from(2_i64),
        ..Record::default()
    }];
    let sum = families::sum_acc().select(|_| Tri::Yes, &normalized);
    assert_eq!(sum.value, Int::from(2_i64));
    assert_eq!(sum.unread, Nat::default());
    assert_eq!(families::sum_on("n").fold(&normalized), Int::from(2_i64));
}

#[test]
fn max_heads_uses_readable_values_not_placeholder_zero() {
    let state = LatestBy {
        heads: vec![
            Record {
                n: Int::from(-4_i64),
                ..Record::default()
            },
            Record {
                n_number: Some(number("1.5")),
                ..Record::default()
            },
            Record {
                n_number: Some(number("2")),
                ..Record::default()
            },
            Record {
                n: Int::from(-2_i64),
                ..Record::default()
            },
            Record {
                shown: Shown::Erased,
                ..Record::default()
            },
        ],
        ..LatestBy::default()
    };
    assert_eq!(state.max_heads().value, Some(Int::from(-2_i64)));
    assert_eq!(state.max_heads().unread, Nat::from(3_u64));
}

#[test]
fn over_heads_remains_a_raw_supersession_fold() {
    let first = Record {
        id: Digest([1; 32]),
        about: vec!["t:first".into(), "t:second".into()],
        ..Record::default()
    };
    let second = Record {
        id: Digest([2; 32]),
        about: vec!["t:first".into()],
        prev: vec![first.id],
        ..Record::default()
    };
    let records = [first, second.clone()];
    let heads = families::over_heads(|s| s.heads.clone(), &records);
    assert_eq!(heads, vec![second]);
    let mut raw = LatestBy::default();
    raw.fold(&records);
    assert_eq!(heads, raw.heads);
}

#[test]
fn where_arguments_keep_the_safe_integer_domain() {
    for parse in [where_::parse_arg, where_::parse_bound] {
        for value in [
            Json::Int(Int::from(-9_007_199_254_740_991_i64)),
            Json::Int(Int::from(9_007_199_254_740_991_i64)),
        ] {
            assert!(parse(FieldType::Payload, "where.n", &value).is_ok());
        }
        for value in [
            Json::Int(Int::from(9_007_199_254_740_992_i64)),
            Json::Number(number("1.5")),
            Json::Number(number("1")),
        ] {
            let error = parse(FieldType::Payload, "where.n", &value)
                .expect_err("the argument is outside the parser domain");
            assert_eq!(error.code(), "where-invalid");
            assert_eq!(error.path, "where.n");
        }
    }
    assert_eq!(
        Val::Number(number("1.5")).to_json(),
        Json::Number(number("1.5"))
    );
}
