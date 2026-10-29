import Proposals.AsOf
import Laws.Spec

/-!
# Laws of proposed as-of selection

Narrowing preserves selected membership. This claim does not apply to admitted records, heads, or aggregate values.
-/

namespace Loops.Proposals.AsOf

open List

@[simp] theorem before_none (moment : Moment) : before none moment = true := rfl

@[simp] theorem before_some (cut moment : Moment) :
    before (some cut) moment = true ↔ moment ≤ cut := by
  simp [before]

@[simp] theorem accepts_no_cut (r : Record) : accepts {} r = true := rfl

@[simp] theorem select_no_cut (xs : List Record) : select {} xs = xs := by
  simp [select]

@[simp] theorem input_no_cut (xs : List Record) : input {} xs = settle xs := by
  simp [input]

@[simp] theorem run_no_cut (sp : Spec) (xs : List Record)
    (may : Record → Record → Bool) : run {} sp xs may = sp.run (settle xs) may := by
  simp [run]

theorem mem_select {cuts : Cuts} {xs : List Record} {r : Record} :
    r ∈ select cuts xs ↔ r ∈ xs ∧ accepts cuts r = true := mem_filter

theorem mem_input {cuts : Cuts} {xs : List Record} {r : Record} :
    r ∈ input cuts xs ↔ r ∈ settle xs ∧ accepts cuts r = true := mem_select

theorem before_mono {narrow wide : Option Moment} (h : CutNarrower narrow wide)
    {moment : Moment} (hm : before narrow moment = true) : before wide moment = true := by
  cases wide with
  | none => rfl
  | some wide =>
    cases narrow with
    | none => exact False.elim h
    | some narrow =>
      exact (before_some wide moment).2 (List.le_trans ((before_some narrow moment).1 hm) h)

theorem accepts_mono {narrow wide : Cuts} (h : Narrower narrow wide) {r : Record}
    (hr : accepts narrow r = true) : accepts wide r = true := by
  simp only [accepts, Bool.and_eq_true] at hr ⊢
  exact ⟨before_mono h.1 hr.1, before_mono h.2 hr.2⟩

/-- Narrowing keeps only members of the wider raw selection. -/
theorem select_mono {narrow wide : Cuts} (h : Narrower narrow wide) (xs : List Record) :
    select narrow xs ⊆ select wide xs := by
  intro r hr
  obtain ⟨hx, ha⟩ := mem_select.1 hr
  exact mem_select.2 ⟨hx, accepts_mono h ha⟩

/-- Narrowing keeps only members of the wider settled input. -/
theorem input_mono {narrow wide : Cuts} (h : Narrower narrow wide) (xs : List Record) :
    input narrow xs ⊆ input wide xs := select_mono h (settle xs)

@[simp] theorem select_idempotent (cuts : Cuts) (xs : List Record) :
    select cuts (select cuts xs) = select cuts xs := by
  simp [select, filter_filter]

/-- Raw selection preserves list permutations, including repeated forms. -/
theorem select_perm (cuts : Cuts) {xs ys : List Record} (h : xs ~ ys) :
    select cuts xs ~ select cuts ys := h.filter (accepts cuts)

theorem before_meetCut (a b : Option Moment) (moment : Moment) :
    before (meetCut a b) moment = (before a moment && before b moment) := by
  cases a with
  | none => simp [meetCut, before]
  | some a =>
    cases b with
    | none => simp [meetCut, before]
    | some b =>
      apply Bool.eq_iff_iff.2
      by_cases hab : a ≤ b
      · simp only [meetCut, hab, ↓reduceIte, before_some, Bool.and_eq_true]
        exact ⟨fun h => ⟨h, List.le_trans h hab⟩, fun h => h.1⟩
      · have hba : b ≤ a := (List.le_total a b).resolve_left hab
        simp only [meetCut, hab, ↓reduceIte, before_some, Bool.and_eq_true]
        exact ⟨fun h => ⟨List.le_trans h hba, h⟩, fun h => h.2⟩

theorem accepts_meet (a b : Cuts) (r : Record) :
    accepts (meet a b) r = (accepts a r && accepts b r) := by
  simp only [accepts, meet, before_meetCut]
  cases before a.emittedThrough r.emitted.moment <;>
    cases before b.emittedThrough r.emitted.moment <;>
    cases before a.occurredThrough r.span.start <;>
    cases before b.occurredThrough r.span.start <;> rfl

/-- Coordinate cut composition filters without settling again. -/
theorem select_compose (a b : Cuts) (xs : List Record) :
    select a (select b xs) = select (meet a b) xs := by
  simp only [select, filter_filter]
  exact filter_congr fun r _ => (accepts_meet a b r).symm

theorem input_compose (a b : Cuts) (xs : List Record) :
    select a (input b xs) = input (meet a b) xs := select_compose a b (settle xs)

/-- The same form sets give the same input under the existing form premise. -/
theorem input_eq (cuts : Cuts) {xs ys : List Record} (hF : Forms xs)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : input cuts xs = input cuts ys := by
  unfold input
  rw [settle_eq hF h]

theorem run_eq (cuts : Cuts) (sp : Spec) {xs ys : List Record} (hF : Forms xs)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) (may : Record → Record → Bool) :
    run cuts sp xs may = run cuts sp ys may := by
  unfold run
  rw [input_eq cuts hF h]

theorem input_perm (cuts : Cuts) {xs ys : List Record} (hF : Forms xs) (h : xs ~ ys) :
    input cuts xs = input cuts ys := input_eq cuts hF (fun _ => h.mem_iff)

theorem run_perm (cuts : Cuts) (sp : Spec) {xs ys : List Record} (hF : Forms xs)
    (h : xs ~ ys) (may : Record → Record → Bool) :
    run cuts sp xs may = run cuts sp ys may := run_eq cuts sp hF (fun _ => h.mem_iff) may

/-- A held eraser keeps a selected record erased, even when the eraser fails a cutoff. -/
theorem input_erased (cuts : Cuts) {xs : List Record} {e r : Record}
    (he : e ∈ xs) (ht : r.id ∈ e.erases) (hr : r ∈ input cuts xs) :
    r.shown = .erased := by
  apply settle_erased (xs := xs) (i := r.id) ?_ (mem_input.1 hr).1 rfl
  exact any_eq_true.2 ⟨e, he, contains_iff_mem.2 ht⟩

end Loops.Proposals.AsOf
