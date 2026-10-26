import Loops
import Gen.Json
import Gen.Records
import Gen.Encode
import Gen.Spec
import Gen.Batch
import Gen.Realm
import Gen.Occurred

/-!
# Gen: write the vectors

`lake exe gen <dir>` rewrites `<dir>/fold` and `<dir>/lens` from the model.
CI runs it and fails if anything changed, so vectors stay a pure render of
the model. Each case is also checked here against the laws it illustrates.
-/

open Loops Loops.Lens Gen

/-! ## Encoding -/

def jLine (l : Line) : J := .str (String.ofList l)
def jLines (ls : List Line) : J := .arr (ls.map jLine)

def jSection (s : Section) : J := .obj [("id", jLine s.id), ("body", jLines s.body)]
def jDoc (d : List Section) : J := .arr (d.map jSection)

def jOutcome : Outcome → J
  | .accepted i b => .obj [("accepted", jLine i), ("body", jLines b)]
  | .unknown i => .obj [("unknown", jLine i)]
  | .absent i => .obj [("absent", jLine i)]

/-! ## Records used by the fold cases -/

def rec (id : Nat) (thing : String) (occurred : Nat) (emitted : Nat := occurred)
    (prev : List Nat := []) (value : String := s!"v{id}") : Record :=
  { id, kind := "decision", about := [thing], value, prev, occurred, emitted }

def r1 := rec 0x11 "topic:auth" 100
def r2 := rec 0x12 "topic:auth" 200 (prev := [0x11])
def r3 := rec 0x13 "topic:auth" 150
def r4 := rec 0x14 "topic:auth" 300 (prev := [0x12, 0x13])
def r5 := rec 0x15 "topic:cache" 120
def r6 := rec 0x16 "topic:auth" 200 (emitted := 210)
def r7 := rec 0x17 "topic:auth" 200 (emitted := 210)
def r8 := rec 0x18 "topic:cache" 400 (prev := [0x99])

def n1 := { rec 0x21 "load" 100 with n := 5 }
def n2 := { rec 0x22 "load" 110 with n := -3 }
def n3 := { rec 0x23 "load" 120 with n := 40 }
def n4 := { rec 0x24 "load" 130 with n := 40 }

-- the current load per host: `h3` supersedes `h2`
def h1 := { rec 0x31 "host:a" 100 with n := 5 }
def h2 := { rec 0x32 "host:b" 110 with n := 9 }
def h3 := { rec 0x33 "host:b" 120 (prev := [0x32]) with n := 1 }

/-! ## Fold cases -/

structure FoldCase where
  name : String
  laws : List String
  orders : List (List Record)

def rotations (xs : List Record) : List (List Record) :=
  (List.range xs.length).map fun i => xs.drop i ++ xs.take i

def countCases : List FoldCase := [
  ⟨"01-empty", ["count.perm"], [[]]⟩,
  ⟨"02-three", ["count.perm"], rotations [r1, r3, r5]⟩,
  ⟨"03-repeats-counted", ["count.repeats"], [[r1, r3, r5, r1, r3, r5]]⟩
]

def latestCases : List FoldCase := [
  ⟨"01-chain", ["latest.set"], rotations [r1, r2]⟩,
  ⟨"02-fork", ["latest.set"], rotations [r1, r3]⟩,
  ⟨"03-merge", ["latest.set"], rotations [r1, r2, r3, r4]⟩,
  ⟨"04-repeats", ["latest.repeats"], [[r1, r3], [r3, r1, r3, r1]]⟩
]

def sumCases : List FoldCase := [
  ⟨"01-empty", ["sum.perm"], [[]]⟩,
  ⟨"02-mixed-signs", ["sum.perm"], rotations [n1, n2, n3]⟩,
  ⟨"03-repeats-counted", ["sum.repeats"], [[n1, n2, n3, n1, n2, n3]]⟩
]

def extremaCases : List FoldCase := [
  ⟨"01-empty", ["extrema.set"], [[]]⟩,
  ⟨"02-mixed-signs", ["extrema.set"], rotations [n1, n2, n3]⟩,
  ⟨"03-ties", ["extrema.set"], rotations [n3, n4, n1]⟩,
  ⟨"04-repeats", ["extrema.set"], [[n1, n2], [n2, n1, n2, n2, n1]]⟩
]

