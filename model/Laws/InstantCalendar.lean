import Laws.Time
import Laws.TextRadix

namespace Loops

private theorem dayNumber_year_step (y : Nat) :
    dayNumber (y + 1) 1 1 = dayNumber y 1 1 + (if leap y then 366 else 365) := by
  simp only [dayNumber, List.range_zero, List.map_nil, List.sum_nil, Nat.sub_self, Nat.add_zero]
  unfold leapsBefore leap
  split <;> simp_all <;> omega

private theorem calendar_year_bounds {y m d : Nat}
    (hm : 1 ≤ m ∧ m ≤ 12) (hd : 1 ≤ d ∧ d ≤ daysIn y m) :
    dayNumber y 1 1 ≤ dayNumber y m d ∧ dayNumber y m d < dayNumber (y + 1) 1 1 := by
  rw [dayNumber_year_step]
  have hms : m = 1 ∨ m = 2 ∨ m = 3 ∨ m = 4 ∨ m = 5 ∨ m = 6 ∨ m = 7 ∨ m = 8 ∨ m = 9 ∨ m = 10 ∨ m = 11 ∨ m = 12 := by omega
  rcases hms with rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl
  all_goals cases hl : leap y <;> simp [dayNumber, daysIn, List.range_succ, hl] at * <;> omega

set_option maxHeartbeats 4000000 in
theorem instant_calendar_injective {y m d y' m' d' : Nat}
    (hm : 1 ≤ m ∧ m ≤ 12) (hd : 1 ≤ d ∧ d ≤ daysIn y m)
    (hm' : 1 ≤ m' ∧ m' ≤ 12) (hd' : 1 ≤ d' ∧ d' ≤ daysIn y' m')
    (he : dayNumber y m d = dayNumber y' m' d') : y = y' ∧ m = m' ∧ d = d' := by
  have hy := calendar_year_bounds hm hd
  have hy' := calendar_year_bounds hm' hd'
  have yeq : y = y' := by
    apply Classical.byContradiction
    intro hn
    have h : y < y' ∨ y' < y := by omega
    rcases h with h | h
    · have hstart : dayNumber (y + 1) 1 1 ≤ dayNumber y' 1 1 := by
        by_cases he : y + 1 = y'
        · simp [he]
        · have := dayNumber_year_lt (by omega : y + 1 < y'); omega
      omega
    · have hstart : dayNumber (y' + 1) 1 1 ≤ dayNumber y 1 1 := by
        by_cases he : y' + 1 = y
        · simp [he]
        · have := dayNumber_year_lt (by omega : y' + 1 < y); omega
      omega
  subst y'
  refine ⟨rfl, ?_⟩
  have hms : m = 1 ∨ m = 2 ∨ m = 3 ∨ m = 4 ∨ m = 5 ∨ m = 6 ∨ m = 7 ∨ m = 8 ∨ m = 9 ∨ m = 10 ∨ m = 11 ∨ m = 12 := by omega
  have hms' : m' = 1 ∨ m' = 2 ∨ m' = 3 ∨ m' = 4 ∨ m' = 5 ∨ m' = 6 ∨ m' = 7 ∨ m' = 8 ∨ m' = 9 ∨ m' = 10 ∨ m' = 11 ∨ m' = 12 := by omega
  rcases hms with rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl
  all_goals rcases hms' with rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl | rfl
  all_goals cases hl : leap y <;> simp [dayNumber, daysIn, List.range_succ, hl] at * <;> omega


end Loops
