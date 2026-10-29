import Loops.Stored
import Laws.Fold

/-!
# Tick covers

A cover contains valid 32-byte record ids, in ascending order, without repeats.
A digest hashes the cover bytes, not payloads or fold results.
Binding needs a no-collision premise.
The hash remains a parameter. A tick proves no time or store possession.
-/

namespace Loops.Proposals.Tick

/-- A record id that fits in 32 bytes. The reader's `Record.id` has no such bound. -/
abbrev Id := Fin (256 ^ 32)

/-- A canonical finite cover. The bound prevents byte truncation. -/
structure Cover where
  ids : List Nat
  sorted : ids.Pairwise (· < ·)
  bounded : ∀ n ∈ ids, n < 256 ^ 32
  deriving DecidableEq

/-- Sort numeric digest values and remove repeats with the existing insertion rule. -/
def normalize (xs : List Id) : Cover :=
  let ns := xs.map Fin.val
  { ids := ns.foldl (fun acc n => insertId n acc) []
    sorted := sorted_insertIds (by simp)
    bounded := by
      intro n hn
      have hm : n ∈ ns := by simpa only [mem_insertIds, List.not_mem_nil, or_false] using hn
      obtain ⟨i, _, hi⟩ := List.mem_map.1 hm
      exact hi ▸ i.isLt }

/-- Encode each id as 32 bytes, most significant first. No JSON numbers enter this input. -/
def Cover.encoding (c : Cover) : List UInt8 :=
  c.ids.flatMap fun n => (idDigest n).map Nat.toUInt8

/-- The prefix identifies this proposed cover format. -/
def domain : List UInt8 := utf8 "loops/tick-cover/v1:"

def Cover.preimage (c : Cover) : List UInt8 := domain ++ c.encoding

/-- Compute the raw digest. There is no unchecked digest field. -/
def Cover.digest (H : Hash) (c : Cover) : List UInt8 := H c.preimage

/-- New ids absent from the old cover, in ascending order. -/
def diff (old new : Cover) : List Nat :=
  new.ids.filter fun n => !old.ids.contains n

/-- Removed ids use the same rule with the covers reversed. -/
def removed (old new : Cover) : List Nat := diff new old

/-- This premise concerns only the two stated preimages and the supplied hash. -/
def NoCollision (H : Hash) (a b : Cover) : Prop :=
  H a.preimage = H b.preimage → a.preimage = b.preimage

end Loops.Proposals.Tick
