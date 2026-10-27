import Loops.Families
import Laws.Fold
import Laws.Numeric

/-!
# Laws of the two families

* **Distinct input.** A fold is handed each id once. The realm's union of
  several places is `dedup`, and it doesn't matter which place is read first.
* **Accumulating folds: the set decides.** Any step that commutes gives the
  same state for the same set, and a late record folds onto the cached state.
* **Folds over heads: the set decides.** Any answer worked out from LatestBy's
  state inherits `LatestBy.set_decides`.
* **Why there are two.** A bounded state can't follow `prev`: Max can't be
  kept current over heads from its own state.
* **No false resurrection.** A view folds to the same heads, so withholding or
  erasing a payload never makes a superseded record current.
* **Honest results.** A view only loses information: a `where` answer stays
  the same or becomes unknown. With every payload here, nothing is unread.
-/

namespace Loops

open List

/-! ## Distinct input -/

theorem Distinct.nodup {xs : List Record} (h : Distinct xs) : xs.Nodup :=
  Pairwise.of_map _ (fun _ _ hne e => hne (by rw [e])) h

theorem Distinct.addressed {xs : List Record} (h : Distinct xs) : Addressed xs := by
  induction xs with
  | nil => simp [Addressed]
  | cons x xs ih =>
    unfold Distinct at h
    simp only [map_cons, nodup_cons, mem_map] at h
    intro a ha b hb e
    simp only [mem_cons] at ha hb
    rcases ha with rfl | ha <;> rcases hb with rfl | hb
    · rfl
    · exact absurd ⟨b, hb, e.symm⟩ h.1
    · exact absurd ⟨a, ha, e⟩ h.1
    · exact ih h.2 a ha b hb e

