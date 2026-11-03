/-!
# Base32

RFC 4648 base32hex in lowercase, without padding: the text form of ids,
commitments, salts, keys and signatures.
-/

namespace Loops

def base32Alphabet : List Char := "0123456789abcdefghijklmnopqrstuv".toList

/-- Encode bytes, five bits at a time; a final partial group is zero-padded on the right. -/
def base32 (bytes : List UInt8) : String :=
  let bits : List Bool := bytes.flatMap fun b => (List.range 8).reverse.map fun i => (b.toNat >>> i) % 2 == 1
  let rec go (fuel : Nat) (bs : List Bool) (acc : List Char) : List Char :=
    match fuel with
    | 0 => acc.reverse
    | fuel + 1 =>
      if bs.isEmpty then acc.reverse
      else
        let group := (bs.take 5) ++ List.replicate (5 - (bs.take 5).length) false
        let n := group.foldl (fun n b => 2 * n + if b then 1 else 0) 0
        go fuel (bs.drop 5) (base32Alphabet.getD n 'a' :: acc)
  String.ofList (go bits.length bits [])

/-- The five bits named by a base32hex character. Re-encoding checks the alphabet. -/
def base32CharBits (c : Char) : List Bool :=
  (List.range 5).reverse.map fun i => (base32Alphabet.idxOf c >>> i) % 2 == 1

/-- Read a fixed number of bytes from a bit stream. -/
def bitsBytes : Nat → List Bool → List UInt8
  | 0, _ => []
  | n + 1, bs =>
    ((bs.take 8).foldl (fun (n : Nat) (b : Bool) => 2 * n + if b then 1 else 0) 0).toUInt8 ::
      bitsBytes n (bs.drop 8)

/-- Decode exactly the encoder's canonical image. Re-encoding rejects bad lengths,
characters and nonzero unused bits, without a second spelling rule. -/
def unbase32 (s : String) : Option (List UInt8) :=
  let bits := s.toList.flatMap base32CharBits
  let bs := bitsBytes (bits.length / 8) bits
  if base32 bs == s then some bs else none

/-- A fixed-size byte string in canonical base32hex. -/
def byteText (n : Nat) (s : String) : Bool :=
  (unbase32 s).any fun bs => bs.length == n

end Loops
