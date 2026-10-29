//! Fold families and reader visibility from model/Loops/Families.lean.
use crate::{
    fold::{self, LatestBy},
    number::{Int, Nat},
    record::{Record, Shown},
};

/// Lean: `Loops.dedup`, model/Loops/Families.lean.
/// Keeps the last reader form of each id in input order.
pub fn dedup(xs: &[Record]) -> Vec<Record> {
    xs.iter()
        .enumerate()
        .filter(|(i, r)| !xs[i + 1..].iter().any(|s| s.id == r.id))
        .map(|(_, r)| r.clone())
        .collect()
}
/// Lean: `Loops.Tri`, model/Loops/Families.lean.
/// A test either holds, fails, or needs a payload that the reader lacks.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Tri {
    /// The test holds. This value also represents an empty conjunction.
    #[default]
    Yes,
    /// The test fails.
    No,
    /// The reader lacks the payload that the test needs.
    Unknown,
}
impl Tri {
    /// Lean: `Loops.Tri.and`, model/Loops/Spec.lean.
    /// Combines test results. `No` overrides `Unknown`, and `Unknown` overrides `Yes`.
    #[must_use]
    pub fn and(self, other: Self) -> Self {
        match (self, other) {
            (Self::No, _) | (_, Self::No) => Self::No,
            (Self::Unknown, _) | (_, Self::Unknown) => Self::Unknown,
            (Self::Yes, Self::Yes) => Self::Yes,
        }
    }
    /// Lean: `Loops.Tri.ofBool`, model/Loops/Families.lean.
    /// Converts a known test result to `Yes` or `No`.
    #[expect(
        clippy::fn_params_excessive_bools,
        reason = "Lean Tri.ofBool takes Bool"
    )]
    pub fn of_bool(b: bool) -> Self {
        if b { Self::Yes } else { Self::No }
    }
}
/// Lean: `Loops.Where`, model/Loops/Families.lean.
/// A predicate declares whether it needs the envelope or the payload.
/// Envelope predicates must depend only on `SameEnvelope` data.
/// Rust does not enforce this Lean proof requirement.
#[derive(Debug)]
pub enum Where<T> {
    /// A predicate that reads only envelope data.
    Envelope(T),
    /// A predicate that needs the payload.
    Payload(T),
}
impl<T: Fn(&Record) -> bool> Where<T> {
    /// Lean: `Loops.Where.eval`, model/Loops/Families.lean.
    /// Tests the record, or returns `Unknown` when a payload predicate lacks its payload.
    pub fn eval(&self, r: &Record) -> Tri {
        match self {
            Self::Envelope(t) => Tri::of_bool(t(r)),
            Self::Payload(t) if r.shown == Shown::Here => Tri::of_bool(t(r)),
            Self::Payload(_) => Tri::Unknown,
        }
    }
}
/// Lean: `Loops.Result`, model/Loops/Families.lean.
/// A selection result holds the fold value and its unread count.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Result<T> {
    /// The state after the fold steps through selected readable records.
    pub value: T,
    /// The count of unknown tests and selected records that the fold cannot read.
    pub unread: Nat,
}
/// Lean: `Loops.Acc`, model/Loops/Families.lean.
/// A fold family defines its initial state, step, and readability test.
/// The caller must supply pure steps that commute, as Lean requires.
/// Rust does not enforce that proof requirement.
#[derive(Debug)]
pub struct Acc<T, S, R> {
    /// The state before the fold reads any record.
    pub init: T,
    /// The pure function that adds one record to the state.
    pub step: S,
    /// The test for data that this fold can read from the record.
    pub readable: R,
}
impl<T: Clone, S: Fn(T, &Record) -> T, R: Fn(&Record) -> bool> Acc<T, S, R> {
    /// Lean: `Loops.Acc.fold`, model/Loops/Families.lean.
    /// Steps through every record without selection, readability checks, or duplicate removal.
    pub fn fold(&self, xs: &[Record]) -> T {
        xs.iter().fold(self.init.clone(), &self.step)
    }
    /// Lean: `Loops.Acc.select`, model/Loops/Families.lean.
    /// Skips `No`, steps selected readable records, and counts each other record once as unread.
    pub fn select(&self, ev: impl Fn(&Record) -> Tri, xs: &[Record]) -> Result<T> {
        let mut value = self.init.clone();
        let mut unread = Nat::default();
        for r in xs {
            match ev(r) {
                Tri::No => {}
                Tri::Yes if (self.readable)(r) => value = (self.step)(value, r),
                Tri::Unknown | Tri::Yes => unread.0 += 1_u8,
            }
        }
        Result { value, unread }
    }
}
/// Lean: `Loops.Count.acc`, `Loops.Sum.acc`, `Loops.Min.acc`, and `Loops.Max.acc`, model/Loops/Families.lean.
/// This alias names fold families with concrete step and readability functions.
pub type PrimitiveAcc<T> = Acc<T, fn(T, &Record) -> T, fn(&Record) -> bool>;

