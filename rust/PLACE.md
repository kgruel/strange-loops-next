# The first product slice: a place and a CLI

Step 2 of the build sequence: emit, read and fold for one person, signed.
`loops-place` (`rust/place`) is the first code around the pure core that
touches a disk, a clock and a key. `loops` (`rust/cli`) is the CLI over it.
`loops_place::fill` holds what a single emit or a filled changeset writes into its envelopes.
The core gained nothing; `loops-eval` gained one export, `slots_json`.

None of this is protocol yet. The stored line is (`protocol/record.md`);
the directory layout, the CLI and the codes below are a working proposal,
written down here so they can be changed on purpose.

## What is implemented

```
loops init                          make .loops/ here
loops emit <kind> [field=text | field:=json]... ["message"]
      [--root | [--of <thing>] [--prev <id>]...]
      [(--about <thing>)... | --no-about | [--add-about <thing>]... [--drop-about <thing>]...]
      [--erases <id>]... [--occurred <when> | --no-occurred] [--under <id>]
      [--sets <key>]... [--sets-nothing] [--whole]
      [--base <tick-id>] [--base-id <id>]...
                                    -- ends options for a single emit
loops emit - [--fill [--base <tick-id>] [--base-id <id>]...]
                                    read one JSONL changeset from stdin
                                    --fill applies the single-emit filler to each line
loops --version                     print the strange-loops-next version
loops ls [--plain]                  list kinds and their record counts
loops ls [--things | <prefix>] [--fields a,b,c] [--plain]
                                    list things or project their live fields
loops ls <kind>:<prefix> --active [--fields a,b,c] [--plain]
                                    hide things with a single live closed status
loops describe [--plain]            declarations and fit for the current store, named stores or local group
loops get <id>                      one record
loops of <thing> [--plain]          a thing's values, its about, its heads, how many records are of it
loops read <vertex> [--store <name>=<dir>]... [--values] [--plain]
                                    fold .loops/vertices/<vertex>.json
loops fold <spec.json | -> [--store <name>=<dir>]... [--values] [--plain]
                                    fold a spec from a file or stdin
loops tick <vertex | spec-file | -> [--all | --slice [--as-of <time>] | --as-of <time> | --cover <id> ...] [emit envelope flags]
                                    cover the spec’s slice by default (choice 32), or a named cut (choice 28)
loops tick --check <id>             check a tick against this store and print the verdict and reports
loops erase <id>... ["why"]         emit an erasure, and drop the openings held here
loops export [--kind <k>] [--of <thing>] [--about <thing>]
loops import [<file> | -]
loops shadow-import <group.json> [--include-unnamed] [--check-only]
                                    import a reviewed cut into each named destination
loops check                         verify every segment and line
loops whoami                            show the current key and observer
loops whoami --init                     ensure the signing key exists and print its ID
```

* The verbs, payload syntax, labels, discovery and exit codes follow the
  design's CLI: `field=text` is text, `field:=json` a JSON value, a bare last
  argument is the payload's `text`; `.loops/` is found the way git finds
  `.git`; exit 0 ok, 1 refused with its code, 2 usage, and 3 when the file
  system or the system's randomness fails.
* Every write goes through `batch::resolve_batch`, so one record and a
  labelled changeset meet the same checks, `prev-unknown`, `under-unknown`,
  `of-not-root` and `prev-unrelated` included. The batch check reads a held
  record's `of` and `prev` from its stored envelope (`Held::writer_view`), so
  a record whose payload is erased or withheld is held as any other. A
  changeset writes nothing unless every draft is taken.
* An id can be given by any prefix that names one held record, in `--prev`,
  `--erases`, `--under`, `--of` and the `of` verb. A thing with a colon that is not
  `r:` is a natural key, taken as typed.
* A record is of one thing (D8): `--of` names it, and a record without it is
  a root, its own thing. `--about` only mentions: it never makes a head, and
  `loops of`, `latest-by` and the heads read the thing, not the mention.
  `export --of` takes the records of a thing and `export --about` those that
  mention it, as a spec's `from.of` and `from.about` do.
* A revision written without `--of` is of what it replaces; see choice 9.
* Shorthand `emit <kind>` uses the destination's optional `.loops/store.json`
  for key derivation and the checks in choice 34. `--root` requests a
  keyless root with the supplied payload, with or without a description.
* `--sets` names a key the emit sets; see choice 10. An emit of a thing the
  store holds a record of sets the fields it names, unless `--sets`,
  `--sets-nothing` or `--whole` states otherwise; see choice 15.
* Without a base, the writer claims to have read everything held. With a base,
  the filler starts from the tick cover, the literal ids and any stated
  `--prev`. It follows held predecessors within the thing and adds that
  view's live records to the stated `prev` (choices 11 and 23).
* An emit of a thing copies `about` from its heads. The shorthand can edit
  that copy with `--add-about` and `--drop-about`, or state the whole set
  with `--about` or `--no-about`. See choices 12 and 13.
* An emit copies `occurred` when every head states the same text, unless
  `--occurred` or `--no-occurred` states it. See choice 19.
* A plain `emit -` changeset states its own `of`, `sets`, `prev`, `about`
  and `occurred`. `emit - --fill` fills each line against the store and the
  records prepared before it. The changeset is written in one segment.
  See choice 20.
* `loops of` shows a thing's values, each key's from its live setters, beside
  its `about` and its heads; `read` and `fold` write the values beside the
  ids with `--values`. The values view is the CLI's, not the protocol's: a
  fold answers ids, and without `--values` `read` and `fold` answer exactly
  that. See choices 16 and 17.
* Scripts can request the default JSON with `--json`. For a human-readable
  display, `ls`, `of`, `read` and `fold` accept `--plain`. See choices 25 and 26.
* `read`, `fold`, `of`, `get`, `export` and `tick --check` answer from the lines that check,
  and are then refused `store-not-clean` when a line was refused or a
  segment is altered, as `check` is; `emit`, writing a tick, and `erase` warn and go on. See
  choice 18. For `read` and `fold`, an unresolved name refuses the whole read
  with `store-unknown` before any answer. See choice 30.

## On disk

```
.loops/segments/<key>/<hash>.jsonl    closed, immutable, named by the SHA-256 of its bytes
.loops/vertices/<name>.json           a spec, as protocol/spec.md reads it
~/.config/loops/keys/device           the signing key's seed, 0600 (LOOPS_KEY_FILE, or LOOPS_KEY as text)
$XDG_CACHE_HOME/loops/checked-segments-v1   previously verified segment digests (choice 26)
```

A segment holds the lines one key signed in one changeset. Writing it is a
rename into place, so a reader sees a whole changeset or none
(`protocol/laws.md`, torn reads). Nothing appends to a segment. Two copies of
a store merge by adding files, in git or by `export | import`, and what they
hold is the union.

Reading checks each complete line's envelope, commitment, id, signature and
canonical spelling. A reader can reuse its own previous signature verification
for an identical complete segment (choice 26). A line that fails is listed by `loops check`, never
held. A segment whose name is not the hash of its bytes is listed as altered.
Every verb that reads the store says when either happened (choice 18).

## Choices made here, each cheap to change until stores exist

1. **One closed segment per changeset; no `open.jsonl`.** The design has an
   open segment that a git hook closes at commit. Closing per changeset needs
   no hook and makes a changeset atomic, at the cost of one small file per
   emit. The review finding "closing segments per changeset" stays open:
   compaction, or the open segment, can come when the file count hurts.
2. **`segments/<key>/`, not `segments/<observer>/<device>/`.** Lineages are
   step 3. Until then the signing key is the only writer identity a place can check.
3. **The observer is the signing key, `k:…`, and nothing else.** A line
   proves which key signed it. Nothing yet says which keys speak for an
   observer, so the only observer a key can honestly write as is itself, and
   `emit` refuses any other (`observer-unbound`). `--observer` and a draft's
   `observer` are accepted so the refusal can be said. `loops check` counts
   held lines whose observer is not their signing key as `unbound`: imported
   lines, which a reader holds but cannot attribute. Lineages, anchors and key
   bindings (step 3) replace this rule.
4. **No anchor file and no store identity.** A store is a lineage with
   declarations; that is step 3. Choice 30 binds a spec's store names to
   local directories for `read` and `fold`.
5. **Admission permits every replacement** of a held, related record
   (`may = true`), as `Spec.run` does. Who may replace whom is standing's rule.
6. **How a payload becomes what a fold reads.** `Line::record` calls
   `loops::record::payload_fields`, the port of Lean's `payloadFields`.
   Each member of a held object becomes a scalar, a list of nameable members,
   or a written object/null. A held non-object supplies no fields. The stored
   opening retains the original JSON for `loops of` and `--values`.
   The direct `payload/` vectors also run through stored lines.
