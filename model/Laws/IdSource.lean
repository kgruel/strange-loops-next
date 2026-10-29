import Laws.Id
import Gen.Read
import Gen.Sha2

/-!
# Concrete id sources

The generator's SHA-256 implementation emits 32 bytes, and the record-id
reader only succeeds with the number represented by 32 checked bytes.
These are width bounds, not SHA-256 correctness, collision resistance,
or a claim that an arbitrary `Loops.Record.id` is content-addressed.
-/

private theorem forIn_yield {α β : Type} (xs : List α) (init : β)
    (f : α → β → β) :
    (forIn xs init (fun a b => ForInStep.yield (f a b)) : Id β) =
      xs.foldl (fun b a => f a b) init :=
  List.forIn_pure_yield_eq_foldl _ _

private theorem foldl_size {α β : Type} (xs : List α)
    (f : Array β → α → Array β) (hstep : ∀ s x, (f s x).size = 8)
    (init : Array β) (hi : init.size = 8) : (xs.foldl f init).size = 8 := by
  induction xs generalizing init with
  | nil => exact hi
  | cons x xs ih => exact ih (f init x) (hstep init x)

namespace Gen

/-- The eight-word SHA-256 state emits four bytes per word. -/
theorem sha256_length (msg : List UInt8) : (sha256 msg).length = 32 := by
  unfold sha256
  dsimp only [Id.run, Bind.bind, Pure.pure]
  rw [forIn_yield]
  rw [List.length_flatMap]
  simp only [List.length_cons, List.length_nil, Nat.reduceAdd, List.map_const',
    List.sum_replicate_nat, Array.length_toList]
  rw [foldl_size _ _ (by intros; rfl) _ (by rfl)]

/-- Interpreting the actual SHA-256 output as a big-endian number is bounded. -/
theorem sha256_bounded (msg : List UInt8) :
    Loops.BoundedId ((sha256 msg).foldl (fun a b => 256 * a + b.toNat) 0) :=
  Loops.bytes_bounded _ (sha256_length msg)

end Gen

namespace Gen.Read

/-- Every successful record-id decode fits in the checked 32-byte width. -/
theorem recordId_bounded {path : String} {j : Loops.Json} {n : Nat}
    (h : recordId path j = .ok n) : Loops.BoundedId n := by
  unfold recordId at h
  cases ht : text path j with
  | error why => simp [ht, Bind.bind, Except.bind] at h
  | ok s =>
    simp only [ht, Bind.bind, Pure.pure, Except.bind, Except.pure] at h
    split at h
    · rename_i rest he
      split at h
      · rename_i bs hb
        split at h
        · rename_i hlen
          split at h
          · simp only [Except.ok.injEq] at h
            subst n
            exact Loops.bytes_bounded bs (by simpa using hlen)
          · simp [bad] at h
        · simp [bad] at h
      · simp [bad] at h
    · simp [bad] at h

end Gen.Read
