import Loops.Record
import Loops.Json

/-!
# Fold

Two folds from the closed vocabulary. Each is a step function; folding is
`List.foldl` of the step, so feeding records in batches is the same as
feeding them at once by construction. The laws in `Laws.Fold` show the
result depends only on the set of records, not on their arrival order.
-/

namespace Loops

/-! ## Count -/

def Count.step (n : Nat) (_ : Record) : Nat := n + 1

def Count.fold (n : Nat) (xs : List Record) : Nat := xs.foldl Count.step n

/-! ## LatestBy

LatestBy keeps the records nothing names in `prev` (the heads), newest first,
and every id some `prev` names. It runs over the records about one thing: the
winner is the newest head, and any other heads are a fork, shown as a conflict.
-/

/-- Insert into a strictly ascending list, keeping it duplicate-free. -/
def insertId (n : RecordId) : List RecordId → List RecordId
  | [] => [n]
  | m :: ms => if n < m then n :: m :: ms else if n = m then m :: ms else m :: insertId n ms

/-- Insert into a newest-first list, keeping it duplicate-free. -/
def insertRec (r : Record) : List Record → List Record
  | [] => [r]
  | h :: t => if Newer r h then r :: h :: t else if r = h then h :: t else h :: insertRec r t

structure LatestBy where
  named : List RecordId
  heads : List Record
  deriving Repr, DecidableEq, Inhabited

def LatestBy.step (s : LatestBy) (r : Record) : LatestBy :=
  let named := r.prev.foldl (fun ns n => insertId n ns) s.named
  let heads := s.heads.filter (fun h => !r.prev.contains h.id)
  { named := named
    heads := if named.contains r.id then heads else insertRec r heads }

def LatestBy.empty : LatestBy := ⟨[], []⟩

def LatestBy.fold (s : LatestBy) (xs : List Record) : LatestBy := xs.foldl LatestBy.step s

/-- The winner: the newest head. LatestBy runs once per thing (`Loops.Things`),
so this is the thing's current record. -/
def LatestBy.winner (s : LatestBy) : Option Record := s.heads.head?

/-- The other heads: non-empty means the thing is forked. -/
def LatestBy.others (s : LatestBy) : List Record := s.heads.drop 1

/-! ## Whole-reader heads -/

/-- A record names its things or anchors its own id when about is empty. -/
def Record.things (r : Record) : List String := if r.about.isEmpty then [idText r.id] else r.about

def Record.isAbout (r : Record) (t : String) : Bool := r.things.contains t

def shares (a b : Record) : Bool := a.things.any b.things.contains

/-- Every thing the records are about, each once, in canonical order. -/
def thingsOf (xs : List Record) : List String := canonSet (xs.flatMap Record.things)

/-- A thing's state: LatestBy over the records about it. -/
def stateIn (t : String) (xs : List Record) : LatestBy :=
  LatestBy.fold .empty (xs.filter (·.isAbout t))

def perThing (xs : List Record) : List (String × LatestBy) :=
  (thingsOf xs).map fun t => (t, stateIn t xs)

/-- The union of what several places hold, each id once. -/
def dedup : List Record → List Record
  | [] => []
  | r :: rs => if rs.any (·.id == r.id) then dedup rs else r :: dedup rs

/-- Sort records in content order and keep each id once. -/
def orderHeads (xs : List Record) : List Record :=
  (dedup xs).foldl (fun hs r => insertRec r hs) []

/-- Combine the per-thing heads without global supersession. -/
def wholeHeads (xs : List Record) : List Record :=
  orderHeads ((perThing xs).flatMap fun ts => ts.2.heads)

/-! ## Latest -/

/-- Latest combines per-thing heads and their named ids. -/
def Latest.fold (xs : List Record) : LatestBy :=
  let states := (perThing xs).map (·.2)
  ⟨(states.flatMap (·.named)).foldl (fun ns n => insertId n ns) [], wholeHeads xs⟩

def Latest.winner (s : LatestBy) : Option Record := s.heads.head?

def Latest.others (s : LatestBy) : List Record := s.heads.drop 1

/-! ## Sum, Min, Max

Over an exact numeric field. Sum counts repeats, like Count; Min and Max
don't.
-/

def Sum.step (s : Int) (r : Record) : Int := s + r.n

def Sum.fold (s : Int) (xs : List Record) : Int := xs.foldl Sum.step s

def Max.step : Option Int → Record → Option Int
  | none, r => some r.n
  | some m, r => some (max m r.n)

def Max.fold (s : Option Int) (xs : List Record) : Option Int := xs.foldl Max.step s

def Min.step : Option Int → Record → Option Int
  | none, r => some r.n
  | some m, r => some (min m r.n)

def Min.fold (s : Option Int) (xs : List Record) : Option Int := xs.foldl Min.step s

end Loops
