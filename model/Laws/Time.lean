import Loops.Occurred

/-!
# Laws of time

* **Spans.** Every point the reader accepts becomes the span the grammar
  gives it, from the reader itself (`occurredSpanOf`): a point alone, a point
  and `..`, or two points with the second starting no earlier than the
  first. A span's end is never before its start (`point_le`, `Span.ok`).
  Which texts are points is the definition (`dateDays?`, `instant?`), pinned
  by the vectors.
* **Qualifiers.** A qualifier never changes a span: on a date alone, or on
  either end of an interval.
* **Moments.** Every moment the reader makes is whole seconds, then digits
  0 to 9 that don't end in zero. Comparing two such moments as lists is
  comparing them as exact decimals, and trailing zeros never change one.
* **Span order.** `Span.Before` is a strict total order: no span comes before
  itself, it is transitive, and of two different spans one comes first. Every
  store orders `occurred` the same way.

The acceptance and moment proofs (`point_le`, `moment_lt_iff_scaled` and
their lemmas) are adapted from Gemini's review of this module.
-/

namespace Loops

/-! ## Span order -/

theorem Span.ext {a b : Span} (h1 : a.start = b.start) (h2 : a.stop = b.stop) : a = b := by
  cases a; cases b; simp only at h1 h2; subst h1 h2; rfl

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

theorem Span.before_total (a b : Span) : a.Before b ∨ a = b ∨ b.Before a := by
  unfold Span.Before
  rcases Std.lt_trichotomy a.start b.start with h | h | h
  · exact .inl (.inl h)
  · rcases stopBefore_trichotomy a.stop b.stop with s | s | s
    · exact .inl (.inr ⟨h, s⟩)
    · exact .inr (.inl (Span.ext h s))
    · exact .inr (.inr (.inr ⟨h.symm, s⟩))
  · exact .inr (.inr (.inl h))

/-! ## Splitting at `/` -/

theorem takeWhile_slash {cs : List Char} (h : '/' ∉ cs) : cs.takeWhile (· != '/') = cs := by
  induction cs with
  | nil => rfl
  | cons c cs ih =>
    simp only [List.mem_cons, not_or] at h
    simp [Ne.symm h.1, ih h.2]

theorem dropWhile_slash {cs : List Char} (h : '/' ∉ cs) : cs.dropWhile (· != '/') = [] := by
  induction cs with
  | nil => rfl
  | cons c cs ih =>
    simp only [List.mem_cons, not_or] at h
    simp [Ne.symm h.1, ih h.2]

theorem halves_of_not_mem {cs : List Char} (h : '/' ∉ cs) : halves cs = (cs, none) := by
  simp [halves, takeWhile_slash h, dropWhile_slash h]

theorem halves_append {p q : List Char} (h : '/' ∉ p) : halves (p ++ '/' :: q) = (p, some q) := by
  have hc : ∀ c ∈ p, (c != '/') = true := fun c hc => by simp; exact fun e => h (e ▸ hc)
  have ht : (p ++ '/' :: q).takeWhile (· != '/') = p := by
    rw [List.takeWhile_append_of_pos hc]; simp
  have hd : (p ++ '/' :: q).dropWhile (· != '/') = '/' :: q := by
    rw [List.dropWhile_append_of_pos hc]; simp
  simp [halves, ht, hd]

/-! ## Spans -/

theorem dayNumber_year_lt {y1 y2 : Nat} (h : y1 < y2) : dayNumber y1 1 1 < dayNumber y2 1 1 := by
  unfold dayNumber leapsBefore
  simp only [Nat.sub_self, List.range_zero, List.map_nil, List.sum_nil, Nat.add_zero]
  omega

theorem daysIn_pos (y m : Nat) : 0 < daysIn y m := by
  unfold daysIn
  repeat' split
  all_goals omega

theorem dateDays_lt {cs : List Char} {a b : Int} (h : dateDays? cs = some (a, b)) : a < b := by
  unfold dateDays? at h
  repeat' split at h
  all_goals simp only [Option.map_eq_some_iff, Option.some.injEq, Prod.mk.injEq, reduceCtorEq] at h
  · obtain ⟨y, _, rfl, rfl⟩ := h; exact dayNumber_year_lt (by omega)
  · obtain ⟨y, _, rfl, rfl⟩ := h; exact dayNumber_year_lt (by omega)
  · obtain ⟨y, _, rfl, rfl⟩ := h; exact dayNumber_year_lt (by omega)
  · obtain ⟨y, _, rfl, rfl⟩ := h; exact dayNumber_year_lt (by omega)
  · obtain ⟨y, _, rfl, rfl⟩ := h; exact dayNumber_year_lt (by omega)
  · rename_i y m _ _ _; obtain ⟨rfl, rfl⟩ := h; have := daysIn_pos y m; omega
  · rename_i y m _ _ _; obtain ⟨rfl, rfl⟩ := h; have := daysIn_pos y m; omega
  · obtain ⟨rfl, rfl⟩ := h; omega

