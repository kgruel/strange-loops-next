import Loops.Spec
import Laws.Families
import Laws.Things

/-!
# Laws of the spec

* **Operators.** `not` is the complement of `is` and `absent` of `present`;
  on a number, or a time, exactly one of `at-least` and `below` holds.
  They compare like with like: numbers with numbers, times with times.
* **Times read as what they say.** A test on a time reads its span, never
  its spelling; `at-least` and `below` compare starts, and a record without
  `occurred` passes neither.
* **Totality.** A test answers for every record whose payload is here; a
  test on the envelope answers for every record.
* **A `where` map is a set of tests.** Their order never matters.
* **Views only lose information.** Under a view each test, and each `where`
  map, keeps its answer or becomes unknown. Selection by `from` reads only
  envelopes, so a view selects the same records.
* **The set decides, for every spec.** Every slot gives the same value for
  the same set of records.
* **Selection comes after supersession.** Slots over heads read each thing's
  state over everything held; under a view, that state is the full reader's
  with payloads hidden.
-/

namespace Loops

open List

/-! ## Operators -/

theorem Op.not_is (a : Arg) (xs : List Item) : (Op.not a).test xs = !(Op.is a).test xs := rfl

theorem Op.absent_present (xs : List Item) : Op.absent.test xs = !Op.present.test xs := by
  cases xs <;> rfl

theorem Op.atLeast_below (i j : Int) :
    (Op.atLeast (.val (.int i))).test [.val (.int j)] = !(Op.below (.val (.int i))).test [.val (.int j)] := by
  simp only [Op.test, any_cons, any_nil, Bool.or_false, Item.atLeast, Item.below, ← decide_not]
  simp only [decide_eq_decide]
  omega

/-- On a time, exactly one of `at-least` and `below` holds. -/
theorem Op.atLeast_below_time (c : Claim) (s : Span) :
    (Op.atLeast (.time c)).test [.time s] = !(Op.below (.time c)).test [.time s] := by
  simp only [Op.test, any_cons, any_nil, Bool.or_false, Item.atLeast, Item.below, ← decide_not]
  simp only [decide_eq_decide]
  exact List.not_lt.symm

/-- Whether a bound and an item are alike: two numbers, or two times. -/
def Item.like : Arg → Item → Bool
  | .val (.int _), .val (.int _) => true
  | .time _, .time _ => true
  | _, _ => false

/-- `at-least` and `below` compare like with like: on items unlike the bound,
neither holds. -/
theorem Op.ordered_like_only (a : Arg) {xs : List Item} (h : ∀ x ∈ xs, Item.like a x = false) :
    (Op.atLeast a).test xs = false ∧ (Op.below a).test xs = false := by
  simp only [Op.test, any_eq_false]
  constructor <;> intro x hx <;> have := h x hx <;>
    rcases a with (_ | _ | _) | _ <;> rcases x with (_ | _ | _) | _ <;>
    simp_all [Item.like, Item.atLeast, Item.below]

/-- A test on `env.about` asks whether the record is about a thing. -/
theorem Cond.about_is (t : String) (r : Record) :
    Cond.eval ⟨.env .about, .is (.val (.str t))⟩ r = .ofBool (r.about.contains t) := by
  simp only [Cond.eval, Field.read, Op.test]
  congr 1
  cases h : r.about.contains t <;> simp_all [Arg.matches]
  intro x hx e
  exact h (e ▸ hx)

/-! ## Times -/

/-- `at-least` on `occurred` compares starts, and needs an `occurred`. -/
theorem Cond.occurred_atLeast (c : Claim) (r : Record) :
    Cond.eval ⟨.env .occurred, .atLeast (.time c)⟩ r = .yes ↔
      ∃ k, r.occurred = some k ∧ c.span.start ≤ k.span.start := by
  cases h : r.occurred <;> simp [Cond.eval, Field.read, Op.test, Item.atLeast, h, Tri.ofBool]

/-- `below` on `occurred` compares starts, and needs an `occurred`. -/
theorem Cond.occurred_below (c : Claim) (r : Record) :
    Cond.eval ⟨.env .occurred, .below (.time c)⟩ r = .yes ↔
      ∃ k, r.occurred = some k ∧ k.span.start < c.span.start := by
  cases h : r.occurred <;> simp [Cond.eval, Field.read, Op.test, Item.below, h, Tri.ofBool]

