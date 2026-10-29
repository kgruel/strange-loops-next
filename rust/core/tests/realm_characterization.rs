//! Raw realm behavior and law premises from model/Loops/Things.lean.
use loops::{
    number::Int,
    record::{Digest, Record, Shown, Val},
    things::{self, Refusal},
};

fn id(n: u8) -> Digest {
    let mut bytes = [0; 32];
    bytes[31] = n;
    Digest(bytes)
}
fn rec(n: u8, thing: &str) -> Record {
    Record {
        id: id(n),
        about: vec![thing.into()],
        value: format!("payload {n}"),
        n: Int::from(i64::from(n)),
        fields: vec![("extra".into(), Val::Bool(true))],
        ..Record::default()
    }
}

#[test]
fn base_form_uses_first_here_without_validating_forms_or_ids() {
    assert_eq!(things::base_form(&[]), None);
    let a = rec(1, "a");
    let b = rec(2, "b");
    let xs = [a.erase(), b.clone(), a.clone()];
    assert_eq!(things::base_form(&xs), Some(b));
    assert_eq!(things::base_form(&[a.clone(), rec(1, "other")]), Some(a));
}

#[test]
fn fallback_withholds_first_envelope_and_clears_even_raw_hidden_payload() {
    let dirty = Record {
        shown: Shown::Erased,
        ..rec(1, "first")
    };
    let other = rec(1, "other").withhold();
    assert_eq!(
        things::base_form(&[dirty.clone(), other.clone()]),
        Some(dirty.withhold())
    );
    assert_eq!(things::base_form(&[other.clone(), dirty]), Some(other));
}

#[test]
fn pick_filters_ids_and_erasure_reads_every_original_form() {
    let a = rec(1, "a");
    let first = rec(2, "b");
    let discarded = Record {
        erases: vec![a.id, id(99)],
        ..rec(2, "conflict").withhold()
    };
    let xs = [first.clone(), a.clone(), discarded];
    assert!(things::erased_in(&xs, &a.id));
    assert!(things::erased_in(&xs, &id(99)));
    assert!(!things::erased_in(&xs, &id(3)));
    assert_eq!(things::pick(&xs, &a.id), Some(a.erase()));
    assert_eq!(things::pick(&xs, &id(99)), None);
    assert_eq!(things::settle(&xs), vec![a.erase(), first]);
}

#[test]
fn settlement_keeps_raw_first_here_ties_instead_of_inventing_forms_validation() {
    let a = rec(1, "a");
    let b = rec(1, "b");
    assert_eq!(things::settle(&[a.clone(), b.clone()]), vec![a.clone()]);
    assert_eq!(things::settle(&[b.clone(), a]), vec![b]);
    assert_eq!(things::settle(&[]), Vec::<Record>::new());
    assert_eq!(things::realm(&[], |_, _| true), Vec::<Record>::new());
}

#[test]
fn rejected_eraser_of_any_kind_still_erases_before_admission() {
    let a = rec(1, "a");
    let eraser = Record {
        kind: "not-erase".into(),
        prev: vec![a.id],
        erases: vec![a.id],
        ..rec(2, "unrelated").withhold()
    };
    let xs = [eraser.clone(), a.clone(), a.erase()];
    assert_eq!(things::settle(&xs), vec![a.erase(), eraser.clone()]);
    assert_eq!(things::realm(&xs, |_, _| true), vec![a.erase()]);
    assert_eq!(
        things::refusal_of(&things::settle(&xs), &eraser, |_, _| true),
        Some(Refusal::PrevUnrelated)
    );
}

#[test]
fn unrelated_refusal_precedes_permission_globally_in_either_link_order() {
    fn error_traits<T: std::error::Error + Send + Sync + 'static>(_: T) {}
    let related = rec(1, "a");
    let unrelated = rec(2, "b");
    let xs = [related.clone(), unrelated.clone()];
    for prev in [
        vec![related.id, unrelated.id],
        vec![unrelated.id, related.id],
    ] {
        let r = Record {
            prev,
            ..rec(3, "a")
        };
        assert_eq!(
            things::refusal_of(&xs, &r, |_, _| panic!("permission must not run")),
            Some(Refusal::PrevUnrelated)
        );
    }
    let r = Record {
        prev: vec![related.id],
        ..rec(3, "a")
    };
    assert_eq!(
        things::refusal_of(&xs, &r, |_, _| false),
        Some(Refusal::PrevNotPermitted)
    );
    assert_eq!(Refusal::PrevUnrelated.to_string(), "prev-unrelated");
    assert_eq!(Refusal::PrevNotPermitted.to_string(), "prev-not-permitted");
    error_traits(Refusal::PrevUnrelated);
}

#[test]
fn missing_targets_pass_but_every_held_duplicate_target_matters() {
    let a = rec(1, "a");
    let conflict = rec(1, "other");
    let r = Record {
        prev: vec![id(99), a.id, a.id],
        ..rec(2, "a")
    };
    assert_eq!(things::refusal_of(&[], &r, |_, _| false), None);
    for xs in [
        vec![a.clone(), conflict.clone()],
        vec![conflict.clone(), a.clone()],
    ] {
        assert_eq!(
            things::refusal_of(&xs, &r, |_, _| panic!(
                "unrelated duplicate outranks permission"
            )),
            Some(Refusal::PrevUnrelated)
        );
    }
    for xs in [
        vec![a.clone()],
        vec![a.clone(), conflict],
        vec![a, rec(3, "a")],
    ] {
        for allow in [false, true] {
            assert_eq!(
                things::refusal_of(&xs, &r, |_, _| allow).is_none(),
                things::entitled(&xs, &r, |_, _| allow)
            );
        }
    }
}

#[test]
fn realm_settles_before_calling_even_an_off_premise_payload_rule() {
    let a = rec(1, "a");
    let r = Record {
        prev: vec![a.id],
        ..rec(2, "a")
    };
    let eraser = Record {
        erases: vec![a.id],
        ..rec(3, "a")
    };
    let xs = [r.clone(), a, eraser];
    let settled = things::settle(&xs);
    // This rule violates EnvOnly. The raw function still receives settled records.
    let may = |_: &Record, q: &Record| q.shown == Shown::Erased;
    assert_eq!(things::realm(&xs, may), things::admit(&settled, may));
    assert!(things::realm(&xs, may).contains(&r));
    assert!(!things::admit(&xs, may).contains(&r));
}
