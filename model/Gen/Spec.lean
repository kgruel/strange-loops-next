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

/-- A spec with one slot, as written. -/
def slotOf (slot : Json) : Json :=
  o [("vertex", s "x"), ("from", a [o [("store", s ".")]]), ("fold", o [("c", slot)])]

/-- A spec counting from one source, as written. -/
def fromOf (source : Json) : Json :=
  o [("vertex", s "x"), ("from", a [source]), ("fold", o [("c", o [("count", .bool true)])])]

def parseCases : List (String × Json) := [
  ("phase2-null-fold", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", .null)]),
  ("phase2-unsafe-limit", slotOf (o [("collect", .bool true),
    ("limit", .number (Number.ofScientific false 9007199254740992 0))])),
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
      ("env.prev", o [("is", s (idText (fixtureId 0x41)))]),
      ("env.under", o [("absent", .bool true)]),
      ("env.erases", o [("absent", .bool true)]),
      ("env.emitted", o [("at-least", s "2026-10-01T00:00:00Z")]),
      ("env.occurred", o [("at-least", s "2026-10"), ("below", s "2026-11-01T00:00:00Z"),
        ("not", s "2026-10-01/2026-10-31")])])])])]),
  ("05-no-fold", o [("vertex", s "x"), ("from", a [o [("store", s ".")]])]),
  ("06-from-about-anchor", fromOf (o [("about", s (idText (fixtureId 0x71))), ("store", s "."), ("kind", a [s "note"])])),
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
  ("28-payload-bound-not-number", whereOn "est" ("at-least", s "5")),
  ("29-env-time-is-not-span", whereOn "env.occurred" ("is", s "2026-13")),
  ("30-env-id-ordered", whereOn "env.under" ("below", s (idText (fixtureId 0x41)))),
  ("31-present-false", whereOn "blocked" ("present", .bool false)),
  ("32-env-text-as-bool", whereOn "env.kind" ("not", .bool true)),
  ("33-env-id-as-number", whereOn "env.prev" ("is", .int 5)),
  ("34-env-observer-not-typed", whereOn "env.observer" ("is", s "alice")),
  ("35-env-kind-empty", whereOn "env.kind" ("is", s "")),
  ("36-env-about-not-typed", whereOn "env.about" ("not", s "loops")),
  ("37-payload-is-null", whereOn "status" ("is", .null)),
  ("38-where-empty", slotOf (o [("count", .bool true), ("where", o [])])),
  ("39-latest-by-without-follow", slotOf (o [("latest-by", s "about")])),
  ("40-repeated-operator", slotOf (o [("count", .bool true),
    ("where", o [("env.kind", o [("is", s "task"), ("is", s "note")])])])),
  ("41-repeated-key", o [("vertex", s "x"), ("vertex", s "y"), ("from", a [o [("store", s ".")]])]),
  -- a slot is checked in order: keys, one fold type, follow, limit, the
  -- fold's argument, then where, its fields in the order written
  ("42-slot-errors-in-order", slotOf (o [("count", .bool false), ("limit", .int 0), ("follow", s "next"),
    ("where", o [("x", o [("matches", s ".")])])])),
  -- written order, which isn't sorted order
  ("43-where-errors-in-order", slotOf (o [("count", .bool true),
    ("where", o [("x", o [("matches", s ".")]), ("env.id", o [("present", .bool true)])])])),
  ("44-from-kind-empty", fromOf (o [("store", s "."), ("kind", a [s ""])])),
  ("45-from-about-not-typed", fromOf (o [("store", s "."), ("about", s "loops")])),
  ("46-from-kind-none", fromOf (o [("store", s "."), ("kind", a [])])),
  ("47-vertex-empty", o [("vertex", s ""), ("from", a [o [("store", s ".")]])]),
  ("48-vertex-not-text", o [("vertex", .int 5), ("from", a [o [("store", s ".")]])]),
  ("49-store-empty", fromOf (o [("store", s "")])),
  ("50-slot-name-empty", o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("fold", o [("", o [("count", .bool true)])])]),
  ("51-sum-field-empty", slotOf (o [("sum", s "")])),
  ("61-min-field-empty", slotOf (o [("min", s "")])),
  ("62-max-field-empty", slotOf (o [("max", s "")])),
  ("52-where-field-empty", slotOf (o [("count", .bool true), ("where", o [("", o [("present", .bool true)])])])),
  -- the repeat found first, depth first in member order: the slot's, though
  -- `vertex` was written first and repeats after it
  ("53-repeat-depth-first", o [("vertex", s "x"),
    ("fold", o [("c", o [("count", .bool true), ("count", .bool true)])]),
    ("vertex", s "y"), ("from", a [o [("store", s ".")]])]),
  -- inside an array element, and before every other check
  ("54-repeat-in-from", o [("vertex", s "x"), ("from", a [o [("store", s "."), ("store", s ".")]]),
    ("query", s "select *")]),
  ("55-slot-limit-before-argument", slotOf (o [("count", .bool false), ("limit", .int 0)])),
  -- `from` checks store, kind, then about, however they are written
  ("56-from-errors-in-order", fromOf (o [("about", s "loops"), ("kind", a [s ""]), ("store", s ".")])),
  ("57-from-store-first", fromOf (o [("kind", a []), ("store", s "")])),
  ("58-slot-not-object", slotOf (.int 5)),
  ("59-slot-unknown-key", slotOf (o [("count", .bool true), ("order", s "newest")])),
  ("60-from-unknown-key", fromOf (o [("store", s "."), ("as", s "x")])),
  -- a repeat under an empty key: its path starts with the empty key
  ("63-repeat-under-empty-key", o [("", o [("x", .int 1), ("x", .int 2)]), ("vertex", s "x"),
    ("from", a [o [("store", s ".")]])]),
  ("64-slot-argument-before-where", slotOf (o [("count", .bool false), ("where", o [])])),
  ("gap03-repeat-key-before-value", o [("vertex", s "x"), ("vertex", o [("x", s "a"), ("x", s "b")]),
    ("from", a [o [("store", s ".")]])]),
  ("gap05-limit-zero", slotOf (o [("collect", .bool true), ("limit", .int 0)])),
  ("gap09-absent", o [("vertex", s "x")]),
  ("gap09-empty-array", o [("vertex", s "x"), ("from", a [])]),
  ("gap09-empty-object", o [("vertex", s "x"), ("from", o [])]),
  ("gap09-empty-text", o [("vertex", s "x"), ("from", s "")]),
  ("gap09-null", o [("vertex", s "x"), ("from", .null)]),
  ("gap08-fractional-bound", slotOf (o [("count", .bool true),
    ("where", o [("est", o [("at-least", .number (Number.ofScientific false 15 (-1)))])])])),
  ("gap08-whole-bound", slotOf (o [("count", .bool true),
    ("where", o [("est", o [("below", .int 2)])])]))
] ++ [(-9007199254740992 : Int), -9007199254740991, 9007199254740991, 9007199254740992].flatMap fun i =>
  ["is", "not", "at-least", "below"].map fun op =>
    (s!"gap08-{op}-{i}", slotOf (o [("count", .bool true), ("where", o [("est", o [(op, .int i)])])]))

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
  -- a spec that repeats a key also comes as written, since a JSON parser
  -- may keep only one of the repeats
  let text := if j.keysDistinct then [] else [("spec_text", J.str (Records.rawText j))]
  return vector name "spec/parse" ["spec.parse"] (.obj ([("spec", Records.ofJson j)] ++ text)) expect

