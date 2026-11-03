import Loops
import Loops.Base32
import Loops.Envelope
import Loops.Read

/-!
# Read: inputs as text, back into the model's values

The vectors are written by the model; `lake exe run` reads one back. This
module parses JSON text and decodes the parts of an input the vectors carry
(records as `jRecord` writes them, envelopes as a writer hands them over,
sections, drafts) into the model's own values, so the answer is computed by
the model's functions, not rebuilt.

Two rules shape it:

* **The text parser keeps what JSON parsers may drop.** Members stay in the
  order written and a repeated name is kept, since a spec's refusal depends
  on both (`member-duplicate`, errors in written order). Numbers round to binary64.
  Safe-whole values become integers; other numbers retain their binary64 bits.
  The checker's exact-integer mode keeps lexical integers for output comparison;
  it is never used to decode inputs.
* **Decoding refuses, naming the field.** Inputs will come from people, so
  every refusal says where (`input.orders[0][1].prev[0]`) and what was
  wanted. A record is decoded as far as the model's `Record` needs: ids
  that are record ids and times that read. Layer 0's other envelope rules
  remain `write`'s, which a batch's drafts go through. The decoder checks typed `about` members.
-/

namespace Gen.Read

open Loops

/-! ## JSON text -/

/-- A parser over the text left to read. A failure carries how much text was
left, which places it in the original. -/
abbrev Parser := StateT (List Char) (Except (Nat × String))

def fail {α : Type} (what : String) : Parser α := do
  throw ((← get).length, what)

def peek : Parser (Option Char) := do pure (← get).head?

def skipWs : Parser Unit := modify (·.dropWhile fun c => c == ' ' || c == '\t' || c == '\n' || c == '\r')

def expectChar (c : Char) : Parser Unit := do
  match ← get with
  | d :: rest => if d == c then set rest else fail s!"expected '{c}'"
  | [] => fail s!"expected '{c}', found the end"

def word (w : String) (j : Json) : Parser Json := do
  let cs ← get
  if cs.take w.length == w.toList then set (cs.drop w.length); pure j
  else fail "expected a value"

def hexVal (c : Char) : Option Nat :=
  if c.isDigit then some (c.toNat - '0'.toNat)
  else if 'a' ≤ c && c ≤ 'f' then some (c.toNat - 'a'.toNat + 10)
  else if 'A' ≤ c && c ≤ 'F' then some (c.toNat - 'A'.toNat + 10)
  else none

/-- Four hex digits after `\u`. -/
def hex4 : Parser Nat := do
  let cs ← get
  match (cs.take 4).mapM hexVal with
  | some [a, b, c, d] => set (cs.drop 4); pure (((a * 16 + b) * 16 + c) * 16 + d)
  | _ => fail "expected four hex digits after \\u"

/-- A `\u` escape, joining a surrogate pair. A lone surrogate names no
character, so it is refused. -/
def unicodeEscape : Parser Char := do
  let hi ← hex4
  if 0xD800 ≤ hi && hi < 0xDC00 then
    expectChar '\\'; expectChar 'u'
    let lo ← hex4
    if 0xDC00 ≤ lo && lo < 0xE000 then pure (Char.ofNat (0x10000 + (hi - 0xD800) * 0x400 + (lo - 0xDC00)))
    else fail "a high surrogate not followed by a low one"
  else if 0xDC00 ≤ hi && hi < 0xE000 then fail "a low surrogate on its own"
  else pure (Char.ofNat hi)

partial def stringBody (acc : List Char) : Parser String := do
  match ← get with
  | [] => fail "an unterminated string"
  | '"' :: rest => set rest; pure (String.ofList acc.reverse)
  | '\\' :: e :: rest =>
    set rest
    let c ← match e with
      | '"' => pure '"'
      | '\\' => pure '\\'
      | '/' => pure '/'
      | 'b' => pure '\x08'
      | 'f' => pure '\x0c'
      | 'n' => pure '\n'
      | 'r' => pure '\r'
      | 't' => pure '\t'
      | 'u' => unicodeEscape
      | _ => fail s!"an unknown escape \\{e}"
    stringBody (c :: acc)
  | c :: rest =>
    if c.toNat < 0x20 then fail "a control character in a string; escape it"
    else set rest; stringBody (c :: acc)

def str : Parser String := do expectChar '"'; stringBody []

/-- Inputs round once to binary64; expected outputs may carry unbounded integers. -/
inductive NumericMode where
  | binary64
  | exactIntegers
  deriving BEq

