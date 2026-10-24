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

def r (id : Nat) (kind : String) (about : List String) (t : Nat) (prev : List Nat := []) :
    Record :=
  { id, kind, about, value := "", prev, occurred := t, emitted := t }

-- one record, held in full in one place and erased in another
def full : Record := { r 0x51 "load" ["host:a"] 100 with n := 40 }
def eraseRec : Record := { r 0x52 "erase" [] 110 with erases := [0x51] }

-- a record about thing B naming one about thing A in `prev`
def a1 := r 0x61 "facet" ["thing:A"] 1
def b1 := r 0x62 "facet" ["thing:B"] 2 [0x61]

-- a record about two things, then a revision about one of them
def d1 := r 0x71 "status" ["svc:auth", "svc:billing"] 1
def d2 := r 0x72 "status" ["svc:auth"] 2 [0x71]

-- notes about nothing, revised
def m1 := r 0x81 "note" [] 1
def m2 := r 0x82 "note" [] 2 [0x81]

-- a task finished by a record of another kind
def t1 := r 0x91 "task" ["task:1"] 1
def t2 := r 0x92 "task-done" ["task:1"] 2 [0x91]

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
  ⟨"06-about-nothing", ["thing.local"], [m1, m2]⟩,
  ⟨"07-kind-change-supersedes", ["thing.local"], [t1, t2]⟩
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
