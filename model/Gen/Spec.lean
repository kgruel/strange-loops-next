import Loops
import Gen.Json
import Gen.Encode
import Gen.Records

/-!
# Spec vectors

`spec/parse`: a spec as JSON, and either its parsed form or the refusal.
`spec/run`: a spec and the same records in several arrival orders, and what
each slot holds.
-/

namespace Gen.SpecVectors

open Loops

def o (kvs : List (String × Json)) : Json := .obj kvs
def s (x : String) : Json := .str x
def a (xs : List Json) : Json := .arr xs

/-! ## Parsing -/

/-- A spec counting what one `where` test chooses. -/
def whereOn (field : String) (test : String × Json) : Json :=
  o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("c", o [("count", .bool true), ("where", o [(field, o [test])])])])]

def parseCases : List (String × Json) := [
  ("01-latest-by", o [("vertex", s "decisions"),
    ("note", s "Decisions from notes; the latest per topic."),
    ("from", a [o [("store", s "notes"), ("kind", a [s "decision"])],
      o [("store", s "rfc@home"), ("kind", a [s "decision"])]]),
    ("fold", o [("by-topic", o [("latest-by", s "about"), ("follow", s "prev")])]),
    ("boundary", a [o [("when", s "release")]])]),
  ("02-where-and-limit", o [("vertex", s "open-tasks"),
    ("from", a [o [("store", s "."), ("kind", a [s "task"])]]),
    ("fold", o [("recent", o [("collect", .bool true), ("follow", s "prev"), ("limit", .int 5),
      ("where", o [("status", o [("is", s "open")]), ("env.kind", o [("not", s "draft")])])])])]),
  ("03-numeric", o [("vertex", s "estimates"),
    ("from", a [o [("store", s "."), ("kind", a [s "task"]), ("about", s "proj:loops")]]),
    ("fold", o [("tasks", o [("count", .bool true)]),
      ("total", o [("sum", s "est")]),
      ("largest", o [("max", s "est"), ("where", o [("est", o [("at-least", .int 1), ("below", .int 100)])])]),
      ("flagged", o [("count", .bool true), ("where", o [("blocked", o [("present", .bool true)])])])])]),
  ("04-envelope-fields", o [("vertex", s "events"),
    ("from", a [o [("store", s ".")]]),
    ("fold", o [("these", o [("count", .bool true), ("where", o [
      ("env.kind", o [("is", s "event")]),
      ("env.observer", o [("not", s "sl:bot")]),
      ("env.about", o [("is", s "proj:loops")]),
      ("env.prev", o [("is", s (idText 0x41))]),
      ("env.under", o [("absent", .bool true)]),
      ("env.erases", o [("absent", .bool true)]),
      ("env.emitted", o [("at-least", s "2026-10-01T00:00:00Z")]),
      ("env.occurred", o [("at-least", s "2026-10"), ("below", s "2026-11-01T01:00:00+01:00"),
        ("not", s "2026-10-01/2026-10-31")])])])])]),
  ("10-not-object", a [s "vertex"]),
  ("11-unknown-key", o [("vertex", s "x"), ("query", s "select *")]),
  ("12-vertex-missing", o [("fold", o [])]),
  ("13-two-fold-types", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("both", o [("count", .bool true), ("sum", s "n")])])]),
  ("14-no-fold-type", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("none", o [("where", o [])])])]),
  ("15-regex-refused", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("m", o [("count", .bool true), ("where", o [("title", o [("matches", s "^auth")])])])])]),
  ("16-limit-on-count", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("c", o [("count", .bool true), ("limit", .int 3)])])]),
  ("17-follow-on-sum", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("t", o [("sum", s "est"), ("follow", s "prev")])])]),
  ("18-from-not-array", o [("vertex", s "x"), ("from", o [("store", s ".")])]),
  ("19-sum-of-nothing", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("t", o [("sum", .bool true)])])]),
  ("20-from-missing", o [("vertex", s "x"), ("fold", o [("c", o [("count", .bool true)])])]),
  ("21-from-empty", o [("vertex", s "x"), ("from", a []), ("fold", o [("c", o [("count", .bool true)])])]),
  ("22-env-unknown-field", whereOn "env.id" ("present", .bool true)),
  ("23-env-text-ordered", whereOn "env.kind" ("at-least", s "a")),
  ("24-env-time-not-span", whereOn "env.occurred" ("at-least", s "2026-13")),
  ("25-env-time-as-number", whereOn "env.occurred" ("at-least", .int 2026)),
  ("26-env-id-not-record-id", whereOn "env.prev" ("is", s "r:x")),
  ("27-env-text-as-number", whereOn "env.kind" ("is", .int 5)),
  ("28-payload-bound-not-number", whereOn "est" ("at-least", s "5"))
]

