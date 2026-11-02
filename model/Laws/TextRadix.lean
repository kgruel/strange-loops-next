import Std.Tactic

namespace Loops

/-- The value of a fixed-width, most-significant-digit-first numeral. -/
def radixValue (r : Nat) : List Nat → Nat
  | [] => 0
  | x :: xs => x * r ^ xs.length + radixValue r xs

theorem radixValue_fold (r : Nat) (xs : List Nat) (a : Nat) :
    xs.foldl (fun n d => r * n + d) a = a * r ^ xs.length + radixValue r xs := by
  induction xs generalizing a with
  | nil => simp [radixValue]
  | cons x xs ih =>
    simp only [List.foldl_cons, List.length_cons, radixValue, ih, Nat.pow_succ, Nat.add_mul]
    simp [Nat.mul_assoc, Nat.mul_comm, Nat.mul_left_comm, Nat.add_assoc, Nat.add_comm, Nat.add_left_comm]

theorem radixValue_bound {r : Nat} (_hr : 0 < r) {xs : List Nat}
    (hs : ∀ x ∈ xs, x < r) : radixValue r xs < r ^ xs.length := by
  induction xs with
  | nil => simp [radixValue]
  | cons x xs ih =>
    have hx := hs x List.mem_cons_self
    have ht := ih (fun d hd => hs d (List.mem_cons_of_mem x hd))
    have hm := Nat.mul_le_mul_right (r ^ xs.length) hx
    simp only [radixValue, List.length_cons, Nat.pow_succ]
    rw [Nat.succ_mul] at hm
    rw [Nat.mul_comm (r ^ xs.length) r]
    omega

/-- Fixed-width digits compare numerically in exactly their list lexical order. -/
theorem radixValue_lt_iff {r : Nat} (hr : 0 < r) {xs ys : List Nat}
    (hl : xs.length = ys.length)
    (hx : ∀ x ∈ xs, x < r) (hy : ∀ y ∈ ys, y < r) :
    radixValue r xs < radixValue r ys ↔ xs < ys := by
  induction xs generalizing ys with
  | nil => cases ys <;> simp_all [radixValue]
  | cons x xs ih =>
    cases ys with
    | nil => simp at hl
    | cons y ys =>
      have hl' : xs.length = ys.length := by simpa using hl
      have hxs : ∀ d ∈ xs, d < r := fun d hd => hx d (List.mem_cons_of_mem x hd)
      have hys : ∀ d ∈ ys, d < r := fun d hd => hy d (List.mem_cons_of_mem y hd)
      have bx := radixValue_bound hr hxs
      rw [hl'] at bx
      have by' := radixValue_bound hr hys
      have ii := ih hl' hxs hys
      simp only [radixValue, hl', List.cons_lt_cons_iff]
      by_cases he : x = y
      · subst y; simp [ii]
      · by_cases hxy : x < y
        · have hm := Nat.mul_le_mul_right (r ^ ys.length) hxy
          rw [Nat.succ_mul] at hm
          constructor <;> intro h
          · exact Or.inl hxy
          · omega
        · have hyx : y < x := by omega
          have hm := Nat.mul_le_mul_right (r ^ ys.length) hyx
          rw [Nat.succ_mul] at hm
          constructor
          · intro h; omega
          · rintro (h | ⟨h, _⟩) <;> omega

theorem radixValue_injective {r : Nat} (hr : 0 < r) {xs ys : List Nat}
    (hl : xs.length = ys.length)
    (hx : ∀ x ∈ xs, x < r) (hy : ∀ y ∈ ys, y < r)
    (he : radixValue r xs = radixValue r ys) : xs = ys := by
  apply Std.le_antisymm
  · intro h; have := (radixValue_lt_iff hr hl.symm hy hx).2 h; omega
  · intro h; have := (radixValue_lt_iff hr hl hx hy).2 h; omega

/-- Equal-width prefixes decide lexical order before either suffix. -/
theorem lex_append_equal_width {α : Type} [LT α] [Std.Irrefl (· < · : α → α → Prop)]
    {a b c d : List α} (hl : a.length = b.length) :
    a ++ c < b ++ d ↔ a < b ∨ a = b ∧ c < d := by
  induction a generalizing b with
  | nil => cases b <;> simp_all
  | cons x xs ih =>
    cases b with
    | nil => simp at hl
    | cons y ys =>
      have hh : xs.length = ys.length := by simpa using hl
      simp only [List.cons_append, List.cons_lt_cons_iff, ih hh, List.cons.injEq]
      constructor
      · rintro (h | ⟨he, h | ⟨ht, hh⟩⟩)
        · exact Or.inl (Or.inl h)
        · exact Or.inl (Or.inr ⟨he, h⟩)
        · exact Or.inr ⟨⟨he, ht⟩, hh⟩
      · rintro ((h | ⟨he, h⟩) | ⟨⟨he, ht⟩, hh⟩)
        · exact Or.inl h
        · exact Or.inr ⟨he, Or.inl h⟩
        · exact Or.inr ⟨he, Or.inr ⟨ht, hh⟩⟩

/-- A fixed-width ordered block encoding preserves the actual list lexical order. -/
theorem lex_flatMap_fixed {α β : Type} [LT α] [LT β]
    [Std.Irrefl (· < · : β → β → Prop)]
    (f : α → List β) (w : Nat) (hw : 0 < w)
    (hlen : ∀ a, (f a).length = w)
    (heq : ∀ a b, f a = f b ↔ a = b)
    (hlt : ∀ a b, f a < f b ↔ a < b) (xs ys : List α) :
    xs.flatMap f < ys.flatMap f ↔ xs < ys := by
  induction xs generalizing ys with
  | nil =>
    cases ys with
    | nil => simp
    | cons y ys =>
      have hn : f y ≠ [] := by intro h; have := hlen y; simp [h] at this; omega
      cases hf : f y with
      | nil => contradiction
      | cons b bs => simp [hf]
  | cons x xs ih =>
    cases ys with
    | nil => simp
    | cons y ys =>
      simp only [List.flatMap_cons, lex_append_equal_width ((hlen x).trans (hlen y).symm),
        heq, hlt, ih, List.cons_lt_cons_iff]

end Loops
