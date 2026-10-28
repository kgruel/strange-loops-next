import Loops
import Gen.Json
import Gen.Encode

/-!
# Boundaries: what a law's premise buys

`lake exe boundaries <file>` writes, for some laws, the same question asked
twice: once with the law's premise holding, once without it. The model
computes both answers; this file checks that the first is what the law
promises and that the second differs, so a premise shown on the laws page is
one that matters. CI runs it and fails if the file changed.

These are not vectors. Several inputs here are ones the protocol does not
produce (two records under one id, a JSON object repeating a member, a lens
base keying two sections alike), and each says so in `input`, so no implementation reads them as cases to pass.
-/

open Loops Gen

/-- A case: the law, its premise, and the two sides, each a description of what goes
in and the model's answer. -/
structure Case where
  law : String
  premise : String
  input : String
  holds : String × String
  removed : String × String

def r (id : Nat) (value : String) (fields : List (String × Val) := []) : Record :=
  { id, kind := "task", observer := "sl:ada", about := ["task:1"], value, prev := [],
    emitted := stampAt 100, fields }

def tri : Tri → String
  | .yes => "yes"
  | .no => "no"
  | .unknown => "unknown"

def sel (x : Result Int) : String := s!"value {x.value} · unread {x.unread}"

def lensOut : Option (List Lens.Outcome) → String
  | none => "refused"
  | some [] => "nothing to apply"
  | some os => ", ".intercalate (os.map fun
      | .accepted i b => s!"accepted {String.ofList i}: {" / ".intercalate (b.map String.ofList)}"
      | .unknown i => s!"unknown {String.ofList i}"
      | .absent i => s!"absent {String.ofList i}")

def sec (id body : String) : Lens.Section := ⟨id.toList, [body.toList]⟩

def ids (rs : List Record) : String := ", ".intercalate (rs.map fun x => s!"{x.value}")

