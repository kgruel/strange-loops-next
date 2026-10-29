import Gen.Read
import Gen.Encode

open Loops Gen

def ensure (ok : Bool) (name : String) : IO Unit :=
  unless ok do throw (IO.userError name)

def parsed (s : String) : IO Json :=
  match Read.parseJson s with
  | .ok j => pure j
  | .error e => throw (IO.userError e)

def refused {α} : Except String α → Bool
  | .error _ => true
  | .ok _ => false

/-- Exercise the scenario decoder through its CLI. It is an executable, not
an importable library: importing Gen.Run would also import its main. -/
def scenarioDecoderChecks (root : String) : IO Unit := do
  let fixture := root ++ "/model/.lake/scenario-decoder-check.json"
  let some bin := (← IO.appPath).parent | throw (IO.userError "checks executable has no parent directory")
  let a : Record := {
    id := 1, kind := "note", observer := "sl:test", about := ["thing:test"],
    value := "base", prev := [], emitted := stampAt 100 }
  let b := { a with id := 2, prev := [a.id], emitted := stampAt 200 }
  let pair : J := .arr [.str (idText b.id), .str (idText a.id)]
  let fields : List (String × J) := [
    ("spec", .obj [("vertex", .str "decoder"), ("from", .arr [.obj [("store", .str ".")]]),
      ("fold", .obj [("count", .obj [("count", .bool true)])])]),
    ("thing", .str "thing:test"), ("records", .arr [jRecord a, jRecord b]),
    ("steps", .arr [.obj [("name", .str "held"),
      ("forms", .arr [.obj [("id", .str (idText a.id)), ("shown", .str "here")],
        .obj [("id", .str (idText b.id)), ("shown", .str "here")]]),
      ("orders", .arr [.arr [.str (idText a.id), .str (idText b.id)]])]])]
  let runInput (input : J) := do
    IO.FS.writeFile fixture ((J.obj [("layer", .str "scenario"), ("input", input)]).render 0)
    IO.Process.output { cmd := (bin / "run").toString, args := #[fixture] }
  let run (rule : Option J) := runInput (.obj (fields ++ rule.toList.map ("mayReplace", ·)))
  try
    for rule in [none, some (.arr []), some (.arr [pair])] do
      let out ← run rule
      ensure (out.exitCode == 0) s!"scenario decoder refuses valid rule: {out.stderr}"
      let .ok (.obj kvs) := Read.parseJson out.stdout | throw (IO.userError "scenario decoder output")
      let some (.arr [.obj step]) := kvs.lookup "steps" | throw (IO.userError "scenario decoder steps")
      let some (.arr admitted) := step.lookup "admitted" | throw (IO.userError "scenario decoder admitted")
      let expectedCount := if (rule.map (·.render 0)) == some ((J.arr []).render 0) then 1 else 2
      ensure (admitted.length == expectedCount) "scenario decoder loses absent/empty/allowed distinction"
      ensure ((step.lookup "refused").isSome == rule.isSome) "scenario refusal output presence"
      ensure ((kvs.lookup "lens").isNone) "scenario adds an absent lens"
    let unknown := J.str (idText 99)
    for rule in [J.null, .obj [], .arr [.null], .arr [.arr []], .arr [.arr [.str (idText a.id)]],
        .arr [.arr [.str (idText a.id), .str (idText b.id), .str (idText a.id)]],
        .arr [.arr [.num 1, .str (idText a.id)]],
        .arr [.arr [unknown, .str (idText a.id)]], .arr [.arr [.str (idText b.id), unknown]]] do
      let out ← run (some rule)
      ensure (out.exitCode != 0 && (out.stderr.splitOn "input.mayReplace").length > 1)
        s!"scenario decoder admits malformed rule: {rule.render 0}"
    let some (.arr [.obj step]) := fields.lookup "steps" | throw (IO.userError "scenario decoder fixture")
    for order in [J.arr [.str (idText a.id)],
        .arr [.str (idText a.id), .str (idText b.id), .str (idText b.id)]] do
      let steps := J.arr [.obj (step.map fun (k, v) =>
        (k, if k == "orders" then .arr [order] else v))]
      let out ← runInput (.obj (fields.map fun (k, v) => (k, if k == "steps" then steps else v)))
      ensure (out.exitCode != 0 && (out.stderr.splitOn "input.steps[0].orders[0]").length > 1)
        "scenario decoder admits an order with missing or repeated forms"
  finally
    IO.FS.removeFile fixture

def main (args : List String) : IO Unit := do
  let [root] := args | throw (IO.userError "expected repository root")
  let table ← IO.FS.readFile (root ++ "/vectors/standard/es6-numbers.txt")
  let mut count := 0
  for line in table.splitOn "\n" do
    if line.isEmpty then continue
    let [hex, expected] := line.splitOn "," | throw (IO.userError "invalid number table")
    let some digits := hex.toList.mapM Read.hexVal | throw (IO.userError "invalid bit pattern")
    let bits := (digits.foldl (fun n d => 16 * n + d) 0).toUInt64
    let n : Number := ⟨bits⟩
    ensure (n.canon == expected) s!"canonical bits {hex}: {n.canon}, expected {expected}"
    let j ← parsed expected
    let actual := match j with
      | .int i => Number.ofScientific (i < 0) i.natAbs 0 |>.bits
      | .number x => x.bits
      | _ => 0
    ensure (actual == bits || (n.magnitude == 0 && actual == 0)) s!"decimal roundtrip {hex}"
    count := count + 1
  for (text, expected) in [("1.0", 1), ("1e2", 100), ("-0", 0), ("-0.0", 0),
      ("1e-400", 0), ("-1e-400", 0), ("9007199254740991", 9007199254740991),
      ("9007199254740990.5", 9007199254740990)] do
    let j ← parsed text
    ensure (match j with | .int i => i == expected | _ => false) s!"safe-whole normalization {text}"
  for text in ["01", "+1", "1.", "1e", "1e+", ".5", "NaN", "Infinity"] do
    ensure (refused (Read.parseJson text)) s!"invalid RFC number survives: {text}"
  let env : Env := { kind := "note", observer := "o:test", emitted := timeText 0 }
  let salt := List.replicate 16 (0 : UInt8)
  for text in ["1e400", "-1e400", "9007199254740992", "-9007199254740992",
      "9007199254740991.5"] do
    let j ← parsed text
    ensure (!j.inRange) s!"layer0 range admits {text}"
    ensure (writeProblem env salt j == some "number-out-of-range") s!"write range admits {text}"
    if text == "1e400" || text == "-1e400" then
      ensure (refused (Read.valOf "payload" j)) s!"payload decoder admits {text}"
    else
      ensure (!(refused (Read.valOf "payload" j))) s!"payload decoder refuses {text}"
    ensure (refused ((parseBound .payload "bound" j).mapError (·.code))) s!"bound admits {text}"
    ensure (refused ((parseArg .payload "arg" j).mapError (·.code))) s!"argument admits {text}"
  for op in ["is", "not", "at-least", "below"] do
    for (text, accepted) in [("1.0", true), ("1e2", true), ("1.5", false),
        ("9007199254740992", false), ("-9007199254740992", false)] do
      let spec ← parsed ("{\"vertex\":\"x\",\"from\":[{\"store\":\".\"}],\"fold\":{\"c\":{\"count\":true,\"where\":{\"est\":{\"" ++ op ++ "\":" ++ text ++ "}}}}}")
      ensure (!(refused ((Spec.ofJson spec).mapError (·.code))) == accepted) s!"raw spec {op} {text}"
  let fraction ← parsed "1.5"
  ensure (fraction.inRange && writeProblem env salt fraction == none) "layer0 refuses finite fraction"
  ensure (refused ((parseArg .payload "arg" fraction).mapError (·.code))) "test accepts nonwhole argument"
  let base : Record := { id := 1, kind := "note", observer := "o:test", about := ["t:one"], value := "", prev := [], emitted := stampAt 0, n := 1 }
  let .obj kvs ← parsed (J.render 0 (jRecord base)) | throw (IO.userError "record is not an object")
  let changed (k : String) (v : Json) := Json.obj (kvs.map fun (name, old) => (name, if name == k then v else old))
  let .ok fractional := Read.record "record" (changed "n" fraction)
    | throw (IO.userError "decoder refuses nonwhole n")
  ensure (fractional.num "n" == none) "numeric slot reads a fraction"
  let unsafeInt := { base with fields := [("est", .int 9007199254740992)] }
  ensure (unsafeInt.num "est" == none) "numeric field reads unsafe integer"
  let unsafeValue ← parsed "9007199254740992"
  let .ok unsafeRecord := Read.record "record" (changed "fields" (.obj [("est", unsafeValue)]))
    | throw (IO.userError "decoder refuses unsafe numeric field")
  ensure (unsafeRecord.num "est" == none) "numeric field reads unsafe whole"
  let unsafeSum := (Sum.on "est").select (fun _ => .yes) [unsafeRecord]
  ensure (unsafeSum.unread == 1) "unsafe numeric field does not count unread"
  let .ok unsafeN := Read.record "record" (changed "n" unsafeValue)
    | throw (IO.userError "decoder refuses unsafe n")
  ensure (unsafeN.num "n" == none && ((Sum.on "n").select (fun _ => .yes) [unsafeN]).unread == 1)
    "unsafe n does not count unread"
  let sum := (Sum.on "n").select (fun _ => .yes) [base, fractional]
  ensure (sum.value == 1 && sum.unread == 1) "fraction does not count unread"
  let fixtureSum := Sum.acc.select (fun _ => .yes) [base, fractional]
  ensure (fixtureSum.value == 1 && fixtureSum.unread == 1) "fixture sum reads a fraction"
  ensure (!(Max.acc.readable fractional) && !(Min.acc.readable fractional)) "fixture extrema read a fraction"
  let maxHeads := LatestBy.maxHeads ⟨[], [base, fractional]⟩
  ensure (maxHeads.value == some 1 && maxHeads.unread == 1) "heads max reads a fraction"
  for about in [["untyped"], ["t:"], ["t:one", "bad"]] do
    ensure (refused (Read.record "record" (changed "about" (.arr (about.map .str))))) "untyped about survives"
  ensure (!(refused (Read.record "record" (.obj kvs)))) "typed about control fails"
  let sect : Lens.Section := ⟨"one".toList, ["body".toList]⟩
  ensure (Lens.parse (Lens.render [sect]) == some [sect]) "valid lens control fails"
  ensure ((Lens.parse (Lens.render [⟨[], []⟩])).isNone) "empty section id survives"
  ensure ((Lens.parse (Lens.render [sect, sect])).isNone) "duplicate section id survives"
  let a := { base with id := 11, about := ["t:a", "t:b"] }
  let b := { base with id := 12, about := ["t:a"], prev := [11] }
  let hs := wholeHeads [a, b]
  ensure ((hs.map (·.id)) == [12, 11]) "global supersession removes another thing's head"
  ensure ((wholeHeads [a]).length == 1) "multi-thing head appears twice"
  ensure (Latest.winner (Latest.fold [a, b]) == some b) "latest misses newest whole-view head"
  ensure (Latest.others (Latest.fold [a, b]) == [a]) "latest misses whole-view conflict"
  scenarioDecoderChecks root
  IO.println s!"runtime checks pass; {count} RFC binary64 bit patterns pass"
