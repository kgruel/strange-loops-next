import Gen.Scenario
import Gen.Realm
import Gen.Records

/-! Horizon cases compose existing records, admission, specs, and keyed edits.
The assertions below pin each partial claim independently of its rendered expect. -/
namespace Gen.HorizonVectors

open Loops Loops.Lens
open Gen.ScenarioVectors (rotations jShownIds jSlot)

private def o := Json.obj
private def s := Json.str
private def a := Json.arr
private def yes := Json.bool true
private def countSlot : Json := o [("count", yes)]
private def currentSlot : Json := o [("latest-by", s "about"), ("follow", s "prev")]
private def logSlot : Json := o [("collect", yes)]
private def headsSlot : Json := o [("collect", yes), ("follow", s "prev")]
private def sumSlot : Json := o [("sum", s "n")]
private def filtered (slot : Json) (tests : List (String × Json)) : Json :=
  match slot with
  | .obj kvs => o (kvs ++ [("where", o tests)])
  | _ => slot
private def test (op : String) (v : Json) : Json := o [(op, v)]
private def spec (slots : List (String × Json) := [("count", countSlot), ("current", currentSlot)])
    (sources : List Json := [o [("store", s ".")]]) : Json :=
  o [("vertex", s "horizon"), ("from", a sources), ("fold", o slots)]

private def r (id : Nat) (thing : String) (t : Nat) (value : String := "")
    (prev : List Nat := []) (ok : Reads t := by decide) : Record :=
  { Gen.RealmVectors.r id "note" [thing] t prev ok with value }
private def ids (ns : List Nat) : J := .arr (ns.map (.str ∘ idText))
private def number (n : Int) (unread : Nat := 0) : J :=
  .obj [("value", .int n), ("unread", .num unread)]
private def collected (rs : List (Nat × Shown)) (unread : Nat := 0) : J :=
  .obj [("heads", .arr (rs.map fun (i, sh) => .obj [("id", .str (idText i)), ("shown", jShown sh)])),
    ("unread", .num unread)]
private def things (ts : List (String × List (Nat × Shown))) (unread : Nat := 0) : J :=
  .obj [("things", .obj (ts.map fun (t, rs) => (t, .arr (rs.map fun (i, sh) =>
    .obj [("id", .str (idText i)), ("shown", jShown sh)])))), ("unread", .num unread)]

private structure Step where
  name : String
  forms : List Record
  heads : List Nat
  slots : List (String × J) := []
  refused : List (Nat × String) := []
  settled : Option (List (Nat × Shown)) := none

private structure Case where
  name : String
  description : String
  thing : String
  pool : List Record
  steps : List Step
  sp : Json := spec
  laws : List String := ["settle.set", "spec.set", "latest-by.set"]
  pairs : Option (List (Nat × Nat)) := none
  lens : Option (List Section × List Line) := none

private def jl (ls : List Line) : J := .arr (ls.map (.str ∘ String.ofList))
private def jd (d : List Section) : J := .arr (d.map fun sec =>
  .obj [("id", .str (String.ofList sec.id)), ("body", jl sec.body)])
private def jo : Outcome → J
  | .accepted i b => .obj [("accepted", .str (String.ofList i)), ("body", jl b)]
  | .unknown i => .obj [("unknown", .str (String.ofList i))]
  | .absent i => .obj [("absent", .str (String.ofList i))]
private def asSection (thing : String) (record : Record) : Section :=
  ⟨thing.toList, (record.value.splitOn "\n").map String.toList⟩
private def keyedEdit (thing : String) (before after : Record) : List Section × List Line :=
  ([asSection thing before], render [asSection thing after])

