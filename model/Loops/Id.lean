import Loops.Base32

/-! # Bounded record ids and digest arithmetic -/

namespace Loops

/-- A record id is a 32-byte digest read most significant byte first. -/
abbrev RecordId := Fin (256 ^ 32)

/-- The last `k` base-256 digits of `n`, most significant first; the first
holds whatever is above them. -/
def digestDigits : Nat → Nat → List Nat
  | 0, _ => []
  | k + 1, n => n / 256 ^ k :: digestDigits k (n % 256 ^ k)

/-- An id's digest: its 32 bytes, most significant first. -/
def idDigest (n : RecordId) : List Nat := digestDigits 32 n.val

/-- An id as text: `r:` and its digest in base32hex. -/
def idText (n : RecordId) : String := "r:" ++ base32 ((idDigest n).map Nat.toUInt8)

theorem fold_digits_acc {α : Type} (value : α → Nat) (xs : List α) (a : Nat) :
    xs.foldl (fun a d => 256 * a + value d) a =
      a * 256 ^ xs.length + xs.foldl (fun a d => 256 * a + value d) 0 := by
  induction xs generalizing a with
  | nil => simp
  | cons d xs ih =>
    simp only [List.foldl_cons, Nat.mul_zero, Nat.zero_add, List.length_cons]
    rw [ih (256 * a + value d), ih (value d)]
    simp [Nat.pow_succ, Nat.add_mul, Nat.mul_assoc, Nat.mul_comm, Nat.add_assoc]

theorem bytes_fold_bounded (bs : List UInt8) :
    bs.foldl (fun a b => 256 * a + b.toNat) 0 < 256 ^ bs.length := by
  induction bs with
  | nil => simp
  | cons b bs ih =>
    simp only [List.foldl_cons, Nat.mul_zero, Nat.zero_add, List.length_cons]
    rw [fold_digits_acc UInt8.toNat]
    have hb : b.toNat < 256 := b.toNat_lt
    have hm := Nat.mul_le_mul_right (256 ^ bs.length) (show b.toNat + 1 ≤ 256 by omega)
    rw [Nat.add_mul] at hm
    simp only [Nat.one_mul] at hm
    rw [Nat.pow_succ]
    omega

/-- Reading 32 bytes always gives a bounded id. -/
theorem bytes_bounded (bs : List UInt8) (h : bs.length = 32) :
    bs.foldl (fun a b => 256 * a + b.toNat) 0 < 256 ^ 32 := by
  simpa [h] using bytes_fold_bounded bs

end Loops
