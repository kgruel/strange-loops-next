package record

import "encoding/base32"

// b32 is RFC 4648 base32 in lower case without padding: the text of ids,
// commitments, salts, keys and signatures.
var b32 = base32.NewEncoding("abcdefghijklmnopqrstuvwxyz234567").WithPadding(base32.NoPadding)

// Base32 encodes bytes as the core writes them.
func Base32(b []byte) string { return b32.EncodeToString(b) }

// FromBase32 decodes text written by Base32.
func FromBase32(s string) ([]byte, error) { return b32.DecodeString(s) }
