import Proposals.Tick

/-!
# Tick cover laws

Encoding identifies the bounded cover without a hash premise.
Hash binding needs the explicit local `NoCollision` premise.
These laws make no claim about payloads, time, authority, or storage.
-/

namespace Loops.Proposals.Tick

open List

@[ext] theorem Cover.ext {a b : Cover} (h : a.ids = b.ids) : a = b := by
  cases a; cases b; cases h; rfl

@[simp] theorem mem_normalize {xs : List Id} {n : Nat} :
    n ∈ (normalize xs).ids ↔ ∃ i ∈ xs, i.val = n := by
  simp [normalize, mem_insertIds]

theorem normalize_sorted (xs : List Id) : (normalize xs).ids.Pairwise (· < ·) :=
  (normalize xs).sorted

theorem Cover.nodup (c : Cover) : c.ids.Nodup := c.sorted.imp Nat.ne_of_lt

theorem normalize_nodup (xs : List Id) : (normalize xs).ids.Nodup :=
  (normalize xs).nodup

/-- Set membership determines a canonical cover. -/
theorem Cover.set_ext {a b : Cover} (h : ∀ n, n ∈ a.ids ↔ n ∈ b.ids) : a = b := by
  apply Cover.ext
  exact Perm.eq_of_pairwise (le := (· < ·)) (fun _ _ _ _ h₁ h₂ => by omega)
    a.sorted b.sorted ((perm_ext_iff_of_nodup a.nodup b.nodup).2 h)

/-- Order and repeat counts do not change normalization. -/
theorem normalize_set {xs ys : List Id} (h : ∀ i, i ∈ xs ↔ i ∈ ys) :
    normalize xs = normalize ys := by
  apply Cover.set_ext
  intro n
  simp only [mem_normalize]
  constructor <;> rintro ⟨i, hi, hn⟩
  · exact ⟨i, (h i).1 hi, hn⟩
  · exact ⟨i, (h i).2 hi, hn⟩

theorem normalize_perm {xs ys : List Id} (h : xs.Perm ys) :
    normalize xs = normalize ys := normalize_set (fun _ => h.mem_iff)

theorem normalize_repeats (xs : List Id) : normalize (xs ++ xs) = normalize xs := by
  apply normalize_set
  simp

theorem normalize_repeat (i : Id) (xs : List Id) :
    normalize (i :: i :: xs) = normalize (i :: xs) := by
  apply normalize_set
  simp

@[simp] theorem mem_diff {old new : Cover} {n : Nat} :
    n ∈ diff old new ↔ n ∈ new.ids ∧ n ∉ old.ids := by
  simp [diff]

@[simp] theorem diff_self (c : Cover) : diff c c = [] := by
  apply List.eq_nil_iff_forall_not_mem.2
  simp

/-- An empty difference means that the new cover adds no id. -/
theorem diff_empty_iff {old new : Cover} :
    diff old new = [] ↔ ∀ n ∈ new.ids, n ∈ old.ids := by
  constructor
  · intro h n hn
    by_cases ho : n ∈ old.ids
    · exact ho
    · have hm : n ∈ diff old new := mem_diff.2 ⟨hn, ho⟩
      rw [h] at hm
      exact False.elim (List.not_mem_nil hm)
  · intro h
    apply List.eq_nil_iff_forall_not_mem.2
    intro n hn
    exact (mem_diff.1 hn).2 (h n (mem_diff.1 hn).1)

/-- Both directional differences are empty exactly when the covers are equal. -/
theorem diffs_empty_iff {old new : Cover} :
    diff old new = [] ∧ diff new old = [] ↔ old = new := by
  constructor
  · rintro ⟨ha, hb⟩
    apply Cover.set_ext
    intro n
    exact ⟨fun hn => (diff_empty_iff.1 hb) n hn,
      fun hn => (diff_empty_iff.1 ha) n hn⟩
  · rintro rfl
    exact ⟨diff_self _, diff_self _⟩

theorem diff_sorted (old new : Cover) : (diff old new).Pairwise (· < ·) :=
  new.sorted.sublist filter_sublist

theorem diff_nodup (old new : Cover) : (diff old new).Nodup :=
  (diff_sorted old new).imp Nat.ne_of_lt

theorem diff_bounded (old new : Cover) {n : Nat} (h : n ∈ diff old new) :
    n < 256 ^ 32 := new.bounded n (mem_diff.1 h).1

@[simp] theorem mem_removed {old new : Cover} {n : Nat} :
    n ∈ removed old new ↔ n ∈ old.ids ∧ n ∉ new.ids := by
  exact mem_diff

/-- The byte width stays fixed, including leading zero bytes. -/
theorem digits_length (k n : Nat) : (digestDigits k n).length = k := by
  induction k generalizing n with
  | zero => rfl
  | succ k ih => simp [digestDigits, ih]

