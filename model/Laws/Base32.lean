import Loops.Base32
import Std.Tactic
import Laws.TextRadix

/-!
# Base32hex injectivity

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

/-- Unpadded base32hex determines every input byte, including its length. -/
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

private theorem byteBits_value (b : UInt8) :
    (byteBits b).foldl (fun (n : Nat) (d : Bool) => 2 * n + if d then 1 else 0) 0 = b.toNat := by
  have h : ∀ n : Fin 256, ((List.range 8).reverse.map (fun i => (n.val >>> i) % 2 == 1)).foldl
      (fun (n : Nat) (d : Bool) => 2 * n + if d then 1 else 0) 0 = n.val := by decide +kernel
  exact h ⟨b.toNat, b.toNat_lt⟩

private theorem bitsBytes_suffix (bs : List UInt8) (tail : List Bool) :
    bitsBytes bs.length (bs.flatMap byteBits ++ tail) = bs := by
  induction bs with
  | nil => rfl
  | cons b bs ih =>
    simp only [List.length_cons, List.flatMap_cons, List.append_assoc, bitsBytes]
    have ht : (byteBits b ++ (bs.flatMap byteBits ++ tail)).take 8 = byteBits b := by
      simp [byteBits_length]
    have hd : (byteBits b ++ (bs.flatMap byteBits ++ tail)).drop 8 = bs.flatMap byteBits ++ tail := by
      simp [byteBits_length]
    rw [ht, hd, byteBits_value, ih]
    exact congrArg (· :: bs) (UInt8.ofNat_toNat (x := b))

private theorem charsBits_length (cs : List Char) : (cs.flatMap charBits).length = 5 * cs.length := by
  induction cs with
  | nil => simp
  | cons c cs ih => simp [charBits, ih, Nat.mul_add, Nat.add_comm]

/-- Decoding an encoding returns every input byte. No size premise is needed. -/
theorem unbase32_base32 (bs : List UInt8) : unbase32 (base32 bs) = some bs := by
  have hbounds := encode_bounds (bs.flatMap byteBits).length (bs.flatMap byteBits) (Nat.le_refl _)
  have htake := decode_encode (bs.flatMap byteBits).length (bs.flatMap byteBits) (Nat.le_refl _)
  have hlen := charsBits_length (encodeBits (bs.flatMap byteBits).length (bs.flatMap byteBits))
  have hbytes := bytesBits_length bs
  have hn : ((encodeBits (bs.flatMap byteBits).length (bs.flatMap byteBits)).flatMap charBits).length / 8 = bs.length := by omega
  have hs : ((encodeBits (bs.flatMap byteBits).length (bs.flatMap byteBits)).flatMap charBits) =
      bs.flatMap byteBits ++ (((encodeBits (bs.flatMap byteBits).length (bs.flatMap byteBits)).flatMap charBits).drop (bs.flatMap byteBits).length) := by
    have hh := (List.take_append_drop (bs.flatMap byteBits).length
      ((encodeBits (bs.flatMap byteBits).length (bs.flatMap byteBits)).flatMap charBits)).symm
    rw [htake] at hh
    exact hh
  unfold unbase32
  change (if base32 (bitsBytes ((((base32 bs).toList).flatMap charBits).length / 8)
      (((base32 bs).toList).flatMap charBits)) == base32 bs then
      some (bitsBytes ((((base32 bs).toList).flatMap charBits).length / 8)
      (((base32 bs).toList).flatMap charBits)) else none) = some bs
  rw [base32_eq, hn, hs, bitsBytes_suffix]
  simp

/-- The decoder accepts exactly the encoder's image, including zero unused bits. -/
theorem unbase32_eq_some_iff (s : String) (bs : List UInt8) :
    unbase32 s = some bs ↔ base32 bs = s := by
  constructor
  · intro h
    unfold unbase32 at h
    dsimp only at h
    split at h
    · rename_i hc
      have hb := Option.some.inj h
      rw [← hb]
      exact (beq_iff_eq).1 hc
    · contradiction
  · intro h; rw [← h]; exact unbase32_base32 bs

