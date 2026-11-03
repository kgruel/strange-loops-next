import Loops
import Gen.Json
import Gen.Encode
import Gen.Records

/-!
# Scenario vectors

A scenario is a sequence of steps over one spec: at each step, the forms a
reader's places hold. The model settles them into one record per id, admits
what may be admitted, and runs the spec; every rotation of a step's forms must
give the same result. `scenario/01-decision` is the walk the grammar page
draws: two people write, fork, merge and erase one decision, a reader holds
less, and a lens edit comes back as a record.
-/

namespace Gen.ScenarioVectors

open Loops Loops.Lens

def o (kvs : List (String × Json)) : Json := .obj kvs
def s (x : String) : Json := .str x
def a (xs : List Json) : Json := .arr xs

/-- A decision about `decision:auth`, at `t` seconds into 2026-10-01. -/
def decision (id : RecordId) (observer : String) (t : Nat) (value : String) (prev : List RecordId := [])
    (erases : List RecordId := []) (ok : Reads t := by decide) : Record :=
  { id, kind := "decision", observer, about := ["decision:auth"], value, prev, erases,
    emitted := stampAt t ok }

-- Ada writes a decision, then revises it; Bo, holding only the first, revises
-- it too; Ada merges both; her next revision erases the first, which had a
-- secret pasted in; a lens edit by Bo revises that.
def dA := decision (fixtureId 0xA1) "sl:ada" 32400 "Device flow. Client secret: 9f3c…"
def dB := decision (fixtureId 0xB2) "sl:ada" 33000 "Device flow; revisit in Q3." [fixtureId 0xA1]
def dC := decision (fixtureId 0xC3) "sl:bo" 33120 "Use passkeys." [fixtureId 0xA1]
def dM := decision (fixtureId 0xD4) "sl:ada" 34200 "Passkeys; device flow on TVs." [fixtureId 0xB2, fixtureId 0xC3]
def dE := decision (fixtureId 0xE5) "sl:ada" 34800 "Passkeys; device flow on TVs." [fixtureId 0xD4] [fixtureId 0xA1]
def dF := decision (fixtureId 0xF6) "sl:bo" 36300 "Passkeys everywhere." [fixtureId 0xE5]

def records : List Record := [dA, dB, dC, dM, dE, dF]

def spec : Json := o [("vertex", s "decisions"),
  ("from", a [o [("store", s "team"), ("kind", a [s "decision"])]]),
  ("fold", o [
    ("current", o [("latest-by", s "about"), ("follow", s "prev")]),
    ("decisions", o [("count", .bool true)])])]

def upToE := [dA, dB, dC, dM, dE]

/-- Each step: its name and the forms the reader's places hold. -/
def steps : List (String × List Record) := [
  ("emit", [dA]),
  ("revise", [dA, dB]),
  ("fork", [dA, dB, dC]),
  ("merge", [dA, dB, dC, dM]),
  ("erase", upToE),
  ("any-order", upToE),
  ("less-in-view", [dA, dB, dC, dM, dE.withhold]),
  ("tick", upToE),
  ("back-to-text", records)
]

/-- The lens step: the head rendered as a keyed section, and the text after Bo's edit. -/
def lensBase : List Section := [⟨"decision:auth".toList, [dE.value.toList]⟩]
def edited : List Line := ["::: decision:auth".toList, dF.value.toList, ":::".toList]

def rotations (xs : List Record) : List (List Record) :=
  (List.range xs.length).map fun i => xs.drop i ++ xs.take i

def jShownIds (rs : List Record) : J :=
  .arr (rs.map fun r => .obj [("id", .str (idText r.id)), ("shown", jShown r.shown)])

def jSlot : SlotValue → J
  | .nat r => .obj [("value", .num r.value), ("unread", .num r.unread)]
  | .int r => .obj [("value", .int r.value), ("unread", .num r.unread)]
  | .opt r => .obj [("value", match r.value with
      | some v => .int v
      | none => .null), ("unread", .num r.unread)]
  | .heads hs u => .obj [("heads", .arr (hs.map fun (i, sh) =>
      .obj [("id", .str (idText i)), ("shown", jShown sh)])), ("unread", .num u)]
  | .things ts u => .obj [("things", .obj (ts.map fun (t, hs) => (t, .arr (hs.map fun (i, sh) =>
      .obj [("id", .str (idText i)), ("shown", jShown sh)])))), ("unread", .num u)]