/-- Every digit fits in a byte when the source id meets its width bound. -/
theorem digits_byte_bound {k n d : Nat} (hn : n < 256 ^ k)
    (hd : d ∈ digestDigits k n) : d < 256 := by
  induction k generalizing n with
  | zero => simp [digestDigits] at hd
  | succ k ih =>
    simp only [digestDigits, mem_cons] at hd
    rcases hd with rfl | hd
    · apply (Nat.div_lt_iff_lt_mul (Nat.pow_pos (by decide : 0 < 256))).2
      simpa [Nat.pow_succ, Nat.mul_comm] using hn
    · exact ih (Nat.mod_lt _ (Nat.pow_pos (by decide : 0 < 256))) hd

theorem digits_injective {k n m : Nat} (hn : n < 256 ^ k) (hm : m < 256 ^ k)
    (h : digestDigits k n = digestDigits k m) : n = m := by
  induction k generalizing n m with
  | zero => simp only [Nat.pow_zero] at hn hm; omega
  | succ k ih =>
    simp only [digestDigits, List.cons.injEq] at h
    have hr := ih (Nat.mod_lt _ (Nat.pow_pos (by decide : 0 < 256)))
      (Nat.mod_lt _ (Nat.pow_pos (by decide : 0 < 256))) h.2
    calc
      n = 256 ^ k * (n / 256 ^ k) + n % 256 ^ k := (Nat.div_add_mod _ _).symm
      _ = 256 ^ k * (m / 256 ^ k) + m % 256 ^ k := by rw [h.1, hr]
      _ = m := Nat.div_add_mod _ _

/-- Conversion to `UInt8` loses no digits under the stated bound. -/
theorem bytes_roundtrip {k n : Nat} (hn : n < 256 ^ k) :
    ((digestDigits k n).map Nat.toUInt8).map UInt8.toNat = digestDigits k n := by
  rw [List.map_map]
  calc
    _ = (digestDigits k n).map id := by
      apply List.map_congr_left
      intro d hd
      simp [Nat.mod_eq_of_lt (digits_byte_bound hn hd)]
    _ = _ := List.map_id _

theorem bytes_injective {k n m : Nat} (hn : n < 256 ^ k) (hm : m < 256 ^ k)
    (h : (digestDigits k n).map Nat.toUInt8 = (digestDigits k m).map Nat.toUInt8) : n = m := by
  apply digits_injective hn hm
  have hr := congrArg (List.map UInt8.toNat) h
  simpa only [bytes_roundtrip hn, bytes_roundtrip hm] using hr

/-- Fixed-width byte blocks identify the list when each id fits in 32 bytes. -/
theorem encoded_ids_injective {xs ys : List Nat}
    (hx : ∀ n ∈ xs, n < 256 ^ 32) (hy : ∀ n ∈ ys, n < 256 ^ 32)
    (h : xs.flatMap (fun n => (idDigest n).map Nat.toUInt8) =
      ys.flatMap (fun n => (idDigest n).map Nat.toUInt8)) : xs = ys := by
  induction xs generalizing ys with
  | nil =>
    cases ys with
    | nil => rfl
    | cons y ys =>
      have hl := congrArg List.length h
      simp [idDigest, digits_length] at hl
      omega
  | cons x xs ih =>
    cases ys with
    | nil =>
      have hl := congrArg List.length h
      simp [idDigest, digits_length] at hl
    | cons y ys =>
      simp only [List.flatMap_cons] at h
      obtain ⟨hb, ht⟩ := List.append_inj h (by simp [idDigest, digits_length])
      have hxy := bytes_injective (hx x (by simp)) (hy y (by simp)) hb
      subst y
      congr 1
      exact ih (fun n hn => hx n (mem_cons_of_mem _ hn))
        (fun n hn => hy n (mem_cons_of_mem _ hn)) ht

theorem Cover.encoding_length (c : Cover) : c.encoding.length = 32 * c.ids.length := by
  have h : ∀ ns : List Nat,
      (ns.flatMap fun n => (idDigest n).map Nat.toUInt8).length = 32 * ns.length := by
    intro ns
    induction ns with
    | nil => rfl
    | cons n ns ih =>
      simp only [List.flatMap_cons, List.length_append, List.length_map, idDigest,
        digits_length, List.length_cons, Nat.mul_succ] at *
      omega
  exact h c.ids

theorem Cover.encoding_injective {a b : Cover} (h : a.encoding = b.encoding) : a = b := by
  exact Cover.ext (encoded_ids_injective a.bounded b.bounded h)

theorem Cover.preimage_injective {a b : Cover} (h : a.preimage = b.preimage) : a = b := by
  exact Cover.encoding_injective (List.append_cancel_left h)

/-- Equal covers give equal digests for every hash, with no collision premise. -/
theorem digest_same_cover (H : Hash) {a b : Cover} (h : a.ids = b.ids) :
    a.digest H = b.digest H := by
  rw [Cover.ext h]

/-- Binding needs only the explicit no-collision premise for these two preimages. -/
theorem digest_binds_cover (H : Hash) {a b : Cover} (hc : NoCollision H a b)
    (h : a.digest H = b.digest H) : a = b :=
  Cover.preimage_injective (hc h)

theorem digest_eq_iff (H : Hash) {a b : Cover} (hc : NoCollision H a b) :
    a.digest H = b.digest H ↔ a = b := by
  constructor
  · exact digest_binds_cover H hc
  · rintro rfl; rfl

end Loops.Proposals.Tick
