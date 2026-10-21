import Loops
import Gen.Json
import Gen.Ed25519

/-!
# Record vectors

Layer 0 end to end: canonical bytes, commitment, id, erasure and signature,
plus the envelopes the core refuses. Hashes are SHA-256 and signatures
Ed25519, both checked against their standards before anything is written.
-/

namespace Gen.Records

open Loops

def H : Hash := sha256

partial def ofJson : Json → J
  | .null => .null
  | .bool b => .bool b
  | .int i => .int i
  | .str s => .str s
  | .arr xs => .arr (xs.map ofJson)
  | .obj kvs => .obj (kvs.map fun (k, v) => (k, ofJson v))

/-- The envelope as a writer hands it over: sets in the writer's order. -/
def envInput (e : Env) : J :=
  let opt (k : String) : Option String → List (String × J)
    | some v => [(k, .str v)]
    | none => []
  let set (k : String) (xs : List String) : List (String × J) :=
    if xs.isEmpty then [] else [(k, .arr (xs.map .str))]
  .obj ([("kind", .str e.kind), ("observer", .str e.observer), ("emitted", .str e.emitted)] ++
    opt "occurred" e.occurred ++ set "about" e.about ++ set "prev" e.prev ++ opt "under" e.under)

def textBytes (s : String) : List UInt8 := s.toUTF8.toList

def seedFor (name : String) : List UInt8 := sha256 (textBytes ("loops vector key " ++ name))
def saltFor (name : String) : List UInt8 := (sha256 (textBytes ("loops vector salt " ++ name))).take 16

def keyText (seed : List UInt8) : String := "k:" ++ base32 (Ed25519.publicKey seed)

def lineageFor (name : String) : String := "sl:" ++ base32 (sha256 (textBytes ("genesis " ++ name)))

def kyle := lineageFor "kyle"
def wren := lineageFor "wren"

def storedJson (env : Env) (salt : List UInt8) (payload : Json) (seed : List UInt8) : Json :=
  let r := make env salt payload
  let id := r.id H
  .obj [("id", .str id), ("env", env.toJson), ("salt", .str (base32 salt)), ("payload", payload),
    ("sig", .obj [("key", .str (keyText seed)),
      ("ed25519", .str (base32 (Ed25519.sign seed (signingInput id))))])]

def erasedJson (env : Env) (salt : List UInt8) (payload : Json) (seed : List UInt8) : Json :=
  let r := make env salt payload
  let id := r.id H
  .obj [("id", .str id), ("env", env.toJson), ("commit", .str (r.commit H)),
    ("sig", .obj [("key", .str (keyText seed)),
      ("ed25519", .str (base32 (Ed25519.sign seed (signingInput id))))])]

structure Case where
  name : String
  laws : List String
  /-- Envelopes that must all give the same id (sets in different orders, repeats). -/
  envs : List Env
  /-- Payloads that must all give the same commitment (members in different orders). -/
  payloads : List Json
  key : String := "kyle"

def sealedVector (c : Case) : Except String J := do
  let env := c.envs.headD default
  let payload := c.payloads.headD .null
  if let some why := env.problem then throw s!"record/{c.name}: unexpectedly refused: {why}"
  let salt := saltFor c.name
  let seed := seedFor c.key
  let r := make env salt payload
  let ids := c.envs.map fun e => idOf H e (r.commit H)
  let commits := c.payloads.map fun p => commitOf H salt p
  if !ids.all (· == r.id H) then throw s!"record/{c.name}: envelope variants disagree"
  if !commits.all (· == r.commit H) then throw s!"record/{c.name}: payload variants disagree"
  if (erase H r).id H != r.id H then throw s!"record/{c.name}: erasure changed the id"
  let id := r.id H
  return .obj [("vector", .str c.name), ("layer", .str "record"), ("laws", .arr (c.laws.map .str)),
    ("source", .str "model"),
    ("input", .obj [("envs", .arr (c.envs.map envInput)), ("payloads", .arr (c.payloads.map ofJson)),
      ("salt", .str (base32 salt)), ("seed", .str (base32 seed))]),
    ("expect", .obj [
      ("env_canonical", .str env.toJson.canon),
      ("payload_canonical", .str payload.canon),
      ("commit", .str (r.commit H)),
      ("id_preimage", .str (idPreimage env (r.commit H))),
      ("id", .str id),
      ("signing_input", .str ("loops/record/v1:" ++ id)),
      ("key", .str (keyText seed)),
      ("ed25519", .str (base32 (Ed25519.sign seed (signingInput id)))),
      ("line", .str (storedJson env salt payload seed).canon),
      ("erased_line", .str (erasedJson env salt payload seed).canon)])]

def refusedVector (name : String) (env : Env) : Except String J := do
  match env.problem with
  | none => throw s!"record/{name}: expected a refusal"
  | some why =>
    return .obj [("vector", .str name), ("layer", .str "record"), ("laws", .arr [.str "record.refuse"]),
      ("source", .str "model"), ("input", .obj [("envs", .arr [envInput env]),
        ("payloads", .arr [.obj []])]),
      ("expect", .obj [("refused", .str why)])]

/-! ## Cases -/

def note (emitted : String := "2026-10-21T05:30:00-04:00") : Env :=
  { kind := "note", observer := kyle, emitted }

def r1Id : String :=
  (make (note) (saltFor "01-minimal") (.obj [("body", .str "hello")])).id H

def grantId : String :=
  (make { kind := "grant", observer := kyle, emitted := "2026-10-20T12:00:00Z" }
    (saltFor "grant") (.obj [("to", .str wren)])).id H