/-- A canonical byte-text predicate includes both encoding and byte length. -/
theorem byteText_eq_true_iff (n : Nat) (s : String) :
    byteText n s = true ↔ ∃ bs, bs.length = n ∧ base32 bs = s := by
  constructor
  · intro h
    cases hd : unbase32 s with
    | none => simp [byteText, hd] at h
    | some bs =>
      exact ⟨bs, by simpa [byteText, hd] using h, (unbase32_eq_some_iff s bs).1 hd⟩
  · rintro ⟨bs, hl, he⟩
    simp [byteText, (unbase32_eq_some_iff s bs).2 he, hl]

private theorem bitValue (bs : List Bool) :
    radixValue 2 (bs.map Bool.toNat) = bs.foldl (fun (n : Nat) (b : Bool) => 2 * n + if b then 1 else 0) 0 := by
  have h := radixValue_fold 2 (bs.map Bool.toNat) 0
  simpa [List.foldl_map, Bool.toNat] using h.symm

private theorem mappedBits_bound (bs : List Bool) : ∀ d ∈ bs.map Bool.toNat, d < 2 := by
  intro d hd
  obtain ⟨b, _, rfl⟩ := List.mem_map.1 hd
  exact b.toNat_lt

private theorem byteBits_order (a b : UInt8) :
    (byteBits a).map Bool.toNat < (byteBits b).map Bool.toNat ↔ a < b := by
  have ha : radixValue 2 ((byteBits a).map Bool.toNat) = a.toNat := by rw [bitValue, byteBits_value]
  have hb : radixValue 2 ((byteBits b).map Bool.toNat) = b.toNat := by rw [bitValue, byteBits_value]
  rw [← radixValue_lt_iff (by decide : 0 < 2) (by simp [byteBits_length])
    (mappedBits_bound _) (mappedBits_bound _), ha, hb]
  exact UInt8.lt_iff_toNat_lt.symm

private theorem bytesBits_order (as bs : List UInt8) :
    ((as.flatMap byteBits).map Bool.toNat) < ((bs.flatMap byteBits).map Bool.toNat) ↔ as < bs := by
  have hh := lex_flatMap_fixed (fun b : UInt8 => (byteBits b).map Bool.toNat) 8 (by decide)
    (by intro b; simp [byteBits_length])
    (by
      intro a b
      constructor
      · intro h
        have he := congrArg (radixValue 2) h
        rw [bitValue, bitValue, byteBits_value, byteBits_value] at he
        exact UInt8.toNat_inj.1 he
      · intro h; rw [h]) byteBits_order as bs
  simpa only [List.map_flatMap] using hh

private theorem alphabet_order : ∀ a b : Fin 32,
    base32Alphabet.getD a.val 'a' < base32Alphabet.getD b.val 'a' ↔ a.val < b.val := by decide +kernel

private theorem groupBits_length (bs : List Bool) : (groupBits bs).length = 5 := by
  simp only [groupBits, List.length_append, List.length_take, List.length_replicate]
  omega

private theorem groupChar_order (as bs : List Bool) :
    groupChar as < groupChar bs ↔ (groupBits as).map Bool.toNat < (groupBits bs).map Bool.toNat := by
  have ha := radixValue_bound (by decide : 0 < 2) (mappedBits_bound (groupBits as))
  have hb := radixValue_bound (by decide : 0 < 2) (mappedBits_bound (groupBits bs))
  simp only [List.length_map, groupBits_length] at ha hb
  have hg := alphabet_order ⟨_, ha⟩ ⟨_, hb⟩
  dsimp only at hg
  rw [bitValue, bitValue] at hg
  change groupChar as < groupChar bs ↔ _ at hg
  rw [hg, ← bitValue, ← bitValue]
  exact radixValue_lt_iff (by decide) (by simp [groupBits_length]) (mappedBits_bound _) (mappedBits_bound _)