7. **New refusal codes**, outside the protocol's lists: for a line,
   `line-not-json`, `line-shape`, `commit-invalid`, `id-mismatch`,
   `key-invalid`, `signature-invalid`, `line-not-canonical`; for the CLI,
   `observer-unbound`, `id-unknown`, `id-ambiguous`, `vertex-unknown`, `draft-shape`,
   `draft-field-unknown`, `spec-not-json`, `store-not-clean`, `store-unknown`.
   In an `emit -` changeset these cover only a line's own shape: `draft-shape`
   for a line that is not a JSON object or a label that is not text,
   `draft-field-unknown` for an unknown member, and `member-duplicate` for a
   repeated one. A line's envelope fields go through the core's reader, so a
   field left out or of the wrong JSON type gets the field's own code in the
   writer's order across the changeset, after label refusals; a salt that is
   not base32hex text is `salt-not-16-bytes`. The CLI fills in `observer` and
   `emitted` only when a line leaves them out. `observer-unbound` judges only
   an observer that is a typed reference, so a mistyped or untyped one, on a
   line or in `--observer`, is the writer's `observer-not-typed`.
   Kyle chose this on 2026-11-11.
   The flat line has no envelope member, so it has no envelope that is not an
   object.
8. **Erasure removes bytes only here.** `loops erase` emits a record with
   `erases`, which every reader applies, and rewrites the local segments that
   held the opening. Other copies, and git history, keep the opening until
   they purge too.
9. **`emit` fills in `of` for a revision; the protocol never infers it.**
   Every record with `prev` states `of` (`of-missing`). A revision written
   with `--prev` and no `--of` is given, at write time, the thing of what it
   replaces: the target's `of`, or its id when it is a root. The value is
   written into the envelope, and nothing reads it in later. When the CLI
   can't fill it in, it refuses with the batch's codes: a target this store
   doesn't hold is `prev-unknown`, since there is nothing to fill `of` in
   from, and targets of different things are `prev-unrelated`. On this path
   only, these precede the writer's other checks. This replaces the earlier
   "a revision without `--about` is about what it replaces". Plain `emit -` fills
   nothing in: a changeset states `of` itself, and may use a label there,
   as in `about`, `prev` and `under`.
   Kyle confirmed on 2026-11-10 that only the single-record path fills `of`
   in, that this path refuses `prev-unknown` itself, that `export --about`
   is a mention filter and `export --of` a thing filter, and that the verb
   that shows a thing is `loops of`, which replaced `loops about`.
10. **`--sets <key>` once per key, and `--sets-nothing` for an empty set.**
    `sets` holds key names, so `--sets` takes a key as typed, as `--about`
    takes a mention, and repeats. `--sets-nothing` states `"sets": []`, an
    emit that sets no key. The two together are a usage error. `--sets ""`
    is the writer's `sets-not-keys`. Either flag states `sets` as given, and
    nothing is filled in over it; an emit with neither is choice 15's.
    `emit -` takes `sets` as a line's envelope field, as written; a key that
    starts with `@` is a key, not a label.

11. **`emit` fills in the anchor.** The anchor rule of D8c
    (`notes/2026-11-11-declared-keys.md`, section 5): every emit sets the envelope, so an emit of
    a thing names in `prev` every record of that thing the store holds that
    is live for some key, the envelope among them, and so every head. The
    thing is the stated or derived `of`, or what `--prev` replaces (choice 9).
    A root names nothing, and the first record of a thing the
    store holds nothing of names nothing. Liveness is the core's
    (`loops::live::live`), read over the store as `loops fold` reads it:
    settled, then admitted. An erased or withheld record keeps its envelope
    and is named like any other; a record admission refuses is not named. A
    `--prev` is kept beside what is filled in, whether or not it is live, and
    `prev` is written as the canonical set it is. A whole-read emit names the
    same records and is then the only live record of its thing. Nothing
    refuses an unanchored record, on either path, and nothing reads the
    names in later. `loops erase` writes a root, with `erases` and no `of`,
    so it names nothing; `--erases` and `--under` on an emit change nothing
    here, and neither does a thing named by a root's id rather than a natural
    key: the root is that thing's first record, and is named while it is live.
    What was filled in is not printed: `emit` answers the id, and `loops get`
    shows the `prev` and `about` written.
12. **`emit` copies `about` from the heads.** The head's mentions are the
    thing's, so with no `--about` an emit of a thing is given the union of
    the mentions of the thing's heads, every one of which it now names, in
    canonical order. A root and a first record copy nothing. The copied mentions
    are the thing's and do not cite what this record rests on.
13. **`--about` states the whole `about`, and `--no-about` an empty one.**
    `--about`, once or more, replaces the copy rather than adding to it, so
    a task moves from one project to another by naming the new one alone.
    `--no-about` states that the emit mentions nothing, and the thing then
    mentions nothing until an emit names something again. The two together
    are a usage error, as `--sets` with `--sets-nothing` is.

    On one-record shorthand `emit`, each `--add-about <thing>` adds one
    mention to the heads' union and each `--drop-about <thing>` removes one.
    With `--base`, the union comes from the heads in the writer's selected
    view. A root or a first write starts empty. For example, if the heads
    mention `potter:p` and `yard:a`, then `--drop-about yard:a --add-about yard:b`
    writes `["potter:p","yard:b"]`. The writer signs the distinct mentions
    in canonical order, and a later ordinary revision copies that set.

    Both flags take literal typed names, including a drop of an absent
    mention. Repeating either flag, adding a carried mention, or dropping
    an absent one is harmless. Mixing either flag with a whole-set flag,
    or adding and dropping the same name, gives usage error 2. The edit
    needs no description and copies no payload references into `about`.
    The usual shorthand checks still apply. Changeset input and `tick`
    keep their existing envelope options.
14. **The filler is in `loops-place`.** `loops_place::fill` fills in `of`
    (choice 9), then `sets` (choice 15), then the anchor and `about`
    (choices 11–13), over what a store holds, and `loops emit` calls it
    before the batch check. It sits beside the CLI's other uses of a store so
    a test can drive the writer's rule over a few hundred emits without
    starting the binary for each.
15. **An emit of a held thing sets the fields it names; `--whole` states a
    whole-read emit.** Kyle ruled on 2026-11-15 that re-emitting
    `status=done` updates `status` and keeps the other fields. So on the
    single-record path an emit of a thing the store holds a record of, which
    states neither `--sets` nor `--sets-nothing`, is given the top-level
    payload keys it names as its `sets`: each `field=text`, each
    `field:=json`, and `text` for the bare message, in canonical order. The
    thing is the stated or derived `of`, or what `--prev` replaces (choice 9); held means a
    record of it is in the store as `loops fold` reads it, settled and
    admitted, an erased or withheld one included. `--whole` states no `sets`:
    the emit is read whole and replaces everything, as choice 11 says. It is
    a usage error beside `--sets` or `--sets-nothing`.
    A root, and the first record of a thing the store holds nothing of, are
    not emits of a held thing: they keep no `sets` and are read whole, so they
    set every key they name. `--whole` changes nothing there.
    An emit of a held thing that names no field is given `"sets": []`, a pure
    join, as `--sets-nothing` gives: it moves the thing with `--about` or
    `--no-about`, or joins its heads, and sets no key. A whole-read emit of
    nothing, which unsets every key, takes `--whole`. `--erases` and
    `--under` change nothing here. The payload on this path is always an
    object, so the keys it names are always its members; a repeated field is
    the writer's `member-duplicate`. Plain `emit -` fills nothing in.