def jOptInt : Option Int → J
  | some i => .int i
  | none => .null

def latestByCases : List FoldCase := [
  ⟨"01-one", ["latest-by.set"], [[r1]]⟩,
  ⟨"02-fork", ["latest-by.set", "latest-by.order"], rotations [r1, r3]⟩,
  ⟨"03-chain", ["latest-by.set"], [[r1, r2]]⟩,
  ⟨"04-chain-late", ["latest-by.set"], [[r2, r1]]⟩,
  ⟨"05-emitted-breaks-tie", ["latest-by.order"], rotations [r3, r6]⟩,
  ⟨"06-id-breaks-tie", ["latest-by.order"], rotations [r6, r7]⟩,
  ⟨"07-merge", ["latest-by.set"], rotations [r1, r2, r3, r4]⟩,
  ⟨"08-repeats", ["latest-by.repeats"], [[r1, r3], [r1, r3, r1, r3], [r3, r1, r3]]⟩,
  ⟨"09-converge", ["latest-by.converge"], [[r1, r3, r5, r2], [r5, r2, r1, r3]]⟩,
  ⟨"10-two-things", ["latest-by.set"], rotations [r1, r5, r3]⟩,
  ⟨"11-dangling-prev", ["latest-by.set"], rotations [r5, r8]⟩
]

def headsCases : List FoldCase := [
  ⟨"01-max-follows-prev", ["heads.set"], rotations [h1, h2, h3]⟩,
  ⟨"02-superseded-max-leaves", ["heads.set"], rotations [h2, h3]⟩,
  ⟨"03-limit-newest-first", ["heads.set"], rotations [r1, r2, r3, r5, r8]⟩
]

def jResult (r : Result (Option Int)) : J :=
  .obj [("value", jOptInt r.value), ("unread", .num r.unread)]

def jHeads (s : LatestBy) : J :=
  .obj [("max", jResult s.maxHeads),
    ("limit-2", .arr ((s.limit 2).map (.str ∘ idText ∘ (·.id))))]

/-! ## View cases: what a reader without some payloads gets -/

structure ViewCase where
  name : String
  laws : List String
  records : List Record
  /-- How the reader sees each record. -/
  view : Record → Record

def hideIds (ids : List Nat) : Record → Record := withholding (ids.contains ·.id)
def eraseIds (ids : List Nat) (r : Record) : Record := if ids.contains r.id then r.erase else r

def viewCases : List ViewCase := [
  ⟨"01-withheld-head-still-supersedes", ["view.no-resurrection"], [r1, r2], hideIds [0x12]⟩,
  ⟨"02-erased-head-still-supersedes", ["view.no-resurrection"], [r1, r2, r3, r4], eraseIds [0x14]⟩,
  ⟨"03-withheld-ancestor", ["view.no-resurrection"], [r1, r2, r3, r4], hideIds [0x11, 0x12]⟩,
  ⟨"04-max-counts-unread-heads", ["view.no-resurrection", "result.unread"], [h1, h2, h3], hideIds [0x33]⟩
]

def jViewState (s : LatestBy) : J :=
  .obj [("heads", .arr (s.heads.map fun h => .obj [("id", .str (idText h.id)), ("shown", jShown h.shown)])),
    ("max", jResult s.maxHeads)]

def viewVector (c : ViewCase) : Except String J := do
  let orders := rotations (c.records.map c.view)
  let results := orders.map fun o => jViewState (LatestBy.fold .empty o)
  let first := results.headD .null
  if !(results.all (·.render 0 == first.render 0)) then
    throw s!"fold/view/{c.name}: arrival orders disagree"
  -- a view sees the same heads as a reader holding everything
  let full := (LatestBy.fold .empty c.records).heads.map (·.id)
  if (LatestBy.fold .empty (c.records.map c.view)).heads.map (·.id) != full then
    throw s!"fold/view/{c.name}: a view changed the heads"
  return vector c.name "fold/view" c.laws
    (.obj [("orders", .arr (orders.map fun o => .arr (o.map jRecord)))]) first

/-! ## Select cases: `where` with three answers -/

