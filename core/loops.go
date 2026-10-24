// Package loops is the core's whole public API. Everything else sits under
// internal/.
//
// Step 1 exposes layer 0 only, and its shape is provisional: the local API
// walk decides the surface.
package loops

import "github.com/kgruel/strange-loops/core/internal/record"

type (
	// Value is a JSON value: nil, bool, float64, string, []Value or *Object.
	Value = record.Value
	// Object is a JSON object with its members as written.
	Object = record.Object
	// Env is a record's envelope.
	Env = record.Env
	// Sig is a signature kept beside a record.
	Sig = record.Sig
	// Sealed is a record with its opening.
	Sealed = record.Sealed
)

var (
	// ParseJSON reads one JSON value, refusing duplicate members.
	ParseJSON = record.ParseJSON
	// Canonical renders RFC 8785 canonical bytes.
	Canonical = record.Canonical
	// EnvFromJSON reads an envelope as a writer hands it over.
	EnvFromJSON = record.EnvFromJSON
	// Seal commits to a payload and names the record.
	Seal = record.Seal
	// Sign signs a record id with the key from a 32-byte seed.
	Sign = record.Sign
	// Verify checks a signature over a record id.
	Verify = record.Verify
	// Base32 and FromBase32 are the core's text encoding for bytes.
	Base32     = record.Base32
	FromBase32 = record.FromBase32
)
