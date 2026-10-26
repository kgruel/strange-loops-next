import Loops.Time

/-!
# Occurred: the claimed span

`occurred` is a span of time, written as one of:

* a calendar date, `YYYY`, `YYYY-MM` or `YYYY-MM-DD`: the whole year, month
  or day, in UTC;
* a date with its last digits unspecified, as EDTF Level 1 allows: `201X`,
  `20XX`, `2004-XX`, `1985-04-XX` or `1985-XX-XX`;
* either of those followed by one qualifier: `?` uncertain, `~`
  approximate, `%` both. The qualifier is the observer's claim and stays in
  the text; it never changes the span;
* an instant, written as `emitted` is: a span of no length;
* `a/b`, two of those, `b` starting no earlier than `a`: from the start of
  `a` to the end of `b`;
* `a/..`: from the start of `a`, with no end yet.

A span runs from `start` to `stop`, and `stop` is never before `start`.
Spans order by start, then stop; a span with no end comes after any span
with the same start. Nothing else is a span: no durations, seasons, open or
unknown starts, unknown ends, or years past 9999.
-/

namespace Loops

structure Span where
  start : Moment
  stop  : Option Moment
  ok    : ∀ e, stop = some e → start ≤ e

/-- Stops in order: an open end comes after every closed one. -/
def StopBefore : Option Moment → Option Moment → Prop
  | some a, some b => a < b
  | some _, none => True
  | none, _ => False

instance (a b : Option Moment) : Decidable (StopBefore a b) := by
  cases a <;> cases b <;> unfold StopBefore <;> infer_instance

/-- Span order, oldest first: by start, then stop. -/
def Span.Before (a b : Span) : Prop :=
  a.start < b.start ∨ (a.start = b.start ∧ StopBefore a.stop b.stop)

instance (a b : Span) : Decidable (Span.Before a b) := by
  unfold Span.Before; infer_instance

def isQualifier (c : Char) : Bool := c == '?' || c == '~' || c == '%'

/-- A calendar date's first day and the day after its last, as day numbers. -/
def dateDays? : List Char → Option (Int × Int)
  | [y1, y2, 'X', 'X'] => (digitsVal [y1, y2]).map fun y => (dayNumber (100 * y) 1 1, dayNumber (100 * y + 100) 1 1)
  | [y1, y2, y3, 'X'] => (digitsVal [y1, y2, y3]).map fun y => (dayNumber (10 * y) 1 1, dayNumber (10 * y + 10) 1 1)
  | [y1, y2, y3, y4] => (digitsVal [y1, y2, y3, y4]).map fun y => (dayNumber y 1 1, dayNumber (y + 1) 1 1)
  | [y1, y2, y3, y4, '-', 'X', 'X'] | [y1, y2, y3, y4, '-', 'X', 'X', '-', 'X', 'X'] =>
    (digitsVal [y1, y2, y3, y4]).map fun y => (dayNumber y 1 1, dayNumber (y + 1) 1 1)
  | [y1, y2, y3, y4, '-', m1, m2] | [y1, y2, y3, y4, '-', m1, m2, '-', 'X', 'X'] =>
    match digitsVal [y1, y2, y3, y4], digitsVal [m1, m2] with
    | some y, some m =>
      if 1 ≤ m && m ≤ 12 then some (dayNumber y m 1, dayNumber y m 1 + daysIn y m) else none
    | _, _ => none
  | [y1, y2, y3, y4, '-', m1, m2, '-', d1, d2] =>
    match digitsVal [y1, y2, y3, y4], digitsVal [m1, m2], digitsVal [d1, d2] with
    | some y, some m, some d =>
      if 1 ≤ m && m ≤ 12 && 1 ≤ d && d ≤ daysIn y m then some (dayNumber y m d, dayNumber y m d + 1)
      else none
    | _, _, _ => none
  | _ => none

def date? (cs : List Char) : Option (Moment × Moment) :=
  (dateDays? cs).map fun (a, b) => ([a * 86400], [b * 86400])

/-- One end of a span: its first moment and the moment it ends. A trailing
qualifier is set aside and the date read without it. -/
def point? (cs : List Char) : Option (Moment × Moment) :=
  match cs.getLast? with
  | none => none
  | some c =>
    if isQualifier c then date? cs.dropLast
    else if cs.contains 'T' then (instant? cs).map fun t => (t, t)
    else date? cs

def Span.closed? (a b : Moment) : Option Span :=
  if h : a ≤ b then some ⟨a, some b, fun e he => by cases he; exact h⟩ else none

/-- The text before the first `/`, and the text after it if there is one. -/
def halves (cs : List Char) : List Char × Option (List Char) :=
  match cs.dropWhile (· != '/') with
  | [] => (cs.takeWhile (· != '/'), none)
  | _ :: b => (cs.takeWhile (· != '/'), some b)

/-- A point alone: its own span. -/
def single (p : List Char) : Option Span := (point? p).bind fun (a, b) => Span.closed? a b

/-- A point and `..`: from its start, with no end. -/
def openFrom (p : List Char) : Option Span :=
  (point? p).map fun (a, _) => ⟨a, none, fun _ h => by cases h⟩

/-- Two points, the second starting no earlier: from the first's start to the second's end. -/
def between (p q : List Char) : Option Span :=
  match point? p, point? q with
  | some (a, _), some (b, e) => if a ≤ b then Span.closed? a e else none
  | _, _ => none

def spanOf (p : List Char) : Option (List Char) → Option Span
  | none => single p
  | some q => if q = ['.', '.'] then openFrom p else if q.contains '/' then none else between p q

def occurredSpanOf (cs : List Char) : Option Span := spanOf (halves cs).1 (halves cs).2

def occurredSpan? (s : String) : Option Span := occurredSpanOf s.toList

end Loops
