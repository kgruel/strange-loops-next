# Shadow export v1

Run with Python 3.10 or later on a frozen, consistent copy of one SQLite
store and its matching vertex.

```sh
python3 tools/shadow/export.py workshop.vertex --output-dir ./private-cut
```

The store path is relative to the vertex. The exporter reads the schema,
tick count and facts in one read-only transaction with `query_only` enabled.
It expects the supplied snapshot to be authoritative. For a derived index,
establish agreement with the old log when making the snapshot. The exporter
does not open the old engine or rebuild its index.

If a `-wal` file exists, supply `--quiescent-copy` only when the main file
and WAL were captured consistently and both will remain fixed. The exporter
copies the pair into private scratch under the output directory. SQLite
opens that copy with `mode=ro` and can reconstruct shared memory there.
Without a WAL, the exporter opens the snapshot with `mode=ro&immutable=1`
to prevent sidecar creation even for checkpointed WAL-mode databases.
A snapshot with a rollback journal is also read from a private copy. SQLite
refuses a read-only copy if it requires recovery.

Outputs are private files (0600 on POSIX) in a separate directory. Choose a
fresh destination for a new cut. Publication uses same-filesystem hard links,
map first and facts last, and refuses to overwrite either filename. If a
process dies between links, a lone map can remain. A usable cut requires both
files and a verified trailer. The facts file contains private legacy payloads
and provenance.

## Reviewed map

`<name>.map.json` is a UTF-8 JSON object. The importer reads this map. It
never reads KDL. For example, a workshop map could contain

```json
{
  "format": "shadow-map-v1",
  "source": "workshop",
  "store": "data/workshop.sqlite",
  "vertex_sha256": "0aed6432deddba7c63c0222700bccb677bb2422589e65260b1aa86b919dd3e59",
  "kinds": {"thread": {"by": "name"}, "change": {"collect": "20"}},
  "ref_fields": ["links", "members"]
}
```

The digest is lowercase SHA-256 of the exact vertex file bytes. `source`
is a nonempty single filename component. `store` retains the declared
path. Each nonempty kind occurs once and has exactly one entry, either a
nonempty key field or a canonical unsigned 64-bit collect limit. The limit
describes an old read; the importer considers every fact. Missing kinds are
unnamed. Review this list before import. The vertex digest binds the source
cut to its own vertex revision. The optional `ref_fields` lists distinct,
nonempty top-level payload field names. The names `ref` and anything ending
in `_ref` are reserved. An invalid declaration gives `shadow-map-invalid`.
A reviewer adds this member by hand. The exporter writes no `ref_fields`.
Carry the reviewed list forward by hand on re-export or its pin changes.

Journal v2 pins base32hex SHA-256 of the canonical UTF-8 JSON object
`{"kinds": K, "ref_fields": F}`. K is the entire validated kinds object,
including collect limits. F is the list in canonical UTF-16 order, defaulting
to `[]`. Reordering either declaration or editing a vertex comment leaves
this pin equal. A changed kind, fold or configured field membership gives
`shadow-state-mismatch`. Each new map and export header must still agree.

The exporter requires one each of `name`, `store` and `loops`. Top-level
`observers` and `sources` blocks may repeat. Each takes no arguments, and
the reader checks its syntax and skips its contents. A kind has
one `fold` of one or more slots, `<target> "<op>" <args>`, each target
once. The ops are the old tool's: `by` and `sum`, `max`, `min` and `avg`
take one quoted field, `collect` a count, `window` a count and a field,
and `inc`, `count` and `latest` nothing. The first slot decides, as the
old tool reads items from it alone: `by "<field>"` keys the kind
(`{"by": field}`) and `collect N` collects it (`{"collect": N}`). Later
slots compute from the same facts, so they are checked and left out of
the map. Any other first slot, a later `by`, or a second `collect` is
refused. Under
a kind, `edge`, `lifecycle`, `search`, `preview` and `boundary` are skipped,
including their child blocks. A `boundary` beside the kinds is skipped too.
The reader supports newline and semicolon terminators, quoted strings,
ordinary properties on skipped nodes, `//` and nested `/* */` comments, and
`/-` before a node, argument, property or child block. Unsupported statements and malformed
declarations refuse with the vertex line. A `combine` or `discover` vertex
cannot supply a single-store map.

## Fact stream

`<name>.facts.jsonl` uses UTF-8 with one object per LF-terminated line,
including the last. Each object has exactly the members specified below.
Unknown, missing or duplicate members, blank lines, CRLF, a missing trailer
or bytes following the trailer invalidate the cut. JSON member order is free.
Digest verification uses the original bytes including whitespace.

