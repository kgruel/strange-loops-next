import Gen.Sha2

/-!
# Ed25519 signing (RFC 8032, section 5.1)

A direct port of the RFC's reference code, for writing vectors only: plain
arithmetic on natural numbers, not constant time. Checked against the RFC's
test vectors every time `gen` runs.
-/

namespace Gen.Ed25519

def p : Nat := 2 ^ 255 - 19
def q : Nat := 2 ^ 252 + 27742317777372353535851937790883648493

def powMod (b e m : Nat) : Nat := Id.run do
  let mut r := 1
  let mut b := b % m
  let mut e := e
  while e > 0 do
    if e % 2 == 1 then r := r * b % m
    b := b * b % m
    e := e / 2
  return r

def inv (x : Nat) : Nat := powMod x (p - 2) p

def d : Nat := (p - 121665) * inv 121666 % p

/-- Points in extended coordinates (X, Y, Z, T). -/
structure Pt where
  x : Nat
  y : Nat
  z : Nat
  t : Nat

def sub (a b : Nat) : Nat := (a + p - b % p) % p

def add (P Q : Pt) : Pt :=
  let A := sub P.y P.x * sub Q.y Q.x % p
  let B := (P.y + P.x) * (Q.y + Q.x) % p
  let C := 2 * P.t * Q.t * d % p
  let D := 2 * P.z * Q.z % p
  let E := sub B A
  let F := sub D C
  let G := (D + C) % p
  let H := (B + A) % p
  ⟨E * F % p, G * H % p, F * G % p, E * H % p⟩

def mul (s : Nat) (P : Pt) : Pt := Id.run do
  let mut Q : Pt := ⟨0, 1, 1, 0⟩
  let mut P := P
  let mut s := s
  while s > 0 do
    if s % 2 == 1 then Q := add Q P
    P := add P P
    s := s / 2
  return Q

def sqrtM1 : Nat := powMod 2 ((p - 1) / 4) p

def recoverX (y : Nat) (sign : Nat) : Nat :=
  let x2 := sub (y * y) 1 * inv ((d * y * y + 1) % p) % p
  let x := powMod x2 ((p + 3) / 8) p
  let x := if (sub (x * x) x2) != 0 then x * sqrtM1 % p else x
  if x % 2 != sign then p - x else x

def gy : Nat := 4 * inv 5 % p
def gx : Nat := recoverX gy 0
def G : Pt := ⟨gx, gy, 1, gx * gy % p⟩

def le (n : Nat) (len : Nat) : List UInt8 := (List.range len).map fun i => ((n >>> (8 * i)) % 256).toUInt8
def ofLe (bs : List UInt8) : Nat := bs.foldr (fun b acc => acc * 256 + b.toNat) 0

def compress (P : Pt) : List UInt8 :=
  let zi := inv P.z
  let x := P.x * zi % p
  let y := P.y * zi % p
  le (y ||| ((x % 2) <<< 255)) 32

def expand (seed : List UInt8) : Nat × List UInt8 :=
  let h := sha512 seed
  let a := ofLe (h.take 32)
  let a := (a &&& (2 ^ 254 - 8)) ||| 2 ^ 254
  (a, h.drop 32)

def publicKey (seed : List UInt8) : List UInt8 := compress (mul (expand seed).1 G)

def sign (seed : List UInt8) (msg : List UInt8) : List UInt8 :=
  let (a, prefix_) := expand seed
  let A := compress (mul a G)
  let r := ofLe (sha512 (prefix_ ++ msg)) % q
  let R := compress (mul r G)
  let h := ofLe (sha512 (R ++ A ++ msg)) % q
  let s := (r + h * a) % q
  R ++ le s 32

end Gen.Ed25519
