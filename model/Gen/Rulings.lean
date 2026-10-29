import Gen.Scenario
import Gen.Spec
import Gen.Realm

namespace Gen.RulingVectors

open Loops Loops.Lens
open Gen.ScenarioVectors (jShownIds jSlot rotations)

private def lines (xs : List Line) : J := .arr (xs.map fun x => .str (String.ofList x))
private def sections (xs : List Section) : J := .arr (xs.map fun x =>
  .obj [("id", .str (String.ofList x.id)), ("body", lines x.body)])
private def outcomeJ : Outcome → J
  | .accepted i b => .obj [("accepted", .str (String.ofList i)), ("body", lines b)]
  | .unknown i => .obj [("unknown", .str (String.ofList i))]
  | .absent i => .obj [("absent", .str (String.ofList i))]

private def scenario (name thing : String) (spj : Json) (pool : List Record)
    (steps : List (String × List Record)) (base : List Section) (text : List Line) : Except String J := do
  let sp ← match Spec.ofJson spj with
    | .ok sp => pure sp
    | .error r => throw s!"{r.code}: {r.path}"
  let some os := edit base text | throw "lens edit does not parse"
  let result (forms : List Record) : J :=
    let settled := settle forms
    let admitted := admit (fun _ _ => true) settled
    let state := stateIn thing admitted
    .obj [("settled", jShownIds settled),
      ("admitted", .arr (admitted.map (.str ∘ idText ∘ (·.id)))),
      ("heads", .arr (state.heads.map (.str ∘ idText ∘ (·.id)))),
      ("winner", state.winner.map (fun r => J.str (idText r.id)) |>.getD .null),
      ("slots", .obj ((sp.run settled).map fun (n, v) => (n, jSlot v)))]
  let mut results : List J := []
  for (_, forms) in steps do
    let expected := result forms
    if !(rotations forms).all (fun rs => (result rs).render 0 == expected.render 0) then
      throw s!"scenario/{name}: arrival orders disagree"
    results := results ++ [expected]
  let input : J := .obj [
    ("spec", Gen.Records.ofJson spj), ("thing", .str thing),
    ("records", .arr (pool.map jRecord)),
    ("steps", .arr (steps.map fun (label, forms) => .obj [
      ("name", .str label), ("forms", jShownIds forms),
      ("orders", .arr ((rotations forms).map fun rs => .arr (rs.map (.str ∘ idText ∘ (·.id)))))])),
    ("lens", .obj [("base", sections base), ("text", lines text)])]
  let expected : J := .obj [("steps", .arr results),
    ("lens", .obj [("rendered", lines (render base)), ("outcomes", .arr (os.map outcomeJ)),
      ("applied", sections (apply base os))])]
  pure (vector name "scenario" [] input expected)

private def countSpec : Json := Gen.SpecVectors.fromOf (.obj [("store", .str ".")])
private def r (id : Nat) (thing : String) (t : Nat) (value : String) (prev : List Nat := [])
    (ok : Reads t := by decide) : Record :=
  { Gen.RealmVectors.r id "note" [thing] t prev ok with value }

private def admissionCase : Except String J := do
  let a := r 52 "thing:A" 100 "base"
  let b := r 53 "thing:B" 200 "refused" [52]
  let c := r 0 "thing:A" 300 "also refused" [53]
  let base : List Section := [⟨"thing:A".toList, ["base".toList]⟩]
  scenario "gap01-gap06-admission" "thing:A" countSpec [a, b, c]
    [("before", [a]), ("after", [a, b, c])] base (render base)

private def linesCase : Except String J := do
  let a := r 0x91 "thing:A" 100 "one\r\ntwo\n"
  let b := r 0x92 "thing:A" 200 "\nnext\n" [0x91]
  let body (value : String) : List Line := (value.splitOn "\n").map String.toList
  let base : List Section := [⟨"thing:A".toList, body a.value⟩]
  let changed : List Section := [⟨"thing:A".toList, body b.value⟩]
  scenario "gap11-line-adapter" "thing:A" countSpec [a, b]
    [("before", [a]), ("after", [a, b])] base (render changed)

def vectors : Except String (List (String × J)) := do
  return [("gap01-gap06-admission", ← admissionCase), ("gap11-line-adapter", ← linesCase)]

end Gen.RulingVectors