/-- RFC 8259 numbers, with exact lexical integers only when explicitly requested.
Fraction and exponent spellings retain the ordinary binary64 behavior in both modes. -/
def number (mode : NumericMode := .binary64) : Parser Json := do
  let cs ← get
  let neg := cs.head? == some '-'
  let cs := if neg then cs.drop 1 else cs
  let ds := cs.takeWhile Char.isDigit
  if ds.isEmpty then fail "expected a value"
  if ds.length > 1 && ds.head? == some '0' then fail "a number with a leading zero"
  let mut rest := cs.drop ds.length
  let mut frac : List Char := []
  let hasFraction := rest.head? == some '.'
  if hasFraction then
    frac := (rest.drop 1).takeWhile Char.isDigit
    if frac.isEmpty then set rest; fail "expected digits after the decimal point"
    rest := rest.drop (frac.length + 1)
  let mut exp : Int := 0
  let hasExponent := rest.head? == some 'e' || rest.head? == some 'E'
  if hasExponent then
    rest := rest.drop 1
    let minus := rest.head? == some '-'
    if minus || rest.head? == some '+' then rest := rest.drop 1
    let digits := rest.takeWhile Char.isDigit
    if digits.isEmpty then set rest; fail "expected exponent digits"
    let e := digits.foldl (fun n c => 10 * n + (c.toNat - '0'.toNat)) 0
    exp := if minus then -(e : Int) else e
    rest := rest.drop digits.length
  set rest
  let m := (ds ++ frac).foldl (fun n c => 10 * n + (c.toNat - '0'.toNat)) 0
  if mode == .exactIntegers && !hasFraction && !hasExponent then
    return .int (if neg then -(m : Int) else m)
  let n := Number.ofScientific neg m (exp - frac.length)
  pure (match n.whole? with | some i => .int i | none => .number n)

mutual
partial def value (mode : NumericMode := .binary64) : Parser Json := do
  skipWs
  match ← peek with
  | some '{' => expectChar '{'; skipWs; members [] mode
  | some '[' => expectChar '['; skipWs; elements [] mode
  | some '"' => .str <$> str
  | some 't' => word "true" (.bool true)
  | some 'f' => word "false" (.bool false)
  | some 'n' => word "null" .null
  | some _ => number mode
  | none => fail "expected a value, found the end"

/-- Members in the order written; a repeated name is kept. -/
partial def members (acc : List (String × Json)) (mode : NumericMode := .binary64) : Parser Json := do
  if acc.isEmpty && (← peek) == some '}' then expectChar '}'; return .obj []
  skipWs
  let k ← str
  skipWs; expectChar ':'
  let v ← value mode
  skipWs
  match ← peek with
  | some ',' => expectChar ','; skipWs; members ((k, v) :: acc) mode
  | some '}' => expectChar '}'; pure (.obj ((k, v) :: acc).reverse)
  | _ => fail "expected ',' or '}'"

partial def elements (acc : List Json) (mode : NumericMode := .binary64) : Parser Json := do
  if acc.isEmpty && (← peek) == some ']' then expectChar ']'; return .arr []
  let v ← value mode
  skipWs
  match ← peek with
  | some ',' => expectChar ','; elements (v :: acc) mode
  | some ']' => expectChar ']'; pure (.arr (v :: acc).reverse)
  | _ => fail "expected ',' or ']'"
end

/-- The shared text parser; only numeric representation varies by mode. -/
def parseJsonWith (text : String) (mode : NumericMode := .binary64) : Except String Json :=
  let cs := text.toList
  match (do let v ← value mode; skipWs; if (← get).isEmpty then pure v else fail "text after the value").run cs with
  | .ok (v, _) => .ok v
  | .error (left, what) =>
    let before := cs.take (cs.length - left)
    let line := (before.filter (· == '\n')).length + 1
    let col := (before.reverse.takeWhile (· != '\n')).length + 1
    .error s!"line {line}, column {col}: {what}"

/-- Parse inputs as binary64 JSON, or say where the text stops being JSON. -/
def parseJson (text : String) : Except String Json := parseJsonWith text .binary64

/-- Preserve unbounded lexical integers in expected outputs, not input values. -/
def parseExactIntegers (text : String) : Except String Json := parseJsonWith text .exactIntegers

/-! ## Decoding, with the path of each field -/

abbrev Dec := @Loops.Read.Dec
abbrev bad := @Loops.Read.bad
abbrev idx := @Loops.Read.idx
abbrev dot := @Loops.Read.dot
abbrev object := @Loops.Read.object
abbrev members? := @Loops.Read.members?
abbrev req := @Loops.Read.req
abbrev text := @Loops.Read.text
abbrev int := @Loops.Read.int
abbrev list := @Loops.Read.list
abbrev each := @Loops.Read.each
abbrev texts := @Loops.Read.texts
abbrev opt := @Loops.Read.opt

/-! ## Ids and base32hex -/

abbrev unbase32 := Loops.Read.unbase32

/-- A record id: `r:` and the base32hex of a 32-byte digest, read as a number
the way `idText` writes one. -/
def recordId (path : String) (j : Json) : Dec RecordId := do
  let s ← text path j
  match s.toList with
  | 'r' :: ':' :: rest =>
    match unbase32 (String.ofList rest) with
    | .ok bs =>
      if h : bs.length = 32 then
        let n : RecordId := ⟨bs.foldl (fun n b => 256 * n + b.toNat) 0, bytes_bounded bs h⟩
        if idText n == s then pure n else bad path s!"\"{s}\" does not read back as itself"
      else bad path s!"\"{s}\" is not a 32-byte digest"
    | .error why => bad path s!"\"{s}\" {why}"
  | _ => bad path s!"\"{s}\" is not a record id (r:<base32hex digest>)"

