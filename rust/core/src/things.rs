//! Per-thing state and admission from model/Loops/Things.lean, without settlement.
use crate::{
    fold::{LatestBy, insert_id, latest_fold},
    json::canon_set,
    record::{Digest, Record, id_text},
};

impl Record {
    /// Lean: `Loops.Record.things`, model/Loops/Things.lean.
    /// Returns `about`, or the record's own text id when `about` is empty.
    pub fn things(&self) -> Vec<String> {
        if self.about.is_empty() {
            vec![id_text(&self.id)]
        } else {
            self.about.clone()
        }
    }

    /// Lean: `Loops.Record.isAbout`, model/Loops/Things.lean.
    /// Checks whether the reference names one of this record's things, including its own id.
    pub fn is_about(&self, thing: &str) -> bool {
        self.things().iter().any(|t| t == thing)
    }
}

/// Lean: `Loops.shares`, model/Loops/Things.lean.
/// Checks whether two records share a thing, including their own id when `about` is empty.
pub fn shares(a: &Record, b: &Record) -> bool {
    let bs = b.things();
    a.things().iter().any(|t| bs.contains(t))
}

/// Lean: `Loops.idsOf`, model/Loops/Things.lean.
/// Returns each held digest once in ascending byte order.
pub fn ids_of(xs: &[Record]) -> Vec<Digest> {
    xs.iter().fold(Vec::new(), |ids, r| insert_id(r.id, &ids))
}

/// Lean: `Loops.entitled`, model/Loops/Things.lean.
/// Checks all held targets of every succession link.
/// Missing targets pass. Every matching target must share a thing and pass `may`.
/// The caller must supply a pure `EnvOnly` rule that depends only on both envelopes.
pub fn entitled(xs: &[Record], r: &Record, may: impl Fn(&Record, &Record) -> bool) -> bool {
    r.prev
        .iter()
        .all(|p| xs.iter().all(|q| q.id != *p || (shares(r, q) && may(r, q))))
}

/// Lean: `Loops.admit`, model/Loops/Things.lean.
/// Filters once against the original held records, not against a changing accepted set.
/// The caller must supply a pure `EnvOnly` rule that depends only on both envelopes.
pub fn admit(xs: &[Record], may: impl Fn(&Record, &Record) -> bool) -> Vec<Record> {
    xs.iter()
        .filter(|r| entitled(xs, r, &may))
        .cloned()
        .collect()
}

/// Lean: `Loops.thingsOf`, model/Loops/Things.lean.
/// Returns all distinct things in canonical UTF-16 order.
pub fn things_of(xs: &[Record]) -> Vec<String> {
    canon_set(&xs.iter().flat_map(Record::things).collect::<Vec<_>>())
}

/// Lean: `Loops.stateIn`, model/Loops/Things.lean.
/// Folds supersession after filtering records to one thing, before any payload selection.
pub fn state_in(thing: &str, xs: &[Record]) -> LatestBy {
    latest_fold(
        &xs.iter()
            .filter(|r| r.is_about(thing))
            .cloned()
            .collect::<Vec<_>>(),
    )
}

/// Lean: `Loops.perThing`, model/Loops/Things.lean.
/// Returns each thing with all its current heads.
pub fn per_thing(xs: &[Record]) -> Vec<(String, LatestBy)> {
    things_of(xs)
        .into_iter()
        .map(|t| {
            let state = state_in(&t, xs);
            (t, state)
        })
        .collect()
}