structure SelectCase where
  name : String
  laws : List String
  records : List Record
  /-- The test as a spec writes it, and as the model runs it. -/
  test : J
  w : Where

def selectCases : List SelectCase := [
  ⟨"01-payload-test-on-withheld", ["result.unread", "select.set"],
    [n1, n2, n3.withhold],
    .obj [("n", .obj [("at-least", .int 0)])], .payload (·.n ≥ 0)⟩,
  ⟨"02-envelope-test-on-withheld", ["result.unread", "select.set"],
    [n1, n2, n3.withhold],
    .obj [("kind", .obj [("is", .str "decision")])],
    .envelope (·.kind == "decision") fun _ _ h => by rw [h.kind]⟩,
  ⟨"03-all-here", ["result.full", "select.set"], [n1, n2, n3],
    .obj [("n", .obj [("at-least", .int 0)])], .payload (·.n ≥ 0)⟩
]

def jSum (r : Result Int) : J := .obj [("value", .int r.value), ("unread", .num r.unread)]
def jCount (r : Result Nat) : J := .obj [("value", .num r.value), ("unread", .num r.unread)]

def selectVector (c : SelectCase) : Except String J := do
  let orders := rotations c.records
  let results := orders.map fun o =>
    J.obj [("count", jCount (Count.acc.select c.w.eval o)), ("sum", jSum (Sum.acc.select c.w.eval o))]
  let first := results.headD .null
  if !(results.all (·.render 0 == first.render 0)) then
    throw s!"fold/select/{c.name}: arrival orders disagree"
  return vector c.name "fold/select" c.laws
    (.obj [("where", c.test), ("orders", .arr (orders.map fun o => .arr (o.map jRecord)))]) first

def foldVector (layer : String) (c : FoldCase) (result : List Record → J) : Except String J := do
  let results := c.orders.map result
  let first := results.headD .null
  -- every arrival order must agree, as the laws say
  if c.laws.any (fun l => l != "count.repeats" && l != "sum.repeats") &&
      !(results.all (·.render 0 == first.render 0)) then
    throw s!"{layer}/{c.name}: arrival orders disagree"
  return vector c.name layer c.laws
    (.obj [("orders", .arr (c.orders.map fun o => .arr (o.map jRecord)))]) first

/-! ## Lens cases -/

def L (s : String) : Line := s.toList
def S (id : String) (body : List String) : Section := ⟨L id, body.map L⟩

def base : List Section := [
  S "decision:auth" ["Use OAuth device flow.", "", "Revisit in Q3."],
  S "decision:cache" ["No cache until reads are slow."]
]

structure LensCase where
  name : String
  laws : List String
  base : List Section
  text : List Line

def edited (f : List Section → List Section) : List Line := render (f base)

def lensCases : List LensCase := [
  ⟨"01-round-trip", ["lens.round-trip"], base, render base⟩,
  ⟨"02-escaping", ["lens.escaping"], [],
    render [S "notes" [":::", "::: decision:auth", ":::x", "\\", "\\:::", "  ::: indented", "::", ""]]⟩,
  ⟨"03-no-op", ["lens.no-op"], base, render base⟩,
  ⟨"04-edit-body", ["lens.put-get"], base,
    edited fun d => d.map fun s => if s.id = L "decision:auth" then { s with body := [L "Use passkeys."] } else s⟩,
  ⟨"05-unknown-section", ["lens.nothing-dropped"], base, edited (· ++ [S "decision:queue" ["Use SQS."]])⟩,
  ⟨"06-dropped-section", ["lens.nothing-dropped", "lens.absence-not-edit"], base, edited (·.take 1)⟩,
  ⟨"07-unclosed", ["lens.refuse"], base, [L "::: decision:auth", L "Use OAuth device flow."]⟩,
  ⟨"08-fence-in-body", ["lens.refuse"], base, [L "::: decision:auth", L ":::x", L ":::"]⟩,
  ⟨"09-text-outside", ["lens.refuse"], base, [L "stray line"] ++ render base⟩,
  -- a backslash the text itself starts with, before nothing that needs escaping, is kept
  ⟨"10-backslash-kept", ["lens.escaping", "lens.put-get"], base,
    render [base[0]!] ++ [L "::: decision:cache", L "\\No cache until reads are slow.", L ":::"]⟩
]

