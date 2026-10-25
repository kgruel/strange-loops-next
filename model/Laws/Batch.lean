import Loops.Batch

/-!
# Laws of a batch

* **One meaning.** If a batch's labels can be ranked so each record uses only
  labels ranked below its own, any two meanings agree on every label. The
  records a batch writes don't depend on the order its drafts are listed or
  resolved in, and are the records its author would get by writing them one
  at a time with real ids.

`gen` checks every batch vector against `Meaning`, in every rotation of its
drafts.
-/

namespace Loops

open List

theorem subst_congr {σ τ : String → Option String} : ∀ {ss : List String},
    (∀ s ∈ ss, isLabel s = true → σ s = τ s) → subst σ ss = subst τ ss
  | [], _ => rfl
  | s :: ss, h => by
    simp only [subst]
    rw [subst_congr fun x hx => h x (mem_cons_of_mem _ hx)]
    by_cases hl : isLabel s = true
    · simp [hl, h s mem_cons_self hl]
    · simp [hl]

theorem substEnv_congr {σ τ : String → Option String} {e : Env}
    (h : ∀ s ∈ e.about ++ e.prev, isLabel s = true → σ s = τ s) :
    substEnv σ e = substEnv τ e := by
  simp only [substEnv]
  rw [subst_congr fun s hs => h s (mem_append_left _ hs),
    subst_congr fun s hs => h s (mem_append_right _ hs)]

/-- Labels can be ranked so a record uses only labels ranked below its own. -/
def Acyclic (ds : List Draft) (rank : String → Nat) : Prop :=
  ∀ d ∈ ds, ∀ l, d.label = some l → ∀ r ∈ d.refs, rank r < rank l

/-- An acyclic batch has at most one meaning. -/
theorem Meaning.unique {H : Hash} {ds : List Draft} {rank : String → Nat}
    (hacyc : Acyclic ds rank) {σ τ : String → Option String}
    (hσ : Meaning H ds σ) (hτ : Meaning H ds τ) (l : String) : σ l = τ l := by
  suffices ∀ n l, rank l = n → σ l = τ l from this _ l rfl
  intro n
  induction n using Nat.strongRecOn with
  | _ n ih =>
    intro l hl
    by_cases hd : ∃ d ∈ ds, d.label = some l
    · obtain ⟨d, hd, hdl⟩ := hd
      obtain ⟨e, he, hσl⟩ := hσ.given d hd l hdl
      obtain ⟨e', he', hτl⟩ := hτ.given d hd l hdl
      have hsub : substEnv σ d.env = substEnv τ d.env := substEnv_congr fun s hs hlab =>
        ih (rank s) (hl ▸ hacyc d hd l hdl s (mem_filter.2 ⟨hs, hlab⟩)) s rfl
      rw [hsub, he'] at he
      cases he
      rw [hσl, hτl]
    · simp only [not_exists, not_and] at hd
      rw [hσ.only l hd, hτ.only l hd]

end Loops
