import Loops.Lens

/-!
# Laws of the keyed-section lens

* **Escaping.** Any body survives rendering and parsing, whatever it holds:
  fences, headers, backslashes.
* **Round trip.** `parse (render d) = some d`, for every document.
* **No-op.** Rendering the base and reading it back gives no outcomes.
* **Put-get.** When an edit keeps the base's sections in order, applying its
  outcomes gives exactly the edited document, so the text reads back as
  edited, up to its normal form.
* **Nothing dropped.** Every section of the edited text is unchanged,
  accepted or reported; every section it drops is reported as absent.
* **Normal form.** Normalizing twice is normalizing once.
-/

namespace Loops.Lens

open List

/-! ## Escaping -/

theorem unescape_escape (l : Line) : unescape (escape l) = l := by
  unfold escape
  split
  · rfl
  · rename_i h
    match l, h with
    | [], _ => rfl
    | c :: cs, h =>
      have : c ≠ '\\' := by
        intro e; subst e; simp [reserved] at h
      simp [unescape, this]

theorem escape_take (l : Line) : (escape l).take 3 ≠ fence := by
  unfold escape
  split
  · simp [fence]
  · rename_i h
    simp [reserved] at h
    exact h.1

theorem escape_ne_fence (l : Line) : escape l ≠ fence := by
  intro h
  have := escape_take l
  rw [h] at this
  exact this rfl

/-! ## Round trip -/

theorem parse_body (id : Line) (body b rest : List Line) (acc : List Section) :
    parseGo (body.map escape ++ fence :: rest) (.inside id b) acc =
      parseGo rest .top (⟨id, b.reverse ++ body⟩ :: acc) := by
  induction body generalizing b with
  | nil => simp [parseGo]
  | cons l ls ih =>
    simp only [map_cons, cons_append, parseGo, escape_ne_fence, escape_take, ite_false,
      unescape_escape]
    rw [ih]
    simp

theorem parse_render_go (d : List Section) (acc : List Section) :
    parseGo (render d) .top acc = some (acc.reverse ++ d) := by
  induction d generalizing acc with
  | nil => simp [render, parseGo]
  | cons s ss ih =>
    have hh : headerId? (header s.id) = some s.id := by simp [header, fence, headerId?]
    simp only [render, flatMap_cons, cons_append, append_assoc, parseGo, hh]
    rw [parse_body]
    have := ih (⟨s.id, s.body⟩ :: acc)
    simpa [render] using this

/-- Round trip: every document survives rendering and parsing. -/
theorem parse_render (d : List Section) : parse (render d) = some d := by
  simpa [parse] using parse_render_go d []

/-- Escaping: one section with any body at all comes back intact. -/
theorem escaping (id : Line) (body : List Line) :
    parse (render [⟨id, body⟩]) = some [⟨id, body⟩] :=
  parse_render _

/-- Normal form: normalizing twice is normalizing once. -/
theorem normalize_idem {text out : List Line} (h : normalize text = some out) :
    normalize out = some out := by
  simp only [normalize, Option.map_eq_some_iff] at h
  obtain ⟨d, _, rfl⟩ := h
  simp [normalize, parse_render]

/-! ## Lookup -/

def ids (d : List Section) : List Line := d.map (·.id)

theorem lookup_of_mem {d : List Section} (hd : (ids d).Nodup) {s : Section} (hs : s ∈ d) :
    lookup s.id d = some s.body := by
  induction d with
  | nil => simp at hs
  | cons t ts ih =>
    simp only [ids, map_cons, nodup_cons] at hd
    rcases mem_cons.1 hs with rfl | hs
    · simp [lookup]
    · have hne : t.id ≠ s.id := fun e => hd.1 (e ▸ mem_map_of_mem hs)
      simp [lookup, hne, ih hd.2 hs]

