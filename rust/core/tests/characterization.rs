//! Non-vector domains from model/Loops/{Json,Envelope,Record,Stored,Time,Occurred}.lean.
use loops::{
    envelope::{self, Env},
    json::Json,
    number::{Int, Nat},
    occurred::{self, Stamp},
    record::{self, Record, Shown, Val},
    stored::{self, Error},
    time,
};

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
        id: 1_u64.into(),
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
fn integers_and_ids_are_unbounded_not_wire_limited() {
    let huge: Nat =
        "115792089237316195423570985008687907853269984665640564039457584007913129639936"
            .parse()
            .expect("2^256");
    assert_eq!(record::id_text(&huge), record::id_text(&Nat::default()));
    assert_eq!(record::id_digest(&huge)[0], 256_u64.into());
    let mut r = record();
    let small = r.clone();
    r.id = huge;
    assert!(r.newer(&small));
    let n: Int = "-9999999999999999999999999999999999999999999"
        .parse()
        .expect("unbounded Int");
    r.n = n.clone();
    assert_eq!(r.num("n"), Some(n.clone()));
    assert_eq!(Json::Int(n.clone()).canon(), n.to_string());
    assert!(!Json::Int(n).in_range());
}
#[test]
fn reader_lists_lookup_and_views_keep_lean_behavior() {
    let mut r = record();
    r.prev = vec![4_u64.into(), 4_u64.into()];
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
    // Lean checks length/alphabet only, not the final base32 padding bits.
    assert!(envelope::record_id(&format!("r:{}", "z".repeat(52))));
    assert!(!envelope::record_id(&format!("r:{}", "é".repeat(52))));
    assert!(time::instant("２０２６-01-01T00:00:00Z").is_none());
}
#[test]
fn precise_times_span_order_and_text_proofs() {
    let a = Stamp::of("1969-12-31T23:59:59.5000Z").expect("valid");
    let b = Stamp::of("1970-01-01T00:59:59.5+01:00").expect("valid");
    assert_eq!(a.moment(), b.moment());
    assert_ne!(a, b);
    assert_eq!(a.moment().fraction(), &[5]);
    assert!(occurred::occurred_span("2009/2009-01").is_some());
    assert!(occurred::occurred_span("2009-02/2009-01").is_none());
    assert!(occurred::occurred_span("1970-01-01T00:00:00Z?").is_none());
    assert!(
        occurred::occurred_span("2009/..").expect("open")
            > occurred::occurred_span("2009").expect("year")
    );
    let digits = "123456789".repeat(456);
    let precise =
        time::instant(&format!("1970-01-01T00:00:00.{digits}000Z")).expect("no precision cap");
    assert_eq!(precise.fraction().len(), digits.len());
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
fn newer_is_span_then_emitted_then_unbounded_id_not_record_equality() {
    let mut older = record();
    older.occurred = occurred::Claim::of("2009");
    let mut newer = older.clone();
    newer.occurred = occurred::Claim::of("2009/..");
    assert!(newer.newer(&older), "open stop sorts last");
    older = newer.clone();
    newer.emitted = Stamp::of("1970-01-01T00:00:01Z").expect("stamp");
    assert!(newer.newer(&older), "emitted breaks span ties");
    older = newer.clone();
    newer.id = 2_u64.into();
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
            Json::Int("9007199254740992".parse().expect("int")),
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
    assert!(stored::write(e, vec![0; 16], Json::Int(9_007_199_254_740_991_i64.into())).is_ok());
}