| Line | Members |
|---|---|
| Header | `format` = `"shadow-facts-v1"`, `source`, `vertex_sha256`, `order` = `"arrival"` or `"rowid"`, `ticks` = number of rows omitted from the separate ticks table |
| Fact | `id`, `kind`, `ts_bits`, `observer`, `origin`, `payload`, `signature`, `coordinate` |
| Trailer | `count` = number of fact lines, `digest` = lowercase hex of the final 32-byte digest |

`source` and `vertex_sha256` must agree with the map. Counts are unsigned
64-bit decimal **strings**. Each coordinate component is a signed 64-bit
decimal string. Use ASCII digits, no plus sign, no leading zeros and no
negative zero. Arrival coordinates are `[ordinal, seq]`. When both columns
are absent, rowid coordinates are `[rowid]`. Compare these numerically and
lexicographically. Gaps are valid. Partial schemas, nulls and repeated
coordinates are errors.

The old ID is unique per stream and contains 1 to 128 ASCII characters
in the inclusive range U+0021 to U+007E. The other scalar
members are text except that `signature` may also be JSON null. Preserve
the entire payload JSON text as a string, including its original spaces,
escapes, duplicate names and number spellings. For instance, the outer
member `"payload":"{ \"name\" : \"kiln\" }"` decodes to the old text
`{ "name" : "kiln" }`. Payload validity is decided in row preflight so
an invalid omitted fact can be reported. `ts_bits` holds the original
binary64 epoch seconds as 16 lowercase hex digits in big-endian order.
The mapper rounds once to the nearest microsecond, ties to even, and
uses canonical UTC with any trailing fractional zeros removed.

The ordered digest is defined over the header and every fact line. Initialize
`d = SHA256(header_line)`. For each fact in order, set
`d = SHA256(d || fact_line)`, using the 32 binary bytes of the preceding
digest. The trailer contains `hex(d)`. An empty cut uses the digest of the
header. This permits both readers to stream and uses the existing Rust hash
function. The digest detects an incomplete or altered cut. A person who can
replace the cut can also recompute it.

The Python suite builds SQLite snapshots in test scratch and checks the
export against the invented workshop files in `rust/cli/tests/fixtures/shadow/`.
The Rust suite reads the same bytes and checks signed lines against the
existing writer.

## Imported references and old IDs

The importer indexes the complete group, including omitted facts. In `ref`,
a group ID takes precedence over an address. Otherwise the first colon or
slash separates a lowercase prefix matching `[a-z][a-z0-9-]*` from its
nonempty value. The prefix `r` is reserved. For example, `decision/design/fold`
becomes `decision:design/fold`, even if the group has no such thing.

A field with a nonempty name before `_ref` and each configured `ref_fields`
field can refer to exact group IDs. Split text at commas, trim each part and
ignore empty parts. A configured field also accepts an array of text, with
the same splitting for each element. An unsupported value, including a mixed
array, stays in the payload and contributes no mentions. Configured fields
always stay. For an old ID, prefer its included local copy. Otherwise use
the single distinct effective target among included copies. A keyed target
gives its thing name and a root gives its full `r:` record ID.

On each keyed revision, `about` carries the accumulated resolved `ref`
mentions and the current mentions of each suffix or configured field.
Supplying a field replaces its previous mentions, including with an empty
set. A root starts from empty state. Add the fact's own nonempty observer as
`observer:<old observer>` and suppress self mentions. A self part counts as
resolved for cleaning. Remove a text `ref` when all its parts are accounted
for. Remove a suffix field only when its base member is on this original
fact and all its nonempty text parts resolve, or its value is exactly `""`.
Delimiter-only suffix text stays. For example, `"owner_ref":"potter-id,?"`
stays intact when only the first part resolves. A later paired
`"owner_ref":""` clears the mention and unsets the previously visible field.
Unknown, omitted, ambiguous and cyclic references leave the original field
intact. Independently resolved parts still contribute mentions.

After a complete writable import, `group.json` has a sibling `group.ids.json`.
Its top-level keys are old IDs. Each value lists included occurrences in
source-name order, with exactly these string members:

| Member | Meaning |
|---|---|
| `source` | Reviewed source name |
| `destination` | Store directory relative to the group file |
| `record` | Full new record ID, including `r:` |
| `thing` | Keyed thing name, or the same record ID for a root |

An old ID seen only on omitted rows maps to `[]`. Identical copies in two
destinations have two entries. This 0600 lookup file contains no salts.
The importer atomically publishes it under the group lock, skips an identical
file, and regenerates a missing one on a writable rerun. Check-only never
creates or repairs it. A v1 journal requires fresh shadows. See
[choice 31](../../rust/PLACE.md) for recovery, cycle handling and counts.

