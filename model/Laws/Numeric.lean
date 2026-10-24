import Loops.Fold
import Laws.Fold

/-!
# Laws of Latest, Sum, Min and Max

* **Latest** inherits Upsert's laws: it is Upsert with a single key.
* **Sum** is order-free and counts repeats, so the store hands each id over
  once. It is exact: over floating point, addition isn't associative and
  the order of arrival would change the total.
* **Min and Max**: the set decides. Order and repeats change nothing.
-/

namespace Loops

open List

/-! ## Latest -/

theorem Latest.perm {xs ys : List Record} (hx : Addressed xs) (h : xs ~ ys) :
    Latest.fold xs = Latest.fold ys := Upsert.perm hx h

theorem Latest.repeats {xs : List Record} (hx : Addressed xs) :
    Latest.fold (xs ++ xs) = Latest.fold xs := Upsert.repeats hx

/-! ## Sum -/

theorem Sum.batch (s : Int) (xs ys : List Record) :
    Sum.fold (Sum.fold s xs) ys = Sum.fold s (xs ++ ys) := by
  simp [Sum.fold, List.foldl_append]

theorem Sum.perm {xs ys : List Record} (h : xs ~ ys) (s : Int) : Sum.fold s xs = Sum.fold s ys :=
  h.foldl_eq' (fun x _ y _ z => by simp only [Sum.step]; omega) s

theorem Sum.fold_eq (s : Int) (xs : List Record) : Sum.fold s xs = s + Sum.fold 0 xs := by
  induction xs generalizing s with
  | nil => simp [Sum.fold]
  | cons x xs ih =>
    simp only [Sum.fold, foldl_cons, Sum.step] at *
    rw [ih, ih (0 + x.n)]; omega

/-- A repeated delivery is added again: the store must deduplicate by id. -/
theorem Sum.repeats (xs : List Record) : Sum.fold 0 (xs ++ xs) = 2 * Sum.fold 0 xs := by
  rw [← Sum.batch, Sum.fold_eq]; omega

/-! ## Max -/

theorem Max.batch (s : Option Int) (xs ys : List Record) :
    Max.fold (Max.fold s xs) ys = Max.fold s (xs ++ ys) := by
  simp [Max.fold, List.foldl_append]

theorem Max.fold_some (a : Int) (xs : List Record) :
    Max.fold (some a) xs = some ((xs.map (·.n)).foldl max a) := by
  induction xs generalizing a with
  | nil => rfl
  | cons x xs ih => exact ih (max a x.n)

/-- Max is the largest value seen, or nothing before the first record. -/
theorem Max.fold_eq (xs : List Record) : Max.fold none xs = (xs.map (·.n)).max? := by
  cases xs with
  | nil => rfl
  | cons x xs => rw [map_cons, max?_cons']; exact Max.fold_some x.n xs

/-- The set decides: the same records, in any order, with any repeats, give the same Max. -/
theorem Max.set_decides {xs ys : List Record} (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    Max.fold none xs = Max.fold none ys := by
  have hv : ∀ v, v ∈ xs.map (·.n) ↔ v ∈ ys.map (·.n) := by
    intro v; simp only [mem_map]
    exact ⟨fun ⟨r, hr, e⟩ => ⟨r, (h r).1 hr, e⟩, fun ⟨r, hr, e⟩ => ⟨r, (h r).2 hr, e⟩⟩
  rw [Max.fold_eq, Max.fold_eq]
  cases hx : (xs.map (·.n)).max? with
  | none =>
    rw [max?_eq_none_iff] at hx
    have : ys.map (·.n) = [] := eq_nil_iff_forall_not_mem.2 fun v hv' => by
      have := (hv v).2 hv'; rw [hx] at this; simp at this
    rw [this]; rfl
  | some a =>
    rw [max?_eq_some_iff] at hx
    symm; rw [max?_eq_some_iff]
    exact ⟨(hv a).1 hx.1, fun b hb => hx.2 b ((hv b).2 hb)⟩

/-! ## Min, by symmetry -/

theorem Min.batch (s : Option Int) (xs ys : List Record) :
    Min.fold (Min.fold s xs) ys = Min.fold s (xs ++ ys) := by
  simp [Min.fold, List.foldl_append]

/-- Min is Max on negated values. -/
theorem Min.neg_max (s : Option Int) (xs : List Record) :
    Min.fold s xs = (Max.fold (s.map (- ·)) (xs.map fun r => { r with n := -r.n })).map (- ·) := by
  induction xs generalizing s with
  | nil => cases s <;> simp [Min.fold, Max.fold]
  | cons x xs ih =>
    have e : Min.fold s (x :: xs) = Min.fold (Min.step s x) xs := rfl
    have e' : ∀ t, Max.fold t ((x :: xs).map fun r => { r with n := -r.n }) =
        Max.fold (Max.step t { x with n := -x.n }) (xs.map fun r => { r with n := -r.n }) := fun _ => rfl
    rw [e, e', ih]
    congr 2
    cases s with
    | none => simp [Min.step, Max.step]
    | some a => simp [Min.step, Max.step]

theorem Min.set_decides {xs ys : List Record} (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    Min.fold none xs = Min.fold none ys := by
  rw [Min.neg_max, Min.neg_max]
  congr 1
  apply Max.set_decides
  intro r
  simp only [mem_map]
  constructor
  · rintro ⟨q, hq, rfl⟩; exact ⟨q, (h q).1 hq, rfl⟩
  · rintro ⟨q, hq, rfl⟩; exact ⟨q, (h q).2 hq, rfl⟩

end Loops
