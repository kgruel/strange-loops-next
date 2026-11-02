//! Identity, openings and checked writes from model/Loops/Stored.lean.
use crate::{base32, envelope::Env, json::Json};
use std::fmt;

/// Lean: `Loops.writeCodes` and `Loops.writeProblem`, model/Loops/Stored.lean.
/// Each value names one writer refusal, including envelope checks from `model/Loops/Envelope.lean`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    /// The raw envelope contains an unknown field.
    EnvelopeFieldUnknown,
    /// The kind name is empty.
    KindEmpty,
    /// The observer text breaks the typed reference grammar.
    ObserverNotTyped,
    /// The emission text breaks the instant grammar.
    EmittedNotRfc3339,
    /// The occurred text breaks the claim grammar.
    OccurredNotSpan,
    /// An about member breaks the typed reference grammar.
    AboutNotTyped,
    /// A supersession target breaks the record id grammar.
    PrevNotRecordId,
    /// The grant id breaks the record id grammar.
    UnderNotRecordId,
    /// An erasure target breaks the record id grammar.
    ErasesNotRecordId,
    /// The salt does not contain exactly 16 bytes.
    SaltNot16Bytes,
    /// A raw payload object repeats a member name at some depth.
    MemberDuplicate,
    /// A raw payload integer lies outside ±(2^53 - 1).
    NumberOutOfRange,
}
impl Error {
    /// Lean: `Loops.writeCodes`, model/Loops/Stored.lean.
    /// Returns the exact wire code for this refusal.
    pub fn code(self) -> &'static str {
        match self {
            Self::EnvelopeFieldUnknown => "envelope-field-unknown",
            Self::KindEmpty => "kind-empty",
            Self::ObserverNotTyped => "observer-not-typed",
            Self::EmittedNotRfc3339 => "emitted-not-rfc3339",
            Self::OccurredNotSpan => "occurred-not-span",
            Self::AboutNotTyped => "about-not-typed",
            Self::PrevNotRecordId => "prev-not-record-id",
            Self::UnderNotRecordId => "under-not-record-id",
            Self::ErasesNotRecordId => "erases-not-record-id",
            Self::SaltNot16Bytes => "salt-not-16-bytes",
            Self::MemberDuplicate => "member-duplicate",
            Self::NumberOutOfRange => "number-out-of-range",
        }
    }
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}
impl std::error::Error for Error {}

