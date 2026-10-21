// Package record is layer 0: canonical bytes, commitments, ids and
// signatures. It does no I/O.
package record

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// Value is a JSON value as the core holds it: nil, bool, float64, string,
// []Value or *Object. Numbers are IEEE-754 doubles, as RFC 8785 requires.
type Value any

// Object keeps members as written; canonical order is applied on output.
type Object struct {
	Keys   []string
	Values map[string]Value
}

// Get returns a member and whether it was present.
func (o *Object) Get(k string) (Value, bool) {
	v, ok := o.Values[k]
	return v, ok
}

// ParseJSON reads one JSON value, refusing duplicate member names and
// trailing data.
func ParseJSON(b []byte) (Value, error) {
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	v, err := parseValue(dec)
	if err != nil {
		return nil, err
	}
	if _, err := dec.Token(); err != io.EOF {
		return nil, errors.New("json: trailing data")
	}
	return v, nil
}

func parseValue(dec *json.Decoder) (Value, error) {
	tok, err := dec.Token()
	if err != nil {
		return nil, err
	}
	switch t := tok.(type) {
	case json.Delim:
		switch t {
		case '[':
			arr := []Value{}
			for dec.More() {
				v, err := parseValue(dec)
				if err != nil {
					return nil, err
				}
				arr = append(arr, v)
			}
			_, err := dec.Token()
			return arr, err
		case '{':
			obj := &Object{Values: map[string]Value{}}
			for dec.More() {
				kt, err := dec.Token()
				if err != nil {
					return nil, err
				}
				k := kt.(string)
				if _, dup := obj.Values[k]; dup {
					return nil, fmt.Errorf("json: duplicate member %q", k)
				}
				v, err := parseValue(dec)
				if err != nil {
					return nil, err
				}
				obj.Keys = append(obj.Keys, k)
				obj.Values[k] = v
			}
			_, err := dec.Token()
			return obj, err
		}
		return nil, fmt.Errorf("json: unexpected %v", t)
	case json.Number:
		return t.Float64()
	default:
		return t, nil
	}
}
