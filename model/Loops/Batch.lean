import Loops.Stored

/-!
# A batch with labels

`loops emit -` reads one changeset. A record in it may name another record of
the same batch by a label, `@name`, in `about` or `prev`, before either has an
id. A record's id covers its envelope, so a label must be replaced by the id
it stands for before the record that uses it can be named.

Each record is written through `write`, as a single record would be, so a
batch can't store what writing one record would refuse. Writing also checks
each `prev`: you can only replace what you hold, so a target must be in the
batch or the store (`prev-unknown`), and succession is within a thing, so it
must share a thing with the record (`prev-unrelated`). Every check runs
across the whole batch, so which refusal is reported never depends on the
order of drafts or of a `prev` set.

A batch **means** an assignment of ids to labels in which every label's id is
the id of its record with all its labels replaced: exactly what writing the
records one at a time with real ids would give. An acyclic batch has at most
one meaning (`Laws.Batch`), so the order drafts are listed or resolved in
never matters. A label used but never given, a label given twice and a cycle
are refused.
-/

namespace Loops

/-- A record in a batch, before its id is known. -/
structure Draft where
  label : Option String := none
  env : Env
  salt : List UInt8
  payload : Json
  deriving Repr

def isLabel (s : String) : Bool := s.startsWith "@"

/-- Replace each label with its id, keeping ids as they are. -/
def subst (σ : String → Option String) : List String → Option (List String)
  | [] => some []
  | s :: ss => do
    let x ← if isLabel s then σ s else some s
    let xs ← subst σ ss
    pure (x :: xs)

def substEnv (σ : String → Option String) (e : Env) : Option Env := do
  pure { e with about := ← subst σ e.about, prev := ← subst σ e.prev }

/-- The labels a draft uses. -/
def Draft.refs (d : Draft) : List String := (d.env.about ++ d.env.prev).filter isLabel

def Draft.commit (H : Hash) (d : Draft) : String := commitOf H d.salt d.payload

/-- What a batch means: every label's id is the id of its record with real ids. -/
structure Meaning (H : Hash) (ds : List Draft) (σ : String → Option String) : Prop where
  given : ∀ d ∈ ds, ∀ l, d.label = some l →
    ∃ e, substEnv σ d.env = some e ∧ σ l = some (idOf H e (d.commit H))
  only : ∀ l, (∀ d ∈ ds, d.label ≠ some l) → σ l = none

/-! ## Resolving -/

def Draft.ready (σ : List (String × String)) (d : Draft) : Bool :=
  d.refs.all fun r => (σ.lookup r).isSome

/-- Give ids, round by round, to drafts whose labels all have one. -/
def resolveRounds (H : Hash) : Nat → List (String × String) → List Draft →
    Except String (List (String × String))
  | _, σ, [] => pure σ
  | 0, _, _ => throw "label-cycle"
  | fuel + 1, σ, pending =>
    let ready := pending.filter (·.ready σ)
    if ready.isEmpty then throw "label-cycle"
    else
      let given := ready.filterMap fun d =>
        match d.label, substEnv (fun r => σ.lookup r) d.env with
        | some l, some e => some (l, idOf H e (d.commit H))
        | _, _ => none
      resolveRounds H fuel (σ ++ given) (pending.filter (!·.ready σ))

/-- The things a record is about, as `Record.things` reads them: a record
about nothing anchors a thing of its own, named by its id. -/
def envThings (id : String) (about : List String) : List String :=
  if about.isEmpty then [id] else about

/-- Each `prev` names a record the writer holds, in the batch or in the store
(`held` gives a stored record's `about`), and shares a thing with it. Checked
across the whole batch, so the refusal never depends on the order of drafts
or of a `prev` set: any `prev-unknown` first, then any `prev-unrelated`. -/
def checkPrev (H : Hash) (held : String → Option (List String)) (rs : List Stored) :
    Except String Unit := do
  let inBatch := rs.map fun r => (r.id H, r.env.about)
  let target := fun p => inBatch.lookup p <|> held p
  if rs.any fun r => r.env.prev.any fun p => (target p).isNone then throw "prev-unknown"
  if rs.any fun r => r.env.prev.any fun p => (target p).any fun about =>
      !(envThings (r.id H) r.env.about).any (envThings p about).contains then
    throw "prev-unrelated"

/-- Resolve a batch to its records, in the order given, each written through
`write`. Checked in order: a label given twice, a label used but never given,
a cycle, any draft `write` refuses (reporting the code first in `writeCodes`
among them), a `prev` naming a record the writer doesn't hold, and a `prev`
naming one about other things. -/
def resolveBatch (H : Hash) (held : String → Option (List String)) (ds : List Draft) :
    Except String (List Written) := do
  let labels := ds.filterMap (·.label)
  unless labels.Nodup do throw "label-duplicate"
  unless ds.all (·.refs.all labels.contains) do throw "label-unknown"
  let σ ← resolveRounds H ds.length [] ds
  let es ← ds.mapM fun d => match substEnv (fun r => σ.lookup r) d.env with
    | some e => pure (e, d)
    | none => throw "label-cycle"
  if let some why := firstRefusal (es.filterMap fun (e, d) => writeProblem e d.salt d.payload) then
    throw why
  let ws ← es.mapM fun (e, d) => write e d.salt d.payload
  checkPrev H held (ws.map Written.stored)
  pure ws

end Loops
