import Loops.Base32
import Std.Tactic

/-!
# Base32 injectivity

Recover the five bits of each alphabet character, then discard the final zero
padding. The character count determines the byte count: the padded bit count
is less than five above the true bit count, whereas byte lengths differ by
multiples of eight. Finally, split the recovered stream into eight-bit bytes.
-/

namespace Loops

private def byteBits (b : UInt8) : List Bool :=
  (List.range 8).reverse.map fun i => (b.toNat >>> i) % 2 == 1

private def groupBits (bs : List Bool) : List Bool :=
  bs.take 5 ++ List.replicate (5 - (bs.take 5).length) false

private def groupChar (bs : List Bool) : Char :=
  base32Alphabet.getD ((groupBits bs).foldl (fun n b => 2 * n + if b then 1 else 0) 0) 'a'

private def charBits (c : Char) : List Bool :=
  (List.range 5).reverse.map fun i => (base32Alphabet.idxOf c >>> i) % 2 == 1

/-- The 32 alphabet entries recover exactly their five-bit indices. -/
private theorem charBits_five (a b c d e : Bool) :
    charBits (groupChar [a, b, c, d, e]) = [a, b, c, d, e] := by
  cases a <;> cases b <;> cases c <;> cases d <;> cases e <;> decide

private theorem charBits_group (bs : List Bool) :
    charBits (groupChar bs) = groupBits bs := by
  rcases bs with _ | ⟨a, bs⟩
  · exact charBits_five false false false false false
  rcases bs with _ | ⟨b, bs⟩
  · exact charBits_five a false false false false
  rcases bs with _ | ⟨c, bs⟩
  · exact charBits_five a b false false false
  rcases bs with _ | ⟨d, bs⟩
  · exact charBits_five a b c false false
  rcases bs with _ | ⟨e, bs⟩
  · exact charBits_five a b c d false
  exact charBits_five a b c d e

private def encodeBits : Nat → List Bool → List Char
  | 0, _ => []
  | fuel + 1, bs => if bs.isEmpty then [] else groupChar bs :: encodeBits fuel (bs.drop 5)

private theorem go_eq (fuel : Nat) (bs : List Bool) (acc : List Char) :
    base32.go fuel bs acc = acc.reverse ++ encodeBits fuel bs := by
  induction fuel generalizing bs acc with
  | zero => simp [base32.go, encodeBits]
  | succ fuel ih =>
    simp only [base32.go, encodeBits]
    split
    · simp
    · rw [ih]
      simp [groupChar, groupBits, List.reverse_cons, List.append_assoc]

private theorem base32_eq (bytes : List UInt8) :
    (base32 bytes).toList = encodeBits (bytes.flatMap byteBits).length (bytes.flatMap byteBits) := by
  change (String.ofList (base32.go (bytes.flatMap byteBits).length (bytes.flatMap byteBits) [])).toList = _
  rw [go_eq]
  simp

/-- A last partial group contributes at most four padding bits. -/
private theorem encode_bounds (fuel : Nat) (bs : List Bool) (hf : bs.length ≤ fuel) :
    bs.length ≤ 5 * (encodeBits fuel bs).length ∧
    5 * (encodeBits fuel bs).length < bs.length + 5 := by
  induction fuel generalizing bs with
  | zero =>
    have : bs = [] := List.length_eq_zero_iff.mp (by omega)
    subst bs
    simp [encodeBits]
  | succ fuel ih =>
    by_cases h : bs = []
    · subst bs; simp [encodeBits]
    · have hn : bs.isEmpty = false := by simp [h]
      have hd : (bs.drop 5).length ≤ fuel := by simp; have := List.length_pos_iff.mpr h; omega
      have hi := ih (bs.drop 5) hd
      simp only [List.length_drop] at hi
      simp only [encodeBits, hn, Bool.false_eq_true, ↓reduceIte, List.length_cons]
      have := List.length_pos_iff.mpr h
      omega