16. **`loops of` shows the thing's values.** It answers `{"thing", "about",
    "heads", "records", "values", "setters"?, "unheld"?}`. `about` is the union
    of the heads' mentions, as an emit copies it (choice 12). `heads` are the
    thing's heads as shown lines, newest first, so the first is the winner a
    latest-by that follows `prev` names and the rest are what `others` was;
    `records` counts the records of the thing. The values are read from the
    live setters, as `loops::live` gives them over the store settled and
    admitted:
    - the keys are those some live record declares and the top-level keys of
      each held live record read whole; a record with `sets` gives only the
      keys it declares, so an undeclared payload key is not shown;
    - `values` maps a key to its value when its one live setter is held and
      holds the key; a key whose one held setter lacks it is unset, and not
      written;
    - `setters` maps every other key to its live setters, newest first, each
      `{"id", "shown", "value"?}`: two or more setters, each with its value
      and none picked or merged, or a setter whose payload is erased or
      withheld, which shows its `shown` and no value. Nothing compares values;
    - `unheld` lists the live records read whole that are erased or withheld,
      `{"id", "shown"}`: what keys they set beside those written is unknown.
    By default `setters` and `unheld` are written only when they hold something.
    With `loops of <thing> --setters`, `setters` is always written, even
    when empty. It lists every key with a live setter, including a held
    setter that leaves the key unset. `live` lists the records in those
    rows once each, in head order, as shown lines with their live `keys`
    in canonical order. A pure join sets no key and has no row in `live`.
17. **`--values` writes the values beside the ids.** `loops read <vertex>
    --values` and `loops fold <spec> --values` answer the protocol's result
    with members added where the protocol has none: each thing of a
    latest-by that follows `keys` gains `about`, `values`, `setters` and `unheld`
    as `loops of` writes them. Its `about` is empty when no head mentions
    anything. Each entry in its `heads` gains `env`, the stored envelope
    that `loops get` writes. Entries in `keys` and `whole` gain nothing. Each
    `{"id", "shown"}` entry that a latest-by following `prev` or a collect
    lists gains `env` whatever its `shown`, and `payload` when it is `here`.
    Inside a slot with `by` each group's list gains the same.
    Counts, sums, minima and maxima list no ids and gain nothing. Taking
    those members out gives the protocol's answer byte for byte, and without
    `--values` that answer is all `read` and `fold` write. The members sit
    beside what they read so one read at the start of a session shows each
    item's fields, and none of their names is one the protocol writes at that
    place, so the answer is not mistaken for a fold's.
18. **A verb that answers from a store that does not check answers, then is
    refused.** Kyle ruled on 2026-11-20 that a verb that answers from the
    store must warn and exit non-zero when the store is not clean; before,
    only `loops check` said so. `read`, `fold`, `of`, `get` and `export`
    write their answer as before, from the lines that check, so the answer
    is what a store holding only those lines gives, byte for byte. Then,
    when a line was refused or a segment is altered, they are refused with
    `check`'s code, exit 1, and stderr says, with the two counts:

    ```
    refused: store-not-clean: 1 line refused, 1 segment altered; `loops check` lists them
    ```

    On `read` and `fold` the refusal also names the unclean stores (choice 30).
    `check` writes its report and ends with the same refusal, from the same
    function. A clean store adds nothing. A refusal of the verb's own, such
    as `id-unknown` for the id of a refused line, is said instead, and a
    reader that closes stdout does not hide an unclean store. `emit` and
    `erase` read the store to fill in and check what they write, so a
    refused line can leave a record unnamed in `prev` or make a target
    `prev-unknown`. They say the same words on stderr as
    `warning: store-not-clean: …` before they write, and their answer and
    exit code are unchanged. `import` does not read the store and says
    nothing.

19. **`emit` copies `occurred` when the heads agree.** An emit of a held
    thing carries the written `occurred` text when every head states it.
    If any head lacks it or the texts differ, the emit states no `occurred`.
    An erased or withheld head supplies its envelope like any other. A root
    and a first record copy nothing. `--occurred <when>` states a new
    occurrence and `--no-occurred` clears it. The two together are a usage
    error. This builds the ruling of 2026-11-20 in
    `notes/2026-11-15-the-cut.md`, section 5.

20. **A changeset can ask for the single-emit filler.** The owner ruled on
    2026-11-20 that plain `emit -` continues to fill nothing in and a
    collector can request the filler for a whole changeset with one option.
    [The cut, section 7](../notes/2026-11-15-the-cut.md#7-unanchored-records)

    Implementer's choices

    - The invocation is `loops emit - --fill`.
    - Omitting `about`, `occurred` or `sets` requests its default. A stated
      value supplies the entire field. `"about":[]` clears the mentions,
      `"occurred":null` clears the occurrence, `"sets":[]` sets no key,
      and `"sets":null` writes a whole-read record. Only filled input gives
      the two null forms these meanings.
    - A stated `prev` gains every live record of the thing, including live
      non-heads. An empty array and omission both request the full anchor.
      Use plain `emit -` to write exact predecessors and make a fork.
    - Each prepared record has its final id and is available to later lines.
      Infer `of` against all held envelopes, including those just prepared.
      Read liveness and head metadata after settling and admitting that
      combined holding. This is the current-holding case of the filler.
    - Visit lines in input order, preparing a line's labelled prerequisites
      first, in input order among siblings. Substitute their final ids in
      `of`, `prev`, `about` and `under` before filling the line.
    - Only labels schedule prerequisites. Inferring `of` from a literal
      predecessor requires its envelope at preparation time. A stated `of`
      leaves target checks to the final batch, which can see later literal ids.
    - Parse the changeset and bind its observers, then check duplicate,
      unknown and cyclic labels, in that order. In preparation order, each
      line infers `of` (possibly `prev-unknown` or `prev-unrelated`),
      fills the remaining fields and meets the writer's field checks.
      The first such failure ends preparation.
    - Both paths share the single-record filler and the conversion of a
      checked envelope into a reader's record. The usual batch writer checks
      all prepared drafts together before any signature and segment append.
    - Keep the segment and the `{"records":[...]}` answer in input order.
      Each answer entry gives the id and its original label when supplied.
    - A non-object payload supplies no inferred keys and is read whole
      unless it states `sets`. A changeset keeps its one default clock
      reading and the salt chosen for each line.

    For these examples `H` is the only record of `task:1`, a whole-read
    head mentioning `project:p` with occurrence `2009`. Letters in an
    envelope stand for full record ids. The examples show the varying
    envelope fields. Each record also has its kind, observer and emitted time.

    Take each of these three inputs independently against `H`.

    ```jsonl
    {"kind":"task","of":"task:1","payload":{"x":1}}
    {"kind":"task","of":"task:1","about":[],"occurred":null,"sets":[],"prev":[],"payload":{"x":1}}
    {"kind":"task","of":"task:1","sets":null,"payload":{"x":1}}
    ```

    Their respective envelope fields are

    ```jsonl
    {"of":"task:1","prev":["H"],"about":["project:p"],"occurred":"2009","sets":["x"]}
    {"of":"task:1","prev":["H"],"sets":[]}
    {"of":"task:1","prev":["H"],"about":["project:p"],"occurred":"2009"}
    ```

    Now take these two inputs together against the same `H`.

    ```jsonl
    {"kind":"task","of":"task:1","about":["project:q"],"occurred":"2010","payload":{"x":1}}
    {"kind":"task","of":"task:1","payload":{"y":2}}
    ```

    The first record, `A`, changes only `x`. The second copies its metadata
    from `A` and names both `A` and the still-live whole-read `H` in
    canonical id order.

    ```jsonl
    {"of":"task:1","prev":["H"],"about":["project:q"],"occurred":"2010","sets":["x"]}
    {"of":"task:1","prev":["H","A"],"about":["project:q"],"occurred":"2010","sets":["y"]}
    ```

21. **Write the tick as an ordinary record.** The owner ruled on 2026-11-21
    (TK1–TK5) that a tick is an ordinary record whose payload is the whole
    tick, covering every record folded. [The tick record](../protocol/tick.md)

    Implementer's choices

    - Give the spec first. `-` reads stdin. A file in the working directory
      (the directory given by `-C`, when supplied) takes precedence over a
      vertex of the same name. A bare vertex name reads
      `.loops/vertices/<name>.json`. An explicit path reads the file there.
    - Use the checked lines from one store reading for the tick and its
      envelope. An unclean store gives the same warning as on `emit`.
      The core determines which openings are withheld. The new record is
      appended after the fold.
    - Take the envelope flags of single-record `emit`, including its
      `--observer`, `--emitted` and `--salt` options. The observer must
      bind to the signing key. The spec and the holding supply the whole
      payload. Print the signed record's id. With no flags the tick is a root.

    For example, with just six backups held, run
    `loops tick backups --of tick:backups` twice. The first tick covers
    the six backups. The second covers the same six and names the first tick
    in its envelope’s `prev`. With `--all` on the second command it also
    covers the first tick (choice 32). A slot counting backups gives six.

22. **Check a tick on request.** The owner ruled on 2026-11-21 (TK7) that
    a verb checks a tick and a store accepts it under ordinary record
    verification regardless of the tick's verdict. [The check](../protocol/tick.md#the-check)

    Implementer's choices

    - `loops tick --check <id>` takes one full id or unique prefix, as
      `get` does. Use one reading of the store for the subject's opening
      and the whole holding. The check needs no signing key.
    - Print one JSON line using the vector formatter. On a clean store
      `same` exits 0. Every other verdict exits 1 with the explanation on
      stdout. An unclean store prints the verdict from the checked lines,
      then reports `store-not-clean` on stderr and exits 1.

    For example, import a tick and the six backups it covers. Checking its
    id gives `{"answer":"same","closure":"yes","taken-not-covered":0}`.
    Emit a seventh backup and check that id again. The verdict is still
    `same` and `taken-not-covered` is now 1.

23. **List the holding and identify the binary.** The owner ruled on
    2026-11-21 (W1) that adoption's CLI pieces are built beside the tick work,
    with `loops` first on PATH for daily work as the exit.

    Implementer's choices

    - `ls` returns `kinds` rows, one per observed envelope kind. Count
      settled, admitted IDs, including superseded records and records
      without an opening. Use the same unclean-store diagnostic as `of`.
    - `ls --things` returns `things` rows. A positional prefix selects rows
      by a literal, case-sensitive match on the whole thing name (written
      `of`, or the root's full ID). Order rows and distinct head kinds by
      UTF-16 code units. Each row counts all its records and its heads.
    - Resolve the headline from the live setters of `name`. One open text
      value gives `{"state":"text","value":"…"}`. A missing, unset or
      non-text headline is `absent`. An unavailable opening that could
      supply it is `unknown`. Multiple live setters for a declared or
      observed name give `conflict`, even if they wrote the same text.
      In each of those three cases the object has only its `state`.
    - `--version` prints `strange-loops-next` and the Cargo package version.
      It needs neither a store nor a key.

    For example, emit `task --of task:kiln name=Kiln`, then
    `task --of task:kiln status=open` with `loops emit`. `loops ls`
    reports two task records. `loops ls task:` returns
    `{"things":[{"headline":{"state":"text","value":"Kiln"},"heads":1,"kinds":["task"],"records":2,"thing":"task:kiln"}]}`.

24. **A writer can state what it read.** `--base T` selects the ids in
    tick T's `covers`. Each `--base-id R` selects one record, including a
    tick as an ordinary envelope. Both take a full id or unique held prefix.
    The base is the union of one optional tick cover and all literal ids.
    This implements option C of [TK11](../notes/2026-11-21-tick-record.md#tk11-a-write-against-a-base-that-does-not-hold-what-is-under-it),
    ruled by the owner on 2026-11-22.

    The marker must have kind `tick` and a locally accessible opening.
    Read its common members under the checker’s current rules. A marker
    from another version can supply its cover. Each listed envelope must be
    held, even for records of another thing. A missing envelope gives
    `id-unknown` with its id. An unavailable marker opening gives exit 1
    with `the tick's payload is not held`. Covered openings can be absent.

    For the thing being written, add any stated `prev` targets to the
    selection, then follow `prev` through held envelopes of that thing.
    A missing ancestor ends that path. A stated target stays in the
    envelope even when another record in the effective base is above it.
    Settle and admit inside the resulting set. The filler names its live
    records, derives `sets` there, and copies mentions and agreed occurrence
    from its heads. Explicit links and field overrides work as before. A
    stated predecessor can supply `of` from the writer's full lookup. In
    a filled changeset the same starting selection applies throughout. Add
    earlier prepared forms before taking the closure for each line.
    Tick writes use the base for their envelope. Choice 27 selects what they fold.

    Suppose a marker covers the original `status` setter of `task:42`. A
    peer then changes that status. Writing `loops emit task --of task:42
    status=done --base T` names the original setter and leaves the peer and
    the new emit as heads. `loops of task:42` shows both status setters.

    If X sets port and owner and Y changes port over X, `--base-id Y`
    includes X under Y. An emit changing either key names both. After the
    append stderr says `the base did not show 1 record that this emit names`.
    If the tick covered neither X nor Y and the writer states `--prev Y`,
    the emit names both and the count is 2. The count includes each distinct
    id in the written `prev` outside the tick cover and literal ids, including
    stated targets and earlier changeset lines. Dead ancestors that the emit
    leaves unnamed cost no notice. When the effective base has no record of
    the thing, stderr says `the base covers no record of <thing>`. If all its
    records of the thing fail admission, stderr says `no record of <thing>
    in the base is admitted`. Covered ticks contribute only their own
    envelopes. These notices follow a successful write; conflict policy
    remains open for step 3.

