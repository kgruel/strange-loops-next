import Gen.Read
import Gen.Encode
import Gen.ByteText

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

def canonicalTextChecks : IO Unit := do
  -- The expected answers are independent of the decoder used by the vectors.
  for (n, pad) in [(16, 2), (32, 4), (64, 3)] do
    let ts := ByteTextVectors.texts n pad
    for (s, i) in ts.zipIdx do
      let accepted := i < 2
      -- Appending zero to the 32- or 64-byte encoding canonically encodes one
      -- extra byte. Only the fixed-width boundary must reject those texts.
      let canonical := accepted || (i == 3 && (n == 32 || n == 64))
      ensure ((Loops.unbase32 s).isSome == canonical) s!"R1 model decoder {n} bytes, case {i}"
      ensure ((Read.unbase32 s).isOk == canonical) s!"R1 fixture decoder {n} bytes, case {i}"
      ensure ((Read.bytes "bytes" (.str s)).isOk == canonical) s!"R1 fixture bytes {n}, case {i}"
      let prefixes := if n == 32 then ["r:", "h:", "k:"] else [""]
      for pre in prefixes do
        ensure ((Read.fixedBytes "bytes" n pre (.str (pre ++ s))).isOk == accepted)
          s!"R1 fixed boundary {pre}{n}, case {i}"
      if n == 32 then
        ensure (recordId ("r:" ++ s) == accepted) s!"R1 envelope id, case {i}"
        ensure ((Read.recordId "id" (.str ("r:" ++ s))).isOk == accepted) s!"R1 fixture id, case {i}"
        let e : Env := { kind := "note", observer := "o:test", emitted := "2026-10-21T00:00:00Z" }
        for (bad, code) in [({ e with prev := ["r:" ++ s] }, "prev-not-record-id"),
            ({ e with under := some ("r:" ++ s) }, "under-not-record-id"),
            ({ e with erases := ["r:" ++ s] }, "erases-not-record-id")] do
          ensure (bad.problem == if accepted then none else some code) s!"R1 {code}, case {i}"
    ensure (refused (Read.fixedBytes "bytes" n "k:" (.str ("h:" ++ ts.head!)))) s!"R1 prefix {n}"
    ensure (refused (Read.fixedBytes "bytes" n "" (.str (base32 (List.replicate (n - 1) 0)))))
      s!"R1 wrong decoded width {n}"
  let ids : List RecordId := [fixtureId 0, fixtureId 1, fixtureId 15, fixtureId 16,
    fixtureId 31, fixtureId 32, fixtureId 255, fixtureId 256,
    fixtureId (2 ^ 255), fixtureId (2 ^ 256 - 1)]
  for a in ids do
    for b in ids do
      ensure (decide (idText a < idText b) == decide (a < b))
        s!"R1 actual id text order {a.val}, {b.val}"
  let good := ["0000-01-01T00:00:00Z", "9999-12-31T23:59:59.999999999Z",
    "2000-02-29T12:34:56.5Z", "2026-10-21T00:00:00.000000001Z"]
  for s in good do
    let some t := instantParts? s.toList | throw (IO.userError s!"R4 refuses control {s}")
    ensure (t.text == s) s!"R4 parse/render {s}"
    ensure (instant? s.toList == some t.moment) s!"R4 actual parser moment {s}"
    ensure (validEmitted s && (Read.stampOf "emitted" (.str s)).isOk) s!"R4 emitted control {s}"
  let bad := ["2026-10-21T00:00:00+00:00", "2026-10-21T00:00:00-00:00",
    "2026-10-21T00:00:00+01:00", "2026-10-21T00:00:00-23:59",
    "2026-10-21T00:00:60Z", "2016-12-31T23:59:60Z", "2026-10-21T00:00:00.0Z",
    "2026-10-21T00:00:00.50Z", "2026-10-21T00:00:00.500Z",
    "2026-10-21T00:00:00.1234567891Z", "2026-10-21T00:00:00.Z"]
  let e : Env := { kind := "note", observer := "o:test", emitted := "2026-10-21T00:00:00Z" }
  for s in bad do
    ensure ((instant? s.toList).isNone && !validEmitted s) s!"R4 instant accepts {s}"
    ensure (refused (Read.stampOf "emitted" (.str s))) s!"R4 fixture emitted accepts {s}"
    ensure (({ e with emitted := s } : Env).problem == some "emitted-not-rfc3339") s!"R4 emitted code {s}"
    for occurred in [s, s ++ "/2027", "2026/" ++ s, s ++ "/.."] do
      ensure ((occurredSpan? occurred).isNone) s!"R4 occurred accepts {occurred}"
      ensure (refused (Read.claimOf "occurred" (.str occurred))) s!"R4 fixture occurred accepts {occurred}"
      ensure (({ e with occurred := some occurred } : Env).problem == some "occurred-not-span")
        s!"R4 occurred code {occurred}"
  -- Raw keys precede all value checks. The typed envelope keeps its existing rules.
  ensure (({ e with kind := "" } : Env).problem == some "kind-empty") "R6 typed kind rule changes"
  for fields in [[], [("kind", .str "")], [("kind", .int 7)], [("kind", .str "note")]] do
    let raw := Json.obj (fields ++ [("extension", .null)])
    ensure (match Read.env "env" raw with | .error why => why == "envelope-field-unknown" | _ => false)
      "R6 unknown key does not precede missing, empty or malformed values"
  ensure (firstRefusal ["kind-empty", "envelope-field-unknown"] == some "envelope-field-unknown")
    "R6 global write precedence changes"
  IO.println "R1/R4/R6 canonical text runtime checks pass"

