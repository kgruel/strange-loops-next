import Loops.Record

/-!
# Digest arithmetic

Every record id fits in 32 bytes by type. Content addressing is separate.
-/

namespace Loops

private theorem digestDigits_length (k n : Nat) : (digestDigits k n).length = k := by
  induction k generalizing n with
  | zero => rfl
  | succ k ih => simp [digestDigits, ih]

/-- Every id has exactly 32 digest digits. -/
theorem idDigest_length (n : RecordId) : (idDigest n).length = 32 :=
  digestDigits_length 32 n.val

private theorem digestDigits_byte (k n : Nat) (hn : n < 256 ^ k) :
    ∀ d ∈ digestDigits k n, d < 256 := by
  induction k generalizing n with
  | zero => simp [digestDigits]
  | succ k ih =>
    intro d hd
    simp only [digestDigits, List.mem_cons] at hd
    rcases hd with rfl | hd
    · apply (Nat.div_lt_iff_lt_mul (Nat.pow_pos (by decide))).2
      simpa [Nat.pow_succ, Nat.mul_comm] using hn
    · exact ih _ (Nat.mod_lt _ (Nat.pow_pos (by decide))) _ hd

/-- Each digest digit of a bounded id is a byte. -/
theorem idDigest_byte (n : RecordId) :
    ∀ d ∈ idDigest n, d < 256 :=
  digestDigits_byte 32 n.val n.isLt

private theorem digestDigits_roundtrip (k n : Nat) (hn : n < 256 ^ k) :
    (digestDigits k n).foldl (fun a d => 256 * a + d) 0 = n := by
  induction k generalizing n with
  | zero =>
    have : n = 0 := by simpa using hn
    simp [digestDigits, this]
  | succ k ih =>
    simp only [digestDigits, List.foldl_cons, Nat.mul_zero, Nat.zero_add]
    rw [fold_digits_acc (fun d => d), digestDigits_length,
      ih _ (Nat.mod_lt _ (Nat.pow_pos (by decide)))]
    simpa [Nat.mul_comm] using Nat.div_add_mod n (256 ^ k)

/-- Reading a bounded id's digest gives the id. -/
theorem idDigest_roundtrip (n : RecordId) :
    (idDigest n).foldl (fun a d => 256 * a + d) 0 = n.val :=
  digestDigits_roundtrip 32 n.val n.isLt

private theorem fold_toUInt8 (xs : List Nat) (h : ∀ d ∈ xs, d < 256) (a : Nat) :
    (xs.map Nat.toUInt8).foldl (fun a b => 256 * a + b.toNat) a =
      xs.foldl (fun a d => 256 * a + d) a := by
  induction xs generalizing a with
  | nil => rfl
  | cons d xs ih =>
    have hd := h d (by simp)
    have hx : ∀ e ∈ xs, e < 256 := fun e he => h e (by simp [he])
    simp only [List.map_cons, List.foldl_cons]
    have he : d.toUInt8.toNat = d := by
      change d % 256 = d
      exact Nat.mod_eq_of_lt hd
    rw [he, ih hx]

/-- Reading the byte representation of a bounded id gives the id. -/
theorem idDigest_bytes_roundtrip (n : RecordId) :
    ((idDigest n).map Nat.toUInt8).foldl (fun a b => 256 * a + b.toNat) 0 = n.val := by
  rw [fold_toUInt8 _ (idDigest_byte n), idDigest_roundtrip n]

private theorem bytes_digestDigits (bs : List UInt8) :
    (digestDigits bs.length (bs.foldl (fun a b => 256 * a + b.toNat) 0)).map
      Nat.toUInt8 = bs := by
  induction bs with
  | nil => rfl
  | cons b bs ih =>
    simp only [List.length_cons, List.foldl_cons, Nat.mul_zero, Nat.zero_add]
    rw [fold_digits_acc UInt8.toNat]
    have ht := bytes_fold_bounded bs
    have hp : 0 < 256 ^ bs.length := Nat.pow_pos (by decide)
    have hq :
        (b.toNat * 256 ^ bs.length + bs.foldl (fun a b => 256 * a + b.toNat) 0) /
          256 ^ bs.length = b.toNat := by
      simpa [Nat.add_comm, Nat.div_eq_of_lt ht] using
        Nat.add_mul_div_right (bs.foldl (fun a b => 256 * a + b.toNat) 0) b.toNat hp
    have hr :
        (b.toNat * 256 ^ bs.length + bs.foldl (fun a b => 256 * a + b.toNat) 0) %
          256 ^ bs.length = bs.foldl (fun a b => 256 * a + b.toNat) 0 := by
      simp [Nat.mod_eq_of_lt ht]
    simp only [digestDigits, List.map_cons, hq, hr]
    rw [ih]
    simp [Nat.toUInt8]

/-- The digest of a number read from 32 bytes gives those same bytes. -/
theorem bytes_idDigest (bs : List UInt8) (h : bs.length = 32) :
    (idDigest ⟨bs.foldl (fun a b => 256 * a + b.toNat) 0, bytes_bounded bs h⟩).map Nat.toUInt8 = bs := by
  change (digestDigits 32 (bs.foldl (fun a b => 256 * a + b.toNat) 0)).map Nat.toUInt8 = bs
  rw [← h]
  exact bytes_digestDigits bs

end Loops
