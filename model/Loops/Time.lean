/-!
# Time: the shape of `emitted`

`emitted` is RFC 3339 with the writer's offset: `YYYY-MM-DDTHH:MM:SS`, an
optional fraction, then `Z` or `±HH:MM`. Upper-case `T` and `Z` only, so a
stamp has one spelling. Ordering by instant arrives with content order.
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

def inRange (lo hi : Nat) : Option Nat → Bool
  | some n => lo ≤ n && n ≤ hi
  | none => false

def validOffset : List Char → Bool
  | ['Z'] => true
  | [s, h1, h2, ':', m1, m2] =>
    (s == '+' || s == '-') && inRange 0 23 (digitsVal [h1, h2]) && inRange 0 59 (digitsVal [m1, m2])
  | _ => false

/-- The time and zone after the seconds: an optional `.digits`, then the offset. -/
def validTail : List Char → Bool
  | '.' :: rest =>
    let frac := rest.takeWhile Char.isDigit
    !frac.isEmpty && validOffset (rest.drop frac.length)
  | rest => validOffset rest

def validEmitted (s : String) : Bool :=
  match s.toList with
  | y1 :: y2 :: y3 :: y4 :: '-' :: mo1 :: mo2 :: '-' :: d1 :: d2 :: 'T' ::
      h1 :: h2 :: ':' :: mi1 :: mi2 :: ':' :: s1 :: s2 :: rest =>
    match digitsVal [y1, y2, y3, y4], digitsVal [mo1, mo2], digitsVal [d1, d2] with
    | some y, some mo, some d =>
      1 ≤ mo && mo ≤ 12 && 1 ≤ d && d ≤ daysIn y mo &&
      inRange 0 23 (digitsVal [h1, h2]) && inRange 0 59 (digitsVal [mi1, mi2]) &&
      inRange 0 60 (digitsVal [s1, s2]) && validTail rest
    | _, _, _ => false
  | _ => false

end Loops