25. **Project keyed fields and show a plain view.** The owner ruled on
    2026-11-21 (W1) that daily reads should be possible without a hand-written
    spec, with the adoption step's CLI pieces built beside the tick work.

    Implementer's choices

    - `--fields name,status` selects the thing listing, optionally narrowed
      by the positional prefix. Give the flag once, with distinct, nonempty,
      comma-separated literal keys. Plain columns follow their written order.
      Every matching row keeps its headline and gains a `fields` object in JSON.
    - The headline, the projected fields and `of` read the same live setters.
      A projected field has `state` equal to `value`, `unset`, `unknown` or
      `conflict`. A value carries the original JSON under `value`, including
      an explicit null. Unknowns and conflicts carry a `setters` array with
      the IDs, visibility and available values in the same shape as `of`.
      For a key nobody names, a live unheld whole-record setter leaves the
      field unknown. The plain detail view says `other fields  unknown`
      when whole-record openings are missing.
    - Ask for `--plain` on `ls` or `of`. This display is for reading and may
      change. Scripts use the default JSON or `--json`. The two explicit
      formats together give a usage error. A pipe and a terminal get the
      same format.
    - Show ordinary text bare. Keep JSON quotes around empty text, text
      with surrounding whitespace, a literal display marker (`—`, `unknown`,
      `null`, `true`, `false`, `conflict (N)`), and text spelling a JSON
      number, array or object. Other values use compact JSON. Unset reads
      as `—`, unavailable as `unknown` and competing setters in setter order,
      for example `conflict (2): 9001 | 9000`. An open setter missing the
      field shows `—`. Quote text that looks like a conflict or contains the
      side separator in a preview. Limit each side to 40 Unicode scalars
      after escaping controls and before padding the column. The final
      ellipsis counts toward that limit. Read the full
      values and setter IDs with `loops of <thing>`.
      Show `about` mentions space-separated with the same quoting, or `—`
      when there are none. Escape controls throughout. Padded cells escape
      non-ASCII characters other than the marker dash and preview ellipsis to keep columns aligned.
      Detail lines and the last column retain printable Unicode.
    - `ls --plain` shows a root by its shortest locally unique record ID
      prefix, with at least eight digits after `r:`. Count distinct IDs
      in all checked lines, including records outside the listing. Use
      that prefix with `loops of` or `loops get`. Payload text stays literal.
    - `of --plain` labels the times of each head by its full ID, in the same
      head order as JSON. Read the clock once. Show `emitted` in whole
      seconds, minutes, hours or days, and `now` within one second. Keep
      `occurred` as written, with `—` for no claim. Walk tests may supply
      `LOOPS_TEST_PLAIN_NOW`, a canonical UTC instant, exclusively for
      this display clock. The writer continues to take `--emitted`.

    For example, give `task:kiln` the name “Repair kiln” and update only its
    status. A Monday read needs no spec file:

    ```text
    $ loops ls task: --fields name,status --plain
    THING      HEAD KINDS  RECORDS  HEADS  name         status
    task:kiln  task        2        1      Repair kiln  done
    task:lamp  task        1        1      Fit lamp     —

    $ loops of task:kiln --plain
    thing  task:kiln
    records  2
    heads  1
      name  Repair kiln
      status  done
    about  site:workshop
    head  r:b2nlfg2kr0u2amvtfsbpbijvopv8vk2ussk9udfobbsd93joov9g
      emitted  3 hours ago
      occurred  2026-11-18/2026-11-19
    ```

26. **Remember which segments this user verified.** The owner ruled on
    2026-11-21 that the adoption step may reuse signature verification for
    whole, clean segments this user's own reader checked. [W2](../notes/2026-11-21-order-of-work.md#w2-remember-which-segments-were-checked)

    - The library's `Dir::read()` verifies all signatures. The binary selects
      the user's cache directory and calls `Dir::read_with_cache` for ordinary
      store reads. `loops check` calls `Dir::read()` directly.
    - For the same store bytes, reading with evidence produced by this verifier
      and reading without it give the same records, refusals, alterations,
      answers and exit status. Every read hashes the buffer it decodes. A fitting
      filename, UTF-8 text, a final newline and a successful check of every line
      are required to remember a digest. On a hit the reader skips only the
      Ed25519 verification. It still checks the key and signature encodings.
    - A torn final line is skipped on every read. If truncation left the old
      filename, the segment is altered. If the filename fits the truncated
      bytes and the complete lines pass, the read succeeds. Both versions
      are ineligible for the cache. Purging an opening produces new segment
      bytes which need their own verification.
    - The optional file contains one canonical base32hex SHA-256 per line.
      Its filename includes the line-check version, currently 1. Bump that
      constant for stricter checks. The directory is `$XDG_CACHE_HOME/loops`,
      falling back to `~/.cache/loops`. `LOOPS_CACHE_DIR` overrides it with an
      absolute directory. An empty override disables caching. Paths into the
      store, including symlinked directories, and symlinked cache files are
      excluded.
    - On Unix, create the cache directory with mode 0700 and the file with
      mode 0600. Ignore group- or world-writable cache directories and files
      accessible to other users. A missing or malformed list supplies no hits.
      Cache I/O failures leave the store answer intact. Publish additions by
      renaming a uniquely created sibling file. Concurrent readers can lose
      an addition, which costs one more verification. Obsolete hashes can
      remain after erasure and the user can delete the file at any time.
    - `loops check` bypasses the cache, including updates. Import always
      verifies incoming lines. A user who plants a correctly spelled digest
      for a complete, correctly named segment can make an ordinary read
      accept a bad signature. Only the user's own cache has that authority.
      A full check detects the bad signature.
    - Release measurements used 9,000 signed fact records in 20 segments of
      450. Each timing is the median of seven new processes after one warm-up.
      Cold runs removed the verifier cache before each process. The OS file
      cache stayed warm. Each emit updated the same held thing, then the
      benchmark restored the original set of segments.

      | Command | Cold cache | Warm cache |
      | --- | ---: | ---: |
      | `loops check` (always verifies) | 0.496 s | — |
      | Count fold | 0.485 s | 0.181 s |
      | `loops ls` | 0.479 s | 0.180 s |
      | One `loops emit` of a held thing | 0.491 s | 0.185 s |