/-! ## Running -/

def task (id : RecordId) (thing : String) (occurred : Nat) (fields : List (String × Val))
    (prev : List RecordId := []) (ok : Reads occurred := by decide) : Record :=
  { id, kind := "task", observer := "sl:kyle", about := [thing], value := "", prev, occurred := some (claimAt occurred ok),
    emitted := stampAt occurred ok, fields }

-- task:1 opens, then closes; task:2 is open; task:3 is open but its payload is withheld
def t1 := task (fixtureId 0x41) "task:1" 100 [("status", .str "open"), ("est", .int 3)]
def t2 := task (fixtureId 0x42) "task:1" 200 [("status", .str "closed"), ("est", .int 3)] (prev := [fixtureId 0x41])
def t3 := task (fixtureId 0x43) "task:2" 150 [("status", .str "open"), ("est", .int 5), ("blocked", .bool true)]
def t4 := (task (fixtureId 0x44) "task:3" 160 [("status", .str "open"), ("est", .int 8)]).withhold
def n1 : Record := { task (fixtureId 0x45) "task:2" 170 [] with kind := "note" }

-- events with every kind of `occurred`: a month and the same span spelled
-- as days, a day that starts with them, an instant, an open span, one in
-- September, one without, and one withheld, whose envelope tests still answer
def ev (id : RecordId) (occurred : Option Claim) (emitted : Nat) (ok : Reads emitted := by decide) : Record :=
  { id, kind := "event", observer := "sl:kyle", about := [s!"event:{id}"], value := "", prev := [], occurred,
    emitted := stampAt emitted ok }

