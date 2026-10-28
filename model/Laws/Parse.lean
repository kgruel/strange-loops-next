import Loops.Spec

/-!
# Laws of the spec's grammar

`protocol/spec.md` is the grammar; these are its laws.

* **A test is accepted exactly when it fits.** Its argument is what layer 0
  would accept in its field, and it renders back to what was written.
* **A repeated key is refused,** at the path the depth-first search for it
  gives (`Json.repeatAt`); without one, nothing is refused for repeating.
* **What parses could have been written.** A spec the parser accepts fits
  (`Spec.Fits`): a vertex, at least one source, slots named once, no empty
  name or kind, every `where` map naming each field once with at least one
  test, no operator twice, and every test fitting.
* **What fits has a written form.** A spec that fits renders to JSON that
  parses back to it, so an accepted spec's parsed form parses back to
  itself, and the specs the parser gives are exactly those that fit.

These say what the parser gives, not which JSON it accepts: a stricter
parser, refusing a spec without `fold` say, would satisfy them too. Which
JSON is accepted, and each refusal's code and path, are pinned by the
vectors.
-/

namespace Loops

open List

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
theorem Json.repeatAt_none (path : Option String) : (j : Json) → (j.repeatAt path = none ↔ j.keysDistinct = true)
  | .arr xs => by simp only [Json.repeatAt, Json.keysDistinct]; exact Json.repeatIn_none path xs
  | .obj kvs => by
    simp only [Json.repeatAt, Json.keysDistinct, Bool.and_eq_true, decide_eq_true_eq]
    rw [Json.repeatMember_none path [] kvs]
    simp
  | .null | .bool _ | .int _ | .str _ => by simp [Json.repeatAt, Json.keysDistinct]

theorem Json.repeatIn_none (path : Option String) : (xs : List Json) →
    (Json.repeatIn path xs = none ↔ Json.allDistinct xs = true)
  | [] => by simp [Json.repeatIn, Json.allDistinct]
  | x :: xs => by
    simp only [Json.repeatIn, Json.allDistinct, Option.orElse_eq_none, Bool.and_eq_true]
    rw [Json.repeatAt_none path x, Json.repeatIn_none path xs]

theorem Json.repeatMember_none (path : Option String) (seen : List String) : (kvs : List (String × Json)) →
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
    ∃ p, j.repeatAt none = some p ∧ Spec.ofJson j = refuse "member-duplicate" p := by
  cases e : j.repeatAt none with
  | none => simp [(Json.repeatAt_none none j).1 e] at h
  | some p => exact ⟨p, rfl, by simp [Spec.ofJson, h, e]⟩

/-! ## Except and mapM -/

theorem Except.bind_eq_ok {ε α β : Type} {x : Except ε α} {f : α → Except ε β} {b : β} :
    x >>= f = .ok b ↔ ∃ a, x = .ok a ∧ f a = .ok b := by
  cases x <;> simp [bind, Except.bind]

theorem Except.pure_eq_ok {ε α : Type} {a b : α} : (pure a : Except ε α) = .ok b ↔ a = b := by
  simp [pure, Except.pure]

theorem Except.map_eq_ok {ε α β : Type} {f : α → β} {x : Except ε α} {b : β} :
    f <$> x = .ok b ↔ ∃ a, x = .ok a ∧ f a = b := by
  cases x <;> simp [Functor.map, Except.map]

theorem refuse_ne_ok {α : Type} {code path : String} {a : α} : refuse code path ≠ .ok a := by
  simp [refuse, throw, throwThe, MonadExceptOf.throw]

theorem mapM_map_ok {α β ε : Type} {f : α → Except ε β} {g : β → α} :
    ∀ {xs : List β}, (∀ x ∈ xs, f (g x) = .ok x) → (xs.map g).mapM f = .ok xs
  | [], _ => rfl
  | x :: xs, h => by
    simp only [map_cons, mapM_cons, h x mem_cons_self,
      mapM_map_ok (fun y hy => h y (mem_cons_of_mem _ hy))]
    rfl

