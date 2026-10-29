import Init.Data.Float.Model

namespace Loops

/-- A JSON number stores its rounded binary64 representation. -/
structure Number where
  bits : UInt64
  deriving Repr, DecidableEq, Inhabited

namespace Number

/-- Decimal input rounds once through Lean's exact binary64 model. -/
def ofScientific (negative : Bool) (mantissa : Nat) (exponent : Int) : Number :=
  ⟨(Float.Model.ofScientific mantissa exponent).toBits |||
    (if negative then 0x8000000000000000 else 0)⟩

def magnitude (n : Number) : UInt64 := n.bits &&& 0x7fffffffffffffff

def finite (n : Number) : Bool := n.magnitude >>> 52 != 2047

/-- The absolute binary64 value is an exact ratio. -/
def ratio (n : Number) : Nat × Nat :=
  let b := n.magnitude.toNat
  let e : Nat := b / 2^52
  let m := b % 2^52 + if e == 0 then 0 else 2^52
  let shift : Int := if e == 0 then -1074 else (e : Int) - 1075
  if shift ≥ 0 then (m * 2^shift.toNat, 1) else (m, 2^(-shift).toNat)

def inRange (n : Number) : Bool :=
  n.finite && n.ratio.1 ≤ (2^53 - 1) * n.ratio.2

/-- Numeric slots read only safe-whole values. -/
def whole? (n : Number) : Option Int :=
  let (p, q) := n.ratio
  if n.inRange && p % q == 0 then
    let i : Int := p / q
    some (if n.bits >>> 63 == 1 then -i else i)
  else none

private def scaled (p q : Nat) (e : Int) : Nat × Nat :=
  if e ≥ 0 then (p * 10^e.toNat, q) else (p, q * 10^(-e).toNat)

private def nearest (p q : Nat) : Nat :=
  let a := p / q
  if 2 * (p % q) > q || (2 * (p % q) == q && a % 2 == 1) then a + 1 else a

private def distance (p q m : Nat) (e : Int) : Nat × Nat :=
  let (a, b) := scaled m 1 e
  (Int.natAbs (((p * b : Nat) : Int) - ((a * q : Nat) : Int)), b)

private def closer (p q : Nat) (e : Int) (a b : Nat) : Bool :=
  let da := distance p q a e
  let db := distance p q b e
  da.1 * db.2 < db.1 * da.2 ||
    (da.1 * db.2 == db.1 * da.2 && a % 2 == 0)

private def shortest (n : Number) (p q : Nat) (k : Int) : Nat × Int := Id.run do
  for d in List.range 17 do
    let e := k - (d : Int)
    let (a, b) := scaled p q (-e)
    let m := nearest a b
    let candidates := [m, m - 1, m + 1].filter fun c =>
      (ofScientific false c e).bits == n.magnitude
    if let c :: cs := candidates then
      return (cs.foldl (fun best x => if closer p q e x best then x else best) c, e)
  return (p, 0)

private def strip : Nat → Nat → Int → Nat × Int
  | 0, m, e => (m, e)
  | fuel + 1, m, e =>
    if m != 0 && m % 10 == 0 then strip fuel (m / 10) (e + 1) else (m, e)

private def zeros (n : Nat) : String := String.ofList (List.replicate n '0')

/-- Canonical text uses the shortest roundtripping decimal and ECMAScript notation. -/
def canon (n : Number) : String :=
  if !n.finite then "null"
  else if n.magnitude == 0 then "0"
  else Id.run do
    let (p, q) := n.ratio
    let k₀ : Int := (toString p).length - ((toString q).length : Int)
    let (a, b) := scaled p q (-k₀)
    let k := if a < b then k₀ - 1 else k₀
    let (m, e) := shortest n p q k
    let (m, e) := strip 17 m e
    let ds := toString m
    let pos : Int := ds.length + e
    let sign := if n.bits >>> 63 == 1 then "-" else ""
    if 0 < pos && pos ≤ 21 then
      if pos ≥ ds.length then return sign ++ ds ++ zeros (pos - ds.length).toNat
      else return sign ++ String.ofList (ds.toList.take pos.toNat) ++ "." ++
        String.ofList (ds.toList.drop pos.toNat)
    else if -6 < pos && pos ≤ 0 then
      return sign ++ "0." ++ zeros (-pos).toNat ++ ds
    else
      let exp := pos - 1
      let body := String.ofList (ds.toList.take 1) ++
        (if ds.length == 1 then "" else "." ++ String.ofList (ds.toList.drop 1))
      return sign ++ body ++ "e" ++ (if exp ≥ 0 then "+" else "-") ++ toString exp.natAbs

private theorem scaled_den_pos (m : Nat) (e : Int) :
    0 < (scaled m 1 e).2 := by
  unfold scaled
  split
  · exact Nat.zero_lt_one
  · exact Nat.mul_pos Nat.zero_lt_one (Nat.pow_pos (by decide))