/// Lean: `Loops.Body`, model/Loops/Stored.lean.
/// A store keeps either the payload opening or its commitment.
/// This type permits unchecked construction.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Body {
    /// The salt and payload that open the commitment.
    Opening {
        /// The salt bytes that the store keeps with the payload to open its commitment.
        salt: Vec<u8>,
        /// The raw JSON value that the record commits to.
        payload: Json,
    },
    /// The commitment that remains after the store erases the opening.
    Erased(String),
}
/// Lean: `Loops.Stored`, model/Loops/Stored.lean.
/// A stored record holds an envelope and an opening or commitment.
/// This type does not require successful writer checks.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stored {
    /// The envelope that the record id covers.
    pub env: Env,
    /// The payload opening, or the commitment after erasure.
    pub body: Body,
}
/// Lean: `Loops.commitOf`, model/Loops/Stored.lean.
/// Hashes the salt bytes followed by the payload's canonical UTF-8 bytes.
/// The model does not require SHA-256 here.
pub fn commit_of(h: &impl Fn(&[u8]) -> Vec<u8>, salt: &[u8], payload: &Json) -> String {
    let mut preimage = salt.to_vec();
    preimage.extend_from_slice(payload.canon().as_bytes());
    format!("h:{}", base32::base32(&h(&preimage)))
}
/// Lean: `Loops.idPreimage`, model/Loops/Stored.lean.
/// Writes the canonical envelope and commitment object that the id hash covers.
pub fn id_preimage(env: &Env, commit: &str) -> String {
    Json::Obj(vec![
        ("commit".into(), Json::Str(commit.into())),
        ("env".into(), env.to_json()),
    ])
    .canon()
}
/// Lean: `Loops.idOf`, model/Loops/Stored.lean.
/// Hashes the id preimage and encodes the result as text after `r:`.
pub fn id_of(h: &impl Fn(&[u8]) -> Vec<u8>, env: &Env, commit: &str) -> String {
    format!(
        "r:{}",
        base32::base32(&h(id_preimage(env, commit).as_bytes()))
    )
}
/// Lean: `Loops.make`, model/Loops/Stored.lean.
/// Creates an opening without writer checks. Use `write` for a checked record.
pub fn make(env: Env, salt: Vec<u8>, payload: Json) -> Stored {
    Stored {
        env,
        body: Body::Opening { salt, payload },
    }
}
impl Stored {
    /// Lean: `Loops.Stored.commit`, model/Loops/Stored.lean.
    /// Computes the opening's commitment, or returns the commitment that remains after erasure.
    pub fn commit(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> String {
        match &self.body {
            Body::Opening { salt, payload } => commit_of(h, salt, payload),
            Body::Erased(c) => c.clone(),
        }
    }
    /// Lean: `Loops.Stored.id`, model/Loops/Stored.lean.
    /// Computes the text id from the envelope and current commitment.
    pub fn id(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> String {
        id_of(h, &self.env, &self.commit(h))
    }
    /// Lean: `Loops.erase`, model/Loops/Stored.lean.
    /// Removes the opening and keeps its commitment and envelope.
    #[must_use]
    pub fn erase(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> Self {
        Self {
            env: self.env.clone(),
            body: Body::Erased(self.commit(h)),
        }
    }
}
/// Lean: `Loops.writeProblem`, model/Loops/Stored.lean.
/// Returns the first refusal after checking envelope, salt length, duplicate names, and numeric range in that order.
pub fn write_problem(env: &Env, salt: &[u8], payload: &Json) -> Option<Error> {
    env.problem().or_else(|| {
        if salt.len() != 16 {
            Some(Error::SaltNot16Bytes)
        } else if !payload.keys_distinct() {
            Some(Error::MemberDuplicate)
        } else if !payload.in_range() {
            Some(Error::NumberOutOfRange)
        } else {
            None
        }
    })
}
/// Lean: `Loops.Written` and `Loops.Writable`, model/Loops/Stored.lean.
/// This record keeps the values that pass all writer checks.
/// Private fields prevent later changes from breaking those checks.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Written {
    env: Env,
    salt: Vec<u8>,
    payload: Json,
}
impl Written {
    /// Lean: `Loops.Written.env`, model/Loops/Stored.lean.
    /// Returns the envelope without allowing changes to the checked values.
    pub fn env(&self) -> &Env {
        &self.env
    }
    /// Lean: `Loops.Written.salt`, model/Loops/Stored.lean.
    /// Returns the salt, which contains exactly 16 bytes.
    pub fn salt(&self) -> &[u8] {
        &self.salt
    }
    /// Lean: `Loops.Written.payload`, model/Loops/Stored.lean.
    /// Returns the payload with distinct object names and integers within the exact writer range.
    pub fn payload(&self) -> &Json {
        &self.payload
    }
    /// Lean: `Loops.Written.stored`, model/Loops/Stored.lean.
    /// Copies the checked data into a mutable stored record without changing this checked value.
    pub fn stored(&self) -> Stored {
        make(self.env.clone(), self.salt.clone(), self.payload.clone())
    }
}
/// Lean: `Loops.write`, model/Loops/Stored.lean.
/// Checks the envelope, salt, duplicate members, and integer range in that order.
/// # Errors
/// Returns the first writeProblem refusal with its exact wire code.
pub fn write(env: Env, salt: Vec<u8>, payload: Json) -> Result<Written, Error> {
    if let Some(error) = write_problem(&env, &salt, &payload) {
        Err(error)
    } else {
        Ok(Written { env, salt, payload })
    }
}
/// Lean: `Loops.opens`, model/Loops/Stored.lean.
/// Checks whether the supplied salt and payload hash to the commitment.
pub fn opens(h: &impl Fn(&[u8]) -> Vec<u8>, commit: &str, salt: &[u8], payload: &Json) -> bool {
    commit_of(h, salt, payload) == commit
}
/// Lean: `Loops.signingInput`, model/Loops/Stored.lean.
/// Writes the domain prefix and id text bytes that Ed25519 signs.
/// This function does not create a signature.
pub fn signing_input(id: &str) -> Vec<u8> {
    format!("loops/record/v1:{id}").into_bytes()
}