theorem lookup_eq_none {d : List Section} {id : Line} (h : id ∉ ids d) : lookup id d = none := by
  induction d with
  | nil => rfl
  | cons t ts ih =>
    simp only [ids, map_cons, mem_cons, not_or] at h
    simp [lookup, Ne.symm h.1, ih h.2]

theorem lookup_cons_ne {t : Section} {ts : List Section} {id : Line} (h : t.id ≠ id) :
    lookup id (t :: ts) = lookup id ts := by
  simp [lookup, h]

/-! ## No-op -/

theorem diff_self {base : List Section} (hb : (ids base).Nodup) : diff base base = [] := by
  simp only [diff, append_eq_nil_iff, filterMap_eq_nil_iff]
  constructor
  · intro s hs
    simp [diffSection, lookup_of_mem hb hs]
  · intro s hs
    have : s.id ∈ base.map (·.id) := mem_map_of_mem hs
    simp [absentSection, this]

/-- No-op: the rendered base, read back unedited, gives no outcomes. -/
theorem no_op {base : List Section} (hb : (ids base).Nodup) : edit base (render base) = some [] := by
  simp [edit, parse_render, diff_self hb]

/-! ## Put-get -/

theorem acceptedBody_append (id : Line) (xs ys : List Outcome) :
    acceptedBody id (xs ++ ys) = (acceptedBody id xs).or (acceptedBody id ys) := by
  induction xs with
  | nil => simp [acceptedBody]
  | cons o os ih =>
    cases o with
    | accepted i b =>
      by_cases h : i = id
      · simp [acceptedBody, h]
      · simp [acceptedBody, h, ih]
    | unknown i => simp [acceptedBody, ih]
    | absent i => simp [acceptedBody, ih]

theorem acceptedBody_absent (id : Line) (edited base : List Section) :
    acceptedBody id (base.filterMap (absentSection edited)) = none := by
  induction base with
  | nil => rfl
  | cons s ss ih =>
    cases hc : (edited.map (·.id)).contains s.id
    · simp only [filterMap_cons, absentSection, hc, Bool.false_eq_true, ↓reduceIte, acceptedBody]
      exact ih
    · simp only [filterMap_cons, absentSection, hc, ↓reduceIte]
      exact ih

/-- What the accepted outcomes say about one id. -/
def acceptedFor (base edited : List Section) (id : Line) : Option (List Line) :=
  match lookup id edited, lookup id base with
  | some b', some b => if b = b' then none else some b'
  | _, _ => none

theorem acceptedBody_edited {base edited : List Section} (he : (ids edited).Nodup) (id : Line) :
    acceptedBody id (edited.filterMap (diffSection base)) = acceptedFor base edited id := by
  induction edited with
  | nil => simp [acceptedBody, acceptedFor, lookup]
  | cons e es ih =>
    simp only [ids, map_cons, nodup_cons] at he
    have ih := ih he.2
    by_cases hid : e.id = id
    · subst hid
      have hrest : acceptedFor base es e.id = none := by
        simp [acceptedFor, lookup_eq_none he.1]
      rw [hrest] at ih
      simp only [filterMap_cons, diffSection]
      cases hb : lookup e.id base with
      | none => simp [acceptedBody, acceptedFor, lookup, hb, ih]
      | some b =>
        by_cases hbe : b = e.body
        · simp [acceptedFor, lookup, hb, hbe, ih]
        · simp [acceptedBody, acceptedFor, lookup, hb, hbe]
    · have hfor : acceptedFor base (e :: es) id = acceptedFor base es id := by
        simp [acceptedFor, lookup_cons_ne hid]
      rw [hfor, ← ih]
      simp only [filterMap_cons, diffSection]
      cases hb : lookup e.id base with
      | none => simp [acceptedBody]
      | some b =>
        by_cases hbe : b = e.body
        · simp [hbe]
        · simp [acceptedBody, hbe, hid]