abbrev bytes := Loops.Read.bytes

/-- The shared fixed-width textual boundary for salts, digests, keys and signatures. -/
def fixedBytes (path : String) (n : Nat) (pre : String) (j : Json) : Dec (List UInt8) := do
  let s ← text path j
  if s.toList.take pre.length != pre.toList then bad path s!"expected prefix {pre}"
  let bs ← bytes path (.str (String.ofList (s.toList.drop pre.length)))
  if bs.length == n then pure bs else bad path s!"expected {n} bytes"

/-! ## Records, as `jRecord` writes them -/

def stampOf (path : String) (j : Json) : Dec Stamp := do
  let s ← text path j
  match Stamp.of? s with
  | some st => pure st
  | none => bad path s!"\"{s}\" is not a canonical UTC instant"

def claimOf (path : String) (j : Json) : Dec Claim := do
  let s ← text path j
  match Claim.of? s with
  | some c => pure c
  | none => bad path s!"\"{s}\" is not a span in occurred's grammar"

def shownOf (path : String) (j : Json) : Dec Shown := do
  match ← text path j with
  | "here" => pure .here
  | "withheld" => pure .withheld
  | "erased" => pure .erased
  | s => bad path s!"\"{s}\" is not here, withheld or erased"

def valOf (path : String) : Json → Dec Val
  | .str s => pure (.str s)
  | .int i => pure (.int i)
  | .number n => if n.finite then pure (.number n) else bad path "number-out-of-range"
  | .bool b => pure (.bool b)
  | _ => bad path "a payload field is text, a number or a boolean"

def fieldsOf (path : String) (j : Json) : Dec (List (String × Val)) := do
  let kvs ← object path j
  kvs.mapM fun (k, v) => do
    if k == "value" || k == "n" then bad path s!"\"{k}\" is a payload field of its own, not one of fields"
    pure (k, ← valOf (dot path k) v)

def recordKeys : List String :=
  ["id", "kind", "observer", "about", "value", "prev", "under", "emitted", "occurred", "erases", "n",
    "fields", "shown"]

/-- A record as a reader holds it. A missing payload is written as `shown`
with no `value`, `n` or `fields`, and reads back as `Record.withhold` or
`Record.erase` leave it. -/
def record (path : String) (j : Json) : Dec Record := do
  let kvs ← members? path recordKeys j
  let idJ ← req path kvs "id"
  let id ← recordId (dot path "id") idJ
  let kind ← text (dot path "kind") (← req path kvs "kind")
  let observer ← text (dot path "observer") (← req path kvs "observer")
  let about ← each (dot path "about") (fun p j => do
    let s ← text p j
    if typedRef s then pure s else bad p "expected a typed reference") (← req path kvs "about")
  let prev ← each (dot path "prev") recordId (← req path kvs "prev")
  let under ← opt kvs "under" (recordId (dot path "under"))
  let emitted ← stampOf (dot path "emitted") (← req path kvs "emitted")
  let occurred ← opt kvs "occurred" (claimOf (dot path "occurred"))
  let erases ← (opt kvs "erases" (each (dot path "erases") recordId)).map (·.getD [])
  let shown ← (opt kvs "shown" (shownOf (dot path "shown"))).map (·.getD .here)
  let base : Record := { id, kind, observer, about, value := "", prev, under, occurred, emitted, erases, shown }
  match shown with
  | .here =>
    let value ← text (dot path "value") (← req path kvs "value")
    let nVal ← valOf (dot path "n") (← req path kvs "n")
    let (n, nNumber) ← match nVal with
      | .int i => pure (i, none)
      | .number x => pure (0, some x)
      | _ => bad (dot path "n") "expected a number"
    let fields ← (opt kvs "fields" (fieldsOf (dot path "fields"))).map (·.getD [])
    pure { base with value, n, nNumber, fields }
  | _ =>
    for k in ["value", "n", "fields"] do
      if (kvs.lookup k).isSome then bad path s!"its payload isn't here, so it carries no \"{k}\""
    pure base

def records (path : String) : Json → Dec (List Record) := each path record

/-! ## Sections and lines, for the lens -/

def line (path : String) (j : Json) : Dec Lens.Line := (·.toList) <$> text path j

def lines (path : String) : Json → Dec (List Lens.Line) := each path line

def sectionOf (path : String) (j : Json) : Dec Lens.Section := do
  let kvs ← members? path ["id", "body"] j
  pure ⟨← line (dot path "id") (← req path kvs "id"), ← lines (dot path "body") (← req path kvs "body")⟩

def sections (path : String) : Json → Dec (List Lens.Section) := each path sectionOf

/-! ## Raw envelopes and drafts use the library boundary. -/

abbrev env := Loops.Read.readOne
abbrev envs := Loops.Read.readMany
abbrev draft := Loops.Read.draft
abbrev drafts := Loops.Read.drafts

end Gen.Read
