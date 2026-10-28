# The spec

A vertex's spec is JSON: `from` chooses records by their envelopes, and
`fold` names slots, each one fold from a closed vocabulary with an optional
`where`. This page is normative: it is the grammar `Spec.ofJson`
(`model/Loops/Spec.lean`) implements. What the slots then hold is in
[`laws.md`](laws.md), and the vectors in `vectors/spec/` pin both.

## The spec

| Key | Required | Holds |
|---|---|---|
| `vertex` | yes | the vertex's name: text, not empty |
| `from` | yes | an array of at least one source |
| `fold` | no | an object of slots by name; without it, the spec has none |
| `note`, `ticks`, `order`, `resolve`, `window`, `boundary`, `param`, `covers`, `into`, `bundle` | no | any value: carried, not yet read |

Any other key is refused. So is a key repeated in any object anywhere in the
spec, as layer 0 refuses one in a payload.

## Sources

| Key | Required | Holds |
|---|---|---|
| `store` | yes | the store, as the realm names it: text, not empty |
| `kind` | no | the kinds taken: an array of at least one, each text that isn't empty |
| `about` | no | the thing taken: a typed reference (`prefix:value`) |

A source takes a record when the record's kind is one of `kind` (or `kind`
is left out) and the record is about `about` (or `about` is left out). The
spec takes a record when any of its sources does.

`about` here means about the thing: a record about nothing anchors the
thing named by its own id, so `"about": "r:X"` takes X as well as every
record about X. (`env.about` in `where` reads the field as written, which
is empty on X.)

## Slots

A slot's name is text that isn't empty. A slot is an object with exactly one
fold type:

| Fold type | Argument |
|---|---|
| `count` | `true` |
| `sum`, `min`, `max` | the payload field it reads: text, not empty |
| `latest-by` | `"about"` |
| `collect` | `true` |

and optionally:

| Key | Holds | On |
|---|---|---|
| `follow` | `"prev"` | `collect`, and always written on `latest-by` |
| `limit` | a whole number, at least 1 | `collect` |
| `where` | a `where` map, below | any |
| `note` | any value: carried, not read | any |

Any other key is refused.

## `where`

A `where` map is an object of at least one field, each naming an object of
at least one test: an operator and its argument. A field is `env.` and one
of `kind`, `observer`, `about`, `prev`, `under`, `erases`, `emitted`,
`occurred`, naming an envelope field; or a name that isn't empty and doesn't
start `env.`, naming a payload field.

| Operator | Argument |
|---|---|
| `is`, `not` | a value the field could hold, below |
| `present`, `absent` | `true` |
| `at-least`, `below` | a whole number on a payload field, a time on `env.emitted` or `env.occurred`; refused on any other field |

A value is what layer 0 would accept in the field, since nothing else can
match:

| Field | Value |
|---|---|
| `env.kind` | text, not empty |
| `env.observer`, `env.about` | a typed reference |
| `env.prev`, `env.under`, `env.erases` | a record id |
| `env.emitted`, `env.occurred` | a time in `occurred`'s grammar ([`record.md`](record.md)) |
| a payload field | text, a whole number, or a boolean |

What the tests mean is in [`laws.md`](laws.md): a map holds when every test
does, a set field holds a value when one of its members is that value, and a
time is tested by the span it reads as, never its spelling.

## Refusals

A spec that breaks a rule is refused with a code and the path of what broke
it. A path is the keys from the top of the spec to the offending member,
joined by `.`; an array adds nothing, so every source's path starts `from`.
Paths locate a refusal; they aren't unique, since a key may itself hold a
`.` (`fold.c.where.env.kind`).

Checks run in this order, and the first that fails is the refusal:

1. **A repeated key**, anywhere: `member-duplicate`, at the first repeat
   found depth first in member order. A member's value is searched before
   the members after it, and an array's elements in order, so
   `{"a": 1, "b": {"c": 1, "c": 2}, "a": 2}` is refused at `b.c`.
2. **An object**: `spec-not-object`, at the empty path.
3. **Known keys**: `unknown-key`, at the first unknown key as written.
4. **`vertex`**: `vertex-missing` when it is left out, `vertex-invalid` when
   it isn't text or is empty; at `vertex`.
5. **`from`**: `from-missing` when it is left out or empty; `from-invalid`
   at `from` when it isn't an array. Then each source in order: not an
   object (`from-invalid` at `from`), an unknown key (`unknown-key` at
   `from.<key>`), then `store`, `kind` and `about`, in that order however
   they are written (`from-invalid` at `from.store`, `from.kind`,
   `from.about`).
6. **`fold`**: `fold-invalid` at `fold` when it isn't an object. Then each
   slot in the order written, at `fold.<name>`:
   1. its name is empty, or it isn't an object: `fold-invalid`;
   2. an unknown key: `unknown-key` at `fold.<name>.<key>`;
   3. not exactly one fold type: `fold-type`;
   4. `follow`: `follow-missing` on latest-by without it, `follow-invalid`
      when it isn't `"prev"` or the fold type isn't collect or latest-by;
      at `fold.<name>.follow`;
   5. `limit`: `limit-invalid` when it isn't a whole number of at least 1,
      or the fold type isn't collect; at `fold.<name>.limit`;
   6. the fold type's argument: `fold-argument` at `fold.<name>.<type>`;
   7. `where`, below.
7. **`where`**: `where-invalid` throughout. At `fold.<name>.where` when it
   isn't an object or is empty. Then each field in the order written, at
   `fold.<name>.where.<field>`: a name that isn't a field, or tests that
   aren't an object or are empty; then each test in the order written, at
   the same path: an unknown operator, or an argument that doesn't fit.

These are the only codes.

## The parsed form

`spec/parse` vectors show an accepted spec in its parsed form: `vertex`;
`from`, each source with `store`, then `kind` and `about` when given; and
`fold`, every slot with its fold type, `follow` when it follows (always on
latest-by), `limit` when given, and `where` as written, a time keeping its
spelling. Carried keys and `note` are dropped. The parsed form of an
accepted spec parses back to itself, and the parser accepts exactly the
specs that have a written form (`spec.parse` in [`laws.md`](laws.md)).