def e1 := ev (fixtureId 0x51) (some (claim "2026-10")) 100
def e2 := ev (fixtureId 0x52) (some (claimAt 300)) 300
def e3 := ev (fixtureId 0x53) (some (claim "2026-10-01/2026-10-31")) 110
def e4 := ev (fixtureId 0x54) none 200
def e5 := ev (fixtureId 0x55) (some (claim "2026-09")) 120
def e6 := (ev (fixtureId 0x56) (some (claimAt 600)) 600).withhold
def e7 := ev (fixtureId 0x57) (some (claim "2026-10-01T00:02:00Z/..")) 130
def e8 := ev (fixtureId 0x58) (some (claim "2026-10-01")) 140

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
      ("where", o [("env.emitted", o [("at-least", s "2026-10-01T00:03:00Z")])])])])]

-- numeric bounds and complements on a payload field
def boundSpec : Json := o [("vertex", s "estimates"),
  ("from", a [o [("store", s "."), ("kind", a [s "task"])]]),
  ("fold", o [
    ("mid", o [("count", .bool true), ("where", o [("est", o [("at-least", .int 4), ("below", .int 8)])])]),
    ("small", o [("count", .bool true), ("where", o [("est", o [("below", .int 4)])])]),
    ("not-three", o [("count", .bool true), ("where", o [("est", o [("not", .int 3)])])]),
    ("total", o [("sum", s "est")]),
    ("unblocked", o [("count", .bool true), ("where", o [("blocked", o [("absent", .bool true)])])])])]

-- every envelope field, tested on records by several observers: a revision
-- by someone else, a record about two things (erased by another), one acting
-- under a grant, and one about nothing, dated a month before it was stamped
-- and withheld; payload `kind` differs from `env.kind`
def said (id : RecordId) (observer : String) (about : List String) (t : Nat)
    (ok : Reads t := by decide) : Record :=
  { id, kind := "task", observer, about, value := "", prev := [], emitted := stampAt t ok }

def a1 : Record := { said (fixtureId 0x61) "sl:alice" ["task:1"] 100 with fields := [("kind", .str "chore")] }
def a2 : Record := { said (fixtureId 0x62) "sl:bob" ["task:1"] 200 with prev := [fixtureId 0x61], fields := [("kind", .str "bug")] }
def a3 : Record := (said (fixtureId 0x63) "sl:alice" ["task:2", "proj:loops"] 300).erase
def a4 : Record := { said (fixtureId 0x64) "sl:carol" ["task:3"] 400 with under := some (fixtureId 0x99), erases := [fixtureId 0x63] }
def a5 : Record := { said (fixtureId 0x65) "sl:alice" [] 500 with occurred := some (claim "2026-09") }.withhold
def a6 : Record := { said (fixtureId 0x66) "sl:bob" ["task:4"] 150 with kind := "chore" }

