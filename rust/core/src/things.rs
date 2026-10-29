//! Settlement, admission, and per-thing state from model/Loops/Things.lean.
use crate::{
    fold::{LatestBy, insert_id, latest_fold},
    json::canon_set,
    record::{Digest, Record, Shown, id_text},
};
use std::{error::Error, fmt};

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

/// Lean: `Loops.erasedIn`, model/Loops/Things.lean.
/// Checks every original form's erasure links, regardless of kind or admission.
pub fn erased_in(xs: &[Record], id: &Digest) -> bool {
    xs.iter().any(|r| r.erases.contains(id))
}

/// Lean: `Loops.baseForm`, model/Loops/Things.lean.
/// Keeps the first here form, or withholds the first form when no payload is here.
/// This function does not check ids or the `Forms` premise.
pub fn base_form(forms: &[Record]) -> Option<Record> {
    forms
        .iter()
        .find(|r| r.shown == Shown::Here)
        .cloned()
        .or_else(|| forms.first().map(Record::withhold))
}

/// Lean: `Loops.pick`, model/Loops/Things.lean.
/// Chooses a base form for this id, then applies erasure links from every original form.
pub fn pick(xs: &[Record], id: &Digest) -> Option<Record> {
    let forms: Vec<_> = xs.iter().filter(|r| r.id == *id).cloned().collect();
    base_form(&forms).map(|r| if erased_in(xs, id) { r.erase() } else { r })
}

/// Lean: `Loops.settle`, model/Loops/Things.lean.
/// Keeps one form per held id, in ascending digest order.
/// Order invariance requires `Forms`, as `settle_eq` states in model/Laws/Things.lean.
/// Conflicting unchecked forms keep their first here form, or their first envelope otherwise.
pub fn settle(xs: &[Record]) -> Vec<Record> {
    ids_of(xs).iter().filter_map(|id| pick(xs, id)).collect()
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

/// Lean: `Loops.refusalOf`, model/Loops/Things.lean.
/// These two codes describe succession links that fail admission.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Refusal {
    /// A held predecessor shares no thing with the record.
    PrevUnrelated,
    /// The rule denies replacement of a held predecessor.
    PrevNotPermitted,
}

impl fmt::Display for Refusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::PrevUnrelated => "prev-unrelated",
            Self::PrevNotPermitted => "prev-not-permitted",
        })
    }
}
impl Error for Refusal {}

/// Lean: `Loops.refusalOf`, model/Loops/Things.lean.
/// Checks all links for unrelated predecessors before checking any permission.
/// Missing targets pass. Every matching held form must share a thing and pass `may`.
/// The caller supplies a pure `EnvOnly` rule for the admission laws.
pub fn refusal_of(
    xs: &[Record],
    r: &Record,
    may: impl Fn(&Record, &Record) -> bool,
) -> Option<Refusal> {
    if !r
        .prev
        .iter()
        .all(|p| xs.iter().all(|q| q.id != *p || shares(r, q)))
    {
        Some(Refusal::PrevUnrelated)
    } else if !entitled(xs, r, may) {
        Some(Refusal::PrevNotPermitted)
    } else {
        None
    }
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

/// Lean: `Loops.realm`, model/Loops/Things.lean.
/// Settles all forms before admission, including erasure links from records that admission later refuses.
/// The caller supplies a pure `EnvOnly` rule for the admission laws.
pub fn realm(xs: &[Record], may: impl Fn(&Record, &Record) -> bool) -> Vec<Record> {
    admit(&settle(xs), may)
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