theorem mapM_ok_map {α β γ ε : Type} {f : α → Except ε β} {g : α → γ} {k : β → γ} :
    ∀ {xs : List α} {ys : List β}, (∀ a ∈ xs, ∀ b, f a = .ok b → k b = g a) →
      xs.mapM f = .ok ys → ys.map k = xs.map g
  | [], ys, _, h => by simp [mapM_nil, pure, Except.pure] at h; subst h; rfl
  | x :: xs, ys, hf, h => by
    simp only [mapM_cons, Except.bind_eq_ok, Except.pure_eq_ok] at h
    obtain ⟨b, hb, bs, hbs, rfl⟩ := h
    simp [hf x mem_cons_self b hb, mapM_ok_map (fun a ha => hf a (mem_cons_of_mem _ ha)) hbs]

theorem mapM_ok_mem {α β ε : Type} {f : α → Except ε β} :
    ∀ {xs : List α} {ys : List β}, xs.mapM f = .ok ys → ∀ y ∈ ys, ∃ x ∈ xs, f x = .ok y
  | [], ys, h => by simp [mapM_nil, pure, Except.pure] at h; subst h; simp
  | x :: xs, ys, h => by
    simp only [mapM_cons, Except.bind_eq_ok, Except.pure_eq_ok] at h
    obtain ⟨b, hb, bs, hbs, rfl⟩ := h
    intro y hy
    rcases mem_cons.1 hy with rfl | hy
    · exact ⟨x, mem_cons_self, hb⟩
    · obtain ⟨a, ha, e⟩ := mapM_ok_mem hbs y hy
      exact ⟨a, mem_cons_of_mem _ ha, e⟩

theorem mapM_ok_ne_nil {α β ε : Type} {f : α → Except ε β} {xs : List α} {ys : List β}
    (h : xs.mapM f = .ok ys) (hx : xs ≠ []) : ys ≠ [] := by
  have := mapM_ok_map (g := fun _ => ()) (k := fun _ => ()) (fun _ _ _ _ => rfl) h
  intro e; subst e
  cases xs with
  | nil => exact hx rfl
  | cons _ _ => simp at this

/-! ## Distinct keys -/

theorem Json.membersDistinct_iff :
    ∀ {kvs : List (String × Json)}, Json.membersDistinct kvs = true ↔ ∀ kv ∈ kvs, kv.2.keysDistinct = true
  | [] => by simp [Json.membersDistinct]
  | (k, v) :: kvs => by
    simp [Json.membersDistinct, Json.membersDistinct_iff (kvs := kvs)]

theorem Json.allDistinct_iff :
    ∀ {xs : List Json}, Json.allDistinct xs = true ↔ ∀ x ∈ xs, x.keysDistinct = true
  | [] => by simp [Json.allDistinct]
  | x :: xs => by simp [Json.allDistinct, Json.allDistinct_iff (xs := xs)]

theorem Json.keysDistinct_obj {kvs : List (String × Json)} :
    (Json.obj kvs).keysDistinct = true ↔
      (kvs.map (·.1)).Nodup ∧ ∀ kv ∈ kvs, kv.2.keysDistinct = true := by
  simp [Json.keysDistinct, Json.membersDistinct_iff]

theorem Json.keysDistinct_arr {xs : List Json} :
    (Json.arr xs).keysDistinct = true ↔ ∀ x ∈ xs, x.keysDistinct = true := by
  simp [Json.keysDistinct, Json.allDistinct_iff]

theorem lookup_mem {kvs : List (String × Json)} {k : String} {v : Json} :
    kvs.lookup k = some v → (k, v) ∈ kvs := by
  induction kvs with
  | nil => simp [List.lookup]
  | cons kv kvs ih =>
    obtain ⟨k', v'⟩ := kv
    simp only [List.lookup]
    split
    · rename_i h; intro e; cases e
      simp only [beq_iff_eq] at h; subst h; exact mem_cons_self
    · intro h; exact mem_cons_of_mem _ (ih h)

