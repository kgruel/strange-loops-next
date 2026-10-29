import Loops.Things
import Laws.Families
import Laws.Record

/-!
# Laws of things and of what a reader holds

* **Settling is a function of what the places hold.** Whatever order the
  places are read in, and however often a form repeats, a reader keeps the
  same records, one per id (`settle_eq`, `settle_distinct`).
* **More information wins; erasure sticks.** A payload any place holds is
  kept, unless a record in the set names it in `erases`; then every form is
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
  obtain ⟨h1, h2, h3, h4, h5, h6, h7, h8, h9⟩ := h
  cases a; cases b
  simp only at h1 h2 h3 h4 h5 h6 h7 h8 h9
  subst h1 h2 h3 h4 h5 h6 h7 h8 h9
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

/-- Erasure sticks: once a record whose `erases` names `i` is held, the record kept
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
  simp [Record.things, (hf.envelope r).about, (hf.envelope r).id]

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

/-! ## Whole-reader heads -/

def perHeads (xs : List Record) : List Record :=
  (perThing xs).flatMap fun ts => ts.2.heads

theorem mem_perHeads {xs : List Record} {r : Record} :
    r ∈ perHeads xs ↔ ∃ t ∈ thingsOf xs, r ∈ (stateIn t xs).heads := by
  simp only [perHeads, perThing, flatMap_map, mem_flatMap]

theorem perHeads_sub {xs : List Record} (hx : Addressed xs) {r : Record}
    (hr : r ∈ perHeads xs) : r ∈ xs := by
  obtain ⟨t, _, ht⟩ := mem_perHeads.1 hr
  exact (mem_filter.1 (((LatestBy.inv_of (fun a ha b hb =>
    hx a (mem_filter.1 ha).1 b (mem_filter.1 hb).1)).heads_mem r).1 ht).1).1

theorem perHeads_addressed {xs : List Record} (hx : Addressed xs) : Addressed (perHeads xs) :=
  fun a ha b hb => hx a (perHeads_sub hx ha) b (perHeads_sub hx hb)

theorem mem_insertRecs {rs hs : List Record} {r : Record} :
    r ∈ rs.foldl (fun hs r => insertRec r hs) hs ↔ r ∈ rs ∨ r ∈ hs := by
  induction rs generalizing hs with
  | nil => simp
  | cons a rs ih => simp only [foldl_cons, ih, mem_insertRec, mem_cons]; grind

theorem sorted_insertRecs {pool rs hs : List Record} (hp : Addressed pool)
    (hr : ∀ r ∈ rs, r ∈ pool) (hh : ∀ r ∈ hs, r ∈ pool) (hsort : hs.Pairwise Newer) :
    (rs.foldl (fun hs r => insertRec r hs) hs).Pairwise Newer := by
  induction rs generalizing hs with
  | nil => exact hsort
  | cons r rs ih =>
    apply ih (fun a ha => hr a (mem_cons_of_mem _ ha))
    · intro a ha
      rcases mem_insertRec.1 ha with he | ha
      · exact he ▸ hr r mem_cons_self
      · exact hh a ha
    · apply sorted_insertRec hsort
      intro a ha
      rcases Newer.total r a with h | h | h
      · exact Or.inl h
      · exact Or.inr (Or.inl h)
      · exact Or.inr (Or.inr (hp r (hr r mem_cons_self) a (hh a ha) h))

theorem mem_orderHeads {xs : List Record} (hx : Addressed xs) {r : Record} :
    r ∈ orderHeads xs ↔ r ∈ xs := by
  simp only [orderHeads, mem_insertRecs, mem_nil_iff, or_false, mem_dedup hx]

theorem orderHeads_sorted {xs : List Record} (hx : Addressed xs) :
    (orderHeads xs).Pairwise Newer :=
  sorted_insertRecs hx (fun _ h => mem_dedup_sub h) (by simp) (by simp)

