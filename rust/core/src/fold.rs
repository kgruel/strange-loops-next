//! Executable list folds from model/Loops/Fold.lean.
use crate::{
    number::{Int, Nat},
    record::{Digest, Record},
    things::per_thing,
};

/// Lean: `Loops.Count.step`, model/Loops/Fold.lean.
/// Adds one for this record, without a visibility check.
pub fn count_step(n: Nat, _: &Record) -> Nat {
    Nat(n.0 + 1_u8)
}
/// Lean: `Loops.Count.fold`, model/Loops/Fold.lean.
/// Counts every input record, including repeats, from the supplied state.
pub fn count_fold(n: Nat, xs: &[Record]) -> Nat {
    xs.iter().fold(n, count_step)
}
/// Lean: `Loops.Sum.step`, model/Loops/Fold.lean.
/// Adds the record's raw integer field to the state.
pub fn sum_step(n: Int, r: &Record) -> Int {
    Int(n.0 + &r.n.0)
}
/// Lean: `Loops.Sum.fold`, model/Loops/Fold.lean.
/// Adds every raw integer field, without a visibility check or size bound.
pub fn sum_fold(n: Int, xs: &[Record]) -> Int {
    xs.iter().fold(n, sum_step)
}
/// Lean: `Loops.Min.step`, model/Loops/Fold.lean.
/// Keeps the smaller raw integer, or starts with this record's integer.
pub fn min_step(n: Option<Int>, r: &Record) -> Option<Int> {
    Some(n.map_or_else(|| r.n.clone(), |n| n.min(r.n.clone())))
}
/// Lean: `Loops.Min.fold`, model/Loops/Fold.lean.
/// Finds the smallest raw integer from the supplied optional state.
pub fn min_fold(n: Option<Int>, xs: &[Record]) -> Option<Int> {
    xs.iter().fold(n, min_step)
}
/// Lean: `Loops.Max.step`, model/Loops/Fold.lean.
/// Keeps the larger raw integer, or starts with this record's integer.
pub fn max_step(n: Option<Int>, r: &Record) -> Option<Int> {
    Some(n.map_or_else(|| r.n.clone(), |n| n.max(r.n.clone())))
}
/// Lean: `Loops.Max.fold`, model/Loops/Fold.lean.
/// Finds the largest raw integer from the supplied optional state.
pub fn max_fold(n: Option<Int>, xs: &[Record]) -> Option<Int> {
    xs.iter().fold(n, max_step)
}
/// Lean: `Loops.insertId`, model/Loops/Fold.lean.
/// Inserts a digest before the first greater digest, or keeps the first equal digest.
/// Leaves the remaining list unchanged, even if it has repeats or wrong order.
pub fn insert_id(n: Digest, xs: &[Digest]) -> Vec<Digest> {
    let mut out = Vec::with_capacity(xs.len() + 1);
    for (i, x) in xs.iter().enumerate() {
        if n < *x {
            out.push(n);
            out.extend_from_slice(&xs[i..]);
            return out;
        }
        if n == *x {
            out.extend_from_slice(&xs[i..]);
            return out;
        }
        out.push(*x);
    }
    out.push(n);
    out
}
/// Lean: `Loops.insertRec`, model/Loops/Fold.lean.
/// Inserts a record before the first older record, or keeps the first fully equal record.
/// Equal order keys alone do not remove a record.
pub fn insert_rec(r: Record, xs: &[Record]) -> Vec<Record> {
    let mut out = Vec::with_capacity(xs.len() + 1);
    for (i, x) in xs.iter().enumerate() {
        if r.newer(x) {
            out.push(r);
            out.extend_from_slice(&xs[i..]);
            return out;
        }
        if r == *x {
            out.extend_from_slice(&xs[i..]);
            return out;
        }
        out.push(x.clone());
    }
    out.push(r);
    out
}
/// Lean: `Loops.LatestBy`, model/Loops/Fold.lean.
/// This state keeps all supersession targets and current heads.
/// Public lists also permit unchecked states.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct LatestBy {
    /// The digests that any input record names in `prev`.
    pub named: Vec<Digest>,
    /// Current heads, with newer records first. Raw folds resolve their input as one thing.
    pub heads: Vec<Record>,
}
impl LatestBy {
    /// Lean: `Loops.LatestBy.step`, model/Loops/Fold.lean.
    /// Updates supersession targets and removes their heads before inserting this record.
    pub fn step(&mut self, r: &Record) {
        for n in &r.prev {
            self.named = insert_id(*n, &self.named);
        }
        self.heads.retain(|h| !r.prev.contains(&h.id));
        if !self.named.contains(&r.id) {
            self.heads = insert_rec(r.clone(), &self.heads);
        }
    }
    /// Lean: `Loops.LatestBy.fold`, model/Loops/Fold.lean.
    /// Applies each record to this state in input order.
    pub fn fold(&mut self, xs: &[Record]) {
        for r in xs {
            self.step(r);
        }
    }
    /// Lean: `Loops.LatestBy.winner`, model/Loops/Fold.lean.
    /// Returns the first head, if any.
    pub fn winner(&self) -> Option<&Record> {
        self.heads.first()
    }
    /// Lean: `Loops.LatestBy.others`, model/Loops/Fold.lean.
    /// Returns all heads after the first head.
    pub fn others(&self) -> &[Record] {
        self.heads.get(1..).unwrap_or_default()
    }
    /// Lean: `Loops.LatestBy.limit`, model/Loops/Families.lean.
    /// Returns at most `k` heads without reducing a large limit to machine width.
    pub fn limit(&self, k: &Nat) -> &[Record] {
        // An unrepresentable Nat exceeds every possible Vec length, so take all.
        let n = usize::try_from(&k.0).unwrap_or(self.heads.len());
        &self.heads[..n.min(self.heads.len())]
    }
}
/// Lean: `Loops.orderHeads`, model/Loops/Fold.lean.
/// Keeps the last input form of each id, then orders records newest first.
/// This does not settle conflicting forms or check admission.
pub fn order_heads(xs: &[Record]) -> Vec<Record> {
    xs.iter()
        .enumerate()
        .filter(|(i, r)| !xs[i + 1..].iter().any(|later| later.id == r.id))
        .fold(Vec::new(), |heads, (_, r)| insert_rec(r.clone(), &heads))
}

