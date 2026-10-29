import Loops.Spec

/-!
# Proposed as-of selection

Settle all held forms before selection. Keep erasure effects when selection removes an eraser.
-/

namespace Loops.Proposals.AsOf

/-- Each cutoff includes its moment. No cutoff accepts every moment. -/
structure Cuts where
  emittedThrough : Option Moment := none
  occurredThrough : Option Moment := none
  deriving Repr, DecidableEq, Inhabited

/-- Test an inclusive cutoff. -/
def before : Option Moment → Moment → Bool
  | none, _ => true
  | some cut, moment => decide (moment ≤ cut)

/-- Read the occurrence span's start. Use emitted time when occurrence is absent. -/
def accepts (cuts : Cuts) (r : Record) : Bool :=
  before cuts.emittedThrough r.emitted.moment && before cuts.occurredThrough r.span.start

/-- Select records without changing their forms or order. -/
def select (cuts : Cuts) (xs : List Record) : List Record :=
  xs.filter (accepts cuts)

/-- Settle once, before either cutoff. -/
def input (cuts : Cuts) (xs : List Record) : List Record :=
  select cuts (settle xs)

/-- Run the existing spec after selection. The spec admits records without settling them again. -/
def run (cuts : Cuts) (sp : Spec) (xs : List Record)
    (may : Record → Record → Bool := fun _ _ => true) : List (String × SlotValue) :=
  sp.run (input cuts xs) may

/-- Compare cutoffs with no cutoff as infinity. -/
def CutNarrower : Option Moment → Option Moment → Prop
  | _, none => True
  | none, some _ => False
  | some narrow, some wide => narrow ≤ wide

/-- Each narrow cutoff is at most its wide cutoff. -/
def Narrower (narrow wide : Cuts) : Prop :=
  CutNarrower narrow.emittedThrough wide.emittedThrough ∧
    CutNarrower narrow.occurredThrough wide.occurredThrough

/-- Combine two cutoffs by keeping the earlier bound. -/
def meetCut : Option Moment → Option Moment → Option Moment
  | none, b => b
  | a, none => a
  | some a, some b => some (if a ≤ b then a else b)

/-- Combine the cutoffs in each coordinate. -/
def meet (a b : Cuts) : Cuts :=
  { emittedThrough := meetCut a.emittedThrough b.emittedThrough
    occurredThrough := meetCut a.occurredThrough b.occurredThrough }

end Loops.Proposals.AsOf
