//! Characterization of Lean fold edge cases.
use loops::{
    families::{self, Tri, Where},
    fold::{self, LatestBy},
    number::{Int, Nat},
    occurred::{Claim, Stamp},
    record::{Digest, Record, Shown, Val, id_text},
    things,
};

fn id(n: u64) -> Digest {
    let mut bytes = [0; 32];
    bytes[24..].copy_from_slice(&n.to_be_bytes());
    Digest(bytes)
}

#[test]
fn insertion_preserves_unchecked_tail() {
    let xs = vec![id(4), id(2), id(4)];
    assert_eq!(
        fold::insert_id(id(3), &xs),
        vec![id(3), id(4), id(2), id(4)]
    );
}

#[test]
fn equal_order_keys_do_not_deduplicate_distinct_records() {
    let a = Record::default();
    let b = Record {
        value: "other".into(),
        ..a.clone()
    };
    assert_eq!(
        fold::insert_rec(b.clone(), std::slice::from_ref(&a)),
        vec![a, b]
    );
}

#[test]
fn sum_is_unbounded() {
    let n: Int = "999999999999999999999999999999999999999999999999"
        .parse()
        .expect("integer");
    let r = Record {
        n,
        ..Record::default()
    };
    assert_eq!(
        fold::sum_fold(Int::default(), &[r.clone(), r]),
        "1999999999999999999999999999999999999999999999998"
            .parse()
            .expect("integer")
    );
}

fn rec(number: u64, n: i64) -> Record {
    Record {
        id: id(number),
        n: Int::from(n),
        ..Record::default()
    }
}

#[test]
fn raw_folds_count_repeats_and_ignore_readability_but_select_does_not() {
    let a = rec(1, 5);
    let b = Record {
        shown: Shown::Withheld,
        ..rec(1, 99)
    };
    let xs = [a, b.clone(), b];
    assert_eq!(
        families::dedup(&xs),
        vec![xs[2].clone()],
        "last form, not JS first"
    );
    assert_eq!(families::count_acc().fold(&xs), Nat::from(3));
    assert_eq!(families::sum_acc().fold(&xs), Int::from(203_i64));
    assert_eq!(families::min_acc().fold(&xs), Some(Int::from(5_i64)));
    assert_eq!(families::max_acc().fold(&xs), Some(Int::from(99_i64)));
    let count = families::count_acc().select(|_| Tri::Yes, &xs);
    assert_eq!(count.value, Nat::from(3));
    assert_eq!(count.unread, Nat::default());
    let sum = families::sum_acc().select(|_| Tri::Yes, &xs);
    assert_eq!(sum.value, Int::from(5_i64));
    assert_eq!(sum.unread, Nat::from(2));
    assert_eq!(
        families::min_acc().select(|_| Tri::Yes, &xs).value,
        Some(Int::from(5_i64))
    );
    assert_eq!(
        families::max_acc().select(|_| Tri::Yes, &xs).value,
        Some(Int::from(5_i64))
    );
}

#[test]
fn selection_counts_unknown_or_unreadable_once_and_excluded_never() {
    let xs: Vec<_> = (1..=6).map(|id| rec(id, 10)).collect();
    let acc = families::Acc {
        init: Nat::default(),
        step: fold::count_step,
        readable: |r: &Record| r.id <= id(3),
    };
    let result = acc.select(
        |r| {
            if r.id == id(1) || r.id == id(4) {
                Tri::Unknown
            } else if r.id == id(2) || r.id == id(5) {
                Tri::No
            } else {
                Tri::Yes
            }
        },
        &xs,
    );
    assert_eq!(result.value, Nat::from(1));
    assert_eq!(result.unread, Nat::from(3));
    let hidden = xs[0].withhold();
    assert_eq!(Where::Envelope(|_: &Record| true).eval(&hidden), Tri::Yes);
    assert_eq!(
        Where::Payload(|_: &Record| false).eval(&hidden),
        Tri::Unknown
    );
}