/-- Reading the emitted groups recovers the original bits before any padding. -/
private theorem decode_encode (fuel : Nat) (bs : List Bool) (hf : bs.length ≤ fuel) :
    ((encodeBits fuel bs).flatMap charBits).take bs.length = bs := by
  induction fuel generalizing bs with
  | zero =>
    have : bs = [] := List.length_eq_zero_iff.mp (by omega)
    subst bs
    simp
  | succ fuel ih =>
    by_cases h : bs = []
    · subst bs; simp
    · have hn : bs.isEmpty = false := by simp [h]
      have hd : (bs.drop 5).length ≤ fuel := by simp; have := List.length_pos_iff.mpr h; omega
      have hi := ih (bs.drop 5) hd
      simp only [encodeBits, hn, Bool.false_eq_true, ↓reduceIte, List.flatMap_cons, charBits_group]
      by_cases hs : bs.length ≤ 5
      · have ht : bs.take 5 = bs := List.take_of_length_le hs
        simp [groupBits, ht]
      · have hl : (bs.take 5).length = 5 := by simp; omega
        have ht : groupBits bs = bs.take 5 := by simp [groupBits, hl]
        rw [ht, List.take_append]
        rw [List.take_of_length_le (by simp; omega)]
        simp only [List.length_take, Nat.min_eq_left (by omega : 5 ≤ bs.length)]
        simp only [List.length_drop] at hi
        rw [hi, List.take_append_drop]

private theorem byteBits_length (b : UInt8) : (byteBits b).length = 8 := by
  simp [byteBits]

private theorem bytesBits_length (bs : List UInt8) : (bs.flatMap byteBits).length = 8 * bs.length := by
  induction bs with
  | nil => simp
  | cons b bs ih => simp [byteBits_length, ih, Nat.mul_add, Nat.add_comm]

private theorem bit_eq (n m : Nat) (h : (n % 2 == 1) = (m % 2 == 1)) : n % 2 = m % 2 := by
  by_cases hn : n % 2 = 1
  · have hm : m % 2 = 1 := by simpa [hn] using h.symm
    omega
  · have hm : m % 2 ≠ 1 := by intro hm; simp [hn, hm] at h
    omega

private theorem byteBits_injective (a b : UInt8) (h : byteBits a = byteBits b) : a = b := by
  apply UInt8.toNat_inj.mp
  have ha := a.toNat_lt
  have hb := b.toNat_lt
  simp [byteBits, List.range_succ, Nat.shiftRight_eq_div_pow] at h
  rcases h with ⟨h7, h6, h5, h4, h3, h2, h1, h0⟩
  have h7 := bit_eq _ _ h7
  have h6 := bit_eq _ _ h6
  have h5 := bit_eq _ _ h5
  have h4 := bit_eq _ _ h4
  have h3 := bit_eq _ _ h3
  have h2 := bit_eq _ _ h2
  have h1 := bit_eq _ _ h1
  have h0 := bit_eq _ _ h0
  omega

private theorem bytesBits_injective (a b : List UInt8)
    (h : a.flatMap byteBits = b.flatMap byteBits) : a = b := by
  induction a generalizing b with
  | nil =>
    cases b with
    | nil => rfl
    | cons b bs =>
      have hl := congrArg List.length h
      simp only [bytesBits_length, List.length_nil, List.length_cons] at hl
      omega
  | cons a as ih =>
    cases b with
    | nil =>
      have hl := congrArg List.length h
      simp only [bytesBits_length, List.length_nil, List.length_cons] at hl
      omega
    | cons b bs =>
      simp only [List.flatMap_cons] at h
      have hp := List.append_inj h (by simp [byteBits_length])
      have he := byteBits_injective a b hp.1
      have ht := ih bs hp.2
      simp [he, ht]

/-- Unpadded base32 determines every input byte, including its length. -/
theorem base32_injective (a b : List UInt8) (h : base32 a = base32 b) : a = b := by
  have he := congrArg String.toList h
  rw [base32_eq, base32_eq] at he
  have hl := congrArg List.length he
  have ha := encode_bounds (a.flatMap byteBits).length (a.flatMap byteBits) (Nat.le_refl _)
  have hb := encode_bounds (b.flatMap byteBits).length (b.flatMap byteBits) (Nat.le_refl _)
  have hla := bytesBits_length a
  have hlb := bytesBits_length b
  have hn : a.length = b.length := by omega
  have hbits : (a.flatMap byteBits).length = (b.flatMap byteBits).length := by
    rw [hla, hlb, hn]
  apply bytesBits_injective
  calc
    a.flatMap byteBits =
        ((encodeBits (a.flatMap byteBits).length (a.flatMap byteBits)).flatMap charBits).take
          (a.flatMap byteBits).length := (decode_encode _ _ (Nat.le_refl _)).symm
    _ = ((encodeBits (b.flatMap byteBits).length (b.flatMap byteBits)).flatMap charBits).take
          (b.flatMap byteBits).length := by rw [he, hbits]
    _ = b.flatMap byteBits := decode_encode _ _ (Nat.le_refl _)

end Loops
