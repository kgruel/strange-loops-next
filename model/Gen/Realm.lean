import Loops
import Gen.Json
import Gen.Encode

/-!
# Realm vectors

What a reader makes of every form its places hold, before any vertex asks:
one record per id (`settled`, with what the reader holds of each), the
records refused for their `prev` (`refused`), each thing's state over the
rest (`things`), and Sum over them with what it couldn't read (`sum`).
`input.forms` lists the forms in one list; every rotation must agree.
-/

namespace Gen.RealmVectors

open Loops

def r (id : RecordId) (kind : String) (about : List String) (t : Nat) (prev : List RecordId := [])
    (ok : Reads t := by decide) : Record :=
  { id, kind, observer := "sl:kyle", about, value := "", prev, occurred := some (claimAt t ok), emitted := stampAt t ok }

-- one record, held in full in one place and erased in another
def full : Record := { r (fixtureId 0x51) "load" ["host:a"] 100 with n := 40 }
def eraseRec : Record := { r (fixtureId 0x52) "erase" [] 110 with erases := [fixtureId 0x51] }

-- a record about thing B naming one about thing A in `prev`
def a1 := r (fixtureId 0x61) "facet" ["thing:A"] 1
def b1 := r (fixtureId 0x62) "facet" ["thing:B"] 2 [fixtureId 0x61]

-- a record about two things, then a revision about one of them
def d1 := r (fixtureId 0x71) "status" ["svc:auth", "svc:billing"] 1
def d2 := r (fixtureId 0x72) "status" ["svc:auth"] 2 [fixtureId 0x71]

-- a note about nothing anchors its own thing; its revision is about it, and an
-- unrelated note about nothing is no fork of either
def m1 := r (fixtureId 0x81) "note" [] 1
def m2 := r (fixtureId 0x82) "note" [idText (fixtureId 0x81)] 2 [fixtureId 0x81]
def m3 := r (fixtureId 0x83) "config" [] 3
-- a revision about nothing names a record in another thing
def m4 := r (fixtureId 0x84) "note" [] 4 [fixtureId 0x81]

-- a revision that erases what it replaces: any kind may erase
def x1 := { r (fixtureId 0xa1) "note" ["person:alice"] 1 with n := 7 }
def x2 := { r (fixtureId 0xa2) "note" ["person:alice"] 2 [fixtureId 0xa1] with erases := [fixtureId 0xa1] }

-- a task finished by a record of another kind
def t1 := r (fixtureId 0x91) "task" ["task:1"] 1
def t2 := r (fixtureId 0x92) "task-done" ["task:1"] 2 [fixtureId 0x91]

structure Case where
  name : String
  laws : List String
  forms : List Record

def cases : List Case := [
  ⟨"01-erased-without-record-is-withheld", ["settle.set", "settle.keeps"], [full, full.erase]⟩,
  ⟨"02-here-beats-withheld", ["settle.set", "settle.keeps"], [full.withhold, full, full.withhold]⟩,
  ⟨"03-erase-record-sticks", ["settle.set", "settle.erased"], [full, full.erase, eraseRec, full]⟩,
  ⟨"04-cross-thing-prev-refused", ["admit.no-cross", "thing.local"], [a1, b1]⟩,
  ⟨"05-about-is-a-set", ["thing.local"], [d1, d2]⟩,
  ⟨"06-about-nothing", ["thing.local"], [m1, m2, m3]⟩,
  ⟨"07-kind-change-supersedes", ["thing.local"], [t1, t2]⟩,
  ⟨"08-about-nothing-revised-unrelated", ["admit.no-cross", "thing.local"], [m1, m4]⟩,
  ⟨"09-revision-erases", ["settle.set", "settle.erased"], [x1, x2]⟩,
  ⟨"gap01-id-order", ["settle.set", "admit.no-cross"],
    [r (fixtureId 52) "note" ["thing:A"] 1, r (fixtureId 53) "note" ["thing:B"] 2 [fixtureId 52],
      r (fixtureId 0) "note" ["thing:C"] 3, r (fixtureId 1) "note" ["thing:D"] 4 [fixtureId 0]]⟩,
  ⟨"gap02-lone-erased", ["settle.keeps"], [full.erase]⟩,
  ⟨"gap10-refused-eraser", ["settle.erased", "admit.no-cross"],
    [full, { r (fixtureId 0x52) "erase" ["host:b"] 110 [fixtureId 0x51] with erases := [fixtureId 0x51] }]⟩,
  ⟨"gap10-withheld-eraser", ["settle.erased"], [full, eraseRec.withhold]⟩,
  ⟨"10-successor-expands-things", ["admit.no-cross", "thing.local"],
    [r (fixtureId 0xb1) "note" ["thing:A"] 1, r (fixtureId 0xb2) "note" ["thing:A", "thing:B"] 2 [fixtureId 0xb1]]⟩
]

def allow : Record → Record → Bool := fun _ _ => true

def realmJ (xs : List Record) : J :=
  let settled := settle xs
  let refused := settled.filterMap fun r => (refusalOf allow settled r).map (r.id, ·)
  let kept := admit allow settled
  let sum := Sum.acc.select (fun _ => .yes) kept
  .obj [
    ("settled", .arr (settled.map fun r => .obj [("id", .str (idText r.id)), ("shown", jShown r.shown)])),
    ("refused", .arr (refused.map fun (i, code) => .obj [("id", .str (idText i)), ("code", .str code)])),
    ("things", jPerThing (perThing kept)),
    ("sum", .obj [("value", .int sum.value), ("unread", .num sum.unread)])]

def rotations (xs : List Record) : List (List Record) :=
  (List.range xs.length).map fun i => xs.drop i ++ xs.take i

def realmVector (c : Case) : Except String J := do
  let orders := rotations c.forms
  let results := orders.map realmJ
  let first := results.headD .null
  if !(results.all (·.render 0 == first.render 0)) then
    throw s!"realm/{c.name}: arrival orders disagree"
  return vector c.name "realm" c.laws
    (.obj [("forms", .arr (c.forms.map jRecord))]) first

def vectors : Except String (List (String × J)) :=
  cases.mapM fun c => do pure (c.name, ← realmVector c)

end Gen.RealmVectors
