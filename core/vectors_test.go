package loops_test

import (
	"bufio"
	"compress/gzip"
	"encoding/hex"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/kgruel/strange-loops/core"
)

const vectors = "../vectors"

func load(t *testing.T, path string) *loops.Object {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	v, err := loops.ParseJSON(b)
	if err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	return v.(*loops.Object)
}

func get(o *loops.Object, path ...string) loops.Value {
	var v loops.Value = o
	for _, k := range path {
		v, _ = v.(*loops.Object).Get(k)
	}
	return v
}

func str(o *loops.Object, path ...string) string {
	s, _ := get(o, path...).(string)
	return s
}

func b32(t *testing.T, s string) []byte {
	t.Helper()
	b, err := loops.FromBase32(s)
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// TestRecordVectors runs every model-written layer 0 vector.
func TestRecordVectors(t *testing.T) {
	files, _ := filepath.Glob(filepath.Join(vectors, "record", "*.json"))
	if len(files) == 0 {
		t.Fatal("no record vectors")
	}
	for _, f := range files {
		v := load(t, f)
		t.Run(str(v, "vector"), func(t *testing.T) {
			envs := get(v, "input", "envs").([]loops.Value)
			payloads := get(v, "input", "payloads").([]loops.Value)
			env, err := loops.EnvFromJSON(envs[0])
			if err != nil {
				t.Fatal(err)
			}
			if want := str(v, "expect", "refused"); want != "" {
				if got := env.Problem(); got != want {
					t.Fatalf("refused: got %q, want %q", got, want)
				}
				return
			}
			salt := b32(t, str(v, "input", "salt"))
			seed := b32(t, str(v, "input", "seed"))
			r, err := loops.Seal(env, salt, payloads[0])
			if err != nil {
				t.Fatal(err)
			}
			sig := loops.Sign(seed, r.ID)
			canonEnv, _ := loops.Canonical(env.JSON())
			canonPayload, _ := loops.Canonical(payloads[0])
			line, _ := r.Line(sig)
			erased, _ := r.ErasedLine(sig)
			for _, c := range []struct{ what, got, want string }{
				{"env", string(canonEnv), str(v, "expect", "env_canonical")},
				{"payload", string(canonPayload), str(v, "expect", "payload_canonical")},
				{"commit", r.Commit, str(v, "expect", "commit")},
				{"id", r.ID, str(v, "expect", "id")},
				{"key", sig.Key, str(v, "expect", "key")},
				{"signature", sig.Ed25519, str(v, "expect", "ed25519")},
				{"line", string(line), str(v, "expect", "line")},
				{"erased line", string(erased), str(v, "expect", "erased_line")},
			} {
				if c.got != c.want {
					t.Errorf("%s:\n got %s\nwant %s", c.what, c.got, c.want)
				}
			}
			if !loops.Verify(sig, r.ID) {
				t.Error("signature does not verify")
			}
			for i, e := range envs {
				ev, _ := loops.EnvFromJSON(e)
				other, err := loops.Seal(ev, salt, payloads[0])
				if err != nil || other.ID != r.ID {
					t.Errorf("envelope variant %d: id %s, want %s", i, other.ID, r.ID)
				}
			}
			for i, p := range payloads {
				other, err := loops.Seal(env, salt, p)
				if err != nil || other.Commit != r.Commit {
					t.Errorf("payload variant %d: commit %s, want %s", i, other.Commit, r.Commit)
				}
			}
		})
	}
}

// TestJCS runs RFC 8785's reference test data.
func TestJCS(t *testing.T) {
	inputs, _ := filepath.Glob(filepath.Join(vectors, "standard", "jcs", "input", "*.json"))
	if len(inputs) == 0 {
		t.Fatal("no JCS vectors")
	}
	for _, in := range inputs {
		b, _ := os.ReadFile(in)
		want, _ := os.ReadFile(filepath.Join(vectors, "standard", "jcs", "output", filepath.Base(in)))
		v, err := loops.ParseJSON(b)
		if err != nil {
			t.Fatalf("%s: %v", in, err)
		}
		got, err := loops.Canonical(v)
		if err != nil || string(got) != string(want) {
			t.Errorf("%s:\n got %s\nwant %s", filepath.Base(in), got, want)
		}
	}
}

// TestNumbers runs the head of RFC 8785's ECMAScript number test file.
func TestNumbers(t *testing.T) {
	f, err := os.Open(filepath.Join(vectors, "standard", "es6-numbers.txt"))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	n := 0
	for sc.Scan() {
		h, want, _ := strings.Cut(sc.Text(), ",")
		bits, _ := strconv.ParseUint(h, 16, 64)
		got, err := loops.Canonical(math.Float64frombits(bits))
		if err != nil || string(got) != want {
			t.Errorf("%s: got %s, want %s", h, got, want)
		}
		n++
	}
	if n == 0 {
		t.Fatal("no number vectors")
	}
}

// TestEd25519Keys checks key derivation against the SUPERCOP test set.
func TestEd25519Keys(t *testing.T) {
	f, err := os.Open(filepath.Join(vectors, "standard", "ed25519.input.gz"))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		t.Fatal(err)
	}
	sc := bufio.NewScanner(gz)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for i := 0; sc.Scan(); i++ {
		parts := strings.Split(sc.Text(), ":")
		sk, _ := hex.DecodeString(parts[0])
		pk, _ := hex.DecodeString(parts[1])
		if got := loops.Sign(sk[:32], "r:x").Key; got != "k:"+loops.Base32(pk) {
			t.Fatalf("line %d: key %s", i, got)
		}
	}
}

// TestUnknownEnvelopeField: a field the core doesn't read is refused, not
// silently left out of the id.
func TestUnknownEnvelopeField(t *testing.T) {
	v, err := loops.ParseJSON([]byte(`{"kind":"note","observer":"sl:k","emitted":"2026-10-21T05:30:00Z","tags":["x"]}`))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := loops.EnvFromJSON(v); err == nil {
		t.Fatal("an unknown envelope field was accepted")
	}
}

// TestDuplicateMember: JSON with a repeated member name is refused.
func TestDuplicateMember(t *testing.T) {
	if _, err := loops.ParseJSON([]byte(`{"a":1,"a":2}`)); err == nil {
		t.Fatal("a duplicate member was accepted")
	}
}