## Compare a shadow with its source

Start with an initialized shadow store at `workshop/` and a `group.json`
beside it. For this example the group contains

```json
{"state":"private","sources":[{"name":"workshop","facts":"cut/workshop.facts.jsonl","map":"cut/workshop.map.json","destination":"workshop"}]}
```

Review the exported map before the import. With the shadows stationary, run

```sh
loops shadow-import group.json
python3 tools/shadow/compare.py --group group.json
```

This compares every source in manifest order. To report just the workshop,
supply its triple. Repeat `--also FACTS MAP SHADOW` to select more reports
and their union, in argument order. In either case every group cut participates
in ID resolution.

```sh
python3 tools/shadow/compare.py cut/workshop.facts.jsonl cut/workshop.map.json workshop \
    --group group.json --old-json workshop.read.json
```

Use `--loops PATH` to select the binary and `--unnamed` when the import used
`--include-unnamed`. The positional form recognizes a `group.json` in the
working directory when it contains all selected triples. Without a manifest,
the supplied triples constitute the lookup group. Supply the manifest for
cross-store targets outside that selection or for references requiring
another root's salted record ID.

The tool checks each shadow, verifies the cuts through their trailers, and
indexes included and omitted IDs before replaying arrivals. In group mode
it requires the sibling `<stem>.ids.json`. It checks the four members of
each occurrence, cut membership, destination, record presence and uniqueness,
kind, keyed or root identity, occurrence time and keyed revision order
against the cuts and signed envelopes. It uses the sidecar for the record
names. The original facts and reviewed maps determine cleaning, target
selection, cycles, current mentions and observer. The private journal is
unused. Extra signed records remain visible in the reading and count in
`unmapped_shadow_records`. A stale entry naming an absent record fails validation.

The JSON report contains numeric counts. `sources[].things` totals the
export-to-shadow comparison. Each entry in `sources[].kinds`, in sorted
kind order, has `facts`, `records` and the same `things` counts.
`record_count_mismatches` counts kinds whose totals differ. The tool reads
record counts and projected fields with `ls`. A `fold --values` supplies the
actual head mentions, root values and fields the comma-list cannot express.
Keyed things match by kind and key. Roots match by translated identity
when available. For unidentified roots, matching preserves multiplicity,
preferring equal payloads and mention sets, then equal payloads.

Among matched things, `fields_differing` counts differing field values or
presence, and `mentions_differing` counts things whose mention **sets**
differ. Either contributes to `differing` once per thing. Unmatched things
count in `only_old` or `only_new`. `fields_conflicting` and `multiple_heads`
describe the new side. Multiple heads alone allow equality.

For `--old-json FILE`, supply the first selected source's
`sl read <vertex> --json --all` output. Each named kind gains two comparisons:

| Member | Left side (`old`) | Right side (`new`) |
|---|---|---|
| `old_json` | Replayed export | Normalized old rows |
| `old_json_shadow` | Normalized old rows | Shadow fold |

Only supplied old rows participate. `old_json.missing_key_roots` and
`old_json.outside_collect_limit` break down export roots absent from that
reading. Both are subsets of `only_old`. Unnamed old rows count separately
in `old_json_unnamed_rows`. The old-row comparison excludes generated
metadata. It resolves the row's accumulated `refs`, its current suffix and
reviewed fields, and its latest observer, suppressing self mentions. The
supplying export fact establishes whether a suffix originally had a companion.
The old row supplies that suffix's value.

The old fold consumed the raw `ref` member even when AD4 preserved it. On
matched export and shadow things, `retained_ref_fields_export_checked` counts
the original `ref` values checked against the shadow, including exact text
with delimiters or unresolved parts. `retained_ref_fields_differing` counts
failures, also included in `fields_differing`. The two old-row comparisons
use the evidence available in the old JSON. A retained suffix or reviewed
field in its payload is comparable there too.

With several selected sources, `union` reports shared keyed things. It
replays their changes by binary64 time, numeric coordinate and argument
order for exact ties, resolving each fact in its own destination. The union
reports `shared`, `differing`, `fields_differing`, `mentions_differing` and
`multiple_heads`.

Exit 0 means agreement, 1 means a difference or a failed comparison, and 2
means bad usage. A failed read writes a diagnostic on stderr. `--show N`
adds at most N examples across the report with source number, comparison,
kind, key and differing field names. Mention targets and payload values are
never printed.
