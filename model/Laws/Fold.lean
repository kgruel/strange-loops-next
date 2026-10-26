import Loops.Fold
import Laws.Order

/-!
# Laws of the folds

* **Incremental = batch.** Folding `xs` then `ys` equals folding `xs ++ ys`.
  This holds for every step fold by construction (`List.foldl_append`).
* **The set decides.** LatestBy's state depends only on which records were
  folded: not their order, not repeats. So late arrivals, re-delivered
  segments and syncs in either direction all converge.
* **Count needs the store.** Count is order-free but counts repeats, so the
  read path must hand it each record once (records are unique by id).
-/

namespace Loops

open List

/-! ## Incremental = batch -/

theorem Count.batch (n : Nat) (xs ys : List Record) :
    Count.fold (Count.fold n xs) ys = Count.fold n (xs ++ ys) := by
  simp [Count.fold, List.foldl_append]

theorem LatestBy.batch (s : LatestBy) (xs ys : List Record) :
    LatestBy.fold (LatestBy.fold s xs) ys = LatestBy.fold s (xs ++ ys) := by
  simp [LatestBy.fold, List.foldl_append]

/-! ## Count -/

theorem Count.fold_eq (n : Nat) (xs : List Record) : Count.fold n xs = n + xs.length := by
  induction xs generalizing n with
  | nil => simp [Count.fold]
  | cons x xs ih =>
    simp only [Count.fold, List.foldl_cons, Count.step] at *
    rw [ih]; simp; omega

theorem Count.perm {xs ys : List Record} (h : xs ~ ys) (n : Nat) :
    Count.fold n xs = Count.fold n ys := by
  simp [Count.fold_eq, h.length_eq]

/-- A repeated delivery is counted twice: the store must deduplicate by id. -/
theorem Count.repeats (xs : List Record) : Count.fold 0 (xs ++ xs) = 2 * Count.fold 0 xs := by
  simp [Count.fold_eq]; omega

/-! ## LatestBy: building blocks -/

theorem mem_insertId {x n : Nat} {l : List Nat} : x ∈ insertId n l ↔ x = n ∨ x ∈ l := by
  induction l with
  | nil => simp [insertId]
  | cons m ms ih =>
    simp only [insertId]
    split
    · simp
    · split
      · subst_vars; simp
      · simp only [mem_cons, ih]; grind

theorem sorted_insertId {n : Nat} {l : List Nat} (h : l.Pairwise (· < ·)) :
    (insertId n l).Pairwise (· < ·) := by
  induction l with
  | nil => simp [insertId]
  | cons m ms ih =>
    simp only [insertId]
    rw [pairwise_cons] at h
    split
    · rename_i hlt
      refine pairwise_cons.2 ⟨?_, pairwise_cons.2 h⟩
      intro a ha
      rcases mem_cons.1 ha with rfl | ha
      · exact hlt
      · exact Nat.lt_trans hlt (h.1 a ha)
    · split
      · exact pairwise_cons.2 h
      · refine pairwise_cons.2 ⟨?_, ih h.2⟩
        intro a ha
        rcases mem_insertId.1 ha with rfl | ha
        · omega
        · exact h.1 a ha

theorem mem_insertIds {x : Nat} {ps l : List Nat} :
    x ∈ ps.foldl (fun ns n => insertId n ns) l ↔ x ∈ ps ∨ x ∈ l := by
  induction ps generalizing l with
  | nil => simp
  | cons p ps ih => simp only [foldl_cons, ih, mem_insertId, mem_cons]; grind

theorem sorted_insertIds {ps l : List Nat} (h : l.Pairwise (· < ·)) :
    (ps.foldl (fun ns n => insertId n ns) l).Pairwise (· < ·) := by
  induction ps generalizing l with
  | nil => simpa
  | cons p ps ih => exact ih (sorted_insertId h)

theorem mem_insertRec {x r : Record} {l : List Record} : x ∈ insertRec r l ↔ x = r ∨ x ∈ l := by
  induction l with
  | nil => simp [insertRec]
  | cons h t ih =>
    simp only [insertRec]
    split
    · simp
    · split
      · subst_vars; simp
      · simp only [mem_cons, ih]; grind

theorem sorted_insertRec {r : Record} {l : List Record} (h : l.Pairwise Newer)
    (tot : ∀ x ∈ l, Newer r x ∨ Newer x r ∨ r = x) : (insertRec r l).Pairwise Newer := by
  induction l with
  | nil => simp [insertRec]
  | cons x t ih =>
    simp only [insertRec]
    rw [pairwise_cons] at h
    split
    · rename_i hn
      refine pairwise_cons.2 ⟨?_, pairwise_cons.2 h⟩
      intro a ha
      rcases mem_cons.1 ha with rfl | ha
      · exact hn
      · exact Newer.trans hn (h.1 a ha)
    · split
      · exact pairwise_cons.2 h
      · rename_i hn hne
        have hxr : Newer x r := by
          rcases tot x mem_cons_self with h' | h' | h'
          · exact absurd h' hn
          · exact h'
          · exact absurd h' hne
        refine pairwise_cons.2 ⟨?_, ih h.2 (fun y hy => tot y (mem_cons_of_mem _ hy))⟩
        intro a ha
        rcases mem_insertRec.1 ha with rfl | ha
        · exact hxr
        · exact h.1 a ha

