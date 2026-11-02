import Loops.Batch

/-!
# Raw envelope and draft decoding

The library checks raw envelope keys before it decodes values.
The caller supplies JSON with member order and repeated names intact.
-/

namespace Loops.Read

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

/-- Bytes from lowercase, unpadded base32hex. Only the spelling `base32` writes
is taken, so trailing bits must be zero and one text names one byte string. -/
def unbase32 (s : String) : Except String (List UInt8) := do
  match Loops.unbase32 s with
  | some bs => pure bs
  | none => throw "is not canonical lowercase base32hex (0-9, a-v): bad alphabet, length or unused bits"

/-- Bytes written in base32hex: a salt, a seed. -/
def bytes (path : String) (j : Json) : Dec (List UInt8) := do
  let s ← text path j
  match unbase32 s with
  | .ok bs => pure bs
  | .error why => bad path s!"\"{s}\" {why}"

private def decodeValues (path : String) (j : Json) : Dec Env := do
  let kvs ← object path j
  let setOf (k : String) : Dec (List String) := (opt kvs k (texts (dot path k))).map (·.getD [])
  let kind ← text (dot path "kind") (← req path kvs "kind")
  let observer ← text (dot path "observer") (← req path kvs "observer")
  let emitted ← text (dot path "emitted") (← req path kvs "emitted")
  let occurred ← opt kvs "occurred" (text (dot path "occurred"))
  let under ← opt kvs "under" (text (dot path "under"))
  pure
    { kind := kind, observer := observer, emitted := emitted, occurred := occurred,
      about := ← setOf "about", prev := ← setOf "prev", under := under, erases := ← setOf "erases" }


/-- Read one envelope. Raw keys precede duplicate and value decoding. -/
def readOne (path : String) (j : Json) : Dec Env := do
  let kvs := match j with | .obj fields => fields | _ => []
  if let some why := envelopeKeysProblem kvs then throw why
  decodeValues path j

/-- A singleton uses the per-envelope boundary; multiple variants share one shape stage. -/
def readMany (path : String) (j : Json) : Dec (List Env) := do
  let raw ← list path j
  match raw with
  | [one] => return [← readOne (idx path 0) one]
  | _ =>
    if let some why := envelopesKeysProblem raw then throw why
    each path decodeValues j

private def draftValues (path : String) (j : Json) : Dec Draft := do
  let kvs ← members? path ["label", "env", "salt", "payload"] j
  let label ← opt kvs "label" (text (dot path "label"))
  let e ← decodeValues (dot path "env") (← req path kvs "env")
  let s ← bytes (dot path "salt") (← req path kvs "salt")
  pure { label := label, env := e, salt := s, payload := ← req path kvs "payload" }

/-- Check every occurrence of a draft's env member before labels and values. -/
def draft (path : String) (j : Json) : Dec Draft := do
  if let some why := draftsKeysProblem [j] then throw why
  draftValues path j

/-- Check all draft envelopes before any label, envelope or salt decoding. -/
def drafts (path : String) (j : Json) : Dec (List Draft) := do
  let raw ← list path j
  if let some why := draftsKeysProblem raw then throw why
  each path draftValues j

end Loops.Read
