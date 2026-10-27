import Loops.Spec
import Laws.Families
import Laws.Things

/-!
# Laws of the spec

* **Operators.** `not` is the complement of `is` and `absent` of `present`;
  on a number, or a time, exactly one of `at-least` and `below` holds.
  They compare like with like: numbers with numbers, times with times.
* **Each field reads as what it holds.** `kind` and `observer` as their
  text, a set as its members, `emitted` as its own instant.
* **Times read as what they say.** A test on a time reads its span, never
  its spelling, the record's or the argument's; `at-least` and `below`
  compare starts, and a record without `occurred` passes neither.
* **Parsing accepts exactly what fits.** A test is accepted when its
  argument is what layer 0 would accept in its field, and it renders back to
  what was written; a spec with a repeated key is refused where it repeats.
* **Totality.** A test answers for every record whose payload is here; a
  test on the envelope answers for every record.
* **A `where` map is a set of tests.** Their order never matters.
* **Views only lose information.** Under a view each test, and each `where`
  map, keeps its answer or becomes unknown. Selection by `from` reads only
  envelopes, so a view selects the same records.
* **The set decides, for every spec.** Every slot gives the same value for
  the same set of records.
* **Selection comes after supersession.** Slots over heads return only
  heads: records no record about their thing has superseded. Under a view,
  each thing's state is the full reader's with payloads hidden.
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

/-! ## What each field reads -/

/-- On a set, `present` asks whether it holds anything. -/
theorem Cond.set_present (r : Record) :
    Cond.eval ⟨.env .about, .present⟩ r = .ofBool !r.about.isEmpty ∧
    Cond.eval ⟨.env .prev, .present⟩ r = .ofBool !r.prev.isEmpty ∧
    Cond.eval ⟨.env .under, .present⟩ r = .ofBool r.under.isSome ∧
    Cond.eval ⟨.env .erases, .present⟩ r = .ofBool !r.erases.isEmpty := by
  refine ⟨?_, ?_, ?_, ?_⟩ <;> simp [Cond.eval, Field.read, Op.test]
  cases r.under <;> rfl

/-- `is` on `kind` or `observer` asks for that text. -/
theorem Cond.text_is (t : String) (r : Record) :
    Cond.eval ⟨.env .kind, .is (.val (.str t))⟩ r = .ofBool (t == r.kind) ∧
    Cond.eval ⟨.env .observer, .is (.val (.str t))⟩ r = .ofBool (t == r.observer) := by
  have e : ∀ a b : String, (Val.str a == Val.str b) = (a == b) := by
    intro a b
    by_cases h : a = b
    · subst h; simp
    · have : (Val.str a == Val.str b) = false := by simp [h]
      rw [this]; simp [h]
  simp [Cond.eval, Field.read, Op.test, Arg.matches, e]

/-- A test on `env.about` asks whether the record is about a thing. -/
theorem Cond.about_is (t : String) (r : Record) :
    Cond.eval ⟨.env .about, .is (.val (.str t))⟩ r = .ofBool (r.about.contains t) := by
  simp only [Cond.eval, Field.read, Op.test]
  congr 1
  cases h : r.about.contains t <;> simp_all [Arg.matches]
  intro x hx e
  exact h (e ▸ hx)

/-- `is` on `emitted` asks whether the bound is the instant it was stamped. -/
theorem Cond.emitted_is (c : Claim) (r : Record) :
    Cond.eval ⟨.env .emitted, .is (.time c)⟩ r = .ofBool (c.span == Span.point r.emitted.moment) := by
  simp [Cond.eval, Field.read, Op.test, Arg.matches]

/-- `at-least` on `emitted` compares the bound's start with the instant. -/
theorem Cond.emitted_atLeast (c : Claim) (r : Record) :
    Cond.eval ⟨.env .emitted, .atLeast (.time c)⟩ r = .ofBool (decide (c.span.start ≤ r.emitted.moment)) := by
  simp [Cond.eval, Field.read, Op.test, Item.atLeast, Span.point]

