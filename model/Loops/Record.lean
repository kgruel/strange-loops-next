/-!
# Record

The record as the folds see it. Step 0 keeps it abstract: an id is a number
standing for a content hash (rendered as fixed-width hex, so byte order and
numeric order agree), times are plain numbers, and the payload is opaque.
-/

namespace Loops

structure Record where
  id       : Nat
  kind     : String
  key      : String
  value    : String
  prev     : List Nat
  occurred : Nat
  emitted  : Nat
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