private def build (c : Case) : Except String (String × J) := do
  let sp ← (Spec.ofJson c.sp).mapError fun e => s!"{c.name}: {e.code} at {e.path}"
  let may (r q : Record) := c.pairs.all (·.contains (r.id, q.id))
  if !(c.pool.map (·.id)).Nodup then throw s!"{c.name}: duplicate pool id"
  for (i, p) in c.pairs.getD [] do
    if !c.pool.any (·.id == i) || !c.pool.any (·.id == p) then
      throw s!"{c.name}: rule names an unknown id"
  let result (forms : List Record) : J :=
    let settled := settle forms
    let admitted := admit may settled
    let st := stateIn c.thing admitted
    .obj ([("settled", jShownIds settled), ("admitted", ids (admitted.map (·.id))),
      ("heads", ids (st.heads.map (·.id))),
      ("winner", st.winner.map (fun r => J.str (idText r.id)) |>.getD .null),
      ("slots", .obj ((sp.run settled may).map fun (n, v) => (n, jSlot v)))] ++
      if c.pairs.isSome then [("refused", .arr (settled.filterMap fun r =>
        (refusalOf may settled r).map fun code => .obj [("id", .str (idText r.id)), ("code", .str code)]))]
      else [])
  let mut outs := []
  for st in c.steps do
    if !(st.forms.map (·.id)).Nodup then throw s!"{c.name}/{st.name}: ambiguous forms"
    for form in st.forms do
      let some full := c.pool.find? (·.id == form.id) | throw s!"{c.name}: unknown form"
      if form != full && form != full.withhold && form != full.erase then
        throw s!"{c.name}: form changes its record"
    let expected := result st.forms
    for order in rotations st.forms do
      let settled := settle order
      let admitted := admit may settled
      if (stateIn c.thing admitted).heads.map (·.id) != st.heads then
        throw s!"{c.name}/{st.name}: wrong known heads"
      let refusals := settled.filterMap fun r => (refusalOf may settled r).map (r.id, ·)
      if refusals != st.refused then throw s!"{c.name}/{st.name}: wrong known refusals"
      if let some known := st.settled then
        if settled.map (fun r => (r.id, r.shown)) != known then
          throw s!"{c.name}/{st.name}: wrong known settled forms"
      let slots := (sp.run settled may).map fun (n, v) => (n, jSlot v)
      for (name, want) in st.slots do
        let some got := slots.lookup name | throw s!"{c.name}: missing asserted slot {name}"
        if got.render 0 != want.render 0 then
          throw s!"{c.name}/{st.name}/{name}: {got.render 0}, expected {want.render 0}"
      if (result order).render 0 != expected.render 0 then
        throw s!"{c.name}/{st.name}: arrival orders disagree"
    outs := outs ++ [expected]
  let mut input := [("spec", Records.ofJson c.sp), ("thing", .str c.thing),
    ("records", .arr (c.pool.map jRecord)),
    ("steps", .arr (c.steps.map fun st => .obj [("name", .str st.name),
      ("forms", jShownIds st.forms), ("orders", .arr ((rotations st.forms).map fun rs => ids (rs.map (·.id))))]))]
  if let some pairs := c.pairs then
    input := input ++ [("mayReplace", .arr (pairs.map fun (i, p) => .arr [.str (idText i), .str (idText p)]))]
  let mut expected := [("steps", .arr outs)]
  if let some (base, text) := c.lens then
    let some os := edit base text | throw s!"{c.name}: edit does not parse"
    let [before, after] := c.steps.reverse.take 2 |>.reverse
      | throw s!"{c.name}: lens needs two final steps"
    let winner (st : Step) := (stateIn c.thing (realm may st.forms)).winner
    let some b := winner before | throw s!"{c.name}: no base winner"
    let some e := winner after | throw s!"{c.name}: no next winner"
    if base != [asSection c.thing b] || apply base os != [asSection c.thing e] then
      throw s!"{c.name}: lens is not the last-two-winners edit"
    if os != [.accepted c.thing.toList (asSection c.thing e).body] then
      throw s!"{c.name}: expected one accepted edit"
    input := input ++ [("lens", .obj [("base", jd base), ("text", jl text)])]
    expected := expected ++ [("lens", .obj [("rendered", jl (render base)),
      ("outcomes", .arr (os.map jo)), ("applied", jd (apply base os))])]
  return (c.name, .obj [("vector", .str c.name), ("layer", .str "scenario"),
    ("description", .str c.description), ("laws", .arr (c.laws.map .str)),
    ("source", .str "model"), ("input", .obj input), ("expect", .obj expected)])

