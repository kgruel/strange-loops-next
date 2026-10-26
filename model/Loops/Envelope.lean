import Loops.Json
import Loops.Occurred

/-!
# Envelope

What the core reads about a record. `about` and `prev` are sets: their
canonical form is sorted by UTF-16 code units with repeats removed, and an
empty set is left out, so the same set always gives the same bytes. `erases`
is a set too: the records whose payloads this one erases, whatever its kind.
-/

namespace Loops

structure Env where
  kind     : String
  observer : String
  emitted  : String
  occurred : Option String := none
  about    : List String := []
  prev     : List String := []
  under    : Option String := none
  erases   : List String := []
  deriving Repr, Inhabited

def Env.toJson (e : Env) : Json :=
  let opt (k : String) : Option String → List (String × Json)
    | some v => [(k, .str v)]
    | none => []
  let set (k : String) (xs : List String) : List (String × Json) :=
    match canonSet xs with
    | [] => []
    | ys => [(k, .arr (ys.map .str))]
  .obj ([("kind", .str e.kind), ("observer", .str e.observer), ("emitted", .str e.emitted)] ++
    opt "occurred" e.occurred ++ set "about" e.about ++ set "prev" e.prev ++ opt "under" e.under ++
    set "erases" e.erases)

/-! ## Validation -/

def isLowerAlnum (c : Char) : Bool := c.isLower || c.isDigit

/-- `prefix:value`, the prefix lower-case letters, digits and hyphens, starting with a letter. -/
def typedRef (s : String) : Bool :=
  match s.toList.span (· != ':') with
  | (p :: ps, ':' :: _ :: _) => p.isLower && ps.all (fun c => isLowerAlnum c || c == '-')
  | _ => false

/-- A record id: `r:` and 52 base32 characters (a SHA-256 digest). -/
def recordId (s : String) : Bool :=
  match s.toList with
  | 'r' :: ':' :: rest => rest.length == 52 && rest.all fun c => c.isLower || ('2' ≤ c && c ≤ '7')
  | _ => false

/-- Why an envelope is refused, if it is. -/
def Env.problem (e : Env) : Option String :=
  if e.kind.isEmpty then some "kind-empty"
  else if !typedRef e.observer then some "observer-not-typed"
  else if !validEmitted e.emitted then some "emitted-not-rfc3339"
  else if !(e.occurred.map fun s => (occurredSpan? s).isSome).getD true then some "occurred-not-span"
  else if !e.about.all typedRef then some "about-not-typed"
  else if !e.prev.all recordId then some "prev-not-record-id"
  else if !(e.under.map recordId).getD true then some "under-not-record-id"
  else if !e.erases.all recordId then some "erases-not-record-id"
  else none

end Loops
