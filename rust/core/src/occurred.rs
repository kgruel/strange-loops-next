//! Claimed spans and text/read proofs from model/Loops/Occurred.lean.
use crate::time::{self, Moment};
use std::cmp::Ordering;

/// Span (model/Loops/Occurred.lean): closed stop cannot precede start; open sorts last.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Span {
    start: Moment,
    stop: Option<Moment>,
}
impl Span {
    /// Span.point (model/Loops/Occurred.lean).
    pub fn point(moment: Moment) -> Self {
        Self {
            start: moment.clone(),
            stop: Some(moment),
        }
    }
    /// Span.closed? (model/Loops/Occurred.lean); none if stop precedes start.
    pub fn closed(start: Moment, stop: Moment) -> Option<Self> {
        (start <= stop).then_some(Self {
            start,
            stop: Some(stop),
        })
    }
    /// openFrom's result construction (model/Loops/Occurred.lean), with a parsed start.
    pub fn open(start: Moment) -> Self {
        Self { start, stop: None }
    }
    /// Span.start (model/Loops/Occurred.lean).
    pub fn start(&self) -> &Moment {
        &self.start
    }
    /// Span.stop (model/Loops/Occurred.lean).
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
/// occurredSpan? (model/Loops/Occurred.lean), including single/openFrom/between semantics.
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
/// Stamp (model/Loops/Occurred.lean): immutable text and its matching instant? result.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Stamp {
    text: String,
    moment: Moment,
}
impl Stamp {
    /// Stamp.of? (model/Loops/Occurred.lean); none when instant? refuses.
    pub fn of(s: &str) -> Option<Self> {
        time::instant(s).map(|moment| Self {
            text: s.into(),
            moment,
        })
    }
    /// Stamp.text (model/Loops/Occurred.lean), preserving the observer's spelling.
    pub fn text(&self) -> &str {
        &self.text
    }
    /// Stamp.moment (model/Loops/Occurred.lean), invariant under equivalent time spellings.
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
/// Claim (model/Loops/Occurred.lean): immutable text and its matching occurredSpan? result.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Claim {
    text: String,
    span: Span,
}
impl Claim {
    /// Claim.of? (model/Loops/Occurred.lean); none when occurredSpan? refuses.
    pub fn of(s: &str) -> Option<Self> {
        occurred_span(s).map(|span| Self {
            text: s.into(),
            span,
        })
    }
    /// Claim.text (model/Loops/Occurred.lean), including qualifiers and uncertainty.
    pub fn text(&self) -> &str {
        &self.text
    }
    /// Claim.span (model/Loops/Occurred.lean).
    pub fn span(&self) -> &Span {
        &self.span
    }
}