private def editable : Case := Id.run do
  let key := "decision:storage"
  let b := r 0x201 key 100 "Use files."
  let e := r 0x202 key 200 "Use immutable files.\nKeep every revision." [b.id]
  return {
    name := "02-editable-lenses", thing := key, pool := [b, e],
    description := "Editable lenses: a supplied keyed edit becomes the next head. The case checks neither file writes nor base binding.",
    steps := [⟨"base-head", [b], [b.id], [("count", number 1)], [], none⟩,
      ⟨"edit-as-record", [b, e], [e.id], [("count", number 2)], [], none⟩],
    laws := ["spec.set", "latest-by.set", "lens.put-get"], lens := some (keyedEdit key b e) }

private def lsp : Case := Id.run do
  let key := "code:birth-commit-path-range"
  let b := { r 0x301 key 100 "ADR: use a lock." with kind := "adr" }
  let e := { r 0x302 key 200 "ADR: use a transaction." [b.id] with kind := "adr" }
  let f := { r 0x303 key 190 "ADR: keep the lock." [b.id] with kind := "adr", observer := "sl:reviewer" }
  return {
    name := "03-lsp-context", thing := key, pool := [b, e, f],
    description := "The LSP and code blame: revisions and forks share a supplied code birth key. The case checks neither Git discovery nor hover rendering.",
    steps := [⟨"attach-adr", [b], [b.id], [("count", number 1)], [], none⟩,
      ⟨"revise-adr", [b, e], [e.id], [("count", number 2)], [], none⟩,
      ⟨"fork-adr", [b, e, f], [e.id, f.id], [("current", things [(key, [(e.id, .here), (f.id, .here)])])], [], none⟩] }

private def web : Case := Id.run do
  let key := "url:https://example.test/article"
  let b := { r 0x401 key 100 "Annotation: check the source." with kind := "annotation" }
  let t := { r 0x402 key 200 "Discord thread: the source agrees." with kind := "discord-thread", observer := "sl:discord" }
  let bad := r 0x403 "url:https://example.test/other" 300 "Unrelated revision." [b.id]
  return {
    name := "04-web-annotation", thing := key, pool := [b, t, bad],
    description := "Web annotation: an annotation and a Discord thread share a supplied URL key; admission refuses an unrelated prev, without URL normalization.",
    steps := [⟨"annotation", [b], [b.id], [("count", number 1)], [], none⟩,
      ⟨"thread-and-unrelated-prev", [b, t, bad], [t.id, b.id], [("count", number 2)], [(bad.id, "prev-unrelated")], none⟩],
    laws := ["admit.no-cross", "admit.set", "thing.local", "spec.set"] }

private def context : Case := Id.run do
  let key := "context:session"
  let b := r 0x501 key 100 "Earlier context."
  let e := { r 0x502 key 200 "Current context." [b.id] with erases := [b.id], n := 4 }
  return {
    name := "05-context-forms", thing := key, pool := [b, e],
    description := "Context by tick, email bundles, and context between agents: held and withheld heads supersede erased history. The case checks no tick or bundle.",
    sp := spec [("count", countSlot), ("total", sumSlot), ("current", currentSlot)],
    steps := [⟨"held-context", [b, e], [e.id], [("count", number 2), ("total", number 4 1)], [],
        some [(b.id, .erased), (e.id, .here)]⟩,
      ⟨"withheld-context", [b, e.withhold], [e.id], [("count", number 2), ("total", number 0 2)], [],
        some [(b.id, .erased), (e.id, .withheld)]⟩],
    laws := ["settle.erased", "view.no-resurrection", "spec.select", "result.unread"] }