/-- `below` on `emitted` compares the instant with the bound's start. -/
theorem Cond.emitted_below (c : Claim) (r : Record) :
    Cond.eval ⟨.env .emitted, .below (.time c)⟩ r = .ofBool (decide (r.emitted.moment < c.span.start)) := by
  simp [Cond.eval, Field.read, Op.test, Item.below, Span.point]

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

/-- A time argument reads as what it says: arguments spelled differently that
read as the same span answer alike. -/
theorem Op.time_arg_meaning {c₁ c₂ : Claim} (hc : c₁.span = c₂.span) (xs : List Item) :
    (Op.is (.time c₁)).test xs = (Op.is (.time c₂)).test xs ∧
    (Op.not (.time c₁)).test xs = (Op.not (.time c₂)).test xs ∧
    (Op.atLeast (.time c₁)).test xs = (Op.atLeast (.time c₂)).test xs ∧
    (Op.below (.time c₁)).test xs = (Op.below (.time c₂)).test xs := by
  have hm : Arg.matches (.time c₁) = Arg.matches (.time c₂) := by
    funext x; cases x <;> simp [Arg.matches, hc]
  have hal : Item.atLeast (.time c₁) = Item.atLeast (.time c₂) := by
    funext x; cases x <;> simp [Item.atLeast, hc]
  have hbl : Item.below (.time c₁) = Item.below (.time c₂) := by
    funext x; cases x <;> simp [Item.below, hc]
  simp [Op.test, hm, hal, hbl]

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

/-! ## Parsing -/

/-- What layer 0 would accept in a field of this type, as a test's argument. -/
def Arg.Fits : FieldType → Arg → Prop
  | .text, .val (.str s) => s.isEmpty = false
  | .refs, .val (.str s) => typedRef s = true
  | .ids, .val (.str s) => recordId s = true
  | .time, .time c => Claim.of? c.text = some c
  | .payload, .val _ => True
  | _, _ => False

/-- A bound: a time on a time, a number on a payload field. -/
def Arg.Bounds : FieldType → Arg → Prop
  | .time, .time c => Claim.of? c.text = some c
  | .payload, .val (.int _) => True
  | _, _ => False

def Op.Fits (ty : FieldType) : Op → Prop
  | .is a | .not a => a.Fits ty
  | .present | .absent => True
  | .atLeast a | .below a => a.Bounds ty

theorem Claim.of?_text {s : String} {c : Claim} (h : Claim.of? s = some c) : c.text = s := by
  unfold Claim.of? at h
  split at h <;> simp at h
  cases h; rfl

theorem parseArg_ok_iff (ty : FieldType) (path : String) (j : Json) (a : Arg) :
    parseArg ty path j = .ok a ↔ a.Fits ty ∧ a.toJson = j := by
  constructor
  · intro h
    cases j with
    | str s =>
      cases ty <;> simp only [parseArg, refuse, pure, Except.pure] at h
      · split at h
        · cases h
        · rename_i hr; cases h; exact ⟨by simpa [Arg.Fits] using hr, rfl⟩
      · split at h
        · rename_i hr; cases h; exact ⟨hr, rfl⟩
        · cases h
      · split at h
        · rename_i hr; cases h; exact ⟨hr, rfl⟩
        · cases h
      · split at h
        · rename_i c hc; cases h
          exact ⟨by simpa [Arg.Fits, Claim.of?_text hc] using hc, by simp [Arg.toJson, Claim.of?_text hc]⟩
        · cases h
      · cases h; exact ⟨trivial, rfl⟩
    | int i =>
      simp only [parseArg, refuse, pure, Except.pure] at h
      split at h
      · rename_i hty; cases h; subst hty; exact ⟨trivial, rfl⟩
      · cases h
    | bool b =>
      simp only [parseArg, refuse, pure, Except.pure] at h
      split at h
      · rename_i hty; cases h; subst hty; exact ⟨trivial, rfl⟩
      · cases h
    | _ => cases h
  · rintro ⟨hf, rfl⟩
    rcases a with (_ | _ | _) | c <;> cases ty <;>
      simp_all [Arg.Fits, Arg.toJson, Val.toJson, parseArg, pure, Except.pure]