def cases : Except String (List Case) := do
  -- result.full: every record readable to the fold
  let est := Sum.on "est"
  let full := est.select (fun _ => .yes) [r 1 "a" [("est", .int 3)]]
  let short := est.select (fun _ => .yes) [r 1 "a" []]
  unless full.unread == 0 && full.value == 3 do throw "result.full: held side isn't the plain fold"
  if sel full == sel short then throw "result.full: removing the premise changes nothing"
  -- where.complements: the test answers
  let is := (⟨.payload "value", .is (.val (.str "yes"))⟩ : Cond)
  let isNot := (⟨.payload "value", .not (.val (.str "yes"))⟩ : Cond)
  let here := r 2 "yes"
  let pair (x : Record) := s!"is {tri (is.eval x)} · not {tri (isNot.eval x)}"
  unless (is.eval here == .yes && isNot.eval here == .no) do throw "where.complements: held side isn't one of each"
  if pair here == pair here.withhold then throw "where.complements: removing the premise changes nothing"
  -- latest-by.set: within one store an id names one record
  let one := r 7 "first"
  let other := r 8 "second"
  let twin := { r 7 "second" with }
  let winner (xs : List Record) : String :=
    match (LatestBy.fold .empty xs).winner with
    | some w => s!"winner {w.value}"
    | none => "no winner"
  let distinct := s!"{winner [one, other]} either way"
  unless winner [one, other] == winner [other, one] do throw "latest-by.set: held side depends on order"
  let a := winner [one, twin]
  let b := winner [twin, one]
  if a == b then throw "latest-by.set: two records under one id agree anyway"
  -- lens.no-op: the base's section ids are distinct
  let base := [sec "decision:auth" "Passkeys.", sec "decision:cache" "No cache."]
  let dup := [sec "decision:auth" "Passkeys.", sec "decision:auth" "Device flow."]
  let clean := Lens.edit base (Lens.render base)
  let dirty := Lens.edit dup (Lens.render dup)
  unless clean == some [] do throw "lens.no-op: held side has something to apply"
  if lensOut clean == lensOut dirty then throw "lens.no-op: removing the premise changes nothing"
  -- lens.put-get: the edit keeps exactly the base's sections
  let edited := [sec "decision:auth" "Passkeys everywhere.", sec "decision:cache" "No cache."]
  let dropped := [sec "decision:auth" "Passkeys everywhere."]
  let kept := Lens.apply base (Lens.diff base edited)
  let lost := Lens.apply base (Lens.diff base dropped)
  let shown (d : List Lens.Section) := " · ".intercalate (d.map fun x => String.ofList x.id ++ ": " ++ " / ".intercalate (x.body.map String.ofList))
  unless kept == edited do throw "lens.put-get: held side doesn't apply exactly"
  if lost == dropped then throw "lens.put-get: dropping a section applies anyway"
  -- record.member-order: member names distinct
  let distinctPairs : List (String × Json) := [("x", .int 1), ("y", .int 2)]
  let dupPairs : List (String × Json) := [("x", .int 1), ("x", .int 2)]
  let c (ps : List (String × Json)) := s!"{(Json.obj ps).canon} and {(Json.obj ps.reverse).canon}"
  unless (Json.obj distinctPairs).canon == (Json.obj distinctPairs.reverse).canon do throw "record.member-order: held side differs"
  if (Json.obj dupPairs).canon == (Json.obj dupPairs.reverse).canon then throw "record.member-order: duplicates agree anyway"
  return [
    { law := "result.full", premise := "every record is readable to the fold",
      input := "a valid input: a payload can lack a field",
      holds := ("sum of est over a record holding est = 3", sel full),
      removed := ("the same record, its payload here but with no est", sel short) },
    { law := "where.complements", premise := "the test answers",
      input := "a valid input: a reader may hold an envelope without its payload",
      holds := ("is and not \"yes\" on a record whose value is yes", pair here),
      removed := ("the same tests, the payload withheld", pair here.withhold) },
    { law := "latest-by.set", premise := "within one store an id names one record",
      input := "needs a hash collision: an id is the hash of what the record says",
      holds := (s!"records {ids [one, other]} under two ids, in either order", distinct),
      removed := (s!"records {ids [one, twin]} under one id: one order, then the other", s!"{a}, then {b}") },
    { law := "lens.no-op", premise := "the base's section ids are distinct",
      input := "not produced when each thing is rendered once",
      holds := ("parse an unedited render of two sections", lensOut clean),
      removed := ("the same, both sections keyed decision:auth", lensOut dirty) },
    { law := "lens.put-get", premise := "the edit keeps exactly the base's sections",
      input := "a valid input: anyone may delete a section from the text",
      holds := ("edit decision:auth, keep decision:cache", s!"{shown kept} (the edit, exactly)"),
      removed := ("edit decision:auth, drop decision:cache", s!"{shown lost} (not the edit: the dropped section stays)") },
    { law := "record.member-order", premise := "member names are distinct",
      input := "refused at layer 0 (member-duplicate), so no record holds it",
      holds := ("{\"x\":1,\"y\":2}, its members in both orders", c distinctPairs),
      removed := ("{\"x\":1,\"x\":2}, its members in both orders", c dupPairs) }
  ]

def jSide (s : String × String) : J := .obj [("given", .str s.1), ("answer", .str s.2)]

def main (args : List String) : IO UInt32 := do
  let [file] := args | IO.eprintln "usage: boundaries <file>"; return 1
  match cases with
  | .error e => IO.eprintln e; return 1
  | .ok cs =>
    let j := J.obj [("cases", .arr (cs.map fun c => .obj [("law", .str c.law), ("premise", .str c.premise),
      ("input", .str c.input), ("holds", jSide c.holds), ("removed", jSide c.removed)]))]
    IO.FS.writeFile file (j.render 0 ++ "\n")
    IO.println s!"wrote {cs.length} boundaries to {file}"
    return 0