private def disclosure : Case := Id.run do
  let key := "claim:disclosure"
  let b := r 0x601 key 100 "yes"
  let e := r 0x602 key 200 "no" [b.id]
  let f := r 0x603 key 210 "yes" [b.id]
  return {
    name := "06-selective-disclosure", thing := key, pool := [b, e, f],
    description := "Selective disclosure: two reader forms keep the same heads; hidden yes and no payload tests become unread, without a disclosure policy.",
    sp := spec [("yes", filtered countSlot [("value", test "is" (s "yes"))]),
      ("no", filtered countSlot [("value", test "is" (s "no"))]), ("current", currentSlot)],
    steps := [⟨"full-reader", [b, e, f], [f.id, e.id], [("yes", number 2), ("no", number 1)], [], none⟩,
      ⟨"restricted-reader", [b, e.withhold, f.withhold], [f.id, e.id], [("yes", number 1 2), ("no", number 0 2),
        ("current", things [(key, [(f.id, .withheld), (e.id, .withheld)])])], [], none⟩],
    laws := ["view.no-resurrection", "view.refines", "spec.select", "select.set"] }

private def knowledge : Case := Id.run do
  let key := "build:knowledge"
  let b := { r 0x701 key 100 "Input." with n := 3 }
  let e := { r 0x702 key 200 "Second input." with n := 8 }
  let noise := { r 0x703 "build:unrelated" 300 "Not selected." with kind := "noise", n := 100 }
  let relevant := { r 0x704 key 400 "Relevant additional input." with n := 5 }
  return {
    name := "07-knowledge-build", thing := key, pool := [b, e, noise, relevant],
    description := "Knowledge as a build: equal inputs and an irrelevant addition keep slots unchanged. A relevant addition changes slots. The case checks no hash or cache.",
    sp := spec [("count", countSlot), ("total", sumSlot)] [o [("store", s "."), ("kind", a [s "note"])]],
    steps := [⟨"first-run", [b, e], [e.id, b.id], [("count", number 2), ("total", number 11)], [], none⟩,
      ⟨"same-input-again", [e, b], [e.id, b.id], [("count", number 2), ("total", number 11)], [], none⟩,
      ⟨"irrelevant-addition", [b, e, noise], [e.id, b.id], [("count", number 2), ("total", number 11)], [], none⟩,
      ⟨"relevant-addition", [b, e, noise, relevant], [relevant.id, e.id, b.id],
        [("count", number 3), ("total", number 16)], [], none⟩],
    laws := ["realm.spec-set", "spec.set", "sum.perm", "settle.set"] }

private def bitemporal : Case := Id.run do
  let key := "claim:historical"
  let b := { r 0x801 key 100 "Known early, occurred early." with occurred := some (claimAt 10) }
  let e := { r 0x802 key 300 "Known later, corrects the old event." [b.id] with occurred := some (claimAt 20) }
  let late := { r 0x803 key 400 "Known late, occurred early." with occurred := some (claimAt 5) }
  let future := { r 0x804 key 150 "Known early, occurred later." with occurred := some (claimAt 500) }
  let tests := [("env.emitted", test "below" (s (timeText 200))),
    ("env.occurred", test "below" (s (timeText 50)))]
  return {
    name := "08-bitemporal-questions", thing := key, pool := [b, e, late, future],
    description := "Bitemporal and belief-time questions: emitted and occurred tests select historical records without follow. Filtering current heads does not reconstruct as-of heads or store-held time.",
    sp := spec [("historical", filtered logSlot tests), ("head-filter", filtered headsSlot tests),
      ("early-emitted", filtered countSlot [("env.emitted", test "below" (s (timeText 200)))]),
      ("early-occurred", filtered countSlot [("env.occurred", test "below" (s (timeText 50)))])],
    steps := [⟨"before-correction", [b, late, future], [future.id, b.id, late.id],
      [("historical", collected [(b.id, .here)]), ("head-filter", collected [(b.id, .here)]),
       ("early-emitted", number 2), ("early-occurred", number 2)], [], none⟩,
      ⟨"after-correction", [b, e, late, future], [future.id, e.id, late.id],
      [("historical", collected [(b.id, .here)]), ("head-filter", collected []),
       ("early-emitted", number 2), ("early-occurred", number 3)], [], none⟩],
    laws := ["where.time", "spec.after-supersession", "spec.set"] }