theorem parseBound_ok_iff (ty : FieldType) (path : String) (j : Json) (a : Arg) :
    parseBound ty path j = .ok a ↔ a.Bounds ty ∧ a.toJson = j := by
  constructor
  · intro h
    cases j with
    | int i =>
      simp only [parseBound, refuse, pure, Except.pure] at h
      split at h
      · rename_i hty; cases h; subst hty; exact ⟨trivial, rfl⟩
      · cases h
    | str s =>
      simp only [parseBound, refuse] at h
      split at h
      · rename_i hty; subst hty
        obtain ⟨hf, hj⟩ := (parseArg_ok_iff .time path (.str s) a).1 h
        rcases a with _ | c
        · simp [Arg.Fits] at hf
        · exact ⟨hf, hj⟩
      · cases h
    | _ => cases h
  · rintro ⟨hf, rfl⟩
    rcases a with (_ | _ | _) | c <;> cases ty <;>
      simp only [Arg.Bounds, Arg.toJson, Val.toJson, parseBound, pure, Except.pure, ↓reduceIte] at hf ⊢
    exact (parseArg_ok_iff .time path (.str c.text) (.time c)).2 ⟨hf, rfl⟩

/-- A test is accepted exactly when its argument fits its field, and it
renders back to what was written. -/
theorem parseOp_ok_iff (ty : FieldType) (path : String) (kv : String × Json) (op : Op) :
    parseOp ty path kv = .ok op ↔ op.Fits ty ∧ op.toJson = kv := by
  constructor
  · intro h
    unfold parseOp at h
    split at h
    all_goals first
      | (cases h; exact ⟨trivial, rfl⟩)
      | cases h
      | (rename_i v
         simp only [Functor.map, Except.map] at h
         split at h
         · cases h
         · rename_i a ha; cases h
           first
             | (obtain ⟨hf, hj⟩ := (parseArg_ok_iff ty path v a).1 ha
                exact ⟨hf, by simp [Op.toJson, hj]⟩)
             | (obtain ⟨hf, hj⟩ := (parseBound_ok_iff ty path v a).1 ha
                exact ⟨hf, by simp [Op.toJson, hj]⟩))
  · rintro ⟨hf, rfl⟩
    cases op <;> simp only [Op.Fits, Op.toJson, parseOp, pure, Except.pure, Functor.map, Except.map] at hf ⊢
    · rw [(parseArg_ok_iff ty path _ _).2 ⟨hf, rfl⟩]
    · rw [(parseArg_ok_iff ty path _ _).2 ⟨hf, rfl⟩]
    · rw [(parseBound_ok_iff ty path _ _).2 ⟨hf, rfl⟩]
    · rw [(parseBound_ok_iff ty path _ _).2 ⟨hf, rfl⟩]

theorem Option.orElse_eq_none {α : Type} {a : Option α} {b : Unit → Option α} :
    a.orElse b = none ↔ a = none ∧ b () = none := by
  cases a <;> simp [Option.orElse]

mutual
theorem Json.repeatAt_none (path : String) : (j : Json) → (j.repeatAt path = none ↔ j.keysDistinct = true)
  | .arr xs => by simp only [Json.repeatAt, Json.keysDistinct]; exact Json.repeatIn_none path xs
  | .obj kvs => by
    simp only [Json.repeatAt, Json.keysDistinct, Bool.and_eq_true, decide_eq_true_eq]
    rw [Json.repeatMember_none path [] kvs]
    simp
  | .null | .bool _ | .int _ | .str _ => by simp [Json.repeatAt, Json.keysDistinct]

