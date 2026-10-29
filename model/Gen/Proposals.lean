import Gen.Spec
import Gen.Read
import Proposals.AsOf
import Proposals.Tick

/-!
# Proposal vectors

These cases do not change adopted semantics. Compute each answer from the proposal model.
-/

namespace Gen.ProposalVectors

open Loops Gen.Read

structure Query where
  name : String
  emittedThrough : Option Stamp := none
  occurredThrough : Option Stamp := none

def Query.cuts (q : Query) : Proposals.AsOf.Cuts :=
  { emittedThrough := q.emittedThrough.map (·.moment)
    occurredThrough := q.occurredThrough.map (·.moment) }

def jCut (cut : Option Stamp) : J :=
  match cut with
  | none => .null
  | some st => .str st.text

def jQuery (q : Query) : J :=
  .obj [("name", .str q.name), ("emittedThrough", jCut q.emittedThrough),
    ("occurredThrough", jCut q.occurredThrough)]

/-- Keep the selected forms. Do not settle them a second time. -/
def queryAnswer (sp : Spec) (forms : List Record) (q : Query) : J :=
  let selected := Proposals.AsOf.input q.cuts forms
  .obj [("name", .str q.name),
    ("selected", .arr (selected.map fun r =>
      .obj [("id", .str (idText r.id)), ("shown", jShown r.shown)])),
    ("result", .obj ((Proposals.AsOf.run q.cuts sp forms).map fun (n, v) =>
      (n, SpecVectors.jSlot v)))]

def asOfAnswer (sp : Spec) (queries : List Query) (forms : List Record) : J :=
  .obj [("queries", .arr (queries.map (queryAnswer sp forms)))]

/-- Each input order must give the same answer. -/
def agree (path : String) (answers : List J) : Dec J := do
  let some first := answers.head? | bad path "no arrival order given"
  for (a, i) in answers.zip (List.range answers.length) do
    if a.render 0 != first.render 0 then
      bad (idx path i) "gives a different answer than the first order"
  pure first

def cutOf (path : String) (j : Json) : Dec (Option Stamp) :=
  match j with
  | .null => pure none
  | _ => some <$> stampOf path j

def queryOf (path : String) (j : Json) : Dec Query := do
  let kvs ← members? path ["name", "emittedThrough", "occurredThrough"] j
  let name ← text (dot path "name") (← req path kvs "name")
  let emittedThrough ← cutOf (dot path "emittedThrough") (← req path kvs "emittedThrough")
  let occurredThrough ← cutOf (dot path "occurredThrough") (← req path kvs "occurredThrough")
  pure { name, emittedThrough, occurredThrough }

def specOf (path : String) (j : Json) : Dec Spec :=
  match Spec.ofJson j with
  | .ok sp => pure sp
  | .error r => bad path s!"the spec is refused ({r.code} at \"{r.path}\")"

/-- Replay input only. The carried expectation is not an input. -/
def asOfRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["spec", "orders", "queries"] input
  let sp ← specOf "input.spec" (← req "input" kvs "spec")
  let os ← each "input.orders" records (← req "input" kvs "orders")
  let qs ← each "input.queries" queryOf (← req "input" kvs "queries")
  if qs.isEmpty then bad "input.queries" "no query given"
  if !(qs.map (·.name)).Nodup then bad "input.queries" "query names must be unique"
  agree "input.orders" (os.map (asOfAnswer sp qs))

structure AsOfCase where
  name : String
  orders : List (List Record)
  queries : List Query

/-- Use current heads, collections, counts, and sums. -/
def asOfSpec : Json := SpecVectors.taskSpec

def asOfVector (c : AsOfCase) : Except String J := do
  let sp ← specOf "input.spec" asOfSpec
  if c.queries.isEmpty || !(c.queries.map (·.name)).Nodup then
    throw s!"proposals/as-of/{c.name}: queries must be nonempty with unique names"
  let expect ← agree c.name (c.orders.map (asOfAnswer sp c.queries))
  pure (vector c.name "proposals/as-of" ["proposal.as-of"]
    (.obj [("spec", Records.ofJson asOfSpec),
      ("orders", .arr (c.orders.map fun xs => .arr (xs.map jRecord))),
      ("queries", .arr (c.queries.map jQuery))]) expect)

def recordAt (id : Nat) (thing : String) (emitted : Stamp)
    (occurred : Option Claim := none) (prev : List Nat := []) (n : Int := 1) : Record :=
  { id, kind := "task", observer := "sl:kyle", about := [thing], value := "claim",
    emitted, occurred, prev, n, fields := [("status", .str "open"), ("est", .int n)] }

/-- Include reversals, rotations, and a repeated form. -/
def formOrders (xs : List Record) : List (List Record) :=
  [xs, xs.reverse, xs ++ xs.take 1] ++ SpecVectors.rotations xs

