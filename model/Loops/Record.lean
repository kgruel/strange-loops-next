import Loops.Occurred

/-!
# Record

The record as the folds see it. An id is a number standing for a content
hash (rendered as fixed-width hex, so byte order and numeric order agree),
and the payload is opaque. Times are real: `emitted` is a `Stamp` and
`occurred`, when there is one, a `Claim`, each its text with what it reads
as.
-/

namespace Loops

/-- How much of a record a reader holds. The envelope is always there; the
payload may be withheld (outside the reader's grant) or erased (by the store). -/
inductive Shown where
  | here
  | withheld
  | erased
  deriving Repr, DecidableEq, Inhabited

/-- A payload value a `where` test or a fold can read. -/
inductive Val where
  | str (s : String)
  | int (i : Int)
  | bool (b : Bool)
  deriving Repr, DecidableEq, Inhabited

structure Record where
  id       : Nat
  kind     : String
  /-- Who says so. -/
  observer : String := ""
  /-- The things this record is about: a set. -/
  about    : List String := []
  value    : String
  prev     : List Nat
  /-- The claimed past, if the observer gave one. -/
  occurred : Option Claim := none
  /-- The observer's now. -/
  emitted  : Stamp
  /-- The ids whose payloads this record erases, whatever its kind. -/
  erases   : List Nat := []
  /-- A numeric payload field the numeric folds read. Exact: an integer. -/
  n        : Int := 0
  /-- Further payload fields, by name. -/
  fields   : List (String × Val) := []
  /-- Whether the payload (`value`, `n`, `fields`) is here for this reader. -/
  shown    : Shown := .here
  deriving Repr, DecidableEq, Inhabited

/-- An id as text: the model's ids are numbers standing for content hashes,
written as fixed-width hex so byte order and numeric order agree. -/
def idText (n : Nat) : String :=
  let d := Nat.toDigits 16 n
  "r:" ++ String.ofList (List.replicate (8 - d.length) '0' ++ d)

/-- The span content order reads: `occurred`'s, or without one, `emitted` as
a span of no length. -/
def Record.span (r : Record) : Span :=
  match r.occurred with
  | some c => c.span
  | none => Span.point r.emitted.moment

/-- Content order, newest first: the span (by start, then end), then
`emitted`, then id. -/
def Newer (a b : Record) : Prop :=
  b.span.Before a.span ∨
  (a.span = b.span ∧
    (b.emitted.moment < a.emitted.moment ∨ (a.emitted.moment = b.emitted.moment ∧ a.id > b.id)))

instance (a b : Record) : Decidable (Newer a b) := by
  unfold Newer; infer_instance

/-- Content addressing: within one store, an id names exactly one record. -/
def Addressed (xs : List Record) : Prop :=
  ∀ a ∈ xs, ∀ b ∈ xs, a.id = b.id → a = b

/-- What a store hands a fold: each id once. -/
def Distinct (xs : List Record) : Prop := (xs.map (·.id)).Nodup

/-- The same envelope: everything the core reads without opening the payload. -/
structure SameEnvelope (a b : Record) : Prop where
  id : a.id = b.id
  kind : a.kind = b.kind
  observer : a.observer = b.observer
  about : a.about = b.about
  prev : a.prev = b.prev
  occurred : a.occurred = b.occurred
  emitted : a.emitted = b.emitted
  erases : a.erases = b.erases

/-- A view of records: it may hide a payload, and changes nothing else. A
narrowed handle, a withheld form and an erasure are all views. -/
structure View (f : Record → Record) : Prop where
  envelope : ∀ r, SameEnvelope (f r) r
  hides : ∀ r, f r = r ∨ (f r).shown ≠ .here

def Record.withhold (r : Record) : Record :=
  { r with value := "", n := 0, fields := [], shown := .withheld }

def Record.erase (r : Record) : Record :=
  { r with value := "", n := 0, fields := [], shown := .erased }

/-- A payload field by name: `value` and `n` always exist; others may not. -/
def Record.get (r : Record) (name : String) : Option Val :=
  if name = "value" then some (.str r.value)
  else if name = "n" then some (.int r.n)
  else r.fields.lookup name

/-- A payload field as an exact number, if the reader holds it and it is one. -/
def Record.num (r : Record) (name : String) : Option Int :=
  if r.shown = .here then
    match r.get name with
    | some (.int i) => some i
    | _ => none
  else none

/-- Withhold the payloads of the records `p` picks, as a narrowed grant does. -/
def withholding (p : Record → Bool) (r : Record) : Record := if p r then r.withhold else r

end Loops
