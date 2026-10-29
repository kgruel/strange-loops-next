//! Identity, openings and checked writes from model/Loops/Stored.lean.
use crate::{base32, envelope::Env, json::Json};
use std::fmt;

/// writeCodes/writeProblem refusals (model/Loops/Stored.lean and Env.problem in Envelope.lean).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Error {
    /// Env.problem: empty kind.
    KindEmpty,
    /// Env.problem: invalid observer.
    ObserverNotTyped,
    /// Env.problem: invalid emitted.
    EmittedNotRfc3339,
    /// Env.problem: invalid occurred.
    OccurredNotSpan,
    /// Env.problem: invalid about member.
    AboutNotTyped,
    /// Env.problem: invalid prev member.
    PrevNotRecordId,
    /// Env.problem: invalid under.
    UnderNotRecordId,
    /// Env.problem: invalid erases member.
    ErasesNotRecordId,
    /// writeProblem: salt length is not 16.
    SaltNot16Bytes,
    /// writeProblem: duplicate object member at some depth.
    MemberDuplicate,
    /// writeProblem: integer outside the exact JCS range.
    NumberOutOfRange,
}
impl Error {
    /// Exact writeCodes spelling (model/Loops/Stored.lean).
    pub fn code(self) -> &'static str {
        match self {
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

/// Body (model/Loops/Stored.lean); unchecked construction deliberately remains possible.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Body {
    /// Body.opening.
    Opening {
        /// Body.opening salt.
        salt: Vec<u8>,
        /// Body.opening payload.
        payload: Json,
    },
    /// Body.erased.
    Erased(String),
}
/// Stored (model/Loops/Stored.lean), not necessarily the result of write.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stored {
    /// Stored.env.
    pub env: Env,
    /// Stored.body.
    pub body: Body,
}
/// commitOf (model/Loops/Stored.lean); H is an arbitrary byte-to-byte function, not necessarily SHA256.
pub fn commit_of(h: &impl Fn(&[u8]) -> Vec<u8>, salt: &[u8], payload: &Json) -> String {
    let mut preimage = salt.to_vec();
    preimage.extend_from_slice(payload.canon().as_bytes());
    format!("h:{}", base32::base32(&h(&preimage)))
}
/// idPreimage (model/Loops/Stored.lean).
pub fn id_preimage(env: &Env, commit: &str) -> String {
    Json::Obj(vec![
        ("commit".into(), Json::Str(commit.into())),
        ("env".into(), env.to_json()),
    ])
    .canon()
}
/// idOf (model/Loops/Stored.lean).
pub fn id_of(h: &impl Fn(&[u8]) -> Vec<u8>, env: &Env, commit: &str) -> String {
    format!(
        "r:{}",
        base32::base32(&h(id_preimage(env, commit).as_bytes()))
    )
}
/// make (model/Loops/Stored.lean), deliberately unchecked; use write for admission.
pub fn make(env: Env, salt: Vec<u8>, payload: Json) -> Stored {
    Stored {
        env,
        body: Body::Opening { salt, payload },
    }
}
impl Stored {
    /// Stored.commit (model/Loops/Stored.lean).
    pub fn commit(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> String {
        match &self.body {
            Body::Opening { salt, payload } => commit_of(h, salt, payload),
            Body::Erased(c) => c.clone(),
        }
    }
    /// Stored.id (model/Loops/Stored.lean).
    pub fn id(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> String {
        id_of(h, &self.env, &self.commit(h))
    }
    /// erase (model/Loops/Stored.lean); erasure keeps the commitment and envelope.
    #[must_use]
    pub fn erase(&self, h: &impl Fn(&[u8]) -> Vec<u8>) -> Self {
        Self {
            env: self.env.clone(),
            body: Body::Erased(self.commit(h)),
        }
    }
}
/// writeProblem (model/Loops/Stored.lean), envelope before salt, duplicates, numeric range.
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
/// Written/Writable (model/Loops/Stored.lean): private fields retain all successful write checks.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Written {
    env: Env,
    salt: Vec<u8>,
    payload: Json,
}
impl Written {
    /// Written.env (model/Loops/Stored.lean), immutable to preserve Writable.
    pub fn env(&self) -> &Env {
        &self.env
    }
    /// Written.salt (model/Loops/Stored.lean), exactly 16 bytes.
    pub fn salt(&self) -> &[u8] {
        &self.salt
    }
    /// Written.payload (model/Loops/Stored.lean), with distinct members and in-range integers.
    pub fn payload(&self) -> &Json {
        &self.payload
    }
    /// Written.stored (model/Loops/Stored.lean); the copied Stored is intentionally unchecked/mutable.
    pub fn stored(&self) -> Stored {
        make(self.env.clone(), self.salt.clone(), self.payload.clone())
    }
}
/// write (model/Loops/Stored.lean).
/// # Errors
/// Returns the first writeProblem refusal with its exact wire code.
pub fn write(env: Env, salt: Vec<u8>, payload: Json) -> Result<Written, Error> {
    if let Some(error) = write_problem(&env, &salt, &payload) {
        Err(error)
    } else {
        Ok(Written { env, salt, payload })
    }
}
/// opens (model/Loops/Stored.lean), checking an opening against the supplied commitment.
pub fn opens(h: &impl Fn(&[u8]) -> Vec<u8>, commit: &str, salt: &[u8], payload: &Json) -> bool {
    commit_of(h, salt, payload) == commit
}
/// signingInput (model/Loops/Stored.lean); the bytes Ed25519 covers, not a signature itself.
pub fn signing_input(id: &str) -> Vec<u8> {
    format!("loops/record/v1:{id}").into_bytes()
}
