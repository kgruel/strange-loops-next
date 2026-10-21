package kdl

import (
	"fmt"
	"math/big"
	"strings"
	"unicode/utf8"
)

type parser struct {
	src []rune
	pos int
}

// Parse reads a KDL v2 document.
func Parse(b []byte) (*Document, error) {
	if !utf8.Valid(b) {
		return nil, &Error{1, 1, "not UTF-8"}
	}
	p := &parser{src: []rune(string(b))}
	if len(p.src) > 0 && p.src[0] == 0xFEFF {
		p.pos = 1
	}
	for i := p.pos; i < len(p.src); i++ {
		if disallowed(p.src[i]) {
			p.pos = i
			return nil, p.errf("disallowed code point U+%04X", p.src[i])
		}
	}
	nodes, err := p.nodes(false)
	if err != nil {
		return nil, err
	}
	return &Document{Nodes: nodes}, nil
}

func (p *parser) errf(format string, a ...any) error {
	line, col := 1, 1
	for i := 0; i < p.pos && i < len(p.src); i++ {
		if p.src[i] == '\n' {
			line, col = line+1, 1
		} else {
			col++
		}
	}
	return &Error{line, col, fmt.Sprintf(format, a...)}
}

func (p *parser) peek(off int) rune {
	if p.pos+off < len(p.src) {
		return p.src[p.pos+off]
	}
	return -1
}

func (p *parser) eof() bool { return p.pos >= len(p.src) }

func (p *parser) has(s string) bool {
	for i, r := range []rune(s) {
		if p.peek(i) != r {
			return false
		}
	}
	return true
}

// newline consumes one newline (CRLF counts as one).
func (p *parser) newline() bool {
	if p.has("\r\n") {
		p.pos += 2
		return true
	}
	if isNewline(p.peek(0)) {
		p.pos++
		return true
	}
	return false
}

// comment consumes a multi-line comment, which may nest.
func (p *parser) comment() (bool, error) {
	if !p.has("/*") {
		return false, nil
	}
	p.pos += 2
	for depth := 1; depth > 0; {
		switch {
		case p.eof():
			return false, p.errf("unterminated comment")
		case p.has("/*"):
			p.pos += 2
			depth++
		case p.has("*/"):
			p.pos += 2
			depth--
		default:
			p.pos++
		}
	}
	return true, nil
}

func (p *parser) lineComment() bool {
	if !p.has("//") {
		return false
	}
	for !p.eof() && !p.newline() {
		p.pos++
	}
	return true
}

// ws consumes unicode spaces and multi-line comments.
func (p *parser) ws() (bool, error) {
	any := false
	for {
		if isSpace(p.peek(0)) {
			p.pos++
			any = true
			continue
		}
		ok, err := p.comment()
		if err != nil {
			return false, err
		}
		if !ok {
			return any, nil
		}
		any = true
	}
}

// escline consumes `\` ws* (comment | newline | eof).
func (p *parser) escline() (bool, error) {
	if p.peek(0) != '\\' {
		return false, nil
	}
	start := p.pos
	p.pos++
	if _, err := p.ws(); err != nil {
		return false, err
	}
	if p.lineComment() || p.newline() || p.eof() {
		return true, nil
	}
	p.pos = start
	return false, p.errf("a line continuation must end its line")
}

// nodeSpace consumes node-space*: whitespace and line continuations.
func (p *parser) nodeSpace() (bool, error) {
	any := false
	for {
		w, err := p.ws()
		if err != nil {
			return false, err
		}
		e, err := p.escline()
		if err != nil {
			return false, err
		}
		if !w && !e {
			return any, nil
		}
		any = true
	}
}

// lineSpace consumes line-space*: node-space, newlines and line comments.
func (p *parser) lineSpace() error {
	for {
		n, err := p.nodeSpace()
		if err != nil {
			return err
		}
		if !n && !p.newline() && !p.lineComment() {
			return nil
		}
	}
}

func (p *parser) slashdash() (bool, error) {
	if !p.has("/-") {
		return false, nil
	}
	p.pos += 2
	return true, p.lineSpace()
}

// nodes parses nodes until EOF (top level) or '}' (a children block).
func (p *parser) nodes(inBlock bool) ([]*Node, error) {
	var out []*Node
	for {
		if err := p.lineSpace(); err != nil {
			return nil, err
		}
		if p.eof() {
			if inBlock {
				return nil, p.errf("unclosed children block")
			}
			return out, nil
		}
		if p.peek(0) == '}' {
			if !inBlock {
				return nil, p.errf("unexpected '}'")
			}
			return out, nil
		}
		dashed, err := p.slashdash()
		if err != nil {
			return nil, err
		}
		n, err := p.node()
		if err != nil {
			return nil, err
		}
		// A node ends at a comment, newline, ';', EOF, or its block's '}'.
		switch {
		case p.lineComment(), p.newline(), p.eof():
		case p.peek(0) == ';':
			p.pos++
		case inBlock && p.peek(0) == '}':
		default:
			return nil, p.errf("expected the end of the node")
		}
		if !dashed {
			out = append(out, n)
		}
	}
}

