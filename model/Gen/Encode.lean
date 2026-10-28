import Loops
import Gen.Json

/-!
# Encoding model values for the vectors
-/

open Loops Gen

/-! ## Fixture times

A fixture's time `t` is `t` seconds into 2026-10-01, UTC: a stamp for
`emitted`, and a claim of the same instant for `occurred`. Each fixture
carries a proof, decided when it is built, that its texts read, so none can
fall back to another time or to no `occurred`. -/

def pad2 (n : Nat) : String := if n < 10 then s!"0{n}" else toString n

def timeText (t : Nat) : String := s!"2026-10-01T{pad2 (t / 3600)}:{pad2 (t / 60 % 60)}:{pad2 (t % 60)}Z"

/-- `t` as a fixture time: its text reads as a stamp and as a claim. -/
abbrev Reads (t : Nat) : Prop :=
  (Stamp.of? (timeText t)).isSome = true ∧ (Claim.of? (timeText t)).isSome = true

def stampAt (t : Nat) (ok : Reads t := by decide) : Stamp := (Stamp.of? (timeText t)).get ok.1

def claimAt (t : Nat) (ok : Reads t := by decide) : Claim := (Claim.of? (timeText t)).get ok.2

/-- A stamp written out, for spellings `timeText` doesn't make. -/
def stamp (s : String) (ok : (Stamp.of? s).isSome = true := by decide) : Stamp := (Stamp.of? s).get ok

/-- A claim written out, for spans `timeText` doesn't make. -/
def claim (s : String) (ok : (Claim.of? s).isSome = true := by decide) : Claim := (Claim.of? s).get ok

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
  let env := [("id", .str (idText r.id)), ("kind", .str r.kind), ("observer", .str r.observer),
    ("about", .arr (r.about.map .str))]
  let rest := [("prev", .arr (r.prev.map (.str ∘ idText)))] ++
    (match r.under with
      | some u => [("under", .str (idText u))]
      | none => []) ++
    [("emitted", .str r.emitted.text)] ++
    (match r.occurred with
      | some c => [("occurred", .str c.text)]
      | none => []) ++
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
