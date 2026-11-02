import Laws.InstantCalendar

namespace Loops

private def digitNumbers (cs : List Char) : List Nat := cs.map (fun c => c.toNat - 48)

private theorem digitNumbers_bound {cs : List Char} (h : cs.all Char.isDigit = true) :
    ∀ d ∈ digitNumbers cs, d < 10 := by
  intro d hd
  obtain ⟨c, hc, rfl⟩ := List.mem_map.1 hd
  exact digit_lt ((List.all_eq_true).1 h c hc)

private theorem decimalChars_inverse (cs : List Char) (h : cs.all Char.isDigit = true) :
    decimalChars cs.length (radixValue 10 (digitNumbers cs)) = cs := by
  induction cs with
  | nil => rfl
  | cons c cs ih =>
    have hc : c.isDigit = true := (List.all_eq_true).1 h c List.mem_cons_self
    have ht : cs.all Char.isDigit = true := by
      simp only [List.all_cons, Bool.and_eq_true] at h
      exact h.2
    have hb := radixValue_bound (by decide : 0 < 10) (digitNumbers_bound ht)
    have hl : (digitNumbers cs).length = cs.length := by simp [digitNumbers]
    rw [hl] at hb
    have hp : 0 < 10 ^ cs.length := Nat.pow_pos (by decide)
    have hq : ((c.toNat - 48) * 10 ^ cs.length + radixValue 10 (digitNumbers cs)) / 10 ^ cs.length = c.toNat - 48 := by
      simpa [Nat.add_comm, Nat.div_eq_of_lt hb] using Nat.add_mul_div_right (radixValue 10 (digitNumbers cs)) (c.toNat - 48) hp
    have hr : ((c.toNat - 48) * 10 ^ cs.length + radixValue 10 (digitNumbers cs)) % 10 ^ cs.length = radixValue 10 (digitNumbers cs) := by simp [Nat.mod_eq_of_lt hb]
    have he : Char.ofNat (48 + (c.toNat - 48)) = c := by
      have hc' := hc
      simp only [Char.isDigit, Bool.and_eq_true, decide_eq_true_eq, UInt32.le_iff_toNat_le] at hc'
      have h48 : 48 ≤ c.toNat := hc'.1
      rw [Nat.add_sub_of_le h48, Char.ofNat_toNat]
    simp only [List.length_cons, digitNumbers, List.map_cons, radixValue, List.length_map, decimalChars]
    simp only [digitNumbers] at hq hr
    rw [hq, hr, he]
    exact congrArg (c :: ·) (ih ht)

private theorem digitsVal_render {cs : List Char} {n : Nat} (h : digitsVal cs = some n) :
    decimalChars cs.length n = cs := by
  unfold digitsVal at h
  split at h
  · contradiction
  · rename_i hg
    have hall : cs.all Char.isDigit = true := by simp_all
    have hn := Option.some.inj h
    have hf : cs.foldl (fun n c => 10 * n + (c.toNat - '0'.toNat)) 0 = radixValue 10 (digitNumbers cs) := by
      have hh := radixValue_fold 10 (digitNumbers cs) 0
      simpa [digitNumbers, List.foldl_map] using hh
    rw [← hn, hf]
    exact decimalChars_inverse cs hall

private theorem digit_char (c : Char) (hc : c.isDigit = true) :
    Char.ofNat (48 + ((c.toNat - 48 : Nat) : Int).toNat) = c := by
  simp only [Int.toNat_natCast]
  have hc' := hc
  simp only [Char.isDigit, Bool.and_eq_true, decide_eq_true_eq, UInt32.le_iff_toNat_le] at hc'
  have h48 : 48 ≤ c.toNat := hc'.1
  rw [Nat.add_sub_of_le h48, Char.ofNat_toNat]

private theorem stripZeros_eq_of_last {ds : List Int} (h : ds.getLast? ≠ some 0) : stripZeros ds = ds := by
  unfold stripZeros
  rw [List.dropWhile_beq_eq_self_of_head?_ne]
  · simp
  · simpa using h

private theorem offsetSecs_only {cs : List Char} {o : Int} (h : offsetSecs cs = some o) : cs = ['Z'] ∧ o = 0 := by
  unfold offsetSecs at h
  split at h
  · simp_all
  · contradiction

private theorem takeWhile_append_drop_length (cs : List Char) :
    cs.takeWhile Char.isDigit ++ cs.drop (cs.takeWhile Char.isDigit).length = cs := by
  induction cs with
  | nil => rfl
  | cons c cs ih =>
    by_cases hc : c.isDigit = true <;> simp_all

