import Laws.Base32
import Laws.Id
import Loops.Stored

/-!
# Id text

A bounded id has one byte representation and one text representation.
The hash-to-text constructor agrees when its hash result has 32 bytes.
-/

namespace Loops

/-- Two bounded ids with the same text are equal. -/
theorem idText_injective {a b : Nat} (ha : BoundedId a) (hb : BoundedId b)
    (h : idText a = idText b) : a = b := by
  have he : base32 ((idDigest a).map Nat.toUInt8) =
      base32 ((idDigest b).map Nat.toUInt8) := by
    exact (String.append_right_inj "r:").mp h
  have hd := base32_injective _ _ he
  have hn := congrArg (fun bs : List UInt8 =>
    bs.foldl (fun a b => 256 * a + b.toNat) 0) hd
  simpa only [idDigest_bytes_roundtrip ha, idDigest_bytes_roundtrip hb] using hn

/-- A 32-byte hash gives the same id text through bytes or through a number. -/
theorem idOf_eq_idText (H : Hash) (env : Env) (commit : String)
    (h : (H (utf8 (idPreimage env commit))).length = 32) :
    idOf H env commit =
      idText ((H (utf8 (idPreimage env commit))).foldl (fun a b => 256 * a + b.toNat) 0) := by
  simp only [idOf, idText, bytes_idDigest _ h]

end Loops
