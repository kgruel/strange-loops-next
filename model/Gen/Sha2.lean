/-!
# SHA-256 and SHA-512 (FIPS 180-4)

Reference implementations for writing vectors. They are checked against the
standard's test values every time `gen` runs; a mismatch stops it.
-/

namespace Gen

/-! ## SHA-256 -/

def k256 : Array UInt32 := #[
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]

def rotr32 (x : UInt32) (n : UInt32) : UInt32 := (x >>> n) ||| (x <<< (32 - n))

/-- Message padding: a 1 bit, zeros, then the bit length in `lenBytes` big-endian bytes. -/
def pad (msg : List UInt8) (block lenBytes : Nat) : List UInt8 :=
  let bitLen := msg.length * 8
  let zeros := (block - (msg.length + 1 + lenBytes) % block) % block
  msg ++ [(0x80 : UInt8)] ++ List.replicate zeros (0 : UInt8) ++
    (List.range lenBytes).reverse.map fun i => ((bitLen >>> (8 * i)) % 256).toUInt8

def be32 (bs : List UInt8) : UInt32 := bs.foldl (fun acc b => (acc <<< 8) ||| b.toUInt32) 0
def be64 (bs : List UInt8) : UInt64 := bs.foldl (fun acc b => (acc <<< 8) ||| b.toUInt64) 0

def chunks (n : Nat) (bs : List UInt8) : List (List UInt8) :=
  if n = 0 then [] else
  match bs with
  | [] => []
  | b :: rest => (b :: rest).take n :: chunks n ((b :: rest).drop n)
termination_by bs.length
decreasing_by simp_wf; omega

def sha256 (msg : List UInt8) : List UInt8 := Id.run do
  let mut h : Array UInt32 := #[0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
  for blk in chunks 64 (pad msg 64 8) do
    let mut w : Array UInt32 := ((chunks 4 blk).map be32).toArray
    for i in [16:64] do
      let s0 := rotr32 w[i-15]! 7 ^^^ rotr32 w[i-15]! 18 ^^^ (w[i-15]! >>> 3)
      let s1 := rotr32 w[i-2]! 17 ^^^ rotr32 w[i-2]! 19 ^^^ (w[i-2]! >>> 10)
      w := w.push (w[i-16]! + s0 + w[i-7]! + s1)
    let mut a := h[0]!; let mut b := h[1]!; let mut c := h[2]!; let mut d := h[3]!
    let mut e := h[4]!; let mut f := h[5]!; let mut g := h[6]!; let mut hh := h[7]!
    for i in [0:64] do
      let S1 := rotr32 e 6 ^^^ rotr32 e 11 ^^^ rotr32 e 25
      let ch := (e &&& f) ^^^ ((~~~ e) &&& g)
      let t1 := hh + S1 + ch + k256[i]! + w[i]!
      let S0 := rotr32 a 2 ^^^ rotr32 a 13 ^^^ rotr32 a 22
      let maj := (a &&& b) ^^^ (a &&& c) ^^^ (b &&& c)
      let t2 := S0 + maj
      hh := g; g := f; f := e; e := d + t1; d := c; c := b; b := a; a := t1 + t2
    h := #[h[0]! + a, h[1]! + b, h[2]! + c, h[3]! + d, h[4]! + e, h[5]! + f, h[6]! + g, h[7]! + hh]
  return h.toList.flatMap fun (x : UInt32) => [(x >>> 24).toUInt8, (x >>> 16).toUInt8, (x >>> 8).toUInt8, x.toUInt8]

/-! ## SHA-512 -/

