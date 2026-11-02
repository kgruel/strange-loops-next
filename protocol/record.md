# Layer 0: the record

A record is an observation. Records are immutable, the only write is
append, and a store is a set of records. This page is normative; the laws
it relies on are in [`laws.md`](laws.md) and the bytes are pinned by the
vectors in `vectors/record/`.

## Envelope

| Field | Required | Holds |
|---|---|---|
| `kind` | yes | a label, non-empty |
| `observer` | yes | a typed reference (`prefix:value`), usually a lineage id `sl:…` |
| `emitted` | yes | the observer's now: RFC 3339 with an offset |
| `occurred` | no | the claimed past: a span, below |
| `about` | no | a set of typed references |
| `prev` | no | a set of record ids this one replaces |
| `under` | no | the record id of the grant it acts on |
| `erases` | no | a set of record ids whose payloads this one erases |

* A **typed reference** is `prefix:value`.
  The prefix starts with a lower-case letter and holds lower-case letters, digits and hyphens.
  The value is not empty.
* A **record id** is `r:` and 52 base32 characters.
* **`emitted`** is `YYYY-MM-DDTHH:MM:SS`, an optional fraction, then `Z` or
  `±HH:MM`. Use upper-case `T` and `Z` and a real calendar day.
  Hours go to 23, minutes to 59, seconds to 60 on any minute, and offsets to `23:59`. The fraction is `.` and one or more digits, of any length.
* **`occurred`** is a span of time. Its grammar is below.
* **Sets** (`about`, `prev`, `erases`) have one canonical form: sorted by UTF-16 code
  units, repeats removed, and left out when empty.

The envelope reader refuses fields outside this table.
Fields the core does not read belong in the payload; otherwise the id would silently omit them.

The envelope reader uses these refusal codes: `kind-empty`,
`observer-not-typed`, `emitted-not-rfc3339`, `occurred-not-span`,
`about-not-typed`, `prev-not-record-id`, `under-not-record-id`,
`erases-not-record-id`.
It checks them in that order.

The reader settles forms before admission checks `prev`.
A held record applies `erases` even when admission refuses its `prev`.
The reader applies `erases` without reading the eraser's payload.
This rule does not establish signature validity or authority.
A lone erased form settles as withheld unless a held record names its id in `erases`.
The reader keeps its envelope and does not restore its payload.
Write settled, refused, and admitted record arrays in ascending id order.
Compare ids by unsigned digest bytes, first byte first, not by id text.
This array order does not change head content order.

Any record may erase, whatever its kind.
The envelope field alone carries the meaning.
Every reader applies it without needing the eraser's payload. A revision can erase what it
replaces (`prev: [r:X], erases: [r:X]`). Targets don't go in `about`:
`about: [r:X]` names the thing X anchors, which holds X's revisions too.

Writing checks the envelope, then salt length (`salt-not-16-bytes`) and repeated payload members (`member-duplicate`).
It then checks nonfinite or out-of-range payload numbers (`number-out-of-range`).
Every number must have magnitude at most 2^53 − 1, whole or not.
A batch writes each record through the same checks.

## Occurred

`occurred` is the observer's claim about when something happened: a span,
possibly coarse. It is one of:

| Form | Example | Span |
|---|---|---|
| a calendar date: `YYYY`, `YYYY-MM` or `YYYY-MM-DD` | `2009`, `2009-07`, `2009-07-14` | the whole year, month or day |
| a date with its last digits unspecified: `YYYX`, `YYXX`, `YYYY-XX`, `YYYY-MM-XX` or `YYYY-XX-XX`, and no other shape | `201X`, `20XX`, `2004-XX`, `1985-04-XX`, `1985-XX-XX` | the decade (`YYYX`), century (`YYXX`), year (`YYYY-XX`, `YYYY-XX-XX`) or month (`YYYY-MM-XX`) |
| either, then one qualifier | `2009?` (uncertain), `2009~` (approximate), `2009%` (both) | the date's own span |
| an instant, as `emitted` writes one | `2026-10-17T09:14:03Z` | a span of no length |
| `a/b`, two of those | `2009-07/2011-03`, `2026-10-17T09:14:03Z/2026-10-17T09:18:13Z` | from the start of `a` to the end of `b` |
| `a/..` | `2019/..` | from the start of `a`, with no end yet |

* Calendar dates are UTC days of the proleptic Gregorian calendar, years
  0000 to 9999. A date's span starts at `00:00:00Z` on its first day.
  It ends at `00:00:00Z` on the day after its last.
  `2009` runs from `2009-01-01T00:00:00Z` to `2010-01-01T00:00:00Z`, where `2010` starts.
  Unspecified digits follow EDTF Level 1, in exactly the five shapes above.
* A qualifier is part of the claim and stays in the text; it never changes
  the span. Instants take no qualifier.