def sealedCases : List Case := [
  { name := "01-minimal", laws := ["record.id", "record.commit", "record.sign"],
    envs := [note], payloads := [.obj [("body", .str "hello")]] },
  { name := "02-full-envelope", laws := ["record.id", "record.sets"],
    envs := [{
      kind := "decision", observer := wren, emitted := "2026-10-21T09:15:02.250+01:00",
      occurred := some "2026-10-17T09:14/PT4M", about := ["topic:auth", "url:https://example.com/x"],
      prev := [r1Id], under := some grantId }],
    payloads := [.obj [("choice", .str "device flow"), ("why", .arr [.str "no browser on the box"])]],
    key := "wren" },
  { name := "03-sets-are-sets", laws := ["record.sets"],
    envs := [
      { note with about := ["topic:auth", "svc:api", "url:https://example.com/x"] },
      { note with about := ["url:https://example.com/x", "topic:auth", "svc:api"] },
      { note with about := ["svc:api", "topic:auth", "svc:api", "url:https://example.com/x", "topic:auth"] }],
    payloads := [.obj [("body", .str "same set, any order")]] },
  { name := "04-member-order", laws := ["record.member-order"],
    envs := [note],
    payloads := [
      .obj [("b", .int 2), ("a", .int 1), ("c", .obj [("y", .bool true), ("x", .null)])],
      .obj [("c", .obj [("x", .null), ("y", .bool true)]), ("a", .int 1), ("b", .int 2)]] },
  { name := "05-unicode", laws := ["record.canonical"],
    envs := [note],
    payloads := [.obj [
      ("text", .str "tab\there, quote \" and backslash \\, newline\nand \x01 control"),
      ("emoji", .str "😀 and ש"), ("line-sep", .str "a b"),
      (String.singleton (Char.ofNat 0x1F600), .str "astral key"),
      (String.singleton (Char.ofNat 0xFB33), .str "BMP key above the surrogates"),
      ("€", .str "euro key")]] },
  { name := "06-values", laws := ["record.canonical"],
    envs := [note],
    payloads := [.obj [("null", .null), ("t", .bool true), ("f", .bool false), ("zero", .int 0),
      ("neg", .int (-42)), ("max-safe", .int 9007199254740991), ("empty-arr", .arr []),
      ("empty-obj", .obj []), ("nested", .arr [.arr [.int 1, .arr []], .obj [("k", .str "")]])]] },
  { name := "07-payload-not-object", laws := ["record.canonical"],
    envs := [note], payloads := [.arr [.str "a payload can be any JSON value", .int 7]] },
  { name := "08-erasure", laws := ["record.erasure"],
    envs := [{
      kind := "note", observer := lineageFor "dev2", emitted := "2026-03-04T10:12:44-05:00",
      about := [r1Id] }],
    payloads := [.obj [("body", .str "Called the customer back at 555-0100")]], key := "dev2" },
  { name := "09-leap-second", laws := ["record.emitted"],
    envs := [note "2016-12-31T23:59:60Z"], payloads := [.obj []] }
]

def refusedCases : List (String × Env) := [
  ("20-kind-empty", { note with kind := "" }),
  ("21-observer-untyped", { note with observer := "kyle" }),
  ("22-emitted-no-offset", note "2026-10-21T05:30:00"),
  ("23-emitted-lowercase", note "2026-10-21t05:30:00z"),
  ("24-emitted-no-such-day", note "2026-02-29T00:00:00Z"),
  ("25-emitted-bad-offset", note "2026-10-21T05:30:00+24:00"),
  ("26-about-untyped", { note with about := ["auth"] }),
  ("27-prev-not-record", { note with prev := ["topic:auth"] }),
  ("28-under-not-record", { note with under := some "r:short" })
]

/-! ## Standards the reference code must meet before it writes anything -/

def selfCheck : Except String Unit := do
  let check (what : String) (got want : String) : Except String Unit :=
    if got == want then pure () else throw s!"self-check failed: {what}: {got} ≠ {want}"
  check "sha256 abc" (hex (sha256 (textBytes "abc")))
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  check "sha256 empty" (hex (sha256 []))
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  check "sha256 two blocks" (hex (sha256 (textBytes "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
  check "sha512 abc" (hex (sha512 (textBytes "abc")))
    ("ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a" ++
     "2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f")
  -- RFC 8032 section 7.1, TEST 1 and TEST 2
  let s1 := unhex "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
  check "ed25519 test 1 key" (hex (Ed25519.publicKey s1))
    "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
  check "ed25519 test 1 sig" (hex (Ed25519.sign s1 []))
    ("e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555" ++
     "fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b")
  let s2 := unhex "4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb"
  check "ed25519 test 2 sig" (hex (Ed25519.sign s2 [0x72]))
    ("92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da" ++
     "085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00")
  -- RFC 4648 section 10, lower-cased and unpadded
  check "base32" (", ".intercalate (["", "f", "fo", "foo", "foob", "fooba", "foobar"].map
      fun s => base32 (textBytes s)))
    ", my, mzxq, mzxw6, mzxw6yq, mzxw6ytb, mzxw6ytboi"

def vectors : Except String (List (String × J)) := do
  selfCheck
  let sealed ← sealedCases.mapM fun c => do pure (c.name, ← sealedVector c)
  let refused ← refusedCases.mapM fun (n, e) => do pure (n, ← refusedVector n e)
  return sealed ++ refused

end Gen.Records