def lensVector (c : LensCase) : Except String J := do
  let parsed := parse c.text
  let outcomes := edit c.base c.text
  -- normal form must be stable, as the laws say
  match normalize c.text with
  | some n => if normalize n != some n then throw s!"lens/{c.name}: normal form unstable"
  | none => pure ()
  let expect : J := match parsed, outcomes with
    | some d, some os => .obj [("parsed", jDoc d), ("normalized", jLines (render d)),
        ("outcomes", .arr (os.map jOutcome)), ("applied", jDoc (apply c.base os))]
    | _, _ => .obj [("parsed", .null), ("refused", .bool true)]
  return vector c.name "lens/section" c.laws
    (.obj [("base", jDoc c.base), ("text", jLines c.text)]) expect

/-! ## Writing -/

def writeAll (dir : System.FilePath) (sub : String) (vs : List (String × J)) : IO Unit := do
  let d := dir / sub
  IO.FS.createDirAll d
  for (name, v) in vs do
    IO.FS.writeFile (d / s!"{name}.json") (v.render 0 ++ "\n")

def orFail : Except String J → IO J
  | .ok j => pure j
  | .error e => throw (IO.userError e)

def main (args : List String) : IO UInt32 := do
  let dir : System.FilePath := args.headD "../vectors"
  for sub in ["fold", "lens", "record", "spec", "batch", "realm", "occurred"] do
    if ← (dir / sub).pathExists then IO.FS.removeDirAll (dir / sub)
  let count ← countCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/count" c fun o => .num (Count.fold 0 o)))
  let latest ← latestCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/latest" c fun o =>
      let s := Latest.fold o
      .obj [("winner", match Latest.winner s with
          | some r => .str (idText r.id)
          | none => .null),
        ("others", .arr ((Latest.others s).map (.str ∘ idText ∘ (·.id))))]))
  let sum ← sumCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/sum" c fun o => .int (Sum.fold 0 o)))
  let extrema ← extremaCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/extrema" c fun o =>
      .obj [("min", jOptInt (Min.fold none o)), ("max", jOptInt (Max.fold none o))]))
  let latestBy ← latestByCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/latest-by" c fun o => jPerThing (perThing o)))
  let heads ← headsCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/heads" c fun o => jHeads (LatestBy.fold .empty o)))
  let views ← viewCases.mapM fun c => do pure (c.name, ← orFail (viewVector c))
  let selects ← selectCases.mapM fun c => do pure (c.name, ← orFail (selectVector c))
  let lens ← lensCases.mapM fun c => do pure (c.name, ← orFail (lensVector c))
  let records ← match Gen.Records.vectors with
    | .ok vs => pure vs
    | .error e => throw (IO.userError e)
  writeAll dir "fold/count" count
  writeAll dir "fold/latest-by" latestBy
  writeAll dir "fold/latest" latest
  writeAll dir "fold/sum" sum
  writeAll dir "fold/extrema" extrema
  writeAll dir "fold/heads" heads
  writeAll dir "fold/view" views
  writeAll dir "fold/select" selects
  writeAll dir "lens/section" lens
  writeAll dir "record" records
  let specs ← match Gen.SpecVectors.vectors with
    | .ok vs => pure vs
    | .error e => throw (IO.userError e)
  for (sub, name, v) in specs do writeAll dir sub [(name, v)]
  let batches ← match Gen.BatchVectors.vectors with
    | .ok vs => pure vs
    | .error e => throw (IO.userError e)
  writeAll dir "batch" batches
  let realms ← match Gen.RealmVectors.vectors with
    | .ok vs => pure vs
    | .error e => throw (IO.userError e)
  writeAll dir "realm" realms
  let occurred ← match Gen.OccurredVectors.vectors with
    | .ok vs => pure vs
    | .error e => throw (IO.userError e)
  writeAll dir "occurred" occurred
  IO.println s!"wrote {count.length + latestBy.length + latest.length + sum.length + extrema.length + heads.length + views.length + selects.length + lens.length + records.length + specs.length + batches.length + realms.length + occurred.length} vectors to {dir}"
  return 0
