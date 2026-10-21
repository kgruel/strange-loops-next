package record

import (
	"errors"
	"math"
	"slices"
	"strconv"
	"strings"
	"unicode/utf16"
)

// Canonical renders a value as RFC 8785 (JCS) text: members sorted by
// UTF-16 code units, minimal string escapes, ECMAScript number format.
func Canonical(v Value) ([]byte, error) {
	var b strings.Builder
	if err := writeCanonical(&b, v); err != nil {
		return nil, err
	}
	return []byte(b.String()), nil
}

func writeCanonical(b *strings.Builder, v Value) error {
	switch t := v.(type) {
	case nil:
		b.WriteString("null")
	case bool:
		b.WriteString(strconv.FormatBool(t))
	case float64:
		s, err := formatNumber(t)
		if err != nil {
			return err
		}
		b.WriteString(s)
	case string:
		writeString(b, t)
	case []Value:
		b.WriteByte('[')
		for i, x := range t {
			if i > 0 {
				b.WriteByte(',')
			}
			if err := writeCanonical(b, x); err != nil {
				return err
			}
		}
		b.WriteByte(']')
	case *Object:
		keys := slices.Clone(t.Keys)
		slices.SortFunc(keys, compareUTF16)
		b.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				b.WriteByte(',')
			}
			writeString(b, k)
			b.WriteByte(':')
			if err := writeCanonical(b, t.Values[k]); err != nil {
				return err
			}
		}
		b.WriteByte('}')
	default:
		return errors.New("canonical: not a JSON value")
	}
	return nil
}

func compareUTF16(a, b string) int {
	return slices.Compare(utf16.Encode([]rune(a)), utf16.Encode([]rune(b)))
}

func writeString(b *strings.Builder, s string) {
	const hex = "0123456789abcdef"
	b.WriteByte('"')
	for _, r := range s {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\b':
			b.WriteString(`\b`)
		case '\f':
			b.WriteString(`\f`)
		case '\n':
			b.WriteString(`\n`)
		case '\r':
			b.WriteString(`\r`)
		case '\t':
			b.WriteString(`\t`)
		default:
			if r < 0x20 {
				b.WriteString(`\u00`)
				b.WriteByte(hex[r>>4])
				b.WriteByte(hex[r&15])
			} else {
				b.WriteRune(r)
			}
		}
	}
	b.WriteByte('"')
}

// formatNumber is ECMAScript's Number.prototype.toString, which RFC 8785
// adopts: the shortest round-tripping digits, plain between 1e-7 and 1e21.
func formatNumber(f float64) (string, error) {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "", errors.New("canonical: no NaN or Infinity in JSON")
	}
	if f == 0 {
		return "0", nil
	}
	sign := ""
	if f < 0 {
		sign, f = "-", -f
	}
	e := strconv.FormatFloat(f, 'e', -1, 64)
	at := strings.IndexByte(e, 'e')
	exp, _ := strconv.Atoi(e[at+1:])
	if exp > -7 && exp < 21 {
		return sign + strconv.FormatFloat(f, 'f', -1, 64), nil
	}
	if exp > 0 {
		return sign + e[:at] + "e+" + strconv.Itoa(exp), nil
	}
	return sign + e[:at] + "e-" + strconv.Itoa(-exp), nil
}
