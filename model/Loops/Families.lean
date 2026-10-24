import Loops.Fold

/-!
# Two families of folds

Every fold depends only on the set of records it is handed, never on the
order they arrive in. Folds come in two families, each with one law:

* **Accumulating** folds (Count, Sum, Min, Max) have a step that commutes,
  so their state stays small and a late record folds onto it.
* Folds **over heads** follow `prev`. A new record can supersede one the
  answer rests on, and only the heads know what comes back, so the state is
  LatestBy's and the answer is worked out from it.

A reader may hold only envelopes for some records. Supersession reads only
envelopes, so a view never brings back a replaced record. A `where` test on
a missing payload answers unknown, and every result counts the records it
covers but couldn't read.
-/

namespace Loops

/-! ## What the realm hands a fold -/

/-- The union of what several places hold, each id once. -/
def dedup : List Record → List Record
  | [] => []
  | r :: rs => if rs.any (·.id == r.id) then dedup rs else r :: dedup rs

/-! ## Accumulating folds -/

/-- An accumulating fold: a step whose order never matters. -/
structure Acc (σ : Type) where
  init : σ
  step : σ → Record → σ
  comm : ∀ s a b, step (step s a) b = step (step s b) a
  /-- Whether the step reads the payload (Sum, Min, Max) or only counts. -/
  reads : Bool

def Acc.fold {σ} (f : Acc σ) (xs : List Record) : σ := xs.foldl f.step f.init

def Count.acc : Acc Nat :=
  ⟨0, Count.step, fun _ _ _ => rfl, false⟩

def Sum.acc : Acc Int :=
  ⟨0, Sum.step, fun s a b => by simp only [Sum.step]; omega, true⟩

def Max.acc : Acc (Option Int) :=
  ⟨none, Max.step, fun s a b => by
    cases s <;> simp only [Max.step, Option.some.injEq] <;> omega, true⟩

def Min.acc : Acc (Option Int) :=
  ⟨none, Min.step, fun s a b => by
    cases s <;> simp only [Min.step, Option.some.injEq] <;> omega, true⟩

/-! ## Folds over heads -/

/-- A fold over heads: LatestBy's state, and an answer worked out from it. -/
def OverHeads.fold {σ} (answer : LatestBy → σ) (xs : List Record) : σ :=
  answer (LatestBy.fold .empty xs)

/-- `limit`: the newest `k` heads, in content order. -/
def LatestBy.limit (k : Nat) (s : LatestBy) : List Record := s.heads.take k

/-! ## Reading what a reader holds -/

/-- A `where` answer: in, out, or unknown because the payload is missing. -/
inductive Tri where
  | yes
  | no
  | unknown
  deriving Repr, DecidableEq, Inhabited

def Tri.ofBool (b : Bool) : Tri := if b then .yes else .no

/-- `a` says no more than `b`: the same answer, or unknown. -/
def Tri.Refines (a b : Tri) : Prop := a = .unknown ∨ a = b

/-- A `where` test reads the envelope, which every reader holds, or the
payload, which a reader may not. -/
inductive Where where
  | envelope (t : Record → Bool) (only : ∀ a b, SameEnvelope a b → t a = t b)
  | payload (t : Record → Bool)

def Where.eval : Where → Record → Tri
  | .envelope t _, r => .ofBool (t r)
  | .payload t, r => if r.shown = .here then .ofBool (t r) else .unknown

/-- A result, and how many of the records it covers it couldn't read. -/
structure Result (σ : Type) where
  value : σ
  unread : Nat
  deriving Repr, DecidableEq

/-- Can this fold use this record? Count can always; the others need the payload. -/
def Acc.readable {σ} (f : Acc σ) (r : Record) : Bool := !f.reads || r.shown == .here

/-- Select with `where`, then fold. Records the test can't answer, and
selected records whose payload the fold needs but can't read, are counted,
never silently dropped. -/
def Acc.select {σ} (f : Acc σ) (w : Where) (xs : List Record) : Result σ :=
  let ys := xs.filter (w.eval · == .yes)
  ⟨f.fold (ys.filter f.readable),
    (xs.filter (w.eval · == .unknown)).length + (ys.filter (!f.readable ·)).length⟩

/-- Max over the current values: the largest readable head, and how many heads
were unreadable. -/
def LatestBy.maxHeads (s : LatestBy) : Result (Option Int) :=
  ⟨((s.heads.filter (·.shown == .here)).map (·.n)).max?,
    (s.heads.filter (·.shown != .here)).length⟩

end Loops
