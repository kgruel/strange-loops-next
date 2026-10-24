import Loops
import Gen.Json
import Gen.Records

/-!
# Gen: write the vectors

`lake exe gen <dir>` rewrites `<dir>/fold` and `<dir>/lens` from the model.
CI runs it and fails if anything changed, so vectors stay a pure render of
the model. Each case is also checked here against the laws it illustrates.
-/

open Loops Loops.Lens Gen

/-! ## Encoding -/

def idText (n : Nat) : String :=
  let d := Nat.toDigits 16 n
  "r:" ++ String.ofList (List.replicate (8 - d.length) '0' ++ d)

def jRecord (r : Record) : J :=
  .obj [("id", .str (idText r.id)), ("kind", .str r.kind), ("key", .str r.key),
    ("value", .str r.value), ("prev", .arr (r.prev.map (.str ∘ idText))),
    ("occurred", .num r.occurred), ("emitted", .num r.emitted)]

def jUpsert (s : Upsert) : J :=
  let keys := s.heads.foldl (fun ks h => if ks.contains h.key then ks else ks ++ [h.key]) []
  .obj [("heads", .arr (s.heads.map (.str ∘ idText ∘ (·.id)))),
    ("named", .arr (s.named.map (.str ∘ idText))),
    ("keys", .obj (keys.map fun k =>
      (k, .obj [("winner", match s.winner k with
          | some r => .str (idText r.id)
          | none => .null),
        ("others", .arr ((s.others k).map (.str ∘ idText ∘ (·.id))))])))]

def jLine (l : Line) : J := .str (String.ofList l)
def jLines (ls : List Line) : J := .arr (ls.map jLine)

def jSection (s : Section) : J := .obj [("id", jLine s.id), ("body", jLines s.body)]
def jDoc (d : List Section) : J := .arr (d.map jSection)

def jOutcome : Outcome → J
  | .accepted i b => .obj [("accepted", jLine i), ("body", jLines b)]
  | .unknown i => .obj [("unknown", jLine i)]
  | .absent i => .obj [("absent", jLine i)]

def vector (name layer : String) (laws : List String) (input expect : J) : J :=
  .obj [("vector", .str name), ("layer", .str layer), ("laws", .arr (laws.map .str)),
    ("source", .str "model"), ("input", input), ("expect", expect)]

/-! ## Records used by the fold cases -/

def rec (id : Nat) (key : String) (occurred : Nat) (emitted : Nat := occurred)
    (prev : List Nat := []) (value : String := s!"v{id}") : Record :=
  { id, kind := "decision", key, value, prev, occurred, emitted }

def r1 := rec 0x11 "topic:auth" 100
def r2 := rec 0x12 "topic:auth" 200 (prev := [0x11])
def r3 := rec 0x13 "topic:auth" 150
def r4 := rec 0x14 "topic:auth" 300 (prev := [0x12, 0x13])
def r5 := rec 0x15 "topic:cache" 120
def r6 := rec 0x16 "topic:auth" 200 (emitted := 210)
def r7 := rec 0x17 "topic:auth" 200 (emitted := 210)
def r8 := rec 0x18 "topic:cache" 400 (prev := [0x99])

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

def upsertCases : List FoldCase := [
  ⟨"01-one", ["upsert.set"], [[r1]]⟩,
  ⟨"02-fork", ["upsert.set", "upsert.order"], rotations [r1, r3]⟩,
  ⟨"03-chain", ["upsert.set"], [[r1, r2]]⟩,
  ⟨"04-chain-late", ["upsert.set"], [[r2, r1]]⟩,
  ⟨"05-emitted-breaks-tie", ["upsert.order"], rotations [r3, r6]⟩,
  ⟨"06-id-breaks-tie", ["upsert.order"], rotations [r6, r7]⟩,
  ⟨"07-merge", ["upsert.set"], rotations [r1, r2, r3, r4]⟩,
  ⟨"08-repeats", ["upsert.repeats"], [[r1, r3], [r1, r3, r1, r3], [r3, r1, r3]]⟩,
  ⟨"09-converge", ["upsert.converge"], [[r1, r3, r5, r2], [r5, r2, r1, r3]]⟩,
  ⟨"10-two-keys", ["upsert.set"], rotations [r1, r5, r3]⟩,
  ⟨"11-dangling-prev", ["upsert.set"], rotations [r5, r8]⟩
]

def foldVector (layer : String) (c : FoldCase) (result : List Record → J) : Except String J := do
  let results := c.orders.map result
  let first := results.headD .null
  -- every arrival order must agree, as the laws say
  if c.laws.any (· != "count.repeats") && !(results.all (·.render 0 == first.render 0)) then
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
  ⟨"09-text-outside", ["lens.refuse"], base, [L "stray line"] ++ render base⟩
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
  for sub in ["fold", "lens", "record"] do
    if ← (dir / sub).pathExists then IO.FS.removeDirAll (dir / sub)
  let count ← countCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/count" c fun o => .num (Count.fold 0 o)))
  let upsert ← upsertCases.mapM fun c => do
    pure (c.name, ← orFail (foldVector "fold/upsert" c fun o => jUpsert (Upsert.fold .empty o)))
  let lens ← lensCases.mapM fun c => do pure (c.name, ← orFail (lensVector c))
  let records ← match Gen.Records.vectors with
    | .ok vs => pure vs
    | .error e => throw (IO.userError e)
  writeAll dir "fold/count" count
  writeAll dir "fold/upsert" upsert
  writeAll dir "lens/section" lens
  writeAll dir "record" records
  IO.println s!"wrote {count.length + upsert.length + lens.length + records.length} vectors to {dir}"
  return 0
