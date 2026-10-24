import Loops.Spec
import Laws.Families

/-!
# Laws of the spec

* **Operators.** `not` is the complement of `is` and `absent` of `present`;
  on a number exactly one of `at-least` and `below` holds, and on anything
  else neither does.
* **Totality.** A test answers for every record whose payload is here; a
  test on the envelope answers for every record.
* **A `where` map is a set of tests.** Their order never matters.
* **Views only lose information.** Under a view each test, and each `where`
  map, keeps its answer or becomes unknown. Selection by `from` reads only
  envelopes, so a view selects the same records.
* **The set decides, for every spec.** Every slot gives the same value for
  the same set of records.
* **No false resurrection, in a slot.** A latest-by slot under a view folds
  to the full reader's heads, with payloads hidden.
-/

namespace Loops

open List

/-! ## Operators -/

theorem Op.not_is (v : Val) (x : Option Val) : (Op.not v).test x = !(Op.is v).test x := rfl

theorem Op.absent_present (x : Option Val) : Op.absent.test x = !Op.present.test x := by
  cases x <;> rfl

theorem Op.atLeast_below (i j : Int) :
    (Op.atLeast i).test (some (.int j)) = !(Op.below i).test (some (.int j)) := by
  simp only [Op.test, decide_eq_decide, ← decide_not]
  omega

/-- `at-least` and `below` hold only for numbers. -/
theorem Op.ordered_numbers_only (i : Int) {x : Option Val} (h : ∀ j, x ≠ some (.int j)) :
    (Op.atLeast i).test x = false ∧ (Op.below i).test x = false := by
  rcases x with _ | (s | j | b)
  · exact ⟨rfl, rfl⟩
  · exact ⟨rfl, rfl⟩
  · exact absurd rfl (h j)
  · exact ⟨rfl, rfl⟩

/-! ## Totality -/

theorem Tri.ofBool_ne (b : Bool) : Tri.ofBool b ≠ .unknown := by cases b <;> decide

/-- A test answers for every record whose payload is here. -/
theorem Cond.eval_here (c : Cond) {r : Record} (h : r.shown = .here) : c.eval r ≠ .unknown := by
  unfold Cond.eval
  split
  · exact Tri.ofBool_ne _
  · rename_i hf
    cases hc : c.field <;> simp [hc, Field.read, h] at hf

/-- A test on the envelope answers for every record. -/
theorem Cond.eval_envelope (c : Cond) (h : c.field.onEnvelope = true) (r : Record) :
    c.eval r ≠ .unknown := by
  unfold Cond.eval
  split
  · exact Tri.ofBool_ne _
  · rename_i hf
    cases hc : c.field <;> simp [hc, Field.read, Field.onEnvelope] at hf h

/-! ## `where` maps -/

theorem Tri.and_left_comm (a b c : Tri) : a.and (b.and c) = b.and (a.and c) := by
  cases a <;> cases b <;> cases c <;> rfl

/-- A `where` map's tests can come in any order. -/
theorem Cond.all_perm {cs ds : List Cond} (h : cs ~ ds) (r : Record) :
    Cond.all cs r = Cond.all ds r := by
  unfold Cond.all
  exact h.foldr_eq' (fun x _ y _ z => Tri.and_left_comm (y.eval r) (x.eval r) z) .yes

/-- Kleene's and is monotone: less information in, less information out. -/
theorem Tri.and_refines {a a' b b' : Tri} (ha : a.Refines a') (hb : b.Refines b') :
    (a.and b).Refines (a'.and b') := by
  revert ha hb
  unfold Tri.Refines
  cases a <;> cases a' <;> cases b <;> cases b' <;> decide

/-! ## Views -/

theorem Cond.eval_view {f : Record → Record} (hf : View f) (c : Cond) (r : Record) :
    (c.eval (f r)).Refines (c.eval r) := by
  obtain ⟨-, hk, ha, -, -, -⟩ := hf.envelope r
  rcases c with ⟨fld, op⟩
  cases fld with
  | kind => exact Or.inr (by simp [Cond.eval, Field.read, hk])
  | about => exact Or.inr (by simp [Cond.eval, Field.read, ha])
  | payload n =>
    rcases hf.hides r with e | e
    · exact Or.inr (by rw [e])
    · exact Or.inl (by simp [Cond.eval, Field.read, e])

/-- Under a view a `where` map keeps its answer or becomes unknown. -/
theorem Cond.all_view {f : Record → Record} (hf : View f) (cs : List Cond) (r : Record) :
    (Cond.all cs (f r)).Refines (Cond.all cs r) := by
  induction cs with
  | nil => exact Or.inr rfl
  | cons c cs ih => exact Tri.and_refines (c.eval_view hf r) ih

