import Loops.Things
import Laws.Families
import Laws.Record

/-!
# Laws of things and of what a reader holds

* **Settling is a function of what the places hold.** Whatever order the
  places are read in, and however often a form repeats, a reader keeps the
  same records, one per id (`settle_eq`, `settle_distinct`).
* **More information wins; erasure sticks.** A payload any place holds is
  kept, unless an erase record in the set names it; then every form is
  erased (`settle_keeps`, `settle_erased`).
* **Admission is a function of the set,** and an admitted record's `prev`
  names only held records it shares a thing with and may replace
  (`admit_same`, `admit_no_cross`).
* **A thing's state depends only on the records about it** (`stateIn_local`),
  so the set decides per thing (`perThing_set_decides`).
* **Views keep supersession, per thing.** Admission reads only envelopes, so
  a view admits the same records; a thing's state under a view is the full
  reader's with payloads hidden (`admit_view`, `stateIn_view`).
-/

namespace Loops

open List

/-! ## Ids -/

theorem idsOf_eq (xs : List Record) :
    idsOf xs = (xs.map (·.id)).foldl (fun ns n => insertId n ns) [] := by
  simp [idsOf, foldl_map]

theorem mem_idsOf {xs : List Record} {i : Nat} : i ∈ idsOf xs ↔ ∃ r ∈ xs, r.id = i := by
  rw [idsOf_eq, mem_insertIds]; simp

theorem idsOf_sorted (xs : List Record) : (idsOf xs).Pairwise (· < ·) := by
  rw [idsOf_eq]; exact sorted_insertIds (by simp)

theorem idsOf_ext {xs ys : List Record} (h : ∀ i, (∃ r ∈ xs, r.id = i) ↔ (∃ r ∈ ys, r.id = i)) :
    idsOf xs = idsOf ys :=
  Perm.eq_of_pairwise (le := (· < ·)) (fun a b _ _ h₁ h₂ => by omega)
    (idsOf_sorted xs) (idsOf_sorted ys)
    ((perm_ext_iff_of_nodup ((idsOf_sorted xs).imp Nat.ne_of_lt)
      ((idsOf_sorted ys).imp Nat.ne_of_lt)).2 fun i => by rw [mem_idsOf, mem_idsOf, h])

/-! ## Settling -/

theorem withhold_congr {a b : Record} (h : SameEnvelope a b) : a.withhold = b.withhold := by
  obtain ⟨h1, h2, h3, h4, h5, h6, h7, h8⟩ := h
  cases a; cases b
  simp only at h1 h2 h3 h4 h5 h6 h7 h8
  subst h1 h2 h3 h4 h5 h6 h7 h8
  rfl

theorem baseForm_mem {forms : List Record} {r : Record} (h : baseForm forms = some r) :
    ∃ a ∈ forms, SameEnvelope r a := by
  unfold baseForm at h
  split at h
  · rename_i a ha
    cases h
    exact ⟨r, mem_of_find?_eq_some ha, SameEnvelope.refl r⟩
  · cases hf : forms with
    | nil => simp [hf] at h
    | cons a t =>
      simp only [hf, head?_cons, Option.map_some, Option.some.injEq] at h
      subst h
      exact ⟨a, mem_cons_self, withhold_envelope a⟩

theorem pick_id {xs : List Record} {i : Nat} {r : Record} (h : pick xs i = some r) : r.id = i := by
  unfold pick at h
  cases hb : baseForm (xs.filter (·.id == i)) with
  | none => simp [hb] at h
  | some b =>
    simp only [hb, Option.map_some, Option.some.injEq] at h
    obtain ⟨a, ha, he⟩ := baseForm_mem hb
    have hai : a.id = i := by simpa using (mem_filter.1 ha).2
    subst h
    split <;> simp [Record.erase, he.id, hai]

