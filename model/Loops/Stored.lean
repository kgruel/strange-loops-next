import Loops.Envelope
import Loops.Base32

/-!
# Storing a record

A record commits to its payload and is named by its envelope and that
commitment:

* `commit = "h:" + base32(H(salt ++ canonical(payload)))`
* `id = "r:" + base32(H(canonical({"commit": commit, "env": env})))`
* a signature is Ed25519 over `"loops/record/v1:" + id`, kept beside the record

Erasing a record forgets the opening (salt and payload) and keeps the
commitment, so the id never changes. `H` is a parameter: the laws hold for
any hash, and the vectors use SHA-256.
-/

namespace Loops

abbrev Hash := List UInt8 → List UInt8

def utf8 (s : String) : List UInt8 := s.toUTF8.toList

def commitOf (H : Hash) (salt : List UInt8) (payload : Json) : String :=
  "h:" ++ base32 (H (salt ++ utf8 payload.canon))

def idPreimage (env : Env) (commit : String) : String :=
  (Json.obj [("commit", .str commit), ("env", env.toJson)]).canon

def idOf (H : Hash) (env : Env) (commit : String) : String :=
  "r:" ++ base32 (H (utf8 (idPreimage env commit)))

/-- What a store holds besides the envelope: the opening, or only the commitment. -/
inductive Body where
  | opening (salt : List UInt8) (payload : Json)
  | erased (commit : String)
  deriving Repr

structure Stored where
  env  : Env
  body : Body
  deriving Repr

def Stored.commit (H : Hash) (r : Stored) : String :=
  match r.body with
  | .opening salt payload => commitOf H salt payload
  | .erased c => c

def Stored.id (H : Hash) (r : Stored) : String := idOf H r.env (r.commit H)

def make (env : Env) (salt : List UInt8) (payload : Json) : Stored :=
  ⟨env, .opening salt payload⟩

def erase (H : Hash) (r : Stored) : Stored := ⟨r.env, .erased (r.commit H)⟩

/-! ## Writing

Every record is written through `write`, one at a time or in a batch. It
refuses, in this order: a bad envelope (`Env.problem`), a salt that isn't 16
bytes (`salt-not-16-bytes`), a payload with a repeated member name at any
depth (`member-duplicate`), and a payload number outside ±(2^53 − 1)
(`number-out-of-range`). What it returns carries the proof that every check
passed, so the laws that need those facts take them from the record itself.
-/

/-- Why a record is refused when it is written, if it is. -/
def writeProblem (env : Env) (salt : List UInt8) (payload : Json) : Option String :=
  match env.problem with
  | some why => some why
  | none =>
    if salt.length ≠ 16 then some "salt-not-16-bytes"
    else if payload.keysDistinct = false then some "member-duplicate"
    else if payload.inRange = false then some "number-out-of-range"
    else none

/-- Everything `write` checks. -/
structure Writable (env : Env) (salt : List UInt8) (payload : Json) : Prop where
  env : env.problem = none
  salt : salt.length = 16
  members : payload.keysDistinct = true
  range : payload.inRange = true

theorem writeProblem_none {env : Env} {salt : List UInt8} {payload : Json} :
    writeProblem env salt payload = none ↔ Writable env salt payload := by
  unfold writeProblem
  constructor
  · intro hn
    split at hn
    · cases hn
    · rename_i he
      by_cases hs : salt.length = 16
      · by_cases hk : payload.keysDistinct = true
        · by_cases hr : payload.inRange = true
          · exact ⟨he, hs, hk, hr⟩
          · simp [hs, hk, hr] at hn
        · simp [hs, hk] at hn
      · simp [hs] at hn
  · rintro ⟨he, hs, hk, hr⟩
    simp [he, hs, hk, hr]

/-- A record that passed every check `write` makes, with the proof. -/
structure Written where
  env : Env
  salt : List UInt8
  payload : Json
  ok : Writable env salt payload

def Written.stored (w : Written) : Stored := make w.env w.salt w.payload

/-- Every code `writeProblem` can give, in the order it checks them. -/
def writeCodes : List String :=
  ["kind-empty", "observer-not-typed", "emitted-not-rfc3339", "occurred-not-span",
    "about-not-typed", "prev-not-record-id", "under-not-record-id", "erases-not-record-id",
    "salt-not-16-bytes", "member-duplicate", "number-out-of-range"]

/-- Of several write refusals, the one reported: the first in `writeCodes`.
A code outside the list still refuses (`writeProblem_codes` says there is none). -/
def firstRefusal (codes : List String) : Option String :=
  writeCodes.find? codes.contains <|> codes.head?

/-- Write a record: the first refusal, or the record with its proof. -/
def write (env : Env) (salt : List UInt8) (payload : Json) : Except String Written :=
  match h : writeProblem env salt payload with
  | some why => .error why
  | none => .ok ⟨env, salt, payload, writeProblem_none.1 h⟩

/-- An opening checks against a commitment the reader already holds. -/
def opens (H : Hash) (commit : String) (salt : List UInt8) (payload : Json) : Bool :=
  commitOf H salt payload == commit

/-- The bytes a signature covers. -/
def signingInput (id : String) : List UInt8 := utf8 ("loops/record/v1:" ++ id)

end Loops