#[test]
fn numeric_on_uses_first_field_and_builtin_precedence() {
    let mut a = rec(1, 5);
    a.fields = vec![
        ("score".into(), Val::Int(Int::from(-7_i64))),
        ("score".into(), Val::Int(Int::from(90_i64))),
        ("n".into(), Val::Int(Int::from(100_i64))),
    ];
    let mut b = rec(2, 8);
    b.fields = vec![("score".into(), Val::Int(Int::from(12_i64)))];
    let mut wrong = rec(3, 11);
    wrong.fields = vec![("score".into(), Val::Bool(true))];
    let hidden = a.withhold();
    let xs = [a, b, wrong, hidden, rec(4, 13)];
    let sum = families::sum_on("score");
    assert_eq!(sum.fold(&xs), Int::from(5_i64));
    assert_eq!(sum.select(|_| Tri::Yes, &xs).unread, Nat::from(3));
    assert_eq!(families::min_on("score").fold(&xs), Some(Int::from(-7_i64)));
    assert_eq!(families::max_on("score").fold(&xs), Some(Int::from(12_i64)));
    assert_eq!(
        families::min_on("score").select(|_| Tri::Yes, &xs).unread,
        Nat::from(3)
    );
    assert_eq!(
        families::max_on("score").select(|_| Tri::Yes, &xs).unread,
        Nat::from(3)
    );
    assert_eq!(families::sum_on("n").fold(&xs), Int::from(37_i64));
    assert_eq!(families::sum_on("absent").fold(&xs), Int::default());
    assert_eq!(families::min_on("absent").fold(&xs), None);
    assert_eq!(families::max_on("absent").fold(&xs), None);
    assert_eq!(
        families::sum_on("value").select(|_| Tri::Yes, &xs).unread,
        Nat::from(5)
    );
}

#[test]
fn batches_match_one_fold_and_limits_do_not_truncate_big_nats() {
    let a = rec(1, 5);
    let b = Record {
        prev: vec![a.id],
        ..rec(2, -9)
    };
    let c = rec(3, 12);
    let xs = [a, b, c];
    let initial: Nat = "184467440737095516160000".parse().expect("Nat");
    for i in 0..=xs.len() {
        assert_eq!(
            fold::count_fold(fold::count_fold(initial.clone(), &xs[..i]), &xs[i..]),
            fold::count_fold(initial.clone(), &xs)
        );
        assert_eq!(
            fold::sum_fold(fold::sum_fold(Int::from(17_i64), &xs[..i]), &xs[i..]),
            fold::sum_fold(Int::from(17_i64), &xs)
        );
        assert_eq!(
            fold::min_fold(fold::min_fold(Some(Int::from(17_i64)), &xs[..i]), &xs[i..]),
            fold::min_fold(Some(Int::from(17_i64)), &xs)
        );
        assert_eq!(
            fold::max_fold(fold::max_fold(Some(Int::from(-17_i64)), &xs[..i]), &xs[i..]),
            fold::max_fold(Some(Int::from(-17_i64)), &xs)
        );
        let mut s = LatestBy::default();
        s.fold(&xs[..i]);
        s.fold(&xs[i..]);
        assert_eq!(s, fold::latest_fold(&xs));
    }
    let state = fold::latest_fold(&xs);
    assert_eq!(state.limit(&Nat::default()), &[]);
    assert_eq!(state.limit(&Nat::from(1)), &state.heads[..1]);
    assert_eq!(state.limit(&Nat::from(2)), state.heads);
    for text in [
        "18446744073709551616",
        "340282366920938463463374607431768211456",
        "9999999999999999999999999999999999999999999999999999",
    ] {
        assert_eq!(
            state.limit(&text.parse().expect("huge Nat")),
            state.heads,
            "{text}"
        );
    }
    assert_eq!(families::over_heads(|s| s.heads.clone(), &xs), state.heads);
}

