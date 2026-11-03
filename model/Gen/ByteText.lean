import Gen.Json
import Loops.Base32

/-! Canonical byte text at the 16-, 32- and 64-byte reader boundaries. -/
namespace Gen.ByteTextVectors
open Loops

def replaceLast (s : String) (c : Char) : String :=
  String.ofList (s.toList.take (s.length - 1) ++ [c])

def texts (n pad : Nat) : List String :=
  let zero := base32 (List.replicate n (0 : UInt8))
  let high := base32 (List.replicate n (255 : UInt8))
  [zero, high, high.toUpper, zero ++ "0", String.ofList (zero.toList.drop 1), zero ++ "="] ++
  ['w', 'x', 'y', 'z'].map (replaceLast zero) ++
  ((List.range (2 ^ pad - 1)).map fun i => replaceLast zero (base32Alphabet.getD (i + 1) 'w'))

def vector (name : String) (n pad : Nat) (pre : String) : String × J :=
  let ts := texts n pad
  (name, .obj [("vector", .str name), ("layer", .str "byte-text"),
    ("laws", .arr [.str "base32.canonical"]), ("source", .str "model"),
    ("input", .obj [("bytes", .num n), ("prefix", .str pre),
      ("texts", .arr (ts.map fun t => .str (pre ++ t)))]),
    ("expect", .obj [("accepted", .arr (ts.map fun t => .bool (byteText n t)))])])

def vectors : List (String × J) := [
  vector "salt-16" 16 2 "", vector "id-32" 32 4 "r:",
  vector "commit-32" 32 4 "h:", vector "key-32" 32 4 "k:",
  vector "signature-64" 64 3 ""]

end Gen.ByteTextVectors
