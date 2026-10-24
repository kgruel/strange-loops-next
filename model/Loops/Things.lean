import Loops.Families
import Loops.Json

/-!
# Things, and what a reader makes of what it holds

Before any vertex asks its question, a reader turns the records its places
hold into one set:

* **Settle.** Several places may hold different forms of one record: here in
  one, withheld or erased in another. The reader keeps one record per id:
  the payload if any place holds it, erased if an erase record in the set
  names it, and withheld otherwise. A form that arrives erased with no erase
  record behind it counts as withheld, so no place can blank a payload by
  claiming erasure, and erasure sticks once the erase record is held.
* **Admit.** `prev` is succession within a thing. A record whose `prev` names
  a held record it shares no thing with (`prev-unrelated`), or one the store's
  rule says it may not replace (`prev-not-permitted`), is refused. The rule is
  a parameter that reads only envelopes; step 2 allows everything.
* **Per thing.** Each thing's state is LatestBy over the records about it,
  over everything the reader holds, before any vertex selects. A record about
  several things lives in each; a record about nothing lives in one thing of
  its own. Supersession is a fact about the store, not about the question.
-/

namespace Loops

/-! ## Things -/

/-- The things a record is about. A record about nothing lives in the thing
`""`; real things are typed references, which are never empty. -/
def Record.things (r : Record) : List String := if r.about.isEmpty then [""] else r.about

def Record.isAbout (r : Record) (t : String) : Bool := r.things.contains t

def shares (a b : Record) : Bool := a.things.any b.things.contains

/-- Every thing the records are about, each once, in canonical order. -/
def thingsOf (xs : List Record) : List String := canonSet (xs.flatMap Record.things)

/-! ## Settling the forms several places hold -/

/-- Ids in ascending order, each once. -/
def idsOf (xs : List Record) : List Nat := xs.foldl (fun ns r => insertId r.id ns) []

def erasedIn (xs : List Record) (i : Nat) : Bool :=
  xs.any fun e => e.kind == "erase" && e.erases.contains i

/-- From the forms of one record: one that is here, or else the withheld form. -/
def baseForm (forms : List Record) : Option Record :=
  match forms.find? (·.shown == .here) with
  | some r => some r
  | none => forms.head?.map Record.withhold

/-- The one record a reader keeps for id `i`. -/
def pick (xs : List Record) (i : Nat) : Option Record :=
  (baseForm (xs.filter (·.id == i))).map fun r => if erasedIn xs i then r.erase else r

/-- One record per id, from every form the reader's places hold. -/
def settle (xs : List Record) : List Record := (idsOf xs).filterMap (pick xs)

/-- What places can hold of one record: the same envelope everywhere, and the
same payload wherever it is here. Content addressing gives this. -/
def Forms (xs : List Record) : Prop :=
  ∀ a ∈ xs, ∀ b ∈ xs, a.id = b.id → SameEnvelope a b ∧ (a.shown = .here → b.shown = .here → a = b)

/-! ## Admitting records by their `prev` -/

/-- A rule for who may replace whom. It reads only envelopes. -/
def EnvOnly (may : Record → Record → Bool) : Prop :=
  ∀ a a' b b', SameEnvelope a a' → SameEnvelope b b' → may a b = may a' b'

/-- Every held record `r` names in `prev` shares a thing with it, and the
store's rule lets `r` replace it. -/
def entitled (may : Record → Record → Bool) (xs : List Record) (r : Record) : Bool :=
  r.prev.all fun p => xs.all fun q => q.id != p || (shares r q && may r q)

/-- Why a record is refused, if it is. -/
def refusalOf (may : Record → Record → Bool) (xs : List Record) (r : Record) : Option String :=
  if !(r.prev.all fun p => xs.all fun q => q.id != p || shares r q) then some "prev-unrelated"
  else if !entitled may xs r then some "prev-not-permitted"
  else none

def admit (may : Record → Record → Bool) (xs : List Record) : List Record :=
  xs.filter (entitled may xs)

/-- What a reader folds: its places' forms settled, then admitted. -/
def realm (may : Record → Record → Bool) (xs : List Record) : List Record :=
  admit may (settle xs)

/-! ## Per thing -/

/-- A thing's state: LatestBy over the records about it. -/
def stateIn (t : String) (xs : List Record) : LatestBy :=
  LatestBy.fold .empty (xs.filter (·.isAbout t))

def perThing (xs : List Record) : List (String × LatestBy) :=
  (thingsOf xs).map fun t => (t, stateIn t xs)

end Loops
