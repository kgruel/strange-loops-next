import Loops.Record

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
and every id some `prev` names. A key's winner is its newest head; any other
heads for the key are a fork, shown as a conflict.
-/

/-- Insert into a strictly ascending list, keeping it duplicate-free. -/
def insertId (n : Nat) : List Nat → List Nat
  | [] => [n]
  | m :: ms => if n < m then n :: m :: ms else if n = m then m :: ms else m :: insertId n ms

/-- Insert into a newest-first list, keeping it duplicate-free. -/
def insertRec (r : Record) : List Record → List Record
  | [] => [r]
  | h :: t => if Newer r h then r :: h :: t else if r = h then h :: t else h :: insertRec r t

structure LatestBy where
  named : List Nat
  heads : List Record
  deriving Repr, DecidableEq, Inhabited

def LatestBy.step (s : LatestBy) (r : Record) : LatestBy :=
  let named := r.prev.foldl (fun ns n => insertId n ns) s.named
  let heads := s.heads.filter (fun h => !r.prev.contains h.id)
  { named := named
    heads := if named.contains r.id then heads else insertRec r heads }

def LatestBy.empty : LatestBy := ⟨[], []⟩

def LatestBy.fold (s : LatestBy) (xs : List Record) : LatestBy := xs.foldl LatestBy.step s

/-- The winner for a key: its newest head. -/
def LatestBy.winner (s : LatestBy) (k : String) : Option Record :=
  s.heads.find? (·.key == k)

/-- The other heads for a key: non-empty means the key is forked. -/
def LatestBy.others (s : LatestBy) (k : String) : List Record :=
  (s.heads.filter (·.key == k)).drop 1

/-! ## Latest

Latest is LatestBy with a single key: the newest head, and any other heads as
a fork. It follows `prev` chains instead of trusting clocks.
-/

def Latest.fold (xs : List Record) : LatestBy := LatestBy.fold LatestBy.empty xs

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