private def fuzzy : Case := Id.run do
  let key := "history:dates"
  let year := { r 0x901 key 400 "Year." with occurred := some (claim "2026") }
  let month := { r 0x902 key 300 "Month." with occurred := some (claim "2026-10") }
  let instant := { r 0x903 key 200 "Instant, offset spelling." with occurred := some (claim "2026-10-01T01:00:00+01:00") }
  let ongoing := { r 0x904 key 100 "Open interval." with occurred := some (claim "2026-10-01/..") }
  return {
    name := "09-fuzzy-dates", thing := key, pool := [year, month, instant, ongoing],
    description := "Fuzzy historical dates: coarse and open occurred spans determine content order by meaning; the case infers no dates from prose.",
    sp := spec [("ordered", logSlot)],
    steps := [⟨"coarse-and-open-spans", [year, month, instant, ongoing],
      [ongoing.id, month.id, instant.id, year.id], [("ordered", collected
        [(ongoing.id, .here), (month.id, .here), (instant.id, .here), (year.id, .here)])], [], none⟩],
    laws := ["latest-by.order", "spec.set"] }

private def crossStore : Case := Id.run do
  let key := "thing:shared"
  let x := r 0xa01 key 100 "Record supplied from store A."
  let y := { r 0xa02 key 200 "Record supplied from store B." with about := [key, "thing:other"] }
  let z := r 0xa03 key 300 "Revise shared membership only." [y.id]
  let outside := r 0xa04 "thing:outside" 400 "Not selected."
  return {
    name := "10-cross-store-query", thing := key, pool := [x, y, z, outside],
    description := "Knowledge across stores: a supplied union shares about keys and preserves a multi-thing head. Static hosting reuses this read step. Source labels neither fetch records nor partition their origin.",
    sp := spec [("count", countSlot), ("current", currentSlot)]
      [o [("store", s "store-A"), ("about", s key)], o [("store", s "store-B"), ("about", s key)]],
    steps := [⟨"supplied-union", [x, y, outside], [y.id, x.id], [("count", number 2),
      ("current", things [("thing:other", [(y.id, .here)]), (key, [(y.id, .here), (x.id, .here)])])], [], none⟩,
      ⟨"partial-membership-revision", [x, y, z, outside], [z.id, x.id], [("count", number 3),
      ("current", things [("thing:other", [(y.id, .here)]), (key, [(z.id, .here), (x.id, .here)])])], [], none⟩],
    laws := ["thing.local", "spec.from-thing", "spec.after-supersession", "heads.whole-view"] }

private def transfer : Case := Id.run do
  let key := "object:traveling-tool"
  let x := { r 0xb01 key 100 "Owner claim: Ada." with fields := [("owner", .str "person:ada")] }
  let y := { r 0xb02 key 200 "Owner claim: Bo." [x.id] with fields := [("owner", .str "person:bo")] }
  return {
    name := "11-store-transfer", thing := key, pool := [x, y],
    description := "Stores that travel: a stable thing key retains owner-claim history across a revision; the case checks no authority or key transfer.",
    sp := spec [("history", logSlot), ("current", currentSlot)],
    steps := [⟨"first-owner-claim", [x], [x.id], [("history", collected [(x.id, .here)])], [], none⟩,
      ⟨"revised-owner-claim", [x, y], [y.id], [("history", collected [(y.id, .here), (x.id, .here)]),
        ("current", things [(key, [(y.id, .here)])])], [], none⟩] }