def envSpec : Json := o [("vertex", s "envelopes"),
  ("from", a [o [("store", s ".")]]),
  ("fold", o [
    ("by-alice", o [("collect", .bool true), ("where", o [("env.observer", o [("is", s "sl:alice")])])]),
    ("not-alice", o [("count", .bool true), ("where", o [("env.observer", o [("not", s "sl:alice")])])]),
    ("loops", o [("collect", .bool true), ("where", o [("env.about", o [("is", s "proj:loops")])])]),
    ("not-task-2", o [("collect", .bool true), ("where", o [("env.about", o [("not", s "task:2")])])]),
    ("about-nothing", o [("collect", .bool true), ("where", o [("env.about", o [("absent", .bool true)])])]),
    ("revisions", o [("collect", .bool true), ("where", o [("env.prev", o [("present", .bool true)])])]),
    ("revises-first", o [("count", .bool true), ("where", o [("env.prev", o [("is", s (idText (fixtureId 0x61)))])])]),
    ("granted", o [("collect", .bool true), ("where", o [("env.under", o [("is", s (idText (fixtureId 0x99)))])])]),
    ("ungranted", o [("count", .bool true), ("where", o [("env.under", o [("absent", .bool true)])])]),
    ("erasing", o [("collect", .bool true), ("where", o [("env.erases", o [("is", s (idText (fixtureId 0x63)))])])]),
    ("chores", o [("collect", .bool true), ("where", o [("kind", o [("is", s "chore")])])]),
    ("chore-kind", o [("collect", .bool true), ("where", o [("env.kind", o [("is", s "chore")])])]),
    ("emitted-since", o [("collect", .bool true),
      ("where", o [("env.emitted", o [("at-least", s "2026-10-01T00:04:00Z")])])]),
    ("emitted-is", o [("count", .bool true),
      ("where", o [("env.emitted", o [("is", s "2026-10-01T00:01:40Z")])])]),
    ("alice-current", o [("latest-by", s "about"), ("follow", s "prev"),
      ("where", o [("env.observer", o [("is", s "sl:alice")])])]),
    ("alice-heads", o [("collect", .bool true), ("follow", s "prev"),
      ("where", o [("env.observer", o [("is", s "sl:alice")])])])])]

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

-- Hidden payloads must not supply numbers, even though their placeholder is zero.
def hiddenNumbersSpec : Json := o [("vertex", s "hidden-numbers"),
  ("from", a [o [("store", s "."), ("kind", a [s "task"])]]),
  ("fold", o [("count", o [("count", .bool true)]),
    ("sum", o [("sum", s "n")]), ("min", o [("min", s "n")]),
    ("max", o [("max", s "n")])])]

-- a record about nothing anchors the thing named by its id: `from` takes it
-- and its revision, while `env.about` reads only what each envelope says
def x1 : Record := { said (fixtureId 0x71) "sl:alice" [] 100 with kind := "note" }
def x2 : Record := { said (fixtureId 0x72) "sl:bob" [idText (fixtureId 0x71)] 200 with kind := "note", prev := [fixtureId 0x71] }
def x3 : Record := { said (fixtureId 0x73) "sl:bob" ["task:1"] 300 with kind := "note" }

def anchorSpec : Json := o [("vertex", s "anchored"),
  ("from", a [o [("store", s "."), ("about", s (idText (fixtureId 0x71)))]]),
  ("fold", o [
    ("all", o [("collect", .bool true)]),
    ("current", o [("latest-by", s "about"), ("follow", s "prev")]),
    ("says-about", o [("collect", .bool true), ("where", o [("env.about", o [("is", s (idText (fixtureId 0x71)))])])])])]

