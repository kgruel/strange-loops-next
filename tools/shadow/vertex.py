"""Read the single-store subset of a legacy KDL vertex used by shadow export."""

from dataclasses import dataclass
import re


class InvalidVertex(ValueError):
    def __init__(self, line, message):
        super().__init__(f"shadow-map-invalid at line {line}: {message}")


@dataclass(frozen=True)
class Token:
    kind: str
    value: str
    line: int


_TOKEN = re.compile(
    r'(?P<space>[ \t]+)|(?P<end>\r\n|\r|\n|;)|(?P<comment>//[^\r\n]*)'
    r'|(?P<block>/\*)|(?P<disabled>/-)|(?P<open>\{)|(?P<close>\})|(?P<equals>=)'
    r'|(?P<string>"(?:[^"\\\r\n]|\\[^\r\n])*")'
    r'|(?P<word>(?:(?!//|/\*|/-)[^\s{};="])+)'
)


_ESCAPE = re.compile(r'\\(?:u\{([0-9a-fA-F]{1,6})\}|(.))')
_ESCAPES = {'"': '"', '\\': '\\', '/': '/', 'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t'}


def quoted(text, line):
    def decode(match):
        digits, short = match.groups()
        if digits is None and short in _ESCAPES:
            return _ESCAPES[short]
        if digits is not None:
            scalar = int(digits, 16)
            if scalar <= 0x10FFFF and not 0xD800 <= scalar <= 0xDFFF:
                return chr(scalar)
        raise InvalidVertex(line, "unsupported string escape")
    return _ESCAPE.sub(decode, text[1:-1])


def tokens(text):
    pos, line = 0, 1
    previous = None
    while pos < len(text):
        match = _TOKEN.match(text, pos)
        if not match:
            raise InvalidVertex(line, "unrecognized token or unterminated string")
        pos = match.end()
        kind, value = match.lastgroup, match.group()
        if kind == "block":
            start, depth = line, 1
            for delimiter in re.finditer(r"/\*|\*/|\r\n|\r|\n", text[pos:]):
                part = delimiter.group()
                if part == "/*":
                    depth += 1
                elif part == "*/":
                    depth -= 1
                    if depth == 0:
                        pos += delimiter.end()
                        break
                else:
                    line += 1
            else:
                raise InvalidVertex(start, "unterminated block comment")
        elif kind not in ("space", "comment"):
            if kind in ("word", "string") and previous in ("word", "string"):
                raise InvalidVertex(line, "expected space between tokens")
            if kind == "string":
                value = quoted(value, line)
            yield Token(kind, value, line)
            if kind == "end" and value != ";":
                line += 1
        previous = kind
    yield Token("eof", "", line)


@dataclass
class Node:
    name: str
    line: int
    args: list
    children: list | None


class Parser:
    def __init__(self, text):
        self.tokens = iter(tokens(text))
        self.token = next(self.tokens)

    def take(self):
        old = self.token
        self.token = next(self.tokens)
        return old

    def nodes(self, parent=None):
        nodes = []
        while self.token.kind not in ("close", "eof"):
            if self.token.kind == "end":
                self.take()
                continue
            disabled = self.token.kind == "disabled"
            if disabled:
                self.take()
                while self.token.kind == "end":
                    self.take()
            name = self.token
            if name.kind not in ("word", "string"):
                raise InvalidVertex(name.line, "expected a node name")
            self.take()
            args = []
            while self.token.kind in ("word", "string", "disabled"):
                omit = self.token.kind == "disabled"
                if omit:
                    self.take()
                    if self.token.kind == "open":
                        self.take()
                        self.nodes(name)
                        continue
                if self.token.kind not in ("word", "string"):
                    raise InvalidVertex(self.token.line, "expected an argument or property")
                arg = self.take()
                if self.token.kind == "equals":
                    self.take()
                    if self.token.kind not in ("word", "string"):
                        raise InvalidVertex(arg.line, "expected a property value")
                    self.take()
                    arg = Token("property", arg.value, arg.line)
                if not omit:
                    args.append(arg)
            children = None
            if self.token.kind == "open":
                self.take()
                children = self.nodes(name)
            if self.token.kind not in ("close", "end", "eof"):
                raise InvalidVertex(self.token.line, "expected a node terminator")
            if not disabled:
                nodes.append(Node(name.value, name.line, args, children))
        if parent is None and self.token.kind == "close":
            raise InvalidVertex(self.token.line, "unexpected closing brace")
        if parent is not None:
            if self.token.kind == "eof":
                raise InvalidVertex(parent.line, f"unclosed {parent.value} block")
            self.take()
        return nodes


def block(node):
    if node.args or node.children is None:
        raise InvalidVertex(node.line, f"{node.name} requires a block without arguments")
    return node.children