private def sync : Case := Id.run do
  let key := "sync:notes"
  let x := r 0xc01 key 100 "Shared base."
  let y := r 0xc02 key 200 "From supplied set A." [x.id]
  let z := r 0xc03 key 190 "From supplied set B." [x.id]
  return {
    name := "12-file-sync", thing := key, pool := [x, y, z],
    description := "File sync: combined supplied record sets converge across arrival orders; the case checks no filesystem, transport, or repeated delivery.",
    steps := [⟨"set-A", [x, y], [y.id], [("count", number 2)], [], none⟩,
      ⟨"set-B", [x, z], [z.id], [("count", number 2)], [], none⟩,
      ⟨"combined-A-then-B", [x, y, z], [y.id, z.id], [("count", number 3)], [], none⟩,
      ⟨"combined-B-then-A", [z, x, y], [y.id, z.id], [("count", number 3)], [], none⟩],
    laws := ["realm.spec-set", "settle.set", "latest-by.converge", "spec.set"] }

private def disputes : Case := Id.run do
  let key := "event:delivery"
  let x := { r 0xd01 key 100 "Claim: ten units." with kind := "event", n := 10 }
  let y := { r 0xd02 key 200 "Correction: eight units." [x.id] with kind := "event", n := 8 }
  let z := { r 0xd03 key 210 "Dispute: six units." [x.id] with kind := "event", n := 6, observer := "sl:disputer" }
  return {
    name := "13-dispute-log", thing := key, pool := [x, y, z],
    description := "Logs for disputes: numeric event claims retain corrections and disputed heads. The sum includes history and does not prove the event occurs.",
    sp := spec [("total", sumSlot), ("history", logSlot), ("current", currentSlot)],
    steps := [⟨"initial-claim", [x], [x.id], [("total", number 10)], [], none⟩,
      ⟨"corrected-claim", [x, y], [y.id], [("total", number 18)], [], none⟩,
      ⟨"disputed-correction", [x, y, z], [z.id, y.id], [("total", number 24),
        ("history", collected [(z.id, .here), (y.id, .here), (x.id, .here)]),
        ("current", things [(key, [(z.id, .here), (y.id, .here)])])], [], none⟩],
    laws := ["sum.perm", "latest-by.set", "spec.after-supersession"] }

private def review : Case := Id.run do
  let key := "review:decision"
  let x := r 0xe01 key 100 "Old decision."
  let y := { r 0xe02 key 300 "Reviewed decision." [x.id] with kind := "review" }
  let old := [("env.emitted", test "below" (s (timeText 200)))]
  let recent := [("env.emitted", test "at-least" (s (timeText 200)))]
  return {
    name := "14-stale-review", thing := key, pool := [x, y],
    description := "Spaced review: explicit emitted thresholds select old or recent heads before and after a review; the case checks no scheduler or live clock.",
    sp := spec [("stale", filtered headsSlot old), ("reviewed", filtered headsSlot recent),
      ("old-history", filtered logSlot old)],
    steps := [⟨"before-review", [x], [x.id], [("stale", collected [(x.id, .here)]),
        ("reviewed", collected []), ("old-history", collected [(x.id, .here)])], [], none⟩,
      ⟨"after-review", [x, y], [y.id], [("stale", collected []), ("reviewed", collected [(y.id, .here)]),
        ("old-history", collected [(x.id, .here)])], [], none⟩],
    laws := ["where.time", "where.complements", "spec.after-supersession"] }

