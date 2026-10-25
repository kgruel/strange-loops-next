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

/-- Why a record is refused when it is written, if it is: its envelope first,
then a payload number outside ±(2^53 − 1), which is refused rather than
rounded (`number-out-of-range`). -/
def writeProblem (env : Env) (payload : Json) : Option String :=
  env.problem <|> if payload.inRange then none else some "number-out-of-range"

/-- An opening checks against a commitment the reader already holds. -/
def opens (H : Hash) (commit : String) (salt : List UInt8) (payload : Json) : Bool :=
  commitOf H salt payload == commit

/-- The bytes a signature covers. -/
def signingInput (id : String) : List UInt8 := utf8 ("loops/record/v1:" ++ id)

end Loops
