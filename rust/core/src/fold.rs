//! Executable list folds from model/Loops/Fold.lean.
use crate::{
    number::{Int, Nat},
    record::{Digest, Record},
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
    /// The records that no input record supersedes, with newer records first.
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
/// Lean: `Loops.Latest.fold`, model/Loops/Fold.lean.
/// Folds the records into an empty supersession state.
pub fn latest_fold(xs: &[Record]) -> LatestBy {
    let mut s = LatestBy::default();
    s.fold(xs);
    s
}