theorem Json.repeatIn_none (path : String) : (xs : List Json) →
    (Json.repeatIn path xs = none ↔ Json.allDistinct xs = true)
  | [] => by simp [Json.repeatIn, Json.allDistinct]
  | x :: xs => by
    simp only [Json.repeatIn, Json.allDistinct, Option.orElse_eq_none, Bool.and_eq_true]
    rw [Json.repeatAt_none path x, Json.repeatIn_none path xs]

theorem Json.repeatMember_none (path : String) (seen : List String) : (kvs : List (String × Json)) →
    (Json.repeatMember path seen kvs = none ↔
      (∀ k ∈ kvs.map (·.1), k ∉ seen) ∧ (kvs.map (·.1)).Nodup ∧ Json.membersDistinct kvs = true)
  | [] => by simp [Json.repeatMember, Json.membersDistinct]
  | (k, v) :: kvs => by
    simp only [Json.repeatMember, Json.membersDistinct, Bool.and_eq_true, map_cons, mem_cons,
      forall_eq_or_imp, nodup_cons]
    by_cases hk : seen.contains k = true
    · simp only [hk, ↓reduceIte, reduceCtorEq, false_iff]
      intro ⟨⟨h, _⟩, _⟩
      exact h (by simpa using hk)
    · simp only [hk, Bool.false_eq_true, ↓reduceIte, Option.orElse_eq_none]
      rw [Json.repeatAt_none, Json.repeatMember_none path (k :: seen) kvs]
      simp only [Bool.not_eq_true, List.contains_eq_any_beq, any_eq_false, beq_iff_eq] at hk
      simp only [mem_map, mem_cons, not_or, forall_exists_index, and_imp]
      have hk' : k ∉ seen := fun h => hk k h rfl
      constructor
      · rintro ⟨hv, hr, hn, hm⟩
        exact ⟨⟨hk', fun a x hx e => (hr a x hx e).2⟩,
          ⟨fun ⟨x, hx, e⟩ => (hr k x hx e).1 rfl, hn⟩, hv, hm⟩
      · rintro ⟨⟨-, hs⟩, ⟨hnk, hn⟩, hv, hm⟩
        exact ⟨hv, fun a x hx e => ⟨fun ha => hnk ⟨x, hx, e.trans ha⟩, hs a x hx e⟩, hn, hm⟩
end

/-- A spec with a repeated key is refused at the first repeat, as layer 0 refuses a payload. -/
theorem Spec.ofJson_repeat {j : Json} (h : j.keysDistinct = false) :
    ∃ p, j.repeatAt "" = some p ∧ Spec.ofJson j = refuse "member-duplicate" p := by
  cases e : j.repeatAt "" with
  | none => simp [(Json.repeatAt_none "" j).1 e] at h
  | some p => exact ⟨p, rfl, by simp [Spec.ofJson, h, e]⟩

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

/-- A head of thing `t`: held, about `t`, and named in no `prev` of a record about `t`. -/
def HeadOf (xs : List Record) (t : String) (r : Record) : Prop :=
  r ∈ xs ∧ r.isAbout t ∧ ¬ ∃ q ∈ xs, q.isAbout t ∧ r.id ∈ q.prev

theorem stateIn_heads {xs : List Record} (hx : Addressed xs) {t : String} {r : Record}
    (h : r ∈ (stateIn t xs).heads) : HeadOf xs t r := by
  obtain ⟨hm, hn⟩ := ((LatestBy.inv_of (hx.filter (·.isAbout t))).heads_mem r).1 h
  obtain ⟨hr, ha⟩ := mem_filter.1 hm
  exact ⟨hr, ha, fun ⟨q, hq, hqa, hp⟩ => hn ⟨q, mem_filter.2 ⟨hq, hqa⟩, hp⟩⟩

theorem mem_perThing {xs : List Record} {t : String} {s : LatestBy} (h : (t, s) ∈ perThing xs) :
    s = stateIn t xs := by
  obtain ⟨_, _, e⟩ := mem_map.1 h
  cases e; rfl