/-- Whole-reader heads are exactly the heads of some thing. -/
theorem mem_wholeHeads {xs : List Record} (hx : Addressed xs) {r : Record} :
    r ∈ wholeHeads xs ↔ ∃ t ∈ thingsOf xs, r ∈ (stateIn t xs).heads := by
  exact (mem_orderHeads (perHeads_addressed hx)).trans mem_perHeads

theorem wholeHeads_sorted {xs : List Record} (hx : Addressed xs) :
    (wholeHeads xs).Pairwise Newer := orderHeads_sorted (perHeads_addressed hx)

/-- Each whole-reader head has a distinct id. -/
theorem wholeHeads_distinct {xs : List Record} (hx : Addressed xs) : Distinct (wholeHeads xs) := by
  unfold Distinct List.Nodup
  rw [pairwise_map]
  apply (wholeHeads_sorted hx).imp_of_mem
  intro a b ha hb hn he
  have ham := perHeads_sub hx ((mem_orderHeads (perHeads_addressed hx)).1 ha)
  have hbm := perHeads_sub hx ((mem_orderHeads (perHeads_addressed hx)).1 hb)
  have hab := hx a ham b hbm he
  subst hab
  exact Newer.irrefl _ hn

/-- Other Latest heads stay in content order. -/
theorem Latest.others_ordered {xs : List Record} (hx : Addressed xs) :
    (Latest.others (Latest.fold xs)).Pairwise Newer :=
  (wholeHeads_sorted hx).sublist (drop_sublist 1 (wholeHeads xs))

/-- Latest chooses the newest head across the whole reader view. -/
theorem Latest.winner_newest {xs : List Record} (hx : Addressed xs) {w : Record}
    (hw : Latest.winner (Latest.fold xs) = some w) :
    (∃ t ∈ thingsOf xs, w ∈ (stateIn t xs).heads) ∧
    ∀ o ∈ wholeHeads xs, o = w ∨ Newer w o := by
  have hs := wholeHeads_sorted hx
  change (wholeHeads xs).head? = some w at hw
  cases he : wholeHeads xs with
  | nil => simp [he] at hw
  | cons h tail =>
    simp only [he, head?_cons, Option.some.injEq] at hw
    subst h
    rw [he, pairwise_cons] at hs
    exact ⟨(mem_wholeHeads hx).1 (by rw [he]; exact mem_cons_self),
      fun o ho => (mem_cons.1 (he ▸ ho)).elim (fun e => Or.inl e)
        (fun hm => Or.inr (hs.1 o hm))⟩

theorem mem_canonSet {s : String} {xs : List String} : s ∈ canonSet xs ↔ s ∈ xs :=
  mem_sortBy (fun _ _ _ _ e => utf16_inj e) s

/-- All records name exactly one shared thing. -/
def OneThing (t : String) (xs : List Record) : Prop :=
  ∀ r ∈ xs, r.things = [t]

theorem oneThing_state {t : String} {xs : List Record} (ht : OneThing t xs) :
    stateIn t xs = LatestBy.fold .empty xs := by
  unfold stateIn
  congr 1
  exact filter_eq_self.2 fun r hr => by simp [Record.isAbout, ht r hr]

theorem oneThing_key {t u : String} {xs : List Record} (ht : OneThing t xs)
    (hu : u ∈ thingsOf xs) : u = t := by
  obtain ⟨r, hr, hu⟩ := mem_flatMap.1 (mem_canonSet.1 hu)
  simpa [ht r hr] using hu

theorem oneThing_heads {t : String} {xs : List Record} (hx : Addressed xs) (ht : OneThing t xs)
    {r : Record} : r ∈ wholeHeads xs ↔ r ∈ (LatestBy.fold .empty xs).heads := by
  rw [mem_wholeHeads hx]
  constructor
  · rintro ⟨u, hu, hr⟩
    rw [oneThing_key ht hu, oneThing_state ht] at hr
    exact hr
  · intro hr
    have hm := ((LatestBy.inv_of hx).heads_mem r).1 hr
    refine ⟨t, mem_canonSet.2 (mem_flatMap.2 ⟨r, hm.1, ?_⟩), ?_⟩
    · simp [ht r hm.1]
    · rwa [oneThing_state ht]

