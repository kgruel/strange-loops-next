package kdl_test

import (
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"testing"

	"github.com/kgruel/strange-loops/core/kdl"
)

const suite = "../../vectors/standard/kdl"

// TestSuite runs the official KDL test suite: every input either fails with
// a `_fail` name, or parses and prints as its expected_kdl file.
func TestSuite(t *testing.T) {
	inputs, _ := filepath.Glob(filepath.Join(suite, "input", "*.kdl"))
	if len(inputs) == 0 {
		t.Fatal("no KDL test cases")
	}
	for _, in := range inputs {
		name := filepath.Base(in)
		t.Run(strings.TrimSuffix(name, ".kdl"), func(t *testing.T) {
			src, _ := os.ReadFile(in)
			doc, err := kdl.Parse(src)
			want, readErr := os.ReadFile(filepath.Join(suite, "expected_kdl", name))
			if readErr != nil {
				if err == nil {
					t.Fatalf("parsed, but should fail:\n%s", src)
				}
				return
			}
			if err != nil {
				t.Fatalf("%v\n%s", err, src)
			}
			if got := format(doc); got != string(want) {
				t.Fatalf("input:\n%s\ngot:\n%s\nwant:\n%s", src, got, want)
			}
		})
	}
}

// format prints a document by the suite's translation rules.
func format(d *kdl.Document) string {
	if len(d.Nodes) == 0 {
		return "\n"
	}
	var b strings.Builder
	for _, n := range d.Nodes {
		writeNode(&b, n, 0)
	}
	return b.String()
}

func writeNode(b *strings.Builder, n *kdl.Node, depth int) {
	b.WriteString(strings.Repeat("    ", depth))
	if n.Type != nil {
		b.WriteString("(" + str(*n.Type) + ")")
	}
	b.WriteString(str(n.Name))
	for _, a := range n.Args {
		b.WriteString(" " + val(a))
	}
	last := map[string]kdl.Value{}
	for _, p := range n.Props {
		last[p.Key] = p.Value
	}
	keys := make([]string, 0, len(last))
	for k := range last {
		keys = append(keys, k)
	}
	slices.Sort(keys)
	for _, k := range keys {
		b.WriteString(" " + str(k) + "=" + val(last[k]))
	}
	if len(n.Children) > 0 {
		b.WriteString(" {\n")
		for _, c := range n.Children {
			writeNode(b, c, depth+1)
		}
		b.WriteString(strings.Repeat("    ", depth) + "}")
	}
	b.WriteString("\n")
}

func val(v kdl.Value) string {
	s := ""
	if v.Type != nil {
		s = "(" + str(*v.Type) + ")"
	}
	switch v.Kind {
	case kdl.String:
		return s + str(v.Str)
	case kdl.Bool:
		if v.Bool {
			return s + "#true"
		}
		return s + "#false"
	case kdl.Null:
		return s + "#null"
	}
	switch {
	case v.Num.Int != nil:
		return s + v.Num.Int.String()
	case v.Num.Keyword != "":
		return s + "#" + v.Num.Keyword
	}
	return s + v.Num.Decimal
}

func str(s string) string {
	if kdl.IsIdentifier(s) {
		return s
	}
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		case '\b':
			b.WriteString(`\b`)
		case '\f':
			b.WriteString(`\f`)
		default:
			if mustEscape(r) {
				b.WriteString(`\u{` + strconv.FormatInt(int64(r), 16) + `}`)
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
	return b.String()
}

// FuzzParse: no input makes the parser panic, and whatever parses prints
// to something that parses again to the same thing.
func FuzzParse(f *testing.F) {
	inputs, _ := filepath.Glob(filepath.Join(suite, "input", "*.kdl"))
	for _, in := range inputs {
		src, _ := os.ReadFile(in)
		f.Add(src)
	}
	f.Fuzz(func(t *testing.T, src []byte) {
		doc, err := kdl.Parse(src)
		if err != nil {
			return
		}
		once := format(doc)
		again, err := kdl.Parse([]byte(once))
		if err != nil {
			t.Fatalf("printed form does not parse: %v\n%s", err, once)
		}
		if twice := format(again); twice != once {
			t.Fatalf("print is not stable:\n%s\n%s", once, twice)
		}
	})
}

// mustEscape: code points a quoted string can't hold literally, namely the
// disallowed ones and newlines.
func mustEscape(r rune) bool {
	return r < 0x20 || r == 0x7F || r == 0x85 || r == 0x2028 || r == 0x2029 ||
		r == 0x200E || r == 0x200F || (r >= 0x202A && r <= 0x202E) ||
		(r >= 0x2066 && r <= 0x2069) || r == 0xFEFF
}