func (p *parser) node() (*Node, error) {
	n := &Node{}
	if p.peek(0) == '(' {
		t, err := p.typeAnn()
		if err != nil {
			return nil, err
		}
		n.Type = &t
		if _, err := p.nodeSpace(); err != nil {
			return nil, err
		}
	}
	name, ok, err := p.str()
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, p.errf("expected a node name")
	}
	n.Name = name
	children, dashedChildren := false, false
	for {
		spaced, err := p.nodeSpace()
		if err != nil {
			return nil, err
		}
		dashed, err := p.slashdash()
		if err != nil {
			return nil, err
		}
		r := p.peek(0)
		switch {
		case r == '{':
			if children && !dashed {
				return nil, p.errf("a node has one children block")
			}
			kids, err := p.block()
			if err != nil {
				return nil, err
			}
			if dashed {
				dashedChildren = true
			} else {
				n.Children, children = kids, true
			}
			continue
		case dashed:
		case p.eof() || r == ';' || r == '}' || isNewline(r) || p.has("//"):
			return n, nil
		case !spaced:
			return nil, p.errf("entries must be separated by whitespace")
		}
		if children || dashedChildren {
			return nil, p.errf("arguments and properties must come before children")
		}
		if err := p.entry(n, dashed); err != nil {
			return nil, err
		}
	}
}

func (p *parser) block() ([]*Node, error) {
	p.pos++ // '{'
	kids, err := p.nodes(true)
	if err != nil {
		return nil, err
	}
	p.pos++ // '}'
	return kids, nil
}

func (p *parser) typeAnn() (string, error) {
	p.pos++ // '('
	if _, err := p.nodeSpace(); err != nil {
		return "", err
	}
	t, ok, err := p.str()
	if err != nil {
		return "", err
	}
	if !ok {
		return "", p.errf("expected a type name")
	}
	if _, err := p.nodeSpace(); err != nil {
		return "", err
	}
	if p.peek(0) != ')' {
		return "", p.errf("expected ')'")
	}
	p.pos++
	return t, nil
}

// entry parses an argument or a property and adds it unless dashed.
func (p *parser) entry(n *Node, dashed bool) error {
	if p.peek(0) != '(' && !p.numberAhead() {
		key, ok, err := p.str()
		if err != nil {
			return err
		}
		if ok {
			after := p.pos
			if _, err := p.nodeSpace(); err != nil {
				return err
			}
			if p.peek(0) == '=' {
				p.pos++
				if _, err := p.nodeSpace(); err != nil {
					return err
				}
				v, err := p.value()
				if err != nil {
					return err
				}
				if !dashed {
					n.Props = append(n.Props, Prop{key, v})
				}
				return nil
			}
			p.pos = after
			if !dashed {
				n.Args = append(n.Args, Value{Kind: String, Str: key})
			}
			return nil
		}
	}
	v, err := p.value()
	if err != nil {
		return err
	}
	if !dashed {
		n.Args = append(n.Args, v)
	}
	return nil
}

func (p *parser) value() (Value, error) {
	var v Value
	if p.peek(0) == '(' {
		t, err := p.typeAnn()
		if err != nil {
			return v, err
		}
		v.Type = &t
		if _, err := p.nodeSpace(); err != nil {
			return v, err
		}
	}
	r := p.peek(0)
	switch {
	case r == '#' && p.peek(1) != '"' && p.peek(1) != '#':
		word := p.word(1)
		p.pos += 1 + len([]rune(word))
		switch word {
		case "true", "false":
			v.Kind, v.Bool = Bool, word == "true"
		case "null":
			v.Kind = Null
		case "inf", "-inf", "nan":
			v.Kind, v.Num = Number, Num{Keyword: word}
		default:
			return v, p.errf("unknown keyword #%s", word)
		}
		return v, nil
	case p.numberAhead():
		word := p.word(0)
		num, ok := parseNumber(word)
		if !ok {
			return v, p.errf("invalid number %q", word)
		}
		p.pos += len([]rune(word))
		v.Kind, v.Num = Number, num
		return v, nil
	}
	s, ok, err := p.str()
	if err != nil {
		return v, err
	}
	if !ok {
		return v, p.errf("expected a value")
	}
	v.Kind, v.Str = String, s
	return v, nil
}

