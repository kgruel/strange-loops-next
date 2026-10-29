import Loops.Number
import Init.Data.Nat.ToString

/-!
# Number text laws

Finite output uses digits, signs, a dot, and lowercase e.
No output equals the named NaN or Infinity forms.
-/

namespace Loops.Number

/-- Nonfinite numbers have one canonical spelling. -/
theorem canon_nonfinite (n : Number) (h : n.finite = false) : n.canon = "null" := by
  simp [canon, h]

/-- Both signs of zero have the same canonical spelling. -/
theorem canon_zero (n : Number) (h : n.magnitude = 0) : n.canon = "0" := by
  have hf : n.finite = true := by simp [finite, h]
  simp [canon, hf, h]

private theorem zero_finite : (Number.mk 0).finite = true := by decide
private theorem neg_zero_finite : (Number.mk 0x8000000000000000).finite = true := by decide
private theorem zero_magnitude : (Number.mk 0).magnitude = 0 := by decide
private theorem neg_zero_magnitude : (Number.mk 0x8000000000000000).magnitude = 0 := by decide

/-- Canonical text cannot recover every finite bit pattern. -/
theorem no_exact_canon_reader :
    ¬ ∃ read : String → Number, ∀ n : Number, n.finite = true → read n.canon = n := by
  rintro ⟨read, h⟩
  have hp := h ⟨0⟩ zero_finite
  have hn := h ⟨0x8000000000000000⟩ neg_zero_finite
  rw [canon_zero _ zero_magnitude] at hp
  rw [canon_zero _ neg_zero_magnitude] at hn
  have heq : (Number.mk 0) = Number.mk 0x8000000000000000 := hp.symm.trans hn
  have hb := congrArg Number.bits heq
  contradiction


private abbrev CanonChar (c : Char) : Prop :=
  c.isDigit = true ∨ c = '-' ∨ c = '+' ∨ c = '.' ∨ c = 'e'

private abbrev TextChars (s : String) : Prop :=
  ∀ c ∈ s.toList, CanonChar c

private theorem chars_nat (m : Nat) : TextChars (toString m) := by
  intro c hc
  left
  rw [Nat.toString_eq_ofList_toDigits, String.toList_ofList] at hc
  exact Nat.isDigit_of_mem_toDigits (by decide) (by decide) hc

private theorem chars_append {s t : String} (hs : TextChars s) (ht : TextChars t) :
    TextChars (s ++ t) := by
  intro c hc
  rw [String.toList_append, List.mem_append] at hc
  exact hc.elim (hs c) (ht c)

private theorem chars_take {s : String} (k : Nat) (hs : TextChars s) :
    TextChars (String.ofList (s.toList.take k)) := by
  intro c hc
  rw [String.toList_ofList] at hc
  exact hs c (List.mem_of_mem_take hc)

private theorem chars_drop {s : String} (k : Nat) (hs : TextChars s) :
    TextChars (String.ofList (s.toList.drop k)) := by
  intro c hc
  rw [String.toList_ofList] at hc
  exact hs c (List.mem_of_mem_drop hc)

private theorem chars_zeros (k : Nat) : TextChars (String.ofList (List.replicate k '0')) := by
  intro c hc
  rw [String.toList_ofList, List.mem_replicate] at hc
  rw [hc.2]
  decide

/-- Each character in finite number text is a digit, sign, dot, or lowercase e. -/
theorem canon_chars (n : Number) (hf : n.finite = true) (c : Char)
    (hc : c ∈ n.canon.toList) :
    c.isDigit = true ∨ c = '-' ∨ c = '+' ∨ c = '.' ∨ c = 'e' := by
  have h : TextChars n.canon := by
    unfold canon
    simp only [hf, Bool.not_true, Bool.false_eq_true, ↓reduceIte]
    split
    · decide
    · -- Treat the final mantissa and exponent as arbitrary values.
      generalize (Prod.fst (_ : Nat × Int)) = m
      generalize (Prod.snd (_ : Nat × Int)) = e
      have hsign : TextChars (if n.bits >>> 63 == 1 then "-" else "") := by
        split
        · decide
        · decide
      split
      · split
        · exact chars_append (chars_append hsign (chars_nat m)) (chars_zeros _)
        · exact chars_append
            (chars_append (chars_append hsign (chars_take _ (chars_nat m)))
              (by decide : TextChars "."))
            (chars_drop _ (chars_nat m))
      · split
        · exact chars_append
            (chars_append (chars_append hsign (by decide : TextChars "0.")) (chars_zeros _))
            (chars_nat m)
        · apply chars_append
          · apply chars_append
            · apply chars_append
              · apply chars_append hsign
                apply chars_append (chars_take 1 (chars_nat m))
                split
                · decide
                · exact chars_append (by decide : TextChars ".") (chars_drop 1 (chars_nat m))
              · decide
            · split <;> decide
          · exact chars_nat _
  exact h c hc

private theorem ne_of_char {s t : String} (hs : TextChars s) (c : Char)
    (hc : c ∈ t.toList) (hbad : ¬CanonChar c) : s ≠ t := by
  intro h
  apply hbad
  apply hs c
  rw [h]
  exact hc

/-- Number text never writes the named NaN or Infinity forms. -/
theorem canon_not_special (n : Number) :
    n.canon ≠ "NaN" ∧ n.canon ≠ "Infinity" ∧
      n.canon ≠ "-Infinity" ∧ n.canon ≠ "+Infinity" := by
  cases hf : n.finite with
  | false =>
    rw [canon_nonfinite n hf]
    decide
  | true =>
    exact ⟨ne_of_char (canon_chars n hf) 'N' (by decide) (by decide),
      ne_of_char (canon_chars n hf) 'I' (by decide) (by decide),
      ne_of_char (canon_chars n hf) 'I' (by decide) (by decide),
      ne_of_char (canon_chars n hf) 'I' (by decide) (by decide)⟩

end Loops.Number