/-- Two distinct lists with the same members are the same set, in some order. -/
theorem perm_of_same {xs ys : List Record} (hx : Distinct xs) (hy : Distinct ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : xs ~ ys :=
  (perm_ext_iff_of_nodup hx.nodup hy.nodup).2 h

theorem mem_dedup_sub {r : Record} : ∀ {xs : List Record}, r ∈ dedup xs → r ∈ xs
  | [], h => by simp [dedup] at h
  | x :: xs, h => by
    simp only [dedup] at h
    split at h
    · exact mem_cons_of_mem _ (mem_dedup_sub h)
    · rcases mem_cons.1 h with h | h
      · rw [h]; exact mem_cons_self
      · exact mem_cons_of_mem _ (mem_dedup_sub h)

theorem mem_dedup {xs : List Record} (ha : Addressed xs) {r : Record} :
    r ∈ dedup xs ↔ r ∈ xs := by
  induction xs with
  | nil => simp [dedup]
  | cons x xs ih =>
    have ha' : Addressed xs := fun a h₁ b h₂ =>
      ha a (mem_cons_of_mem _ h₁) b (mem_cons_of_mem _ h₂)
    simp only [dedup]
    split
    · rename_i hany
      rw [ih ha']
      refine ⟨mem_cons_of_mem _, fun h => ?_⟩
      rcases mem_cons.1 h with h | h
      · obtain ⟨y, hy, e⟩ := List.any_eq_true.1 hany
        have hyx : y = x := ha y (mem_cons_of_mem _ hy) x mem_cons_self (by simpa using e)
        rw [h, ← hyx]; exact hy
      · exact h
    · simp only [mem_cons, ih ha']

theorem distinct_dedup : ∀ xs : List Record, Distinct (dedup xs)
  | [] => by simp [Distinct, dedup]
  | x :: xs => by
    unfold dedup
    split
    · exact distinct_dedup xs
    · rename_i hany
      unfold Distinct
      rw [map_cons, nodup_cons]
      refine ⟨fun hm => ?_, distinct_dedup xs⟩
      obtain ⟨y, hy, e⟩ := mem_map.1 hm
      exact hany (List.any_eq_true.2 ⟨y, mem_dedup_sub hy, by simp [e]⟩)

/-- The realm's union doesn't depend on which place is read first. -/
theorem dedup_union {xs ys : List Record} (ha : Addressed (xs ++ ys)) :
    dedup (xs ++ ys) ~ dedup (ys ++ xs) := by
  have hb : Addressed (ys ++ xs) := fun a h₁ b h₂ =>
    ha a (by simp only [mem_append] at h₁ ⊢; exact h₁.symm) b
      (by simp only [mem_append] at h₂ ⊢; exact h₂.symm)
  apply perm_of_same (distinct_dedup _) (distinct_dedup _)
  intro r
  rw [mem_dedup ha, mem_dedup hb, mem_append, mem_append]
  exact Or.comm

/-! ## Accumulating folds -/

theorem Acc.perm {σ} (f : Acc σ) {xs ys : List Record} (h : xs ~ ys) : f.fold xs = f.fold ys :=
  h.foldl_eq' (fun x _ y _ z => f.comm z x y) f.init

/-- The set decides, for every accumulating fold. -/
theorem Acc.set_decides {σ} (f : Acc σ) {xs ys : List Record} (hx : Distinct xs)
    (hy : Distinct ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) : f.fold xs = f.fold ys :=
  f.perm (perm_of_same hx hy h)

/-- A late record folds onto the cached state: no refold, no rewind. -/
theorem Acc.late {σ} (f : Acc σ) {xs ys : List Record} (r : Record)
    (hx : Distinct (xs ++ [r])) (hy : Distinct ys) (h : ∀ q, q ∈ ys ↔ q ∈ xs ∨ q = r) :
    f.step (f.fold xs) r = f.fold ys := by
  have e : f.step (f.fold xs) r = f.fold (xs ++ [r]) := by simp [Acc.fold, foldl_append]
  rw [e]
  exact f.set_decides hx hy fun q => by rw [h]; simp

theorem Count.acc_fold (xs : List Record) : Count.acc.fold xs = Count.fold 0 xs := rfl
theorem Sum.acc_fold (xs : List Record) : Sum.acc.fold xs = Sum.fold 0 xs := rfl
theorem Max.acc_fold (xs : List Record) : Max.acc.fold xs = Max.fold none xs := rfl
theorem Min.acc_fold (xs : List Record) : Min.acc.fold xs = Min.fold none xs := rfl

/-! ## Folds over heads -/

/-- The set decides, for every answer worked out from the heads. -/
theorem OverHeads.set_decides {σ} (answer : LatestBy → σ) {xs ys : List Record}
    (hx : Addressed xs) (hy : Addressed ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    OverHeads.fold answer xs = OverHeads.fold answer ys := by
  unfold OverHeads.fold
  rw [LatestBy.set_decides hx hy h]

/-- A late record folds onto the cached heads. -/
theorem OverHeads.late {σ} (answer : LatestBy → σ) {xs ys : List Record} (r : Record)
    (hx : Addressed (xs ++ [r])) (hy : Addressed ys) (h : ∀ q, q ∈ ys ↔ q ∈ xs ∨ q = r) :
    answer ((LatestBy.fold .empty xs).step r) = OverHeads.fold answer ys := by
  have e : (LatestBy.fold .empty xs).step r = LatestBy.fold .empty (xs ++ [r]) := by
    rw [← LatestBy.batch]; rfl
  rw [e]
  exact OverHeads.set_decides answer hx hy fun q => by rw [h]; simp

/-! ## Why there are two families -/

def cx.a : Record :=
  { id := 1, kind := "load", about := ["k1"], value := "", prev := [], emitted := default, n := 5 }
def cx.b : Record :=
  { id := 2, kind := "load", about := ["k2"], value := "", prev := [], emitted := default, n := 9 }
def cx.c : Record :=
  { id := 3, kind := "load", about := ["k2"], value := "", prev := [2], emitted := default, n := 1 }

/-- Max can't follow `prev`. Max holds 9 after `[a, b]` and after
`[b]`, but once `c` supersedes `b`, the current maximum is 5 in one history and
1 in the other. No step from Max's state can know which. -/
theorem Max.cannot_follow_prev :
    ¬ ∃ g : Option Int → Record → Option Int, ∀ xs r, Distinct (xs ++ [r]) →
      g (Max.fold none xs) r = (OverHeads.fold LatestBy.maxHeads (xs ++ [r])).value := by
  rintro ⟨g, hg⟩
  have h₁ := hg [cx.a, cx.b] cx.c (by unfold Distinct; decide)
  have h₂ := hg [cx.b] cx.c (by unfold Distinct; decide)
  have e : Max.fold none [cx.a, cx.b] = Max.fold none [cx.b] := by decide
  rw [e, h₂] at h₁
  exact absurd h₁ (by decide)

/-! ## Views: no false resurrection -/

theorem View.newer {f : Record → Record} (hf : View f) {a b : Record} :
    Newer (f a) (f b) ↔ Newer a b := by
  have ea := hf.envelope a
  have eb := hf.envelope b
  unfold Newer Record.span
  rw [ea.id, ea.occurred, ea.emitted, eb.id, eb.occurred, eb.emitted]

theorem View.addressed {f : Record → Record} (hf : View f) {xs : List Record}
    (hx : Addressed xs) : Addressed (xs.map f) := by
  intro a' ha' b' hb' e
  obtain ⟨a, ha, rfl⟩ := mem_map.1 ha'
  obtain ⟨b, hb, rfl⟩ := mem_map.1 hb'
  rw [(hf.envelope a).id, (hf.envelope b).id] at e
  rw [hx a ha b hb e]

theorem SameEnvelope.refl (r : Record) : SameEnvelope r r := ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

theorem SameEnvelope.symm {a b : Record} (h : SameEnvelope a b) : SameEnvelope b a :=
  ⟨h.id.symm, h.kind.symm, h.observer.symm, h.about.symm, h.prev.symm, h.occurred.symm,
    h.emitted.symm, h.erases.symm⟩

theorem SameEnvelope.trans {a b c : Record} (h : SameEnvelope a b) (h' : SameEnvelope b c) :
    SameEnvelope a c :=
  ⟨h.id.trans h'.id, h.kind.trans h'.kind, h.observer.trans h'.observer, h.about.trans h'.about,
    h.prev.trans h'.prev, h.occurred.trans h'.occurred, h.emitted.trans h'.emitted,
    h.erases.trans h'.erases⟩

theorem withhold_envelope (r : Record) : SameEnvelope r.withhold r :=
  ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

theorem erase_envelope (r : Record) : SameEnvelope r.erase r :=
  ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

theorem withholding_view (p : Record → Bool) : View (withholding p) where
  envelope r := by
    unfold withholding; split
    · exact withhold_envelope r
    · exact SameEnvelope.refl r
  hides r := by unfold withholding; split <;> simp [Record.withhold]

theorem erase_view : View Record.erase where
  envelope r := erase_envelope r
  hides r := by simp [Record.erase]

theorem LatestBy.inv_of {xs : List Record} (hx : Addressed xs) :
    LatestBy.Inv (LatestBy.fold .empty xs) xs := by
  simpa using LatestBy.inv_fold xs LatestBy.inv_empty (by simpa using hx)

/-- The winner is a head, and newer than every other head. -/
theorem LatestBy.winner_newer {xs : List Record} (hx : Addressed xs) {w : Record}
    (hw : (LatestBy.fold .empty xs).winner = some w) :
    (w ∈ xs ∧ ¬ ∃ r ∈ xs, w.id ∈ r.prev) ∧ ∀ o ∈ (LatestBy.fold .empty xs).others, Newer w o := by
  have inv := LatestBy.inv_of hx
  unfold LatestBy.winner at hw
  unfold LatestBy.others
  cases hh : (LatestBy.fold .empty xs).heads with
  | nil => simp [hh] at hw
  | cons h t =>
    simp only [hh, List.head?_cons, Option.some.injEq] at hw
    subst hw
    have hsort := hh ▸ inv.heads_sorted
    rw [List.pairwise_cons] at hsort
    exact ⟨(inv.heads_mem h).1 (by simp [hh]), fun o ho => hsort.1 o (by simpa using ho)⟩

/-- A view folds to the same `prev` bookkeeping and the same heads, with their
payloads hidden as the view hides them. -/
theorem LatestBy.view {f : Record → Record} (hf : View f) {xs : List Record}
    (hx : Addressed xs) :
    LatestBy.fold .empty (xs.map f) =
      ⟨(LatestBy.fold .empty xs).named, (LatestBy.fold .empty xs).heads.map f⟩ := by
  have hs := LatestBy.inv_of hx
  have ht := LatestBy.inv_of (hf.addressed hx)
  have prev_eq : ∀ r, (f r).prev = r.prev := fun r => (hf.envelope r).prev
  have id_eq : ∀ r, (f r).id = r.id := fun r => (hf.envelope r).id
  refine LatestBy.inv_ext ht ⟨hs.named_sorted, ?_, ?_, ?_⟩ fun _ => Iff.rfl
  · intro n
    rw [hs.named_mem]
    simp only [mem_map]
    constructor
    · rintro ⟨r, hr, hn⟩; exact ⟨f r, ⟨r, hr, rfl⟩, by rw [prev_eq]; exact hn⟩
    · rintro ⟨_, ⟨r, hr, rfl⟩, hn⟩; exact ⟨r, hr, by rw [← prev_eq]; exact hn⟩
  · exact pairwise_map.2 (hs.heads_sorted.imp fun h => hf.newer.2 h)
  · intro h
    simp only [mem_map]
    constructor
    · rintro ⟨g, hg, rfl⟩
      obtain ⟨hgx, hn⟩ := (hs.heads_mem g).1 hg
      refine ⟨⟨g, hgx, rfl⟩, ?_⟩
      rintro ⟨_, ⟨q, hq, rfl⟩, hq'⟩
      rw [prev_eq, id_eq] at hq'
      exact hn ⟨q, hq, hq'⟩
    · rintro ⟨⟨g, hgx, rfl⟩, hn⟩
      refine ⟨g, (hs.heads_mem g).2 ⟨hgx, ?_⟩, rfl⟩
      rintro ⟨q, hq, hq'⟩
      exact hn ⟨f q, ⟨q, hq, rfl⟩, by rw [prev_eq, id_eq]; exact hq'⟩

/-- Every view sees the same records as heads, whatever it can read of them. -/
theorem LatestBy.view_head_ids {f : Record → Record} (hf : View f) {xs : List Record}
    (hx : Addressed xs) :
    (LatestBy.fold .empty (xs.map f)).heads.map (·.id) =
      (LatestBy.fold .empty xs).heads.map (·.id) := by
  rw [LatestBy.view hf hx, map_map]
  exact map_congr_left fun r _ => (hf.envelope r).id

/-- No false resurrection: a record something supersedes is never a head, in
any view. -/
theorem LatestBy.no_false_resurrection {f : Record → Record} (hf : View f)
    {xs : List Record} (hx : Addressed xs) {r q : Record} (hq : q ∈ xs) (hr : r.id ∈ q.prev) :
    ∀ h ∈ (LatestBy.fold .empty (xs.map f)).heads, h.id ≠ r.id := by
  intro h hh e
  rw [LatestBy.view hf hx] at hh
  obtain ⟨g, hg, rfl⟩ := mem_map.1 hh
  obtain ⟨-, hn⟩ := ((LatestBy.inv_of hx).heads_mem g).1 hg
  rw [(hf.envelope g).id] at e
  exact hn ⟨q, hq, e ▸ hr⟩

/-! ## Honest results -/

/-- A view only loses information: each `where` answer stays or becomes unknown. -/
theorem Where.eval_view {f : Record → Record} (hf : View f) (w : Where) (r : Record) :
    (w.eval (f r)).Refines (w.eval r) := by
  cases w with
  | envelope t only => exact Or.inr (by simp [Where.eval, only _ _ (hf.envelope r)])
  | payload t =>
    rcases hf.hides r with e | e
    · exact Or.inr (by rw [e])
    · exact Or.inl (by simp [Where.eval, e])

theorem Where.eval_here (w : Where) {r : Record} (h : r.shown = .here) :
    w.eval r ≠ .unknown := by
  cases w <;> simp [Where.eval, Tri.ofBool, h] <;> split <;> simp

/-- When the test answers for every record and the fold can read every
record, nothing is unread and the result is the plain fold of what is
selected. -/
theorem Acc.select_full {σ} (f : Acc σ) (ev : Record → Tri) {xs : List Record}
    (hev : ∀ r ∈ xs, ev r ≠ .unknown) (hr : ∀ r ∈ xs, f.readable r = true) :
    f.select ev xs = ⟨f.fold (xs.filter (ev · == .yes)), 0⟩ := by
  simp only [Acc.select, Result.mk.injEq]
  refine ⟨by rw [filter_eq_self.2 fun r h => hr r (mem_filter.1 h).1], ?_⟩
  rw [filter_eq_nil_iff.2, filter_eq_nil_iff.2]
  · rfl
  · intro r h; simp [hr r (mem_filter.1 h).1]
  · intro r h; simpa using hev r h

/-- With every payload here, a `where` test answers for every record. -/
theorem Acc.select_here {σ} (f : Acc σ) (w : Where) {xs : List Record}
    (h : ∀ r ∈ xs, r.shown = .here) (hr : ∀ r ∈ xs, f.readable r = true) :
    f.select w.eval xs = ⟨f.fold (xs.filter (w.eval · == .yes)), 0⟩ :=
  f.select_full w.eval (fun r hx => w.eval_here (h r hx)) hr

/-- The set decides, for a selection too: what is read and what is unread. -/
theorem Acc.select_set_decides {σ} (f : Acc σ) (ev : Record → Tri) {xs ys : List Record}
    (hx : Distinct xs) (hy : Distinct ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    f.select ev xs = f.select ev ys := by
  have p := perm_of_same hx hy h
  simp only [Acc.select]
  rw [f.perm (((p.filter _).filter _)), (p.filter _).length_eq,
    ((p.filter _).filter _).length_eq]

/-- Max over heads counts the heads a view hides. -/
theorem LatestBy.maxHeads_view {f : Record → Record} (hf : View f) {xs : List Record}
    (hx : Addressed xs) :
    (OverHeads.fold LatestBy.maxHeads (xs.map f)).unread =
      ((LatestBy.fold .empty xs).heads.filter fun h => (f h).shown != .here).length := by
  simp only [OverHeads.fold, LatestBy.maxHeads, LatestBy.view hf hx, filter_map, length_map]
  rfl

end Loops