27. **Read a spec result in plain text.** The owner ruled on 2026-11-21
    (W1) that the adoption step includes a plain view for daily reading.

    Implementer's choices

    - `read --plain` and `fold --plain` show one slot after another in the
      spec's written order. A spec with no slots reads `no slots`. Counts
      and sums keep all their digits. An empty minimum or maximum reads
      `nothing read`. An empty record or thing list reads `—`.
    - Indent the members of each group or thing under its name. Keep the
      result's order within each list. Use choice 25's unique prefixes for held
      record references, including roots and envelope links. Keep unheld
      references in full. Every grouped
      slot shows both its ungrouped count and its top-level unread count.
      A nonzero unread count can mean a needed opening, field, numeric value
      or test result was unavailable. A group's own unread count appears
      inside that group.
    - A keyed thing without `--values` shows its name and its live `name`
      headline, with the same absent, unknown and conflict marks as `ls`.
    - `--values` shows the listed head's kind, envelope and, for collect or
      latest-by following `prev`, its held payload. Escape text and show times
      as in choice 25. Read the display clock once, at the first detailed head.
      For latest-by following `keys`, show the heads, setter IDs and whole
      records, then the same field states and mentions as `of --plain`.
      Mark erased and withheld entries when showing values.

    For example, a workshop stores one task named “Repair kiln” with `area=shop` and `hours:=3`.
    Its saved morning spec counts jobs, sums hours by area and follows the
    tasks' keys. The task was emitted with `--whole`.

    ```json
    {"vertex":"morning","from":[{"store":".","kind":["task"]}],"fold":{
      "jobs":{"count":true},"hours":{"sum":"hours","by":"area"},
      "items":{"latest-by":"of","follow":"keys"}}}
    ```

    ```text
    $ loops read morning --plain
    jobs  1
    hours
      group  shop  3
      0 ungrouped
      0 not read
    items
      thing  task:kiln  Repair kiln
        heads
          r:atco26o6
        whole
          r:atco26o6
    ```

28. **Write a tick over a cut.** The owner ruled that a tick may fold the
    downward closure over `prev` of the records emitted before a time or of
    the ids the writer names. [The cut, §§1–3](../notes/2026-11-15-the-cut.md)

    - `--as-of` accepts an instant or a date from the envelope time-test
      grammar. A date means its start. The note specifies a strict seed
      (`emitted < T`), like a window’s upper bound. The model’s `upTo`
      is strict too, since 2026-11-22. A selected record can pull in
      a predecessor whose clock reads T or later.
    - Repeat `--cover` for the union of the named records and their held
      predecessors. Each operand resolves like `get`, by full id or unique
      prefix. Choose either named cut. Choice 32 also allows slicing inside
      the time cut.
    - Follow held `prev` links across the entire store. The check reports
      closure independently, over both `prev` and `under`. A tick with an
      outside `under` target can check `same` with closure `no`. The cut
      note leaves `under` for standing. An `erases` link does not extend a cut.
    - With either cut alone the payload names every id in the cut. A covered
      backup whose opening the store has lost to an outside eraser is withheld
      in the claim. Its envelope can be counted and its size is unread. A writer’s
      `--base` selects the tick envelope’s anchor independently of the cut.

    For example, six backups were emitted at midnight on November 16 and 17.
    The first night recorded jellyfin at 412 MB, pihole at 3 MB and gitea at
    88 MB. `loops tick backups --as-of 2026-11-17` covers those three ids.
    The count is 3 and the sum is 503 MB. Checking it in that store gives
    `same`, closure `yes`, and 3 taken outside the cover.

29. **End emit options and learn a new writer's identity.** Issue 11
    asks for dash-leading message text and the signing identity before
    writing the first record.

    Implementer's choices

    - A standalone `--` ends options on a single emit. Positional syntax
      still takes the kind, the fields, then at most one final message.
      After the marker even `--json` is literal. A tick writer already has
      its payload, so a final `--` is harmless and a following token is a
      usage error. JSONL changesets keep their own syntax.
    - `loops whoami --init` extends the existing identity lookup. It needs
      no store and uses the first emit's key lookup, private-file creation
      and creation notice. It prints the public `k:` ID on stdout. Repeating
      the command reuses the key silently. Bare `whoami` keeps its JSON
      answer and requires an existing key.

    For example, an agent sets `LOOPS_KEY_FILE` and runs `loops whoami --init`
    to learn its public identity. Once it has a store, `loops emit message --
    --leading-dashes` writes a record whose `text` is `--leading-dashes`.

30. **A spec finds the stores it names.** Kyle ruled on 2026-11-23 that
    `read` and `fold` bind each name on the command, in a list kept with
    the stores, or in the user's list, in that order. [AD1](../notes/2026-11-22-adoption.md#ad1-how-a-spec-finds-the-stores-it-names)

    Implementer's choices

    - Give `--store <name>=<dir>` after the verb. Split at the first `=`
      and require both parts. The last command binding for a name wins.
      A relative directory starts at the working directory selected by `-C`,
      just as a relative spec file does, or at the process's working directory
      when the command omits `-C`.
    - Find the current store from that same starting directory. Look for
      `stores.json` beside its `.loops/`, then in its immediate parent.
      Use the first file found, including an empty object. Outside a store,
      look for the group list only in the starting directory. The per-user file
      is `$XDG_CONFIG_HOME/loops/stores.json` when that config home is
      absolute, otherwise `$HOME/.config/loops/stores.json` when HOME is set.
      Each name falls through independently to the next binding source.
    - Each list is a UTF-8 JSON object mapping distinct names to directory
      strings. Resolve relative strings against the list's own directory
      (an empty string resolves to that directory). A missing list supplies
      no bindings. Validate the selected group file and the user file even
      when the command supplies all the names. Invalid JSON, a wrong shape
      or a duplicate name is a usage error naming the file (exit 2).
      Other file I/O failures name the path and exit 3.
    - Resolve the distinct names in the spec's written source order. A binding
      must lead directly to a store with a `.loops/segments/` directory.
      An unusable binding takes precedence over more distant bindings.
      The first missing store ends the read with empty stdout,
      `refused: store-unknown: <name>` on stderr and exit 1. For a binding
      whose directory holds no store, append `: <directory>`.
      Only `.` defaults to the current store, when there is one.
      An explicit binding from the command or either list overrides that default.
    - `read` still takes its spec from the current store's
      `.loops/vertices/<vertex>.json`. Read segments only for stores the spec
      names. `fold <file | ->` works outside a store because it gets its spec
      from the file or stdin and can use command, group and user bindings.
    - Canonicalize each bound `.loops/` and read each distinct directory once
      with choice 26's content-keyed segment cache. Combine its checked lines
      with the others before the single settlement, admission and spec run.
      Each source tests the whole union. A duplicated id counts once, an
      eraser can hide another store's opening, and a revision can follow a
      predecessor held elsewhere. Both output formats use this holding for
      `--values`. Binding every name to the current store preserves its answer
      byte for byte.
    - After the answer, choice 18's `store-not-clean` reports the total
      refused lines and altered segments across distinct directories and
      exits 1. Append `(stores: ...)` with all source names for the unclean
      directories, including aliases, sorted by name.
    - Only `read` and `fold` accept the option **after** the verb. Choice 33
      extends bindings before the verb. A tick uses its working store for both
      writing and checking regardless of the names inside its spec.

    For example, a group file beside two stores can read
    `{"workshop":"workshop","yard":"yard"}`. With one task and one note in
    workshop and one task in yard, a spec asking for workshop tasks and yard
    notes counts **3** from either directory.

