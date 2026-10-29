import Loops.Number

/-!
# Decimal rescaling: arithmetic prerequisites

These results use the installed `Float.Model` operations.
They do not yet prove rescaling for every integer exponent.

The negative-exponent route first cancels ten in the quotient and remainder.
The selected binary shifts need not agree.
The call `divCore Format.binary64 10 0 10000 0` selects exponent -63.
The call `divCore Format.binary64 1 0 1000 0` selects exponent -62.
The shift lemmas below describe the quotient and both residual bits after each shift.
They do not yet connect the two calls to `roundWithAccuracy`.

The exact remaining interior goal, for binary64, `m > 0`, and `n ≥ 1`, is:

```
(let (q, t, a) := divCore Format.binary64 (m * 10) 0 (10 ^ (n + 1)) 0
 roundWithAccuracy Format.binary64 .positive q t a) =
(let (q, t, a) := divCore Format.binary64 m 0 (10 ^ n) 0
 roundWithAccuracy Format.binary64 .positive q t a)
```

This requires bounds relating `log2` estimates to quotient precision.
It also requires preservation through both target shifts and nearest-even rounding.
The exponent -1 switches from division to multiplication and needs a separate bridge.
The safety-guard boundaries need overflow and underflow proofs for the computed branch.
The upper boundary is exponent 2048.
The lower guards use `-(2048 + m.log2)`, separately for each mantissa.
No general rescaling or normalized canonical round-trip theorem is claimed here.
-/

namespace Loops.Number

open Float.Model Float.Model.UnpackedFloat

/-- A common positive scale preserves the fraction's exactness and half-ulp ordering. -/
theorem scientific_accuracy_scale (num den scale : Nat) (hs : 0 < scale) :
    accuracyOfFraction (num * scale) (den * scale) = accuracyOfFraction num den := by
  have hz : num * scale = 0 ↔ num = 0 := by
    simp [Nat.mul_eq_zero, Nat.ne_of_gt hs]
  have hc : compare (2 * (num * scale)) (den * scale) = compare (2 * num) den := by
    rw [← Nat.mul_assoc]
    simp only [Nat.compare_eq_ite_lt, Nat.mul_lt_mul_right hs]
  simp only [accuracyOfFraction, hz, hc]

/-- Cancel a decimal zero at any fixed binary shift, including the division's accuracy datum. -/
theorem scientific_division_cancel_ten (m n shift : Nat) :
    (((m * 10) <<< shift) / 10 ^ (n + 1),
      accuracyOfFraction (((m * 10) <<< shift) % 10 ^ (n + 1)) (10 ^ (n + 1))) =
    ((m <<< shift) / 10 ^ n,
      accuracyOfFraction ((m <<< shift) % 10 ^ n) (10 ^ n)) := by
  have hm : (m * 10) <<< shift = (m <<< shift) * 10 := by
    simp only [Nat.shiftLeft_eq]
    ac_rfl
  rw [hm, Nat.pow_succ, Nat.mul_div_mul_right _ _ (by decide : 0 < 10),
    Nat.mul_mod_mul_right, scientific_accuracy_scale _ _ _ (by decide : 0 < 10)]

private theorem residual_bits (q r d : Nat) :
    ((ExtendedMantissa.ofMantissaAndAccuracy q (accuracyOfFraction r d)).roundBit ||
      (ExtendedMantissa.ofMantissaAndAccuracy q (accuracyOfFraction r d)).stickyBit) =
      (r != 0) := by
  by_cases hr : r = 0
  · simp [accuracyOfFraction, hr, ExtendedMantissa.ofMantissaAndAccuracy]
  · simp only [accuracyOfFraction, hr, ↓reduceIte]
    cases compare (2 * r) d <;>
      simp [ExtendedMantissa.ofMantissaAndAccuracy, hr]

private theorem coarse_fraction (q r d : Nat) (hd : 0 < d) (hr : r < d) :
    ExtendedMantissa.ofMantissaAndAccuracy (q / 2)
      (accuracyOfFraction (r + d * (q % 2)) (d * 2)) =
      ⟨q / 2, q % 2 != 0, r != 0⟩ := by
  have hq : q % 2 = 0 ∨ q % 2 = 1 := by omega
  rcases hq with hq | hq
  · by_cases hz : r = 0
    · simp [hq, hz, accuracyOfFraction, ExtendedMantissa.ofMantissaAndAccuracy]
    · have hlt : 2 * r < d * 2 := by omega
      simp [hq, hz, accuracyOfFraction, Nat.compare_eq_ite_lt, hlt,
        ExtendedMantissa.ofMantissaAndAccuracy]
  · by_cases hz : r = 0
    · simp [hq, hz, accuracyOfFraction, Nat.ne_of_gt hd, Nat.mul_comm,
        ExtendedMantissa.ofMantissaAndAccuracy]
    · have hlt : d * 2 < 2 * (r + d) := by omega
      have hnot : ¬ 2 * (r + d) < d * 2 := by omega
      simp [hq, hz, accuracyOfFraction, Nat.compare_eq_ite_lt, hlt, hnot,
        ExtendedMantissa.ofMantissaAndAccuracy]

