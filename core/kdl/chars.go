package kdl

func isSpace(r rune) bool {
	switch r {
	case '\t', ' ', 0xA0, 0x1680, 0x202F, 0x205F, 0x3000:
		return true
	}
	return r >= 0x2000 && r <= 0x200A
}

// isNewline reports a single-rune newline; CRLF is handled by the scanner.
func isNewline(r rune) bool {
	switch r {
	case '\n', '\r', 0x85, 0x0B, 0x0C, 0x2028, 0x2029:
		return true
	}
	return false
}

func disallowed(r rune) bool {
	return r <= 0x08 || (r >= 0x0E && r <= 0x1F) || r == 0x7F ||
		(r >= 0xD800 && r <= 0xDFFF) || r == 0x200E || r == 0x200F ||
		(r >= 0x202A && r <= 0x202E) || (r >= 0x2066 && r <= 0x2069) || r == 0xFEFF
}

func isIdentChar(r rune) bool {
	if isSpace(r) || isNewline(r) || disallowed(r) {
		return false
	}
	switch r {
	case '\\', '/', '(', ')', '{', '}', ';', '[', ']', '"', '#', '=':
		return false
	}
	return true
}

func isDigit(r rune) bool { return r >= '0' && r <= '9' }

var keywords = map[string]bool{"true": true, "false": true, "null": true, "inf": true, "-inf": true, "nan": true}

// IsIdentifier reports whether s can be written as a bare identifier.
func IsIdentifier(s string) bool {
	rs := []rune(s)
	if len(rs) == 0 || keywords[s] {
		return false
	}
	for _, r := range rs {
		if !isIdentChar(r) {
			return false
		}
	}
	at := func(i int) rune {
		if i < len(rs) {
			return rs[i]
		}
		return 0
	}
	switch {
	case isDigit(rs[0]):
		return false
	case rs[0] == '+' || rs[0] == '-':
		return !isDigit(at(1)) && !(at(1) == '.' && isDigit(at(2)))
	case rs[0] == '.':
		return !isDigit(at(1))
	}
	return true
}
