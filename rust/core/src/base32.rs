//! RFC 4648 encoding from model/Loops/Base32.lean.
/// Lean: `Loops.base32`, model/Loops/Base32.lean.
/// Encodes bytes with lowercase base32 and no padding characters.
/// Adds zero bits on the right for the final group.
pub fn base32(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 32] = b"abcdefghijklmnopqrstuvwxyz234567";
    let mut out = String::new();
    let mut acc = 0_u16;
    let mut bits = 0;
    for byte in bytes {
        acc = (acc << 8) | u16::from(*byte);
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            out.push(char::from(ALPHABET[usize::from((acc >> bits) & 31)]));
        }
        acc &= (1 << bits) - 1;
    }
    if bits > 0 {
        out.push(char::from(ALPHABET[usize::from((acc << (5 - bits)) & 31)]));
    }
    out
}
