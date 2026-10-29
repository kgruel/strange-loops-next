//! Label resolution and batch writer checks from model/Loops/Batch.lean.
use crate::envelope::Env;
use crate::json::Json;
use crate::number::Nat;
use crate::stored::{self, Stored, Written};
use num_bigint::BigUint;
use std::fmt;

/// Lean: `Loops.Draft`, model/Loops/Batch.lean.
/// A draft holds an unchecked record and an optional batch label.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Draft {
    /// The optional name that other drafts can use in about or prev.
    pub label: Option<String>,
    /// The unchecked envelope, which can contain labels in about and prev.
    pub env: Env,
    /// The bytes that open the payload commitment.
    pub salt: Vec<u8>,
    /// The raw payload that the record commits to.
    pub payload: Json,
}

/// Lean: refusals in `Loops.resolveBatch` and `Loops.checkPrev`, model/Loops/Batch.lean.
/// Each value identifies one batch refusal or a writer refusal.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    /// More than one draft gives the same label.
    LabelDuplicate,
    /// A draft uses a label that no draft gives.
    LabelUnknown,
    /// The remaining drafts cannot resolve within the supplied fuel.
    LabelCycle,
    /// A resolved draft fails a writer check.
    Write(stored::Error),
    /// A prev target is absent from the batch and held store.
    PrevUnknown,
    /// A record and its prev target share no thing.
    PrevUnrelated,
}

impl Error {
    /// Lean: refusal strings in `Loops.resolveBatch` and `Loops.checkPrev`, model/Loops/Batch.lean.
    /// Returns the exact wire code, including codes from the writer.
    pub fn code(self) -> &'static str {
        match self {
            Self::LabelDuplicate => "label-duplicate",
            Self::LabelUnknown => "label-unknown",
            Self::LabelCycle => "label-cycle",
            Self::Write(error) => error.code(),
            Self::PrevUnknown => "prev-unknown",
            Self::PrevUnrelated => "prev-unrelated",
        }
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Write(error) => Some(error),
            _ => None,
        }
    }
}

impl From<stored::Error> for Error {
    fn from(error: stored::Error) -> Self {
        Self::Write(error)
    }
}

/// Lean: `Loops.isLabel`, model/Loops/Batch.lean.
/// A leading at sign marks a reference as a label, including the bare at sign.
pub fn is_label(s: &str) -> bool {
    s.starts_with('@')
}

/// Lean: `Loops.subst`, model/Loops/Batch.lean.
/// Replaces labels only, preserves order and repeats, and returns None for a missing label.
pub fn subst(ss: &[String], mapping: impl Fn(&str) -> Option<String>) -> Option<Vec<String>> {
    ss.iter()
        .map(|s| {
            if is_label(s) {
                mapping(s)
            } else {
                Some(s.clone())
            }
        })
        .collect()
}

/// Lean: `Loops.substEnv`, model/Loops/Batch.lean.
/// Replaces labels in about and prev only; all other envelope fields keep their original values.
pub fn subst_env(env: &Env, mapping: impl Fn(&str) -> Option<String>) -> Option<Env> {
    Some(Env {
        about: subst(&env.about, &mapping)?,
        prev: subst(&env.prev, &mapping)?,
        ..env.clone()
    })
}

fn lookup<'a>(mapping: &'a [(String, String)], label: &str) -> Option<&'a str> {
    mapping
        .iter()
        .find(|(key, _)| key == label)
        .map(|(_, value)| value.as_str())
}

impl Draft {
    /// Lean: `Loops.Draft.refs`, model/Loops/Batch.lean.
    /// Lists labels from about, then prev, with their order and repeats unchanged.
    pub fn refs(&self) -> Vec<String> {
        self.env
            .about
            .iter()
            .chain(&self.env.prev)
            .filter(|s| is_label(s))
            .cloned()
            .collect()
    }