private def contradictions : Case := Id.run do
  let key := "claim:contradiction"
  let x := r 0xf01 key 100 "Initial claim."
  let y := r 0xf02 key 200 "Allowed fork A." [x.id]
  let z := r 0xf03 key 210 "Allowed fork B." [x.id]
  let denied := r 0xf04 key 300 "Denied resolution." [y.id, z.id]
  let unrelated := r 0xf05 "claim:unrelated" 400 "Unrelated successor." [x.id]
  let allowed := r 0xf06 key 310 "Allowed successor of fork A." [y.id]
  return {
    name := "15-contradiction-queue", thing := key, pool := [x, y, z, denied, unrelated, allowed],
    description := "Contradiction queue: fork heads and an id-only mayReplace rule admit allowed successors and refuse denied or unrelated prev. Withholding preserves decisions. The case checks no grants.",
    pairs := some [(y.id, x.id), (z.id, x.id), (unrelated.id, x.id), (allowed.id, y.id)],
    steps := [⟨"admitted-forks", [x, y, z], [z.id, y.id], [("count", number 3)], [], none⟩,
      ⟨"rule-decisions", [x, y, z, denied, unrelated, allowed], [allowed.id, z.id], [("count", number 4),
        ("current", things [(key, [(allowed.id, .here), (z.id, .here)])])],
        [(denied.id, "prev-not-permitted"), (unrelated.id, "prev-unrelated")], none⟩,
      ⟨"withheld-rule-decisions", [x, y, z.withhold, denied.withhold, unrelated, allowed.withhold], [allowed.id, z.id],
        [("count", number 4), ("current", things [(key, [(allowed.id, .withheld), (z.id, .withheld)])])],
        [(denied.id, "prev-not-permitted"), (unrelated.id, "prev-unrelated")], none⟩],
    laws := ["admit.set", "admit.no-cross", "realm.spec-set", "view.no-resurrection", "spec.after-supersession"] }

private def tools : Case := Id.run do
  let key := "agent:task"
  let x := { r 0x1001 key 100 "Investigate." with fields := [("status", .str "open")] }
  let y := { r 0x1002 key 200 "Done." [x.id] with fields := [("status", .str "closed")] }
  return {
    name := "16-agent-tools", thing := key, pool := [x, y],
    description := "Agent tools: successive supplied emit sets change a query from open to closed; the case checks no MCP transport, session, or tool protocol.",
    sp := spec [("open", filtered headsSlot [("status", test "is" (s "open"))]),
      ("closed", filtered headsSlot [("status", test "is" (s "closed"))]), ("count", countSlot)],
    steps := [⟨"emit-open-and-query", [x], [x.id], [("open", collected [(x.id, .here)]),
        ("closed", collected []), ("count", number 1)], [], none⟩,
      ⟨"emit-closed-and-query", [x, y], [y.id], [("open", collected []),
        ("closed", collected [(y.id, .here)]), ("count", number 2)], [], none⟩],
    laws := ["spec.after-supersession", "spec.set"] }

private def agentLens : Case := Id.run do
  let key := "agent:instructions"
  let x := r 0x1101 key 100 "Run focused checks."
  let y := r 0x1102 key 200 "Run all checks." [x.id]
  let z := r 0x1103 key 190 "Run only unit checks." [x.id]
  let e := r 0x1104 key 300 "Run all checks.\nReport the remaining dispute." [y.id]
  return {
    name := "17-agent-lens", thing := key, pool := [x, y, z, e],
    description := "CLAUDE.md as lens output: spec results retain forks while a supplied keyed document edits the winner into its next head. The case checks no full renderer.",
    steps := [⟨"fork-visible", [x, y, z], [y.id, z.id], [("current", things [(key, [(y.id, .here), (z.id, .here)])])], [], none⟩,
      ⟨"keyed-edit-as-next-head", [x, y, z, e], [e.id, z.id],
        [("current", things [(key, [(e.id, .here), (z.id, .here)])]), ("count", number 4)], [], none⟩],
    lens := some (keyedEdit key y e),
    laws := ["spec.after-supersession", "latest-by.set", "lens.put-get"] }