* In `a/b`, `b` may not start before `a` does. The span ends where `b` ends, even when that is before `a` ends.
  `2009/2009-06` runs from the start of 2009 to the end of June 2009.
* The text is kept as written, as `emitted` keeps the writer's offset. Two
  spellings of one span are two different envelopes with two different ids.
* **Order.** Spans order by start, then end. A span of no length comes before a longer one with the same start.
  A span with no end comes after any with an end. Content order compares a record's span, then its `emitted`, then its id.
  A record without `occurred` is an instant at its `emitted`. Ids compare as their 32 digest bytes, unsigned, first
  byte first, not as text: base32's alphabet doesn't sort as ASCII does.
  Newest first reverses the whole order, so a later span, then a later
  `emitted`, then a greater digest comes first. Each compares what it
  reads as, never how it is spelled.
* **Moments.** An instant's moment is its whole seconds in UTC, then its fraction.
  Comparison is exact at any length; trailing zeros do not count.
  `.5` and `.500` are the same moment. `:60` on any minute is the first
  second of the next minute, its fraction kept: `12:34:60.5Z` is
  `12:35:00.5Z`. An offset can carry an instant written in year 0000 or 9999
  just outside those years in UTC; it is accepted as written.

The forms come from ISO 8601 and EDTF Level 1 (ISO 8601-2).
This page gives the whole grammar.
It excludes durations, seasons, open or unknown starts, unknown ends and years past 9999.
Instead of a duration, write the end instant: `start/end`. Anything else is
refused with `occurred-not-span`. Accepting more later is free, since
every record valid now stays valid with the same id; accepting less would
invalidate records already stored.

## Canonical bytes

RFC 8785 (JCS): members sorted by UTF-16 code units, minimal string escapes,
ECMAScript number formatting, no whitespace. Object member names must be distinct at every depth.
The writer refuses repeated names (`member-duplicate`).
It does not select the first or last value; parsers disagree on that choice.

A payload can contain RFC 8259 number spellings, including fractions and exponents.
JCS reads each number as an IEEE-754 binary64 value.
The writer accepts finite values only within ±(2^53 − 1), including fractions.
Numeric folds have a separate safe-whole rule in [`spec.md`](spec.md).

Number spellings round once to binary64 before canonicalization.
For example, `9007199254740993` becomes `9007199254740992`; `9007199254740991.1` becomes `9007199254740991`.
The first is refused as out of range; the second is accepted after rounding.
Numbers needing exact decimal or large-integer precision belong in strings.
Numeric readers additionally require whole values; within-range fractions remain writable but unread by numeric folds.

The model also permits raw integers, before binary64 ingestion.
Its writer refuses raw integers outside ±(2^53 − 1).
This prevents unchecked exact values from bypassing binary64 semantics.
These raw integers are not distinct wire values.
Canon's finite number domain is distinct from the writer's magnitude cap.
Overflow may fail during ingestion or writer validation; shared wire fixtures do not pin that stage.
JS parsing can produce infinity, which checked writing rejects.
The Rust evaluator rejects overflow during decoding; Lean can reach writer validation.
The model's checked writer also refuses out-of-range raw numbers.
Historical ingestion discussions do not override the magnitude cap.

## Commitment, id, signature

```
commit = "h:" + base32(SHA-256(salt ‖ JCS(payload)))
id     = "r:" + base32(SHA-256(JCS({"commit": commit, "env": env})))
signed = "loops/record/v1:" + id            (UTF-8)
sig    = { "key": "k:" + base32(public key), "ed25519": base32(Ed25519(signed)) }
```

* `base32` is RFC 4648 in lower case without padding.
* The **salt** is 16 random bytes; it stops anyone confirming a guess about a
  payload from its commitment.
* The **payload** is any JSON value.
* The id covers the commitment, not the payload, so **erasing** the opening
  never changes the id. The signature covers the id, so it survives erasure
  too.

## Stored lines

A store holds each record as one canonical JSON line:

```
{"env":{…},"id":"r:…","payload":…,"salt":"…","sig":{"ed25519":"…","key":"k:…"}}
```

After erasure the opening is replaced by the commitment:

```
{"commit":"h:…","env":{…},"id":"r:…","sig":{"ed25519":"…","key":"k:…"}}
```

## Future work and implemented boundaries

* Windows arrive with ticks and hold records whose span starts in them.
  The start is included and the end excluded.
  A `where` test on `env.occurred` compares starts too.
  A record without `occurred` passes neither bound; a window places it at its `emitted`.
* Key bindings, presence keys and admission arrive with standing (step 3).
* Lone UTF-16 surrogates are invalid JSON for RFC 8785.
  Rust and Lean text parsing reject them; JS does not uniformly reject them.
  Uniform refusal, its code, and precedence remain unresolved.
  Callers must not silently replace them.
