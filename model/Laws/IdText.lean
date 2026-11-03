import Laws.Base32
import Laws.Id
import Loops.Stored

/-!
# Id text

A bounded id has one byte representation and one text representation.
The hash-to-text constructor agrees when its hash result has 32 bytes.
-/

namespace Loops

/-- Two bounded ids with the same text are equal. -/
theorem idText_injective {a b : RecordId} (h : idText a = idText b) : a = b := by
  have he : base32 ((idDigest a).map Nat.toUInt8) =
      base32 ((idDigest b).map Nat.toUInt8) := by
    exact (String.append_right_inj "r:").mp h
  have hd := base32_injective _ _ he
  have hn := congrArg (fun bs : List UInt8 =>
    bs.foldl (fun a b => 256 * a + b.toNat) 0) hd
  apply Fin.ext
  simpa only [idDigest_bytes_roundtrip a, idDigest_bytes_roundtrip b] using hn

/-- A 32-byte hash gives the same id text through bytes or through a number. -/
theorem idOf_eq_idText (H : Hash) (env : Env) (commit : String)
    (h : (H (utf8 (idPreimage env commit))).length = 32) :
    idOf H env commit =
      idText ⟨(H (utf8 (idPreimage env commit))).foldl (fun a b => 256 * a + b.toNat) 0,
        bytes_bounded _ h⟩ := by
  simp only [idOf, idText, bytes_idDigest _ h]

private theorem bytes_lex_nat (as bs : List UInt8) :
    as < bs ↔ as.map UInt8.toNat < bs.map UInt8.toNat := by
  induction as generalizing bs with
  | nil => cases bs <;> simp
  | cons a as ih =>
    cases bs with
    | nil => simp
    | cons b bs =>
      simp only [List.map_cons, List.cons_lt_cons_iff, ← UInt8.toNat_inj,
        UInt8.lt_iff_toNat_lt, ih]

private theorem digest_map_toNat (a : RecordId) :
    ((idDigest a).map Nat.toUInt8).map UInt8.toNat = idDigest a := by
  simp only [List.map_map]
  calc
    _ = (idDigest a).map (fun d => d) := List.map_congr_left (fun d hd => by
      change d % 256 = d
      exact Nat.mod_eq_of_lt (idDigest_byte a d hd))
    _ = _ := List.map_id' _

private theorem string_prefix_lt (p a b : String) : p ++ a < p ++ b ↔ a < b := by
  rw [String.lt_iff, String.toList_append, String.toList_append,
    lex_append_equal_width (Nat.le_antisymm (Nat.le_refl _) (Nat.le_refl _))]
  simp only [List.lt_irrefl, false_or, true_and]
  exact String.lt_iff.symm

/-- Actual String lexical order agrees with bounded numeric digest order. -/
theorem idText_order (a b : RecordId) : idText a < idText b ↔ a < b := by
  have hl : ((idDigest a).map Nat.toUInt8).length = ((idDigest b).map Nat.toUInt8).length := by
    simp only [List.length_map, idDigest_length]
  have vr (n : RecordId) : radixValue 256 (idDigest n) = n.val := by
    have hf := radixValue_fold 256 (idDigest n) 0
    simpa only [Nat.zero_mul, Nat.zero_add, idDigest_roundtrip] using hf.symm
  have ht : base32 ((idDigest a).map Nat.toUInt8) < base32 ((idDigest b).map Nat.toUInt8) ↔ a < b := by
    rw [base32_lt_iff hl, bytes_lex_nat, digest_map_toNat, digest_map_toNat,
      ← radixValue_lt_iff (by decide) ((idDigest_length a).trans (idDigest_length b).symm)
        (idDigest_byte a) (idDigest_byte b), vr, vr]
    rfl
  exact (string_prefix_lt "r:" _ _).trans ht

end Loops
