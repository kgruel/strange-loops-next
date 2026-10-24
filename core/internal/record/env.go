package record

import (
	"fmt"
	"regexp"
	"slices"
	"strconv"
)

// Env is what the core reads about a record. About and Prev are sets.
type Env struct {
	Kind     string
	Observer string
	Emitted  string
	Occurred *string
	About    []string
	Prev     []string
	Under    *string
}

// canonSet sorts by UTF-16 code units and drops repeats.
func canonSet(xs []string) []string {
	out := slices.Clone(xs)
	slices.SortFunc(out, compareUTF16)
	return slices.Compact(out)
}

// JSON is the envelope's canonical form: sets sorted, empty sets and absent
// fields left out.
func (e Env) JSON() *Object {
	o := &Object{Values: map[string]Value{}}
	put := func(k string, v Value) {
		o.Keys = append(o.Keys, k)
		o.Values[k] = v
	}
	put("kind", e.Kind)
	put("observer", e.Observer)
	put("emitted", e.Emitted)
	if e.Occurred != nil {
		put("occurred", *e.Occurred)
	}
	for _, f := range []struct {
		k  string
		xs []string
	}{{"about", e.About}, {"prev", e.Prev}} {
		if set := canonSet(f.xs); len(set) > 0 {
			arr := make([]Value, len(set))
			for i, s := range set {
				arr[i] = s
			}
			put(f.k, arr)
		}
	}
	if e.Under != nil {
		put("under", *e.Under)
	}
	return o
}

var (
	typedRef = regexp.MustCompile(`^[a-z][a-z0-9-]*:(?s:.)`)
	recordID = regexp.MustCompile(`^r:[a-z2-7]{52}$`)
	emitted  = regexp.MustCompile(`^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$`)
)

// ValidEmitted reports whether s is RFC 3339 with an offset, upper-case T
// and Z, and a real calendar day. A leap second (:60) is allowed.
func ValidEmitted(s string) bool {
	m := emitted.FindStringSubmatch(s)
	if m == nil {
		return false
	}
	n := func(i int) int { v, _ := strconv.Atoi(m[i]); return v }
	y, mo, d := n(1), n(2), n(3)
	if mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo) || n(4) > 23 || n(5) > 59 || n(6) > 60 {
		return false
	}
	return m[7] == "" || (n(7) <= 23 && n(8) <= 59)
}

func daysIn(y, m int) int {
	switch m {
	case 2:
		if (y%4 == 0 && y%100 != 0) || y%400 == 0 {
			return 29
		}
		return 28
	case 4, 6, 9, 11:
		return 30
	}
	return 31
}

// Problem says why an envelope is refused, or "" if it isn't.
func (e Env) Problem() string {
	switch {
	case e.Kind == "":
		return "kind-empty"
	case !typedRef.MatchString(e.Observer):
		return "observer-not-typed"
	case !ValidEmitted(e.Emitted):
		return "emitted-not-rfc3339"
	case !all(e.About, typedRef.MatchString):
		return "about-not-typed"
	case !all(e.Prev, recordID.MatchString):
		return "prev-not-record-id"
	case e.Under != nil && !recordID.MatchString(*e.Under):
		return "under-not-record-id"
	}
	return ""
}

func all(xs []string, ok func(string) bool) bool {
	for _, x := range xs {
		if !ok(x) {
			return false
		}
	}
	return true
}

// EnvFromJSON reads an envelope as a writer hands it over. A field the core
// doesn't read is refused rather than silently left out of the id.
func EnvFromJSON(v Value) (Env, error) {
	o, ok := v.(*Object)
	if !ok {
		return Env{}, fmt.Errorf("env: not an object")
	}
	for _, k := range o.Keys {
		switch k {
		case "kind", "observer", "emitted", "occurred", "about", "prev", "under":
		default:
			return Env{}, fmt.Errorf("env: unknown field %q", k)
		}
	}
	var e Env
	str := func(k string) (string, error) {
		x, _ := o.Get(k)
		s, ok := x.(string)
		if !ok {
			return "", fmt.Errorf("env: %s is not a string", k)
		}
		return s, nil
	}
	opt := func(k string) (*string, error) {
		if _, ok := o.Get(k); !ok {
			return nil, nil
		}
		s, err := str(k)
		return &s, err
	}
	set := func(k string) ([]string, error) {
		x, ok := o.Get(k)
		if !ok {
			return nil, nil
		}
		arr, ok := x.([]Value)
		if !ok {
			return nil, fmt.Errorf("env: %s is not an array", k)
		}
		out := make([]string, len(arr))
		for i, a := range arr {
			if out[i], ok = a.(string); !ok {
				return nil, fmt.Errorf("env: %s holds a non-string", k)
			}
		}
		return out, nil
	}
	var err error
	for _, step := range []func() error{
		func() error { e.Kind, err = str("kind"); return err },
		func() error { e.Observer, err = str("observer"); return err },
		func() error { e.Emitted, err = str("emitted"); return err },
		func() error { e.Occurred, err = opt("occurred"); return err },
		func() error { e.About, err = set("about"); return err },
		func() error { e.Prev, err = set("prev"); return err },
		func() error { e.Under, err = opt("under"); return err },
	} {
		if err := step(); err != nil {
			return Env{}, err
		}
	}
	return e, nil
}
