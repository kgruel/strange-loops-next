//! Executable list folds from model/Loops/Fold.lean.
use crate::{
    number::{Int, Nat},
    record::Record,
};

/// Count.step (model/Loops/Fold.lean).
pub fn count_step(n: Nat, _: &Record) -> Nat {
    Nat(n.0 + 1_u8)
}
/// Count.fold (model/Loops/Fold.lean).
pub fn count_fold(n: Nat, xs: &[Record]) -> Nat {
    xs.iter().fold(n, count_step)
}
/// Sum.step (model/Loops/Fold.lean).
pub fn sum_step(n: Int, r: &Record) -> Int {
    Int(n.0 + &r.n.0)
}
/// Sum.fold (model/Loops/Fold.lean).
pub fn sum_fold(n: Int, xs: &[Record]) -> Int {
    xs.iter().fold(n, sum_step)
}
/// Min.step (model/Loops/Fold.lean).
pub fn min_step(n: Option<Int>, r: &Record) -> Option<Int> {
    Some(n.map_or_else(|| r.n.clone(), |n| n.min(r.n.clone())))
}
/// Min.fold (model/Loops/Fold.lean).
pub fn min_fold(n: Option<Int>, xs: &[Record]) -> Option<Int> {
    xs.iter().fold(n, min_step)
}
/// Max.step (model/Loops/Fold.lean).
pub fn max_step(n: Option<Int>, r: &Record) -> Option<Int> {
    Some(n.map_or_else(|| r.n.clone(), |n| n.max(r.n.clone())))
}
/// Max.fold (model/Loops/Fold.lean).
pub fn max_fold(n: Option<Int>, xs: &[Record]) -> Option<Int> {
    xs.iter().fold(n, max_step)
}
/// insertId (model/Loops/Fold.lean), including unchecked input lists.
pub fn insert_id(n: Nat, xs: &[Nat]) -> Vec<Nat> {
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
        out.push(x.clone());
    }
    out.push(n);
    out
}
/// insertRec (model/Loops/Fold.lean), using full equality after Newer.
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
/// `LatestBy` (model/Loops/Fold.lean); fields intentionally admit unchecked states.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct LatestBy {
    /// LatestBy.named (model/Loops/Fold.lean).
    pub named: Vec<Nat>,
    /// LatestBy.heads (model/Loops/Fold.lean).
    pub heads: Vec<Record>,
}
impl LatestBy {
    /// LatestBy.step (model/Loops/Fold.lean).
    pub fn step(&mut self, r: &Record) {
        for n in &r.prev {
            self.named = insert_id(n.clone(), &self.named);
        }
        self.heads.retain(|h| !r.prev.contains(&h.id));
        if !self.named.contains(&r.id) {
            self.heads = insert_rec(r.clone(), &self.heads);
        }
    }
    /// LatestBy.fold (model/Loops/Fold.lean).
    pub fn fold(&mut self, xs: &[Record]) {
        for r in xs {
            self.step(r);
        }
    }
    /// LatestBy.winner (model/Loops/Fold.lean).
    pub fn winner(&self) -> Option<&Record> {
        self.heads.first()
    }
    /// LatestBy.others (model/Loops/Fold.lean).
    pub fn others(&self) -> &[Record] {
        self.heads.get(1..).unwrap_or_default()
    }
    /// LatestBy.limit (model/Loops/Families.lean); avoids narrowing the Lean Nat.
    pub fn limit(&self, k: &Nat) -> &[Record] {
        // An unrepresentable Nat exceeds every possible Vec length, so take all.
        let n = usize::try_from(&k.0).unwrap_or(self.heads.len());
        &self.heads[..n.min(self.heads.len())]
    }
}
/// Latest.fold (model/Loops/Fold.lean).
pub fn latest_fold(xs: &[Record]) -> LatestBy {
    let mut s = LatestBy::default();
    s.fold(xs);
    s
}