// numberAhead reports whether a number starts here: a digit, or a sign and a digit.
func (p *parser) numberAhead() bool {
	r := p.peek(0)
	return isDigit(r) || ((r == '+' || r == '-') && isDigit(p.peek(1)))
}

// word returns the run of identifier characters starting at off.
func (p *parser) word(off int) string {
	end := p.pos + off
	for end < len(p.src) && isIdentChar(p.src[end]) {
		end++
	}
	return string(p.src[p.pos+off : end])
}

// str parses an identifier, quoted or raw string. ok is false when none starts here.
func (p *parser) str() (string, bool, error) {
	r := p.peek(0)
	switch {
	case r == '"':
		s, err := p.quoted(0)
		return s, true, err
	case r == '#' && (p.peek(1) == '"' || p.peek(1) == '#'):
		hashes := 0
		for p.peek(hashes) == '#' {
			hashes++
		}
		if p.peek(hashes) != '"' {
			return "", false, p.errf("expected a raw string")
		}
		p.pos += hashes
		s, err := p.quoted(hashes)
		return s, true, err
	case isIdentChar(r):
		w := p.word(0)
		if !IsIdentifier(w) {
			return "", false, p.errf("invalid identifier %q", w)
		}
		p.pos += len([]rune(w))
		return w, true, nil
	}
	return "", false, nil
}

// quoted parses a quoted or multi-line string; hashes > 0 makes it raw.
func (p *parser) quoted(hashes int) (string, error) {
	closer := strings.Repeat("#", hashes)
	if p.has(`"""`) {
		p.pos += 3
		if !p.newline() {
			return "", p.errf(`a multi-line string starts with a newline after """`)
		}
		start := p.pos
		for {
			if p.eof() {
				return "", p.errf("unterminated multi-line string")
			}
			if hashes == 0 && p.peek(0) == '\\' {
				p.pos += 2
				continue
			}
			if p.has(`"""` + closer) {
				body := string(p.src[start:p.pos])
				p.pos += 3 + hashes
				return p.multiline(body, hashes > 0)
			}
			p.pos++
		}
	}
	p.pos++ // '"'
	var b strings.Builder
	for {
		r := p.peek(0)
		switch {
		case r < 0:
			return "", p.errf("unterminated string")
		case isNewline(r):
			return "", p.errf("a newline in a single-line string")
		case r == '"' && p.has(`"`+closer):
			p.pos += 1 + hashes
			return b.String(), nil
		case r == '\\' && hashes == 0:
			if err := p.escape(&b); err != nil {
				return "", err
			}
		default:
			b.WriteRune(r)
			p.pos++
		}
	}
}

// escape consumes one escape at p.pos into b.
func (p *parser) escape(b *strings.Builder) error {
	p.pos++ // '\'
	r := p.peek(0)
	if isSpace(r) || isNewline(r) {
		for isSpace(p.peek(0)) || p.newline() {
			if isSpace(p.peek(0)) {
				p.pos++
			}
		}
		return nil
	}
	p.pos++
	switch r {
	case 'n':
		b.WriteByte('\n')
	case 'r':
		b.WriteByte('\r')
	case 't':
		b.WriteByte('\t')
	case '\\':
		b.WriteByte('\\')
	case '"':
		b.WriteByte('"')
	case 'b':
		b.WriteByte('\b')
	case 'f':
		b.WriteByte('\f')
	case 's':
		b.WriteByte(' ')
	case 'u':
		if p.peek(0) != '{' {
			return p.errf(`expected \u{...}`)
		}
		p.pos++
		v, digits := 0, 0
		for ; digits < 7 && isHex(p.peek(0)); digits++ {
			v = v*16 + hexVal(p.peek(0))
			p.pos++
		}
		if digits == 0 || digits > 6 || p.peek(0) != '}' || (v >= 0xD800 && v <= 0xDFFF) || v > 0x10FFFF {
			return p.errf("invalid unicode escape")
		}
		p.pos++
		b.WriteRune(rune(v))
	default:
		p.pos--
		return p.errf("invalid escape \\%c", r)
	}
	return nil
}

// multiline dedents a multi-line string body: whitespace escapes first, then
// the last line's prefix, then the remaining escapes.
func (p *parser) multiline(body string, raw bool) (string, error) {
	if !raw {
		body = stripWSEscapes(body)
	}
	lines := splitLines(body)
	last := lines[len(lines)-1]
	for _, r := range last {
		if !isSpace(r) {
			return "", p.errf(`the closing """ must be alone on its line`)
		}
	}
	var out []string
	for _, l := range lines[:len(lines)-1] {
		if strings.TrimFunc(l, isSpace) == "" {
			out = append(out, "")
			continue
		}
		if !strings.HasPrefix(l, last) {
			return "", p.errf("a multi-line string line must start with the closing line's indent")
		}
		out = append(out, l[len(last):])
	}
	s := strings.Join(out, "\n")
	if raw {
		return s, nil
	}
	sub := &parser{src: []rune(s)}
	var b strings.Builder
	for !sub.eof() {
		if sub.peek(0) == '\\' {
			if err := sub.escape(&b); err != nil {
				return "", p.errf("%s", err.(*Error).Msg)
			}
			continue
		}
		b.WriteRune(sub.peek(0))
		sub.pos++
	}
	return b.String(), nil
}

