import Loops.Record
import Laws.Time

/-!
# Content order

`Newer` is a strict total order on records with different ids: by span, then
`emitted`, then id, each a strict total order of its own. The fold laws use
only these four facts.
-/

namespace Loops

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
