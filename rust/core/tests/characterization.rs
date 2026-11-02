//! Non-vector domains from model/Loops/{Json,Envelope,Record,Stored,Time,Occurred}.lean.
use loops::{
    envelope::{self, Env},
    json::Json,
    number::{Int, Number},
    occurred::{self, Stamp},
    record::{self, Digest, Record, Shown, Val},
    stored::{self, Error},
    time,
};

fn id(n: u64) -> Digest {
    let mut bytes = [0; 32];
    bytes[24..].copy_from_slice(&n.to_be_bytes());
    Digest(bytes)
}

fn env() -> Env {
    Env {
        kind: "note".into(),
        observer: "sl:x".into(),
        emitted: "1970-01-01T00:00:00Z".into(),
        ..Env::default()
    }
}
fn record() -> Record {
    Record {
        id: id(1),
        kind: "note".into(),
        observer: "sl:x".into(),
        emitted: Stamp::of("1970-01-01T00:00:00Z").expect("valid fixture"),
        ..Record::default()
    }
}

#[test]
fn canonicalization_first_wins_before_validation() {
    let payload = Json::Obj(vec![
        ("z".into(), Json::Int(1_i64.into())),
        ("a".into(), Json::Null),
        ("z".into(), Json::Int(2_i64.into())),
    ]);
    assert_eq!(payload.canon(), r#"{"a":null,"z":1}"#);
    assert!(!payload.keys_distinct());
    assert!(payload.in_range());
    let nested = Json::Arr(vec![payload]);
    assert!(!nested.keys_distinct());
    let dropped = Json::Obj(vec![
        ("x".into(), Json::Null),
        (
            "x".into(),
            Json::Int("9007199254740992".parse().expect("integer")),
        ),
    ]);
    assert_eq!(dropped.canon(), r#"{"x":null}"#);
    assert!(!dropped.keys_distinct());
    assert!(
        !dropped.in_range(),
        "range checks raw members, not canonical survivors"
    );
}
#[test]
fn unchecked_integers_remain_unbounded() {
    let mut r = record();
    let n: Int = "-9999999999999999999999999999999999999999999"
        .parse()
        .expect("unbounded Int");
    r.n = n.clone();
    assert_eq!(r.get("n"), Some(Val::Int(n.clone())));
    assert_eq!(
        r.num("n"),
        None,
        "raw storage does not imply safe-whole readability"
    );
    assert_eq!(loops::fold::sum_fold(Int::default(), &[r]), n);
    assert_eq!(Json::Int(n.clone()).canon(), n.to_string());
    assert!(!Json::Int(n).in_range());
}
#[test]
fn within_range_fractional_payloads_do_not_require_integer_readability() {
    for value in [
        -9_007_199_254_740_991.0,
        9_007_199_254_740_991.0,
        f64::MIN_POSITIVE,
        f64::from_bits(1),
        1.5,
        -0.0,
    ] {
        let payload = Json::Number(Number::new(value).expect("finite number"));
        assert!(payload.in_range(), "within-range payload {value}");
        assert!(
            stored::write(env(), vec![0; 16], payload).is_ok(),
            "within-range writer payload {value}"
        );
    }
}

#[test]
fn reader_lists_lookup_and_views_keep_lean_behavior() {
    let mut r = record();
    r.prev = vec![id(4), id(4)];
    r.value = "payload".into();
    r.n = 42_i64.into();
    r.fields = vec![
        ("x".into(), Val::Int(7_i64.into())),
        ("x".into(), Val::Int(8_i64.into())),
        ("n".into(), Val::Int(9_i64.into())),
    ];
    assert_eq!(r.get("x"), Some(Val::Int(7_i64.into())));
    assert_eq!(r.get("n"), Some(Val::Int(42_i64.into())));
    assert_eq!(r.get("value"), Some(Val::Str("payload".into())));
    r.shown = Shown::Withheld;
    assert_eq!(r.get("x"), Some(Val::Int(7_i64.into())));
    assert_eq!(r.num("x"), None);
    for view in [r.withhold(), r.erase()] {
        assert_eq!(view.prev, r.prev);
        assert_eq!(view.id, r.id);
        assert_eq!(view.fields, Vec::new());
        assert_eq!(view.value, "");
        assert_eq!(view.n, Int::default());
        assert_eq!(view.num("n"), None);
    }
}
#[test]
fn ascii_predicates_and_record_id_quirks() {
    assert!(envelope::typed_ref("a-9:any:thing"));
    assert!(envelope::typed_ref("a:\n"));
    assert!(!envelope::typed_ref("é:x"));
    assert!(!envelope::typed_ref("a９:x"));
    assert!(!envelope::typed_ref("a:"));
    assert!(envelope::record_id(&format!("r:{}", "0".repeat(52))));
    assert!(!envelope::record_id(&format!("r:{}", "z".repeat(52))));
    assert!(!envelope::record_id(&format!("r:{}", "é".repeat(52))));
    assert!(time::instant("２０２６-01-01T00:00:00Z").is_none());
}
#[test]
fn raw_envelope_keys_and_canonical_base32() {
    assert!(envelope::check_keys(["kind", "observer", "emitted"]).is_ok());
    assert_eq!(
        envelope::check_keys(["kind", "extra"])
            .expect_err("unknown key")
            .to_string(),
        "envelope-field-unknown"
    );
    assert_eq!(loops::base32::decode("00"), Some(vec![0]));
    assert_eq!(loops::base32::decode("01"), None);
    assert_eq!(loops::base32::decode("000"), None);
}

#[test]
fn precise_times_span_order_and_text_proofs() {
    let a = Stamp::of("1969-12-31T23:59:59.5Z").expect("valid");
    assert!(Stamp::of("1969-12-31T23:59:59.5000Z").is_none());
    assert!(Stamp::of("1970-01-01T00:59:59.5+01:00").is_none());
    assert_eq!(a.moment().fraction(), &[5]);
    assert!(occurred::occurred_span("2009/2009-01").is_some());
    assert!(occurred::occurred_span("2009-02/2009-01").is_none());
    assert!(occurred::occurred_span("1970-01-01T00:00:00Z?").is_none());
    assert!(
        occurred::occurred_span("2009/..").expect("open")
            > occurred::occurred_span("2009").expect("year")
    );
    let precise = time::instant("1970-01-01T00:00:00.123456789Z").expect("nine digits");
    assert_eq!(precise.fraction().len(), 9);
    assert!(time::instant("1970-01-01T00:00:00.1234567891Z").is_none());
    assert!(time::instant("1970-01-01T00:00:60Z").is_none());
    assert!(
        precise
            > *time::instant("1970-01-01T00:00:00.1Z")
                .as_ref()
                .expect("instant")
    );
    let m = time::instant("1970-01-01T00:00:00Z").expect("instant");
    let later = time::instant("1970-01-01T00:00:01Z").expect("instant");
    assert!(occurred::Span::closed(later, m).is_none());
}
#[test]
fn newer_is_span_then_emitted_then_digest_not_record_equality() {
    let mut older = record();
    older.occurred = occurred::Claim::of("2009");
    let mut newer = older.clone();
    newer.occurred = occurred::Claim::of("2009/..");
    assert!(newer.newer(&older), "open stop sorts last");
    older = newer.clone();
    newer.emitted = Stamp::of("1970-01-01T00:00:01Z").expect("stamp");
    assert!(newer.newer(&older), "emitted breaks span ties");
    older = newer.clone();
    newer.id = id(2);
    assert!(newer.newer(&older), "id breaks emitted ties");
    older = newer.clone();
    newer.value = "different payload, same ordering keys".into();
    assert_ne!(newer, older);
    assert!(!newer.newer(&older));
    assert!(!older.newer(&newer));
    assert_eq!(record::withholding(|_| false, &newer), newer);
    assert_eq!(record::withholding(|_| true, &newer), newer.withhold());
}

#[test]
fn refusal_precedence_is_exact() {
    let mut e = env();
    e.kind = String::new();
    e.observer = String::new();
    e.emitted = String::new();
    e.occurred = Some("no".into());
    e.about = vec!["no".into()];
    e.prev = vec!["no".into()];
    e.under = Some("no".into());
    e.erases = vec!["no".into()];
    let duplicate = Json::Obj(vec![
        (
            "x".into(),
            Json::Int(
                "999999999999999999999999999999999999999999999999"
                    .parse()
                    .expect("int"),
            ),
        ),
        ("x".into(), Json::Null),
    ]);
    let codes = [
        Error::KindEmpty,
        Error::ObserverNotTyped,
        Error::EmittedNotRfc3339,
        Error::OccurredNotSpan,
        Error::AboutNotTyped,
        Error::PrevNotRecordId,
        Error::UnderNotRecordId,
        Error::ErasesNotRecordId,
    ];
    for code in codes {
        assert_eq!(stored::write_problem(&e, &[], &duplicate), Some(code));
        match code {
            Error::KindEmpty => e.kind = "note".into(),
            Error::ObserverNotTyped => e.observer = "sl:x".into(),
            Error::EmittedNotRfc3339 => e.emitted = env().emitted,
            Error::OccurredNotSpan => e.occurred = None,
            Error::AboutNotTyped => e.about.clear(),
            Error::PrevNotRecordId => e.prev.clear(),
            Error::UnderNotRecordId => e.under = None,
            Error::ErasesNotRecordId => e.erases.clear(),
            _ => unreachable!("envelope error"),
        }
    }
    assert_eq!(
        stored::write_problem(&e, &[], &duplicate),
        Some(Error::SaltNot16Bytes)
    );
    assert_eq!(
        stored::write_problem(&e, &[0; 16], &duplicate),
        Some(Error::MemberDuplicate)
    );
    assert_eq!(
        stored::write_problem(
            &e,
            &[0; 16],
            &Json::Int("9007199254740992".parse().expect("int"))
        ),
        Some(Error::NumberOutOfRange)
    );
    for n in [-9_007_199_254_740_991_i64, 9_007_199_254_740_991] {
        assert!(stored::write(e.clone(), vec![0; 16], Json::Int(n.into())).is_ok());
    }
    for n in [
        "-9007199254740992",
        "9007199254740992",
        "-999999999999999999999999999999999999999999999999",
    ] {
        assert_eq!(
            stored::write_problem(&e, &[0; 16], &Json::Int(n.parse().expect("integer"))),
            Some(Error::NumberOutOfRange)
        );
    }
}