31. **A private group imports frozen old-store cuts.** Under AD2 each
    included old fact becomes one signed record in its own destination.
    Run `loops shadow-import group.json --check-only` to check the whole
    group. Use the same command without `--check-only` to publish it.
    A one-source group can read

    ```json
    {"state":"private","sources":[{"name":"workshop","facts":"workshop.facts.jsonl","map":"workshop.map.json","destination":"workshop"}]}
    ```

    - All four paths are relative to the group file. Each distinct destination
      must already contain its own `.loops/segments/`. Source names must be
      distinct and agree with the reviewed maps. The verb accepts exactly the
      fields shown. Store bindings for subsequent reads use choice 30.
    - Prepare each cut with the Python standard-library exporter. It reads
      a frozen SQLite snapshot in one read-only transaction, counts the old
      ticks, and writes a versioned JSONL stream and a reviewable JSON map.
      A WAL requires `--quiescent-copy` and private scratch. The strict vertex
      subset recognizes the keyed and collected folds, skips the named
      presentation and boundary declarations, and refuses unsupported syntax
      with its line. The map and cut carry the same vertex SHA-256. See
      [the export format](../tools/shadow/FORMAT.md) for the grammar,
      exact digest framing and SQLite snapshot requirements.
    - Replay strictly increasing numeric `(arrival_ordinal, arrival_seq)` or,
      when both are absent, `rowid`. Gaps are valid. A partial schema, null
      or repeated coordinate, duplicate old id in one source, bad framing,
      wrong count or failed digest invalidates the cut. The old binary64
      epoch seconds become UTC `occurred`, rounded once to the nearest
      microsecond, ties to even, with trailing fractional zeros removed.
    - For a kind keyed by `name`, the first `{"name":"kiln","heat":"hot"}`
      of kind `thread` is a whole record of `thread:kiln`. Each revision's
      `prev` is the canonical set of the first whole record, current head
      and last setter of each field. Determine the thing from the original payload.
      Its `sets` contains the cleaned payload keys plus any key removed by
      cleaning that was visible before this revision. An absent member on
      that setter clears the old value. A revision can state empty `sets`.
      Old origin and signature participate in identity checking.
    - Under AD4, read every source and classify each original occurrence
      before mapping records. In `ref`, an exact group ID takes precedence.
      Otherwise split at the first colon or slash and form `prefix:value`
      when the prefix matches `[a-z][a-z0-9-]*`, differs from `r` and the
      value is nonempty. The addressed thing need not exist. Suffix fields
      `<name>_ref` and the map's `ref_fields` accept only exact group IDs.
      Split text at commas, trim and ignore empty parts. A configured field
      also accepts an array of text, splitting each element. Mixed arrays
      and other unsupported shapes yield no mentions. A bare `_ref` is
      ordinary payload.
    - Prefer an included occurrence in the referring destination. Otherwise
      use a single distinct target among all included copies. A keyed target
      is its thing, and a root target is its record ID. Omitted, ambiguous
      and unresolvable targets are counted. Compute root IDs target-first.
      Within a strongly connected component of root dependencies, a lookup
      requiring an internal edge is unresolved (`cycle`). Direct self
      references are accounted for and dropped. External parts remain usable.
    - In destination arrival order, a keyed thing accumulates resolved
      `ref` parts and keeps the current set for each suffix and configured
      field. A supplied field replaces that set even when it yields none.
      Extract these inputs before cleaning. Roots use only their own fact.
      Add only the current fact's nonempty observer mention, suppress the
      thing itself, and canonicalize the union for `about`. The group key
      remains the signer. Remove a text `ref` once all parts are accounted
      for, including empty or delimiter-only lists. Remove a text suffix
      field only with its base member on the same original fact (any JSON
      value) and at least one part with all parts accounted for, or a literal
      empty string. A valid part in a retained field still contributes its
      mention. Leave configured fields and all other members untouched.
    - A missing key field, a collected kind and an unnamed kind included
      by `--include-unnamed` each produce an independent root. A collect
      limit affects the old view only. The default omits unnamed kinds.
      Roots and first whole records omit `sets`. A present key must be
      nonempty text and its kind a valid single reference prefix other
      than `r`. A fact named `tick`, an invalid occurrence time, a payload
      outside the writer's JSON object domain (including repeated member
      names or out-of-range numbers), or an invalid envelope refuses the
      included row. A key that cannot appear in a revision's `sets` gets
      the writer's refusal. An omitted row's mapping defect is counted.
    - The group shares one new key, one random 16-byte salt and one
      millisecond-clock `emitted` per included old id. Identity comparison
      uses SHA-256 of canonical JSON containing kind, exact binary64 bits,
      observer, origin, signature and tagged payload. A payload that fails parsing, member uniqueness or numeric range
      uses its tagged original text. Coordinates belong to individual
      sources. Different fingerprints for one old id give `shadow-id-conflict`.
      Equal mapped histories give the same signed bytes across stores.
      Different predecessors give different ids for the same old fact.
    - Preflight reads every selected destination once, fully verifies its
      segments, and rejects foreign records. It reconstructs the history of
      each thing in source order. It keeps offsets and hashes into the frozen
      input and checks prospective ids against the common changeset writer.
      All included rows must pass before publication starts. Prepare at most
      1,000 rows per segment with a 4 MiB budget (canonical envelope and
      payload lengths plus 512 bytes per row). A larger individual record
      occupies one segment. Fetch and verify the input slices again to sign
      each publishing batch. The dry run uses temporary in-memory key material
      when needed and leaves the filesystem untouched.
    - The POSIX private state directory is 0700. Its `key`, `lock` and
      `journal.jsonl` are 0600. Keep the journal private because it holds
      salts. Nonblocking advisory locks on the state lock file and selected
      segment directories serialize importers. Ordinary writers should use
      their own stores. The journal header pins the public key and each
      source name, canonical destination, semantic map digest and inclusion flag.
      Hash the canonical UTF-8 JSON `{"kinds":K,"ref_fields":F}` with SHA-256
      in base32hex, using every fold and the sorted set of configured field
      names (default empty). The current map and export header still bind
      to each other. A re-export after a comment edit succeeds when the
      semantic mapping and fact prefix agree. Additional sources get a new
      binding frame. Losing a pinned source gives `shadow-state-mismatch`. A per-source count and
      rolling hash pin the exact prefix of fact lines, including their coordinates
      and whitespace. Tick counts can grow independently. A cut also records
      previously unseen omitted ids and fingerprints for later identity checks.
    - The journal uses LF-terminated JSON arrays `[checksum,event]`. The
      checksum is the base32hex SHA-256 of the previous binary digest
      followed by the exact JSON bytes of the event. The initial digest is
      empty. A v1 header gives `shadow-state-mismatch` with a request to import
      into fresh shadows. After whole-group preflight, pin the cuts and sync
      the new seeds in frames of at most 1,000. Each old ID gets one fingerprint,
      salt and emitted time for the group. All its dependencies' seeds must
      be durable before the first expected ID is reserved. A reservation frame names its destination through the pinned source
      and takes its batch number from its zero-based position among reservations.
      It records each old ID and its expected new record ID.
      Sync the frame before `Dir::append`, then sync the completion mark.
      On retry a held reserved id is done, including a commitment whose opening
      was purged. A missing id is reconstructed and checked against its reservation.
      Recompute every reserved occurrence, including held records. If a newly
      known target changes even one earlier expected ID, refuse the group
      before writes. A complete rerun leaves segments and journal byte-identical.
      Ignore an unterminated tail while reading and truncate it on a successful
      writable preflight. A damaged complete frame, changed prefix, semantic pin, flag,
      signer or foreign destination record gives `shadow-state-mismatch`.
      Process interruption can leave completed batches in place. Power-loss
      behavior follows the existing segment writer.
    - After all batches complete, publish `<group-stem>.ids.json` beside the
      group file, under the same lock. It maps each old ID to its included
      occurrences with exactly `source`, group-relative `destination`,
      `record` and `thing`. A root's thing equals its record. An omitted-only
      ID has an empty list. Write a same-directory 0600 file, sync, rename
      and sync the directory. Skip identical bytes. Retry can finish this
      step after segment publication. Check-only creates or repairs nothing.
    - Standard output is one JSON object with `sources` keyed by name and a
      `group` total. Row counts cover read, written, already held, planned
      writes, empty observers, missing keys, omitted ticks, included and
      omitted unnamed rows, omitted defects and refusals by reason. Overlap
      counts distinguish shared old ids yielding one id, differing ids or
      filtered copies, things in multiple stores, things with multiple union
      heads and keyed things whose old id sets differ. The group counts each
      shared identity or thing once. A row refusal gives its source, coordinate,
      old id and reason on stderr. Source and map framing errors use
      `shadow-source-invalid` and `shadow-map-invalid`. Writer refusals keep
      their existing codes. Exit statuses are 0 for success, 1 for data,
      2 for usage and 3 for system errors.

    Reference counters count each included occurrence once on initial import,
    check and replay. The following names are present even when zero.

    | Counters | Unit |
    |---|---|
    | `ref_parts`, `suffix_parts`, `reviewed_parts` | Nonempty input parts at each location, before deduplication |
    | `suffix_id_hits`, `reviewed_id_hits` | Parts at those locations exactly matching a group ID, including omitted targets |
    | `thing_mentions`, `record_mentions` | Distinct final reference-derived targets per record, including carried targets |
    | `self_dropped`, `self_observer_dropped` | Explicit self parts at their origin, and self-observers separately |
    | `left_out_unnamed`, `left_out_defect` | Parts naming only omitted copies. A defective copy takes precedence when both reasons apply |
    | `ambiguous_target`, `cycle`, `invalid_ref_part`, `nonmember_id_part` | Parts with differing effective targets, cyclic lookups, invalid free-form references, or unmatched ID-only text |
    | `ref_not_text`, `reviewed_unsupported` | Fields with unsupported shapes |
    | `ref_removed`, `suffix_removed` | Removed fields |
    | `suffix_kept_no_companion`, `suffix_kept_not_text`, `suffix_kept_unresolved` | Retained suffix fields, one reason each in this precedence order. The last includes delimiter-only nonempty text |