/-! ## LatestBy: what the state means -/

/-- `s` is the state of having folded exactly the records `xs`. -/
structure LatestBy.Inv (s : LatestBy) (xs : List Record) : Prop where
  named_sorted : s.named.Pairwise (· < ·)
  named_mem : ∀ n, n ∈ s.named ↔ ∃ r ∈ xs, n ∈ r.prev
  heads_sorted : s.heads.Pairwise Newer
  heads_mem : ∀ h, h ∈ s.heads ↔ h ∈ xs ∧ ¬ ∃ r ∈ xs, h.id ∈ r.prev

theorem LatestBy.inv_empty : LatestBy.Inv LatestBy.empty [] :=
  ⟨by simp [LatestBy.empty], by simp [LatestBy.empty], by simp [LatestBy.empty], by simp [LatestBy.empty]⟩

theorem LatestBy.inv_step {s : LatestBy} {xs : List Record} {r : Record}
    (hs : LatestBy.Inv s xs) (ha : Addressed (xs ++ [r])) : LatestBy.Inv (s.step r) (xs ++ [r]) := by
  have hnamed : ∀ n, n ∈ (s.step r).named ↔ ∃ q ∈ xs ++ [r], n ∈ q.prev := by
    intro n
    simp only [LatestBy.step, mem_insertIds, hs.named_mem, mem_append, mem_singleton]
    constructor
    · rintro (h | ⟨q, hq, hn⟩)
      · exact ⟨r, Or.inr rfl, h⟩
      · exact ⟨q, Or.inl hq, hn⟩
    · rintro ⟨q, hq | rfl, hn⟩
      · exact Or.inr ⟨q, hq, hn⟩
      · exact Or.inl hn
  -- heads before deciding about `r`
  have hfilt : ∀ h, h ∈ s.heads.filter (fun h => !r.prev.contains h.id) ↔
      h ∈ xs ∧ ¬ ∃ q ∈ xs ++ [r], h.id ∈ q.prev := by
    intro h
    have e : h ∈ s.heads.filter (fun h => !r.prev.contains h.id) ↔ h ∈ s.heads ∧ h.id ∉ r.prev := by
      simp
    rw [e, hs.heads_mem]
    constructor
    · rintro ⟨⟨hx, hn⟩, hr⟩
      refine ⟨hx, ?_⟩
      rintro ⟨q, hq, hq'⟩
      rcases mem_append.1 hq with hq | hq
      · exact hn ⟨q, hq, hq'⟩
      · rw [mem_singleton.1 hq] at hq'; exact hr hq'
    · rintro ⟨hx, hn⟩
      exact ⟨⟨hx, fun ⟨q, hq, hq'⟩ => hn ⟨q, mem_append_left _ hq, hq'⟩⟩,
        fun h' => hn ⟨r, mem_append_right _ (mem_singleton_self _), h'⟩⟩
  have hfsorted : (s.heads.filter (fun h => !r.prev.contains h.id)).Pairwise Newer :=
    hs.heads_sorted.sublist (filter_sublist)
  refine ⟨?_, hnamed, ?_, ?_⟩
  · exact sorted_insertIds hs.named_sorted
  · simp only [LatestBy.step]
    split
    · exact hfsorted
    · apply sorted_insertRec hfsorted
      intro x hx
      have hxs : x ∈ xs := ((hfilt x).1 hx).1
      rcases Newer.total r x with h | h | h
      · exact Or.inl h
      · exact Or.inr (Or.inl h)
      · exact Or.inr (Or.inr (ha r (by simp) x (by simp [hxs]) h))
  · intro h
    have key : (s.step r).heads = if (s.step r).named.contains r.id then
        s.heads.filter (fun h => !r.prev.contains h.id)
      else insertRec r (s.heads.filter (fun h => !r.prev.contains h.id)) := rfl
    rw [key]
    have hc : (s.step r).named.contains r.id = true ↔ ∃ q ∈ xs ++ [r], r.id ∈ q.prev := by
      rw [List.contains_iff_mem]; exact hnamed r.id
    by_cases hrn : (s.step r).named.contains r.id = true
    · rw [ite_eq_left hrn, hfilt]
      constructor
      · rintro ⟨hx, hn⟩; exact ⟨mem_append_left _ hx, hn⟩
      · rintro ⟨hx, hn⟩
        rcases mem_append.1 hx with hx | hx
        · exact ⟨hx, hn⟩
        · have e : h = r := mem_singleton.1 hx
          subst e
          exact absurd (hc.1 hrn) hn
    · rw [ite_eq_right hrn, mem_insertRec, hfilt]
      constructor
      · rintro (heq | ⟨hx, hn⟩)
        · subst heq
          exact ⟨mem_append_right _ (mem_singleton_self _), fun h' => hrn (hc.2 h')⟩
        · exact ⟨mem_append_left _ hx, hn⟩
      · rintro ⟨hx, hn⟩
        rcases mem_append.1 hx with hx | hx
        · exact Or.inr ⟨hx, hn⟩
        · exact Or.inl (mem_singleton.1 hx)