/-- What a reader holding `forms` makes of them: settled, admitted, the thing's state, the slots. -/
def outcome (sp : Spec) (forms : List Record) : J :=
  let settled := settle forms
  let admitted := admit (fun _ _ => true) settled
  let st := stateIn "decision:auth" admitted
  .obj [
    ("settled", jShownIds settled),
    ("admitted", .arr (admitted.map (.str ∘ idText ∘ (·.id)))),
    ("heads", .arr (st.heads.map (.str ∘ idText ∘ (·.id)))),
    ("winner", match st.winner with
      | some r => .str (idText r.id)
      | none => .null),
    ("slots", .obj ((sp.run settled).map fun (n, v) => (n, jSlot v)))]

def jl (ls : List Line) : J := .arr (ls.map fun l => .str (String.ofList l))
def jsec (d : List Section) : J := .arr (d.map fun x =>
  .obj [("id", .str (String.ofList x.id)), ("body", jl x.body)])
def jout : Outcome → J
  | .accepted i b => .obj [("accepted", .str (String.ofList i)), ("body", jl b)]
  | .unknown i => .obj [("unknown", .str (String.ofList i))]
  | .absent i => .obj [("absent", .str (String.ofList i))]

-- Reuse the scenario outcome oracle and the same lens/step contract.
def exactSumVector : Except String J := do
  let name := "phase2-exact-output"
  let spec : Json := o [("vertex", s "exact-output"),
    ("from", a [o [("store", s "team")]]),
    ("fold", o [("n", o [("sum", s "n")]), ("field", o [("sum", s "est")])])]
  let sp ← match Spec.ofJson spec with
    | .ok sp => pure sp
    | .error r => throw s!"scenario/{name}: spec refused {r.code} at {r.path}"
  let first : Record := { decision (fixtureId 0xf1) "sl:ada" 100 "First." with
    n := 9007199254740991, fields := [("est", .int 9007199254740991)] }
  let second : Record := { decision (fixtureId 0xf2) "sl:bo" 110 "Second." with
    n := 2, fields := [("est", .int 2)] }
  let records := [first, second]
  let steps := [("safe-input", [first]), ("exact-output", records)]
  let base : List Section := [⟨"decision:auth".toList, [first.value.toList]⟩]
  let text := render [⟨"decision:auth".toList, [second.value.toList]⟩]
  let some result := edit base text | throw s!"scenario/{name}: the lens edit is refused"
  let mut outs : List J := []
  for (label, forms) in steps do
    let results := (rotations forms).map (outcome sp)
    let expected := results.headD .null
    if !(results.all (·.render 0 == expected.render 0)) then
      throw s!"scenario/{name}/{label}: arrival orders disagree"
    outs := outs ++ [expected]
  return vector name "scenario" ["spec.set", "sum.perm", "numeric.safe-whole"]
    (.obj [("spec", Records.ofJson spec), ("thing", .str "decision:auth"),
      ("records", .arr (records.map jRecord)),
      ("steps", .arr (steps.map fun (label, forms) => .obj [
        ("name", .str label), ("forms", jShownIds forms),
        ("orders", .arr ((rotations forms).map fun xs => .arr (xs.map (.str ∘ idText ∘ (·.id)))))])),
      ("lens", .obj [("base", jsec base), ("text", jl text)])])
    (.obj [("steps", .arr outs),
      ("lens", .obj [("rendered", jl (render base)), ("outcomes", .arr (result.outcomes.map jout)),
        ("applied", jsec result.applied)])])