32. **Cover the records the spec’s answer depends on.** The owner ruled on
    2026-11-23 (TK13) that `loops tick <spec>` writes the downward-closed
    slice. `--slice` asks for the same cover explicitly. `--all` alone
    writes the former whole-holding tick. [TK13 and its two runs](../notes/2026-11-21-tick-record.md#tk13-what-a-tick-covers-when-you-name-no-cut)

    - Start with the settled local holding before the append. A source takes
      a record by its envelope tests on `kind`, `about` and `of`, before
      admission and before any slot’s `where`. Cover those records, their
      erasers, their direct `prev` targets, their direct successors through
      `prev` (of any kind), and those successors’ direct `prev` targets.
      If any slot follows `keys`, also cover every record of each thing a
      source touches. For each such record include anything that erases it
      and every held target it names in `prev`.
      A tick participates by its envelope. Its payload’s `covers` adds no
      records to the slice.
    - Follow `prev` and `under` recursively from that set, including each
      held target. If no source matches, write `covers: []`. With both
      `--as-of T` and `--slice`, first compute choice 28’s time cut, then
      select and follow links entirely within it. A covered envelope naming
      a missing target, including an `under` outside that cut, gives
      `closure: no` even on a tick that checks `same`. The two named cuts
      on their own still follow only `prev`. Combining `--cover` with
      `--slice` is a usage error.
    - Read openings as held in the whole writer snapshot. List a covered
      record in `withheld` if the writer lacked its opening, including when
      its eraser is outside the cover. The tick answers as `loops fold`
      does over the same local holding (or the chosen time cut with those
      openings). A fold across named stores can have a different holding.
    - An appended tick can itself erase a covered record the writer read
      open. Its claim uses the pre-append opening. Checking after the append
      then reports `cannot check` with a missing opening. For a later
      `emit --base`, the tick shows exactly its listed records. A write of
      an uncovered thing can therefore start a new head.

    For six backups and forty unrelated notes, the default covers six ids.
    If a `retired` record replaces the 412 MB backup, a tick counting
    current backups covers seven ids and answers 5 runs and 615 MB.

33. **Select the working store by name.** Use `loops --in yard ls kiln:`
    to read the store bound to `yard`. A single leading `--in <name>` selects
    the store for `emit`, `erase`, `tick`, `import`, `get`, `of`, `export`,
    `check`, `ls`, `read` and `fold`. Those verbs reject a repeated selector
    and `--group`. Only `describe` accepts several working stores (choice 36).
    `init`, `whoami`, `shadow-import`, help and version reject store selectors.

    The origin is the starting directory or the directory selected by `-C`.
    Resolve names once using choice 30's user list, first local list and
    command overrides. A leading `--store name=dir` supplies a binding on
    every verb. For `read` and `fold`, leading and trailing bindings combine
    in command order, with the last binding for each name winning. Relative
    command bindings and file operands use the origin, even when a binding
    precedes `-C`. Only an exact bound directory holding its own
    `.loops/segments` opens. An unknown or unusable name gives the existing
    `store-unknown` refusal.

    For example, `loops --in yard fold backups.json` reads the file at the
    origin. In the spec, an unbound `.` selects the opened yard store. A
    binding for `.` in either list or on the command overrides that default.
    `loops --in yard read backups` reads the vertex from yard. Tick file
    operands and vertices follow the same origin/working-store distinction.

    Before a named `emit`, `erase`, writing `tick` or `import`, stderr gives
    the requested name, canonical store directory and the winning list path,
    command binding or current-store default. The verb writes through the
    store already opened. Read commands, including `tick --check`, print
    no destination notice. Standard output keeps its ordinary format.

34. **The working store's description.** The optional UTF-8
    file `.loops/store.json` holds one JSON object. It requires the number
    `1` in `version` and an object in `kinds`. It may also have a text
    `note`. An empty `kinds` object is valid. Each nonempty kind name maps
    to an object with the following optional members. Fixed-member objects
    are closed and object member names must be unique at every depth.

    | Member | Value |
    | --- | --- |
    | `note` | Text, preserved literally. Put the kind's naming guidance here. |
    | `key` | A nonempty payload field name or explicit `null`. A string key requires a kind matching `[a-z][a-z0-9-]*` other than `r`. |
    | `headline` | A nonempty payload field name. |
    | `refs` | An object mapping nonempty payload field names to arrays of distinct kind prefixes matching `[a-z][a-z0-9-]*` other than `r`. An empty array allows every prefix, including `r`. The spec reserves `env.`, so a reference field cannot start with it. |
    | `lifecycle` | An object with required nonempty text `field` and optional `active` and `closed` arrays of distinct strings. An omitted list defaults to empty. Together the lists must contain at least one value, and they must be disjoint. |
    | `preview` | An ordered array of distinct nonempty payload field names. |

    Plain `ls`, `of`, `read` and `fold` load the working store's description.
    Two `ls` flags also use descriptions in JSON output, `--active` and
    `--refers-to`. The `describe` verb asks for descriptions directly.
    Each validates the whole description once per selected store. A plain
    fold outside any working store uses its ordinary defaults. A source in a
    spec supplies records only, including when a binding redirects `.`.
    Ordinary JSON reads, exports, `emit -`, `emit - --fill` and `tick` are
    independent of the description, even when the file does not parse.
    Plain views without either flag keep their existing output when the file
    is missing. Bad UTF-8, malformed JSON or a grammar error gives exit 2 with the filename and
    error location on stderr. A file-system failure gives exit 3 with the
    filename. Both leave stdout empty.

    Shorthand `emit <kind>` loads the file from the store it writes to,
    including the store selected by `--in`. With a file present, choose a
    kind under `kinds`, even when supplying `--of`, `--prev` or `--root`.
    An empty declaration `{}` names a kind. The checks below give usage
    error 2 before signing or appending. To write an intentional exception,
    `emit -` accepts any changeset the store accepts.

    - For a kind with a text `key`, state that payload field, give `--of`
      or a predecessor, or request a keyless root with `--root`. For
      example, with `"key":"name"`, `emit kiln name=east` fills in
      `of=kiln:east` before choosing the anchor and signs the same record
      as `emit kiln --of kiln:east name=east`.
    - With `--of` or `--prev`, the key field may be omitted. If supplied
      for a natural thing, use nonempty, comma-free text equal byte for
      byte to everything after its first colon. The thing's prefix may
      differ from the emitted kind. The same text and comma checks apply
      when deriving the key. Repeated fields retain `member-duplicate`.
      A null or omitted `key` leaves addressing to the ordinary writer.
    - Use `--root` without `--of` or `--prev`. Both a deliberate root and
      a revision of a root by ID or predecessor skip the key checks and
      keep the supplied payload. Their other field checks still apply.
    - A stated lifecycle field takes text from its `active` or `closed`
      list. A stated reference field takes one typed name accepted in
      `about`, or a flat list of such names. Use a listed prefix when the
      prefix list is nonempty. An empty prefix list allows every prefix,
      including `r:`. The target may be absent. An empty payload list
      `[]` writes the reference field with zero targets.
    - A comma in any reference, including a list member, stops the
      shorthand. Give multiple targets as separate list entries, for example
      `owners:='["yard:east","yard:west"]'`. Commas are legal in `--of`,
      `--about` and undeclared fields. Lifecycle and reference fields may
      be omitted or unset with `--sets <field>` and no payload value.

    With a file, each head kind must declare the same headline field. Use
    the kind's `headline` when present, otherwise its string `key`. If any
    head lacks a declared field or the heads disagree, the `ls` headline
    cell shows `—` and the other plain views omit the headline. With no file,
    plain `ls` and keyed folds in ID view use `name` as before. JSON `ls`
    always reads its headline from `name`. The selected field is read
    literally with the usual live-setter rules. Missing, non-text,
    conflicting and unread values keep their ordinary headline rendering.
    A configured headline appears on the thing line of plain `of` and keyed
    folds, including with `--values`. All existing detail is still shown.
    In a plain listing with a `kind:` prefix (including a narrower prefix
    such as `kiln:e`), `preview` supplies the columns in written order.
    An empty preview uses the headline column. The record-ID prefix `r:`
    selects roots across kinds. Explicit `--fields` wins.

35. **List active things.** `loops ls kiln: --active` reads the lifecycle
    declared for `kiln` in the working store. A narrower literal prefix such
    as `kiln:e` uses the same rule. The prefix must name a declared natural
    kind and include its colon. A missing description or lifecycle, an
    incomplete prefix, `r:`, or `--things` gives usage error 2.

    For each thing in the prefix, read the declared field from its live
    setters before projecting columns. Hide the thing only if this yields
    one text value in `closed`. A missing value, a list, an unread setter,
    or competing setters leave the thing visible, even if both setters say
    `retired`. Only `closed` determines visibility in this listing. An
    omitted or empty `closed` list keeps every thing.

    JSON keeps the usual `things` rows and reports the applied rule in
    `active`, for example `{"closed":["retired","broken"],"field":"status","kind":"kiln"}`.
    Plain output prints `active` and that object above the table. Both report
    the closed values in their declared order, including for an empty result.
    `--fields` selects columns independently. With `--in`, both the rows
    and the rule come from the selected store.

36. **Describe the selected stores.** `loops describe` reports on the current
    store. `loops --in workshop --in yard describe` selects named stores.
    `loops --group describe` selects exactly the names in the first local
    list from choice 30. Command bindings can redirect those names. The
    group's membership and lookup do not need the user list. A missing local
    list gives usage error 2. An empty local list gives `{"stores":[]}` or,
    with `--plain`, `stores  0`. Combining the two selection modes is a
    usage error. All selected stores must open before any description or
    segment is read. Aliases of one physical `.loops` count once. If distinct
    selected working directories link to the same data, report the first of
    their canonical paths in filesystem path order.

    Each entry of `stores` gives a canonical store directory, its validated
    `description` as supplied (or `null`), and `fit` keyed by kind. Plain
    output prints the description, fit and reference tables in that order.
    Settlement and admission happen once over the union. A store reports a
    thing if it holds an admitted record of that thing. Count the thing once
    for each distinct current head kind, using that store's own declarations.
    Two stores can both report the same thing. A declared kind can have zero
    things. An observed undeclared kind has `declared:false`.

    A string key gives six exclusive buckets. Count a root-ID thing in
    `keyless_roots` throughout its revisions. Compare the live field of a
    natural key with the entire suffix after its first colon. A non-text
    value counts as `different`. The remaining buckets are `equal`, `unset`,
    `conflict` and `not_read`. For lifecycle, count things by their unset,
    conflicting or unread field state. Also list every readable live setter's
    value outside both lists in a histogram of typed `{value,count}` rows,
    including readable values on competing setters. An inapplicable key or
    lifecycle is `null`.

    For each declared reference field, count a scalar once or each immediate
    list member once per distinct live setter. Preserve repeats. A missing
    member and an empty list supply zero occurrences. A hidden setter supplies
    one `not_read`. `things_unset` counts things of the kind whose live
    field reads as unset. An empty list is a value and does not count.
    Classify readable occurrences by their written form.
    A typed target held in this store counts in `held_here`. Other typed targets count
    in `held_elsewhere_in_group` or `not_in_group` according to residence.
    A target's residence requires an admitted record of it. Other values,
    including nested lists and objects, count as `not_typed`. Independently,
    `without_mention` counts typed occurrences absent from the union of current
    heads' mentions. `unlisted_prefix` counts readable typed occurrences
    whose prefix is absent from the field's `refs` list. A nonempty list
    counts every `r:` occurrence as unlisted. An empty list always gives
    zero. These observations leave the command successful. An unclean store
    retains the checked-lines answer and the existing integrity refusal,
    naming the affected store directories.

37. **Find things that refer to a target.** `loops ls --refers-to kiln:east`
    takes one complete typed name. A root ID must be written in full.
    Select the current store, use leading `--in` once per name, or use
    `--group` as in choice 36. This mode accepts `--plain` or `--json`.
    A prefix, `--things`, `--fields` or `--active` gives usage error 2.

    Settle and admit the selected records together. For each thing, take
    the union of reference field names declared for any current head kind
    by any selected description. Ask the keyed fold's payload `is` test of
    each distinct field over the thing's full admitted history. A yes in
    any field lists the thing once. Otherwise an unknown counts it once as
    unread. A field with no setter answers no. Reference kind lists,
    mentions and target residence do not participate. A self-reference can
    match. Lists match immediate members. Comma text is a single literal.
    `a,b` is untyped, and `kiln:a,b` matches the exact name `kiln:a,b`.

    Default JSON gives the literal `target`, sorted full names in `things`,
    sorted canonical directories in `stores`, and `fields` rows with `kind`,
    `field` and the sorted paths of their declaring `descriptions`. Arrays
    of names and the kind/field rows use UTF-16 order. The three `counts`
    are `things_not_read` as above, `values_not_typed` in the readable
    occurrence units of choice 36, and `fields_read` in distinct declared
    (kind, field) pairs, including kinds with no things. A field shared by
    several head kinds contributes occurrences only once per thing. Plain
    output gives the same lists and counts, including zeroes. An empty
    local group reads zero stores. A selection without reference declarations
    reads zero fields. Integrity diagnostics follow choice 36.

## Checked by

`rust/place/tests/lines.rs` signs every accepted record vector and requires
the model's `line` and `erased_line` byte for byte, then requires each changed
line to be refused by the check that covers the change. `rust/place/tests/dir.rs`
covers changesets, union in either order, purge with and without an eraser,
a torn last line, an altered segment, and the batch check's view of held
records (`of-not-root`, and `about` making no head). `rust/cli/tests/walk.rs`
drives the binary: emit, revise, fork, fold, erase; a labelled changeset and its
refusals; `of` filled in for a revision, `--of`, and `of-not-root` and
`prev-unrelated` against the store; `under-unknown`, and an erased and a
withheld `under` target held; `sets` on either path, empty included, and
kept on an erased and a withheld record; a latest-by that follows keys over a
keyed chain, a fork, an erased setter and a pure join; count, sum and collect
that follow keys over a head that sets only `title`, a fork and two setters of
one field; a mention making no head; two stores
converging; exit codes; an emit naming every live record of its thing held,
through the note's history, a whole-read emit above keyed ones, a fork merged
by export and import, an erased and a withheld live record, a root and a first
record; `about` copied, replaced by `--about` and emptied by `--no-about`, and
a moved task changing group; and a changeset that fills nothing in.
The filler test `occurred_requires_the_same_text_on_every_head` checks agreement.
The walks `occurred_is_copied_replaced_and_cleared`,
`disagreeing_heads_supply_no_occurred` and `an_erased_or_withheld_head_supplies_occurred`
check the stored envelopes and flag conflict.

The walk also replays a session: tasks and a decision with names, statuses and
messages, an update by `status=done` alone that keeps the name and message,
`sets` inferred and an emit naming no field written as a pure join, and one
`read --values` that shows each open item's name and status, equal without
the added members to `read` without `--values`. It shows a key with two live
setters from a fork merged by export and import, each with its value and
neither picked; an erased and a withheld live setter as unknown, and an
erased whole-read record as `unheld`; an undeclared payload key not shown, a
declared one missing as unset, and `--whole` replacing everything; usage
errors for `--whole` beside `--sets` or `--sets-nothing`; and grouped slots
with payloads inside each group. Over a store with one line changed in
place, and over one with a line cut from a segment, `read`, `fold`, `of`,
`get` and `export` write what a store holding only the remaining lines
answers, then exit 1 with `store-not-clean`; that store exits 0 with nothing
on stderr, `check` lists the line or the segment, and `emit` warns and writes.
`rust/place/tests/anchor.rs` writes 300 random emits as `loops emit` writes
them, one writer and then two that merge now and then, and requires each
history to be anchored (every record above a live record names it) and each
thing's live records, with their erasers, to answer every slot that follows
`keys` as the whole holding does. Expected answers come from the
vectors or from the walk's own statements, not from the code.

The setters walk checks the JSON and plain bytes of ordinary `of` and
the full setter rows and live records for a whole write, a keyed revision,
a fork, a pure join, an unset and an erasure. It checks both flag positions
and the plain live blocks. The describe walk checks `things_unset` in JSON
and plain for a kind with zero things, an absent field, an explicit unset,
an empty list and competing setters.

Not checked: nothing in the model says what a place is, so there is no law
behind the layout, and no second implementation reads it yet.

## First data

```sh
loops init
node design/rethink/ledger-drafts.mjs | loops emit -
```

writes the decision ledger as one signed changeset of 53 records, each a
root and so its own thing. It is not committed: the first store in this repo
should be signed by its owner's key, not a session's.
