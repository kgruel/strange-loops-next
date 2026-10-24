package record

import (
	"crypto/ed25519"
	"crypto/sha256"
	"errors"
)

// Commit is h(salt + canonical(payload)): what the id covers instead of the
// payload, so erasing the opening never changes the id.
func Commit(salt []byte, payload Value) (string, error) {
	c, err := Canonical(payload)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(append(append([]byte{}, salt...), c...))
	return "h:" + Base32(sum[:]), nil
}

// IDPreimage is the canonical text an id hashes.
func IDPreimage(env Env, commit string) ([]byte, error) {
	o := &Object{Keys: []string{"commit", "env"}, Values: map[string]Value{"commit": commit, "env": env.JSON()}}
	return Canonical(o)
}

// ID names a record by its envelope and commitment.
func ID(env Env, commit string) (string, error) {
	pre, err := IDPreimage(env, commit)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(pre)
	return "r:" + Base32(sum[:]), nil
}

// Sig is a signature kept beside a record, outside its id.
type Sig struct {
	Key     string // "k:" + base32(public key)
	Ed25519 string // base32(signature)
}

// SigningInput is what a signature covers.
func SigningInput(id string) []byte { return []byte("loops/record/v1:" + id) }

// Sign signs an id with the key derived from a 32-byte seed.
func Sign(seed []byte, id string) Sig {
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	return Sig{Key: "k:" + Base32(pub), Ed25519: Base32(ed25519.Sign(priv, SigningInput(id)))}
}

// Verify checks a signature over an id.
func Verify(s Sig, id string) bool {
	if len(s.Key) < 2 || s.Key[:2] != "k:" {
		return false
	}
	pub, err := FromBase32(s.Key[2:])
	if err != nil || len(pub) != ed25519.PublicKeySize {
		return false
	}
	sig, err := FromBase32(s.Ed25519)
	if err != nil {
		return false
	}
	return ed25519.Verify(pub, SigningInput(id), sig)
}

// Sealed is a record with its opening.
type Sealed struct {
	Env     Env
	Salt    []byte
	Payload Value
	Commit  string
	ID      string
}

// Seal commits to a payload and names the record, refusing a bad envelope.
func Seal(env Env, salt []byte, payload Value) (Sealed, error) {
	if why := env.Problem(); why != "" {
		return Sealed{}, errors.New(why)
	}
	commit, err := Commit(salt, payload)
	if err != nil {
		return Sealed{}, err
	}
	id, err := ID(env, commit)
	if err != nil {
		return Sealed{}, err
	}
	return Sealed{Env: env, Salt: salt, Payload: payload, Commit: commit, ID: id}, nil
}

func sigJSON(s Sig) *Object {
	return &Object{Keys: []string{"key", "ed25519"}, Values: map[string]Value{"key": s.Key, "ed25519": s.Ed25519}}
}

// Line is the record as stored: one canonical JSON line.
func (r Sealed) Line(s Sig) ([]byte, error) {
	return Canonical(&Object{Keys: []string{"id", "env", "salt", "payload", "sig"}, Values: map[string]Value{
		"id": r.ID, "env": r.Env.JSON(), "salt": Base32(r.Salt), "payload": r.Payload, "sig": sigJSON(s)}})
}

// ErasedLine is the record after erasure: the opening gone, the commitment
// kept, the id unchanged.
func (r Sealed) ErasedLine(s Sig) ([]byte, error) {
	return Canonical(&Object{Keys: []string{"id", "env", "commit", "sig"}, Values: map[string]Value{
		"id": r.ID, "env": r.Env.JSON(), "commit": r.Commit, "sig": sigJSON(s)}})
}
