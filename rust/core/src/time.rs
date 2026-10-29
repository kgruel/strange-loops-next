//! RFC3339 instants from model/Loops/Time.lean.

/// Moment (model/Loops/Time.lean), restricted to parser-produced canonical moments.
/// Four-digit years and bounded offsets prove seconds fit i64; fractions have no precision cap.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Moment {
    seconds: i64,
    fraction: Vec<u8>,
}
impl Moment {
    /// Head of Moment (model/Loops/Time.lean): UTC seconds since the Unix epoch.
    pub fn seconds(&self) -> i64 {
        self.seconds
    }
    /// Tail of Moment/stripZeros (model/Loops/Time.lean): digits, trailing zeros removed.
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
// offsetSecs, model/Loops/Time.lean.
fn offset(cs: &[u8]) -> Option<i64> {
    match cs {
        b"Z" => Some(0),
        [s, h1, h2, b':', m1, m2] => {
            let h = digits(&[*h1, *h2])?;
            let m = digits(&[*m1, *m2])?;
            if !matches!(s, b'+' | b'-') || h > 23 || m > 59 {
                return None;
            }
            Some((if *s == b'+' { 1 } else { -1 }) * i64::from(3600 * h + 60 * m))
        }
        _ => None,
    }
}
/// instant? (model/Loops/Time.lean); uppercase T/Z, arbitrary decimal precision, leap second 60.
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
        || second > 60
    {
        return None;
    }
    let tail = &cs[19..];
    let (mut fraction, off) = if tail.first() == Some(&b'.') {
        let count = tail[1..].iter().take_while(|c| c.is_ascii_digit()).count();
        if count == 0 {
            return None;
        }
        (
            tail[1..=count].iter().map(|c| c - b'0').collect::<Vec<_>>(),
            offset(&tail[count + 1..])?,
        )
    } else {
        (Vec::new(), offset(tail)?)
    };
    while fraction.last() == Some(&0) {
        fraction.pop();
    }
    Some(Moment {
        seconds: day_number(year, month, day) * 86400
            + i64::from(3600 * hour + 60 * minute + second)
            - off,
        fraction,
    })
}
/// validEmitted (model/Loops/Time.lean).
pub fn valid_emitted(s: &str) -> bool {
    instant(s).is_some()
}
