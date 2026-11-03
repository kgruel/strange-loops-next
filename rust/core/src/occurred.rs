//! Claimed spans and text/read proofs from model/Loops/Occurred.lean.
use crate::time::{self, Moment};
use std::cmp::Ordering;

/// Lean: `Loops.Span`, model/Loops/Occurred.lean.
/// A span holds a start and an optional stop that cannot precede the start.
/// Spans compare by start, then stop, with an open stop last.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Span {
    start: Moment,
    stop: Option<Moment>,
}
impl Span {
    /// Lean: `Loops.Span.point`, model/Loops/Occurred.lean.
    /// Creates a span with equal start and stop moments.
    pub fn point(moment: Moment) -> Self {
        Self {
            start: moment.clone(),
            stop: Some(moment),
        }
    }
    /// Lean: `Loops.Span.closed?`, model/Loops/Occurred.lean.
    /// Creates a closed span, or returns `None` when the stop precedes the start.
    pub fn closed(start: Moment, stop: Moment) -> Option<Self> {
        (start <= stop).then_some(Self {
            start,
            stop: Some(stop),
        })
    }
    /// Lean: `Loops.openFrom`, model/Loops/Occurred.lean.
    /// Creates a span with no stop from a parsed start moment.
    pub fn open(start: Moment) -> Self {
        Self { start, stop: None }
    }
    /// Lean: `Loops.Span.start`, model/Loops/Occurred.lean.
    /// Returns the first moment that the span covers.
    pub fn start(&self) -> &Moment {
        &self.start
    }
    /// Lean: `Loops.Span.stop`, model/Loops/Occurred.lean.
    /// Returns the end moment, or no value for an open span.
    pub fn stop(&self) -> Option<&Moment> {
        self.stop.as_ref()
    }
}
impl Ord for Span {
    fn cmp(&self, other: &Self) -> Ordering {
        self.start
            .cmp(&other.start)
            .then_with(|| match (&self.stop, &other.stop) {
                (Some(a), Some(b)) => a.cmp(b),
                (Some(_), None) => Ordering::Less,
                (None, Some(_)) => Ordering::Greater,
                (None, None) => Ordering::Equal,
            })
    }
}
impl PartialOrd for Span {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
// dateDays?, model/Loops/Occurred.lean; grammar-bounded year/month/day arithmetic.
fn date_days(cs: &[u8]) -> Option<(i64, i64)> {
    use time::{day_number, days_in, digits};
    match cs {
        [y1, y2, b'X', b'X'] => {
            let year = 100 * digits(&[*y1, *y2])?;
            Some((day_number(year, 1, 1), day_number(year + 100, 1, 1)))
        }
        [y1, y2, y3, b'X'] => {
            let year = 10 * digits(&[*y1, *y2, *y3])?;
            Some((day_number(year, 1, 1), day_number(year + 10, 1, 1)))
        }
        [y1, y2, y3, y4]
        | [y1, y2, y3, y4, b'-', b'X', b'X']
        | [y1, y2, y3, y4, b'-', b'X', b'X', b'-', b'X', b'X'] => {
            let year = digits(&[*y1, *y2, *y3, *y4])?;
            Some((day_number(year, 1, 1), day_number(year + 1, 1, 1)))
        }
        [y1, y2, y3, y4, b'-', m1, m2] | [y1, y2, y3, y4, b'-', m1, m2, b'-', b'X', b'X'] => {
            let year = digits(&[*y1, *y2, *y3, *y4])?;
            let month = digits(&[*m1, *m2])?;
            if !(1..=12).contains(&month) {
                return None;
            }
            let start = day_number(year, month, 1);
            Some((start, start + i64::from(days_in(year, month))))
        }
        [y1, y2, y3, y4, b'-', m1, m2, b'-', d1, d2] => {
            let year = digits(&[*y1, *y2, *y3, *y4])?;
            let month = digits(&[*m1, *m2])?;
            let day = digits(&[*d1, *d2])?;
            if !(1..=12).contains(&month) || day == 0 || day > days_in(year, month) {
                return None;
            }
            let start = day_number(year, month, day);
            Some((start, start + 1))
        }
        _ => None,
    }
}
// point?/date?, model/Loops/Occurred.lean; qualifiers only apply to dates.
fn point(s: &str) -> Option<(Moment, Moment)> {
    let cs = s.as_bytes();
    if matches!(cs.last(), Some(b'?' | b'~' | b'%')) {
        let (a, b) = date_days(&cs[..cs.len() - 1])?;
        Some((Moment::day(a), Moment::day(b)))
    } else if s.contains('T') {
        time::instant(s).map(|m| (m.clone(), m))
    } else {
        date_days(cs).map(|(a, b)| (Moment::day(a), Moment::day(b)))
    }
}
/// Lean: `Loops.occurredSpan?`, model/Loops/Occurred.lean.
/// Parses a single claim, an open interval, or a closed interval.
/// A closed interval's left start cannot follow its right start.
pub fn occurred_span(text: &str) -> Option<Span> {
    match text.split_once('/') {
        None => {
            let (start, right_start) = point(text)?;
            Span::closed(start, right_start)
        }
        Some((left, "..")) => point(left).map(|(start, _)| Span::open(start)),
        Some((left, right)) => {
            if right.contains('/') {
                return None;
            }
            let (start, _) = point(left)?;
            let (right_start, end) = point(right)?;
            if start <= right_start {
                Span::closed(start, end)
            } else {
                None
            }
        }
    }
}
/// Lean: `Loops.Stamp`, model/Loops/Occurred.lean.
/// A stamp keeps the written emission time and its matching parsed instant.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stamp {
    text: String,
    moment: Moment,
}
impl Stamp {
    /// Lean: `Loops.Stamp.of?`, model/Loops/Occurred.lean.
    /// Parses emission text, or returns `None` when the instant grammar refuses it.
    pub fn of(s: &str) -> Option<Self> {
        time::instant(s).map(|moment| Self {
            text: s.into(),
            moment,
        })
    }
    /// Lean: `Loops.Stamp.text`, model/Loops/Occurred.lean.
    /// Returns the observer's original spelling of the emission time.
    pub fn text(&self) -> &str {
        &self.text
    }
    /// Lean: `Loops.Stamp.moment`, model/Loops/Occurred.lean.
    /// Returns the parsed instant.
    pub fn moment(&self) -> &Moment {
        &self.moment
    }
}
impl Default for Stamp {
    fn default() -> Self {
        Self {
            text: "1970-01-01T00:00:00Z".into(),
            moment: Moment::day(0),
        }
    }
}
/// Lean: `Loops.Claim`, model/Loops/Occurred.lean.
/// A claim keeps the written occurred time and its matching parsed span.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Claim {
    text: String,
    span: Span,
}
impl Claim {
    /// Lean: `Loops.Claim.of?`, model/Loops/Occurred.lean.
    /// Parses claim text, or returns `None` when the occurred grammar refuses it.
    pub fn of(s: &str) -> Option<Self> {
        occurred_span(s).map(|span| Self {
            text: s.into(),
            span,
        })
    }
    /// Lean: `Loops.Claim.text`, model/Loops/Occurred.lean.
    /// Returns the original claim text, including qualifiers and uncertainty.
    pub fn text(&self) -> &str {
        &self.text
    }
    /// Lean: `Loops.Claim.span`, model/Loops/Occurred.lean.
    /// Returns the parsed span without changing the claim's text.
    pub fn span(&self) -> &Span {
        &self.span
    }
}
