import Loops
import Gen.Json
import Gen.Encode

/-!
# Occurred vectors

Each `occurred` text and the span it names, `start` and `end` written as UTC
instants (`end` is `null` for a span with no end yet), or the refusal. The
order vector lists spans oldest first.
-/

namespace Gen.OccurredVectors

open Loops

/-- Year, month and day of a day number (days from 1970-01-01). -/
def civil (z : Int) : Int × Nat × Nat :=
  let z := z + 719468
  let era := z / 146097
  let doe := z - era * 146097
  let yoe := (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
  let doy := doe - (365 * yoe + yoe / 4 - yoe / 100)
  let mp := (5 * doy + 2) / 153
  let d := doy - (153 * mp + 2) / 5 + 1
  let m := if mp < 10 then mp + 3 else mp - 9
  (yoe + era * 400 + (if m ≤ 2 then 1 else 0), m.toNat, d.toNat)

def pad (w n : Nat) : String :=
  let s := toString n
  String.ofList (List.replicate (w - s.length) '0') ++ s

/-- A moment in UTC, as RFC 3339 writes it. -/
def utc : Moment → Except String String
  | [] => throw "empty moment"
  | s :: frac => do
    let (y, mo, d) := civil (s / 86400)
    if y < 0 then throw s!"moment {s} is before year 0"
    let r := (s % 86400).toNat
    return s!"{pad 4 y.toNat}-{pad 2 mo}-{pad 2 d}T{pad 2 (r / 3600)}:{pad 2 (r / 60 % 60)}:{pad 2 (r % 60)}" ++
      (if frac.isEmpty then "" else "." ++ String.join (frac.map toString)) ++ "Z"

def jSpan (sp : Span) : Except String J := do
  let stop ← match sp.stop with
    | some e => pure (J.str (← utc e))
    | none => pure .null
  return .obj [("start", .str (← utc sp.start)), ("end", stop)]

def jOutcome (s : String) : Except String J :=
  match occurredSpan? s with
  | some sp => jSpan sp
  | none => pure (.obj [("refused", .str "occurred-not-span")])

structure Case where
  name : String
  laws : List String
  texts : List String
  /-- Whether every text must be a span (or every one refused). -/
  accepted : Bool := true

def cases : List Case := [
  { name := "01-dates", laws := ["occurred.span"],
    texts := ["2009", "2009-07", "2009-07-14", "2012-02", "2011-02", "1900-02", "2000-02", "0000",
      "9999"] },
  { name := "02-unspecified", laws := ["occurred.span"],
    texts := ["201X", "20XX", "2004-XX", "1985-04-XX", "1985-XX-XX", "99XX"] },
  { name := "03-qualifiers", laws := ["occurred.span", "occurred.qualifier"],
    texts := ["2009", "2009?", "2009~", "2009%", "2004-06-11?", "201X~"] },
  { name := "04-instants", laws := ["occurred.span", "occurred.instant"],
    texts := ["2026-10-17T09:14:03Z", "2026-10-17T04:14:03-05:00", "2026-10-17T23:30:00-01:00",
      "2026-10-17T09:14:03.250Z", "2026-10-17T09:14:03.25Z", "2026-10-17T09:14:03.000Z",
      "2016-12-31T23:59:60Z", "1969-12-31T23:59:59.5Z"] },
  { name := "05-intervals", laws := ["occurred.span", "occurred.qualifier"],
    texts := ["2009-07/2011-03", "2026-10-17T09:14:03Z/2026-10-17T09:18:13Z",
      "2026-10-17/2026-10-17T12:00:00Z", "2004-06~/2004-09?", "2009/2009",
      "2026-10-17T09:14:03Z/2026-10-17T09:14:03Z"] },
  { name := "06-open-end", laws := ["occurred.span"],
    texts := ["2019/..", "2026-10-17T09:14:03Z/..", "201X/.."] },
  { name := "07-refused", laws := ["occurred.refuse"], accepted := false,
    texts := [
      -- durations, and times without seconds or an offset
      "2026-10-17T09:14/PT4M", "2026-10-17T09:14:03Z/PT4M10S", "2026-10-17T09:14Z",
      "2026-10-17T09:14:03", "2026-10-17t09:14:03z",
      -- seasons, open and unknown starts, unknown ends
      "2001-21", "../1985", "/1985", "1985/", "..", "../..",
      -- years outside 0000 to 9999
      "Y170000002", "-1985", "20000",
      -- unspecified digits anywhere but at the end
      "201X-05", "1XXX", "1985-XX-12",
      -- not a calendar day, or not padded
      "2009-13", "2009-00", "2009-02-29", "2009-7",
      -- ends in the wrong order, a qualified instant, two qualifiers
      "2010/2009", "2026-10-17T09:14:04Z/2026-10-17T09:14:03Z", "2026-10-17T09:14:03Z~", "2009~?",
      ""] }
]

def caseVector (c : Case) : Except String J := do
  let outcomes ← c.texts.mapM jOutcome
  for t in c.texts do
    if (occurredSpan? t).isSome != c.accepted then
      throw s!"occurred/{c.name}: {t} {if c.accepted then "refused" else "accepted"}"
  return vector c.name "occurred" c.laws (.obj [("occurred", .arr (c.texts.map .str))])
    (.obj [("spans", .arr outcomes)])

/-- Every kind of span, out of order. -/
def orderTexts : List String := [
  "2026-10-17T09:14:03Z/..", "2009", "2026-10-17", "2026-10-17T09:14:03Z", "2009-01",
  "2026-10-17T09:14:03Z/2026-10-17T09:18:13Z", "2009/..", "1985-04-XX", "2026-10-17T09:14:03.5Z",
  "2026-10-16T23:00:00-05:00", "201X"]

def insert (x : String × Span) : List (String × Span) → List (String × Span)
  | [] => [x]
  | y :: ys => if x.2.Before y.2 then x :: y :: ys else y :: insert x ys

def orderVector : Except String J := do
  let spans ← orderTexts.mapM fun t => match occurredSpan? t with
    | some sp => pure (t, sp)
    | none => throw s!"occurred/order: {t} refused"
  let sorted := spans.foldr insert []
  for (a, b) in sorted.zip sorted.tail do
    if !a.2.Before b.2 then throw s!"occurred/order: {a.1} and {b.1} tie"
  return vector "08-order" "occurred" ["occurred.order"]
    (.obj [("occurred", .arr (orderTexts.map .str))])
    (.obj [("oldest-first", .arr (sorted.map (.str ·.1)))])

/-- The calendar and the renderer, checked against each other and known days. -/
def selfCheck : Except String Unit := do
  for s in ["1970-01-01T00:00:00Z", "2000-02-29T12:34:56.789Z", "0000-01-01T00:00:00Z",
      "9999-12-31T23:59:59Z", "1969-12-31T23:59:59.5Z", "1900-03-01T00:00:00Z", "2100-02-28T00:00:00Z"] do
    match instant? s.toList with
    | some m => if (← utc m) != s then throw s!"self-check failed: {s} renders as {← utc m}"
    | none => throw s!"self-check failed: {s} refused"
  for (y, m, d, n) in [(1970, 1, 1, 0), (2000, 3, 1, 11017), (1900, 1, 1, -25567), (0, 1, 1, -719528)] do
    if dayNumber y m d != n then throw s!"self-check failed: day {y}-{m}-{d} is {dayNumber y m d}, not {n}"

def vectors : Except String (List (String × J)) := do
  selfCheck
  let vs ← cases.mapM fun c => do pure (c.name, ← caseVector c)
  return vs ++ [("08-order", ← orderVector)]

end Gen.OccurredVectors