def jRefusal (r : Refusal) : J := .obj [("refused", .str r.code), ("path", .str r.path)]

def parseVector (name : String) (j : Json) : Except String J := do
  let expect ← match Spec.ofJson j with
    | .ok sp =>
      -- the parsed form parses back to itself
      match Spec.ofJson sp.toJson with
      | .ok sp' => if sp' != sp then throw s!"spec/parse/{name}: no round trip"
      | .error _ => throw s!"spec/parse/{name}: its parsed form is refused"
      pure (.obj [("parsed", Records.ofJson sp.toJson)])
    | .error r => pure (jRefusal r)
  return vector name "spec/parse" ["spec.parse"] (.obj [("spec", Records.ofJson j)]) expect

/-! ## Running -/

def task (id : Nat) (thing : String) (occurred : Nat) (fields : List (String × Val))
    (prev : List Nat := []) (ok : Reads occurred := by decide) : Record :=
  { id, kind := "task", about := [thing], value := "", prev, occurred := some (claimAt occurred ok),
    emitted := stampAt occurred ok, fields }

-- task:1 opens, then closes; task:2 is open; task:3 is open but its payload is withheld
def t1 := task 0x41 "task:1" 100 [("status", .str "open"), ("est", .int 3)]
def t2 := task 0x42 "task:1" 200 [("status", .str "closed"), ("est", .int 3)] (prev := [0x41])
def t3 := task 0x43 "task:2" 150 [("status", .str "open"), ("est", .int 5), ("blocked", .bool true)]
def t4 := (task 0x44 "task:3" 160 [("status", .str "open"), ("est", .int 8)]).withhold
def n1 : Record := { task 0x45 "task:2" 170 [] with kind := "note" }

-- events with every kind of `occurred`: a month and the same span spelled
-- as days, a day that starts with them, an instant, an open span, one in
-- September, one without, and one withheld, whose envelope tests still answer
def ev (id : Nat) (occurred : Option Claim) (emitted : Nat) (ok : Reads emitted := by decide) : Record :=
  { id, kind := "event", about := [s!"event:{id}"], value := "", prev := [], occurred,
    emitted := stampAt emitted ok }

def e1 := ev 0x51 (some (claim "2026-10")) 100
def e2 := ev 0x52 (some (claimAt 300)) 300
def e3 := ev 0x53 (some (claim "2026-10-01/2026-10-31")) 110
def e4 := ev 0x54 none 200
def e5 := ev 0x55 (some (claim "2026-09")) 120
def e6 := (ev 0x56 (some (claimAt 600)) 600).withhold
def e7 := ev 0x57 (some (claim "2026-10-01T00:02:00Z/..")) 130
def e8 := ev 0x58 (some (claim "2026-10-01")) 140

def timeSpec : Json := o [("vertex", s "events"),
  ("from", a [o [("store", s "."), ("kind", a [s "event"])]]),
  ("fold", o [
    ("october", o [("count", .bool true),
      ("where", o [("env.occurred", o [("at-least", s "2026-10"), ("below", s "2026-11")])])]),
    ("the-month", o [("collect", .bool true), ("where", o [("env.occurred", o [("is", s "2026-10")])])]),
    ("not-the-month", o [("count", .bool true), ("where", o [("env.occurred", o [("not", s "2026-10")])])]),
    ("before-five", o [("count", .bool true),
      ("where", o [("env.occurred", o [("below", s "2026-10-01T00:05:00Z")])])]),
    ("undated", o [("collect", .bool true), ("where", o [("env.occurred", o [("absent", .bool true)])])]),
    ("emitted-late", o [("collect", .bool true),
      ("where", o [("env.emitted", o [("at-least", s "2026-10-01T01:03:00+01:00")])])])])]

-- numeric bounds and complements on a payload field
def boundSpec : Json := o [("vertex", s "estimates"),
  ("from", a [o [("store", s "."), ("kind", a [s "task"])]]),
  ("fold", o [
    ("mid", o [("count", .bool true), ("where", o [("est", o [("at-least", .int 4), ("below", .int 8)])])]),
    ("small", o [("count", .bool true), ("where", o [("est", o [("below", .int 4)])])]),
    ("not-three", o [("count", .bool true), ("where", o [("est", o [("not", .int 3)])])]),
    ("unblocked", o [("count", .bool true), ("where", o [("blocked", o [("absent", .bool true)])])])])]

