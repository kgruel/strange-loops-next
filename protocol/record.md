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

* A **typed reference** is `prefix:value`: the prefix starts with a lower-case
  letter and holds lower-case letters, digits and hyphens; the value is not
  empty.
* A **record id** is `r:` and 52 base32 characters.
* **`emitted`** is `YYYY-MM-DDTHH:MM:SS`, an optional fraction, then `Z` or
  `±HH:MM`. Only upper-case `T` and `Z`, a real calendar day, hours to 23,
  minutes to 59, seconds to 60 on any minute (a leap second), offsets to
  `23:59`. The fraction is `.` and one or more digits, of any length.
* **`occurred`** is a span of time. Its grammar is below.
* **Sets** (`about`, `prev`, `erases`) have one canonical form: sorted by UTF-16 code
  units, repeats removed, and left out when empty.

A field not in this table is refused when an envelope is read: a field the
core doesn't read belongs in the payload, and would otherwise be silently
left out of the id.

An envelope that breaks a rule is refused with one of: `kind-empty`,
`observer-not-typed`, `emitted-not-rfc3339`, `occurred-not-span`,
`about-not-typed`, `prev-not-record-id`, `under-not-record-id`,
`erases-not-record-id`, checked in that order.

Any record may erase, whatever its kind: no kind is reserved for it, so the
field alone carries the meaning, and every reader applies it from the
envelope, with or without the payload. A revision can erase what it
replaces (`prev: [r:X], erases: [r:X]`). Targets don't go in `about`:
`about: [r:X]` names the thing X anchors, which holds X's revisions too.

Writing a record then checks the rest, in this order, after the envelope:
a salt that isn't 16 bytes (`salt-not-16-bytes`), a repeated member name
anywhere in the payload (`member-duplicate`), and a payload number outside
±(2^53 − 1) (`number-out-of-range`). A batch writes each of its records the
same way.

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
  0000 to 9999. A date's span starts at `00:00:00Z` on its first day and
  ends at `00:00:00Z` on the day after its last: `2009` runs from
  `2009-01-01T00:00:00Z` to `2010-01-01T00:00:00Z`, where `2010` starts.
  Unspecified digits follow EDTF Level 1, in exactly the five shapes above.
* A qualifier is part of the claim and stays in the text; it never changes
  the span. Instants take no qualifier.
* In `a/b`, `b` may not start before `a` does. The span ends where `b`
  ends, even when that is before `a` ends: `2009/2009-06` runs from the
  start of 2009 to the end of June 2009.
* The text is kept as written, as `emitted` keeps the writer's offset. Two
  spellings of one span are two different envelopes with two different ids.
* **Order.** Spans order by start, then end. A span of no length comes
  before a longer one with the same start, and a span with no end comes
  after any that has one.
* **Moments.** An instant's moment is its whole seconds in UTC, then its
  fraction, compared exactly at any length: trailing zeros don't count
  (`.5` and `.500` are the same moment). `:60` on any minute is the first
  second of the next minute, its fraction kept: `12:34:60.5Z` is
  `12:35:00.5Z`. An offset can carry an instant written in year 0000 or 9999
  just outside those years in UTC; it is accepted as written.

The forms come from ISO 8601 and EDTF Level 1 (ISO 8601-2), but this is the
whole grammar: no durations (write the end instant: `start/end`), seasons,
open or unknown starts, unknown ends, or years past 9999. Anything else is
refused with `occurred-not-span`. Accepting more later is free, since
every record valid now stays valid with the same id; accepting less would
invalidate records already stored.

## Canonical bytes

RFC 8785 (JCS): members sorted by UTF-16 code units, minimal string escapes,
ECMAScript number formatting, no whitespace. Object member names must be
distinct at every depth: JSON text with a repeated name is refused
(`member-duplicate`), not resolved to the first or the last, which parsers
disagree on.

JCS reads every number as an IEEE-754 double, which holds an integer exactly
only within ±(2^53 − 1). Past that, two different numbers share one canonical
form (9007199254740993 becomes 9007199254740992), and an implementation that
kept the number exactly would compute a different id. So a writer refuses a
payload holding a number outside ±(2^53 − 1) with `number-out-of-range`.
The range applies to the number as JCS reads it, a double: text such as
`9007199254740991.1` reads as 9007199254740991 and is accepted as that. A
number that must stay exact past the range belongs in a string.

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

## Not yet

* `occurred` is checked and has an order, but content order and windows
  still read the model's plain numbers; they move to spans next.
* Key bindings, presence keys and admission arrive with standing (step 3).
* Lone UTF-16 surrogates in strings are invalid JSON for RFC 8785, and
  decoders disagree on them: some replace them, JavaScript keeps them.
  Refusing them explicitly is a small follow-up.