def allQuery : Query := ⟨"no-cutoff", none, none⟩
def cut2019 := stamp "2019-12-31T23:59:59Z"
def cut2009 := stamp "2009-12-31T23:59:59Z"
def startOct := stamp "2026-10-01T00:00:00Z"
def beforeOct := stamp "2026-09-30T23:59:59.999Z"
def after100 := stamp "2026-10-01T00:01:40Z"

def beliefQueries : List Query := [allQuery,
  ⟨"belief-2019", some cut2019, none⟩,
  ⟨"occurrence-2009", none, some cut2009⟩,
  ⟨"belief-2019-about-through-2009", some cut2019, some cut2009⟩,
  ⟨"before-claim", some (stamp "2017-12-31T23:59:59Z"), some cut2009⟩]

def earlyClaim := recordAt 0x101 "event:2009" (stamp "2018-06-01T00:00:00Z")
  (some (claim "2009-06-01")) (n := 5)
def correction := recordAt 0x102 "event:2009" (stamp "2021-06-01T00:00:00Z")
  (some (claim "2009-06-01")) [0x101] 2
def laterEvent := recordAt 0x103 "event:2015" (stamp "2018-07-01T00:00:00Z")
  (some (claim "2015")) (n := 9)

def spanForms : List Record := [
  recordAt 0x111 "span:instant" (stampAt 300) (some (claim "2026-10-01T00:00:00Z")),
  recordAt 0x112 "span:day" (stampAt 300) (some (claim "2026-10-01")),
  recordAt 0x113 "span:month" (stampAt 300) (some (claim "2026-10")),
  recordAt 0x114 "span:open" (stampAt 300) (some (claim "2026-10-01/..")),
  recordAt 0x115 "span:year" (stampAt 300) (some (claim "2026")),
  recordAt 0x116 "span:range" (stampAt 300) (some (claim "2026-10-01/2026-10-31")),
  recordAt 0x117 "span:qualified" (stampAt 300) (some (claim "2026-10~"))]

def fallbackForms : List Record := [
  recordAt 0x121 "event:fallback" after100,
  recordAt 0x122 "event:offset" (stamp "2026-10-01T01:01:40+01:00")
    (some (claim "2026-10-01T00:01:40.000Z")),
  recordAt 0x123 "event:later" (stampAt 101)]

def erasedClaim := recordAt 0x131 "event:erased" (stampAt 50) (n := 7)
def outsideEraser : Record :=
  { recordAt 0x132 "event:eraser" (stampAt 200) with erases := [0x131] }
def hiddenHead := recordAt 0x142 "event:hidden" (stampAt 200) (prev := [0x141])
def shownAncestor := recordAt 0x141 "event:hidden" (stampAt 50) (n := 4)
def negative := recordAt 0x152 "event:negative" (stampAt 200) (n := -10)
def positive := recordAt 0x151 "event:positive" (stampAt 50) (n := 5)
def missing := recordAt 0x161 "event:missing" (stampAt 50) (prev := [0x199])
def lateParent := recordAt 0x199 "event:missing" (stampAt 200)
def cycleA := recordAt 0x171 "event:cycle" (stampAt 50) (prev := [0x172])
def cycleB := recordAt 0x172 "event:cycle" (stampAt 200) (prev := [0x171])

def shortQueries : List Query := [allQuery,
  ⟨"emitted-exact", some after100, none⟩,
  ⟨"occurred-exact-fallback", none, some after100⟩,
  ⟨"both-exact", some after100, some after100⟩,
  ⟨"before-all", some beforeOct, some beforeOct⟩]

def asOfCases : List AsOfCase := [
  ⟨"01-empty", [[]], beliefQueries⟩,
  ⟨"02-belief-2019-about-2009", formOrders [earlyClaim, correction, laterEvent], beliefQueries⟩,
  ⟨"03-span-start-boundaries", formOrders spanForms, [allQuery,
    ⟨"before-span-start", none, some beforeOct⟩,
    ⟨"at-span-start", none, some startOct⟩,
    ⟨"at-span-start-offset", none, some (stamp "2026-10-01T01:00:00+01:00")⟩]⟩,
  ⟨"04-fallback-inclusive-offset", formOrders fallbackForms, shortQueries ++ [
    ⟨"offset-emitted", some (stamp "2026-10-01T01:01:40+01:00"), none⟩,
    ⟨"offset-occurred", none, some (stamp "2026-10-01T01:01:40+01:00")⟩,
    ⟨"just-before", some (stamp "2026-10-01T00:01:39.999Z"), none⟩]⟩,
  ⟨"05-eraser-outside-cut-no-second-settle", formOrders [erasedClaim, erasedClaim.withhold, outsideEraser], shortQueries⟩,
  ⟨"06-duplicate-withheld-forms", formOrders [shownAncestor, hiddenHead.withhold, shownAncestor.withhold], shortQueries⟩,
  ⟨"07-narrow-cut-increases-sum", formOrders [positive, negative], shortQueries⟩,
  ⟨"08-missing-parent-outside-cut", formOrders [missing, lateParent], shortQueries⟩,
  ⟨"09-cycle-and-dangling-parent", formOrders [cycleA, cycleB, missing], shortQueries⟩,
  ⟨"10-before-late-arrival", formOrders [laterEvent], beliefQueries⟩,
  ⟨"11-after-late-old-emitted-arrival", formOrders [laterEvent, earlyClaim], beliefQueries⟩]

