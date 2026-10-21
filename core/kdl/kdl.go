// Package kdl parses KDL v2 documents, the syntax of specs and declarations.
// It is a format library: it knows nothing about loops, and it is tested
// against the official KDL test suite.
//
// Numbers are kept exact: an integer in any radix becomes a big.Int, and a
// decimal keeps its digits as text. Nothing is rounded through a float.
package kdl

import (
	"fmt"
	"math/big"
)

// Document is a parsed KDL document.
type Document struct {
	Nodes []*Node
}

// Node is a name with optional type, arguments, properties and children.
type Node struct {
	Type     *string
	Name     string
	Args     []Value
	Props    []Prop // in source order; a later key overrides an earlier one
	Children []*Node
}

// Prop is a key and value. Use Node.Prop to read with override semantics.
type Prop struct {
	Key   string
	Value Value
}

// Prop returns the rightmost value for a key.
func (n *Node) Prop(key string) (Value, bool) {
	for i := len(n.Props) - 1; i >= 0; i-- {
		if n.Props[i].Key == key {
			return n.Props[i].Value, true
		}
	}
	return Value{}, false
}

// Kind tells what a Value holds.
type Kind int

const (
	String Kind = iota
	Number
	Bool
	Null
)

// Value is an argument or property value.
type Value struct {
	Type *string
	Kind Kind
	Str  string // String
	Num  Num    // Number
	Bool bool   // Bool
}

// Num is an exact number. Exactly one of Int, Decimal or Keyword is set.
type Num struct {
	Int     *big.Int // written without '.' or exponent, in any radix
	Decimal string   // otherwise, as exact text: "-1.5", "2.5E+10"
	Keyword string   // "inf", "-inf" or "nan"
}

// Error is a syntax error with its position.
type Error struct {
	Line, Col int
	Msg       string
}

func (e *Error) Error() string { return fmt.Sprintf("kdl: %d:%d: %s", e.Line, e.Col, e.Msg) }