/-- `is` on `occurred` asks for the same span, however either is spelled. -/
theorem Cond.occurred_is (c : Claim) (r : Record) :
    Cond.eval ⟨.env .occurred, .is (.time c)⟩ r = .yes ↔
      ∃ k, r.occurred = some k ∧ k.span = c.span := by
  cases h : r.occurred with
  | none => simp [Cond.eval, Field.read, Op.test, h, Tri.ofBool]
  | some k =>
    simp only [Cond.eval, Field.read, h, Option.toList_some, List.map_cons, List.map_nil, Op.test,
      List.any_cons, List.any_nil, Bool.or_false, Function.comp, Arg.matches, Option.some.injEq,
      exists_eq_left']
    unfold Tri.ofBool
    by_cases e : c.span = k.span
    · simp [e]
    · have : (c.span == k.span) = false := by simpa using e
      simp only [this]
      exact ⟨fun h => (by cases h), fun h => absurd h.symm e⟩

/-- A record without `occurred` passes neither `at-least` nor `below` on it. -/
theorem Cond.occurred_missing (a : Arg) {r : Record} (h : r.occurred = none) :
    Cond.eval ⟨.env .occurred, .atLeast a⟩ r = .no ∧ Cond.eval ⟨.env .occurred, .below a⟩ r = .no := by
  simp [Cond.eval, Field.read, Op.test, h, Tri.ofBool]

/-- A test on a time reads what it says, not how it is spelled: records whose
times read alike answer alike. -/
theorem Cond.time_meaning {f : EnvField} (hf : f.type = .time) (op : Op) {r r' : Record}
    (ho : r.occurred.map (·.span) = r'.occurred.map (·.span))
    (he : r.emitted.moment = r'.emitted.moment) :
    Cond.eval ⟨.env f, op⟩ r = Cond.eval ⟨.env f, op⟩ r' := by
  cases f <;> simp [EnvField.type] at hf
  · simp [Cond.eval, Field.read, he]
  · have : (r.occurred.toList.map (Item.time ∘ (·.span))) = (r'.occurred.toList.map (Item.time ∘ (·.span))) := by
      cases h1 : r.occurred <;> cases h2 : r'.occurred <;> simp_all
    simp only [Cond.eval, Field.read, this]

/-! ## Totality -/

theorem Tri.ofBool_ne (b : Bool) : Tri.ofBool b ≠ .unknown := by cases b <;> decide

/-- A test answers for every record whose payload is here. -/
theorem Cond.eval_here (c : Cond) {r : Record} (h : r.shown = .here) : c.eval r ≠ .unknown := by
  unfold Cond.eval
  split
  · exact Tri.ofBool_ne _
  · rename_i hf
    rcases hc : c.field with f | n
    · cases f <;> simp [hc, Field.read] at hf
    · simp [hc, Field.read, h] at hf

/-- A test on the envelope answers for every record. -/
theorem Cond.eval_envelope (c : Cond) (h : c.field.onEnvelope = true) (r : Record) :
    c.eval r ≠ .unknown := by
  unfold Cond.eval
  split
  · exact Tri.ofBool_ne _
  · rename_i hf
    rcases hc : c.field with f | n
    · cases f <;> simp [hc, Field.read] at hf
    · simp [hc, Field.onEnvelope] at h

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
  have he := hf.envelope r
  rcases c with ⟨fld, op⟩
  cases fld with
  | env f =>
    exact Or.inr (by
      cases f <;> simp [Cond.eval, Field.read, he.kind, he.observer, he.about, he.prev, he.under,
        he.erases, he.emitted, he.occurred])
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
  have he := hf.envelope r
  simp [Source.takes, he.kind, he.about]

theorem Spec.takes_view {f : Record → Record} (hf : View f) (sp : Spec) (r : Record) :
    sp.takes (f r) = sp.takes r := by
  simp [Spec.takes, Source.takes_view hf]

/-- Selection reads only envelopes: a view selects the same records. -/
theorem Spec.select_view {f : Record → Record} (hf : View f) (sp : Spec) (xs : List Record) :
    sp.select (xs.map f) = (sp.select xs).map f := by
  simp only [Spec.select, filter_map]
  congr 1
  apply filter_congr
  intro r _
  simp [Function.comp, Spec.takes_view hf]

/-! ## The set decides, for every spec -/

theorem Addressed.filter {xs : List Record} (p : Record → Bool) (h : Addressed xs) :
    Addressed (xs.filter p) := fun a ha b hb => h a (mem_filter.1 ha).1 b (mem_filter.1 hb).1

theorem Addressed.unlinked {xs : List Record} (h : Addressed xs) :
    Addressed (xs.map Record.unlinked) := by
  intro a' ha' b' hb' e
  obtain ⟨a, ha, rfl⟩ := mem_map.1 ha'
  obtain ⟨b, hb, rfl⟩ := mem_map.1 hb'
  rw [h a ha b hb e]

theorem newestFirst_eq {xs ys : List Record} (hx : Addressed xs) (hy : Addressed ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) : newestFirst xs = newestFirst ys := by
  unfold newestFirst
  rw [LatestBy.set_decides hx.unlinked hy.unlinked fun r => by simp only [mem_map, h]]

theorem latestOf_set_decides (sel : Record → Bool) (cs : List Cond) {xs ys : List Record}
    (hx : Addressed xs) (hy : Addressed ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    latestOf sel cs xs = latestOf sel cs ys := by
  unfold latestOf
  rw [perThing_set_decides hx hy h]

theorem collectOf_set_decides (sel : Record → Bool) (cs : List Cond) (follow : Bool)
    (limit : Option Nat) {xs ys : List Record} (hx : Addressed xs) (hy : Addressed ys)
    (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    collectOf sel cs follow limit xs = collectOf sel cs follow limit ys := by
  have hp : newestFirst ((if follow then (perThing xs).flatMap (·.2.heads) else xs).filter
        (chosen sel cs)) =
      newestFirst ((if follow then (perThing ys).flatMap (·.2.heads) else ys).filter
        (chosen sel cs)) := by
    cases follow
    · simp only [Bool.false_eq_true, ↓reduceIte]
      exact newestFirst_eq (hx.filter _) (hy.filter _) fun r => by simp [mem_filter, h]
    · simp only [↓reduceIte]
      rw [perThing_set_decides hx hy h]
  unfold collectOf
  simp only [hp]

/-- Every slot gives the same value for the same set of records. -/
theorem Slot.set_decides (s : Slot) (sel : Record → Bool) {xs ys : List Record}
    (hx : Distinct xs) (hy : Distinct ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    s.run sel xs = s.run sel ys := by
  unfold Slot.run
  split
  all_goals dsimp only
  · rw [Acc.select_set_decides _ _ hx hy h]
  · rw [Acc.select_set_decides _ _ hx hy h]
  · rw [Acc.select_set_decides _ _ hx hy h]
  · rw [Acc.select_set_decides _ _ hx hy h]
  · exact latestOf_set_decides _ _ hx.addressed hy.addressed h
  · exact collectOf_set_decides _ _ _ _ hx.addressed hy.addressed h

/-- The set decides, for every spec, under any rule for who may replace whom. -/
theorem Spec.set_decides (sp : Spec) (may : Record → Record → Bool) {xs ys : List Record}
    (hx : Distinct xs) (hy : Distinct ys) (h : ∀ r, r ∈ xs ↔ r ∈ ys) :
    sp.run xs may = sp.run ys may := by
  unfold Spec.run
  exact map_congr_left fun s _ => by
    rw [s.set_decides sp.takes (admit_distinct may hx) (admit_distinct may hy) (admit_same may h)]

/-! ## Selection after supersession -/

/-- What a spec's heads read under a view: every thing's state is the full
reader's, with payloads hidden. Withholding never brings back what was
superseded, and neither does selecting by kind, `about` or `from`, since
selection only ever looks at heads. -/
theorem Spec.view_state {f : Record → Record} (hf : View f) {may : Record → Record → Bool}
    (hm : EnvOnly may) {xs : List Record} (hx : Distinct xs) :
    perThing (admit may (xs.map f)) =
      (perThing (admit may xs)).map fun p => (p.1, ⟨p.2.named, p.2.heads.map f⟩) := by
  rw [admit_view hf hm]
  unfold perThing
  rw [thingsOf_view hf, map_map]
  exact map_congr_left fun t _ => by
    simp only [Function.comp]
    rw [stateIn_view hf t (admit_distinct may hx).addressed]

end Loops