/// Lean: `Loops.wholeHeads`, model/Loops/Fold.lean.
/// Unions per-thing current heads in content order, keeping each id once.
/// A successor on one thing does not suppress a head still held on another thing.
pub fn whole_heads(xs: &[Record]) -> Vec<Record> {
    order_heads(
        &per_thing(xs)
            .into_iter()
            .flat_map(|(_, state)| state.heads)
            .collect::<Vec<_>>(),
    )
}

/// Lean: `Loops.Latest.fold`, model/Loops/Fold.lean.
/// Combines per-thing named ids and ordered, id-deduplicated current heads.
/// The combined named ids do not globally suppress these heads.
pub fn latest_fold(xs: &[Record]) -> LatestBy {
    let named = per_thing(xs)
        .into_iter()
        .flat_map(|(_, state)| state.named)
        .fold(Vec::new(), |ids, id| insert_id(id, &ids));
    LatestBy {
        named,
        heads: whole_heads(xs),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{occurred::Stamp, things};

    fn record(id: u8, about: &[&str], emitted: &str) -> Record {
        let mut bytes = [0; 32];
        bytes[31] = id;
        Record {
            id: Digest(bytes),
            about: about.iter().map(|t| (*t).into()).collect(),
            emitted: Stamp::of(emitted).expect("valid test timestamp"),
            ..Record::default()
        }
    }

    #[test]
    fn latest_combines_per_thing_heads_without_global_suppression() {
        let shared = record(1, &["thing:a", "thing:b"], "2026-10-29T03:00:00Z");
        let successor = Record {
            prev: vec![shared.id],
            ..record(2, &["thing:a"], "2026-10-29T01:00:00Z")
        };
        let fork = record(3, &["thing:b"], "2026-10-29T02:00:00Z");
        let records = [shared.clone(), successor.clone(), fork.clone()];
        let expected = LatestBy {
            named: vec![shared.id],
            heads: vec![shared.clone(), fork.clone(), successor.clone()],
        };
        for order in [
            records.to_vec(),
            vec![fork.clone(), successor.clone(), shared.clone()],
            vec![successor.clone(), shared.clone(), fork.clone()],
        ] {
            let state = latest_fold(&order);
            assert_eq!(state, expected, "arrival order {order:?}");
            assert_eq!(state.winner(), Some(&shared));
            assert_eq!(state.others(), &[fork.clone(), successor.clone()]);
        }
        assert_eq!(things::state_in("thing:a", &records).heads, vec![successor]);
        assert_eq!(
            things::state_in("thing:b", &records).heads,
            vec![shared, fork]
        );
    }

    #[test]
    fn ordered_heads_keep_the_last_form_before_sorting() {
        let earlier_form = record(1, &["thing:a"], "2026-10-29T03:00:00Z");
        let last_form = record(1, &["thing:a"], "2026-10-29T01:00:00Z").withhold();
        let middle = record(2, &["thing:a"], "2026-10-29T02:00:00Z");
        assert_eq!(
            order_heads(&[earlier_form, middle.clone(), last_form.clone()]),
            vec![middle, last_form]
        );
        assert_eq!(order_heads(&[]), Vec::<Record>::new());
    }

    #[test]
    fn whole_heads_deduplicate_in_canonical_thing_order() {
        let last_thing_form = record(1, &["thing:b"], "2026-10-29T01:00:00Z");
        let first_thing_form = record(1, &["thing:a"], "2026-10-29T03:00:00Z");
        // These unchecked conflicting forms test the raw last-form rule, not settlement.
        assert_eq!(
            whole_heads(&[last_thing_form.clone(), first_thing_form]),
            vec![last_thing_form]
        );
        assert_eq!(latest_fold(&[]), LatestBy::default());
    }

    #[test]
    fn combined_named_ids_are_ordered_and_deduplicated() {
        let first = Record {
            prev: vec![Digest([9; 32]), Digest([8; 32]), Digest([9; 32])],
            ..record(1, &["thing:a", "thing:b"], "2026-10-29T01:00:00Z")
        };
        let second = Record {
            prev: vec![Digest([8; 32]), Digest([7; 32])],
            ..record(2, &["thing:c"], "2026-10-29T02:00:00Z")
        };
        let state = latest_fold(&[first.clone(), second.clone()]);
        assert_eq!(
            state.named,
            vec![Digest([7; 32]), Digest([8; 32]), Digest([9; 32])]
        );
        assert_eq!(state.heads, vec![second, first]);
    }

    #[test]
    fn low_level_latest_by_keeps_global_step_semantics_and_distinct_forms() {
        let shared = record(1, &["thing:a", "thing:b"], "2026-10-29T03:00:00Z");
        let successor = Record {
            prev: vec![shared.id],
            ..record(2, &["thing:a"], "2026-10-29T01:00:00Z")
        };
        let mut raw = LatestBy::default();
        raw.fold(&[shared.clone(), successor.clone()]);
        assert_eq!(raw.heads, vec![successor]);
        let forms = [shared.clone(), shared.withhold()];
        let mut raw = LatestBy::default();
        raw.fold(&forms);
        assert_eq!(raw.heads, forms);
        assert_eq!(things::state_in("thing:a", &forms), raw);
    }
}
