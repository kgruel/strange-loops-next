//! RFC3339 instants from model/Loops/Time.lean.

/// Lean: `Loops.Moment`, model/Loops/Time.lean.
/// A parsed moment holds UTC seconds and exact decimal fraction digits.
/// Four-digit years keep seconds within `i64`.
/// Fractions have at most nine digits and no trailing zero.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Moment {
    seconds: i64,
    fraction: Vec<u8>,
}
impl Moment {
    /// Lean: `Loops.Moment`, model/Loops/Time.lean.
    /// Returns UTC seconds since the Unix epoch.
    pub fn seconds(&self) -> i64 {
        self.seconds
    }
    /// Lean: `Loops.Moment` and `Loops.stripZeros`, model/Loops/Time.lean.
    /// Returns decimal fraction digits without trailing zeros.
    pub fn fraction(&self) -> &[u8] {
        &self.fraction
    }
    // Internal date? boundary, model/Loops/Occurred.lean.
    pub(crate) fn day(day: i64) -> Self {
        Self {
            seconds: day * 86400,
            fraction: Vec::new(),
        }
    }
}
// digitsVal restricted to grammar-sized fields in instant?/dateDays?.
pub(crate) fn digits(cs: &[u8]) -> Option<u32> {
    if cs.is_empty() {
        return None;
    }
    cs.iter().try_fold(0_u32, |n, c| {
        if !c.is_ascii_digit() {
            return None;
        }
        n.checked_mul(10)?.checked_add(u32::from(c - b'0'))
    })
}
// leap/daysIn, model/Loops/Time.lean. Only parser-produced years/months enter here.
pub(crate) fn days_in(y: u32, m: u32) -> u32 {
    match m {
        2 => {
            if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 {
                29
            } else {
                28
            }
        }
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}
// dayNumber/leapsBefore, model/Loops/Time.lean; internal grammar bound y<=10000.
pub(crate) fn day_number(y: u32, m: u32, d: u32) -> i64 {
    i64::from(
        365 * y + y.div_ceil(4) - y.div_ceil(100)
            + y.div_ceil(400)
            + (1..m).map(|m| days_in(y, m)).sum::<u32>()
            + d
            - 1,
    ) - 719_528
}
/// Lean: `Loops.instant?`, model/Loops/Time.lean.
/// Parses a canonical UTC instant with at most nine fraction digits.
pub fn instant(text: &str) -> Option<Moment> {
    let cs = text.as_bytes();
    if cs.len() < 20
        || cs[4] != b'-'
        || cs[7] != b'-'
        || cs[10] != b'T'
        || cs[13] != b':'
        || cs[16] != b':'
    {
        return None;
    }
    let year = digits(&cs[..4])?;
    let month = digits(&cs[5..7])?;
    let day = digits(&cs[8..10])?;
    let hour = digits(&cs[11..13])?;
    let minute = digits(&cs[14..16])?;
    let second = digits(&cs[17..19])?;
    if !(1..=12).contains(&month)
        || day == 0
        || day > days_in(year, month)
        || hour > 23
        || minute > 59
        || second > 59
    {
        return None;
    }
    let tail = &cs[19..];
    let fraction = if tail == b"Z" {
        Vec::new()
    } else {
        let digits = tail.strip_prefix(b".")?.strip_suffix(b"Z")?;
        if digits.is_empty()
            || digits.len() > 9
            || digits.last() == Some(&b'0')
            || !digits.iter().all(u8::is_ascii_digit)
        {
            return None;
        }
        digits.iter().map(|c| c - b'0').collect()
    };
    Some(Moment {
        seconds: day_number(year, month, day) * 86400
            + i64::from(3600 * hour + 60 * minute + second),
        fraction,
    })
}
/// Lean: `Loops.validEmitted`, model/Loops/Time.lean.
/// Checks whether the text names a canonical UTC instant.
pub fn valid_emitted(s: &str) -> bool {
    instant(s).is_some()
}
