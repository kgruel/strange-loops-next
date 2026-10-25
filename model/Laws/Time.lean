import Loops.Occurred

/-!
# Laws of time

* **Span order.** `Span.Before` is a strict total order: no span comes before
  itself, it is transitive, and of two spans either one comes first or they
  have the same start and stop. Every store orders `occurred` the same way.
* **Qualifiers.** A qualifier never changes a date's span: `?`, `~` and `%`
  are the observer's claim, carried in the text and set aside by the order.
* **One moment per instant.** A moment's fraction never ends in zero, so
  `.5` and `.500` give the same moment, and comparing moments as lists
  compares the instants.
-/

namespace Loops

theorem stopBefore_irrefl (a : Option Moment) : ¬ StopBefore a a := by
  cases a <;> simp [StopBefore, List.lt_irrefl]

theorem stopBefore_trans {a b c : Option Moment} :
    StopBefore a b → StopBefore b c → StopBefore a c := by
  cases a <;> cases b <;> cases c <;> simp [StopBefore]
  exact List.lt_trans

theorem stopBefore_trichotomy (a b : Option Moment) :
    StopBefore a b ∨ a = b ∨ StopBefore b a := by
  cases a <;> cases b <;> simp [StopBefore]
  rename_i x y
  rcases Std.lt_trichotomy x y with h | h | h <;> simp_all

theorem Span.before_irrefl (a : Span) : ¬ a.Before a := by
  simp [Span.Before, List.lt_irrefl, stopBefore_irrefl]

theorem Span.before_trans {a b c : Span} : a.Before b → b.Before c → a.Before c := by
  unfold Span.Before
  rintro (h1 | ⟨e1, s1⟩) (h2 | ⟨e2, s2⟩)
  · exact .inl (List.lt_trans h1 h2)
  · exact .inl (e2 ▸ h1)
  · exact .inl (e1 ▸ h2)
  · exact .inr ⟨e1.trans e2, stopBefore_trans s1 s2⟩

theorem Span.before_total (a b : Span) :
    a.Before b ∨ (a.start = b.start ∧ a.stop = b.stop) ∨ b.Before a := by
  unfold Span.Before
  rcases Std.lt_trichotomy a.start b.start with h | h | h
  · exact .inl (.inl h)
  · rcases stopBefore_trichotomy a.stop b.stop with s | s | s
    · exact .inl (.inr ⟨h, s⟩)
    · exact .inr (.inl ⟨h, s⟩)
    · exact .inr (.inr (.inr ⟨h.symm, s⟩))
  · exact .inr (.inr (.inl h))

/-- A qualified date is read as the date without its qualifier. -/
theorem point_qualified {cs : List Char} {q : Char} (hq : isQualifier q = true) :
    point? (cs ++ [q]) = date? cs := by
  simp [point?, hq]

/-- A date without a qualifier is read as a date. -/
theorem point_date {cs : List Char} (ht : 'T' ∉ cs)
    (hl : ∀ c, cs.getLast? = some c → isQualifier c = false) : point? cs = date? cs := by
  unfold point?
  cases h : cs.getLast? with
  | none => simp_all [date?, dateDays?]
  | some c => simp [hl c h, ht]

/-- A qualifier never changes a date's span. -/
theorem qualifier_ignored {cs : List Char} {q : Char} (hq : isQualifier q = true) (ht : 'T' ∉ cs)
    (hl : ∀ c, cs.getLast? = some c → isQualifier c = false) : point? (cs ++ [q]) = point? cs := by
  rw [point_qualified hq, point_date ht hl]

theorem stripZeros_last (ds : List Int) : (stripZeros ds).getLast? ≠ some 0 := by
  intro h
  simp only [stripZeros, List.getLast?_reverse] at h
  have := List.head?_dropWhile_not (· == 0) ds.reverse
  simp_all

/-- An instant's fraction never ends in zero. -/
theorem instant_stripped {cs : List Char} {m : Moment} (h : instant? cs = some m) :
    m.tail.getLast? ≠ some 0 := by
  unfold instant? at h
  repeat' split at h
  all_goals simp at h
  all_goals (subst h; exact stripZeros_last _)

end Loops
