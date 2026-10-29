import Loops

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
  on both (`member-duplicate`, errors in written order). Numbers are
  integers, as the model's are; a fraction or an exponent is refused rather
  than rounded.
* **Decoding refuses, naming the field.** Inputs will come from people, so
  every refusal says where (`input.orders[0][1].prev[0]`) and what was
  wanted. A record is decoded as far as the model's `Record` needs: ids
  that are record ids and times that read. Layer 0's other envelope rules
  (a kind, typed references) are `write`'s, which a batch's drafts go
  through; the folds read records as they are handed them.
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

/-- An integer, as JSON writes one: no leading zeros, no `+`. -/
def number : Parser Json := do
  let cs ← get
  let neg := cs.head? == some '-'
  let cs := if neg then cs.drop 1 else cs
  let ds := cs.takeWhile Char.isDigit
  if ds.isEmpty then fail "expected a value"
  else if ds.length > 1 && ds.head? == some '0' then fail "a number with a leading zero"
  else
    let rest := cs.drop ds.length
    if rest.head?.any fun c => c == '.' || c == 'e' || c == 'E' then
      set rest; fail "a fraction or exponent: the model's numbers are integers"
    else
      set rest
      let n : Nat := ds.foldl (fun n c => 10 * n + (c.toNat - '0'.toNat)) 0
      pure (.int (if neg then -(n : Int) else n))

mutual
partial def value : Parser Json := do
  skipWs
  match ← peek with
  | some '{' => expectChar '{'; skipWs; members []
  | some '[' => expectChar '['; skipWs; elements []
  | some '"' => .str <$> str
  | some 't' => word "true" (.bool true)
  | some 'f' => word "false" (.bool false)
  | some 'n' => word "null" .null
  | some _ => number
  | none => fail "expected a value, found the end"

/-- Members in the order written; a repeated name is kept. -/
partial def members (acc : List (String × Json)) : Parser Json := do
  if acc.isEmpty && (← peek) == some '}' then expectChar '}'; return .obj []
  skipWs
  let k ← str
  skipWs; expectChar ':'
  let v ← value
  skipWs
  match ← peek with
  | some ',' => expectChar ','; skipWs; members ((k, v) :: acc)
  | some '}' => expectChar '}'; pure (.obj ((k, v) :: acc).reverse)
  | _ => fail "expected ',' or '}'"

partial def elements (acc : List Json) : Parser Json := do
  if acc.isEmpty && (← peek) == some ']' then expectChar ']'; return .arr []
  let v ← value
  skipWs
  match ← peek with
  | some ',' => expectChar ','; elements (v :: acc)
  | some ']' => expectChar ']'; pure (.arr (v :: acc).reverse)
  | _ => fail "expected ',' or ']'"
end

/-- Parse JSON text, or say where it stops being JSON. -/
def parseJson (text : String) : Except String Json :=
  let cs := text.toList
  match (do let v ← value; skipWs; if (← get).isEmpty then pure v else fail "text after the value").run cs with
  | .ok (v, _) => .ok v
  | .error (left, what) =>
    let before := cs.take (cs.length - left)
    let line := (before.filter (· == '\n')).length + 1
    let col := (before.reverse.takeWhile (· != '\n')).length + 1
    .error s!"line {line}, column {col}: {what}"

/-! ## Decoding, with the path of each field -/

abbrev Dec := Except String

def bad {α : Type} (path what : String) : Dec α := throw s!"{path}: {what}"

def idx (path : String) (i : Nat) : String := s!"{path}[{i}]"
def dot (path k : String) : String := s!"{path}.{k}"

/-- An object's members, each name once. -/
def object (path : String) : Json → Dec (List (String × Json))
  | .obj kvs => do
    let names := kvs.map (·.1)
    for (k, i) in names.zip (List.range names.length) do
      if (names.take i).contains k then bad path s!"repeats the member \"{k}\""
    pure kvs
  | _ => bad path "expected an object"

/-- An object's members, each name once and each one `allowed`. -/
def members? (path : String) (allowed : List String) (j : Json) : Dec (List (String × Json)) := do
  let kvs ← object path j
  for (k, _) in kvs do
    if !allowed.contains k then bad path s!"has a member \"{k}\" this input doesn't take"
  pure kvs

def req (path : String) (kvs : List (String × Json)) (k : String) : Dec Json :=
  match kvs.lookup k with
  | some v => pure v
  | none => bad path s!"is missing \"{k}\""

def text (path : String) : Json → Dec String
  | .str s => pure s
  | _ => bad path "expected text"

def int (path : String) : Json → Dec Int
  | .int i => pure i
  | _ => bad path "expected an integer"