private theorem groupChar_equal (as bs : List Bool) :
    groupChar as = groupChar bs ↔ (groupBits as).map Bool.toNat = (groupBits bs).map Bool.toNat := by
  constructor
  · intro h
    have he := congrArg charBits h
    rw [charBits_group, charBits_group] at he
    exact congrArg (List.map Bool.toNat) he
  · intro h
    have he := congrArg (radixValue 2) h
    rw [bitValue, bitValue] at he
    exact congrArg (base32Alphabet.getD · 'a') he

private theorem encodeBits_order (fuel : Nat) (as bs : List Bool)
    (ha : as.length ≤ fuel) (hl : as.length = bs.length) :
    encodeBits fuel as < encodeBits fuel bs ↔ as.map Bool.toNat < bs.map Bool.toNat := by
  induction fuel generalizing as bs with
  | zero =>
    have ea : as = [] := List.length_eq_zero_iff.1 (by omega)
    have eb : bs = [] := List.length_eq_zero_iff.1 (by omega)
    subst as; subst bs; simp [encodeBits]
  | succ fuel ih =>
    by_cases hn : as = []
    · have en : bs = [] := List.length_eq_zero_iff.1 (by simp_all)
      subst as; subst bs; simp [encodeBits]
    · have hn' : bs ≠ [] := by intro h; simp_all
      have hda : (as.drop 5).length ≤ fuel := by simp; have := List.length_pos_iff.2 hn; omega
      have hdl : (as.drop 5).length = (bs.drop 5).length := by simp [hl]
      have htl : (as.take 5).length = (bs.take 5).length := by simp [hl]
      have hp : 5 - (as.take 5).length = 5 - (bs.take 5).length := by rw [htl]
      have hlt : (groupBits as).map Bool.toNat < (groupBits bs).map Bool.toNat ↔
          (as.take 5).map Bool.toNat < (bs.take 5).map Bool.toNat := by
        simp only [groupBits, List.map_append, List.map_replicate, hp]
        rw [lex_append_equal_width (by simp only [List.length_map]; exact htl)]
        simp only [List.lt_irrefl, and_false, or_false]
      have heq : (groupBits as).map Bool.toNat = (groupBits bs).map Bool.toNat ↔
          (as.take 5).map Bool.toNat = (bs.take 5).map Bool.toNat := by
        simp only [groupBits, List.map_append, List.map_replicate, hp]
        constructor
        · exact List.append_cancel_right
        · intro h; rw [h]
      simp only [encodeBits, List.isEmpty_eq_false_iff.2 hn, List.isEmpty_eq_false_iff.2 hn',
        Bool.false_eq_true, ↓reduceIte, List.cons_lt_cons_iff, groupChar_order, groupChar_equal,
        hlt, heq, ih _ _ hda hdl]
      have hf := lex_append_equal_width (c := (as.drop 5).map Bool.toNat) (d := (bs.drop 5).map Bool.toNat)
        (by simpa using htl : ((as.take 5).map Bool.toNat).length = ((bs.take 5).map Bool.toNat).length)
      simpa only [← List.map_append, List.take_append_drop] using hf.symm

/-- Equal-length bytes and their base32hex Strings have the same lexical order. -/
theorem base32_lt_iff {as bs : List UInt8} (hl : as.length = bs.length) :
    base32 as < base32 bs ↔ as < bs := by
  rw [String.lt_iff, base32_eq, base32_eq]
  have hbits : (as.flatMap byteBits).length = (bs.flatMap byteBits).length := by rw [bytesBits_length, bytesBits_length, hl]
  rw [← hbits, encodeBits_order _ _ _ (Nat.le_refl _) hbits, bytesBits_order]

end Loops
