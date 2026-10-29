import Loops
import Gen.Json
import Gen.Encode
import Gen.Records
import Gen.Spec
import Gen.Batch
import Gen.Realm
import Gen.Scenario
import Gen.Read

/-!
# Run: the model's answer for an input

`lake exe run <file.json>` reads a vector's `layer` and `input`, decodes the
input into the model's values (`Gen.Read`), computes with the model's own
functions and prints the `expect` object as `gen` renders it.

`lake exe run --check <dir>` does that for every vector of the layers it
reads, compares each answer with the file's `expect` and fails on any
difference. Gen writes a vector from values built in Lean; this reads the
written input back, as an implementation receives it, so CI checks that each
input as written gives its `expect`.

It reads `fold/*`, `lens/section`, `spec/parse`, `spec/run`, `record`,
`batch`, `realm` and `scenario`. Not `occurred`: its span vectors and its
order vector share one input shape, a list of texts, so the input doesn't
say which question it asks.

Where an input lists several arrival orders, each must give the answer the
first does, as gen requires before writing one: a vector has one `expect`.

The encoders `gen` keeps in `Gen.Main` are repeated here, since that module
holds gen's `main`; `--check` holds the two to the same bytes.
-/

open Loops Loops.Lens Gen Gen.Read

/-! ## Encoders, as `Gen.Main` writes them -/

def jLine (l : Line) : J := .str (String.ofList l)
def jLines (ls : List Line) : J := .arr (ls.map jLine)
def jSection (s : Section) : J := .obj [("id", jLine s.id), ("body", jLines s.body)]
def jDoc (d : List Section) : J := .arr (d.map jSection)

def jOutcome : Outcome → J
  | .accepted i b => .obj [("accepted", jLine i), ("body", jLines b)]
  | .unknown i => .obj [("unknown", jLine i)]
  | .absent i => .obj [("absent", jLine i)]

def jOptInt : Option Int → J
  | some i => .int i
  | none => .null

def jResult (r : Result (Option Int)) : J :=
  .obj [("value", jOptInt r.value), ("unread", .num r.unread)]

def jHeads (s : LatestBy) : J :=
  .obj [("max", jResult s.maxHeads),
    ("limit-2", .arr ((s.limit 2).map (.str ∘ idText ∘ (·.id))))]

def jViewState (s : LatestBy) : J :=
  .obj [("heads", .arr (s.heads.map fun h => .obj [("id", .str (idText h.id)), ("shown", jShown h.shown)])),
    ("max", jResult s.maxHeads)]

def jSum (r : Result Int) : J := .obj [("value", .int r.value), ("unread", .num r.unread)]
def jCount (r : Result Nat) : J := .obj [("value", .num r.value), ("unread", .num r.unread)]

/-! ## Answers, layer by layer -/

/-- The answer of each fold over one arrival order. -/
def foldAnswer : String → Option (List Record → J)
  | "fold/count" => some fun o => .num (Count.fold 0 o)
  | "fold/latest" => some fun o =>
    let s := Latest.fold o
    .obj [("winner", match Latest.winner s with
        | some r => .str (idText r.id)
        | none => .null),
      ("others", .arr ((Latest.others s).map (.str ∘ idText ∘ (·.id))))]
  | "fold/sum" => some fun o => .int (Sum.fold 0 o)
  | "fold/extrema" => some fun o => .obj [("min", jOptInt (Min.fold none o)), ("max", jOptInt (Max.fold none o))]
  | "fold/latest-by" => some fun o => jPerThing (perThing o)
  | "fold/heads" => some fun o => jHeads (LatestBy.fold .empty o)
  | "fold/view" => some fun o => jViewState (LatestBy.fold .empty o)
  | _ => none

/-- One answer from several arrival orders: the first order's, which every
other order must give too. -/
def agreed (path : String) (answers : List J) : Dec J :=
  match answers with
  | [] => bad path "no arrival order given"
  | first :: rest =>
    match (rest.zip (List.range rest.length)).find? (·.1.render 0 != first.render 0) with
    | some (_, i) => bad (idx path (i + 1)) s!"gives a different answer than {idx path 0}; every order must hold the same records"
    | none => pure first

def orders (path : String) : Json → Dec (List (List Record)) := each path records

