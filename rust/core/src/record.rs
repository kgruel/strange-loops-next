//! Reader records, visibility and order from model/Loops/Record.lean.
use crate::{
    base32,
    number::{Int, MAX_EXACT, Number},
    occurred::{Claim, Span, Stamp},
};

/// Lean: `Loops.Shown`, model/Loops/Record.lean.
/// This value states which payload the reader holds.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Shown {
    /// The reader holds the payload.
    #[default]
    Here,
    /// The reader's grant excludes the payload.
    Withheld,
    /// The store erases the payload.
    Erased,
}
/// Lean: `Loops.Val`, model/Loops/Record.lean.
/// A payload field holds text, a number, or a Boolean value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Val {
    /// A text value.
    Str(String),
    /// An integer with no size bound.
    Int(Int),
    /// A finite binary64 number with bitwise equality.
    Number(Number),
    /// A true or false value.
    Bool(bool),
}
/// Lean: `Loops.Record`, model/Loops/Record.lean.
/// A reader record holds an envelope and a payload view.
/// Lists keep their order and repeats.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Record {
    /// The record's 32-byte content digest.
    pub id: Digest,
    /// The record's kind name.
    pub kind: String,
    /// The reference for the observer who makes the claim.
    pub observer: String,
    /// The references for the things this record concerns.
    pub about: Vec<String>,
    /// The text payload field.
    pub value: String,
    /// The digests of the records this record supersedes.
    pub prev: Vec<Digest>,
    /// The digest of the grant this record uses, if any.
    pub under: Option<Digest>,
    /// The observer's claim about past time, if any.
    pub occurred: Option<Claim>,
    /// The observer's current time when it emits the record.
    pub emitted: Stamp,
    /// The digests of the records whose payloads this record erases.
    pub erases: Vec<Digest>,
    /// The exact integer payload field for numeric folds.
    pub n: Int,
    /// A binary64 payload that overrides `n` in lookup and remains unread by numeric folds.
    pub n_number: Option<Number>,
    /// The other named payload fields, in lookup order.
    pub fields: Vec<(String, Val)>,
    /// The payload availability for this reader.
    pub shown: Shown,
}
/// Lean: `Loops.Record.id` and `Loops.idDigest`, model/Loops/Record.lean.
/// A digest holds 32 bytes, with the most significant byte first.
/// Derived byte order follows `id_order`, model/Laws/Order.lean:46.
/// Bounded digest roundtrips follow model/Laws/Id.lean; text injectivity follows model/Laws/IdText.lean.
/// These representation laws do not establish content addressing or hash correctness.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Digest(pub [u8; 32]);

impl From<[u8; 32]> for Digest {
    fn from(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
}
impl TryFrom<&[u8]> for Digest {
    type Error = std::array::TryFromSliceError;

    /// Converts bytes for Lean `idDigest`, model/Loops/Record.lean.
    /// # Errors
    /// Returns an error if the slice does not contain exactly 32 bytes.
    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        bytes.try_into().map(Self)
    }
}
/// Lean: `Loops.idDigest`, model/Loops/Record.lean.
/// Returns the exact digest bytes without a numeric conversion.
pub const fn id_digest(id: &Digest) -> &[u8; 32] {
    &id.0
}
/// Lean: `Loops.idText`, model/Loops/Record.lean.
/// Encodes all digest bytes as lowercase base32 after `r:`.
pub fn id_text(id: &Digest) -> String {
    format!("r:{}", base32::base32(id_digest(id)))
}
impl Record {
    /// Lean: `Loops.Record.span`, model/Loops/Record.lean.
    /// Returns the occurred span, or the emission instant as a point.
    pub fn span(&self) -> Span {
        self.occurred.as_ref().map_or_else(
            || Span::point(self.emitted.moment().clone()),
            |c| c.span().clone(),
        )
    }
    /// Lean: `Loops.Newer`, model/Loops/Record.lean.
    /// Compares the span, emitted moment, and digest, in that order.
    /// Equal order keys do not imply equal records, so this relation does not implement `Ord`.
    pub fn newer(&self, other: &Self) -> bool {
        self.span()
            .cmp(&other.span())
            .then_with(|| self.emitted.moment().cmp(other.emitted.moment()))
            .then_with(|| self.id.cmp(&other.id))
            .is_gt()
    }
    /// Lean: `Loops.Record.withhold`, model/Loops/Record.lean.
    /// Removes the payload and marks it withheld without changing the envelope.
    #[must_use]
    pub fn withhold(&self) -> Self {
        Self {
            value: String::new(),
            n: Int::default(),
            n_number: None,
            fields: Vec::new(),
            shown: Shown::Withheld,
            ..self.clone()
        }
    }
    /// Lean: `Loops.Record.erase`, model/Loops/Record.lean.
    /// Removes the payload and marks it erased without changing the envelope.
    #[must_use]
    pub fn erase(&self) -> Self {
        Self {
            value: String::new(),
            n: Int::default(),
            n_number: None,
            fields: Vec::new(),
            shown: Shown::Erased,
            ..self.clone()
        }
    }
    /// Lean: `Loops.Record.get`, model/Loops/Record.lean.
    /// Reads built-in `value` and `n` before the first matching named field.
    /// This lookup does not inspect payload visibility.
    pub fn get(&self, name: &str) -> Option<Val> {
        match name {
            "value" => Some(Val::Str(self.value.clone())),
            "n" => Some(
                self.n_number
                    .map_or_else(|| Val::Int(self.n.clone()), Val::Number),
            ),
            _ => self
                .fields
                .iter()
                .find(|(k, _)| k == name)
                .map(|(_, v)| v.clone()),
        }
    }
    /// Lean: `Loops.Record.num`, model/Loops/Record.lean.
    /// Returns a named normalized safe-whole integer only when the payload is `Here`.
    /// Readers normalize safe-whole binary64 inputs to `Int` at the reader boundary.
    /// Raw `Val::Number` values remain unread, even when they represent safe-whole numbers.
    pub fn num(&self, name: &str) -> Option<Int> {
        if self.shown != Shown::Here {
            return None;
        }
        match self.get(name) {
            Some(Val::Int(n)) if n >= Int::from(-MAX_EXACT) && n <= Int::from(MAX_EXACT) => Some(n),
            _ => None,
        }
    }
}
/// Lean: `Loops.withholding`, model/Loops/Record.lean.
/// Withholds the payload when the predicate holds and keeps the record otherwise.
pub fn withholding(p: impl FnOnce(&Record) -> bool, r: &Record) -> Record {
    if p(r) { r.withhold() } else { r.clone() }
}