def taskSpec : Json := o [("vertex", s "tasks"),
  ("from", a [o [("store", s "."), ("kind", a [s "task"])]]),
  ("fold", o [
    ("open", o [("latest-by", s "about"), ("follow", s "prev"),
      ("where", o [("status", o [("is", s "open")])])]),
    ("current", o [("latest-by", s "about"), ("follow", s "prev")]),
    ("newest", o [("collect", .bool true), ("follow", s "prev"), ("limit", .int 1)]),
    ("every", o [("collect", .bool true)]),
    ("observations", o [("count", .bool true)]),
    ("open-observations", o [("count", .bool true), ("where", o [("status", o [("is", s "open")])])]),
    ("est", o [("sum", s "est")]),
    ("blocked", o [("count", .bool true), ("where", o [("blocked", o [("present", .bool true)])])])])]

structure RunCase where
  name : String
  laws : List String
  spec : Json
  records : List Record

def runCases : List RunCase := [
  ⟨"01-tasks", ["spec.set", "spec.select"], taskSpec, [t1, t2, t3, n1]⟩,
  ⟨"02-withheld-payload", ["spec.set", "view.refines", "result.unread"], taskSpec, [t1, t2, t3, t4, n1]⟩,
  ⟨"03-withheld-successor", ["spec.set", "view.no-resurrection", "result.unread"], taskSpec,
    [t1, t2.withhold, t3, n1]⟩,
  ⟨"04-kind-change", ["spec.set", "spec.after-supersession"], taskSpec,
    [t1, { task 0x46 "task:1" 300 [] (prev := [0x41]) with kind := "task-done" }, t3]⟩,
  ⟨"05-about-is-a-set", ["spec.set", "thing.local"], taskSpec,
    [{ t3 with about := ["task:2", "task:9"] }, task 0x47 "task:2" 400 [("status", .str "closed")] (prev := [0x43])]⟩,
  ⟨"06-times", ["spec.set", "where.time", "where.complements", "where.total"], timeSpec,
    [e1, e2, e3, e4, e5, e6, e7, e8]⟩,
  ⟨"07-numeric-bounds", ["spec.set", "where.complements", "where.typed", "result.unread"], boundSpec,
    [t1, t2, t3, t4, task 0x48 "task:4" 180 [("est", .int 4)], task 0x49 "task:5" 190 [("est", .int 8)]]⟩
]

def jShownIds (hs : List (Nat × Shown)) : J :=
  .arr (hs.map fun (i, sh) => .obj [("id", .str (idText i)), ("shown", jShown sh)])

def jSlot : SlotValue → J
  | .nat r => .obj [("value", .num r.value), ("unread", .num r.unread)]
  | .int r => .obj [("value", .int r.value), ("unread", .num r.unread)]
  | .opt r => .obj [("value", match r.value with
      | some v => .int v
      | none => .null), ("unread", .num r.unread)]
  | .heads hs u => .obj [("heads", jShownIds hs), ("unread", .num u)]
  | .things ts u => .obj [("things", .obj (ts.map fun (t, hs) => (t, jShownIds hs))),
      ("unread", .num u)]

def rotations (xs : List Record) : List (List Record) :=
  (List.range xs.length).map fun i => xs.drop i ++ xs.take i

def runVector (c : RunCase) : Except String J := do
  let sp ← match Spec.ofJson c.spec with
    | .ok sp => pure sp
    | .error r => throw s!"spec/run/{c.name}: refused {r.code} at {r.path}"
  let orders := rotations c.records
  let results := orders.map fun xs => J.obj ((sp.run xs).map fun (n, v) => (n, jSlot v))
  let first := results.headD .null
  if !(results.all (·.render 0 == first.render 0)) then
    throw s!"spec/run/{c.name}: arrival orders disagree"
  return vector c.name "spec/run" c.laws
    (.obj [("spec", Records.ofJson c.spec), ("orders", .arr (orders.map fun o => .arr (o.map jRecord)))])
    first

def vectors : Except String (List (String × String × J)) := do
  let parsed ← parseCases.mapM fun (n, j) => do pure ("spec/parse", n, ← parseVector n j)
  let runs ← runCases.mapM fun c => do pure ("spec/run", c.name, ← runVector c)
  return parsed ++ runs

end Gen.SpecVectors