private theorem tail_render {rest : List Char} {f : List Int} {o : Int}
    (h : tail rest = some (f, o)) :
    rest = (if (stripZeros f).isEmpty then [] else '.' :: (stripZeros f).map (fun d => Char.ofNat (48 + d.toNat))) ++ ['Z'] := by
  unfold tail at h
  split at h
  · rename_i rest
    simp only at h
    split at h
    · contradiction
    · rename_i hg
      simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
      obtain ⟨off, hoff, rfl, rfl⟩ := h
      have zone := (offsetSecs_only hoff).1
      have hnon : ¬ (rest.takeWhile Char.isDigit).isEmpty = true := by simp_all
      have hlast : (rest.takeWhile Char.isDigit).getLast? ≠ some '0' := by simp_all
      have inv : ((rest.takeWhile Char.isDigit).map (fun c => ((c.toNat - 48 : Nat) : Int))).map
          (fun d => Char.ofNat (48 + d.toNat)) = rest.takeWhile Char.isDigit := by
        simp only [List.map_map]
        simpa only [List.map_id_fun', Function.comp_def, id] using List.map_congr_left (l := rest.takeWhile Char.isDigit) (fun c hc => digit_char c (takeWhile_digit hc))
      have hz : (((rest.takeWhile Char.isDigit).map (fun c => ((c.toNat - 48 : Nat) : Int)))).getLast? ≠ some 0 := by
        intro he
        have he' := congrArg (Option.map (fun d => Char.ofNat (48 + d.toNat))) he
        rw [← List.getLast?_map, inv] at he'
        exact hlast (by simpa using he')
      change '.' :: rest = (if (stripZeros ((rest.takeWhile Char.isDigit).map (fun c => ((c.toNat - 48 : Nat) : Int)))).isEmpty then [] else '.' :: (stripZeros ((rest.takeWhile Char.isDigit).map (fun c => ((c.toNat - 48 : Nat) : Int)))).map (fun d => Char.ofNat (48 + d.toNat))) ++ ['Z']
      rw [stripZeros_eq_of_last hz]
      have hn : ((rest.takeWhile Char.isDigit).map (fun c => ((c.toNat - 48 : Nat) : Int))).isEmpty = false := by simpa using Bool.eq_false_iff.2 hnon
      rw [hn]
      simp only [Bool.false_eq_true, ↓reduceIte, inv, List.cons_append, List.cons.injEq, true_and]
      rw [← zone]
      exact (takeWhile_append_drop_length rest).symm
  · simp only [Option.map_eq_some_iff, Prod.mk.injEq] at h
    obtain ⟨off, hoff, rfl, rfl⟩ := h
    simp [stripZeros, (offsetSecs_only hoff).1]

private def Instant.CalendarValid (t : Instant) : Prop :=
  (1 ≤ t.month ∧ t.month ≤ 12) ∧ (1 ≤ t.day ∧ t.day ≤ daysIn t.year t.month) ∧
  t.hour ≤ 23 ∧ t.minute ≤ 59 ∧ t.second ≤ 59

private theorem instantParts_valid {cs : List Char} {t : Instant} (h : instantParts? cs = some t) :
    t.CalendarValid := by
  unfold instantParts? at h
  repeat' split at h
  all_goals simp at h
  rename_i hg
  subst t
  simp only [Bool.and_eq_true, decide_eq_true_eq] at hg
  simp only [Instant.CalendarValid]
  exact ⟨hg.1.1.1.1.1, ⟨hg.1.1.1.1.2, hg.1.1.1.2⟩, hg.1.1.2, hg.1.2, hg.2⟩

private theorem instant_moment_fields {a b : Instant} (ha : a.CalendarValid) (hb : b.CalendarValid)
    (he : a.moment = b.moment) : a = b := by
  cases a with
  | mk y mo d h mi s f =>
    cases b with
    | mk y' mo' d' h' mi' s' f' =>
      simp only [Instant.moment, List.cons.injEq] at he
      simp only [Instant.CalendarValid] at ha hb
      have hh : dayNumber y mo d = dayNumber y' mo' d' := by omega
      obtain ⟨rfl, rfl, rfl⟩ := instant_calendar_injective ha.1 ha.2.1 hb.1 hb.2.1 hh
      have hfields : h = h' ∧ mi = mi' ∧ s = s' := by omega
      rcases hfields with ⟨rfl, rfl, rfl⟩
      simp [he.2]

/-- Rendering the actual parser's numeric fields recovers every accepted character. -/
theorem instantParts_render {cs : List Char} {t : Instant} (h : instantParts? cs = some t) :
    t.text.toList = cs := by
  unfold instantParts? at h
  repeat' split at h
  all_goals simp at h
  rename_i hy hm hd hh hmi hs ht hg
  subst t
  have hy' := digitsVal_render hy
  have hm' := digitsVal_render hm
  have hd' := digitsVal_render hd
  have hh' := digitsVal_render hh
  have hmi' := digitsVal_render hmi
  have hs' := digitsVal_render hs
  simp only [List.length_cons, List.length_nil] at hy' hm' hd' hh' hmi' hs'
  simp only [Instant.text, String.toList_ofList]
  rw [hy', hm', hd', hh', hmi', hs']
  simp only [List.cons_append, List.nil_append]
  rw [← tail_render ht]

/-- Parse then render recovers the input String, not a normalised replacement. -/
theorem instant_parse_render {s : String} {t : Instant} (h : instantParts? s.toList = some t) :
    t.text = s := String.toList_inj.1 (instantParts_render h)

/-- Two accepted instant spellings with the same moment are the same text. -/
theorem instant_moment_unique {a b : String} {m : Moment}
    (ha : instant? a.toList = some m) (hb : instant? b.toList = some m) : a = b := by
  simp only [instant?, Option.map_eq_some_iff] at ha hb
  obtain ⟨ta, hta, hea⟩ := ha
  obtain ⟨tb, htb, heb⟩ := hb
  have he := instant_moment_fields (instantParts_valid hta) (instantParts_valid htb) (hea.trans heb.symm)
  exact (instant_parse_render hta).symm.trans (he ▸ instant_parse_render htb)

end Loops
