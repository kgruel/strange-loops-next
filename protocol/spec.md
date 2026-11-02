# The spec

A vertex's spec is JSON.
`from` chooses records by their envelopes.
`fold` names slots, each with one fold type and an optional `where`. This page is normative: it is the grammar `Spec.ofJson`
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

A source checks both kind and thing.
A supplied `kind` must include the record's kind.
A supplied `about` must name a thing the record belongs to. The
spec takes a record when any of its sources does.

For direct spec evaluation, the caller resolves store names outside the runner.
The runner receives records and does not look up stores.
Each source tests only `kind` and `about` on those records.
The direct spec and scenario vectors do not test store resolution, missing stores, or per-source routing.

`about` here names the thing.
A record about nothing anchors the thing named by its id.
Thus `"about": "r:X"` takes X and every record about X. (`env.about` in `where` reads the field as written, which
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

Settle forms before admission, then run heads and all slots over admitted records.
For each slot, count each unread record id once, even if it heads several things.
For `collect`, count unread candidates before the limit.
Apply the limit only to the ordered list of matching records.

A record belongs to each thing in its `about` set.
When that set is empty, it belongs to the thing named by its own id.
Compute heads separately for each thing, using only its records.
A successor can replace a head in one thing but not another.
For a whole-reader view, combine these heads and keep each id once.
Count, sum, min, and max do not copy records for each membership.
`latest` selects the newest head in this combined view as its winner.
It returns the other heads in content order.
It does not use global succession state.

Sum, min, and max read only safe whole values from the named payload field.
Read each number using the layer 0 binary64 rule first.
For each selected record, count an unavailable payload, missing field, or other value as unread.
Do not convert text or booleans to numbers.
The safe input range does not limit the sum accumulator.

## `where`

A `where` map is an object of at least one field, each naming an object of
at least one test: an operator and its argument. An envelope field starts `env.` and names `kind`, `observer`, `about`, `prev`, `under`, `erases`, `emitted` or `occurred`.
A payload field has a nonempty name that does not start `env.`.

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

[`laws.md`](laws.md) defines test meaning.
A map holds when every test holds.
A set field holds a value when a member equals that value.
Time tests read spans, not spellings.

For payload tests, read JSON numbers using the layer 0 binary64 rule.
A whole value has no fractional part and lies within ±(2^53 − 1), inclusive.
This rule applies to `is`, `not`, `at-least`, and `below`.
Thus `1.0` and `1e2` are whole values, but `1.5` and ±2^53 are not.

A `where` map answers no if any test answers no.
Otherwise, it answers unknown if any test answers unknown.
Otherwise, it answers yes.
Test order does not change the answer.
A missing field in a held payload is known absent.
For that field, `is`, `present`, `at-least`, and `below` answer no.
`not` and `absent` answer yes.
A payload field test answers unknown when the reader does not hold the payload.

## Refusals

A spec that breaks a rule is refused with a code and the path of what broke
it. A path joins keys from the spec root to the offending member with `.`.
An array adds nothing, so every source's path starts `from`.
Paths locate a refusal; they aren't unique, since a key may itself hold a
`.` (`fold.c.where.env.kind`).

Checks run in this order, and the first that fails is the refusal:

1. **A repeated key**, anywhere: `member-duplicate`, at the first repeat
   found depth first in member order. A member's value is searched before
   the members after it, and an array's elements in order, so
   `{"a": 1, "b": {"c": 1, "c": 2}, "a": 2}` is refused at `b.c`.
   Check each member's key before searching its value.
   If the key repeats, refuse at its path without searching its value.
2. **An object**: `spec-not-object`, at the empty path.
3. **Known keys**: `unknown-key`, at the first unknown key as written.
4. **`vertex`**: `vertex-missing` when it is left out, `vertex-invalid` when
   it isn't text or is empty; at `vertex`.
5. **`from`**: `from-missing` when it is absent or an empty array; `from-invalid`
   at `from` when it isn't an array. Check each source in order.
   Refuse a nonobject (`from-invalid` at `from`) or an unknown key (`unknown-key` at `from.<key>`).
   Then check `store`, `kind` and `about`, regardless of written order.
   These use `from-invalid` at `from.store`, `from.kind` and `from.about`.
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
   isn't an object or is empty. Check fields in written order, at `fold.<name>.where.<field>`.
   Refuse an invalid field name or tests that are not a nonempty object.
   Then check tests in written order, at that same path.
   Refuse an unknown operator or an argument that does not fit.

These are the only codes.

## The parsed form

`spec/parse` vectors show accepted specs in parsed form.
They keep `vertex` and `from`.
Each source has `store`, then supplied `kind` and `about`.
Each `fold` slot keeps its fold type, applicable `follow`, supplied `limit` and written `where`.
Latest-by always writes `follow`.
Times keep their spelling. Carried keys and `note` are dropped. An accepted spec's parsed form parses back to itself.
The parser gives exactly the specs that fit (`spec.parse` in [`laws.md`](laws.md)). That is a law
about what the parser gives; which JSON it accepts is this page, pinned by
the vectors.