theorem lookup_distinct {kvs : List (String × Json)} {k : String} {v : Json}
    (hd : (Json.obj kvs).keysDistinct = true) (h : kvs.lookup k = some v) : v.keysDistinct = true :=
  (Json.keysDistinct_obj.1 hd).2 _ (lookup_mem h)

/-! ## What could have been written -/

/-- The key a test is written under. -/
def Op.key (op : Op) : String := op.toJson.1

/-- A field a `where` can name: any envelope field, or a payload field whose
name isn't empty and doesn't start `env.`. -/
def Field.Fits : Field → Prop
  | .env _ => True
  | .payload n => n.isEmpty = false ∧ envPrefix.isPrefixOf n = false

/-- A `where` map that could have been written: at least one field, each
named once with at least one test, no operator twice, every test fitting. -/
def Tests.Fits (ts : Tests) : Prop :=
  ts ≠ [] ∧ (ts.map (·.1.name)).Nodup ∧
    ∀ t ∈ ts, t.1.Fits ∧ t.2 ≠ [] ∧ (t.2.map Op.key).Nodup ∧ ∀ op ∈ t.2, op.Fits t.1.type

def FoldType.Fits : FoldType → Prop
  | .sum f | .min f | .max f => f.isEmpty = false
  | .collect _ (some k) => 0 < k
  | _ => True

def Slot.Fits (s : Slot) : Prop :=
  s.name.isEmpty = false ∧ s.type.Fits ∧ (s.tests = [] ∨ s.tests.Fits)

def Source.Fits (s : Source) : Prop :=
  s.store.isEmpty = false ∧ (∀ k ∈ s.kinds, k.isEmpty = false) ∧ ∀ a ∈ s.about, typedRef a = true

/-- A spec that could have been written: a vertex, at least one source, and
slots named once, each fitting. -/
def Spec.Fits (sp : Spec) : Prop :=
  sp.vertex.isEmpty = false ∧ sp.sources ≠ [] ∧ (∀ s ∈ sp.sources, s.Fits) ∧
    (sp.slots.map (·.name)).Nodup ∧ ∀ s ∈ sp.slots, s.Fits

/-! ## Field names -/

theorem Field.ofName_name {f : Field} (h : f.Fits) : Field.ofName f.name = some f := by
  cases f with
  | env g => cases g <;> decide +kernel
  | payload n =>
    obtain ⟨h1, h2⟩ := h
    simp [Field.ofName, Field.name, h1, h2]

theorem Field.ofName_some {s : String} {f : Field} (h : Field.ofName s = some f) :
    f.name = s ∧ f.Fits := by
  unfold Field.ofName at h
  split at h
  · cases h
  · rename_i he
    split at h
    · rename_i hp
      obtain ⟨g, hg, rfl⟩ := Option.map_eq_some_iff.1 h
      have := List.find?_some hg
      simp only [beq_iff_eq] at this
      exact ⟨this, trivial⟩
    · rename_i hp
      cases h
      exact ⟨rfl, by simpa using he, by simpa using hp⟩


/-! ## Rendering has distinct keys -/

@[simp] theorem Json.keysDistinct_str (x : String) : (Json.str x).keysDistinct = true := rfl
@[simp] theorem Json.keysDistinct_int (i : Int) : (Json.int i).keysDistinct = true := rfl
@[simp] theorem Json.keysDistinct_bool (b : Bool) : (Json.bool b).keysDistinct = true := rfl

theorem Arg.toJson_distinct (a : Arg) : a.toJson.keysDistinct = true := by
  rcases a with (_ | _ | _) | _ <;> rfl

theorem Op.toJson_distinct (op : Op) : op.toJson.2.keysDistinct = true := by
  cases op <;> simp [Op.toJson, Arg.toJson_distinct] <;> rfl

theorem Tests.toJson_distinct {ts : Tests} (h : ts.Fits) : ts.toJson.keysDistinct = true := by
  obtain ⟨-, hn, hall⟩ := h
  rw [Tests.toJson, Json.keysDistinct_obj]
  refine ⟨by simpa [Function.comp_def] using hn, ?_⟩
  intro kv hkv
  obtain ⟨⟨f, os⟩, ht, rfl⟩ := mem_map.1 hkv
  obtain ⟨-, -, hk, -⟩ := hall _ ht
  rw [Json.keysDistinct_obj]
  refine ⟨by rw [map_map]; exact hk, ?_⟩
  intro kv hkv
  obtain ⟨op, -, rfl⟩ := mem_map.1 hkv
  exact Op.toJson_distinct op

