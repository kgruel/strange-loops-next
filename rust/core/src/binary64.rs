//! Finite binary64 numbers, separate from the unbounded integer JSON and record types.
use std::{fmt, str::FromStr};

/// A finite binary64 value with bitwise equality, including distinct positive and negative zeros.
///
/// Reading decimal text rounds once through Rust's binary64 parser.
/// Equality and hashing compare bits, not numeric values. No numeric order is defined.
/// Both zeros keep their bits, but canonical text writes either zero as `0`.
///
/// # Examples
/// ```
/// use loops::binary64::Number;
/// # fn main() -> Result<(), loops::binary64::Error> {
/// let number: Number = "1e2".parse()?;
/// assert_eq!(number.whole(), Some(100));
/// assert_eq!(number.canon(), "100");
/// # Ok(())
/// # }
/// ```
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Number {
    bits: u64,
}

/// A number requires a JSON decimal token and a finite rounded binary64 value.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum Error {
    /// Supply one RFC 8259 number token, without whitespace or other text.
    InvalidSyntax,
    /// Supply a finite value; NaN, infinity, and decimal overflow are not accepted.
    NonFinite,
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::InvalidSyntax => "expected an RFC 8259 number token",
            Self::NonFinite => "expected a finite binary64 value",
        })
    }
}
impl std::error::Error for Error {}

impl Number {
    /// Checks a binary64 bit pattern and preserves its sign, including negative zero.
    ///
    /// # Errors
    /// Returns [`Error::NonFinite`] for NaN or either infinity.
    pub fn from_bits(bits: u64) -> Result<Self, Error> {
        if f64::from_bits(bits).is_finite() {
            Ok(Self { bits })
        } else {
            Err(Error::NonFinite)
        }
    }

    /// Returns the stored binary64 bits without normalizing signed zero.
    pub fn bits(self) -> u64 {
        self.bits
    }

    /// Reads a whole value within the inclusive bounds ±(2^53 - 1).
    ///
    /// This checks the rounded binary64 value, not its original decimal spelling.
    /// Either zero returns `Some(0)`; fractions and larger magnitudes return `None`.
    #[expect(
        clippy::as_conversions,
        clippy::cast_possible_truncation,
        reason = "the range and fraction checks make the f64 to i64 conversion exact"
    )]
    pub fn whole(self) -> Option<i64> {
        // IEEE 754 binary64 represents every integer through this safe-whole bound.
        const MAX_WHOLE: f64 = 9_007_199_254_740_991.0;
        let value = f64::from_bits(self.bits);
        if value.abs() <= MAX_WHOLE && value.fract() == 0.0 {
            Some(value as i64)
        } else {
            None
        }
    }

    /// Writes the shortest decimal with ECMAScript's even ties and notation thresholds.
    ///
    /// Rust's shortest printing supplies the digits. Exact ties are corrected to
    /// an even decimal coefficient only if the alternative still rounds back.
    /// Magnitudes in `[1e-6, 1e21)` use fixed notation. Others use `e`, with `+`
    /// for positive exponents. Either zero writes `0`.
    #[expect(
        clippy::missing_panics_doc,
        reason = "finite Display output is bounded and has at most 17 significant digits; internal conversions cannot fail"
    )]
    pub fn canon(self) -> String {
        let value = f64::from_bits(self.bits);
        if value == 0.0 {
            return "0".into();
        }
        // Display supplies fixed notation, so normalize it to coefficient * 10^exponent.
        let magnitude = value.abs();
        let shortest = magnitude.to_string();
        let point = shortest.find('.').unwrap_or(shortest.len());
        let digits = shortest.replace('.', "");
        let leading = digits.len() - digits.trim_start_matches('0').len();
        let digits = digits.trim_matches('0');
        let mut coefficient = digits
            .parse::<u64>()
            .expect("at most 17 significant digits");
        // Unsigned finite binary64 Display output has at most 326 characters.
        let mut exponent = i32::try_from(point).expect("binary64 decimal point fits i32")
            - i32::try_from(leading).expect("binary64 leading zero count fits i32")
            - i32::try_from(digits.len()).expect("at most 17 significant digits");
        if coefficient % 2 == 1 && is_decimal_midpoint(magnitude.to_bits(), coefficient, exponent) {
            let lower = coefficient - 1;
            // Powers of two have asymmetric intervals: an exact tie alone is insufficient.
            if format!("{lower}e{exponent}")
                .parse::<f64>()
                .is_ok_and(|candidate| candidate.to_bits() == magnitude.to_bits())
            {
                coefficient = lower;
            }
        }
        while coefficient % 10 == 0 {
            coefficient /= 10;
            exponent += 1;
        }
        let sign = if value.is_sign_negative() { "-" } else { "" };
        render_decimal(coefficient, exponent, sign)
    }
}

