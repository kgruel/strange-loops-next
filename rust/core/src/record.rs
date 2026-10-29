//! Reader records, visibility and order from model/Loops/Record.lean.
use crate::{
    base32,
    number::{Int, Nat},
    occurred::{Claim, Span, Stamp},
};

/// Shown (model/Loops/Record.lean), payload availability for this reader.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Shown {
    /// Shown.here.
    #[default]
    Here,
    /// Shown.withheld.
    Withheld,
    /// Shown.erased.
    Erased,
}
/// Val (model/Loops/Record.lean), exact payload primitives.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Val {
    /// Val.str.
    Str(String),
    /// Val.int.
    Int(Int),
    /// Val.bool.
    Bool(bool),
}
/// Record (model/Loops/Record.lean): unbounded ids/numbers and unnormalized lists.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Record {
    /// Record.id.
    pub id: Nat,
    /// Record.kind.
    pub kind: String,
    /// Record.observer.
    pub observer: String,
    /// Record.about.
    pub about: Vec<String>,
    /// Record.value.
    pub value: String,
    /// Record.prev.
    pub prev: Vec<Nat>,
    /// Record.under.
    pub under: Option<Nat>,
    /// Record.occurred.
    pub occurred: Option<Claim>,
    /// Record.emitted.
    pub emitted: Stamp,
    /// Record.erases.
    pub erases: Vec<Nat>,
    /// Record.n.
    pub n: Int,
    /// Record.fields.
    pub fields: Vec<(String, Val)>,
    /// Record.shown.
    pub shown: Shown,
}
// digestDigits (model/Loops/Record.lean), internal fixed-width idDigest helper.
fn digest_digits(k: usize, n: &Nat) -> Vec<Nat> {
    if k == 0 {
        return Vec::new();
    }
    let bytes = n.0.to_bytes_be();
    let low_len = k - 1;
    // Above the low k-1 bytes, Lean retains ALL remaining magnitude in the first digit.
    let split = bytes.len().saturating_sub(low_len);
    let mut out = Vec::with_capacity(k);
    out.push(Nat(num_bigint::BigUint::from_bytes_be(&bytes[..split])));
    out.extend(std::iter::repeat_with(Nat::default).take(low_len.saturating_sub(bytes.len())));
    out.extend(bytes[split..].iter().map(|b| Nat::from(u64::from(*b))));
    out
}
/// idDigest (model/Loops/Record.lean), retaining the unbounded first digit.
pub fn id_digest(n: &Nat) -> Vec<Nat> {
    digest_digits(32, n)
}
/// idText (model/Loops/Record.lean): Nat.toUInt8 reduces the first digit modulo 256.
pub fn id_text(n: &Nat) -> String {
    let bytes: Vec<_> = id_digest(n)
        .into_iter()
        .map(|digit| digit.0.to_bytes_le().first().copied().unwrap_or(0))
        .collect();
    format!("r:{}", base32::base32(&bytes))
}
impl Record {
    /// Record.span (model/Loops/Record.lean): occurred, otherwise emitted as a point.
    pub fn span(&self) -> Span {
        self.occurred.as_ref().map_or_else(
            || Span::point(self.emitted.moment().clone()),
            |c| c.span().clone(),
        )
    }
    /// Newer (model/Loops/Record.lean), descending span, emitted moment, then unbounded id.
    /// This relation intentionally is not Ord: equal ordering keys need not mean equal records.
    pub fn newer(&self, other: &Self) -> bool {
        self.span()
            .cmp(&other.span())
            .then_with(|| self.emitted.moment().cmp(other.emitted.moment()))
            .then_with(|| self.id.cmp(&other.id))
            .is_gt()
    }
    /// Record.withhold (model/Loops/Record.lean), clearing payload only.
    #[must_use]
    pub fn withhold(&self) -> Self {
        Self {
            value: String::new(),
            n: Int::default(),
            fields: Vec::new(),
            shown: Shown::Withheld,
            ..self.clone()
        }
    }
    /// Record.erase (model/Loops/Record.lean), clearing payload only.
    #[must_use]
    pub fn erase(&self) -> Self {
        Self {
            value: String::new(),
            n: Int::default(),
            fields: Vec::new(),
            shown: Shown::Erased,
            ..self.clone()
        }
    }
    /// Record.get (model/Loops/Record.lean): builtins override fields, then first field wins.
    /// Like Lean, this does not consult shown.
    pub fn get(&self, name: &str) -> Option<Val> {
        match name {
            "value" => Some(Val::Str(self.value.clone())),
            "n" => Some(Val::Int(self.n.clone())),
            _ => self
                .fields
                .iter()
                .find(|(k, _)| k == name)
                .map(|(_, v)| v.clone()),
        }
    }
    /// Record.num (model/Loops/Record.lean): only exact integers held here.
    pub fn num(&self, name: &str) -> Option<Int> {
        if self.shown != Shown::Here {
            return None;
        }
        match self.get(name) {
            Some(Val::Int(n)) => Some(n),
            _ => None,
        }
    }
}
/// withholding (model/Loops/Record.lean), the predicate-selected payload view.
pub fn withholding(p: impl FnOnce(&Record) -> bool, r: &Record) -> Record {
    if p(r) { r.withhold() } else { r.clone() }
}
