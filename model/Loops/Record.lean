/-!
# Record

The record as the folds see it. Step 0 keeps it abstract: an id is a number
standing for a content hash (rendered as fixed-width hex, so byte order and
numeric order agree), times are plain numbers, and the payload is opaque.
-/

namespace Loops

/-- How much of a record a reader holds. The envelope is always there; the
payload may be withheld (outside the reader's grant) or erased (by the store). -/
inductive Shown where
  | here
  | withheld
  | erased
  deriving Repr, DecidableEq, Inhabited

structure Record where
  id       : Nat
  kind     : String
  key      : String
  value    : String
  prev     : List Nat
  occurred : Nat
  emitted  : Nat
  /-- A numeric payload field the numeric folds read. Exact: an integer. -/
  n        : Int := 0
  /-- Whether the payload (`value` and `n`) is here for this reader. -/
  shown    : Shown := .here
  deriving Repr, DecidableEq, Inhabited

/-- Content order, newest first: `occurred`, then `emitted`, then id. -/
def Newer (a b : Record) : Prop :=
  a.occurred > b.occurred ∨
  (a.occurred = b.occurred ∧
    (a.emitted > b.emitted ∨ (a.emitted = b.emitted ∧ a.id > b.id)))

instance (a b : Record) : Decidable (Newer a b) := by
  unfold Newer; infer_instance

/-- Content addressing: within one store, an id names exactly one record. -/
def Addressed (xs : List Record) : Prop :=
  ∀ a ∈ xs, ∀ b ∈ xs, a.id = b.id → a = b

/-- What a store hands a fold: each id once. -/
def Distinct (xs : List Record) : Prop := (xs.map (·.id)).Nodup

/-- The same envelope: everything the core reads without opening the payload.
`key` stands for `about`. -/
def SameEnvelope (a b : Record) : Prop :=
  a.id = b.id ∧ a.kind = b.kind ∧ a.key = b.key ∧ a.prev = b.prev ∧
    a.occurred = b.occurred ∧ a.emitted = b.emitted

/-- A view of records: it may hide a payload, and changes nothing else. A
narrowed handle, a withheld form and an erasure are all views. -/
structure View (f : Record → Record) : Prop where
  envelope : ∀ r, SameEnvelope (f r) r
  hides : ∀ r, f r = r ∨ (f r).shown ≠ .here

def Record.withhold (r : Record) : Record := { r with value := "", n := 0, shown := .withheld }

def Record.erase (r : Record) : Record := { r with value := "", n := 0, shown := .erased }

/-- Withhold the payloads of the records `p` picks, as a narrowed grant does. -/
def withholding (p : Record → Bool) (r : Record) : Record := if p r then r.withhold else r

theorem Newer.asymm {a b : Record} (h : Newer a b) : ¬ Newer b a := by
  unfold Newer at *; omega

theorem Newer.irrefl (a : Record) : ¬ Newer a a := by
  unfold Newer; omega

theorem Newer.trans {a b c : Record} (h₁ : Newer a b) (h₂ : Newer b c) : Newer a c := by
  unfold Newer at *; omega

/-- Any two records are ordered, or share an id. -/
theorem Newer.total (a b : Record) : Newer a b ∨ Newer b a ∨ a.id = b.id := by
  unfold Newer; omega

end Loops
