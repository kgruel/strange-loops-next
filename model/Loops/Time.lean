/-!
# Time: instants

An instant is RFC 3339 with the writer's offset: `YYYY-MM-DDTHH:MM:SS`, an
optional fraction, then `Z` or `±HH:MM`. Upper-case `T` and `Z` only, so a
stamp has one spelling. `emitted` is an instant, and `occurred` may be one.

Instants compare as a `Moment`: whole seconds since 1970-01-01T00:00:00Z,
then the fraction's digits with trailing zeros dropped. Compared as lists,
moments order as the instants do, and an instant has one moment however its
fraction is written. Days are the proleptic Gregorian calendar's. A leap
second counts as the first second of the next minute, so `23:59:60Z` and the
next day's `00:00:00Z` are the same moment.
-/

namespace Loops

def digitsVal (cs : List Char) : Option Nat :=
  if cs.isEmpty || !cs.all Char.isDigit then none
  else some (cs.foldl (fun n c => 10 * n + (c.toNat - '0'.toNat)) 0)

def leap (y : Nat) : Bool := (y % 4 == 0 && y % 100 != 0) || y % 400 == 0

def daysIn (y m : Nat) : Nat :=
  match m with
  | 2 => if leap y then 29 else 28
  | 4 | 6 | 9 | 11 => 30
  | _ => 31

/-- Whole seconds since 1970-01-01T00:00:00Z, then the fraction's digits with
trailing zeros dropped. -/
abbrev Moment := List Int

/-- Leap years in `[0, y)`. Year 0 is one. -/
def leapsBefore (y : Nat) : Nat := (y + 3) / 4 - (y + 99) / 100 + (y + 399) / 400

/-- Days from 1970-01-01 to day `d` of month `m` of year `y`. -/
def dayNumber (y m d : Nat) : Int :=
  ((365 * y + leapsBefore y + ((List.range (m - 1)).map fun k => daysIn y (k + 1)).sum + (d - 1) : Nat)
    : Int) - 719528

def stripZeros (ds : List Int) : List Int := (ds.reverse.dropWhile (· == 0)).reverse

/-- `Z` or `±HH:MM`, as seconds to subtract to reach UTC. -/
def offsetSecs : List Char → Option Int
  | ['Z'] => some 0
  | [s, h1, h2, ':', m1, m2] =>
    match digitsVal [h1, h2], digitsVal [m1, m2] with
    | some h, some m =>
      if (s == '+' || s == '-') && h ≤ 23 && m ≤ 59 then
        some ((if s == '+' then 1 else -1) * ((3600 * h + 60 * m : Nat) : Int))
      else none
    | _, _ => none
  | _ => none

/-- What follows the seconds: an optional `.digits`, then the offset. -/
def tail : List Char → Option (List Int × Int)
  | '.' :: rest =>
    let frac := rest.takeWhile Char.isDigit
    if frac.isEmpty then none
    else (offsetSecs (rest.drop frac.length)).map
      fun o => (frac.map fun c => ((c.toNat - '0'.toNat : Nat) : Int), o)
  | rest => (offsetSecs rest).map fun o => ([], o)

def instant? (cs : List Char) : Option Moment :=
  match cs with
  | y1 :: y2 :: y3 :: y4 :: '-' :: mo1 :: mo2 :: '-' :: d1 :: d2 :: 'T' ::
      h1 :: h2 :: ':' :: mi1 :: mi2 :: ':' :: s1 :: s2 :: rest =>
    match digitsVal [y1, y2, y3, y4], digitsVal [mo1, mo2], digitsVal [d1, d2],
      digitsVal [h1, h2], digitsVal [mi1, mi2], digitsVal [s1, s2], tail rest with
    | some y, some mo, some d, some h, some mi, some s, some (frac, off) =>
      if 1 ≤ mo && mo ≤ 12 && 1 ≤ d && d ≤ daysIn y mo && h ≤ 23 && mi ≤ 59 && s ≤ 60 then
        some ((dayNumber y mo d * 86400 + ((3600 * h + 60 * mi + s : Nat) : Int) - off) ::
          stripZeros frac)
      else none
    | _, _, _, _, _, _, _ => none
  | _ => none

def validEmitted (s : String) : Bool := (instant? s.toList).isSome

end Loops