-- A superseded record remains a head only for its other thing.
-- Its later timestamp also exposes an incorrect whole-view winner.
def thingStateVector : Except String J := do
  let name := "phase2-thing-state"
  let sp ← match Spec.ofJson spec with
    | .ok sp => pure sp
    | .error r => throw s!"scenario/{name}: spec refused {r.code} at {r.path}"
  let first : Record := { decision (fixtureId 0xf3) "sl:ada" 200 "Other thing still current." with
    about := ["decision:auth", "decision:other"] }
  let second := decision (fixtureId 0xf4) "sl:bo" 100 "Auth revised." [first.id]
  let records := [first, second]
  let steps := [("emit", [first]), ("partial-supersession", records)]
  let mut outs : List J := []
  for (label, forms) in steps do
    let results := (rotations forms).map (outcome sp)
    let expected := results.headD .null
    if !(results.all (·.render 0 == expected.render 0)) then
      throw s!"scenario/{name}/{label}: arrival orders disagree"
    outs := outs ++ [expected]
  for forms in rotations records do
    let admitted := admit (fun _ _ => true) (settle forms)
    let state := stateIn "decision:auth" admitted
    if state.heads.map (·.id) != [second.id] || state.winner.map (·.id) != some second.id then
      throw s!"scenario/{name}: auth must have only the successor as head and winner"
    let other := stateIn "decision:other" admitted
    if other.heads.map (·.id) != [first.id] || other.winner.map (·.id) != some first.id then
      throw s!"scenario/{name}: the predecessor must remain the other thing's head and winner"
    if (Latest.fold admitted).heads.map (·.id) != [first.id, second.id] then
      throw s!"scenario/{name}: whole-view heads must retain the newer predecessor first"
    match (sp.run (settle forms)).lookup "current" with
    | some (.things ts unread) =>
      if ts != [("decision:auth", [(second.id, .here)]), ("decision:other", [(first.id, .here)])] || unread != 0 then
        throw s!"scenario/{name}: the spec must retain each thing's own head"
    | _ => throw s!"scenario/{name}: expected a per-thing current slot"
  let base : List Section := [⟨"decision:auth".toList, [first.value.toList]⟩]
  let text := render [⟨"decision:auth".toList, [second.value.toList]⟩]
  let some result := edit base text | throw s!"scenario/{name}: the lens edit is refused"
  return vector name "scenario" ["thing.local", "latest-by.order", "spec.set", "lens.put-get"]
    (.obj [("spec", Records.ofJson spec), ("thing", .str "decision:auth"),
      ("records", .arr (records.map jRecord)),
      ("steps", .arr (steps.map fun (label, forms) => .obj [
        ("name", .str label), ("forms", jShownIds forms),
        ("orders", .arr ((rotations forms).map fun xs => .arr (xs.map (.str ∘ idText ∘ (·.id)))))])),
      ("lens", .obj [("base", jsec base), ("text", jl text)])])
    (.obj [("steps", .arr outs),
      ("lens", .obj [("rendered", jl (render base)), ("outcomes", .arr (result.outcomes.map jout)),
        ("applied", jsec result.applied)])])

def vectors : Except String (List (String × J)) := do
  let sp ← match Spec.ofJson spec with
    | .ok sp => pure sp
    | .error r => throw s!"scenario/01-decision: spec refused {r.code} at {r.path}"
  let mut outs : List J := []
  for (name, forms) in steps do
    let results := (rotations forms).map (outcome sp)
    let first := results.headD .null
    if !(results.all (·.render 0 == first.render 0)) then
      throw s!"scenario/01-decision/{name}: arrival orders disagree"
    outs := outs ++ [first]
  -- the lens step: rendering the head and parsing the edit gives one accepted
  -- section, whose body is the record that comes back
  let some result := edit lensBase edited
    | throw "scenario/01-decision: the lens edit is refused"
  match result.outcomes with
  | [.accepted i b] =>
    if i != "decision:auth".toList || b != [dF.value.toList] then
      throw "scenario/01-decision: the accepted edit isn't F's body"
  | _ => throw "scenario/01-decision: expected exactly one accepted edit"
  let input := J.obj [
    ("spec", Records.ofJson spec),
    ("thing", .str "decision:auth"),
    ("records", .arr (records.map jRecord)),
    ("steps", .arr (steps.map fun (name, forms) => .obj [
      ("name", .str name),
      ("forms", jShownIds forms),
      ("orders", .arr ((rotations forms).map fun xs => .arr (xs.map (.str ∘ idText ∘ (·.id)))))])),
    ("lens", .obj [("base", jsec lensBase), ("text", jl edited)])]
  let expect := J.obj [
    ("steps", .arr outs),
    ("lens", .obj [("rendered", jl (render lensBase)), ("outcomes", .arr (result.outcomes.map jout)),
      ("applied", jsec result.applied)])]
  return [("01-decision", vector "01-decision" "scenario"
    ["spec.set", "latest-by.order", "settle.erased", "view.no-resurrection", "lens.put-get"] input expect),
    ("phase2-exact-output", ← exactSumVector),
    ("phase2-thing-state", ← thingStateVector)]

end Gen.ScenarioVectors