theorem LatestBy.inv_fold {s : LatestBy} {ys : List Record} (xs : List Record)
    (hs : LatestBy.Inv s ys) (ha : Addressed (ys ++ xs)) : LatestBy.Inv (LatestBy.fold s xs) (ys ++ xs) := by
  induction xs generalizing s ys with
  | nil => simpa [LatestBy.fold] using hs
  | cons x xs ih =>
    have ha' : Addressed (ys ++ [x]) := fun a ha₁ b hb₁ => ha a (by simp at ha₁ ⊢; grind) b (by simp at hb₁ ⊢; grind)
    have := ih (LatestBy.inv_step hs ha') (by simpa using ha)
    simpa [LatestBy.fold] using this

/-- Two states that each mean "folded these records" are the same state. -/
theorem LatestBy.inv_ext {s t : LatestBy} {xs ys : List Record}
    (hs : LatestBy.Inv s xs) (ht : LatestBy.Inv t ys) (hset : ∀ r, r ∈ xs ↔ r ∈ ys) : s = t := by
  have hn : s.named = t.named := by
    apply Perm.eq_of_pairwise (le := (· < ·)) (fun a b _ _ h₁ h₂ => by omega)
      hs.named_sorted ht.named_sorted
    apply (perm_ext_iff_of_nodup (hs.named_sorted.imp Nat.ne_of_lt) (ht.named_sorted.imp Nat.ne_of_lt)).2
    intro n; rw [hs.named_mem, ht.named_mem]
    exact ⟨fun ⟨q, hq, h⟩ => ⟨q, (hset q).1 hq, h⟩, fun ⟨q, hq, h⟩ => ⟨q, (hset q).2 hq, h⟩⟩
  have hh : s.heads = t.heads := by
    have ne : ∀ {a b : Record}, Newer a b → a ≠ b := fun h e => by subst e; exact Newer.irrefl _ h
    apply Perm.eq_of_pairwise (le := Newer) (fun a b _ _ h₁ h₂ => absurd h₂ h₁.asymm)
      hs.heads_sorted ht.heads_sorted
    apply (perm_ext_iff_of_nodup (hs.heads_sorted.imp ne) (ht.heads_sorted.imp ne)).2
    intro h; rw [hs.heads_mem, ht.heads_mem, hset]
    constructor
    · rintro ⟨hx, hn⟩; exact ⟨hx, fun ⟨q, hq, h'⟩ => hn ⟨q, (hset q).2 hq, h'⟩⟩
    · rintro ⟨hx, hn⟩; exact ⟨hx, fun ⟨q, hq, h'⟩ => hn ⟨q, (hset q).1 hq, h'⟩⟩
  cases s; cases t; simp_all

/-! ## LatestBy: the set decides -/

theorem LatestBy.set_decides {xs ys : List Record} (hx : Addressed xs) (hy : Addressed ys)
    (hset : ∀ r, r ∈ xs ↔ r ∈ ys) : LatestBy.fold LatestBy.empty xs = LatestBy.fold LatestBy.empty ys :=
  LatestBy.inv_ext (by simpa using LatestBy.inv_fold xs LatestBy.inv_empty (by simpa using hx))
    (by simpa using LatestBy.inv_fold ys LatestBy.inv_empty (by simpa using hy)) hset

/-- Arrival order doesn't matter. -/
theorem LatestBy.perm {xs ys : List Record} (hx : Addressed xs) (h : xs ~ ys) :
    LatestBy.fold LatestBy.empty xs = LatestBy.fold LatestBy.empty ys :=
  LatestBy.set_decides hx (fun a ha b hb => hx a (h.mem_iff.2 ha) b (h.mem_iff.2 hb)) (fun _ => h.mem_iff)

/-- Re-delivering records changes nothing. -/
theorem LatestBy.repeats {xs : List Record} (hx : Addressed xs) :
    LatestBy.fold LatestBy.empty (xs ++ xs) = LatestBy.fold LatestBy.empty xs :=
  LatestBy.set_decides (fun a ha b hb => hx a (by simpa using ha) b (by simpa using hb)) hx (by simp)

/-- Two places that sync in either direction converge. -/
theorem LatestBy.converge {xs ys : List Record} (h : Addressed (xs ++ ys)) :
    LatestBy.fold (LatestBy.fold LatestBy.empty xs) ys = LatestBy.fold (LatestBy.fold LatestBy.empty ys) xs := by
  rw [LatestBy.batch, LatestBy.batch]
  exact LatestBy.perm h perm_append_comm

end Loops