def asOfVectors : Except String (List (String × J)) :=
  asOfCases.mapM fun c => do pure (c.name, ← asOfVector c)

/-! ## Tick cover proposals -/

abbrev TickId := Proposals.Tick.Id

def jIds (ids : List Nat) : J := .arr (ids.map (.str ∘ idText))

def jCover (cover : Proposals.Tick.Cover) : J :=
  .obj [("cover", jIds cover.ids), ("bytes", .str (hex cover.preimage)),
    ("hash", .str ("h:" ++ base32 (cover.digest Records.H)))]

def tickAnswer (old new : List TickId) : J :=
  let before := Proposals.Tick.normalize old
  let after := Proposals.Tick.normalize new
  .obj [("old", jCover before), ("new", jCover after),
    ("added", jIds (Proposals.Tick.diff before after)),
    ("removed", jIds (Proposals.Tick.removed before after))]

def tickIdOf (path : String) (j : Json) : Dec TickId := do
  let n ← recordId path j
  if h : n < 256 ^ 32 then pure ⟨n, h⟩
  else bad path "record id exceeds 32 bytes"

/-- Decode both covers. Compute bytes, hashes, and differences from the model. -/
def tickRun (input : Json) : Dec J := do
  let kvs ← members? "input" ["old", "new"] input
  let old ← each "input.old" tickIdOf (← req "input" kvs "old")
  let new ← each "input.new" tickIdOf (← req "input" kvs "new")
  pure (tickAnswer old new)

def tickId (n : Nat) (ok : n < 256 ^ 32 := by decide) : TickId := ⟨n, ok⟩

structure TickCase where
  name : String
  old : List TickId
  new : List TickId

def tickCases : List TickCase := [
  ⟨"01-empty", [], []⟩,
  ⟨"02-self", [tickId 1, tickId 2], [tickId 1, tickId 2]⟩,
  ⟨"03-order-and-duplicate-canonicalization", [tickId 3, tickId 1, tickId 3, tickId 2],
    [tickId 2, tickId 1, tickId 2, tickId 3, tickId 1]⟩,
  ⟨"04-added", [], [tickId 3, tickId 1, tickId 1]⟩,
  ⟨"05-removed", [tickId 2, tickId 1, tickId 2], []⟩,
  ⟨"06-disjoint", [tickId 3, tickId 1], [tickId 4, tickId 2]⟩,
  ⟨"07-overlap", [tickId 3, tickId 1, tickId 2], [tickId 4, tickId 3, tickId 2, tickId 4]⟩,
  ⟨"08-max32-id", [tickId (256 ^ 32 - 1), tickId 0],
    [tickId (256 ^ 32 - 1), tickId 1, tickId (256 ^ 32 - 1)]⟩,
  -- Base32 text puts a digest that starts with '2' before one that starts with 'a'.
  ⟨"09-base32-text-order-trap", [tickId (26 * 2 ^ 251), tickId 1],
    [tickId (256 ^ 32 - 1), tickId (26 * 2 ^ 251), tickId 1, tickId 0]⟩,
  ⟨"10-zero-is-a-full-digest", [], [tickId 0, tickId 0]⟩]

def tickVector (c : TickCase) : Except String J := do
  let expect := tickAnswer c.old c.new
  -- Check reversed and repeated forms before writing one canonical answer.
  for (old, new) in [(c.old.reverse, c.new.reverse), (c.old ++ c.old, c.new ++ c.new)] do
    if (tickAnswer old new).render 0 != expect.render 0 then
      throw s!"proposals/ticks/{c.name}: cover order or repeats change the answer"
  pure (vector c.name "proposals/ticks" ["proposal.tick-cover"]
    (.obj [("old", jIds (c.old.map Fin.val)), ("new", jIds (c.new.map Fin.val))]) expect)

def tickVectors : Except String (List (String × J)) :=
  tickCases.mapM fun c => do pure (c.name, ← tickVector c)

end Gen.ProposalVectors