/-- Take each base section's body from the edited document, if it has one. -/
def pick (edited : List Section) (s : Section) : Section :=
  match lookup s.id edited with
  | some b => ⟨s.id, b⟩
  | none => s

theorem apply_diff {base edited : List Section} (hb : (ids base).Nodup) (he : (ids edited).Nodup) :
    apply base (diff base edited) = base.map (pick edited) := by
  apply map_congr_left
  intro s hs
  rw [diff, acceptedBody_append, acceptedBody_edited he, acceptedBody_absent]
  simp only [acceptedFor, lookup_of_mem hb hs, pick]
  cases h : lookup s.id edited with
  | none => simp
  | some b' =>
    by_cases hbe : s.body = b'
    · subst hbe; simp
    · simp [hbe]

theorem map_pick {base edited : List Section} (hb : (ids base).Nodup) (he : ids edited = ids base) :
    base.map (pick edited) = edited := by
  induction base generalizing edited with
  | nil => simpa [ids] using he.symm
  | cons s bs ih =>
    match edited, he with
    | e :: es, he =>
      simp only [ids, map_cons, cons.injEq] at he hb
      rw [nodup_cons] at hb
      have hhead : pick (e :: es) s = e := by
        obtain ⟨eid, ebody⟩ := e
        simp only at he
        simp [pick, lookup, he.1]
      have htail : bs.map (pick (e :: es)) = bs.map (pick es) := by
        apply map_congr_left
        intro t ht
        have hne : e.id ≠ t.id := by
          intro h
          exact hb.1 (he.1 ▸ h ▸ mem_map_of_mem ht)
        simp [pick, lookup_cons_ne hne]
      rw [map_cons, hhead, htail, ih hb.2 he.2]

/-- Put-get: an edit that keeps the base's sections in order is applied exactly. -/
theorem put_get {base edited : List Section} (hb : (ids base).Nodup) (he : ids edited = ids base) :
    apply base (diff base edited) = edited := by
  rw [apply_diff hb (he ▸ hb), map_pick hb he]

/-- Put-get on text: applying the outcomes renders the edited text's normal form. -/
theorem put_get_text {base edited : List Section} {text : List Line} (hb : (ids base).Nodup)
    (hp : parse text = some edited) (he : ids edited = ids base) :
    (edit base text).map (fun os => render (apply base os)) = normalize text := by
  simp [edit, normalize, hp, put_get hb he]

/-! ## Nothing dropped -/

/-- Every section of the edited text is unchanged, accepted, or reported unknown. -/
theorem nothing_dropped {base edited : List Section} {e : Section} (h : e ∈ edited) :
    lookup e.id base = some e.body ∨
    Outcome.accepted e.id e.body ∈ diff base edited ∨
    Outcome.unknown e.id ∈ diff base edited := by
  have hm : ∀ o, diffSection base e = some o → o ∈ diff base edited := fun o ho =>
    mem_append_left _ (mem_filterMap.2 ⟨e, h, ho⟩)
  cases hb : lookup e.id base with
  | none => exact Or.inr (Or.inr (hm _ (by simp [diffSection, hb])))
  | some b =>
    by_cases hbe : b = e.body
    · exact Or.inl (by rw [hbe])
    · exact Or.inr (Or.inl (hm _ (by simp [diffSection, hb, hbe])))

/-- Every base section the text drops is reported as absent. -/
theorem absence_reported {base edited : List Section} {s : Section} (hs : s ∈ base)
    (h : s.id ∉ ids edited) : Outcome.absent s.id ∈ diff base edited :=
  mem_append_right _ (mem_filterMap.2 ⟨s, hs, by simp [absentSection, ids] at h ⊢; exact h⟩)

/-- Absence is never an edit: an absent outcome changes nothing. -/
theorem absence_not_edit (base : List Section) (id : Line) :
    apply base [.absent id] = base := by
  simp [apply, acceptedBody]

end Loops.Lens
