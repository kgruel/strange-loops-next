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

/-! ## Upsert

Upsert keeps the records nothing names in `prev` (the heads), newest first,
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

structure Upsert where
  named : List Nat
  heads : List Record
  deriving Repr, DecidableEq, Inhabited

def Upsert.step (s : Upsert) (r : Record) : Upsert :=
  let named := r.prev.foldl (fun ns n => insertId n ns) s.named
  let heads := s.heads.filter (fun h => !r.prev.contains h.id)
  { named := named
    heads := if named.contains r.id then heads else insertRec r heads }

def Upsert.empty : Upsert := ⟨[], []⟩

def Upsert.fold (s : Upsert) (xs : List Record) : Upsert := xs.foldl Upsert.step s

/-- The winner for a key: its newest head. -/
def Upsert.winner (s : Upsert) (k : String) : Option Record :=
  s.heads.find? (·.key == k)

/-- The other heads for a key: non-empty means the key is forked. -/
def Upsert.others (s : Upsert) (k : String) : List Record :=
  (s.heads.filter (·.key == k)).drop 1

end Loops
