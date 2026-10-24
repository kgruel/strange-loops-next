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
  let env := [("id", .str (idText r.id)), ("kind", .str r.kind), ("key", .str r.key)]
  let rest := [("prev", .arr (r.prev.map (.str ∘ idText))),
    ("occurred", .num r.occurred), ("emitted", .num r.emitted)]
  let fields := if r.fields.isEmpty then [] else [("fields", .obj (r.fields.map fun (k, v) => (k, jVal v)))]
  match r.shown with
  | .here => .obj (env ++ [("value", .str r.value)] ++ rest ++ [("n", .int r.n)] ++ fields)
  | s => .obj (env ++ rest ++ [("shown", jShown s)])

def vector (name layer : String) (laws : List String) (input expect : J) : J :=
  .obj [("vector", .str name), ("layer", .str layer), ("laws", .arr (laws.map .str)),
    ("source", .str "model"), ("input", input), ("expect", expect)]