/-- One binary shift preserves the division's quotient and residual information. -/
theorem scientific_division_shift_one (a b : Nat) (hb : 0 < b) :
    ExtendedMantissa.shiftRightOne
      (ExtendedMantissa.ofMantissaAndAccuracy (a / b)
        (accuracyOfFraction (a % b) b)) =
    ExtendedMantissa.ofMantissaAndAccuracy (a / (b * 2))
      (accuracyOfFraction (a % (b * 2)) (b * 2)) := by
  rw [Nat.mod_mul, ← Nat.div_div_eq_div_mul, coarse_fraction _ _ _ hb (Nat.mod_lt _ hb)]
  unfold ExtendedMantissa.shiftRightOne
  rw [residual_bits]
  have hm : (ExtendedMantissa.ofMantissaAndAccuracy (a / b)
      (accuracyOfFraction (a % b) b)).mantissa = a / b := by
    unfold ExtendedMantissa.ofMantissaAndAccuracy
    split <;> rfl
  rw [hm]

/-- Every bit shift carries the exact quotient remainder into the residual bits. -/
theorem scientific_division_shift (a b k : Nat) (hb : 0 < b) :
    (ExtendedMantissa.ofMantissaAndAccuracy (a / b)
      (accuracyOfFraction (a % b) b) >>> k) =
    ExtendedMantissa.ofMantissaAndAccuracy (a / (b * 2 ^ k))
      (accuracyOfFraction (a % (b * 2 ^ k)) (b * 2 ^ k)) := by
  induction k with
  | zero => simp [Nat.repeat, HShiftRight.hShiftRight]
  | succ k ih =>
    change Nat.repeat ExtendedMantissa.shiftRightOne (k + 1) _ = _
    rw [Nat.repeat]
    change ExtendedMantissa.shiftRightOne
      ((ExtendedMantissa.ofMantissaAndAccuracy (a / b)
        (accuracyOfFraction (a % b) b)) >>> k) = _
    rw [ih, scientific_division_shift_one _ _ (Nat.mul_pos hb (Nat.pow_pos (by decide)))]
    simp only [Nat.pow_succ, Nat.mul_assoc]

/-- In the multiplication branch, decimal rescaling gives the same input to rounding. -/
theorem scientific_mul_ten_nonnegative (spec : Format) (m : Nat) (e : Int)
    (he : 0 ≤ e) (hbound : e + 1 ≤ 2 ^ spec.exponentBits) :
    UnpackedFloat.ofScientific spec (m * 10) e =
      UnpackedFloat.ofScientific spec m (e + 1) := by
  by_cases hm : m = 0
  · simp [hm, UnpackedFloat.ofScientific]
  have hm10 : m * 10 ≠ 0 := by simp [Nat.mul_eq_zero, hm]
  have hu : ¬ e > 2 ^ spec.exponentBits := by omega
  have hu1 : ¬ e + 1 > 2 ^ spec.exponentBits := by omega
  have hl : ¬ e < -((2 ^ spec.exponentBits : Int) + (m * 10).log2) := by omega
  have hl1 : ¬ e + 1 < -((2 ^ spec.exponentBits : Int) + m.log2) := by omega
  have he1 : 0 ≤ e + 1 := by omega
  simp only [UnpackedFloat.ofScientific, hm, hm10, hu, hu1, hl, hl1, he, he1,
    ↓reduceDIte, ↓reduceIte, UnpackedFloat.mul]
  have hp : (e + 1).toNat = e.toNat + 1 := by omega
  rw [hp, Nat.pow_succ]
  have hmantissa : ((m * 10) <<< spec.mantissaBits) * 10 ^ e.toNat =
      (m <<< spec.mantissaBits) * (10 ^ e.toNat * 10) := by
    simp only [Nat.shiftLeft_eq]
    ac_rfl
  rw [hmantissa]

/-- The packed Number conversion preserves a trailing zero for `0 ≤ e < 2048`. -/
theorem ofScientific_mul_ten_nonnegative (negative : Bool) (m : Nat) (e : Int)
    (he : 0 ≤ e) (hbound : e < 2048) :
    ofScientific negative (m * 10) e = ofScientific negative m (e + 1) := by
  have h := scientific_mul_ten_nonnegative Format.binary64 m e he (by
    change e + 1 ≤ 2048
    omega)
  unfold ofScientific Float.Model.ofScientific
  rw [h]

end Loops.Number