def foldRun (answer : List Record → J) (input : Json) : Dec J := do
  let kvs ← members? "input" ["orders"] input
  let os ← orders "input.orders" (← req "input" kvs "orders")
  agreed "input.orders" (os.map answer)

def specOf (path : String) (j : Json) : Dec Spec :=
  match Spec.ofJson j with
  | .ok sp => pure sp
  | .error r => bad path s!"the spec is refused ({r.code} at \"{r.path}\")"

/-- `fold/select`: the `where` test as a spec writes it, then Count and Sum
over what it chooses. -/
def selectRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["where", "orders"] input
  let w ← req "input" kvs "where"
  if !w.keysDistinct then bad "input.where" "repeats a key"
  let cs ← match parseWhere "where" w with
    | .ok ts => pure ts.conds
    | .error r => bad "input.where" s!"the test is refused ({r.code} at \"{r.path}\")"
  let os ← orders "input.orders" (← req "input" kvs "orders")
  agreed "input.orders" (os.map fun o =>
    .obj [("count", jCount (Count.acc.select (Cond.all cs) o)), ("sum", jSum (Sum.acc.select (Cond.all cs) o))])

def lensRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["base", "text"] input
  let base ← sections "input.base" (← req "input" kvs "base")
  let text ← lines "input.text" (← req "input" kvs "text")
  pure (match parse text, edit base text with
    | some d, some os => .obj [("parsed", jDoc d), ("normalized", jLines (render d)),
        ("outcomes", .arr (os.map jOutcome)), ("applied", jDoc (apply base os))]
    | _, _ => .obj [("parsed", .null), ("refused", .bool true)])

/-- `spec/parse`. A spec that repeats a key comes as written in `spec_text`,
since `spec` as JSON may lose a repeat in another reader; this one keeps
repeats, so it reads either, preferring the text. -/
def specParseRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["spec", "spec_text"] input
  let spec ← match ← opt kvs "spec_text" (text "input.spec_text") with
    | some t => match parseJson t with
      | .ok j => pure j
      | .error e => bad "input.spec_text" e
    | none => req "input" kvs "spec"
  pure (match Spec.ofJson spec with
    | .ok sp => .obj [("parsed", Records.ofJson sp.toJson)]
    | .error r => SpecVectors.jRefusal r)

def specRunRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["spec", "orders"] input
  let sp ← specOf "input.spec" (← req "input" kvs "spec")
  let os ← orders "input.orders" (← req "input" kvs "orders")
  agreed "input.orders" (os.map fun xs => J.obj ((sp.run xs).map fun (n, v) => (n, SpecVectors.jSlot v)))

/-- What the store holds besides the batch: each id and its `about`. -/
def heldEntry (path : String) (j : Json) : Dec (String × List String) := do
  let kvs ← members? path ["id", "about"] j
  pure (← text (dot path "id") (← req path kvs "id"), ← texts (dot path "about") (← req path kvs "about"))

def batchRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["held", "drafts"] input
  let held ← each "input.held" heldEntry (← req "input" kvs "held")
  let ds ← each "input.drafts" draft (← req "input" kvs "drafts")
  pure (match resolveBatch Records.H (held.lookup ·) ds with
    | .ok ws => J.obj [("records", .arr (ws.map fun w =>
        let r := w.stored
        .obj [("id", .str (r.id Records.H)), ("env_canonical", .str r.env.toJson.canon)]))]
    | .error why => J.obj [("refused", .str why)])

def realmRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["forms"] input
  pure (RealmVectors.realmJ (← records "input.forms" (← req "input" kvs "forms")))

/-! ## Record -/

