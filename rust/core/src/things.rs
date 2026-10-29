//! Per-thing reader state from model/Loops/Things.lean (not settle or admit).
use crate::{
    fold::{LatestBy, latest_fold},
    json::canon_set,
    record::{Record, id_text},
};

impl Record {
    /// Record.things (model/Loops/Things.lean): no about anchors the record's own id.
    pub fn things(&self) -> Vec<String> {
        if self.about.is_empty() {
            vec![id_text(&self.id)]
        } else {
            self.about.clone()
        }
    }

    /// Record.isAbout (model/Loops/Things.lean), including the self-anchoring case.
    pub fn is_about(&self, thing: &str) -> bool {
        self.things().iter().any(|t| t == thing)
    }
}

/// shares (model/Loops/Things.lean): intersection of things, not raw about lists.
pub fn shares(a: &Record, b: &Record) -> bool {
    let bs = b.things();
    a.things().iter().any(|t| bs.contains(t))
}

/// thingsOf (model/Loops/Things.lean): distinct things in canonical UTF-16 order.
pub fn things_of(xs: &[Record]) -> Vec<String> {
    canon_set(&xs.iter().flat_map(Record::things).collect::<Vec<_>>())
}

/// stateIn (model/Loops/Things.lean): supersession within one thing, before selection.
pub fn state_in(thing: &str, xs: &[Record]) -> LatestBy {
    latest_fold(
        &xs.iter()
            .filter(|r| r.is_about(thing))
            .cloned()
            .collect::<Vec<_>>(),
    )
}

/// perThing (model/Loops/Things.lean): each thing and all its current heads.
pub fn per_thing(xs: &[Record]) -> Vec<(String, LatestBy)> {
    things_of(xs)
        .into_iter()
        .map(|t| {
            let state = state_in(&t, xs);
            (t, state)
        })
        .collect()
}
