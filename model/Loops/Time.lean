/-!
# Time: instants

An instant is `YYYY-MM-DDTHH:MM:SS`, an optional fraction, then `Z`.
Only upper-case `T` and `Z` are accepted. Seconds range from 00 to 59.
A fraction has 1 to 9 digits and ends in a nonzero digit.

Instants compare as a `Moment`: whole seconds since 1970-01-01T00:00:00Z,
then the fraction's digits. Days use the proleptic Gregorian calendar.
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

/-- Whole seconds since 1970-01-01T00:00:00Z, then the canonical fraction's digits. -/
abbrev Moment := List Int

/-- Leap years in `[0, y)`. Year 0 is one. -/
def leapsBefore (y : Nat) : Nat := (y + 3) / 4 - (y + 99) / 100 + (y + 399) / 400

/-- Days from 1970-01-01 to day `d` of month `m` of year `y`. -/
def dayNumber (y m d : Nat) : Int :=
  ((365 * y + leapsBefore y + ((List.range (m - 1)).map fun k => daysIn y (k + 1)).sum + (d - 1) : Nat)
    : Int) - 719528

def stripZeros (ds : List Int) : List Int := (ds.reverse.dropWhile (· == 0)).reverse

/-- What follows the seconds: canonical fraction digits, with the UTC marker checked inline. -/
def tail : List Char → Option (List Int)
  | '.' :: rest =>
    let frac := rest.takeWhile Char.isDigit
    if frac.isEmpty || frac.length > 9 || frac.getLast? == some '0' then none
    else match rest.drop frac.length with
      | ['Z'] => some (frac.map fun c => ((c.toNat - '0'.toNat : Nat) : Int))
      | _ => none
  | ['Z'] => some []
  | _ => none

/-- Numeric fields of a parsed UTC instant. -/
structure Instant where
  year : Nat
  month : Nat
  day : Nat
  hour : Nat
  minute : Nat
  second : Nat
  fraction : List Int
  deriving DecidableEq, Repr

def Instant.moment (t : Instant) : Moment :=
  (dayNumber t.year t.month t.day * 86400 +
    ((3600 * t.hour + 60 * t.minute + t.second : Nat) : Int)) :: t.fraction

/-- Fixed-width decimal digits, including leading zeros. -/
def decimalChars : Nat → Nat → List Char
  | 0, _ => []
  | k + 1, n => Char.ofNat (48 + n / 10 ^ k) :: decimalChars k (n % 10 ^ k)

def Instant.text (t : Instant) : String := String.ofList (
  decimalChars 4 t.year ++ ['-'] ++ decimalChars 2 t.month ++ ['-'] ++ decimalChars 2 t.day ++
  ['T'] ++ decimalChars 2 t.hour ++ [':'] ++ decimalChars 2 t.minute ++ [':'] ++ decimalChars 2 t.second ++
  (if t.fraction.isEmpty then [] else '.' :: t.fraction.map (fun d => Char.ofNat (48 + d.toNat))) ++ ['Z'])

def instantParts? (cs : List Char) : Option Instant :=
  match cs with
  | y1 :: y2 :: y3 :: y4 :: '-' :: mo1 :: mo2 :: '-' :: d1 :: d2 :: 'T' ::
      h1 :: h2 :: ':' :: mi1 :: mi2 :: ':' :: s1 :: s2 :: rest =>
    match digitsVal [y1, y2, y3, y4], digitsVal [mo1, mo2], digitsVal [d1, d2],
      digitsVal [h1, h2], digitsVal [mi1, mi2], digitsVal [s1, s2], tail rest with
    | some y, some mo, some d, some h, some mi, some s, some frac =>
      if 1 ≤ mo && mo ≤ 12 && 1 ≤ d && d ≤ daysIn y mo && h ≤ 23 && mi ≤ 59 && s ≤ 59 then
        some ⟨y, mo, d, h, mi, s, frac⟩
      else none
    | _, _, _, _, _, _, _ => none
  | _ => none

def instant? (cs : List Char) : Option Moment := (instantParts? cs).map Instant.moment

def validEmitted (s : String) : Bool := (instant? s.toList).isSome

end Loops
