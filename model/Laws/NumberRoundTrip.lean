import Laws.Number
import Gen.Read

namespace Loops.Number

/-- Replace either sign of zero with positive zero. -/
def normalizeZero (n : Number) : Number :=
  if n.magnitude = 0 then ⟨0⟩ else n

theorem normalizeZero_of_nonzero (n : Number) (h : n.magnitude ≠ 0) :
    n.normalizeZero = n := by
  simp [normalizeZero, h]

theorem normalizeZero_idempotent (n : Number) :
    n.normalizeZero.normalizeZero = n.normalizeZero := by
  by_cases h : n.magnitude = 0
  · have hz : n.normalizeZero = ⟨0⟩ := by simp [normalizeZero, h]
    rw [hz]
    decide
  · simp [normalizeZero, h]

theorem canon_normalizeZero (n : Number) :
    n.normalizeZero.canon = n.canon := by
  by_cases h : n.magnitude = 0
  · have hz : n.normalizeZero = ⟨0⟩ := by simp [normalizeZero, h]
    rw [hz, canon_zero n h]
    exact canon_zero ⟨0⟩ (by decide)
  · simp [normalizeZero, h]

end Loops.Number

namespace Gen.Read

/-- Read one complete number with the JSON number reader. -/
def readNumber (text : String) : Option Loops.Number :=
  match number.run text.toList with
  | .ok (.number n, []) => some n
  | .ok (.int i, []) => some (Loops.Number.ofScientific (decide (i < 0)) i.natAbs 0)
  | _ => none

set_option maxRecDepth 100000 in
set_option exponentiation.threshold 2048 in
theorem number_canon_zero (n : Loops.Number) (h : n.magnitude = 0) :
    readNumber n.canon = some n.normalizeZero := by
  rw [Loops.Number.canon_zero n h]
  simp only [Loops.Number.normalizeZero, h, ite_true]
  decide

end Gen.Read