theorem date_lt {cs : List Char} {a b : Moment} (h : date? cs = some (a, b)) : a < b := by
  unfold date? at h
  simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
  obtain ⟨⟨da, db⟩, hd, rfl, rfl⟩ := h
  exact List.Lex.rel (by have := dateDays_lt hd; omega)

/-- A point never ends before it starts. -/
theorem point_le {cs : List Char} {a b : Moment} (h : point? cs = some (a, b)) : a ≤ b := by
  unfold point? at h
  split at h
  · contradiction
  · split at h
    · exact Std.le_of_lt (date_lt h)
    · split at h
      · simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
        obtain ⟨t, _, rfl, rfl⟩ := h
        exact Std.le_refl t
      · exact Std.le_of_lt (date_lt h)

/-- A point alone is its own span. -/
theorem occurred_point {cs : List Char} {a b : Moment} (hs : '/' ∉ cs) (h : point? cs = some (a, b)) :
    ∃ sp, occurredSpanOf cs = some sp ∧ sp.start = a ∧ sp.stop = some b := by
  simp [occurredSpanOf, halves_of_not_mem hs, spanOf, single, h, Span.closed?, point_le h]

/-- A point and `..` run from the point's start, with no end. -/
theorem occurred_open {p : List Char} {a a' : Moment} (hs : '/' ∉ p) (h : point? p = some (a, a')) :
    ∃ sp, occurredSpanOf (p ++ ['/', '.', '.']) = some sp ∧ sp.start = a ∧ sp.stop = none := by
  simp [occurredSpanOf, halves_append hs, spanOf, openFrom, h]