/// Lean: `Loops.Count.acc`, model/Loops/Families.lean.
/// Creates a count family that can read every envelope.
pub fn count_acc() -> PrimitiveAcc<Nat> {
    Acc {
        init: Nat::default(),
        step: fold::count_step,
        readable: |_| true,
    }
}
/// Lean: `Loops.Sum.acc`, model/Loops/Families.lean.
/// Creates a sum family for built-in `n`, which is readable only when the payload is `Here`.
pub fn sum_acc() -> PrimitiveAcc<Int> {
    Acc {
        init: Int::default(),
        step: fold::sum_step,
        readable: |r| r.shown == Shown::Here,
    }
}
/// Lean: `Loops.Min.acc`, model/Loops/Families.lean.
/// Creates a minimum family for built-in `n`, which is readable only when the payload is `Here`.
pub fn min_acc() -> PrimitiveAcc<Option<Int>> {
    Acc {
        init: None,
        step: fold::min_step,
        readable: |r| r.shown == Shown::Here,
    }
}
/// Lean: `Loops.Max.acc`, model/Loops/Families.lean.
/// Creates a maximum family for built-in `n`, which is readable only when the payload is `Here`.
pub fn max_acc() -> PrimitiveAcc<Option<Int>> {
    Acc {
        init: None,
        step: fold::max_step,
        readable: |r| r.shown == Shown::Here,
    }
}

/// Lean: `Loops.Sum.on`, model/Loops/Families.lean.
/// Creates a sum family for a named integer field.
/// Missing, hidden, and nonnumeric fields count as unreadable.
pub fn sum_on(
    field: &str,
) -> Acc<Int, impl Fn(Int, &Record) -> Int + '_, impl Fn(&Record) -> bool + '_> {
    Acc {
        init: Int::default(),
        step: move |s: Int, r: &Record| Int(s.0 + r.num(field).unwrap_or_default().0),
        readable: move |r: &Record| r.num(field).is_some(),
    }
}

/// Lean: `Loops.Min.on`, model/Loops/Families.lean.
/// Creates a minimum family for a named integer field.
/// Its raw step leaves the state unchanged when the field is unreadable.
#[expect(
    clippy::type_complexity,
    reason = "Explicit closure types avoid boxing field-specific accumulators"
)]
pub fn min_on(
    field: &str,
) -> Acc<
    Option<Int>,
    impl Fn(Option<Int>, &Record) -> Option<Int> + '_,
    impl Fn(&Record) -> bool + '_,
> {
    Acc {
        init: None,
        step: move |s: Option<Int>, r: &Record| match (r.num(field), s) {
            (Some(v), Some(m)) => Some(m.min(v)),
            (Some(v), None) => Some(v),
            (None, s) => s,
        },
        readable: move |r: &Record| r.num(field).is_some(),
    }
}

/// Lean: `Loops.Max.on`, model/Loops/Families.lean.
/// Creates a maximum family for a named integer field.
/// Its raw step leaves the state unchanged when the field is unreadable.
#[expect(
    clippy::type_complexity,
    reason = "Explicit closure types avoid boxing field-specific accumulators"
)]
pub fn max_on(
    field: &str,
) -> Acc<
    Option<Int>,
    impl Fn(Option<Int>, &Record) -> Option<Int> + '_,
    impl Fn(&Record) -> bool + '_,
> {
    Acc {
        init: None,
        step: move |s: Option<Int>, r: &Record| match (r.num(field), s) {
            (Some(v), Some(m)) => Some(m.max(v)),
            (Some(v), None) => Some(v),
            (None, s) => s,
        },
        readable: move |r: &Record| r.num(field).is_some(),
    }
}

/// Lean: `Loops.OverHeads.fold`, model/Loops/Families.lean.
/// Resolves supersession before passing all current heads to the answer function.
pub fn over_heads<T>(answer: impl FnOnce(&LatestBy) -> T, xs: &[Record]) -> T {
    answer(&fold::latest_fold(xs))
}

impl LatestBy {
    /// Lean: `Loops.LatestBy.maxHeads`, model/Loops/Families.lean.
    /// Finds the greatest integer among readable heads and counts the unread heads.
    pub fn max_heads(&self) -> Result<Option<Int>> {
        let mut value = None;
        let mut unread = Nat::default();
        for r in &self.heads {
            if r.shown == Shown::Here {
                value = fold::max_step(value, r);
            } else {
                unread.0 += 1_u8;
            }
        }
        Result { value, unread }
    }
}
