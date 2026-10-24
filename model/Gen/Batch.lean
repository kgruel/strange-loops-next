import Loops
import Gen.Json
import Gen.Encode
import Gen.Records

/-!
# Batch vectors

A changeset whose records name each other by label. `input.drafts` lists
them; `expect.records` gives each one's id and canonical envelope, in the
order given, or `expect.refused`. Every rotation of the drafts must give the
same records, and each label's id must be its record's id with real ids in
place of labels (`Meaning`).
-/

namespace Gen.BatchVectors

open Loops Gen.Records

def draft (label : Option String) (name : String) (env : Env) (payload : Json) : Draft :=
  { label, env, salt := saltFor name, payload }

def at0 := "2026-10-24T09:00:00Z"

def decide1 := draft (some "@d") "batch-d"
  { kind := "decision", observer := kyle, emitted := at0, about := ["topic:auth"] }
  (.obj [("choice", .str "passkeys")])
def evidence := draft (some "@e") "batch-e"
  { kind := "evidence", observer := kyle, emitted := at0, about := ["topic:auth"] }
  (.obj [("source", .str "url:https://example.com/passkeys")])
def cites := draft none "batch-c"
  { kind := "cites", observer := kyle, emitted := at0, about := ["@d", "@e"] }
  (.obj [])
def revise := draft (some "@d2") "batch-d2"
  { kind := "decision", observer := kyle, emitted := at0, about := ["topic:auth"], prev := ["@d"] }
  (.obj [("choice", .str "passkeys, with a recovery code")])
def outside := draft none "batch-o"
  { kind := "note", observer := kyle, emitted := at0, about := ["@d2", "topic:auth"],
    prev := [r1Id] }
  (.obj [("body", .str "see the revision")])

def cycleA := draft (some "@a") "batch-a"
  { kind := "note", observer := kyle, emitted := at0, prev := ["@b"] } (.obj [])
def cycleB := draft (some "@b") "batch-b"
  { kind := "note", observer := kyle, emitted := at0, prev := ["@a"] } (.obj [])

structure Case where
  name : String
  laws : List String
  drafts : List Draft

def cases : List Case := [
  ⟨"01-two-labels", ["batch.meaning"], [decide1, evidence, cites]⟩,
  ⟨"02-chain-and-real-ids", ["batch.meaning"], [decide1, revise, outside]⟩,
  ⟨"10-unknown-label", ["batch.refuse"], [cites]⟩,
  ⟨"11-duplicate-label", ["batch.refuse"], [decide1, { decide1 with salt := saltFor "batch-d-again" }]⟩,
  ⟨"12-cycle", ["batch.refuse"], [cycleA, cycleB]⟩
]

def jDraft (d : Draft) : J :=
  .obj ((match d.label with
      | some l => [("label", J.str l)]
      | none => []) ++
    [("env", envInput d.env), ("salt", .str (base32 d.salt)), ("payload", ofJson d.payload)])

def rotations (xs : List Draft) : List (List Draft) :=
  (List.range xs.length).map fun i => xs.drop i ++ xs.take i

/-- Every label's id is its record's id with real ids in place of labels. -/
def checkMeaning (ds : List Draft) (rs : List Stored) : Bool :=
  let σ := (ds.zip rs).filterMap fun (d, r) => d.label.map (·, r.id H)
  (ds.zip rs).all fun (d, r) =>
    match substEnv (fun l => σ.lookup l) d.env with
    | some e => idOf H e (d.commit H) == r.id H && e.toJson.canon == r.env.toJson.canon
    | none => false

def sortStr (xs : List String) : List String := sortBy utf16 xs

def batchVector (c : Case) : Except String J := do
  let outcomes := (rotations c.drafts).map (resolveBatch H)
  let expect ← match resolveBatch H c.drafts with
    | .ok rs =>
      if !checkMeaning c.drafts rs then throw s!"batch/{c.name}: not the batch's meaning"
      let ids := sortStr (rs.map (·.id H))
      for o in outcomes do
        match o with
        | .ok rs' => if sortStr (rs'.map (·.id H)) != ids then
            throw s!"batch/{c.name}: draft order changed the records"
        | .error e => throw s!"batch/{c.name}: a rotation was refused: {e}"
      pure (J.obj [("records", .arr (rs.map fun r =>
        .obj [("id", .str (r.id H)), ("env_canonical", .str r.env.toJson.canon)]))])
    | .error why =>
      for o in outcomes do
        if let .ok _ := o then throw s!"batch/{c.name}: a rotation was accepted"
      pure (J.obj [("refused", .str why)])
  return vector c.name "batch" c.laws (.obj [("drafts", .arr (c.drafts.map jDraft))]) expect

def vectors : Except String (List (String × J)) :=
  cases.mapM fun c => do pure (c.name, ← batchVector c)

end Gen.BatchVectors
