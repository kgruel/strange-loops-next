import Loops.Record
import Laws.Time

/-!
# Content order

`Newer` is a strict total order on records with different ids: by span, then
`emitted`, then id, each a strict total order of its own. The fold laws use
only these four facts; `Newer.congr` pins what it reads, and `id_order` that
ids compare as their digests' bytes.
-/

namespace Loops

theorem lt_iff_div_mod {a b P : Nat} (hP : 0 < P) :
    a < b ↔ a / P < b / P ∨ (a / P = b / P ∧ a % P < b % P) := by
  have ha := Nat.div_add_mod a P
  have hb := Nat.div_add_mod b P
  have hra := Nat.mod_lt a hP
  have hrb := Nat.mod_lt b hP
  constructor
  · intro h
    rcases Nat.lt_or_ge (a / P) (b / P) with q | q
    · exact .inl q
    · have e : a / P = b / P := Nat.le_antisymm (Nat.div_le_div_right (Nat.le_of_lt h)) q
      refine .inr ⟨e, ?_⟩
      rw [e] at ha
      omega
  · rintro (q | ⟨e, r⟩)
    · exact Nat.lt_of_not_le fun h => Nat.lt_irrefl _ (Nat.lt_of_lt_of_le q (Nat.div_le_div_right h))
    · rw [e] at ha
      omega

theorem digestDigits_lt (k a b : Nat) :
    digestDigits (k + 1) a < digestDigits (k + 1) b ↔ a < b := by
  induction k generalizing a b with
  | zero =>
    simp only [digestDigits, Nat.pow_zero, Nat.div_one, List.cons_lt_cons_iff]
    simp [List.lt_irrefl]
  | succ k ih =>
    change a / 256 ^ (k + 1) :: digestDigits (k + 1) (a % 256 ^ (k + 1)) <
      b / 256 ^ (k + 1) :: digestDigits (k + 1) (b % 256 ^ (k + 1)) ↔ a < b
    rw [List.cons_lt_cons_iff, ih, lt_iff_div_mod (a := a) (P := 256 ^ (k + 1)) (Nat.pow_pos (by decide))]

/-- Ids compare as their digests do, byte by byte, most significant first. -/
theorem id_order (a b : Nat) : idDigest a < idDigest b ↔ a < b := digestDigits_lt 31 a b

/-- Content order reads only a record's span, its `emitted` moment and its id:
not how its times are spelled, its payload, or anything else. -/
theorem Newer.congr {a a' b b' : Record}
    (sa : a.span = a'.span) (ma : a.emitted.moment = a'.emitted.moment) (ia : a.id = a'.id)
    (sb : b.span = b'.span) (mb : b.emitted.moment = b'.emitted.moment) (ib : b.id = b'.id) :
    Newer a b ↔ Newer a' b' := by
  unfold Newer
  rw [sa, ma, ia, sb, mb, ib]

theorem Newer.irrefl (a : Record) : ¬ Newer a a := by
  unfold Newer
  simp [Span.before_irrefl, List.lt_irrefl]

theorem Newer.trans {a b c : Record} (h₁ : Newer a b) (h₂ : Newer b c) : Newer a c := by
  unfold Newer at *
  rcases h₁ with s1 | ⟨e1, t1⟩ <;> rcases h₂ with s2 | ⟨e2, t2⟩
  · exact .inl (Span.before_trans s2 s1)
  · exact .inl (e2 ▸ s1)
  · exact .inl (e1 ▸ s2)
  · refine .inr ⟨e1.trans e2, ?_⟩
    rcases t1 with m1 | ⟨f1, i1⟩ <;> rcases t2 with m2 | ⟨f2, i2⟩
    · exact .inl (List.lt_trans m2 m1)
    · exact .inl (f2 ▸ m1)
    · exact .inl (f1 ▸ m2)
    · exact .inr ⟨f1.trans f2, Nat.lt_trans i2 i1⟩

theorem Newer.asymm {a b : Record} (h : Newer a b) : ¬ Newer b a :=
  fun h' => Newer.irrefl a (Newer.trans h h')

/-- Any two records are ordered, or share an id. -/
theorem Newer.total (a b : Record) : Newer a b ∨ Newer b a ∨ a.id = b.id := by
  unfold Newer
  rcases Span.before_total a.span b.span with s | s | s
  · exact .inr (.inl (.inl s))
  · rcases Std.lt_trichotomy a.emitted.moment b.emitted.moment with m | m | m
    · exact .inr (.inl (.inr ⟨s.symm, .inl m⟩))
    · rcases Nat.lt_trichotomy a.id b.id with i | i | i
      · exact .inr (.inl (.inr ⟨s.symm, .inr ⟨m.symm, i⟩⟩))
      · exact .inr (.inr i)
      · exact .inl (.inr ⟨s, .inr ⟨m, i⟩⟩)
    · exact .inl (.inr ⟨s, .inl m⟩)
  · exact .inl (.inl s)

end Loops