def list (path : String) : Json → Dec (List Json)
  | .arr xs => pure xs
  | _ => bad path "expected an array"

/-- Each element of an array, decoded with its own path. -/
def each {α : Type} (path : String) (f : String → Json → Dec α) (j : Json) : Dec (List α) := do
  let xs ← list path j
  (xs.zip (List.range xs.length)).mapM fun (x, i) => f (idx path i) x

def texts (path : String) : Json → Dec (List String) := each path text

def opt {α : Type} (kvs : List (String × Json)) (k : String) (f : Json → Dec α) : Dec (Option α) :=
  match kvs.lookup k with
  | some v => some <$> f v
  | none => pure none

/-! ## Ids and base32 -/

def base32Val (c : Char) : Option Nat := base32Alphabet.findIdx? (· == c)

/-- Bytes from lowercase, unpadded base32. Only the spelling `base32` writes
is taken, so trailing bits must be zero and one text names one byte string. -/
def unbase32 (s : String) : Except String (List UInt8) := do
  let some vs := s.toList.mapM base32Val | throw "has a character outside lowercase base32 (a-z, 2-7)"
  let bits : List Bool := vs.flatMap fun v => (List.range 5).reverse.map fun i => (v >>> i) % 2 == 1
  let bytes := (List.range (bits.length / 8)).map fun k =>
    ((bits.drop (8 * k)).take 8).foldl (fun n b => 2 * n + if b then 1 else 0) 0
  let out := bytes.map Nat.toUInt8
  if base32 out == s then pure out
  else throw "is not base32 as written: its length or trailing bits name no byte string"

/-- A record id: `r:` and the base32 of a 32-byte digest, read as a number
the way `idText` writes one. -/
def recordId (path : String) (j : Json) : Dec Nat := do
  let s ← text path j
  let bytes ← match s.toList with
    | 'r' :: ':' :: rest => match unbase32 (String.ofList rest) with
      | .ok bs => if bs.length == 32 then pure bs else bad path s!"\"{s}\" is not a 32-byte digest"
      | .error why => bad path s!"\"{s}\" {why}"
    | _ => bad path s!"\"{s}\" is not a record id (r:<base32 digest>)"
  let n := bytes.foldl (fun n b => 256 * n + b.toNat) 0
  if idText n == s then pure n else bad path s!"\"{s}\" does not read back as itself"

/-- Bytes written in base32: a salt, a seed. -/
def bytes (path : String) (j : Json) : Dec (List UInt8) := do
  let s ← text path j
  match unbase32 s with
  | .ok bs => pure bs
  | .error why => bad path s!"\"{s}\" {why}"

/-! ## Records, as `jRecord` writes them -/

def stampOf (path : String) (j : Json) : Dec Stamp := do
  let s ← text path j
  match Stamp.of? s with
  | some st => pure st
  | none => bad path s!"\"{s}\" is not an RFC 3339 instant with an offset"

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
  | .bool b => pure (.bool b)
  | _ => bad path "a payload field is text, an integer or a boolean"

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
  let about ← texts (dot path "about") (← req path kvs "about")
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
    let n ← int (dot path "n") (← req path kvs "n")
    let fields ← (opt kvs "fields" (fieldsOf (dot path "fields"))).map (·.getD [])
    pure { base with value, n, fields }
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

/-! ## Drafts, for a batch -/

/-- An envelope as a writer hands it over. Its contents are `write`'s to
check, so here only its shape is. -/
def env (path : String) (j : Json) : Dec Env := do
  let kvs ← members? path ["kind", "observer", "emitted", "occurred", "about", "prev", "under", "erases"] j
  let setOf (k : String) : Dec (List String) := (opt kvs k (texts (dot path k))).map (·.getD [])
  let kind ← text (dot path "kind") (← req path kvs "kind")
  let observer ← text (dot path "observer") (← req path kvs "observer")
  let emitted ← text (dot path "emitted") (← req path kvs "emitted")
  let occurred ← opt kvs "occurred" (text (dot path "occurred"))
  let under ← opt kvs "under" (text (dot path "under"))
  pure
    { kind := kind, observer := observer, emitted := emitted, occurred := occurred,
      about := ← setOf "about", prev := ← setOf "prev", under := under, erases := ← setOf "erases" }

def draft (path : String) (j : Json) : Dec Draft := do
  let kvs ← members? path ["label", "env", "salt", "payload"] j
  let label ← opt kvs "label" (text (dot path "label"))
  let e ← env (dot path "env") (← req path kvs "env")
  let s ← bytes (dot path "salt") (← req path kvs "salt")
  pure { label := label, env := e, salt := s, payload := ← req path kvs "payload" }

end Gen.Read