/-- Latest-by returns only heads: every record it gives for a thing is one
no record about that thing has superseded. -/
theorem latestOf_heads (sel : Record → Bool) (cs : List Cond) {xs : List Record}
    (hx : Addressed xs) {ts : List (String × List (Nat × Shown))} {u : Nat}
    (h : latestOf sel cs xs = .things ts u) {t : String} {ps : List (Nat × Shown)}
    (ht : (t, ps) ∈ ts) {p : Nat × Shown} (hp : p ∈ ps) :
    ∃ r, HeadOf xs t r ∧ (r.id, r.shown) = p := by
  unfold latestOf at h
  simp only [SlotValue.things.injEq] at h
  obtain ⟨rfl, -⟩ := h
  obtain ⟨⟨t', hs⟩, hm, he⟩ := mem_filterMap.1 ht
  obtain ⟨⟨t'', s⟩, hs', e⟩ := mem_map.1 hm
  simp only [Prod.mk.injEq] at e
  obtain ⟨rfl, rfl⟩ := e
  split at he
  · cases he
  · rename_i ks hks
    simp only [Option.some.injEq, Prod.mk.injEq] at he
    obtain ⟨rfl, rfl⟩ := he
    obtain ⟨k, hk, rfl⟩ := mem_map.1 hp
    have hk' := (mem_filter.1 (mem_filter.1 hk).1).1
    exact ⟨k, stateIn_heads hx (mem_perThing hs' ▸ hk'), rfl⟩

theorem Addressed.sub {xs ys : List Record} (hx : Addressed xs) (h : ∀ r ∈ ys, r ∈ xs) :
    Addressed ys := fun a ha b hb => hx a (h a ha) b (h b hb)

theorem mem_limitTo {α : Type} {k : Option Nat} {xs : List α} {x : α} (h : x ∈ limitTo k xs) :
    x ∈ xs := by
  cases k
  · exact h
  · exact mem_of_mem_take h

/-- Newest first gives only what it was handed, with `prev` dropped. -/
theorem mem_newestFirst {xs : List Record} (hx : Addressed xs) {r : Record}
    (h : r ∈ newestFirst xs) : ∃ q ∈ xs, r = q.unlinked := by
  obtain ⟨hm, -⟩ := ((LatestBy.inv_of hx.unlinked).heads_mem r).1 h
  obtain ⟨q, hq, e⟩ := mem_map.1 hm
  exact ⟨q, hq, e.symm⟩

/-- Collect following `prev` returns only heads: each record it gives is one
no record about its thing has superseded. -/
theorem collectOf_heads (sel : Record → Bool) (cs : List Cond) (limit : Option Nat)
    {xs : List Record} (hx : Addressed xs) {hs : List (Nat × Shown)} {u : Nat}
    (h : collectOf sel cs true limit xs = .heads hs u) {p : Nat × Shown} (hp : p ∈ hs) :
    ∃ t r, HeadOf xs t r ∧ (r.id, r.shown) = p := by
  unfold collectOf at h
  simp only [↓reduceIte, SlotValue.heads.injEq] at h
  obtain ⟨rfl, -⟩ := h
  obtain ⟨k, hk, rfl⟩ := mem_map.1 hp
  have hk := (mem_filter.1 (mem_limitTo hk)).1
  have hpool : ∀ r ∈ (perThing xs).flatMap (·.2.heads), ∃ t, HeadOf xs t r := by
    intro r hr
    obtain ⟨⟨t, s⟩, hts, hr⟩ := mem_flatMap.1 hr
    exact ⟨t, stateIn_heads hx (mem_perThing hts ▸ hr)⟩
  obtain ⟨q, hq, rfl⟩ := mem_newestFirst
    (hx.sub fun r hr => (hpool r (mem_filter.1 hr).1).choose_spec.1) hk
  obtain ⟨t, ht⟩ := hpool q (mem_filter.1 hq).1
  exact ⟨t, q, ht, rfl⟩

end Loops