def unique(nodes, allowed, ignored=(), ignored_blocks=()):
    result = {}
    for node in nodes:
        if node.name in ignored_blocks:
            block(node)
            continue
        if node.name in ignored:
            continue
        if node.name not in allowed:
            raise InvalidVertex(node.line, f"unsupported {node.name!r}")
        if node.name in result:
            raise InvalidVertex(node.line, f"duplicate {node.name!r}")
        result[node.name] = node
    return result


def required(nodes, name, line):
    if name not in nodes:
        raise InvalidVertex(line, f"missing {name}")
    return nodes[name]


def string_arg(node):
    if (node.children is not None or len(node.args) != 1
            or node.args[0].kind != "string" or not node.args[0].value):
        raise InvalidVertex(node.line, f"{node.name} requires one nonempty quoted string")
    return node.args[0].value


def parse_vertex(text):
    top = unique(Parser(text).nodes(), {"name", "store", "loops"},
                 ignored_blocks={"observers", "sources"})
    name = string_arg(required(top, "name", 1))
    if name in (".", "..") or any(c in name for c in "/\\\x00"):
        raise InvalidVertex(top["name"].line, "name must be one filename component")
    store = string_arg(required(top, "store", 1))
    if "\x00" in store:
        raise InvalidVertex(top["store"].line, "invalid store path")
    kinds = {}
    for kind in block(required(top, "loops", 1)):
        if kind.name == "boundary":
            continue
        if not kind.name or kind.name in kinds:
            raise InvalidVertex(kind.line, "empty or duplicate kind")
        fields = unique(block(kind), {"fold"}, {"edge", "lifecycle", "search", "preview", "boundary"})
        kinds[kind.name] = fold_entry(required(fields, "fold", kind.line))
    return {"format": "shadow-map-v1", "source": name, "store": store, "kinds": kinds}


# The old tool's fold operations, and the arguments each takes after its name:
# a field is a nonempty quoted string, a count an unsigned 64-bit word.
_FOLD_OPS = {
    "by": ("field",), "collect": ("count",),
    "inc": (), "count": (), "latest": (),
    "sum": ("field",), "max": ("field",), "min": ("field",), "avg": ("field",),
    "window": ("count", "field"),
}


def fold_slot(node):
    """One slot of a fold, `<target> "<op>" <args>`, as (op, argument values)."""
    if node.children is not None or not node.args or node.args[0].kind != "string":
        raise InvalidVertex(node.line, f"fold slot {node.name!r} requires a quoted operation")
    op, args = node.args[0].value, node.args[1:]
    if op not in _FOLD_OPS:
        raise InvalidVertex(node.line, f"unsupported fold operation {op!r}")
    shapes = _FOLD_OPS[op]
    if len(args) != len(shapes):
        raise InvalidVertex(node.line, f"fold {op!r} takes {len(shapes)} argument(s)")
    for arg, shape in zip(args, shapes):
        if shape == "field" and not (arg.kind == "string" and arg.value):
            raise InvalidVertex(node.line, f"fold {op!r} requires a nonempty quoted field")
        if shape == "count" and not (arg.kind == "word"
                                     and re.fullmatch(r"0|[1-9][0-9]{0,19}", arg.value)
                                     and int(arg.value) < 2**64):
            raise InvalidVertex(node.line, f"fold {op!r} requires an unsigned 64-bit count")
    return op, [arg.value for arg in args]


def fold_entry(fold):
    """The map entry for a kind's fold, read as the old tool reads it.

    The old tool reads a kind's items from its first slot only: a first `by`
    keys the kind, and a first `collect` collects it, with the limit an old
    read shows. Slots after it only compute from the same facts (`inc`,
    `latest`, `sum` and the rest) and do not change which records the facts
    become, so they are checked and left out of the map. A fold whose first
    slot is anything else, a later `by` or a second `collect` is refused.
    """
    slots = block(fold)
    if not slots:
        raise InvalidVertex(fold.line, "fold requires a slot")
    seen, ops = set(), []
    for node in slots:
        if node.name in seen:
            raise InvalidVertex(node.line, f"duplicate fold slot {node.name!r}")
        seen.add(node.name)
        ops.append((node, *fold_slot(node)))
    first, op, args = ops[0]
    if op not in ("by", "collect"):
        raise InvalidVertex(first.line, "a fold's first slot must be by or collect")
    for node, other, _ in ops[1:]:
        if other == "by":
            raise InvalidVertex(node.line, "a by slot keys the kind only as the fold's first slot")
        if other == "collect" and op == "collect":
            raise InvalidVertex(node.line, "a fold collects in one slot")
    return {op: args[0]}