private theorem scaled_ten (m : Nat) (e : Int) :
    let a := scaled (m * 10) 1 e
    let b := scaled m 1 (e + 1)
    a.1 * b.2 = b.1 * a.2 := by
  dsimp
  by_cases he : 0 ≤ e
  · have he' : 0 ≤ e + 1 := by omega
    have hn : (e + 1).toNat = e.toNat + 1 := by omega
    simp [scaled, he, he', hn, Nat.pow_succ, Nat.mul_assoc, Nat.mul_comm,
      Nat.mul_left_comm]
  · by_cases he' : 0 ≤ e + 1
    · have heq : e = -1 := by omega
      subst e
      simp [scaled, Nat.mul_comm]
    · have hn : (-e).toNat = (-(e + 1)).toNat + 1 := by omega
      simp [scaled, he, he', hn, Nat.pow_succ, Nat.mul_assoc, Nat.mul_comm]

private theorem ratio_cross_trans {a b c d p q : Nat} (hd : 0 < d)
    (hab : a * d = c * b) (hbc : c * q = p * d) : a * q = p * b := by
  apply Nat.mul_right_cancel hd
  calc
    a * q * d = (a * d) * q := by ac_rfl
    _ = (c * b) * q := by rw [hab]
    _ = (c * q) * b := by ac_rfl
    _ = (p * d) * b := by rw [hbc]
    _ = p * b * d := by ac_rfl

/-- Removing trailing zeros preserves the exact decimal ratio. -/
theorem strip_preserves_value (fuel m : Nat) (e : Int) :
    let r := strip fuel m e
    let a := scaled m 1 e
    let b := scaled r.1 1 r.2
    a.1 * b.2 = b.1 * a.2 := by
  induction fuel generalizing m e with
  | zero => simp [strip]
  | succ fuel ih =>
    simp only [strip]
    split
    · rename_i h
      have hs : m ≠ 0 ∧ m % 10 = 0 := by simpa using h
      have hm : m = (m / 10) * 10 :=
        (Nat.div_mul_cancel (Nat.dvd_of_mod_eq_zero hs.2)).symm
      exact ratio_cross_trans (scaled_den_pos (m / 10) (e + 1))
        (by simpa only [← hm] using scaled_ten (m / 10) e) (ih (m / 10) (e + 1))
    · rfl

/-- Removing trailing zeros keeps a positive mantissa positive. -/
theorem strip_preserves_positive (fuel m : Nat) (e : Int) (hm : 0 < m) :
    0 < (strip fuel m e).1 := by
  induction fuel generalizing m e with
  | zero => simpa [strip] using hm
  | succ fuel ih =>
    simp only [strip]
    split
    · rename_i h
      have hs : m ≠ 0 ∧ m % 10 = 0 := by simpa using h
      have heq : m = (m / 10) * 10 :=
        (Nat.div_mul_cancel (Nat.dvd_of_mod_eq_zero hs.2)).symm
      exact ih (m / 10) (e + 1) (by omega)
    · exact hm

private theorem choose_preserves (n : Number) (p q : Nat) (e : Int)
    (c : Nat) (cs : List Nat)
    (hc : (ofScientific false c e).bits = n.magnitude)
    (hcs : ∀ x ∈ cs, (ofScientific false x e).bits = n.magnitude) :
    (ofScientific false (cs.foldl (fun best x => if closer p q e x best then x else best) c) e).bits = n.magnitude := by
  apply List.foldlRecOn (motive := fun m => (ofScientific false m e).bits = n.magnitude) cs _ hc
  intro best hbest x hx
  split
  · exact hcs x hx
  · exact hbest

/-- The search returns matching bits or the fallback pair. -/
theorem shortest_roundtrips_or_fallback (n : Number) (p q : Nat) (k : Int) :
    let r := shortest n p q k
    (ofScientific false r.1 r.2).bits = n.magnitude ∨ r = (p, 0) := by
  unfold shortest
  generalize List.range 17 = ds
  induction ds with
  | nil => exact Or.inr rfl
  | cons d ds ih =>
    simp only [List.forIn_cons]
    split
    · rename_i c cs hcs
      apply Or.inl
      have hall : ∀ x ∈ c :: cs, (ofScientific false x (k - (d : Int))).bits = n.magnitude := by
        intro x hx
        rw [← hcs] at hx
        exact beq_iff_eq.mp (List.mem_filter.mp hx).2
      exact choose_preserves n p q _ c cs (hall c (by simp)) (fun x hx => hall x (by simp [hx]))
    · exact ih

/-- A matching candidate makes the search return matching bits. -/
theorem shortest_roundtrips_of_candidate (n : Number) (p q : Nat) (k : Int)
    (hcandidate : ∃ d ∈ List.range 17,
      let e := k - (d : Int)
      let ab := scaled p q (-e)
      let m := nearest ab.1 ab.2
      ∃ c ∈ [m, m - 1, m + 1], (ofScientific false c e).bits = n.magnitude) :
    let r := shortest n p q k
    (ofScientific false r.1 r.2).bits = n.magnitude := by
  unfold shortest
  generalize List.range 17 = ds at *
  induction ds with
  | nil => simp at hcandidate
  | cons d ds ih =>
    simp only [List.forIn_cons]
    split
    · rename_i c cs hcs
      have hall : ∀ x ∈ c :: cs, (ofScientific false x (k - (d : Int))).bits = n.magnitude := by
        intro x hx
        rw [← hcs] at hx
        exact beq_iff_eq.mp (List.mem_filter.mp hx).2
      exact choose_preserves n p q _ c cs (hall c (by simp)) (fun x hx => hall x (by simp [hx]))
    · rename_i hnone
      apply ih
      rcases hcandidate with ⟨j, hj, c, hmem, hbits⟩
      rcases List.mem_cons.mp hj with rfl | hj
      · have hm := (List.mem_filter (p := fun x => (ofScientific false x (k - (j : Int))).bits == n.magnitude)).mpr
          ⟨hmem, beq_iff_eq.mpr hbits⟩
        obtain ⟨x, xs, hcons⟩ := List.exists_cons_of_ne_nil (List.ne_nil_of_mem hm)
        exact False.elim (hnone x xs hcons)
      · exact ⟨j, hj, c, hmem, hbits⟩

end Number
end Loops
