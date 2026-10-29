import Gen.Read

namespace Gen.Read

/-- The number reader refuses these nonfinite tokens. -/
theorem number_rejects_nonfinite_tokens :
    number.run "NaN".toList = .error (3, "expected a value") ∧
    number.run "Infinity".toList = .error (8, "expected a value") ∧
    number.run "-Infinity".toList = .error (9, "expected a value") ∧
    number.run "+Infinity".toList = .error (9, "expected a value") ∧
    number.run "-NaN".toList = .error (4, "expected a value") ∧
    number.run "+NaN".toList = .error (4, "expected a value") := by
  exact ⟨rfl, rfl, rfl, rfl, rfl, rfl⟩

set_option maxRecDepth 100000 in
set_option exponentiation.threshold 512 in
/-- Overflow retains the sign of infinity. -/
theorem number_overflow :
    number.run "1e400".toList = .ok (.number ⟨0x7ff0000000000000⟩, []) ∧
    number.run "-1e400".toList = .ok (.number ⟨0xfff0000000000000⟩, []) := by
  exact ⟨rfl, rfl⟩

end Gen.Read
