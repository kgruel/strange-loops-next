/-!
# Json and canonical bytes

The JSON the model needs, and its canonical text per RFC 8785 (JCS):
members sorted by UTF-16 code units, minimal string escapes, no
whitespace. The model's numbers are integers; IEEE-754 formatting of other
numbers is tested against the RFC's own vectors in `vectors/standard/`.
-/

namespace Loops

inductive Json where
  | null
  | bool (b : Bool)
  | int (i : Int)
  | str (s : String)
  | arr (xs : List Json)
  | obj (kvs : List (String × Json))
  deriving Repr, Inhabited

/-! ## UTF-16 order -/

/-- A character's UTF-16 code units. -/
def utf16Char (c : Char) : List Nat :=
  if c.toNat < 0x10000 then [c.toNat]
  else [0xD800 + (c.toNat - 0x10000) / 0x400, 0xDC00 + (c.toNat - 0x10000) % 0x400]

def utf16 (s : String) : List Nat := s.toList.flatMap utf16Char

/-- Strict lexicographic order on code-unit sequences. -/
def lexLt : List Nat → List Nat → Bool
  | [], [] => false
  | [], _ :: _ => true
  | _ :: _, [] => false
  | a :: as, b :: bs => if a < b then true else if a = b then lexLt as bs else false

/-- Strings in UTF-16 code-unit order: JCS's member order and JavaScript's default sort. -/
def strLt (a b : String) : Bool := lexLt (utf16 a) (utf16 b)

/-- Insert into a list sorted by `lt` on `key`; equal keys keep the existing entry. -/
def insertBy {α : Type} (lt : List Nat → List Nat → Bool) (key : α → List Nat) (x : α) :
    List α → List α
  | [] => [x]
  | y :: ys =>
    if lt (key x) (key y) then x :: y :: ys
    else if key x = key y then y :: ys
    else y :: insertBy lt key x ys

def sortBy {α : Type} (key : α → List Nat) (xs : List α) : List α :=
  xs.foldl (fun acc x => insertBy lexLt key x acc) []

/-- A set of strings in canonical form: sorted by UTF-16 code units, no repeats. -/
def canonSet (xs : List String) : List String := sortBy utf16 xs

/-! ## Canonical text -/

def hexDigit (n : Nat) : Char := "0123456789abcdef".toList.getD n '0'

def escapeChar (c : Char) : String :=
  match c with
  | '"' => "\\\""
  | '\\' => "\\\\"
  | '\x08' => "\\b"
  | '\x0c' => "\\f"
  | '\n' => "\\n"
  | '\r' => "\\r"
  | '\t' => "\\t"
  | c =>
    if c.toNat < 0x20 then
      "\\u00" ++ (hexDigit (c.toNat / 16)).toString ++ (hexDigit (c.toNat % 16)).toString
    else c.toString

def quote (s : String) : String := "\"" ++ String.join (s.toList.map escapeChar) ++ "\""

mutual
def Json.canon : Json → String
  | .null => "null"
  | .bool b => if b then "true" else "false"
  | .int i => toString i
  | .str s => quote s
  | .arr xs => "[" ++ ",".intercalate (Json.canonAll xs) ++ "]"
  | .obj kvs =>
    "{" ++ ",".intercalate ((sortBy (fun kv => utf16 kv.1) (Json.canonMembers kvs)).map
      fun kv => quote kv.1 ++ ":" ++ kv.2) ++ "}"

def Json.canonAll : List Json → List String
  | [] => []
  | x :: xs => x.canon :: Json.canonAll xs

def Json.canonMembers : List (String × Json) → List (String × String)
  | [] => []
  | (k, v) :: kvs => (k, v.canon) :: Json.canonMembers kvs
end

mutual
/-- Object members must be distinct, at every depth. Distinct strings are
distinct UTF-16 sequences (`utf16_inj`), so this is also JCS's rule. -/
def Json.keysDistinct : Json → Bool
  | .arr xs => Json.allDistinct xs
  | .obj kvs => decide (kvs.map (·.1)).Nodup && Json.membersDistinct kvs
  | _ => true

def Json.allDistinct : List Json → Bool
  | [] => true
  | x :: xs => x.keysDistinct && Json.allDistinct xs

def Json.membersDistinct : List (String × Json) → Bool
  | [] => true
  | (_, v) :: kvs => v.keysDistinct && Json.membersDistinct kvs
end

/-! ## Numbers a record can carry exactly

RFC 8785 reads every number as an IEEE-754 double, which holds an integer
exactly only within ±(2^53 − 1). Past that, two different numbers share one
canonical form, so writers would disagree on a record's id. -/

def maxExact : Int := 2 ^ 53 - 1

mutual
/-- Every number in the value lies within ±(2^53 − 1). -/
def Json.inRange : Json → Bool
  | .int i => decide (-maxExact ≤ i) && decide (i ≤ maxExact)
  | .arr xs => Json.allInRange xs
  | .obj kvs => Json.membersInRange kvs
  | _ => true

def Json.allInRange : List Json → Bool
  | [] => true
  | x :: xs => x.inRange && Json.allInRange xs

def Json.membersInRange : List (String × Json) → Bool
  | [] => true
  | (_, v) :: kvs => v.inRange && Json.membersInRange kvs
end

end Loops
