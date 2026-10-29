//! Fold families and reader visibility from model/Loops/Families.lean.
use crate::{
    fold::{self, LatestBy},
    number::{Int, Nat},
    record::{Record, Shown},
};

/// dedup (model/Loops/Families.lean), retaining the last form of each id.
pub fn dedup(xs: &[Record]) -> Vec<Record> {
    xs.iter()
        .enumerate()
        .filter(|(i, r)| !xs[i + 1..].iter().any(|s| s.id == r.id))
        .map(|(_, r)| r.clone())
        .collect()
}
/// Tri (model/Loops/Families.lean).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Tri {
    /// Tri.yes (model/Loops/Families.lean), also its derived Inhabited value.
    #[default]
    Yes,
    /// Tri.no (model/Loops/Families.lean).
    No,
    /// Tri.unknown (model/Loops/Families.lean).
    Unknown,
}
impl Tri {
    /// Tri.and (model/Loops/Spec.lean): No dominates Unknown, which dominates Yes.
    #[must_use]
    pub fn and(self, other: Self) -> Self {
        match (self, other) {
            (Self::No, _) | (_, Self::No) => Self::No,
            (Self::Unknown, _) | (_, Self::Unknown) => Self::Unknown,
            (Self::Yes, Self::Yes) => Self::Yes,
        }
    }
    /// Tri.ofBool (model/Loops/Families.lean).
    #[expect(
        clippy::fn_params_excessive_bools,
        reason = "Lean Tri.ofBool takes Bool"
    )]
    pub fn of_bool(b: bool) -> Self {
        if b { Self::Yes } else { Self::No }
    }
}
/// Where (model/Loops/Families.lean). Envelope predicates must depend only on the envelope;
/// unlike Lean, Rust cannot enforce the `SameEnvelope` proof obligation.
#[derive(Debug)]
pub enum Where<T> {
    /// Where.envelope (model/Loops/Families.lean).
    Envelope(T),
    /// Where.payload (model/Loops/Families.lean).
    Payload(T),
}
impl<T: Fn(&Record) -> bool> Where<T> {
    /// Where.eval (model/Loops/Families.lean).
    pub fn eval(&self, r: &Record) -> Tri {
        match self {
            Self::Envelope(t) => Tri::of_bool(t(r)),
            Self::Payload(t) if r.shown == Shown::Here => Tri::of_bool(t(r)),
            Self::Payload(_) => Tri::Unknown,
        }
    }
}
/// Result (model/Loops/Families.lean).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Result<T> {
    /// Result.value (model/Loops/Families.lean).
    pub value: T,
    /// Result.unread (model/Loops/Families.lean).
    pub unread: Nat,
}
/// Acc (model/Loops/Families.lean). Caller must ensure the step commutes;
/// Rust closures do not carry Lean's proof.
#[derive(Debug)]
pub struct Acc<T, S, R> {
    /// Acc.init (model/Loops/Families.lean).
    pub init: T,
    /// Acc.step (model/Loops/Families.lean).
    pub step: S,
    /// Acc.readable (model/Loops/Families.lean).
    pub readable: R,
}
impl<T: Clone, S: Fn(T, &Record) -> T, R: Fn(&Record) -> bool> Acc<T, S, R> {
    /// Acc.fold (model/Loops/Families.lean).
    pub fn fold(&self, xs: &[Record]) -> T {
        xs.iter().fold(self.init.clone(), &self.step)
    }
    /// Acc.select (model/Loops/Families.lean).
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
/// Count.acc, Sum.acc, Min.acc and Max.acc (model/Loops/Families.lean), concrete steps.
pub type PrimitiveAcc<T> = Acc<T, fn(T, &Record) -> T, fn(&Record) -> bool>;

/// Count.acc (model/Loops/Families.lean): every envelope is readable.
pub fn count_acc() -> PrimitiveAcc<Nat> {
    Acc {
        init: Nat::default(),
        step: fold::count_step,
        readable: |_| true,
    }
}
/// Sum.acc (model/Loops/Families.lean): the builtin n, readable only here.
pub fn sum_acc() -> PrimitiveAcc<Int> {
    Acc {
        init: Int::default(),
        step: fold::sum_step,
        readable: |r| r.shown == Shown::Here,
    }
}
/// Min.acc (model/Loops/Families.lean): the builtin n, readable only here.
pub fn min_acc() -> PrimitiveAcc<Option<Int>> {
    Acc {
        init: None,
        step: fold::min_step,
        readable: |r| r.shown == Shown::Here,
    }
}
/// Max.acc (model/Loops/Families.lean): the builtin n, readable only here.
pub fn max_acc() -> PrimitiveAcc<Option<Int>> {
    Acc {
        init: None,
        step: fold::max_step,
        readable: |r| r.shown == Shown::Here,
    }
}

/// Sum.on (model/Loops/Families.lean): missing, hidden and nonnumeric fields are unreadable.
pub fn sum_on(
    field: &str,
) -> Acc<Int, impl Fn(Int, &Record) -> Int + '_, impl Fn(&Record) -> bool + '_> {
    Acc {
        init: Int::default(),
        step: move |s: Int, r: &Record| Int(s.0 + r.num(field).unwrap_or_default().0),
        readable: move |r: &Record| r.num(field).is_some(),
    }
}

/// Min.on (model/Loops/Families.lean): unreadable fields leave the raw fold unchanged.
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

/// Max.on (model/Loops/Families.lean): unreadable fields leave the raw fold unchanged.
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

/// OverHeads.fold (model/Loops/Families.lean): supersede first, then answer.
pub fn over_heads<T>(answer: impl FnOnce(&LatestBy) -> T, xs: &[Record]) -> T {
    answer(&fold::latest_fold(xs))
}

impl LatestBy {
    /// LatestBy.maxHeads (model/Loops/Families.lean).
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