/-! ## Rendering parses back -/

theorem parseField_toJson (path : String) {f : Field} {os : List Op} (hf : f.Fits) (hne : os ≠ [])
    (hos : ∀ op ∈ os, op.Fits f.type) :
    parseField path (f.name, .obj (os.map Op.toJson)) = .ok (f, os) := by
  obtain ⟨o, os', rfl⟩ := exists_cons_of_ne_nil hne
  have hm := mapM_map_ok (f := parseOp f.type (memberPath (some path) f.name)) (g := Op.toJson)
    (xs := o :: os') fun op hop => (parseOp_ok_iff _ _ _ _).2 ⟨hos op hop, rfl⟩
  simp only [parseField, Field.ofName_name hf, map_cons] at hm ⊢
  simp [hm, bind, Except.bind, pure, Except.pure]

theorem parseWhere_toJson (path : String) {ts : Tests} (h : ts.Fits) :
    parseWhere path ts.toJson = .ok ts := by
  obtain ⟨hne, -, hall⟩ := h
  obtain ⟨t, ts', rfl⟩ := exists_cons_of_ne_nil hne
  have hm := mapM_map_ok (f := parseField path) (g := fun (x : Field × List Op) => (x.1.name, Json.obj (x.2.map Op.toJson)))
    (xs := t :: ts') fun x hx => by
      obtain ⟨hf, hne, -, hos⟩ := hall x hx
      exact parseField_toJson path hf hne hos
  simp only [Tests.toJson, map_cons, parseWhere] at hm ⊢
  exact hm


theorem Slot.toJson_distinct {s : Slot} (h : s.Fits) : s.toJson.2.keysDistinct = true := by
  obtain ⟨-, -, ht⟩ := h
  rcases s with ⟨name, type, tests⟩
  cases he : tests.isEmpty
  · have hw := Tests.toJson_distinct (ht.resolve_left (by simpa using he))
    cases type with
    | collect follow limit =>
      cases follow <;> cases limit <;> simp [Slot.toJson, he, Json.keysDistinct_obj, hw]
    | _ => simp [Slot.toJson, he, Json.keysDistinct_obj, hw]
  · cases type with
    | collect follow limit =>
      cases follow <;> cases limit <;> simp [Slot.toJson, he, Json.keysDistinct_obj]
    | _ => simp [Slot.toJson, he, Json.keysDistinct_obj]

theorem parseSlot_toJson {s : Slot} (h : s.Fits) : parseSlot s.name s.toJson.2 = .ok s := by
  obtain ⟨hn, hty, ht⟩ := h
  rcases s with ⟨name, type, tests⟩
  simp only at hn hty ht
  cases he : tests.isEmpty
  · have hw := parseWhere_toJson s!"{memberPath (some "fold") name}.where"
      (ht.resolve_left (by simpa using he))
    cases type with
    | collect follow limit =>
      cases follow <;> cases limit <;>
        simp_all [Slot.toJson, parseSlot, slotType, slotFollow, slotLimit, foldType, slotTests, checkKeys, slotKeys, foldTypes, List.lookup, bind, Except.bind, pure, Except.pure, FoldType.Fits]
    | _ =>
      simp_all [Slot.toJson, parseSlot, slotType, slotFollow, slotLimit, foldType, slotTests, checkKeys, slotKeys, foldTypes, List.lookup, bind, Except.bind, pure,
        Except.pure, FoldType.Fits, fieldArg, Functor.map, Except.map]
  · have h0 : tests = [] := by simpa using he
    subst h0
    cases type with
    | collect follow limit =>
      cases follow <;> cases limit <;>
        simp_all [Slot.toJson, parseSlot, slotType, slotFollow, slotLimit, foldType, slotTests, checkKeys, slotKeys, foldTypes, List.lookup, bind, Except.bind, pure, Except.pure, FoldType.Fits]
    | _ =>
      simp_all [Slot.toJson, parseSlot, slotType, slotFollow, slotLimit, foldType, slotTests, checkKeys, slotKeys, foldTypes, List.lookup, bind, Except.bind, pure,
        Except.pure, FoldType.Fits, fieldArg, Functor.map, Except.map]


theorem Source.toJson_distinct (s : Source) : s.toJson.keysDistinct = true := by
  rcases s with ⟨store, kinds, about⟩
  cases kinds <;> cases about <;> simp [Source.toJson, Json.keysDistinct_obj, Json.keysDistinct_arr]

theorem parseKinds_toJson (path : String) {ks : List String} (hne : ks ≠ [])
    (h : ∀ k ∈ ks, k.isEmpty = false) : parseKinds path (.arr (ks.map .str)) = .ok ks := by
  obtain ⟨k, ks', rfl⟩ := exists_cons_of_ne_nil hne
  have hm := mapM_map_ok (g := Json.str) (xs := k :: ks')
    (f := fun
      | .str k => if k.isEmpty then refuse "from-invalid" path else pure k
      | _ => refuse "from-invalid" path) fun x hx => by simp [h x hx, pure, Except.pure]
  simp only [map_cons] at hm
  simp only [map_cons, parseKinds]
  exact hm

theorem parseSource_toJson {s : Source} (h : s.Fits) : parseSource s.toJson = .ok s := by
  obtain ⟨hst, hks, hab⟩ := h
  rcases s with ⟨store, kinds, about⟩
  simp only at hst hks hab
  cases hk : kinds.isEmpty
  · have hp := parseKinds_toJson "from.kind" (by simpa using hk) hks
    cases about with
    | none => simp_all [Source.toJson, parseSource, sourceStore, sourceKinds, sourceAbout, checkKeys, sourceKeys, List.lookup, bind, Except.bind, pure, Except.pure]
    | some a =>
      have ha : typedRef a = true := hab a rfl
      simp_all [Source.toJson, parseSource, sourceStore, sourceKinds, sourceAbout, checkKeys, sourceKeys, List.lookup, bind, Except.bind, pure, Except.pure]
  · have h0 : kinds = [] := by simpa using hk
    subst h0
    cases about with
    | none => simp_all [Source.toJson, parseSource, sourceStore, sourceKinds, sourceAbout, checkKeys, sourceKeys, List.lookup, bind, Except.bind, pure, Except.pure]
    | some a =>
      have ha : typedRef a = true := hab a rfl
      simp_all [Source.toJson, parseSource, sourceStore, sourceKinds, sourceAbout, checkKeys, sourceKeys, List.lookup, bind, Except.bind, pure, Except.pure]

theorem Spec.toJson_distinct {sp : Spec} (h : sp.Fits) : sp.toJson.keysDistinct = true := by
  obtain ⟨-, -, -, hn, hs⟩ := h
  simp only [Spec.toJson, Json.keysDistinct_obj]
  refine ⟨by simp, ?_⟩
  intro kv hkv
  simp only [mem_cons, not_mem_nil, or_false] at hkv
  rcases hkv with rfl | rfl | rfl
  · rfl
  · simp only [Json.keysDistinct_arr, mem_map]
    rintro _ ⟨s, -, rfl⟩
    exact Source.toJson_distinct s
  · simp only [Json.keysDistinct_obj, map_map]
    refine ⟨hn, ?_⟩
    rintro _ hkv
    obtain ⟨s, hsm, rfl⟩ := mem_map.1 hkv
    exact Slot.toJson_distinct (hs s hsm)

theorem Spec.ofObject_toJson {sp : Spec} (h : sp.Fits) : Spec.ofObject sp.toJson = .ok sp := by
  obtain ⟨hv, hne, hsrc, -, hs⟩ := h
  rcases sp with ⟨vertex, sources, slots⟩
  simp only at hv hne hsrc hs
  obtain ⟨x, xs, rfl⟩ := exists_cons_of_ne_nil hne
  have hfrom := mapM_map_ok (f := parseSource) (g := Source.toJson) (xs := x :: xs)
    fun s hm => parseSource_toJson (hsrc s hm)
  have hfold := mapM_map_ok (f := fun (p : String × Json) => parseSlot p.1 p.2) (g := Slot.toJson)
    (xs := slots) fun s hm => parseSlot_toJson (hs s hm)
  simp only [map_cons] at hfrom
  simp_all [Spec.toJson, Spec.ofObject, specVertex, specSources, specSlots, checkKeys, specKeys, List.lookup, bind, Except.bind, pure,
    Except.pure]

/-- Every spec that could have been written has a written form: its own
rendering, which parses back to it. -/
theorem Spec.ofJson_toJson {sp : Spec} (h : sp.Fits) : Spec.ofJson sp.toJson = .ok sp := by
  simp [Spec.ofJson, Spec.toJson_distinct h, Spec.ofObject_toJson h]


/-! ## What parses could have been written -/

theorem parseOps_fits {ty : FieldType} {p : String} {os' : List (String × Json)} {os : List Op}
    (h : os'.mapM (parseOp ty p) = .ok os) (hd : (Json.obj os').keysDistinct = true) :
    (os.map Op.key).Nodup ∧ ∀ op ∈ os, op.Fits ty := by
  have hk := mapM_ok_map (k := Op.key) (g := (·.1))
    (fun kv _ op hop => by rw [Op.key, ((parseOp_ok_iff _ _ _ _).1 hop).2]) h
  refine ⟨hk ▸ (Json.keysDistinct_obj.1 hd).1, fun op hop => ?_⟩
  obtain ⟨kv, -, e⟩ := mapM_ok_mem h op hop
  exact ((parseOp_ok_iff _ _ _ _).1 e).1

theorem parseField_fits {path : String} {kv : String × Json} {t : Field × List Op}
    (h : parseField path kv = .ok t) (hd : kv.2.keysDistinct = true) :
    t.1.name = kv.1 ∧ t.1.Fits ∧ t.2 ≠ [] ∧ (t.2.map Op.key).Nodup ∧ ∀ op ∈ t.2, op.Fits t.1.type := by
  obtain ⟨name, ops⟩ := kv
  cases hn : Field.ofName name with
  | none =>
    simp [parseField, hn, bind, Except.bind, refuse, throw, throwThe, MonadExceptOf.throw] at h
  | some g =>
    have hgf := Field.ofName_some hn
    simp only [parseField, hn, pure_bind] at h
    cases ops with
    | obj os' =>
      cases os' with
      | nil => exact absurd h refuse_ne_ok
      | cons o os'' =>
        simp only [Except.bind_eq_ok, Except.pure_eq_ok] at h
        obtain ⟨os, hos, rfl⟩ := h
        obtain ⟨hk, hf⟩ := parseOps_fits hos hd
        exact ⟨hgf.1, hgf.2, mapM_ok_ne_nil hos (cons_ne_nil _ _), hk, hf⟩
    | _ => exact absurd h refuse_ne_ok

theorem parseWhere_fits {path : String} {w : Json} {ts : Tests}
    (h : parseWhere path w = .ok ts) (hd : w.keysDistinct = true) : ts.Fits := by
  cases w with
  | obj fs =>
    cases fs with
    | nil => exact absurd h refuse_ne_ok
    | cons kv fs' =>
      simp only [parseWhere] at h
      have hd' := Json.keysDistinct_obj.1 hd
      have hn := mapM_ok_map (k := fun t : Field × List Op => t.1.name) (g := fun kv : String × Json => kv.1)
        (fun a ha t ht => (parseField_fits ht (hd'.2 a ha)).1) h
      refine ⟨mapM_ok_ne_nil h (cons_ne_nil _ _), ?_, fun t ht => ?_⟩
      · rw [hn]; exact hd'.1
      · obtain ⟨a, ha, e⟩ := mapM_ok_mem h t ht
        exact (parseField_fits e (hd'.2 a ha)).2
  | _ => exact absurd h refuse_ne_ok


theorem fieldArg_ok {p : String} {j : Json} {f : String} (h : fieldArg p j = .ok f) : f.isEmpty = false := by
  unfold fieldArg at h
  split at h
  · split at h
    · exact absurd h refuse_ne_ok
    · rename_i hf; simp only [Except.pure_eq_ok] at h; subst h; simpa using hf
  · exact absurd h refuse_ne_ok

theorem slotLimit_pos {p t : String} {o : Option Json} {k : Nat}
    (h : slotLimit p t o = .ok (some k)) : 0 < k := by
  unfold slotLimit at h
  split at h
  · simp [Except.pure_eq_ok] at h
  · split at h
    · rename_i i hi
      simp only [Except.pure_eq_ok, Option.some.injEq] at h
      subst h
      simp only [Bool.and_eq_true, decide_eq_true_eq] at hi
      omega
    · exact absurd h refuse_ne_ok
  · exact absurd h refuse_ne_ok

theorem foldType_fits {p t : String} {follow : Bool} {limit : Option Nat} {arg : Json} {ty : FoldType}
    (h : foldType p t follow limit arg = .ok ty) (hl : ∀ k, limit = some k → 0 < k) : ty.Fits := by
  unfold foldType at h
  split at h <;> simp only [Except.pure_eq_ok, Except.map_eq_ok] at h
  all_goals first
    | (subst h; trivial)
    | (obtain ⟨f, hf, rfl⟩ := h; exact fieldArg_ok hf)
    | (subst h; cases limit with
        | none => trivial
        | some k => exact hl k rfl)
    | exact absurd h refuse_ne_ok

theorem slotTests_fits {p : String} {o : Option Json} {ts : Tests} (h : slotTests p o = .ok ts)
    (hd : ∀ w, o = some w → w.keysDistinct = true) : ts = [] ∨ ts.Fits := by
  cases o with
  | none => simp [slotTests, Except.pure_eq_ok] at h; exact .inl h
  | some w => exact .inr (parseWhere_fits h (hd w rfl))

theorem parseSlot_fits {n : String} {j : Json} {s : Slot} (h : parseSlot n j = .ok s)
    (hd : j.keysDistinct = true) : s.name = n ∧ s.Fits := by
  unfold parseSlot at h
  split at h
  · exact absurd h refuse_ne_ok
  · rename_i hn
    cases j with
    | obj kvs =>
      simp only [Except.bind_eq_ok] at h
      obtain ⟨_, -, ⟨t, arg⟩, -, follow, -, limit, hl, type, hty, tests, htests, h⟩ := h
      simp only [Except.pure_eq_ok] at h
      subst h
      refine ⟨rfl, by simpa using hn, foldType_fits hty fun k hk => slotLimit_pos (hk ▸ hl),
        slotTests_fits htests fun w hw => lookup_distinct hd hw⟩
    | _ => exact absurd h refuse_ne_ok


theorem parseKinds_fits {p : String} {j : Json} {ks : List String} (h : parseKinds p j = .ok ks) :
    ∀ k ∈ ks, k.isEmpty = false := by
  cases j with
  | arr xs =>
    cases xs with
    | nil => exact absurd h refuse_ne_ok
    | cons x xs' =>
      simp only [parseKinds] at h
      intro k hk
      obtain ⟨y, -, e⟩ := mapM_ok_mem h k hk
      split at e
      · split at e
        · exact absurd e refuse_ne_ok
        · rename_i hy; simp only [Except.pure_eq_ok] at e; subst e; simpa using hy
      · exact absurd e refuse_ne_ok
  | _ => exact absurd h refuse_ne_ok

theorem parseSource_fits {j : Json} {s : Source} (h : parseSource j = .ok s) : s.Fits := by
  cases j with
  | obj kvs =>
    simp only [parseSource, Except.bind_eq_ok, Except.pure_eq_ok] at h
    obtain ⟨_, -, store, hst, kinds, hk, about, ha, rfl⟩ := h
    refine ⟨?_, ?_, ?_⟩
    · unfold sourceStore at hst
      split at hst
      · split at hst
        · exact absurd hst refuse_ne_ok
        · rename_i he; simp only [Except.pure_eq_ok] at hst; subst hst; simpa using he
      · exact absurd hst refuse_ne_ok
    · unfold sourceKinds at hk
      split at hk
      · simp only [Except.pure_eq_ok] at hk; subst hk; simp
      · exact parseKinds_fits hk
    · intro a hm
      have hm : about = some a := hm
      subst hm
      unfold sourceAbout at ha
      split at ha
      · simp [Except.pure_eq_ok] at ha
      · split at ha
        · rename_i hr; simp only [Except.pure_eq_ok, Option.some.injEq] at ha; subst ha; exact hr
        · exact absurd ha refuse_ne_ok
      · exact absurd ha refuse_ne_ok
  | _ => exact absurd h refuse_ne_ok

/-- Whatever the parser accepts could have been written: it fits. -/
theorem Spec.ofJson_fits {j : Json} {sp : Spec} (h : Spec.ofJson j = .ok sp) : sp.Fits := by
  unfold Spec.ofJson at h
  split at h
  · exact absurd h refuse_ne_ok
  · rename_i hd
    have hd : j.keysDistinct = true := by simpa using hd
    cases j with
    | obj kvs =>
      simp only [Spec.ofObject, Except.bind_eq_ok, Except.pure_eq_ok] at h
      obtain ⟨_, -, v, hv, srcs, hsrc, slots, hsl, rfl⟩ := h
      have hV : v.isEmpty = false := by
        unfold specVertex at hv
        split at hv
        · exact absurd hv refuse_ne_ok
        · split at hv
          · exact absurd hv refuse_ne_ok
          · rename_i he; simp only [Except.pure_eq_ok] at hv; subst hv; simpa using he
        · exact absurd hv refuse_ne_ok
      have hS : srcs ≠ [] ∧ ∀ s ∈ srcs, s.Fits := by
        unfold specSources at hsrc
        split at hsrc
        · exact absurd hsrc refuse_ne_ok
        · exact absurd hsrc refuse_ne_ok
        · rename_i xs hne _
          refine ⟨mapM_ok_ne_nil hsrc (fun e => hne (by rw [e])), fun s hs => ?_⟩
          obtain ⟨x, -, e⟩ := mapM_ok_mem hsrc s hs
          exact parseSource_fits e
        · exact absurd hsrc refuse_ne_ok
      have hT : (slots.map (·.name)).Nodup ∧ ∀ s ∈ slots, s.Fits := by
        unfold specSlots at hsl
        split at hsl
        · simp only [Except.pure_eq_ok] at hsl; subst hsl; simp
        · rename_i fs hfs
          have hd' := Json.keysDistinct_obj.1 (lookup_distinct hd hfs)
          have hn := mapM_ok_map (k := Slot.name) (g := fun p : String × Json => p.1)
            (fun a ha s hs => (parseSlot_fits hs (hd'.2 a ha)).1) hsl
          refine ⟨hn ▸ hd'.1, fun s hs => ?_⟩
          obtain ⟨a, ha, e⟩ := mapM_ok_mem hsl s hs
          exact (parseSlot_fits e (hd'.2 a ha)).2
        · exact absurd hsl refuse_ne_ok
      exact ⟨hV, hS.1, hS.2, hT.1, hT.2⟩
    | _ => exact absurd h refuse_ne_ok

/-- The parsed form of an accepted spec parses back to itself. -/
theorem Spec.reparse {j : Json} {sp : Spec} (h : Spec.ofJson j = .ok sp) :
    Spec.ofJson sp.toJson = .ok sp :=
  Spec.ofJson_toJson (Spec.ofJson_fits h)

/-- The specs the parser gives are exactly those that fit. -/
theorem Spec.parsed_iff (sp : Spec) : (∃ j, Spec.ofJson j = .ok sp) ↔ sp.Fits :=
  ⟨fun ⟨_, h⟩ => Spec.ofJson_fits h, fun h => ⟨_, Spec.ofJson_toJson h⟩⟩

end Loops