def readableExtremaSpec : Json := o [("vertex", s "extrema"),
  ("from", a [o [("store", s "."), ("kind", a [s "task"])]]),
  ("fold", o [("lo", o [("min", s "est")]), ("hi", o [("max", s "est")])])]

def sourceUnionSpec : Json := o [("vertex", s "union"),
  ("from", a [o [("store", s "."), ("kind", a [s "task"])],
    o [("store", s "."), ("kind", a [s "note"])]]),
  ("fold", o [("c", o [("count", .bool true)])])]

structure RunCase where
  name : String
  laws : List String
  spec : Json
  records : List Record

def runCases : List RunCase := [
  ⟨"phase2-exact-output", ["spec.set", "sum.perm", "numeric.safe-whole"],
    o [("vertex", s "exact-output"), ("from", a [o [("store", s ".")]]),
      ("fold", o [("n", o [("sum", s "n")]), ("field", o [("sum", s "est")])])],
    [{ task (fixtureId 0xf1) "task:1" 100 [("est", .int 9007199254740991)] with n := 9007199254740991 },
      { task (fixtureId 0xf2) "task:2" 110 [("est", .int 2)] with n := 2 }]⟩,
  ⟨"01-tasks", ["spec.set", "spec.select"], taskSpec, [t1, t2, t3, n1]⟩,
  ⟨"02-withheld-payload", ["spec.set", "view.refines", "result.unread"], taskSpec, [t1, t2, t3, t4, n1]⟩,
  ⟨"03-withheld-successor", ["spec.set", "view.no-resurrection", "result.unread"], taskSpec,
    [t1, t2.withhold, t3, n1]⟩,
  ⟨"04-kind-change", ["spec.set", "spec.after-supersession"], taskSpec,
    [t1, { task (fixtureId 0x46) "task:1" 300 [] (prev := [fixtureId 0x41]) with kind := "task-done" }, t3]⟩,
  ⟨"05-about-is-a-set", ["spec.set", "thing.local"], taskSpec,
    [{ t3 with about := ["task:2", "task:9"] }, task (fixtureId 0x47) "task:2" 400 [("status", .str "closed")] (prev := [fixtureId 0x43])]⟩,
  ⟨"06-times", ["spec.set", "where.time", "where.complements", "where.total"], timeSpec,
    [e1, e2, e3, e4, e5, e6, e7, e8]⟩,
  ⟨"07-numeric-bounds", ["spec.set", "where.complements", "where.typed", "result.unread"], boundSpec,
    [t1, t2, t3, t4, task (fixtureId 0x48) "task:4" 180 [("est", .int 4)], task (fixtureId 0x49) "task:5" 190 [("est", .int 8)],
      task (fixtureId 0x4a) "task:6" 195 [("est", .str "5")]]⟩,
  ⟨"08-envelope-fields", ["spec.set", "where.fields", "where.time", "where.total",
      "spec.after-supersession"], envSpec, [a1, a2, a3, a4, a5, a6]⟩,
  ⟨"09-from-about-anchor", ["spec.set", "spec.from-thing", "where.fields"], anchorSpec, [x1, x2, x3]⟩,
  ⟨"gap04-unread-multi-thing", ["result.unread"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]), ("fold", o [
      ("by", o [("latest-by", s "about"), ("follow", s "prev"),
        ("where", o [("status", o [("is", s "open")])])]),
      ("collect", o [("collect", .bool true), ("follow", s "prev"),
        ("where", o [("status", o [("is", s "open")])])])])],
    [{ (task (fixtureId 0xa1) "task:a" 100 []).withhold with about := ["task:a", "task:b"] }]⟩,
  ⟨"gap05-unread-before-limit", ["result.unread"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]), ("fold", o [
      ("plain", o [("collect", .bool true), ("limit", .int 1), ("where", o [("status", o [("is", s "open")])])]),
      ("follow", o [("collect", .bool true), ("follow", s "prev"), ("limit", .int 1),
        ("where", o [("status", o [("is", s "open")])])]),
      ("all", o [("collect", .bool true), ("where", o [("status", o [("is", s "open")])])])])],
    [task (fixtureId 0xb1) "task:a" 300 [("status", .str "open")],
      (task (fixtureId 0xb2) "task:b" 200 []).withhold, (task (fixtureId 0xb3) "task:c" 100 []).withhold]⟩,
  ⟨"gap06-direct-admission", ["spec.set"], fromOf (o [("store", s ".")]),
    [task (fixtureId 0xc1) "task:a" 100 [], task (fixtureId 0xc2) "task:b" 200 [] [fixtureId 0xc1]]⟩,
  ⟨"gap07-store-team", ["spec.set"], fromOf (o [("store", s "team")]), [t1]⟩,
  ⟨"gap07-store-other", ["spec.set"], fromOf (o [("store", s "other")]), [t1]⟩,
  ⟨"gap12-no-unknown", ["where.set", "result.unread"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]), ("fold", o [
      ("payload-first", o [("count", .bool true), ("where", o [("status", o [("is", s "open")]),
        ("env.kind", o [("is", s "note")])])]),
      ("envelope-first", o [("count", .bool true), ("where", o [("env.kind", o [("is", s "note")]),
        ("status", o [("is", s "open")])])]),
      ("unknown", o [("count", .bool true), ("where", o [("status", o [("is", s "open")]),
        ("env.kind", o [("is", s "task")])])])])], [t4]⟩,
  ⟨"gap13-missing-and-withheld", ["where.total", "result.unread"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]), ("fold", o (
      [("is", s "open"), ("not", s "open"), ("present", .bool true), ("absent", .bool true),
       ("at-least", .int 1), ("below", .int 1)].map fun test =>
        (test.1, o [("count", .bool true), ("where", o [("missing", o [test])])])))],
    [task (fixtureId 0xd1) "task:a" 100 [], (task (fixtureId 0xd2) "task:b" 110 []).withhold]⟩,
  ⟨"gap14-field-types", ["result.unread", "numeric.safe-whole"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]), ("fold", o [
      ("sum", o [("sum", s "est")]), ("min", o [("min", s "est")]),
      ("max", o [("max", s "est")])])],
    [task (fixtureId 0xe1) "task:1" 100 [("est", .int 2)],
      task (fixtureId 0xe2) "task:2" 110 [("est", .int (-3))],
      task (fixtureId 0xe3) "task:3" 120 [("est", .number (Number.ofScientific false 15 (-1)))],
      task (fixtureId 0xe4) "task:4" 130 [("est", .int 2)],
      task (fixtureId 0xe5) "task:5" 140 [("est", .str "1.5")],
      task (fixtureId 0xe6) "task:6" 150 [("est", .bool true)], task (fixtureId 0xe7) "task:7" 160 [],
      (task (fixtureId 0xe8) "task:8" 170 [("est", .int 7)]).withhold,
      task (fixtureId 0xe9) "task:9" 180 [("est", .number (Number.ofScientific false 9007199254740992 0))]]⟩,
  ⟨"10-unread-shared-head", ["spec.set", "result.unread", "thing.local"], taskSpec,
    [({ t3 with about := ["task:2", "task:9"] }).withhold]⟩,
  ⟨"11-hidden-numbers", ["spec.set", "result.unread"], hiddenNumbersSpec,
    [(task (fixtureId 0x76) "task:6" 100 []).withhold, (task (fixtureId 0x77) "task:7" 200 []).erase]⟩,
  ⟨"12-readable-extrema", ["spec.set", "result.unread"], readableExtremaSpec,
    [task (fixtureId 0x78) "task:8" 100 [("est", .int 3)], task (fixtureId 0x79) "task:9" 200 [("est", .int 5)]]⟩,
  ⟨"13-source-union", ["spec.set", "spec.select"], sourceUnionSpec,
    [task (fixtureId 0x78) "task:8" 100 []]⟩
]

def jShownIds (hs : List (RecordId × Shown)) : J :=
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
