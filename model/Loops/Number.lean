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

end Number
end Loops
