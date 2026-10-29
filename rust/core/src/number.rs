//! Unbounded Lean Nat/Int boundary (model/Loops/{Json,Record}.lean).
use num_bigint::{BigInt, BigUint};
use std::{fmt, str::FromStr};

/// Lean Nat, notably Record.id and reader links (model/Loops/Record.lean).
#[derive(Clone, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Nat(pub(crate) BigUint);
/// Lean Int, notably Json.int and Record.n (model/Loops/{Json,Record}.lean).
#[derive(Clone, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Int(pub(crate) BigInt);
/// Decimal ingestion of Json.int/Record.id/n (model/Loops/{Json,Record}.lean).
/// Rust-boundary failure; Lean has no corresponding decimal parser here.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ParseNumberError;
impl fmt::Display for ParseNumberError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("invalid integer")
    }
}
impl std::error::Error for ParseNumberError {}
impl fmt::Display for Nat {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}
impl fmt::Display for Int {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}
impl FromStr for Nat {
    type Err = ParseNumberError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        s.parse().map(Self).map_err(|_| ParseNumberError)
    }
}
impl FromStr for Int {
    type Err = ParseNumberError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        s.parse().map(Self).map_err(|_| ParseNumberError)
    }
}
impl From<u64> for Nat {
    fn from(n: u64) -> Self {
        Self(n.into())
    }
}
impl From<u64> for Int {
    fn from(n: u64) -> Self {
        Self(n.into())
    }
}
impl From<i64> for Int {
    fn from(n: i64) -> Self {
        Self(n.into())
    }
}
