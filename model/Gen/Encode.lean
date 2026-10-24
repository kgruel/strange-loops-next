import Loops
import Gen.Json

/-!
# Encoding model values for the vectors
-/

open Loops Gen

def idText (n : Nat) : String :=
  let d := Nat.toDigits 16 n
  "r:" ++ String.ofList (List.replicate (8 - d.length) '0' ++ d)

def jVal : Val → J
  | .str s => .str s
  | .int i => .int i
  | .bool b => .bool b

def jShown : Shown → J
  | .here => .str "here"
  | .withheld => .str "withheld"
  | .erased => .str "erased"

/-- A record as a reader holds it. A missing payload is written as `shown`,
with no `value` or `n`. -/
def jRecord (r : Record) : J :=
  let env := [("id", .str (idText r.id)), ("kind", .str r.kind)] ++
    (if r.observer.isEmpty then [] else [("observer", .str r.observer)]) ++
    [("about", .arr (r.about.map .str))]
  let rest := [("prev", .arr (r.prev.map (.str ∘ idText))),
    ("occurred", .num r.occurred), ("emitted", .num r.emitted)] ++
    (if r.erases.isEmpty then [] else [("erases", .arr (r.erases.map (.str ∘ idText)))])
  let fields := if r.fields.isEmpty then [] else [("fields", .obj (r.fields.map fun (k, v) => (k, jVal v)))]
  match r.shown with
  | .here => .obj (env ++ [("value", .str r.value)] ++ rest ++ [("n", .int r.n)] ++ fields)
  | s => .obj (env ++ rest ++ [("shown", jShown s)])

/-- Each thing and its state: its heads newest first, its winner and its fork. -/
def jPerThing (per : List (String × LatestBy)) : J :=
  .obj (per.map fun (t, s) =>
    (t, .obj [("heads", .arr (s.heads.map (.str ∘ idText ∘ (·.id)))),
      ("winner", match s.winner with
        | some r => .str (idText r.id)
        | none => .null),
      ("others", .arr (s.others.map (.str ∘ idText ∘ (·.id))))]))

def vector (name layer : String) (laws : List String) (input expect : J) : J :=
  .obj [("vector", .str name), ("layer", .str layer), ("laws", .arr (laws.map .str)),
    ("source", .str "model"), ("input", input), ("expect", expect)]