def k512 : Array UInt64 := #[
  0x428a2f98d728ae22, 0x7137449123ef65cd, 0xb5c0fbcfec4d3b2f, 0xe9b5dba58189dbbc,
  0x3956c25bf348b538, 0x59f111f1b605d019, 0x923f82a4af194f9b, 0xab1c5ed5da6d8118,
  0xd807aa98a3030242, 0x12835b0145706fbe, 0x243185be4ee4b28c, 0x550c7dc3d5ffb4e2,
  0x72be5d74f27b896f, 0x80deb1fe3b1696b1, 0x9bdc06a725c71235, 0xc19bf174cf692694,
  0xe49b69c19ef14ad2, 0xefbe4786384f25e3, 0x0fc19dc68b8cd5b5, 0x240ca1cc77ac9c65,
  0x2de92c6f592b0275, 0x4a7484aa6ea6e483, 0x5cb0a9dcbd41fbd4, 0x76f988da831153b5,
  0x983e5152ee66dfab, 0xa831c66d2db43210, 0xb00327c898fb213f, 0xbf597fc7beef0ee4,
  0xc6e00bf33da88fc2, 0xd5a79147930aa725, 0x06ca6351e003826f, 0x142929670a0e6e70,
  0x27b70a8546d22ffc, 0x2e1b21385c26c926, 0x4d2c6dfc5ac42aed, 0x53380d139d95b3df,
  0x650a73548baf63de, 0x766a0abb3c77b2a8, 0x81c2c92e47edaee6, 0x92722c851482353b,
  0xa2bfe8a14cf10364, 0xa81a664bbc423001, 0xc24b8b70d0f89791, 0xc76c51a30654be30,
  0xd192e819d6ef5218, 0xd69906245565a910, 0xf40e35855771202a, 0x106aa07032bbd1b8,
  0x19a4c116b8d2d0c8, 0x1e376c085141ab53, 0x2748774cdf8eeb99, 0x34b0bcb5e19b48a8,
  0x391c0cb3c5c95a63, 0x4ed8aa4ae3418acb, 0x5b9cca4f7763e373, 0x682e6ff3d6b2b8a3,
  0x748f82ee5defb2fc, 0x78a5636f43172f60, 0x84c87814a1f0ab72, 0x8cc702081a6439ec,
  0x90befffa23631e28, 0xa4506cebde82bde9, 0xbef9a3f7b2c67915, 0xc67178f2e372532b,
  0xca273eceea26619c, 0xd186b8c721c0c207, 0xeada7dd6cde0eb1e, 0xf57d4f7fee6ed178,
  0x06f067aa72176fba, 0x0a637dc5a2c898a6, 0x113f9804bef90dae, 0x1b710b35131c471b,
  0x28db77f523047d84, 0x32caab7b40c72493, 0x3c9ebe0a15c9bebc, 0x431d67c49c100d4c,
  0x4cc5d4becb3e42b6, 0x597f299cfc657e2a, 0x5fcb6fab3ad6faec, 0x6c44198c4a475817]

def rotr64 (x : UInt64) (n : UInt64) : UInt64 := (x >>> n) ||| (x <<< (64 - n))

def sha512 (msg : List UInt8) : List UInt8 := Id.run do
  let mut h : Array UInt64 := #[0x6a09e667f3bcc908, 0xbb67ae8584caa73b, 0x3c6ef372fe94f82b,
    0xa54ff53a5f1d36f1, 0x510e527fade682d1, 0x9b05688c2b3e6c1f, 0x1f83d9abfb41bd6b, 0x5be0cd19137e2179]
  for blk in chunks 128 (pad msg 128 16) do
    let mut w : Array UInt64 := ((chunks 8 blk).map be64).toArray
    for i in [16:80] do
      let s0 := rotr64 w[i-15]! 1 ^^^ rotr64 w[i-15]! 8 ^^^ (w[i-15]! >>> 7)
      let s1 := rotr64 w[i-2]! 19 ^^^ rotr64 w[i-2]! 61 ^^^ (w[i-2]! >>> 6)
      w := w.push (w[i-16]! + s0 + w[i-7]! + s1)
    let mut a := h[0]!; let mut b := h[1]!; let mut c := h[2]!; let mut d := h[3]!
    let mut e := h[4]!; let mut f := h[5]!; let mut g := h[6]!; let mut hh := h[7]!
    for i in [0:80] do
      let S1 := rotr64 e 14 ^^^ rotr64 e 18 ^^^ rotr64 e 41
      let ch := (e &&& f) ^^^ ((~~~ e) &&& g)
      let t1 := hh + S1 + ch + k512[i]! + w[i]!
      let S0 := rotr64 a 28 ^^^ rotr64 a 34 ^^^ rotr64 a 39
      let maj := (a &&& b) ^^^ (a &&& c) ^^^ (b &&& c)
      let t2 := S0 + maj
      hh := g; g := f; f := e; e := d + t1; d := c; c := b; b := a; a := t1 + t2
    h := #[h[0]! + a, h[1]! + b, h[2]! + c, h[3]! + d, h[4]! + e, h[5]! + f, h[6]! + g, h[7]! + hh]
  return h.toList.flatMap fun (x : UInt64) => (List.range 8).reverse.map fun i => (x >>> (8 * i.toUInt64)).toUInt8

def hex (bs : List UInt8) : String :=
  String.join (bs.map fun b =>
    let d := "0123456789abcdef".toList
    String.ofList [d.getD (b.toNat / 16) '0', d.getD (b.toNat % 16) '0'])

def unhex (s : String) : List UInt8 :=
  let v (c : Char) : Nat := if c.isDigit then c.toNat - '0'.toNat else c.toNat - 'a'.toNat + 10
  (chunks' s.toList).map fun (a, b) => (16 * v a + v b).toUInt8
where
  chunks' : List Char → List (Char × Char)
    | a :: b :: rest => (a, b) :: chunks' rest
    | _ => []

end Gen
