//! Finite binary64 payload numbers and exact Lean Nat/Int arithmetic.
use num_bigint::{BigInt, BigUint};
use std::{fmt, num::ParseFloatError, str::FromStr};

/// The largest magnitude that layer 0 accepts when writing payload numbers.
pub(crate) const MAX_EXACT: i64 = 9_007_199_254_740_991;

/// A finite binary64 payload value with bitwise equality, including signed zero.
/// Construction rounds decimal input directly to binary64 and refuses nonfinite values.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash)]
pub struct Number {
    bits: u64,
}

/// An invalid float spelling or a nonfinite binary64 value.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NumberError {
    parse: Option<ParseFloatError>,
}

impl fmt::Display for NumberError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.parse {
            Some(error) => write!(f, "invalid binary64 number: {error}"),
            None => f.write_str("a payload number must be finite"),
        }
    }
}

impl std::error::Error for NumberError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match &self.parse {
            Some(error) => Some(error),
            None => None,
        }
    }
}

impl Number {
    /// Stores the finite value without changing its bits.
    ///
    /// # Errors
    /// Returns [`NumberError`] for NaN and either infinity.
    pub fn new(value: f64) -> Result<Self, NumberError> {
        if value.is_finite() {
            Ok(Self {
                bits: value.to_bits(),
            })
        } else {
            Err(NumberError { parse: None })
        }
    }

    /// Returns the stored IEEE-754 binary64 representation, including the sign of zero.
    pub fn bits(self) -> u64 {
        self.bits
    }

    /// Checks the writer magnitude bound, independently of whole-number readability.
    pub fn in_range(self) -> bool {
        f64::from_bits(self.bits).abs() <= 9_007_199_254_740_991.0
    }

    /// Returns an exact integer only for integral values within ±(2^53 − 1).
    #[expect(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        reason = "The finite integral value lies inside the safe-whole range, which fits i64"
    )]
    pub fn whole(self) -> Option<Int> {
        let value = f64::from_bits(self.bits);
        if self.in_range() && value.fract() == 0.0 {
            Some(Int::from(value as i64))
        } else {
            None
        }
    }

    /// Writes native shortest digits with ECMAScript's even tie-break, notation, and unsigned zero.
    ///
    /// # Panics
    /// Panics if Rust's native formatter emits an invalid binary64 representation.
    pub fn canon(self) -> String {
        let value = f64::from_bits(self.bits);
        if value == 0.0 {
            return "0".into();
        }
        // LowerExp provides shortest digits without allocating hundreds of positional zeros.
        let shortest = format!("{value:e}");
        let (mantissa, exponent) = shortest
            .split_once('e')
            .expect("Rust's lower exponential format contains an exponent");
        let exponent: i32 = exponent.parse().expect("Rust emits a decimal exponent");
        let (sign, mantissa) = mantissa
            .strip_prefix('-')
            .map_or(("", mantissa), |m| ("-", m));
        let mut digits = mantissa.replace('.', "");
        let coefficient: u64 = digits
            .parse()
            .expect("Rust emits at most 17 decimal digits");
        let mut scale = exponent - i32::try_from(digits.len()).expect("at most 17 digits") + 1;
        let mut corrected = even_shortest_coefficient(value.abs().to_bits(), coefficient, scale);
        if corrected != coefficient {
            // Normalize only the corrected coefficient; no significant digits are discarded.
            while corrected % 10 == 0 {
                corrected /= 10;
                scale += 1;
            }
            digits = corrected.to_string();
        }
        let exponent = scale + i32::try_from(digits.len()).expect("at most 17 digits") - 1;
        if !(-6..21).contains(&exponent) {
            let mantissa = if digits.len() == 1 {
                digits
            } else {
                format!("{}.{}", &digits[..1], &digits[1..])
            };
            return format!("{sign}{mantissa}e{exponent:+}");
        }
        if exponent < 0 {
            let zeros =
                usize::try_from(-exponent - 1).expect("the exponent lies between -6 and -1");
            return format!("{sign}0.{}{digits}", "0".repeat(zeros));
        }
        let position = usize::try_from(exponent + 1).expect("the exponent lies between 0 and 20");
        if position >= digits.len() {
            format!("{sign}{digits}{}", "0".repeat(position - digits.len()))
        } else {
            format!("{sign}{}.{}", &digits[..position], &digits[position..])
        }
    }
}

/// Keeps native shortest digits except at an exact tie with an even adjacent coefficient.
fn even_shortest_coefficient(bits: u64, coefficient: u64, scale: i32) -> u64 {
    if coefficient % 2 == 0 {
        return coefficient;
    }
    // IEEE-754 binary64: 52 fraction bits, bias 1023, and subnormal exponent -1074.
    let encoded_exponent = i32::try_from(bits >> 52).expect("a magnitude has 11 exponent bits");
    let fraction = bits & ((1_u64 << 52) - 1);
    let (significand, binary_exponent) = if encoded_exponent == 0 {
        (fraction, -1074)
    } else {
        (fraction | (1_u64 << 52), encoded_exponent - 1075)
    };
    // Form 2 * abs(value) / 10^scale exactly, then compare it to the sum
    // of the native coefficient and each neighbor: equality is precisely a midpoint.
    let mut numerator = BigUint::from(significand) << 1_usize;
    let mut denominator = BigUint::from(1_u8);
    if binary_exponent >= 0 {
        numerator <<= binary_exponent.unsigned_abs();
    } else {
        denominator <<= binary_exponent.unsigned_abs();
    }
    let decimal_power = BigUint::from(10_u8).pow(scale.unsigned_abs());
    if scale >= 0 {
        denominator *= decimal_power;
    } else {
        numerator *= decimal_power;
    }
    for adjacent in [coefficient - 1, coefficient + 1] {
        if numerator == BigUint::from(coefficient + adjacent) * &denominator
            // At powers of two the binary rounding interval is asymmetric; only
            // replace with an equally short coefficient that also roundtrips.
            && format!("{adjacent}e{scale}")
                .parse::<f64>()
                .expect("an adjacent decimal coefficient is valid float text")
                .to_bits()
                == bits
        {
            return adjacent;
        }
    }
    coefficient
}

impl FromStr for Number {
    type Err = NumberError;

    /// Parses directly with Rust's binary64 parser, without an integer or decimal intermediate.
    /// JSON syntax validation belongs to the enclosing JSON parser.
    ///
    /// # Errors
    /// Returns [`NumberError`] for invalid float text or a nonfinite result.
    fn from_str(text: &str) -> Result<Self, Self::Err> {
        let value = text
            .parse::<f64>()
            .map_err(|error| NumberError { parse: Some(error) })?;
        Self::new(value)
    }
}

impl fmt::Display for Number {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.canon())
    }
}

/// Lean: `Nat` in `Loops.Count` and `Loops.LatestBy.limit`, model/Loops/{Fold,Families}.lean.
/// Counts, unread totals, and limits have no size bound.
#[derive(Clone, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Nat(pub(crate) BigUint);
/// Lean: `Int` in `Loops.Json.int` and `Loops.Record.n`, model/Loops/{Json,Record}.lean.
/// Payload integers and numeric fold state have no size bound.
#[derive(Clone, Debug, Default, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Int(pub(crate) BigInt);
/// Supports Lean `Gen.Read.number`, model/Gen/Read.lean.
/// This Rust boundary error reports invalid decimal integer text.
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