/-- Two points, the second starting no earlier: from the first's start to the second's end. -/
theorem occurred_interval {p q : List Char} {a a' b e : Moment} (hp : '/' ∉ p) (hq : '/' ∉ q)
    (hd : q ≠ ['.', '.']) (ha : point? p = some (a, a')) (hb : point? q = some (b, e)) (hab : a ≤ b) :
    ∃ sp, occurredSpanOf (p ++ '/' :: q) = some sp ∧ sp.start = a ∧ sp.stop = some e := by
  have hae : a ≤ e := Std.le_trans hab (point_le hb)
  simp [occurredSpanOf, halves_append hp, spanOf, hd, hq, between, ha, hb, hab, Span.closed?, hae]

/-! ## Qualifiers -/

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

theorem qualifier_ignored {cs : List Char} {q : Char} (hq : isQualifier q = true) (ht : 'T' ∉ cs)
    (hl : ∀ c, cs.getLast? = some c → isQualifier c = false) : point? (cs ++ [q]) = point? cs := by
  rw [point_qualified hq, point_date ht hl]

theorem qualifier_not_slash {q : Char} (hq : isQualifier q = true) : q ≠ '/' := by
  intro h; subst h; simp [isQualifier] at hq

/-- A qualifier never changes a date's span. -/
theorem occurred_qualified {cs : List Char} {q : Char} (hq : isQualifier q = true) (hs : '/' ∉ cs)
    (ht : 'T' ∉ cs) (hl : ∀ c, cs.getLast? = some c → isQualifier c = false) :
    occurredSpanOf (cs ++ [q]) = occurredSpanOf cs := by
  have hs' : '/' ∉ cs ++ [q] := by simp [hs, Ne.symm (qualifier_not_slash hq)]
  simp only [occurredSpanOf, halves_of_not_mem hs, halves_of_not_mem hs', spanOf, single,
    qualifier_ignored hq ht hl]

/-- Nor the span of an interval whose start is qualified. -/
theorem occurred_qualified_start {p r : List Char} {q : Char} (hq : isQualifier q = true)
    (hs : '/' ∉ p) (ht : 'T' ∉ p) (hl : ∀ c, p.getLast? = some c → isQualifier c = false) :
    occurredSpanOf (p ++ [q] ++ '/' :: r) = occurredSpanOf (p ++ '/' :: r) := by
  have hs' : '/' ∉ p ++ [q] := by simp [hs, Ne.symm (qualifier_not_slash hq)]
  simp only [occurredSpanOf, halves_append hs, halves_append hs', spanOf, openFrom,
    between, qualifier_ignored hq ht hl]

/-- Nor the span of an interval whose end is qualified. -/
theorem occurred_qualified_end {p r : List Char} {q : Char} (hq : isQualifier q = true)
    (hp : '/' ∉ p) (hd : r ≠ ['.', '.']) (ht : 'T' ∉ r)
    (hl : ∀ c, r.getLast? = some c → isQualifier c = false) :
    occurredSpanOf (p ++ '/' :: (r ++ [q])) = occurredSpanOf (p ++ '/' :: r) := by
  have hd' : r ++ [q] ≠ ['.', '.'] := by
    intro h
    have := congrArg List.getLast? h
    simp at this; subst this; simp [isQualifier] at hq
  have hc : (r ++ [q]).contains '/' = r.contains '/' := by
    simp [Ne.symm (qualifier_not_slash hq)]
  simp only [occurredSpanOf, halves_append hp, spanOf, hd, hd', hc, between,
    qualifier_ignored hq ht hl, ↓reduceIte]

/-! ## Moments -/

/-- Fraction digits: each 0 to 9, the last not 0. -/
def Stripped (f : List Int) : Prop :=
  (∀ d ∈ f, 0 ≤ d ∧ d < 10) ∧ f.getLast? ≠ some 0

/-- Whole seconds, then stripped fraction digits. -/
def Moment.Canonical (m : Moment) : Prop := ∃ s f, m = s :: f ∧ Stripped f

theorem stripZeros_last (ds : List Int) : (stripZeros ds).getLast? ≠ some 0 := by
  intro h
  simp only [stripZeros, List.getLast?_reverse] at h
  have := List.head?_dropWhile_not (· == 0) ds.reverse
  simp_all

theorem stripZeros_append_zero (ds : List Int) : stripZeros (ds ++ [0]) = stripZeros ds := by
  simp [stripZeros]

/-- Trailing zeros never change a fraction. -/
theorem stripZeros_replicate_zero (ds : List Int) (k : Nat) :
    stripZeros (ds ++ List.replicate k 0) = stripZeros ds := by
  induction k with
  | zero => simp
  | succ k ih => rw [List.replicate_succ', ← List.append_assoc, stripZeros_append_zero, ih]

theorem stripZeros_sub {ds : List Int} {d : Int} (h : d ∈ stripZeros ds) : d ∈ ds := by
  simp only [stripZeros, List.mem_reverse] at h
  exact List.mem_reverse.1 ((List.dropWhile_sublist _).subset h)

theorem digit_lt {c : Char} (h : c.isDigit = true) : c.toNat - '0'.toNat < 10 := by
  simp only [Char.isDigit, Bool.and_eq_true, decide_eq_true_eq] at h
  have := Char.le_def.1 h.2
  rw [UInt32.le_iff_toNat_le] at this
  show c.val.toNat - 48 < 10
  have : ('9' : Char).val.toNat = 57 := rfl
  omega

theorem takeWhile_digit {l : List Char} {c : Char} (h : c ∈ l.takeWhile Char.isDigit) :
    c.isDigit = true := by
  induction l with
  | nil => simp at h
  | cons x xs ih =>
    simp only [List.takeWhile_cons] at h
    split at h
    · rename_i hx
      rcases List.mem_cons.1 h with rfl | h
      · exact hx
      · exact ih h
    · simp at h

theorem tail_digits {rest : List Char} {f : List Int} {o : Int}
    (h : tail rest = some (f, o)) : ∀ d ∈ f, 0 ≤ d ∧ d < 10 := by
  intro d hd
  unfold tail at h
  split at h
  · simp only at h
    split at h
    · contradiction
    · simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
      obtain ⟨_, _, rfl, _⟩ := h
      simp only [List.mem_map] at hd
      obtain ⟨c, hc, rfl⟩ := hd
      have := digit_lt (takeWhile_digit hc)
      omega
  · simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
    obtain ⟨_, _, rfl, _⟩ := h
    simp at hd
theorem stripped_of_digits {ds : List Int} (h : ∀ d ∈ ds, 0 ≤ d ∧ d < 10) : Stripped (stripZeros ds) :=
  ⟨fun d hd => h d (stripZeros_sub hd), stripZeros_last ds⟩

/-- Every instant the reader accepts is a canonical moment. -/
theorem instant_canonical {cs : List Char} {m : Moment} (h : instant? cs = some m) : m.Canonical := by
  unfold instant? at h
  repeat' split at h
  all_goals simp at h
  rename_i ht _
  subst h
  exact ⟨_, _, rfl, stripped_of_digits (tail_digits ht)⟩

/-- So is every point's start and end. -/
theorem point_canonical {cs : List Char} {a b : Moment} (h : point? cs = some (a, b)) :
    a.Canonical ∧ b.Canonical := by
  have hd : ∀ {xs : List Char}, date? xs = some (a, b) → a.Canonical ∧ b.Canonical := by
    intro xs hx
    simp only [date?, Option.map_eq_some_iff, Prod.mk.injEq] at hx
    obtain ⟨_, _, rfl, rfl⟩ := hx
    exact ⟨⟨_, [], rfl, by simp [Stripped]⟩, ⟨_, [], rfl, by simp [Stripped]⟩⟩
  unfold point? at h
  split at h
  · contradiction
  · split at h
    · exact hd h
    · split at h
      · simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
        obtain ⟨t, ht, rfl, rfl⟩ := h
        exact ⟨instant_canonical ht, instant_canonical ht⟩
      · exact hd h

/-- A fraction's first `n` digits as an integer. -/
def fracScaled : Nat → List Int → Int
  | _, [] => 0
  | 0, _ :: _ => 0
  | n + 1, d :: ds => d * ((10 : Int) ^ n) + fracScaled n ds

/-- A moment times `10^n`, exact when its fraction has at most `n` digits. -/
def momentScaled (n : Nat) (s : Int) (f : List Int) : Int :=
  s * ((10 : Int) ^ n) + fracScaled n f

theorem pow10_pos : ∀ n : Nat, 0 < ((10 : Int) ^ n)
  | 0 => by decide
  | n + 1 => by rw [Int.pow_succ]; have := pow10_pos n; omega

theorem stripped_tail {d : Int} {ds : List Int} (h : Stripped (d :: ds)) : Stripped ds := by
  refine ⟨fun x hx => h.1 x (List.mem_cons_of_mem _ hx), ?_⟩
  intro hl
  apply h.2
  cases ds with
  | nil => simp at hl
  | cons a as => simpa [List.getLast?_cons_cons] using hl

theorem fracScaled_bounds : ∀ {n : Nat} {f : List Int},
    Stripped f → f.length ≤ n →
    0 ≤ fracScaled n f ∧ fracScaled n f < ((10 : Int) ^ n) ∧ (f ≠ [] → 0 < fracScaled n f)
  | n, [], _, _ => by
    have := pow10_pos n
    simp [fracScaled]; omega
  | 0, _ :: _, _, hlen => by simp at hlen
  | n + 1, d :: ds, hf, hlen => by
    have hd := hf.1 d List.mem_cons_self
    have hds := stripped_tail hf
    have ⟨hlo, hhi, hpos⟩ := fracScaled_bounds (n := n) hds (by simpa using hlen)
    have hp := pow10_pos n
    have hdn : 0 ≤ d * ((10 : Int) ^ n) := Int.mul_nonneg (by omega) (by omega)
    simp only [fracScaled, Int.pow_succ]
    refine ⟨by omega, ?_, ?_⟩
    · have : d * ((10 : Int) ^ n) ≤ 9 * ((10 : Int) ^ n) :=
        Int.mul_le_mul_of_nonneg_right (by omega) (by omega)
      omega
    · intro _
      by_cases hd0 : d = 0
      · subst hd0
        have hne : ds ≠ [] := by intro hnil; subst hnil; exact hf.2 rfl
        have := hpos hne
        omega
      · have : 1 * ((10 : Int) ^ n) ≤ d * ((10 : Int) ^ n) :=
          Int.mul_le_mul_of_nonneg_right (by omega) (by omega)
        omega

theorem frac_lt_iff_scaled : ∀ {n : Nat} {f1 f2 : List Int},
    Stripped f1 → Stripped f2 → f1.length ≤ n → f2.length ≤ n →
    (f1 < f2 ↔ fracScaled n f1 < fracScaled n f2)
  | n, [], [], _, _, _, _ => by simp [fracScaled, List.lt_irrefl]
  | n, [], d2 :: ds2, _, hf2, _, hlen2 => by
    have ⟨_, _, hpos⟩ := fracScaled_bounds (n := n) hf2 hlen2
    have := hpos (by simp)
    simp [fracScaled, show ([] : List Int) < d2 :: ds2 from List.Lex.nil]
    omega
  | n, d1 :: ds1, [], hf1, _, hlen1, _ => by
    have ⟨_, _, hpos⟩ := fracScaled_bounds (n := n) hf1 hlen1
    have := hpos (by simp)
    have hnl : ¬ (d1 :: ds1 < ([] : List Int)) := by intro h; cases h
    simp [fracScaled, hnl]
    omega
  | 0, _ :: _, _ :: _, _, _, hlen1, _ => by simp at hlen1
  | n + 1, d1 :: ds1, d2 :: ds2, hf1, hf2, hlen1, hlen2 => by
    have ⟨hlo1, hhi1, _⟩ := fracScaled_bounds (n := n) (stripped_tail hf1) (by simpa using hlen1)
    have ⟨hlo2, hhi2, _⟩ := fracScaled_bounds (n := n) (stripped_tail hf2) (by simpa using hlen2)
    have ih := frac_lt_iff_scaled (n := n) (stripped_tail hf1) (stripped_tail hf2)
      (by simpa using hlen1) (by simpa using hlen2)
    have hp := pow10_pos n
    simp only [fracScaled]
    by_cases hlt : d1 < d2
    · have hlex : (d1 :: ds1) < (d2 :: ds2) := List.Lex.rel hlt
      have hm : (d1 + 1) * ((10 : Int) ^ n) ≤ d2 * ((10 : Int) ^ n) :=
        Int.mul_le_mul_of_nonneg_right (by omega) (by omega)
      rw [Int.add_mul, Int.one_mul] at hm
      simp [hlex]; omega
    · by_cases heq : d1 = d2
      · subst heq
        have hlex : ((d1 :: ds1) < (d1 :: ds2)) ↔ ds1 < ds2 := by
          constructor
          · intro h; cases h with
            | rel h => omega
            | cons h => exact h
          · exact List.Lex.cons
        rw [hlex, ih]; omega
      · have hlex : ¬ ((d1 :: ds1) < (d2 :: ds2)) := by
          intro h; cases h with
          | rel h => omega
          | cons _ => omega
        have hm : (d2 + 1) * ((10 : Int) ^ n) ≤ d1 * ((10 : Int) ^ n) :=
          Int.mul_le_mul_of_nonneg_right (by omega) (by omega)
        rw [Int.add_mul, Int.one_mul] at hm
        simp [hlex]; omega

/-- Comparing two moments as lists is comparing them as exact decimals. -/
theorem moment_lt_iff_scaled {n : Nat} {s1 s2 : Int} {f1 f2 : List Int}
    (hf1 : Stripped f1) (hf2 : Stripped f2) (hlen1 : f1.length ≤ n) (hlen2 : f2.length ≤ n) :
    ((s1 :: f1) < (s2 :: f2)) ↔ momentScaled n s1 f1 < momentScaled n s2 f2 := by
  have ⟨hlo1, hhi1, _⟩ := fracScaled_bounds (n := n) hf1 hlen1
  have ⟨hlo2, hhi2, _⟩ := fracScaled_bounds (n := n) hf2 hlen2
  have hf := frac_lt_iff_scaled (n := n) hf1 hf2 hlen1 hlen2
  have hp := pow10_pos n
  unfold momentScaled
  by_cases hlt : s1 < s2
  · have hlex : (s1 :: f1) < (s2 :: f2) := List.Lex.rel hlt
    have hm : (s1 + 1) * ((10 : Int) ^ n) ≤ s2 * ((10 : Int) ^ n) :=
      Int.mul_le_mul_of_nonneg_right (by omega) (by omega)
    rw [Int.add_mul, Int.one_mul] at hm
    simp [hlex]; omega
  · by_cases heq : s1 = s2
    · subst heq
      have hlex : ((s1 :: f1) < (s1 :: f2)) ↔ f1 < f2 := by
        constructor
        · intro h; cases h with
          | rel h => omega
          | cons h => exact h
        · exact List.Lex.cons
      rw [hlex, hf]; omega
    · have hlex : ¬ ((s1 :: f1) < (s2 :: f2)) := by
        intro h; cases h with
        | rel h => omega
        | cons _ => omega
      have hm : (s2 + 1) * ((10 : Int) ^ n) ≤ s1 * ((10 : Int) ^ n) :=
        Int.mul_le_mul_of_nonneg_right (by omega) (by omega)
      rw [Int.add_mul, Int.one_mul] at hm
      simp [hlex]; omega

end Loops