/-- `record`: one record written, or `write`'s refusal. The envelope comes in
the writer's form, perhaps several ways (sets in other orders, repeats), and
the payload as JSON, perhaps several ways (members in other orders), or as
text when it repeats a member name. Every way must name the same record, as
gen requires before writing one. -/
def recordRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["envs", "payloads", "payload_text", "salt", "seed"] input
  let envs ← each "input.envs" env (← req "input" kvs "envs")
  let payloads ← match kvs.lookup "payloads", kvs.lookup "payload_text" with
    | some ps, none => list "input.payloads" ps
    | none, some t => do
      match parseJson (← text "input.payload_text" t) with
      | .ok j => pure [j]
      | .error e => bad "input.payload_text" e
    | _, _ => bad "input" "takes one of \"payloads\" and \"payload_text\""
  let salt ← bytes "input.salt" (← req "input" kvs "salt")
  let some e := envs.head? | bad "input.envs" "no envelope given"
  let some payload := payloads.head? | bad "input.payloads" "no payload given"
  match write e salt payload with
  | .error why => pure (.obj [("refused", .str why)])
  | .ok w =>
    let r := w.stored
    let H := Records.H
    let id := r.id H
    for (e', i) in envs.zip (List.range envs.length) do
      if idOf H e' (r.commit H) != id then bad (idx "input.envs" i) "names another record than input.envs[0]"
    for (p, i) in payloads.zip (List.range payloads.length) do
      if commitOf H salt p != r.commit H then bad (idx "input.payloads" i) "commits to another payload than input.payloads[0]"
    let seed ← bytes "input.seed" (← req "input" kvs "seed")
    pure (.obj [
      ("env_canonical", .str e.toJson.canon),
      ("payload_canonical", .str payload.canon),
      ("commit", .str (r.commit H)),
      ("id_preimage", .str (idPreimage e (r.commit H))),
      ("id", .str id),
      ("signing_input", .str ("loops/record/v1:" ++ id)),
      ("key", .str (Records.keyText seed)),
      ("ed25519", .str (base32 (Ed25519.sign seed (signingInput id)))),
      ("line", .str (Records.storedJson e salt payload seed).canon),
      ("erased_line", .str (Records.erasedJson e salt payload seed).canon)])

/-! ## Scenario -/

/-- What a reader holding `forms` makes of them, for one thing: settled,
admitted, the thing's state, the slots. `ScenarioVectors.outcome` with the
thing taken from the input. -/
def scenarioOutcome (sp : Spec) (thing : String) (forms : List Record) : J :=
  let settled := settle forms
  let admitted := admit (fun _ _ => true) settled
  let st := stateIn thing admitted
  .obj [
    ("settled", ScenarioVectors.jShownIds settled),
    ("admitted", .arr (admitted.map (.str ∘ idText ∘ (·.id)))),
    ("heads", .arr (st.heads.map (.str ∘ idText ∘ (·.id)))),
    ("winner", match st.winner with
      | some r => .str (idText r.id)
      | none => .null),
    ("slots", .obj ((sp.run settled).map fun (n, v) => (n, ScenarioVectors.jSlot v)))]

/-- A form: one of the scenario's records, as a place holds it. -/
def form (pool : List Record) (path : String) (j : Json) : Dec Record := do
  let kvs ← members? path ["id", "shown"] j
  let i ← recordId (dot path "id") (← req path kvs "id")
  let some r := pool.find? (·.id == i) | bad (dot path "id") "names none of input.records"
  match ← shownOf (dot path "shown") (← req path kvs "shown") with
  | .here => pure r
  | .withheld => pure r.withhold
  | .erased => pure r.erase

/-- A step's answer, from its forms; each listed order of them must agree. -/
def step (sp : Spec) (thing : String) (pool : List Record) (path : String) (j : Json) : Dec J := do
  let kvs ← members? path ["name", "forms", "orders"] j
  let _ ← text (dot path "name") (← req path kvs "name")
  let forms ← each (dot path "forms") (form pool) (← req path kvs "forms")
  let ids := forms.map (·.id)
  if !ids.Nodup then bad (dot path "forms") "holds one id twice, so an order of ids is ambiguous"
  let os ← each (dot path "orders") (fun p o => each p (fun q j => do
      let i ← recordId q j
      let some f := forms.find? (·.id == i) | bad q "names none of this step's forms"
      pure f) o) (← req path kvs "orders")
  let want := scenarioOutcome sp thing forms
  for (o, i) in os.zip (List.range os.length) do
    if (scenarioOutcome sp thing o).render 0 != want.render 0 then
      bad (idx (dot path "orders") i) s!"gives a different answer than {dot path "forms"}; every order must hold the same forms"
  pure want

def scenarioRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["spec", "thing", "records", "steps", "lens"] input
  let sp ← specOf "input.spec" (← req "input" kvs "spec")
  let thing ← text "input.thing" (← req "input" kvs "thing")
  let pool ← records "input.records" (← req "input" kvs "records")
  if !(pool.map (·.id)).Nodup then bad "input.records" "holds one id twice"
  let steps ← each "input.steps" (step sp thing pool) (← req "input" kvs "steps")
  let lk ← members? "input.lens" ["base", "text"] (← req "input" kvs "lens")
  let base ← sections "input.lens.base" (← req "input.lens" lk "base")
  let edited ← lines "input.lens.text" (← req "input.lens" lk "text")
  let some os := edit base edited | bad "input.lens.text" "doesn't parse as keyed sections"
  pure (.obj [("steps", .arr steps),
    ("lens", .obj [("rendered", jLines (render base)), ("outcomes", .arr (os.map jOutcome)),
      ("applied", jDoc (apply base os))])])

/-! ## Dispatch -/

/-- The layers `run` reads, and the directories under a vectors dir that hold them. -/
def layerDirs : List String := ["fold", "lens", "spec", "record", "batch", "realm", "scenario"]

def answer (layer : String) (input : Json) : Dec J :=
  match foldAnswer layer with
  | some f => foldRun f input
  | none => match layer with
    | "fold/select" => selectRun input
    | "lens/section" => lensRun input
    | "spec/parse" => specParseRun input
    | "spec/run" => specRunRun input
    | "record" => recordRun input
    | "batch" => batchRun input
    | "realm" => realmRun input
    | "scenario" => scenarioRun input
    | _ => bad "layer" s!"\"{layer}\" is not a layer run reads"

/-- A vector's answer computed from its input, and the `expect` it carries, if any. -/
def readVector (textIn : String) : Dec (J × Option J) := do
  let j ← parseJson textIn
  let kvs ← object "the vector" j
  let layer ← text "layer" (← req "the vector" kvs "layer")
  let got ← answer layer (← req "the vector" kvs "input")
  pure (got, (kvs.lookup "expect").map Records.ofJson)

/-! ## The command -/

/-- Where two renders first part, as a line number and both lines. -/
def firstDifference (got want : String) : String :=
  let gs := got.splitOn "\n"
  let ws := want.splitOn "\n"
  let n := max gs.length ws.length
  match (List.range n).find? fun i => gs[i]? != ws[i]? with
  | some i =>
    s!"expect line {i + 1} differs\n    run:  {(gs[i]?.getD "(nothing)").trimAscii}\n    file: {(ws[i]?.getD "(nothing)").trimAscii}"
  | none => "expect differs"

def jsonFiles (d : System.FilePath) : IO (List System.FilePath) := do
  if !(← d.pathExists) then return []
  let fs ← System.FilePath.walkDir d
  return (fs.toList.filter (·.extension == some "json")).mergeSort (·.toString ≤ ·.toString)

def check (dir : System.FilePath) : IO UInt32 := do
  let mut files : List System.FilePath := []
  for sub in layerDirs do files := files ++ (← jsonFiles (dir / sub))
  let mut ok := 0
  let mut misses : List String := []
  for f in files do
    match readVector (← IO.FS.readFile f) with
    | .ok (got, some want) =>
      if got.render 0 == want.render 0 then ok := ok + 1
      else misses := misses ++ [s!"{f}: {firstDifference (got.render 0) (want.render 0)}"]
    | .ok (_, none) => misses := misses ++ [s!"{f}: carries no expect"]
    | .error e => misses := misses ++ [s!"{f}: {e}"]
  IO.println s!"{ok} of {files.length} vectors reproduced from their inputs"
  let entries ← if ← dir.pathExists then dir.readDir else pure #[]
  let others := (entries.toList.map (·.fileName)).filter fun n =>
    !layerDirs.contains n && !n.endsWith ".md"
  unless others.isEmpty do
    IO.println s!"not run: {", ".intercalate (others.mergeSort (· ≤ ·))}"
  for m in misses do IO.println s!"mismatch: {m}"
  if files.isEmpty then
    IO.println s!"no vectors under {dir}"
    return 1
  return if misses.isEmpty then 0 else 1

def main (args : List String) : IO UInt32 := do
  match args with
  | ["--check", dir] => check dir
  | [file] =>
    match readVector (← IO.FS.readFile file) with
    | .ok (got, _) => IO.println (got.render 0); return 0
    | .error e => IO.eprintln s!"{file}: {e}"; return 1
  | _ =>
    IO.eprintln "usage: lake exe run <vector.json>\n       lake exe run --check <vectors dir>"
    return 2