// stripWSEscapes removes `\` and the whitespace and newlines that follow it,
// leaving every other escape for later.
func stripWSEscapes(s string) string {
	rs := []rune(s)
	var b strings.Builder
	for i := 0; i < len(rs); i++ {
		if rs[i] != '\\' || i+1 >= len(rs) {
			b.WriteRune(rs[i])
			continue
		}
		if next := rs[i+1]; isSpace(next) || isNewline(next) {
			i++
			for i < len(rs) && (isSpace(rs[i]) || isNewline(rs[i])) {
				i++
			}
			i--
			continue
		}
		b.WriteRune(rs[i])
		b.WriteRune(rs[i+1])
		i++
	}
	return b.String()
}

// splitLines splits on every newline, CRLF counting as one; the first piece
// is what precedes the first newline.
func splitLines(s string) []string {
	rs := []rune(s)
	var lines []string
	start := 0
	for i := 0; i < len(rs); i++ {
		if !isNewline(rs[i]) {
			continue
		}
		lines = append(lines, string(rs[start:i]))
		if rs[i] == '\r' && i+1 < len(rs) && rs[i+1] == '\n' {
			i++
		}
		start = i + 1
	}
	return append(lines, string(rs[start:]))
}

func isHex(r rune) bool {
	return isDigit(r) || (r >= 'a' && r <= 'f') || (r >= 'A' && r <= 'F')
}

func hexVal(r rune) int {
	switch {
	case isDigit(r):
		return int(r - '0')
	case r >= 'a':
		return int(r-'a') + 10
	}
	return int(r-'A') + 10
}

// parseNumber validates and converts a number token.
func parseNumber(w string) (Num, bool) {
	sign := ""
	if w[0] == '+' || w[0] == '-' {
		if w[0] == '-' {
			sign = "-"
		}
		w = w[1:]
	}
	digits := func(s string, ok func(byte) bool) (string, bool) {
		if s == "" || !ok(s[0]) {
			return "", false
		}
		var b strings.Builder
		for i := 0; i < len(s); i++ {
			switch {
			case ok(s[i]):
				b.WriteByte(s[i])
			case s[i] != '_':
				return "", false
			}
		}
		return b.String(), true
	}
	for _, radix := range []struct {
		prefix string
		base   int
		ok     func(byte) bool
	}{
		{"0x", 16, func(c byte) bool { return isHex(rune(c)) }},
		{"0o", 8, func(c byte) bool { return c >= '0' && c <= '7' }},
		{"0b", 2, func(c byte) bool { return c == '0' || c == '1' }},
	} {
		if strings.HasPrefix(w, radix.prefix) {
			d, ok := digits(w[2:], radix.ok)
			if !ok {
				return Num{}, false
			}
			n, _ := new(big.Int).SetString(sign+d, radix.base)
			return Num{Int: n}, true
		}
	}
	dec := func(c byte) bool { return c >= '0' && c <= '9' }
	mant, exp, hasExp := w, "", false
	if i := strings.IndexAny(w, "eE"); i >= 0 {
		mant, exp, hasExp = w[:i], w[i+1:], true
	}
	intPart, frac, hasFrac := mant, "", false
	if i := strings.IndexByte(mant, '.'); i >= 0 {
		intPart, frac, hasFrac = mant[:i], mant[i+1:], true
	}
	ip, ok := digits(intPart, dec)
	if !ok {
		return Num{}, false
	}
	if !hasFrac && !hasExp {
		n, _ := new(big.Int).SetString(sign+ip, 10)
		return Num{Int: n}, true
	}
	text := sign + ip
	if hasFrac {
		f, ok := digits(frac, dec)
		if !ok {
			return Num{}, false
		}
		text += "." + f
	}
	if hasExp {
		esign := "+"
		if exp != "" && (exp[0] == '+' || exp[0] == '-') {
			if exp[0] == '-' {
				esign = "-"
			}
			exp = exp[1:]
		}
		e, ok := digits(exp, dec)
		if !ok {
			return Num{}, false
		}
		text += "E" + esign + e
	}
	return Num{Decimal: text}, true
}