/-- Tests on the envelope answer the same under any view. -/
theorem Cond.all_envelope_view {f : Record → Record} (hf : View f) {cs : List Cond}
    (h : ∀ c ∈ cs, c.field.onEnvelope = true) (r : Record) :
    Cond.all cs (f r) = Cond.all cs r := by
  induction cs with
  | nil => rfl
  | cons c cs ih =>
    have hc : c.eval (f r) = c.eval r := by
      rcases c.eval_view hf r with e | e
      · exact absurd e (c.eval_envelope (h c mem_cons_self) _)
      · exact e
    show (c.eval (f r)).and (Cond.all cs (f r)) = (c.eval r).and (Cond.all cs r)
    rw [hc, ih fun d hd => h d (mem_cons_of_mem _ hd)]

theorem Source.takes_view {f : Record → Record} (hf : View f) (s : Source) (r : Record) :
    s.takes (f r) = s.takes r := by
  obtain ⟨-, hk, ha, -, -, -⟩ := hf.envelope r
  simp [Source.takes, hk, ha]

/-- Selection reads only envelopes: a view selects the same records. -/
theorem Spec.select_view {f : Record → Record} (hf : View f) (sp : Spec) (xs : List Record) :
    sp.select (xs.map f) = (sp.select xs).map f := by
  simp only [Spec.select, filter_map]
  congr 1
  apply filter_congr
  intro r _
  simp [Function.comp, Source.takes_view hf]

/-! ## The set decides, for every spec -/

theorem Distinct.filter {xs : List Record} (p : Record → Bool) (h : Distinct xs) :
    Distinct (xs.filter p) :=
  Nodup.sublist ((filter_sublist).map _) h

theorem headsInput_addressed (cs : List Cond) (follow : Bool) {xs : List Record}
    (hx : Distinct xs) : Addressed (headsInput cs follow xs) := by
  have hf := (hx.filter (Cond.all (cs.filter (·.field.onEnvelope)) · == .yes)).addressed
  unfold headsInput
  split
  · exact hf
  · intro a' ha' b' hb' e
    obtain ⟨a, ha, rfl⟩ := mem_map.1 ha'
    obtain ⟨b, hb, rfl⟩ := mem_map.1 hb'
    rw [hf a ha b hb e]

theorem mem_headsInput (cs : List Cond) (follow : Bool) {xs ys : List Record}
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) (r : Record) :
    r ∈ headsInput cs follow xs ↔ r ∈ headsInput cs follow ys := by
  unfold headsInput
  split <;> simp [mem_filter, mem_map, h]

theorem headsOf_set_decides (cs : List Cond) (follow : Bool) (limit : Option Nat)
    {xs ys : List Record} (hx : Distinct xs) (hy : Distinct ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    headsOf cs follow limit xs = headsOf cs follow limit ys := by
  have e : LatestBy.fold .empty (headsInput cs follow xs) =
      LatestBy.fold .empty (headsInput cs follow ys) :=
    LatestBy.set_decides (headsInput_addressed cs follow hx) (headsInput_addressed cs follow hy)
      (mem_headsInput cs follow h)
  simp only [headsOf, e]

/-- Every slot gives the same value for the same set of records. -/
theorem Slot.set_decides (s : Slot) {xs ys : List Record} (hx : Distinct xs) (hy : Distinct ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : s.run xs = s.run ys := by
  unfold Slot.run
  split
  · rw [Acc.select_set_decides _ _ hx hy h]
  · rw [Acc.select_set_decides _ _ hx hy h]
  · rw [Acc.select_set_decides _ _ hx hy h]
  · rw [Acc.select_set_decides _ _ hx hy h]
  · exact headsOf_set_decides _ _ _ hx hy h
  · exact headsOf_set_decides _ _ _ hx hy h

/-- The set decides, for every spec. -/
theorem Spec.set_decides (sp : Spec) {xs ys : List Record} (hx : Distinct xs) (hy : Distinct ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : sp.run xs = sp.run ys := by
  have hs : ∀ r, r ∈ sp.select xs ↔ r ∈ sp.select ys := fun r => by simp [Spec.select, h]
  unfold Spec.run
  exact map_congr_left fun s _ => by
    rw [s.set_decides (xs := sp.select xs) (ys := sp.select ys) (hx.filter _) (hy.filter _) hs]

/-! ## No false resurrection, in a slot -/

theorem headsInput_view {f : Record → Record} (hf : View f) (cs : List Cond)
    (xs : List Record) : headsInput cs true (xs.map f) = (headsInput cs true xs).map f := by
  simp only [headsInput, ↓reduceIte, filter_map]
  congr 1
  apply filter_congr
  intro r _
  simp only [Function.comp]
  rw [Cond.all_envelope_view hf (fun c hc => (mem_filter.1 hc).2)]

/-- A latest-by slot under a view folds to the full reader's state, with
payloads hidden: withholding never brings back what was superseded. -/
theorem headsOf_view {f : Record → Record} (hf : View f) (cs : List Cond) {xs : List Record}
    (hx : Distinct xs) :
    LatestBy.fold .empty (headsInput cs true (xs.map f)) =
      ⟨(LatestBy.fold .empty (headsInput cs true xs)).named,
        (LatestBy.fold .empty (headsInput cs true xs)).heads.map f⟩ := by
  rw [headsInput_view hf]
  exact LatestBy.view hf (headsInput_addressed cs true hx)

end Loops
