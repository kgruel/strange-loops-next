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
| `occurred` | no | the claimed past: EDTF Level 1 (not yet validated) |
| `about` | no | a set of typed references |
| `prev` | no | a set of record ids this one replaces |
| `under` | no | the record id of the grant it acts on |

* A **typed reference** is `prefix:value`: the prefix starts with a lower-case
  letter and holds lower-case letters, digits and hyphens; the value is not
  empty.
* A **record id** is `r:` and 52 base32 characters.
* **`emitted`** is `YYYY-MM-DDTHH:MM:SS`, an optional fraction, then `Z` or
  `±HH:MM`. Only upper-case `T` and `Z`, a real calendar day, hours to 23,
  minutes to 59, seconds to 60 (a leap second), offsets to `23:59`.
* **Sets** (`about`, `prev`) have one canonical form: sorted by UTF-16 code
  units, repeats removed, and left out when empty.

A field not in this table is refused when an envelope is read: a field the
core doesn't read belongs in the payload, and would otherwise be silently
left out of the id.

An envelope that breaks a rule is refused with one of: `kind-empty`,
`observer-not-typed`, `emitted-not-rfc3339`, `about-not-typed`,
`prev-not-record-id`, `under-not-record-id`, checked in that order.

## Canonical bytes

RFC 8785 (JCS): members sorted by UTF-16 code units, minimal string escapes,
ECMAScript number formatting, no whitespace. Object member names must be
distinct.

JCS reads every number as an IEEE-754 double, which holds an integer exactly
only within ±(2^53 − 1). Past that, two different numbers share one canonical
form (9007199254740993 becomes 9007199254740992), and an implementation that
kept the number exactly would compute a different id. So a writer refuses a
payload holding a number outside ±(2^53 − 1) with `number-out-of-range`,
after the envelope checks, never rounding it. A number too large for that
belongs in a string.

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

* `occurred` is carried but not validated; EDTF parsing arrives with content
  order.
* Key bindings, presence keys and admission arrive with standing (step 3).
* Lone UTF-16 surrogates in strings are invalid JSON for RFC 8785; Go's
  decoder replaces them and JavaScript keeps them, so the two disagree on
  invalid input. Refusing them explicitly is a small follow-up.
