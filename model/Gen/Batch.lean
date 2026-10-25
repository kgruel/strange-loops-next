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
-- a decision already in the store, about the same topic
def heldAuth : Stored :=
  make
    { kind := "decision", observer := kyle, emitted := "2026-10-23T09:00:00Z",
      about := ["topic:auth"] }
    (saltFor "held-auth") (.obj [("choice", .str "device flow")])
def heldAuthId : String := heldAuth.id H

/-- What the store holds besides the batch: each id and its `about`. -/
def held : List (String × List String) := [(heldAuthId, ["topic:auth"]), (r1Id, [])]

def outside := draft none "batch-o"
  { kind := "decision", observer := kyle, emitted := at0, about := ["@d2", "topic:auth"],
    prev := [heldAuthId] }
  (.obj [("choice", .str "passkeys")])
def unknownPrev := draft none "batch-u"
  { kind := "decision", observer := kyle, emitted := at0, about := ["topic:auth"], prev := [grantId] }
  (.obj [])
def unrelated := draft none "batch-n"
  { kind := "note", observer := kyle, emitted := at0, about := ["topic:cache"], prev := ["@d"] }
  (.obj [])

-- write refuses these, in a batch as on their own; the envelope is checked first
def badKind := draft none "batch-k"
  { kind := "", observer := kyle, emitted := at0, about := ["topic:auth"] } (.obj [])
def bigNumber := draft none "batch-big"
  { kind := "estimate", observer := kyle, emitted := at0, about := ["topic:auth"] }
  (.obj [("n", .int 9007199254740992)])
-- one `prev` the writer holds but about another thing, one it doesn't hold
def bothPrev := draft none "batch-p"
  { kind := "note", observer := kyle, emitted := at0, about := ["topic:cache"],
    prev := [heldAuthId, grantId] }
  (.obj [])

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
  ⟨"12-cycle", ["batch.refuse"], [cycleA, cycleB]⟩,
  ⟨"13-prev-unknown", ["batch.refuse"], [unknownPrev]⟩,
  ⟨"14-prev-unrelated", ["batch.refuse"], [decide1, unrelated]⟩,
  ⟨"15-write-refused", ["batch.refuse", "write.checked"], [decide1, badKind, bigNumber]⟩,
  ⟨"16-refusal-order", ["batch.refuse"], [decide1, unrelated, unknownPrev, bothPrev]⟩
]

def jDraft (d : Draft) : J :=
  .obj ((match d.label with
      | some l => [("label", J.str l)]
      | none => []) ++
    [("env", envInput d.env), ("salt", .str (base32 d.salt)), ("payload", ofJson d.payload)])

def rotations (xs : List Draft) : List (List Draft) :=
  (List.range xs.length).map fun i => xs.drop i ++ xs.take i

/-- Every label's id is its record's id with real ids in place of labels, and
there is exactly one record per draft. -/
def checkMeaning (ds : List Draft) (rs : List Stored) : Bool :=
  let σ := (ds.zip rs).filterMap fun (d, r) => d.label.map (·, r.id H)
  ds.length == rs.length && (ds.zip rs).all fun (d, r) =>
    match substEnv (fun l => σ.lookup l) d.env with
    | some e => idOf H e (d.commit H) == r.id H && e.toJson.canon == r.env.toJson.canon
    | none => false

def sortStr (xs : List String) : List String := sortBy utf16 xs

/-- The same batch listed differently: every rotation of its drafts, and each
with every draft's `prev` reversed (a set, so its order must not matter). -/
def variants (ds : List Draft) : List (List Draft) :=
  let rev := ds.map fun d => { d with env := { d.env with prev := d.env.prev.reverse } }
  rotations ds ++ rotations rev

def batchVector (c : Case) : Except String J := do
  let resolve := fun ds => (resolveBatch H (held.lookup ·) ds).map (·.map Written.stored)
  let expect ← match resolve c.drafts with
    | .ok rs =>
      let ids := sortStr (rs.map (·.id H))
      for ds in variants c.drafts do
        match resolve ds with
        | .ok rs' =>
          if !checkMeaning ds rs' then throw s!"batch/{c.name}: not the batch's meaning"
          if sortStr (rs'.map (·.id H)) != ids then
            throw s!"batch/{c.name}: draft order changed the records"
        | .error e => throw s!"batch/{c.name}: a reordering was refused: {e}"
      pure (J.obj [("records", .arr (rs.map fun r =>
        .obj [("id", .str (r.id H)), ("env_canonical", .str r.env.toJson.canon)]))])
    | .error why =>
      for ds in variants c.drafts do
        match resolve ds with
        | .ok _ => throw s!"batch/{c.name}: a reordering was accepted"
        | .error e => if e != why then
            throw s!"batch/{c.name}: a reordering was refused for {e}, not {why}"
      pure (J.obj [("refused", .str why)])
  return vector c.name "batch" c.laws
    (.obj [("held", .arr (held.map fun (i, about) => .obj [("id", .str i), ("about", .arr (about.map .str))])),
      ("drafts", .arr (c.drafts.map jDraft))]) expect

def vectors : Except String (List (String × J)) :=
  cases.mapM fun c => do pure (c.name, ← batchVector c)

end Gen.BatchVectors