    /// Lean: `Loops.Draft.commit`, model/Loops/Batch.lean.
    /// Hashes the salt and canonical payload without checking writer rules.
    pub fn commit(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> String {
        stored::commit_of(h, &self.salt, &self.payload)
    }

    /// Lean: `Loops.Draft.ready`, model/Loops/Batch.lean.
    /// Checks that the mapping contains each label this draft uses.
    pub fn ready(&self, mapping: &[(String, String)]) -> bool {
        self.refs().iter().all(|r| lookup(mapping, r).is_some())
    }
}

/// Lean: `Loops.resolveRounds`, model/Loops/Batch.lean.
/// Resolves each round against its starting mapping; preserves mapping order, repeats, and raw label text.
/// # Errors
/// Returns label-cycle when fuel runs out or no remaining draft is ready.
pub fn resolve_rounds(
    h: &impl Fn(&[u8]) -> Vec<u8>,
    fuel: &Nat,
    mapping: &[(String, String)],
    pending: &[Draft],
) -> Result<Vec<(String, String)>, Error> {
    let mut fuel = fuel.0.clone();
    let mut mapping = mapping.to_vec();
    let mut pending: Vec<_> = pending.iter().collect();
    while !pending.is_empty() {
        if fuel == BigUint::default() {
            return Err(Error::LabelCycle);
        }
        let (ready, waiting): (Vec<_>, Vec<_>) =
            pending.into_iter().partition(|d| d.ready(&mapping));
        if ready.is_empty() {
            return Err(Error::LabelCycle);
        }
        let given: Vec<_> = ready
            .into_iter()
            .filter_map(|d| {
                let label = d.label.as_ref()?;
                let env = subst_env(&d.env, |r| lookup(&mapping, r).map(str::to_owned))?;
                Some((label.clone(), stored::id_of(h, &env, &d.commit(h))))
            })
            .collect();
        mapping.extend(given);
        pending = waiting;
        fuel -= 1_u8;
    }
    Ok(mapping)
}

/// Lean: `Loops.envThings`, model/Loops/Batch.lean.
/// Returns about unchanged, or the record's own id when about is empty.
pub fn env_things(id: &str, about: &[String]) -> Vec<String> {
    if about.is_empty() {
        vec![id.to_owned()]
    } else {
        about.to_vec()
    }
}

/// Lean: `Loops.checkPrev`, model/Loops/Batch.lean.
/// Checks prev targets with batch lookup before held lookup, and unknown targets before unrelated targets.
/// # Errors
/// Returns prev-unknown for an absent target, then prev-unrelated when source and target share no thing.
pub fn check_prev(
    h: &impl Fn(&[u8]) -> Vec<u8>,
    held: &impl Fn(&str) -> Option<Vec<String>>,
    rs: &[Stored],
) -> Result<(), Error> {
    let in_batch: Vec<_> = rs.iter().map(|r| (r.id(h), &r.env.about)).collect();
    let target = |p: &str| {
        in_batch
            .iter()
            .find(|(id, _)| id == p)
            .map(|(_, about)| (*about).clone())
            .or_else(|| held(p))
    };
    if rs
        .iter()
        .any(|r| r.env.prev.iter().any(|p| target(p).is_none()))
    {
        return Err(Error::PrevUnknown);
    }
    if rs.iter().any(|r| {
        r.env.prev.iter().any(|p| {
            target(p).is_some_and(|about| {
                let source = env_things(&r.id(h), &r.env.about);
                let target = env_things(p, &about);
                !source.iter().any(|thing| target.contains(thing))
            })
        })
    }) {
        return Err(Error::PrevUnrelated);
    }
    Ok(())
}

// Lean: Loops.writeCodes. The order is explicit and independent of enum layout.
fn writer_priority(error: stored::Error) -> u8 {
    match error {
        stored::Error::KindEmpty => 0,
        stored::Error::ObserverNotTyped => 1,
        stored::Error::EmittedNotRfc3339 => 2,
        stored::Error::OccurredNotSpan => 3,
        stored::Error::AboutNotTyped => 4,
        stored::Error::PrevNotRecordId => 5,
        stored::Error::UnderNotRecordId => 6,
        stored::Error::ErasesNotRecordId => 7,
        stored::Error::SaltNot16Bytes => 8,
        stored::Error::MemberDuplicate => 9,
        stored::Error::NumberOutOfRange => 10,
    }
}

/// Lean: `Loops.resolveBatch`, model/Loops/Batch.lean.
/// Resolves labels, writes checked records, and checks prev targets while preserving the original draft order.
/// # Errors
/// Checks duplicate labels, unknown labels, cycles, global writer priority, unknown prev targets, then unrelated prev targets.
pub fn resolve_batch(
    h: &impl Fn(&[u8]) -> Vec<u8>,
    held: &impl Fn(&str) -> Option<Vec<String>>,
    ds: &[Draft],
) -> Result<Vec<Written>, Error> {
    let labels: Vec<_> = ds.iter().filter_map(|d| d.label.as_deref()).collect();
    if labels
        .iter()
        .enumerate()
        .any(|(i, label)| labels[..i].contains(label))
    {
        return Err(Error::LabelDuplicate);
    }
    if !ds
        .iter()
        .all(|d| d.refs().iter().all(|r| labels.contains(&r.as_str())))
    {
        return Err(Error::LabelUnknown);
    }
    let mapping = resolve_rounds(h, &Nat(BigUint::from(ds.len())), &[], ds)?;
    let resolved: Vec<_> = ds
        .iter()
        .map(|d| {
            subst_env(&d.env, |r| lookup(&mapping, r).map(str::to_owned))
                .map(|env| (env, d))
                .ok_or(Error::LabelCycle)
        })
        .collect::<Result<_, _>>()?;
    if let Some(error) = resolved
        .iter()
        .filter_map(|(env, d)| stored::write_problem(env, &d.salt, &d.payload))
        .min_by_key(|error| writer_priority(*error))
    {
        return Err(Error::Write(error));
    }
    let written: Vec<_> = resolved
        .into_iter()
        .map(|(env, d)| stored::write(env, d.salt.clone(), d.payload.clone()).map_err(Error::from))
        .collect::<Result<_, _>>()?;
    let records: Vec<_> = written.iter().map(Written::stored).collect();
    check_prev(h, held, &records)?;
    Ok(written)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::number::Int;
    use sha2::{Digest, Sha256};
    use std::cell::Cell;

    fn hash(bytes: &[u8]) -> Vec<u8> {
        Sha256::digest(bytes).to_vec()
    }

    fn no_held(_: &str) -> Option<Vec<String>> {
        None
    }

    fn draft(label: Option<&str>) -> Draft {
        Draft {
            label: label.map(str::to_owned),
            env: Env {
                kind: "note".into(),
                observer: "person:alice".into(),
                emitted: "2025-01-01T00:00:00Z".into(),
                ..Env::default()
            },
            salt: vec![0; 16],
            payload: Json::Null,
        }
    }

    fn texts(values: &[&str]) -> Vec<String> {
        values.iter().map(|s| (*s).to_owned()).collect()
    }

    fn duplicate_payload() -> Json {
        Json::Arr(vec![Json::Obj(vec![
            ("same".into(), Json::Null),
            ("same".into(), Json::Bool(true)),
        ])])
    }

    fn big_payload() -> Json {
        Json::Int(Int::from(9_007_199_254_740_992_u64))
    }

    #[test]
    fn substitution_keeps_order_duplicates_and_unrelated_fields() {
        assert!(is_label("@"));
        assert!(is_label("@thing"));
        assert!(!is_label("thing@"));
        assert!(!is_label(""));
        let input = texts(&["x:one", "@a", "@a"]);
        let mapping = |r: &str| (r == "@a").then(|| "r:resolved".into());
        assert_eq!(
            subst(&input, mapping),
            Some(texts(&["x:one", "r:resolved", "r:resolved"]))
        );
        assert_eq!(subst(&texts(&["@missing"]), mapping), None);
        assert_eq!(subst(&[], mapping), Some(vec![]));
        let mut d = draft(Some("@own"));
        d.env.about = input;
        d.env.prev = texts(&["@a"]);
        d.env.kind = "@kind".into();
        d.env.observer = "@observer".into();
        d.env.emitted = "@emitted".into();
        d.env.occurred = Some("@occurred".into());
        d.env.under = Some("@under".into());
        d.env.erases = texts(&["@erases"]);
        d.payload = Json::Str("@payload".into());
        assert_eq!(d.refs(), texts(&["@a", "@a", "@a"]));
        let mut expected = d.env.clone();
        expected.about = texts(&["x:one", "r:resolved", "r:resolved"]);
        expected.prev = texts(&["r:resolved"]);
        assert_eq!(subst_env(&d.env, mapping), Some(expected));
        assert_eq!(
            d.commit(&hash),
            stored::commit_of(&hash, &d.salt, &d.payload)
        );
        d.env.prev = texts(&["@missing"]);
        assert_eq!(subst_env(&d.env, mapping), None);
    }

    #[test]
    fn rounds_use_old_mapping_and_first_lookup_without_deduplication() {
        let seed = vec![
            ("@seed".into(), "thing:first".into()),
            ("@seed".into(), "thing:second".into()),
        ];
        let mut a = draft(Some("@a"));
        a.env.about = texts(&["@seed"]);
        let mut b = draft(Some("@b"));
        b.env.about = texts(&["@a"]);
        let pending = [a.clone(), b.clone()];
        assert!(a.ready(&seed));
        assert!(!b.ready(&seed));
        assert_eq!(
            resolve_rounds(&hash, &Nat::from(1), &seed, &pending),
            Err(Error::LabelCycle)
        );
        let got =
            resolve_rounds(&hash, &Nat::from(2), &seed, &pending).expect("two dependency rounds");
        let mut env_a = a.env.clone();
        env_a.about = texts(&["thing:first"]);
        let id_a = stored::id_of(&hash, &env_a, &a.commit(&hash));
        let mut env_b = b.env.clone();
        env_b.about = vec![id_a.clone()];
        let id_b = stored::id_of(&hash, &env_b, &b.commit(&hash));
        assert_eq!(
            got,
            [seed.clone(), vec![("@a".into(), id_a), ("@b".into(), id_b)]].concat()
        );

        let mut second_a = a.clone();
        second_a.payload = Json::Bool(true);
        let duplicates =
            resolve_rounds(&hash, &Nat::from(1), &seed, &[a.clone(), second_a.clone()])
                .expect("raw duplicate labels stay valid");
        assert_eq!(&duplicates[..2], &seed);
        assert_eq!(
            duplicates[2],
            ("@a".into(), stored::id_of(&hash, &env_a, &a.commit(&hash)))
        );
        assert_eq!(
            duplicates[3],
            (
                "@a".into(),
                stored::id_of(&hash, &env_a, &second_a.commit(&hash))
            )
        );

        let mut preexisting = seed;
        preexisting.push(("@a".into(), "thing:old".into()));
        let got = resolve_rounds(&hash, &Nat::from(1), &preexisting, &[a, b.clone()])
            .expect("both drafts use the initial mapping");
        env_b.about = texts(&["thing:old"]);
        assert_eq!(
            got.last(),
            Some(&(
                String::from("@b"),
                stored::id_of(&hash, &env_b, &b.commit(&hash))
            ))
        );
    }

    #[test]
    fn rounds_keep_unbounded_fuel_and_remove_unlabeled_drafts() {
        let mapping = vec![("x".into(), "first".into()), ("x".into(), "second".into())];
        assert_eq!(
            resolve_rounds(&hash, &Nat::default(), &mapping, &[]),
            Ok(mapping.clone())
        );
        assert_eq!(
            resolve_rounds(&hash, &Nat::default(), &mapping, &[draft(None)]),
            Err(Error::LabelCycle)
        );
        assert_eq!(
            resolve_rounds(&hash, &Nat::from(1), &mapping, &[draft(None)]),
            Ok(mapping.clone())
        );
        let fuel: Nat = "1844674407370955161600000000000000000000000000000000000000"
            .parse()
            .expect("unbounded natural");
        assert_eq!(
            resolve_rounds(&hash, &fuel, &mapping, &[draft(None)]),
            Ok(mapping)
        );
        let mut blocked = draft(None);
        blocked.env.about = texts(&["@missing"]);
        assert_eq!(
            resolve_rounds(&hash, &fuel, &[], &[blocked]),
            Err(Error::LabelCycle)
        );
    }

    #[test]
    fn raw_label_text_has_no_extra_validation() {
        let ds = [draft(Some("")), draft(Some("plain")), draft(Some("@"))];
        let mapping = resolve_rounds(&hash, &Nat::from(1), &[], &ds).expect("labels are raw text");
        assert_eq!(
            mapping.iter().map(|(l, _)| l.as_str()).collect::<Vec<_>>(),
            ["", "plain", "@"]
        );
        assert_eq!(
            resolve_batch(&hash, &no_held, &ds)
                .expect("unused raw labels are allowed")
                .len(),
            3
        );
        assert_eq!(
            resolve_batch(&hash, &no_held, &[draft(Some("")), draft(Some(""))]),
            Err(Error::LabelDuplicate)
        );
    }

    #[test]
    fn label_refusals_precede_writer_and_prev_refusals() {
        let mut bad = draft(Some("@same"));
        bad.env.kind.clear();
        bad.env.about = texts(&["@unknown"]);
        assert_eq!(
            resolve_batch(&hash, &no_held, &[bad.clone(), draft(Some("@same"))]),
            Err(Error::LabelDuplicate)
        );
        assert_eq!(
            resolve_batch(&hash, &no_held, &[bad.clone()]),
            Err(Error::LabelUnknown)
        );
        bad.env.about = texts(&["@same"]);
        assert_eq!(
            resolve_batch(&hash, &no_held, &[bad]),
            Err(Error::LabelCycle)
        );
        let mut a = draft(Some("@a"));
        let mut b = draft(Some("@b"));
        a.env.about = texts(&["@b"]);
        b.env.prev = texts(&["@a"]);
        assert_eq!(
            resolve_batch(&hash, &no_held, &[a, b]),
            Err(Error::LabelCycle)
        );
        let mut d = draft(None);
        d.env.kind = "@not-a-reference".into();
        d.payload = Json::Str("@not-a-reference".into());
        assert!(resolve_batch(&hash, &no_held, &[d.clone()]).is_ok());
        d.env.under = Some("@not-a-reference".into());
        assert_eq!(
            resolve_batch(&hash, &no_held, &[d.clone()]),
            Err(Error::Write(stored::Error::UnderNotRecordId))
        );
        d.env.under = None;
        d.env.erases = texts(&["@not-a-reference"]);
        assert_eq!(
            resolve_batch(&hash, &no_held, &[d]),
            Err(Error::Write(stored::Error::ErasesNotRecordId))
        );
    }

    fn invalid_drafts() -> Vec<(Draft, stored::Error, &'static str)> {
        let mut ds = vec![draft(None); 11];
        ds[0].env.kind.clear();
        ds[1].env.observer = "bad".into();
        ds[2].env.emitted = "bad".into();
        ds[3].env.occurred = Some("bad".into());
        ds[4].env.about = texts(&["bad"]);
        ds[5].env.prev = texts(&["bad"]);
        ds[6].env.under = Some("bad".into());
        ds[7].env.erases = texts(&["bad"]);
        ds[8].salt.clear();
        ds[9].payload = duplicate_payload();
        ds[10].payload = big_payload();
        let errors = [
            (stored::Error::KindEmpty, "kind-empty"),
            (stored::Error::ObserverNotTyped, "observer-not-typed"),
            (stored::Error::EmittedNotRfc3339, "emitted-not-rfc3339"),
            (stored::Error::OccurredNotSpan, "occurred-not-span"),
            (stored::Error::AboutNotTyped, "about-not-typed"),
            (stored::Error::PrevNotRecordId, "prev-not-record-id"),
            (stored::Error::UnderNotRecordId, "under-not-record-id"),
            (stored::Error::ErasesNotRecordId, "erases-not-record-id"),
            (stored::Error::SaltNot16Bytes, "salt-not-16-bytes"),
            (stored::Error::MemberDuplicate, "member-duplicate"),
            (stored::Error::NumberOutOfRange, "number-out-of-range"),
        ];
        ds.into_iter()
            .zip(errors)
            .map(|(d, (e, code))| (d, e, code))
            .collect()
    }

    #[test]
    fn every_writer_priority_is_global_in_both_draft_orders() {
        let invalid = invalid_drafts();
        for (index, (earlier, error, code)) in invalid.iter().enumerate() {
            assert_eq!(
                resolve_batch(&hash, &no_held, std::slice::from_ref(earlier)),
                Err(Error::Write(*error)),
                "{code}"
            );
            assert_eq!(Error::Write(*error).code(), *code);
            for (later, _, _) in &invalid[index + 1..] {
                for ds in [
                    [earlier.clone(), later.clone()],
                    [later.clone(), earlier.clone()],
                ] {
                    assert_eq!(
                        resolve_batch(&hash, &no_held, &ds),
                        Err(Error::Write(*error)),
                        "{code}"
                    );
                }
            }
            let mut unknown_prev = draft(None);
            unknown_prev.env.prev = vec![format!("r:{}", "a".repeat(52))];
            assert_eq!(
                resolve_batch(&hash, &no_held, &[unknown_prev, earlier.clone()]),
                Err(Error::Write(*error)),
                "writer before prev: {code}"
            );
        }
        let mut both = draft(None);
        both.payload = Json::Obj(vec![("a".into(), big_payload()), ("a".into(), Json::Null)]);
        assert_eq!(
            resolve_batch(&hash, &no_held, &[both]),
            Err(Error::Write(stored::Error::MemberDuplicate))
        );
    }

    #[test]
    fn unknown_prev_precedes_unrelated_in_both_orders() {
        let unrelated = stored::make(
            Env {
                about: texts(&["thing:one"]),
                ..Env::default()
            },
            vec![],
            Json::Null,
        );
        let target = unrelated.id(&hash);
        let missing = "r:missing".to_owned();
        let held = |id: &str| (id == target).then(|| texts(&["thing:one"]));
        for prev in [
            vec![target.clone(), missing.clone()],
            vec![missing.clone(), target.clone()],
        ] {
            let mut d = draft(None);
            d.env.about = texts(&["thing:other"]);
            d.env.prev = prev;
            assert_eq!(
                check_prev(&hash, &held, &[stored::make(d.env, d.salt, d.payload)]),
                Err(Error::PrevUnknown)
            );
        }
        let mut unknown = draft(None);
        unknown.env.prev = vec![missing];
        let mut wrong = draft(None);
        wrong.env.about = texts(&["thing:other"]);
        wrong.env.prev = vec![target.clone()];
        for ds in [[unknown.clone(), wrong.clone()], [wrong.clone(), unknown]] {
            let rs: Vec<_> = ds
                .into_iter()
                .map(|d| stored::make(d.env, d.salt, d.payload))
                .collect();
            assert_eq!(check_prev(&hash, &held, &rs), Err(Error::PrevUnknown));
        }
        assert_eq!(
            check_prev(
                &hash,
                &held,
                &[stored::make(wrong.env, wrong.salt, wrong.payload)]
            ),
            Err(Error::PrevUnrelated)
        );
    }

    #[test]
    fn held_lookup_repeats_and_batch_first_match_overrides_held() {
        let calls = Cell::new(0);
        let held = |_: &str| {
            calls.set(calls.get() + 1);
            Some(texts(&["thing:shared"]))
        };
        let mut d = draft(None);
        d.env.about = texts(&["thing:shared"]);
        d.env.prev = texts(&["r:external", "r:external"]);
        let r = stored::make(d.env, d.salt, d.payload);
        assert_eq!(check_prev(&hash, &held, &[r]), Ok(()));
        assert_eq!(calls.get(), 4, "two passes keep repeated lookup calls");

        let constant = |_: &[u8]| vec![0];
        let mut first = draft(None);
        first.env.about = texts(&["thing:first"]);
        let mut second = first.clone();
        second.env.about = texts(&["thing:second"]);
        let mut successor = first.clone();
        successor.env.prev = vec![stored::id_of(
            &constant,
            &first.env,
            &first.commit(&constant),
        )];
        let rs: Vec<_> = [first, second, successor]
            .into_iter()
            .map(|d| stored::make(d.env, d.salt, d.payload))
            .collect();
        let forbidden_held =
            |_: &str| -> Option<Vec<String>> { panic!("batch target must override held") };
        assert_eq!(check_prev(&constant, &forbidden_held, &rs), Ok(()));
        let reversed = [rs[1].clone(), rs[0].clone(), rs[2].clone()];
        assert_eq!(
            check_prev(&constant, &forbidden_held, &reversed),
            Err(Error::PrevUnrelated)
        );
    }

    #[test]
    fn empty_about_is_a_self_anchor_for_source_and_target() {
        assert_eq!(env_things("r:self", &[]), texts(&["r:self"]));
        assert_eq!(
            env_things("r:self", &texts(&["t:x", "t:x"])),
            texts(&["t:x", "t:x"])
        );
        let root = draft(None);
        let id = stored::id_of(&hash, &root.env, &root.commit(&hash));
        let held = |p: &str| (p == id).then(Vec::new);
        let mut child = draft(None);
        child.env.about = vec![id.clone()];
        child.env.prev = vec![id.clone()];
        assert!(resolve_batch(&hash, &held, &[child.clone()]).is_ok());
        child.env.about.clear();
        assert_eq!(
            resolve_batch(&hash, &held, &[child]),
            Err(Error::PrevUnrelated)
        );
        let constant = |_: &[u8]| vec![0];
        let mut self_prev = root;
        self_prev.env.prev = vec![stored::id_of(
            &constant,
            &self_prev.env,
            &self_prev.commit(&constant),
        )];
        assert_eq!(
            check_prev(
                &constant,
                &no_held,
                &[stored::make(
                    self_prev.env,
                    self_prev.salt,
                    self_prev.payload
                )]
            ),
            Ok(())
        );
    }

    #[test]
    fn label_chain_matches_manual_writes_and_keeps_input_order() {
        let root = draft(Some("@root"));
        let root_written = stored::write(root.env.clone(), root.salt.clone(), root.payload.clone())
            .expect("valid root");
        let root_id = root_written.stored().id(&hash);
        let mut child = draft(Some("@child"));
        child.env.about = texts(&["@root"]);
        child.env.prev = texts(&["@root"]);
        child.payload = Json::Str("child".into());
        let mut child_env = child.env.clone();
        child_env.about = vec![root_id.clone()];
        child_env.prev = vec![root_id.clone()];
        let child_written = stored::write(child_env, child.salt.clone(), child.payload.clone())
            .expect("valid child");
        let mut leaf = draft(None);
        leaf.env.about = texts(&["@root"]);
        leaf.env.prev = texts(&["@child"]);
        let mut leaf_env = leaf.env.clone();
        leaf_env.about = vec![root_id];
        leaf_env.prev = vec![child_written.stored().id(&hash)];
        let leaf_written =
            stored::write(leaf_env, leaf.salt.clone(), leaf.payload.clone()).expect("valid leaf");
        assert_eq!(
            resolve_batch(
                &hash,
                &no_held,
                &[leaf.clone(), root.clone(), child.clone()]
            ),
            Ok(vec![
                leaf_written.clone(),
                root_written.clone(),
                child_written.clone()
            ])
        );
        assert_eq!(
            resolve_batch(&hash, &no_held, &[child, leaf, root]),
            Ok(vec![child_written, leaf_written, root_written])
        );
        assert_eq!(resolve_batch(&hash, &no_held, &[]), Ok(vec![]));
    }

    #[test]
    fn batch_prev_refusals_are_global_after_writer_checks() {
        let held_id = format!("r:{}", "a".repeat(52));
        let missing_id = format!("r:{}", "b".repeat(52));
        let held = |p: &str| (p == held_id).then(|| texts(&["thing:held"]));
        let mut unrelated = draft(None);
        unrelated.env.about = texts(&["thing:other"]);
        unrelated.env.prev = vec![held_id.clone()];
        let mut unknown = draft(None);
        unknown.env.prev = vec![missing_id.clone()];
        for ds in [
            [unrelated.clone(), unknown.clone()],
            [unknown.clone(), unrelated.clone()],
        ] {
            assert_eq!(resolve_batch(&hash, &held, &ds), Err(Error::PrevUnknown));
        }
        for prev in [
            vec![held_id.clone(), missing_id.clone()],
            vec![missing_id, held_id.clone()],
        ] {
            let mut d = unrelated.clone();
            d.env.prev = prev;
            assert_eq!(resolve_batch(&hash, &held, &[d]), Err(Error::PrevUnknown));
        }
        assert_eq!(
            resolve_batch(&hash, &held, &[unrelated]),
            Err(Error::PrevUnrelated)
        );
        assert_eq!(
            resolve_batch(&hash, &held, &[unknown]),
            Err(Error::PrevUnknown)
        );
    }

    #[test]
    fn batch_lookup_keeps_empty_about_and_hash_has_no_size_constraint() {
        let constant = |_: &[u8]| vec![];
        let root = draft(None);
        let written = resolve_batch(&constant, &no_held, std::slice::from_ref(&root))
            .expect("the hash output has no size constraint");
        assert_eq!(written[0].stored().id(&constant), "r:");
        let mut successor = draft(None);
        successor.env.about = texts(&["r:"]);
        successor.env.prev = texts(&["r:"]);
        let forbidden_held = |_: &str| -> Option<Vec<String>> {
            panic!("an empty batch about still overrides held")
        };
        let rs: Vec<_> = [root, successor]
            .into_iter()
            .map(|d| stored::make(d.env, d.salt, d.payload))
            .collect();
        assert_eq!(check_prev(&constant, &forbidden_held, &rs), Ok(()));
    }

    #[test]
    fn error_codes_display_and_sources_are_exact() {
        use std::error::Error as _;
        for (error, code) in [
            (Error::LabelDuplicate, "label-duplicate"),
            (Error::LabelUnknown, "label-unknown"),
            (Error::LabelCycle, "label-cycle"),
            (Error::PrevUnknown, "prev-unknown"),
            (Error::PrevUnrelated, "prev-unrelated"),
        ] {
            assert_eq!(error.code(), code);
            assert_eq!(error.to_string(), code);
            assert!(error.source().is_none());
        }
        let error = Error::from(stored::Error::MemberDuplicate);
        assert_eq!(error.to_string(), "member-duplicate");
        assert_eq!(
            error.source().map(ToString::to_string),
            Some("member-duplicate".into())
        );
    }
}