impl TryFrom<f64> for Number {
    type Error = Error;

    /// Checks finiteness without changing the binary64 bits.
    ///
    /// # Errors
    /// Returns [`Error::NonFinite`] for NaN or either infinity.
    fn try_from(value: f64) -> Result<Self, Self::Error> {
        Self::from_bits(value.to_bits())
    }
}
impl FromStr for Number {
    type Err = Error;

    /// Reads exactly one RFC 8259 number token and rounds it to binary64.
    ///
    /// Subnormals and underflow to signed zero are accepted.
    ///
    /// # Errors
    /// Returns [`Error::InvalidSyntax`] for invalid tokens, including whitespace.
    /// Returns [`Error::NonFinite`] if decimal rounding overflows to infinity.
    fn from_str(text: &str) -> Result<Self, Self::Err> {
        if !is_number_token(text) {
            return Err(Error::InvalidSyntax);
        }
        let value = text.parse::<f64>().map_err(|_| Error::InvalidSyntax)?;
        Self::try_from(value)
    }
}
impl fmt::Display for Number {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.canon())
    }
}

// For nonzero finite magnitude bits, test 2*v == (2*coefficient - 1)*10^exponent.
fn is_decimal_midpoint(bits: u64, coefficient: u64, exponent: i32) -> bool {
    let exponent_field = (bits >> 52) & 0x7ff;
    let mut significand = bits & ((1_u64 << 52) - 1);
    let mut shift = -1074;
    if exponent_field != 0 {
        significand |= 1_u64 << 52;
        shift = i32::try_from(exponent_field).expect("11-bit exponent fits i32") - 1075;
    }
    let twos = significand.trailing_zeros();
    significand >>= twos;
    shift += i32::try_from(twos).expect("at most 52 trailing zero bits");
    // Both significand and 2*coefficient - 1 are odd: their powers of two must agree.
    if shift + 1 != exponent {
        return false;
    }
    let midpoint = 2 * coefficient - 1; // The coefficient has at most 17 digits.
    let fives = 5_u64.checked_pow(exponent.unsigned_abs());
    // A product exceeding u64 cannot equal the bounded opposite side.
    if exponent >= 0 {
        fives.and_then(|power| midpoint.checked_mul(power)) == Some(significand)
    } else {
        fives.and_then(|power| significand.checked_mul(power)) == Some(midpoint)
    }
}

fn render_decimal(coefficient: u64, exponent: i32, sign: &str) -> String {
    let digits = coefficient.to_string();
    let position = i32::try_from(digits.len()).expect("at most 17 significant digits") + exponent;
    if (1..=21).contains(&position) {
        let point = usize::try_from(position).expect("positive decimal point");
        if point >= digits.len() {
            format!("{sign}{digits}{}", "0".repeat(point - digits.len()))
        } else {
            let (whole, fraction) = digits.split_at(point);
            format!("{sign}{whole}.{fraction}")
        }
    } else if (-5..=0).contains(&position) {
        let zeros = usize::try_from(-position).expect("nonnegative leading zero count");
        format!("{sign}0.{}{digits}", "0".repeat(zeros))
    } else {
        let exponent = position - 1;
        let (first, rest) = digits.split_at(1);
        if rest.is_empty() {
            format!("{sign}{first}e{exponent:+}")
        } else {
            format!("{sign}{first}.{rest}e{exponent:+}")
        }
    }
}

fn is_number_token(text: &str) -> bool {
    let mut bytes = text.bytes().peekable();
    bytes.next_if_eq(&b'-');
    match bytes.next() {
        Some(b'0') => {}
        Some(b'1'..=b'9') => while bytes.next_if(u8::is_ascii_digit).is_some() {},
        _ => return false,
    }
    if bytes.next_if_eq(&b'.').is_some() {
        if bytes.next_if(u8::is_ascii_digit).is_none() {
            return false;
        }
        while bytes.next_if(u8::is_ascii_digit).is_some() {}
    }
    if bytes.next_if(|byte| matches!(byte, b'e' | b'E')).is_some() {
        bytes.next_if(|byte| matches!(byte, b'+' | b'-'));
        if bytes.next_if(u8::is_ascii_digit).is_none() {
            return false;
        }
        while bytes.next_if(u8::is_ascii_digit).is_some() {}
    }
    bytes.next().is_none()
}