/-- Forms of one id, held in two lists with the same members, give the same base form. -/
theorem baseForm_eq {F G : List Record} {i : Nat} (hF : Forms F) (hid : ∀ a ∈ F, a.id = i)
    (h : ∀ r, r ∈ F ↔ r ∈ G) : baseForm F = baseForm G := by
  unfold baseForm
  cases hf : F.find? (·.shown == .here) with
  | some a =>
    have ha := mem_of_find?_eq_some hf
    have pa := find?_some hf
    obtain ⟨b, hg⟩ : ∃ b, G.find? (·.shown == .here) = some b := by
      apply Option.isSome_iff_exists.1
      exact find?_isSome.2 ⟨a, (h a).1 ha, pa⟩
    have hb := (h b).2 (mem_of_find?_eq_some hg)
    have pb := find?_some hg
    rw [hg]
    have := (hF a ha b hb ((hid a ha).trans (hid b hb).symm)).2 (by simpa using pa) (by simpa using pb)
    rw [this]
  | none =>
    have hg : G.find? (·.shown == .here) = none := by
      rw [find?_eq_none] at hf ⊢
      intro x hx; exact hf x ((h x).2 hx)
    rw [hg]
    cases hF' : F with
    | nil =>
      cases hG' : G with
      | nil => rfl
      | cons b t => exact absurd ((h b).2 (hG' ▸ mem_cons_self)) (by simp [hF'])
    | cons a s =>
      cases hG' : G with
      | nil => exact absurd ((h a).1 (hF' ▸ mem_cons_self)) (by simp [hG'])
      | cons b t =>
        simp only [head?_cons, Option.map_some, Option.some.injEq]
        have ha : a ∈ F := hF' ▸ mem_cons_self
        have hb : b ∈ F := (h b).2 (hG' ▸ mem_cons_self)
        exact withhold_congr (hF a ha b hb ((hid a ha).trans (hid b hb).symm)).1

theorem erasedIn_eq {xs ys : List Record} (h : ∀ r, r ∈ xs ↔ r ∈ ys) (i : Nat) :
    erasedIn xs i = erasedIn ys i := by
  unfold erasedIn
  apply Bool.eq_iff_iff.2
  simp only [any_eq_true]
  exact ⟨fun ⟨e, he, p⟩ => ⟨e, (h e).1 he, p⟩, fun ⟨e, he, p⟩ => ⟨e, (h e).2 he, p⟩⟩

/-- Settling depends only on which forms the places hold: not their order, not repeats. -/
theorem settle_eq {xs ys : List Record} (hF : Forms xs) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    settle xs = settle ys := by
  unfold settle
  rw [idsOf_ext fun i => ⟨fun ⟨r, hr, e⟩ => ⟨r, (h r).1 hr, e⟩, fun ⟨r, hr, e⟩ => ⟨r, (h r).2 hr, e⟩⟩]
  congr 1
  funext i
  unfold pick
  have hforms : ∀ r, r ∈ xs.filter (·.id == i) ↔ r ∈ ys.filter (·.id == i) := fun r => by
    simp [mem_filter, h]
  have hF' : Forms (xs.filter (·.id == i)) := fun a ha b hb e =>
    hF a (mem_filter.1 ha).1 b (mem_filter.1 hb).1 e
  rw [baseForm_eq hF' (fun a ha => by simpa using (mem_filter.1 ha).2) hforms, erasedIn_eq h]

theorem settle_distinct (xs : List Record) : Distinct (settle xs) := by
  have hp : (settle xs).Pairwise (fun a b => a.id < b.id) :=
    (idsOf_sorted xs).filterMap (pick xs) fun a a' h b hb b' hb' => by
      rw [pick_id (Option.mem_def.1 hb), pick_id (Option.mem_def.1 hb')]; exact h
  exact (pairwise_map.2 hp).imp Nat.ne_of_lt

/-- Erasure sticks: once an erase record naming `i` is held, the record kept
for `i` is erased, whichever forms the places hold. -/
theorem settle_erased {xs : List Record} {i : Nat} (he : erasedIn xs i = true) {r : Record}
    (hr : r ∈ settle xs) (hi : r.id = i) : r.shown = .erased := by
  obtain ⟨j, -, hj⟩ := mem_filterMap.1 hr
  have hji : j = i := (pick_id hj).symm.trans hi
  subst hji
  simp only [pick, Option.map_eq_some_iff] at hj
  obtain ⟨b, -, hb⟩ := hj
  rw [he] at hb
  rw [← hb]
  rfl

/-- More information wins: a payload any place holds is kept, unless erased. -/
theorem settle_keeps {xs : List Record} {a : Record} (ha : a ∈ xs) (hh : a.shown = .here)
    (hn : erasedIn xs a.id = false) : ∃ r ∈ settle xs, r.id = a.id ∧ r.shown = .here := by
  have hfind : ((xs.filter (·.id == a.id)).find? (·.shown == .here)).isSome :=
    find?_isSome.2 ⟨a, mem_filter.2 ⟨ha, by simp⟩, by simp [hh]⟩
  obtain ⟨b, hb⟩ := Option.isSome_iff_exists.1 hfind
  have hbid : b.id = a.id := by simpa using (mem_filter.1 (mem_of_find?_eq_some hb)).2
  have hbh : b.shown = .here := by simpa using find?_some hb
  refine ⟨b, mem_filterMap.2 ⟨a.id, mem_idsOf.2 ⟨a, ha, rfl⟩, ?_⟩, hbid, hbh⟩
  have hbase : baseForm (xs.filter (·.id == a.id)) = some b := by
    unfold baseForm; rw [hb]
  simp only [pick, hbase, Option.map_some, hn, Bool.false_eq_true, ↓reduceIte]

/-! ## Admission -/

theorem mem_admit {may : Record → Record → Bool} {xs : List Record} {r : Record} :
    r ∈ admit may xs ↔ r ∈ xs ∧ entitled may xs r = true := mem_filter

theorem entitled_congr (may : Record → Record → Bool) {xs ys : List Record}
    (h : ∀ q, q ∈ xs ↔ q ∈ ys) (r : Record) : entitled may xs r = entitled may ys r := by
  unfold entitled
  apply Bool.eq_iff_iff.2
  simp only [all_eq_true]
  exact ⟨fun H p hp q hq => H p hp q ((h q).2 hq), fun H p hp q hq => H p hp q ((h q).1 hq)⟩

theorem admit_same (may : Record → Record → Bool) {xs ys : List Record}
    (h : ∀ q, q ∈ xs ↔ q ∈ ys) (r : Record) : r ∈ admit may xs ↔ r ∈ admit may ys := by
  rw [mem_admit, mem_admit, entitled_congr may h, h]

theorem Distinct.filter {xs : List Record} (p : Record → Bool) (h : Distinct xs) :
    Distinct (xs.filter p) :=
  Nodup.sublist ((filter_sublist).map _) h

theorem admit_distinct (may : Record → Record → Bool) {xs : List Record} (h : Distinct xs) :
    Distinct (admit may xs) := h.filter _

/-- An admitted record's `prev` names only held records it shares a thing with
and may replace. -/
theorem admit_no_cross {may : Record → Record → Bool} {xs : List Record} {r q : Record}
    (hr : r ∈ admit may xs) (hq : q ∈ xs) (hp : q.id ∈ r.prev) :
    shares r q = true ∧ may r q = true := by
  have := (mem_admit.1 hr).2
  simp only [entitled, all_eq_true] at this
  have := this q.id hp q hq
  simpa using this

/-- A record is refused exactly when it is not entitled to its `prev`. -/
theorem refusalOf_none (may : Record → Record → Bool) (xs : List Record) (r : Record) :
    refusalOf may xs r = none ↔ entitled may xs r = true := by
  unfold refusalOf
  by_cases hu : (r.prev.all fun p => xs.all fun q => q.id != p || shares r q) = true
  · simp only [hu, Bool.not_true, Bool.false_eq_true, ↓reduceIte]
    by_cases he : entitled may xs r = true <;> simp [he]
  · simp only [hu, Bool.not_false, ↓reduceIte, reduceCtorEq, false_iff]
    intro he
    apply hu
    simp only [entitled, all_eq_true] at he ⊢
    intro p hp q hq
    have := he p hp q hq
    simp only [Bool.or_eq_true, Bool.and_eq_true] at this ⊢
    exact this.imp id (·.1)

/-! ## Per thing -/

theorem stateIn_local {t : String} {xs ys : List Record} (hx : Addressed xs) (hy : Addressed ys)
    (h : ∀ r, (r ∈ xs ∧ r.isAbout t = true) ↔ (r ∈ ys ∧ r.isAbout t = true)) :
    stateIn t xs = stateIn t ys := by
  unfold stateIn
  apply LatestBy.set_decides
    (fun a ha b hb => hx a (mem_filter.1 ha).1 b (mem_filter.1 hb).1)
    (fun a ha b hb => hy a (mem_filter.1 ha).1 b (mem_filter.1 hb).1)
  intro r
  simp only [mem_filter]
  exact h r

theorem thingsOf_same {xs ys : List Record} (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    thingsOf xs = thingsOf ys :=
  canonSet_eq fun s => by simp only [mem_flatMap, h]

/-- The set decides, for every thing. -/
theorem perThing_set_decides {xs ys : List Record} (hx : Addressed xs) (hy : Addressed ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : perThing xs = perThing ys := by
  unfold perThing
  rw [thingsOf_same h]
  exact map_congr_left fun t _ => by rw [stateIn_local hx hy fun r => by rw [h]]

/-! ## Views, per thing -/

theorem things_view {f : Record → Record} (hf : View f) (r : Record) : (f r).things = r.things := by
  simp [Record.things, (hf.envelope r).about]

theorem isAbout_view {f : Record → Record} (hf : View f) (r : Record) (t : String) :
    (f r).isAbout t = r.isAbout t := by
  simp [Record.isAbout, things_view hf]

theorem shares_view {f : Record → Record} (hf : View f) (a b : Record) :
    shares (f a) (f b) = shares a b := by
  simp [shares, things_view hf]

theorem entitled_view {f : Record → Record} (hf : View f) {may : Record → Record → Bool}
    (hm : EnvOnly may) (xs : List Record) (r : Record) :
    entitled may (xs.map f) (f r) = entitled may xs r := by
  have key : ∀ q, may (f r) (f q) = may r q := fun q => hm _ _ _ _ (hf.envelope r) (hf.envelope q)
  unfold entitled
  rw [(hf.envelope r).prev]
  apply Bool.eq_iff_iff.2
  simp only [all_eq_true, mem_map]
  constructor
  · intro H p hp q hq
    have := H p hp (f q) ⟨q, hq, rfl⟩
    rwa [(hf.envelope q).id, shares_view hf, key] at this
  · rintro H p hp _ ⟨q, hq, rfl⟩
    have := H p hp q hq
    rwa [(hf.envelope q).id, shares_view hf, key]

/-- Admission reads only envelopes: a view admits the same records. -/
theorem admit_view {f : Record → Record} (hf : View f) {may : Record → Record → Bool}
    (hm : EnvOnly may) (xs : List Record) : admit may (xs.map f) = (admit may xs).map f := by
  simp only [admit, filter_map]
  congr 1
  apply filter_congr
  intro r _
  simp [Function.comp, entitled_view hf hm]

theorem thingsOf_view {f : Record → Record} (hf : View f) (xs : List Record) :
    thingsOf (xs.map f) = thingsOf xs :=
  canonSet_eq fun s => by
    simp only [mem_flatMap, mem_map]
    constructor
    · rintro ⟨_, ⟨a, ha, rfl⟩, hs⟩; exact ⟨a, ha, by rwa [things_view hf] at hs⟩
    · rintro ⟨a, ha, hs⟩; exact ⟨f a, ⟨a, ha, rfl⟩, by rwa [things_view hf]⟩

/-- A thing's state under a view is the full reader's, with payloads hidden. -/
theorem stateIn_view {f : Record → Record} (hf : View f) (t : String) {xs : List Record}
    (hx : Addressed xs) :
    stateIn t (xs.map f) = ⟨(stateIn t xs).named, (stateIn t xs).heads.map f⟩ := by
  unfold stateIn
  have e : (xs.map f).filter (·.isAbout t) = (xs.filter (·.isAbout t)).map f := by
    rw [filter_map]; congr 1; apply filter_congr; intro r _; simp [Function.comp, isAbout_view hf]
  rw [e]
  exact LatestBy.view hf fun a ha b hb => hx a (mem_filter.1 ha).1 b (mem_filter.1 hb).1

/-- No false resurrection, per thing: a record superseded within a thing is
never current there, in any view. -/
theorem stateIn_no_false_resurrection {f : Record → Record} (hf : View f) {t : String}
    {xs : List Record} (hx : Addressed xs) {r q : Record} (hq : q ∈ xs) (ht : q.isAbout t = true)
    (hr : r.id ∈ q.prev) : ∀ h ∈ (stateIn t (xs.map f)).heads, h.id ≠ r.id := by
  intro h hh e
  rw [stateIn_view hf t hx] at hh
  obtain ⟨g, hg, rfl⟩ := mem_map.1 hh
  have hs := LatestBy.inv_of (xs := xs.filter (·.isAbout t))
    fun a ha b hb => hx a (mem_filter.1 ha).1 b (mem_filter.1 hb).1
  obtain ⟨-, hn⟩ := (hs.heads_mem g).1 hg
  rw [(hf.envelope g).id] at e
  exact hn ⟨q, mem_filter.2 ⟨hq, ht⟩, e ▸ hr⟩

end Loops