private def collectors : Case := Id.run do
  let key := "metric:requests"
  let x := { r 0x1201 key 100 "Collector A." with observer := "sl:collector-a", n := 3 }
  let y := { r 0x1202 key 200 "Collector B." with observer := "sl:collector-b", n := 5 }
  return {
    name := "18-collectors", thing := key, pool := [x, y],
    description := "Collectors in any language: distinct supplied observers share a target and fold deterministically; the case checks no stdin framing, importer, or retry handling.",
    sp := spec [("count", countSlot), ("total", sumSlot), ("current", currentSlot)],
    steps := [⟨"collector-A", [x], [x.id], [("count", number 1), ("total", number 3)], [], none⟩,
      ⟨"both-collectors", [x, y], [y.id, x.id], [("count", number 2), ("total", number 8)], [], none⟩,
      ⟨"reverse-collector-order", [y, x], [y.id, x.id], [("count", number 2), ("total", number 8)], [], none⟩],
    laws := ["sum.perm", "count.perm", "settle.set", "spec.set"] }

private def erasure : Case := Id.run do
  let key := "claim:erasable"
  let x := { r 0x1301 key 100 "Sensitive claim." with n := 9 }
  let e := { r 0x1302 key 200 "Redacted successor." [x.id] with erases := [x.id], n := 2 }
  let denied := { r 0x1303 key 300 "Denied successor that still erases." [x.id] with erases := [x.id] }
  return {
    name := "19-erasure", thing := key, pool := [x, e, denied],
    description := "Erasure: a held eraser erases here, withheld, and falsely erased targets, even if admission refuses the eraser. Later full targets cannot restore erased payloads.",
    pairs := some [(e.id, x.id)],
    sp := spec [("total", sumSlot), ("count", countSlot), ("current", currentSlot)],
    steps := [⟨"target-here", [x], [x.id], [("total", number 9)], [], some [(x.id, .here)]⟩,
      ⟨"target-withheld", [x.withhold], [x.id], [("total", number 0 1)], [], some [(x.id, .withheld)]⟩,
      ⟨"false-erasure-without-eraser", [x.erase], [x.id], [("total", number 0 1)], [], some [(x.id, .withheld)]⟩,
      ⟨"eraser-over-here-target", [x, e], [e.id], [("total", number 2 1), ("count", number 2)], [],
        some [(x.id, .erased), (e.id, .here)]⟩,
      ⟨"eraser-over-withheld-target", [x.withhold, e], [e.id], [("total", number 2 1)], [],
        some [(x.id, .erased), (e.id, .here)]⟩,
      ⟨"eraser-over-false-erasure", [x.erase, e], [e.id], [("total", number 2 1)], [],
        some [(x.id, .erased), (e.id, .here)]⟩,
      ⟨"later-full-target", [e, x], [e.id], [("total", number 2 1)], [],
        some [(x.id, .erased), (e.id, .here)]⟩,
      ⟨"refused-held-eraser", [x.withhold, denied], [x.id], [("total", number 0 1), ("count", number 1)],
        [(denied.id, "prev-not-permitted")], some [(x.id, .erased), (denied.id, .here)]⟩,
      ⟨"refused-eraser-later-full-target", [denied, x], [x.id], [("total", number 0 1), ("count", number 1)],
        [(denied.id, "prev-not-permitted")], some [(x.id, .erased), (denied.id, .here)]⟩],
    laws := ["settle.erased", "realm.erased", "realm.spec-set", "settle.keeps", "view.no-resurrection", "settle.set"] }

def vectors : Except String (List (String × J)) :=
  [editable, lsp, web, context, disclosure, knowledge, bitemporal, fuzzy, crossStore,
    transfer, sync, disputes, review, contradictions, tools, agentLens, collectors, erasure].mapM build

end Gen.HorizonVectors