#[test]
fn hidden_successor_does_not_revive_replaced_numeric_head() {
    let a = rec(1, 900);
    let b = Record {
        prev: vec![a.id],
        ..rec(2, 1)
    }
    .withhold();
    for xs in [[a.clone(), b.clone()], [b.clone(), a]] {
        let s = fold::latest_fold(&xs);
        assert_eq!(s.heads, vec![b.clone()]);
        assert_eq!(s.max_heads().value, None);
        assert_eq!(s.max_heads().unread, Nat::from(1));
    }
}

#[test]
fn record_equality_includes_spelling_and_unchecked_state_stays_unchecked() {
    let a = Record {
        emitted: Stamp::of("2026-01-01T00:00:00Z").expect("stamp"),
        ..rec(1, 5)
    };
    let b = Record {
        emitted: Stamp::of("2026-01-01T01:00:00+01:00").expect("same instant"),
        ..a.clone()
    };
    assert!(!a.newer(&b) && !b.newer(&a));
    assert_ne!(a, b);
    assert_eq!(
        fold::latest_fold(&[a.clone(), b.clone()]).heads,
        vec![a.clone(), b.clone()]
    );
    let plain = Record {
        occurred: Claim::of("2026-01-01"),
        ..rec(3, 5)
    };
    let qualified = Record {
        occurred: Claim::of("2026-01-01?"),
        ..plain.clone()
    };
    assert_ne!(
        plain, qualified,
        "claim spelling participates in full equality"
    );
    assert!(!plain.newer(&qualified) && !qualified.newer(&plain));
    let mut s = LatestBy {
        named: vec![id(8), id(2), id(8)],
        heads: vec![a.clone(), rec(9, 9), a.clone()],
    };
    let incoming = Record {
        prev: vec![id(2)],
        ..b
    };
    s.step(&incoming);
    assert_eq!(s.named, vec![id(2), id(8), id(2), id(8)]);
    assert_eq!(s.heads, vec![a.clone(), incoming, rec(9, 9), a]);
    let old = rec(1, 1);
    let newer = rec(3, 3);
    let duplicate_tail = [old.clone(), newer.clone(), old];
    let inserted = fold::insert_rec(rec(2, 2), &duplicate_tail);
    assert_eq!(inserted, vec![rec(2, 2), rec(1, 1), newer, rec(1, 1)]);
}

#[test]
fn per_thing_is_canonical_self_anchored_and_scopes_supersession() {
    let a = rec(1, 1);
    let b = Record {
        about: vec![id_text(&a.id)],
        prev: vec![a.id],
        ..rec(2, 2)
    };
    assert!(things::shares(&a, &b));
    assert_eq!(a.things(), vec![id_text(&a.id)]);
    let x = Record {
        about: vec!["x".into(), "x".into()],
        ..rec(3, 3)
    };
    let unrelated = Record {
        about: vec!["y".into()],
        prev: vec![x.id],
        ..rec(4, 4)
    };
    assert_eq!(x.things(), vec!["x".to_string(), "x".to_string()]);
    assert!(!things::shares(&x, &unrelated));
    let xs = [a, b.clone(), x.clone(), unrelated.clone()];
    assert_eq!(things::state_in(&id_text(&xs[0].id), &xs).heads, vec![b]);
    assert_eq!(things::state_in("x", &xs).heads, vec![x]);
    assert_eq!(things::state_in("y", &xs).heads, vec![unrelated]);
    assert_eq!(things::state_in("missing", &xs), LatestBy::default());
    let states = things::per_thing(&xs);
    assert_eq!(
        states.iter().map(|(t, _)| t.clone()).collect::<Vec<_>>(),
        things::things_of(&xs)
    );
    let unicode = Record {
        about: vec![
            "\u{e000}".into(),
            "\u{10000}".into(),
            "z".into(),
            "z".into(),
        ],
        ..rec(5, 0)
    };
    assert_eq!(
        things::things_of(&[unicode]),
        vec!["z", "\u{10000}", "\u{e000}"]
    );
}
