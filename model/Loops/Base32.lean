/-!
# Base32

RFC 4648 base32 in lowercase, without padding: the text form of ids,
commitments, salts, keys and signatures.
-/

namespace Loops

def base32Alphabet : List Char := "abcdefghijklmnopqrstuvwxyz234567".toList

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

end Loops