/-- One-thing input preserves the previous Latest state exactly. -/
theorem Latest.oneThing {t : String} {xs : List Record} (hx : Addressed xs) (ht : OneThing t xs) :
    Latest.fold xs = LatestBy.fold .empty xs := by
  have inv := LatestBy.inv_of hx
  suffices hn : (Latest.fold xs).named = (LatestBy.fold .empty xs).named from by
    suffices hh : (Latest.fold xs).heads = (LatestBy.fold .empty xs).heads from by
      cases h₁ : Latest.fold xs; cases h₂ : LatestBy.fold .empty xs; simp_all
    apply Perm.eq_of_pairwise (le := Newer) (fun _ _ _ _ h₁ h₂ => absurd h₂ h₁.asymm)
      (wholeHeads_sorted hx) inv.heads_sorted
    have ne : ∀ {a b : Record}, Newer a b → a ≠ b := fun h e => by subst e; exact Newer.irrefl _ h
    apply (perm_ext_iff_of_nodup ((wholeHeads_sorted hx).imp ne) (inv.heads_sorted.imp ne)).2
    exact fun r => oneThing_heads hx ht
  apply Perm.eq_of_pairwise (le := (· < ·)) (fun _ _ _ _ h₁ h₂ => by omega)
    (sorted_insertIds (by simp)) inv.named_sorted
  apply (perm_ext_iff_of_nodup ((sorted_insertIds (by simp)).imp Nat.ne_of_lt)
    (inv.named_sorted.imp Nat.ne_of_lt)).2
  intro n
  change n ∈ (((perThing xs).map (·.2)).flatMap (·.named)).foldl
    (fun ns n => insertId n ns) [] ↔ _
  simp only [mem_insertIds, mem_nil_iff, or_false, mem_flatMap, mem_map, Prod.exists]
  rw [inv.named_mem]
  constructor
  · rintro ⟨s, ⟨u, st, hu, rfl⟩, hn⟩
    obtain ⟨v, hv, he⟩ := mem_map.1 hu
    cases he
    rw [oneThing_key ht hv, oneThing_state ht] at hn
    exact (inv.named_mem n).1 hn
  · rintro ⟨r, hr, hn⟩
    have hkey : t ∈ thingsOf xs := mem_canonSet.2 (mem_flatMap.2 ⟨r, hr, by simp [ht r hr]⟩)
    exact ⟨stateIn t xs, ⟨t, stateIn t xs, mem_map_of_mem hkey, rfl⟩,
      by rw [oneThing_state ht]; exact (inv.named_mem n).2 ⟨r, hr, hn⟩⟩
/-- The input set decides Latest, including its ordered other heads. -/
theorem Latest.set_decides {xs ys : List Record} (hx : Addressed xs) (hy : Addressed ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : Latest.fold xs = Latest.fold ys := by
  simp only [Latest.fold, wholeHeads, perThing_set_decides hx hy h]

/-- Arrival order does not change the whole-reader state. -/
theorem Latest.perm {xs ys : List Record} (hx : Addressed xs) (h : xs ~ ys) :
    Latest.fold xs = Latest.fold ys :=
  Latest.set_decides hx
    (fun a ha b hb => hx a (h.mem_iff.mpr ha) b (h.mem_iff.mpr hb))
    (fun _ => h.mem_iff)

theorem Latest.repeats {xs : List Record} (hx : Addressed xs) :
    Latest.fold (xs ++ xs) = Latest.fold xs :=
  Latest.set_decides (fun a ha b hb => hx a (by simpa using ha) b (by simpa using hb)) hx
    (by simp)

end Loops