def main (args : List String) : IO Unit := do
  canonicalTextChecks
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
  -- Exact output integers use the same grammar, member order, and text decoder.
  for text in ["9007199254740993", "-9007199254740993",
      "123456789012345678901234567890123456789012345678901234567890", "-0"] do
    let some expected := text.toInt? | throw (IO.userError "invalid exact test integer")
    ensure (match Read.parseExactIntegers text with | .ok (.int i) => i == expected | _ => false)
      s!"exact output integer {text}"
  for text in ["9007199254740993.0", "9007199254740993e0", "1.0", "1e2",
      "1.5", "-0.0", "1e-999", "1e999", "-1e999"] do
    ensure (reprStr (Read.parseExactIntegers text) == reprStr (Read.parseJson text))
      s!"exact mode changes non-integer spelling {text}"
  for text in ["01", "+1", "1.", "1e", "1e+", ".5", "NaN", "Infinity",
      "{\"a\":1,}", "[1,]", "\"\\ud800\"", "\"\\udc00\""] do
    ensure (reprStr (Read.parseExactIntegers text) == reprStr (Read.parseJson text))
      s!"exact mode changes syntax refusal {text}"
  let text := "{\"雪\\ud83d\\ude00\":[9007199254740993],\"雪😀\":-9007199254740993}"
  ensure (match Read.parseExactIntegers text with
    | .ok (.obj [(k, .arr [.int i]), (k', .int j)]) =>
      k == "雪😀" && k' == k && i == 9007199254740993 && j == -9007199254740993
    | _ => false) "exact mode changes order, duplicates, or Unicode"
  let .ok rounded := Read.parseJson "9007199254740993" | throw (IO.userError "input integer fails to parse")
  ensure (match rounded with | .number n => n.bits == (Number.ofScientific false 9007199254740992 0).bits | _ => false)
    "input API stops rounding unsafe integers once to binary64"
  let env : Env := { kind := "note", observer := "o:test", emitted := timeText 0 }
  let salt := List.replicate 16 (0 : UInt8)
  for text in ["9007199254740992", "-9007199254740992", "9007199254740991.5",
      "-9007199254740991.5", "1e30", "-1e30", "1.7976931348623157e308", "-1.7976931348623157e308"] do
    let j ← parsed text
    ensure (!j.inRange) s!"layer0 admits unsafe magnitude {text}"
    ensure (writeProblem env salt j == some "number-out-of-range") s!"writer admits unsafe magnitude {text}"
    ensure (!(refused (Read.valOf "payload" j))) s!"payload decoder refuses {text}"
    ensure (refused ((parseBound .payload "bound" j).mapError (·.code))) s!"bound admits {text}"
    ensure (refused ((parseArg .payload "arg" j).mapError (·.code))) s!"argument admits {text}"
  for text in ["9007199254740991", "-9007199254740991", "9007199254740991.1",
      "-9007199254740991.1", "1.5", "-1.5", "1424953923781206.25", "5e-324", "-0"] do
    let j ← parsed text
    ensure j.inRange s!"layer0 refuses within-range value {text}"
    ensure (writeProblem env salt j == none) s!"writer refuses within-range value {text}"
  for j in [Json.int 9007199254740992, .int (-9007199254740992),
      .obj [("largest", .int 9007199254740991),
        ("deep", .arr [.obj [("n", .int (-9007199254740992))]])],
      .obj [("__proto__", .int 9007199254740992)]] do
    ensure (!j.inRange) "layer0 admits raw unsafe integer"
    ensure (writeProblem env salt j == some "number-out-of-range") "writer admits raw unsafe integer"
  for text in ["1e400", "-1e400"] do
    let j ← parsed text
    ensure (!j.inRange) s!"layer0 admits overflow {text}"
    ensure (writeProblem env salt j == some "number-out-of-range") s!"writer admits overflow {text}"
    ensure (refused (Read.valOf "payload" j)) s!"payload decoder admits {text}"
    ensure (refused ((parseBound .payload "bound" j).mapError (·.code))) s!"bound admits {text}"
    ensure (refused ((parseArg .payload "arg" j).mapError (·.code))) s!"argument admits {text}"
  for bits in [0x7ff0000000000000, 0xfff0000000000000, 0x7ff8000000000000] do
    let j := Json.number ⟨bits⟩
    ensure (writeProblem env salt j == some "number-out-of-range") "writer admits nonfinite bits"
    ensure (refused (Read.valOf "payload" j)) "payload decoder admits nonfinite bits"
  ensure (firstRefusal ["number-out-of-range", "kind-empty"] == some "kind-empty")
    "global write priority changes"
  for (text, bits, expected) in [
      ("1424953923781206.25", 0x43143ff3c1cb0959, "1424953923781206.2"),
      ("-1424953923781206.25", 0xc3143ff3c1cb0959, "-1424953923781206.2")] do
    let j ← parsed text
    ensure (match j with | .number n => n.bits == bits && n.canon == expected | _ => false)
      s!"shortest midpoint tie {text}"
  for op in ["is", "not", "at-least", "below"] do
    for (text, accepted) in [("1.0", true), ("1e2", true), ("1.5", false),
        ("9007199254740992", false), ("-9007199254740992", false)] do
      let spec ← parsed ("{\"vertex\":\"x\",\"from\":[{\"store\":\".\"}],\"fold\":{\"c\":{\"count\":true,\"where\":{\"est\":{\"" ++ op ++ "\":" ++ text ++ "}}}}}")
      ensure (!(refused ((Spec.ofJson spec).mapError (·.code))) == accepted) s!"raw spec {op} {text}"
  let fraction ← parsed "1.5"
  ensure (fraction.inRange && writeProblem env salt fraction == none) "layer0 refuses finite fraction"
  ensure (refused ((parseArg .payload "arg" fraction).mapError (·.code))) "test accepts nonwhole argument"
  let base : Record := { id := fixtureId 1, kind := "note", observer := "o:test", about := ["t:one"], value := "", prev := [], emitted := stampAt 0, n := 1 }
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
  let a := { base with id := fixtureId 11, about := ["t:a", "t:b"] }
  let b := { base with id := fixtureId 12, about := ["t:a"], prev := [fixtureId 11] }
  let hs := wholeHeads [a, b]
  ensure ((hs.map (·.id)) == [fixtureId 12, fixtureId 11]) "global supersession removes another thing's head"
  ensure ((wholeHeads [a]).length == 1) "multi-thing head appears twice"
  ensure (Latest.winner (Latest.fold [a, b]) == some b) "latest misses newest whole-view head"
  ensure (Latest.others (Latest.fold [a, b]) == [a]) "latest misses whole-view conflict"
  IO.println s!"runtime checks pass; {count} RFC binary64 bit patterns pass"
