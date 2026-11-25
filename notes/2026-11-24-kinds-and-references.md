# What a store says about its kinds, and references after an import: SD1 to SD4, AD5, BP1 and ST1

**Put to Kyle in `DECISIONS.md` on 2026-11-24 and ruled the same day: SD1 to SD4 and AD5 each as recommended, and BP1, near the end, row by row. ST1, the last section, records what followed from his principle for BP1: the strict shorthand, a mention declined and the import's AD5 work deferred. Where ST1 differs from an entry above it, ST1 is the ruling.** The entries are kept here as they were put, with the ruling at the head of each. "Recommended", "today", "yours" and "not built" in the text are as written then.
The ruling is recorded in [the changelog](../CHANGELOG.md) under 2026-11-24. The opening input was [the store descriptions note](2026-11-23-store-descriptions.md), whose section 3 also holds the form of `--in`, a store by name on every verb, which is built with these and needed no ruling.

## What a store says about its kinds

**Where these come from.** [The store descriptions note](2026-11-23-store-descriptions.md) gathered what the homelab conversion and a collector prototype asked for. Neon sketched a file from it on 2026-11-23. On 2026-11-24 the coordinator, Neon and margins-claude went through the sketch in a chat room kept in a store, and checked it against the six live homelab stores (6,482 things) and the prototype's store (1,994 items). Astra then reviewed the entries from outside, as put, and found a fault in each of SD2 and SD3; SD3's recommendation changed from A to C on it. The four now agree on every point below. Three points are yours: the form (SD1), the one place the CLI would decline a write (SD2), and a consequence for erasure (SD3).

None of the three changes the record format, rewrites an existing record, or changes a law, a vector, or what a fold or a tick answers, so W7 does not send them here. One thing does change: the same shorthand command writes a different `of`, and so a record with another id, depending on the file. They are here because standing (step 3) will grow from whatever is chosen now.

"Today" below is the `loops` binary built from main on 2026-11-24. Every "today" answer was run.

## SD1: a store describes its kinds in a file and enforces nothing

**Ruled by Kyle, 2026-11-24: A.** A plain `.loops/store.json` now, with the six boundary points; records at step 3.

**Question.** Does a store carry a description of its kinds that the CLI uses for shorthand and defaults, that no read depends on, and that refuses nothing? And is it a plain file now, or records from the first day?

**Example.** The description of the homelab coordination store, holding only what that store's records bear out:

```json
{
  "version": 1,
  "note": "Operational coordination for the homelab: what was learned operating it.",
  "kinds": {
    "deploy": {
      "note": "Rollouts: releases, host changes, migrations.",
      "key": "name",
      "key_format": "<slug>-<YYYY-MM-DD>",
      "preview": ["name", "service", "message"]
    },
    "decision": {
      "note": "Operational stances, revisable when context changes.",
      "key": "topic",
      "preview": ["topic", "message"]
    },
    "thread": {
      "note": "Open questions and design conversations in flight.",
      "key": "name",
      "lifecycle": { "field": "status", "closed": ["closed", "resolved", "done", "passed"], "active": ["open"] }
    },
    "task": {
      "note": "One implementation slice.",
      "key": "name",
      "key_format": "<arc>/<slice>",
      "refs": { "source": ["decision"] },
      "lifecycle": { "field": "status", "closed": ["done", "dropped"], "active": ["open", "in-progress"] }
    },
    "seal": { "note": "Session wrap markers.", "key": null }
  }
}
```

A kind may state eight keys. What each one does:

| Key | Today | With the file |
| --- | --- | --- |
| `key` | Every write states its key twice: `emit deploy --of deploy:<slug> name=<slug>`. | `emit deploy name=<slug>` fills in `--of deploy:<slug>`. The record is the same one: `of` is still written in full. |
| `headline` | `loops ls decision: --plain` shows "—" for all 189 decisions. The headline is read from `name`, and decisions are keyed by `topic`. | The plain views show the key field, or the field `headline` names. |
| `lifecycle` | The session hook hides closed threads with a status list copied into a jq filter. | `loops ls thread: --active` hides the 57 threads whose status is in `closed` and shows the other 68. |
| `preview` | `--fields a,b,c` on every call. | The default columns of `ls <kind>: --plain`. |
| `refs` | A reference is stated twice, as a field and as `--about`. | See [SD3](#sd3-reference-fields-copied-into-about-and-erasure). |
| `note`, `key_format`, `search` | A table in the repository's CLAUDE.md, copied by hand from the old vertices. | Printed by `loops describe`. They drive nothing. |

**Why `closed` does the hiding, and not `active`.** If `--active` showed only the statuses listed in `active`, 7 of the 125 threads would vanish from it (4 with no status, 2 `parked`, 1 `closed-bedrock-deferred`), and 6 of the 18 tasks (5 `built`, 1 `complete`). With `closed`, a thing with a missing, conflicting or undeclared status stays in view. `active` is kept as documentation. `--active` takes a prefix that names one kind, and that kind must declare a lifecycle; otherwise it is a usage error.

**The boundary.** All four agree on these. The tests they name are for the build to pass; today's binary cannot show them.

1. A reader of records never needs the file. `of` and `about` are written in full in every record.
2. With no flag that names the description, the JSON of every read is byte for byte the same with and without the file. That is a test in the suite, not a sentence. `--active` is the one such flag, and its output states the field and the list it applied, so two copies of a store that answer differently say why.
3. `headline` and `preview` change `--plain` output only.
4. With no file, every command behaves as it does today. A file that does not parse, or that holds a key this version does not know, stops the commands that would have used it and names the file: shorthand `emit`, the plain views, `--active` and `describe`. Reads in JSON go on working, so a broken file never locks a store.
5. `emit -`, `emit - --fill` and `tick` never read the file. A collector's or an import's records cannot change because the file was edited. If shorthand ever reaches a batch, that batch pins the file's hash, as the import's journal pins its flags.
6. `loops describe` prints the description, then how the store fits it. For each kind: things whose key field differs from their key, keyless roots of a keyed kind, lifecycle values in neither list, and reference values that no mention carries. It changes nothing. It is where drift shows. The last count is not a fault to repair: a reference may be left out of `about` on purpose.

**Options.**

| | The description is | Cost |
| --- | --- | --- |
| **A (recommended)** | A plain file, `.loops/store.json`, beside `.loops/vertices/`. At step 3, `loops apply` compares the file with the store's declarations and emits one record, as the rethink has it. The expectation is that these keys carry over and `fields`, `writers` and the rest come in beside them. That is step 3's to settle, not promised here. | The file is not signed, has no history, and does not travel with `export`. Two copies of a store can describe themselves differently until step 3. Point 2 is what makes that bearable: nothing a spec answers depends on it. |
| B | Records from the first day, of a reserved kind. Signed, with a history, and they travel with the store. | A reserved kind and its rules, before standing has ruled on any. Step 3 keeps or converts whatever is written now. |
| C | Nothing until step 3. | The key table in CLAUDE.md, the status lists in jq and the doubled key all stay, and the next real import happens without a description. |

**What changes for you.** Under A, one file for each store, written once from the old vertices and the CLAUDE.md table. Nothing is refused for departing from it, except as SD2 asks.

## SD2: a write that contradicts the declared key

**Ruled by Kyle, 2026-11-24: A.** `emit` stops before it signs, and names the way out.

**Question.** Once a kind declares its key field, `emit` can see two slips. Does it stop, or warn and write?

**Example, run on today's binary** in a scratch store. `deploy` is keyed by `name`.

```
$ loops emit deploy --of deploy:authentik-2026-11-24 name=authentik-2026-11-23 service=authentik "Authentik to 2026.10"
r:t6rrbeb2…                                             exit 0
$ loops emit deploy service=authentik "rolled back"
r:51lrf6e6…                                             exit 0
$ loops ls --things --plain
THING                        HEAD KINDS  RECORDS  HEADS  HEADLINE
deploy:authentik-2026-11-24  deploy      1        1      authentik-2026-11-23
r:51lrf6e6                   deploy      1        1      —
```

The first is a deploy whose name says one day and whose key says another. The second is a deploy with no key, which `ls deploy:` does not list. Both are signed and permanent.

The live homelab stores hold 37 keyless roots of keyed kinds, each a slip of the second sort. The first sort has not happened yet: in all 6,437 keyed things the key field equals the key, because the old tool derived one from the other.

**Options.**

| | `emit` | Cost |
| --- | --- | --- |
| **A (recommended)** | Stops before anything is signed. The message says what is wrong and names the way out. For a missing key: state the key field or `--of`, or `--root` for a keyless root that is meant. For a key field that disagrees with `--of`: make them agree. | The first time `loops` declines a one-record write that a store would accept. |
| B | Warns on standard error and writes, as the sketch first had it. | The warning arrives after the record. Taking the slip back means an erasure, or living with a second thing. An agent's script seldom reads standard error. |
| C | Checks nothing, as today. | The 37 become more. |

**Why A keeps "nothing is refused".** The store refuses nothing. A keyless root can still be written with `--root`, and a record whose key field is meant to differ from its key through `emit -`. A is the shorthand declining to guess. It is spelled as a usage error, with no new refusal code.

**What A leaves alone.** A revision of an existing keyless root (`--of r:<id>`). `emit -` and `--fill`. A kind with no declared key, or with `"key": null`.

**A revision by `--prev`.** A revision that states `--prev` and no `--of` is of what it replaces, so it is not a missing key. A key field stated on it is still compared with that thing's key. Today it is not: after `emit deploy --of deploy:prev-case name=prev-case`, the command `emit deploy --prev <id> name=different` leaves `deploy:prev-case` with the name `different` (found by Astra, run again by the coordinator).

## SD3: reference fields copied into `about`, and erasure

**Ruled by Kyle, 2026-11-24: C.** Reference fields are described and nothing is copied into `about`. `--add-about` and `--drop-about` come with it.

**Question.** A kind's `refs` lists its reference fields. Does `emit` copy their values into `about`, so that a fold by mention finds the record? The copy lives in the envelope, and an erasure removes only the payload.

**Example, run on today's binary.** Under the sketch, `emit asset name=laptop/t14-0193 owner=person:dana-whitfield` would write the first record below. Written by hand, then erased:

```
$ loops emit asset --of asset:laptop/t14-0193 name=laptop/t14-0193 owner=person:dana-whitfield \
    --about person:dana-whitfield "ThinkPad T14, issued 2026-11"
r:fakp4mg3…
$ loops erase r:fakp4mg3… "the owner should not have been written here"
$ loops of asset:laptop/t14-0193 --plain
other fields  unknown
about  person:dana-whitfield
$ loops export --about person:dana-whitfield
(the record's envelope, with "about":["person:dana-whitfield"])
```

The payload is gone and the name is not. A stated `--about` and an `of` already behave this way. What copying would add is that a file moves a payload value into the envelope, and the writer never typed `--about`. You ruled on 2026-11-10 that erasure is the emergency stop for something that should not have been emitted.

**Why the recommendation is C.** The entry was first put with A recommended, and a rule for dropping an old copy when a field moves. Astra found a history where that rule fails. One asset, with `runs_on` declared a reference:

```
R    sets runs_on=asset:vm/a                        about: asset:vm/a
H1   revises R, moves runs_on to asset:vm/b         about: asset:vm/b
H2   revises R beside H1, sets only status          about: asset:vm/a
     R is erased
J    joins H1 and H2, moves runs_on to asset:vm/c   about: ?
```

The field reads `asset:vm/c`. H2 still carries `asset:vm/a`. Whether that mention was copied from the field or stated by hand was recorded only in R's payload, and R is erased. A rule that keeps it leaves an old target in J and in every later envelope. A rule that drops it also drops mentions a writer stated by hand. Astra ran the history on today's binary, stating by hand the mentions the rule would have written.

This is the general case and not one missed corner. Nothing but the payload records where a mention came from, and an erasure removes the payload. The rule was rewritten four times on 2026-11-24, each time after another reader found a history it failed. What was shown: a copy never misses a readable live value (margins-claude's Python reader, 22,925 holdings with forks and late erasures). What was not: that a move removes the old copy. margins-claude then checked that too. Without an erasure it does: the rule worked out per head left no old copy in 425 things at one head. After an erasure it does not: Astra's history fails, and with the stop taken at its best an old copy stays in 48 of 388 things at one head. So the trouble is in erasure, not in forks.

**Options.**

| | `emit` | Cost |
| --- | --- | --- |
| A | Copies every `kind:key` value of a declared reference field into `about`, and drops the old copy on a move where it can tell. | A name in a declared field cannot be erased. After an erasure or across a fork an old target can stay in every later envelope. It amends a sentence you ruled on 2026-11-14 ([the changelog](../CHANGELOG.md), the writer): `--about` would state only the writer's own mentions, no longer the whole `about`. |
| B | As A, but only for a field that asks for it. Every other reference field is only described. | A's costs for the fields that ask. If copying is ever taken, all four prefer this to A: a field such as `owner` is then described as a reference and stays erasable. |
| **C (recommended)** | Copies nothing in v1. `refs` describes: `loops describe` prints it, a reader that cares about roles finds a kind's reference fields from it, and `describe` counts the `kind:key` values that no mention carries. `--about` is stated by hand, as today. | The write keeps its doubled reference: `rel=relationship:<agent> --about relationship:<agent>`. A fold by mention finds only what a writer stated. |

**What C does not lose today.** The question "what runs on this VM" is already answered by the field. Run on today's binary, with three services of which two run on `asset:vm/media`: a fold with `"where": {"runs_on": {"is": "asset:vm/media"}}` under `"follow": "keys"` lists the two. After the record of one is erased it lists the other and says "1 not read: needed payload or field unavailable", which is what an erasure should do. What a mention adds is one fold of everything that mentions a thing, across kinds and fields.

And every reference value in the live stores is still in the imported `kind/key` form: in the four kinds sampled, 566 `runs_on` records in the audit store, 121 `source` records on tasks and 92 `rel` records on observations. Copying would have done nothing for them until a value was rewritten.

**What comes with C.** `--add-about` and `--drop-about` ([the note](2026-11-23-store-descriptions.md#4-who-wrote-it-and-the---about-hazard), section 4), which are CLI only and need no ruling. They keep a hand mention through later revisions.

**When copying comes back.** As its own entry, once a reader needs what the field cannot give: one fold of everything that mentions a thing, across kinds. It would be for each field that asks (B), and it would come with a check that a move removes the old copy, not only that a copy never misses.

## After the import: reading and writing references

**Where these come from.** On 2026-11-24, after SD1 to SD3 were put, Kyle trialled the import on a second, private group of stores. Nothing from it is quoted here. It showed what the homelab had hidden. The import gives a mention to each reference the old tool recorded with an id, and after it nothing keeps the mentions in step with the fields: under SD3's option C a new or changed reference adds no mention, and a move leaves the old one. The same four went through that in the room. Two questions came out. SD4 is a read. AD5 changes what the import writes, and the homelab would be imported afresh.

One thing needs no ruling and is built in the same pass, at your word: a store found by name on every verb, spelled `--in <name>` ([the note](2026-11-23-store-descriptions.md#3-a-store-found-by-name-on-every-verb), section 3, with what the room settled). In the private group a large share of references name a thing held in another store of the group, so a read by reference and `describe` both have to read the group.

## SD4: a read of everything that refers to a thing

**Ruled by Kyle, 2026-11-24: A.** `loops ls --refers-to`, answering as written under "What A answers, exactly".

**Question.** Under SD3's option C nothing copies a reference into `about`. How does a reader then ask "what refers to this thing", across kinds and fields?

**Example, run on today's binary** in a scratch store. A service is written with its mention, then moved without one:

```
$ loops emit service --of service:jellyfin name=jellyfin runs_on=asset:vm/media --about asset:vm/media "media server"
$ loops emit service --of service:jellyfin runs_on=asset:vm/apps "moved to the apps VM"
$ loops export --about asset:vm/apps | wc -l
0
$ loops export --about asset:vm/media | wc -l
2
$ loops fold on-apps.json --plain          (where runs_on is asset:vm/apps, follow keys)
  thing  service:jellyfin  jellyfin
```

The mention still says the media VM, because a write with no `--about` copies the heads' mentions (your ruling of 2026-11-14). The field says the apps VM, and the fold on the field is right. This is not SD3's doing; it is true today.

The import mentions every reference that the old tool recorded with an id: in the six homelab stores, all 8,177 such live values. It does not mention 9 written in full without one, or the 434 bare keys of AD5's row 2 (margins-claude). After the cutover a revision inherits its thing's mentions, as the example shows. What fails is the change: a new or changed reference does not add its target unless the writer types it, and a move does not remove the old one unless the writer drops it. The homelab has reference fields in a handful of kinds. The private group has them in many more.

**Options.**

| | A reader asks | Cost |
| --- | --- | --- |
| **A (recommended)** | `loops ls --refers-to <thing>` (the spelling is open). It takes each kind's reference fields from `refs` in the description, and asks of each the test a fold's `where` asks with `is`. It lists the things for which a field answers yes. | The answer depends on the file: a field that is not declared is not read. So the output states the stores read, the fields read for each kind, and three counts beside the list. |
| B | Nothing new. A fold on the field, one spec for each kind and field, as today. | No one read across kinds. Each reader keeps its own list of reference fields. |
| C | Copying comes back for the fields that ask (SD3's option B). | SD3's costs, for those fields. |

**What A answers, exactly.** These were settled by histories Astra ran on today's binary (15 of them), and they are [the spec](../protocol/spec.md) as written, not a new rule.

- **Each field answers yes, no or unknown,** as `where` does. Every live setter of the field is asked whether it holds the target. Yes when all say yes. No when all say no, or when no record sets the field. Unknown when their answers differ, or when a live setter is erased or withheld. Setters may hold different values and still agree: the lists `[a, b]` and `[a]` both say yes for `a` and no for `c`, and only `b` is unknown. Run on today's binary: one service, `runs_on` moved by two writers apart, to `asset:vm/a` and to `asset:vm/b`. A fold with `is asset:vm/a` lists nothing and says "1 not read", and so does `is asset:vm/b`. `--refers-to` says the same: it does not list a thing because one setter holds the target.
- **Across a kind's fields: any yes lists the thing.** Otherwise any unknown counts it once as not read. Otherwise it is not listed.
- **The value is matched as written:** the whole text equal to `kind:key`, or an immediate member of a list. No comma text is split, and no kind is guessed for a bare key. A thing that names itself is found like any other.
- **Across stores, the records are put together first,** and read after. Read store by store, a thing whose later record is in another store would keep its old target.
- **Three counts go with the list:** things not read; values in the fields read that are not written `kind:key`; and the fields read. A "no" is only as good as these. In the homelab 491 live values in the five fields of AD5's row 2 are a bare key that names an imported thing, and all of them would answer no.

**What A does not change.** No record, fold, tick or law. `about` stays what writers state. The two then have separate jobs: a reference field is live, has a role, and can be erased; a mention is permanent and has no role.

**In `describe`.** A reference's target is counted as held here, held in the group, or not in the group. None of these is a fault. "Not typed" is about the form alone: a readable value that is not written `kind:key`. `asset:missing` is typed, whether or not anything holds that thing. A value that could not be read is counted apart from both.

**One choice inside A.** When two stores of a group describe the same kind with different `refs`, A reads the union of the fields. Adding a store can then make a field in another store take part, so the output says which description named each field.

## AD5: one written form for a reference, set at the import

**Ruled by Kyle, 2026-11-24: all three rows as recommended,** the mention in row 2 included, within the six bounds. The homelab is imported afresh.

**Question.** The import keeps a reference field as the old tool wrote it, `runs_on: asset/vm/media`. Everything written since uses `asset:vm/media`: `of`, `about`, and the field form you ruled in E1. Does the import write the one form?

**Example, run on today's binary** on the live audit store, where 58 things run on the media VM:

```
$ loops fold on-media.json --plain         (where runs_on is asset:vm/media)
q  —
$ loops fold on-media-old.json --plain     (where runs_on is asset/vm/media)
(58 things listed)
```

A reader has to know to ask in the old form. Every reference value kept with a twin is in it: 13,854 facts in the six stores, none in the new form. The old form cannot be read back reliably: 5,186 of the 6,438 named things have a slash in their key, so `asset/vm/media` is `asset:vm/media` only by a rule that the first slash ends the kind. Neon confirms it was never kept on purpose. The private group is already in the new form throughout.

The old tool wrote the proof beside each value. `runs_on_ref` held the id of the fact referred to, and the import already resolves that id to a thing. In all 13,854 facts the field names the thing its twin resolves to, as the whole value, byte for byte (counted separately by Neon and by margins-claude).

**The three rows.**

| Row | Question | Recommended | The other way |
| --- | --- | --- | --- |
| 1 | A field whose twin resolves to the thing the field names | **The import writes the thing's name, `kind:key`.** Where they disagree it changes nothing and counts it. It never reads a slash as a separator. | (b) One revision for each thing after the import: no ruling needed, but the script becomes the live setter of every such field, and history keeps both forms. (c) Leave it: a reader asks for the stored old spelling by hand, SD4 finds none of these values, and they are revised later or never. |
| 2 | Five fields that hold a bare key, written without a twin by a slip in the old tool: a thread's `run` and `gap`, a finding's `run`, a baseline's `gap` and `finding` | **The group's map names the target kind for each of the five. Where that thing was imported, the import writes `kind:key` in the field and mentions the thing, as it does for a reference with a twin.** 586 values in old facts are written so. The 75 that name nothing imported stay as they are and are counted. | (b) By hand, one revision for each of the 454 things whose current value is such a key (margins-claude). (c) Leave them: SD4 answers no for them, no mention finds 434 of them, and `describe` counts them as not typed. |
| 3 | A field whose twin holds several ids, written as comma text | **A list**, `["asset:a","asset:b"]`, where the encoding has been reviewed and every part agrees, in the order written. | Comma text stays. `is asset:a` then never matches it, today and under SD4. |

Row 3 has no case in the homelab: outside `ref`, which AD4 took out, every twin beside its field holds one id. It matters for the private group. It also changes an answer, which is why it is a row of its own: today `is` matches comma text only as a whole, and matches a list by member ([PV4](2026-11-21-payload-values.md#pv4-a-list-reads-as-a-set-under-is-and-not)). All four recommend the list, as E1 has it for a set one observer states. Under SD4's exact match, comma text with several targets can answer yes for none of them (margins-claude).

In row 2 a run's own `run` field (247 values, each naming its own thing) is left out of this repair: it is the kind's key written a second time. That is a choice about this one field. A thing may refer to itself, and SD4 reads such a value.

**Row 2 asks for two things, and you may take the first alone.** Writing `kind:key` in the field is the repair. Mentioning the target as well is a second choice, and a permanent one: the mention stays when the payload that gave it is erased. With the field alone, SD4 finds the value and a read by mention gains nothing from the repair; no mention already there is removed. The mention is recommended so that the import treats a repaired reference as AD4 treats one with a twin. It is a choice about this import only. It does not turn on copying for later writes, which stays as SD3 rules it.

**The bounds, all Astra's, agreed by the four.** Field and twin agreeing is needed and is not enough.

1. **Never a kind's key field.** A `name` with a `name_ref` beside it would become a different key, and the import would have renamed a thing. The homelab has no such pair.
2. **Decided from the fact's own field and twin,** before anything is cleaned, with the group's rules for a target that is ambiguous or left out. A field is rewritten whole or not at all, and each field left alone is counted with its reason.
3. **The whole value is compared** with the resolved thing's name. A key may hold a comma, so nothing is split to find a single target.
4. **A list only by row 3.**
5. **A bare key only by row 2,** for a kind and field the map names. That a thing of that name exists is not proof: `provider=cloud` may be prose.
6. **The same rewrite in the check and in the write,** pinned in the journal under a new version. It goes into fresh stores only. A store imported before does not take it on.

**What it costs.** The six homelab stores are imported afresh, and every imported record gets a new id and a new observer key, in stores with no reference field too: a fresh import signs with one new key for the group and a new salt for each old fact. The six are cut over, so it is a second cutover: the fresh stores take the place of the live ones, which are kept aside as the first import's were. One record has been written across the six since the import, and it is written again by hand, with its `prev` taken from the new ids. This is what [the adoption note](2026-11-22-adoption.md) said a later change would cost, and today is the cheap day for it. It amends AD2, under which the import keeps every payload untouched. AD4 made the first exception when it took out `ref` and the twins.

**The rows are ruled each on its own.** If you rule against row 1, row 1 rewrites nothing, and rows 2 and 3 still stand or fall by your ruling on each. SD4 still matches `kind:key` exactly, finds none of the old values, and reports them in its count of values not typed. Reading both forms would be a different read from a fold's, and is not proposed.

## BP1: nine narrow cases the build plan found open

**Ruled by Kyle, 2026-11-24,** on one principle: accept strictly what was entered, and do not infer or work round a likely error. Rows 1, 2, 3, 4, 6, 7, 8 and 9 as recommended. **Row 5 the other way:** a bare key beside a resolving twin is left as entered and counted; the two fields of the private group that hold such values are to be corrected in the old store before it is exported. **Row 8b the other way:** the mention is cleared, so the import mentions only what it repaired; a proper reference in the field is found by `ls --refers-to` and needs no mention. Row 6 with the option: a comma, and a comma with one space where the map reviews it for a field.

**Where this comes from.** You ruled SD1 to SD4 and AD5 on 2026-11-24. A Codex worker then wrote the build plan, and listed the cases your rulings do not settle that change a signed record or its id. There are eight, and the coordinator adds one (row 5). Neon, margins-claude and Astra read them from outside, and what they changed is in the rows. None adds a refusal code. Each row can be ruled on its own.

Pieces 1 and 2 of the build (a store by name, and the description file) wait on none of these. Rows 1 to 3 hold up the `emit` shorthand, row 4 the mention flags, rows 5 to 9 the import.

**Run on today's binary** in a scratch store, for the rows that can be shown before the build:

```
$ loops emit kiln name=east name=west
refused: member-duplicate                         exit 1
$ loops emit kiln name:=7 "a number where the key goes"
r:c0p91bic…                                       exit 0
$ loops emit kiln name= "an empty key"
r:sdqla6cq…                                       exit 0
$ loops emit backups --of yard:east name=east "kind and prefix differ"
r:omap89lt…                                       exit 0
$ loops fold kilns-is-a.json --plain              (where kilns is kiln:a, follow keys)
  thing  yard:south                               (kilns is the list ["kiln:a","kiln:b"])
                                                  (yard:north, kilns "kiln:a,kiln:b", is not listed)
```

**The rows.** `kiln` declares `"key": "name"` in rows 1 to 3.

| Row | The case | Recommended | The other way, and its cost |
| --- | --- | --- | --- |
| 1 | The kind and the thing's prefix differ: `emit backups --of yard:east name=east`, where `backups` is keyed by `name` | **Compare the key text only:** `east` with `east`. The record format lets a record's kind differ from its thing's prefix. | Require `backups:east`. A write that is valid today, and whose key agrees, stops. |
| 2 | A key that is not text: `emit kiln name:=7`, or `name=` | **Stop as a usage error,** when a key is being found from the field or compared with it. Nothing is turned into text. A repeated `name` stays the refusal it is today, `member-duplicate`. A keyless root that is meant, and a revision of one, keep whatever payload they are given: `emit kiln --root name:=7` writes. (The last two sentences are Astra's.) | Turn `7` into `"7"`: the writer gets a thing named `kiln:7` they did not ask for. |
| 3 | A root that is meant, with the key field stated: `emit kiln --root name=east` | **A root, with `name` kept in its payload.** `--root` with `--of` or `--prev` is a usage error. | Refuse the field: the writer then needs `emit -` to keep a field on a root. |
| 4 | `--add-about yard:east --drop-about yard:east` on one command | **A usage error.** | Last one wins: changing the order of two flags changes a signed record. |
| 5 | AD5 row 1, where the field holds the bare key and its twin resolves: `owner=potter` beside an `owner_ref` that resolves to `person:potter` | **Written `person:potter`,** when the whole value equals the whole key of the one thing the twin resolves to, byte for byte, and is not itself already written `kind:key`. The twin is the proof, a stronger one than row 2's line in the map. `owner=person:potter` beside a twin that resolves to `person:person:potter` is left and counted: it already names something (Astra). This widens AD5's bound 5, "a bare key only by row 2", for this one proved case. It adds no bare items to row 6's lists, and a twin that fails is never made up for by the map. The plan compares only with `person/potter` and `person:potter`, and would leave `potter`. (The coordinator's row, from the private group, which has such values. The homelab has none: every agreeing value there is `kind/key`.) | Leave it: SD4 answers no for it, though the old store recorded exactly what it refers to. |
| 6 | AD5 row 3, how the several targets must be written to become a list | **A literal comma between items, nothing trimmed,** each item exactly the old or the new spelling of its resolved target, in the twin's order, repeats kept. **The map may also review, for a field, a comma followed by one space.** Anything else, and anything that can be read two ways, is left whole and counted. A comma inside a key is data. An item is the old or the new spelling only, never a bare key. | The comma alone: a field written `kiln:a, kiln:b` stays text, and SD4 answers no for both targets for good. All three reviewers prefer the option. |
| 7 | AD5 row 2 on a value already written `kind:key`: `site=yard:east` in a field the map says holds a bare key of kind `yard` | **Left as written.** Only text that is not already `kind:key` is taken for a bare key. | Prefix every value: `yard:yard:east`. |
| 8 | AD5 row 2's mention, through a thing's later facts: `site=east`, then `site=missing`, then no `site` | **One mention for each field, replaced by each later fact that states the field:** the new target where it resolves, none where it does not; kept where the fact does not state the field. No mention of the thing itself, as AD4 has it. | Mentions that only gather: a target the field left stays mentioned. |
| 8b | The same, where the later fact is already typed: `site=east`, then `site=yard:east` | **The mention is kept: a typed value that names an imported thing of the kind the map states gives its mention.** Otherwise the same field is mentioned or not by how an earlier fact happened to spell it. (margins-claude's view and the coordinator's.) | Clear it, as the plan has it: row 2 then mentions only what it repaired, and nothing beyond what you ruled. The field still names `yard:east` and no mention finds it. (Astra leans this way.) |
| 9 | A twin that resolves to a keyless root, or sits beside the `ref` AD4 takes out | **AD4's mention as today, and no rewrite of the field.** A root has no `kind:key` to write. | Write `r:<id>` into the field: more payloads and ids change, for a form no writer uses. |

**No homelab case** for rows 5, 7, 8b and 9 (margins-claude): no slip-field value holds a colon, no twin resolves to a keyless root, and every agreeing value is in the old `kind/key` form. They matter for a group imported later.

**One sentence of SD1 is out of date,** and needs no ruling. It called `--active` the one flag whose JSON depends on the description. `--refers-to` (SD4) is a second. The test covers every read without either flag.

## ST1: the shorthand is strict, and the description says what it allows

**Ruled by Kyle, 2026-11-24, in direction; the lines below were settled by the coordinator, Neon, margins-claude and Astra in the room, and he was told them.** It was never an entry in `DECISIONS.md`: it came out of his rulings on BP1. The stops below reject a write and never rewrite one: each is a usage error before anything is signed, and none adds a refusal code or changes what a fold answers. Two things here do change what is produced: the mention declined in AD5's row 2 changes what a later import would sign, and `describe` gains a count.

**The principle, in his words.** "We're strictly accepting what gets entered - not trying to infer or work around potential error." And: "I generally would prefer, going forward, to be strictly explicit if possible." His concern was that the build was conforming to stores built up iteratively under the old tool, where there was a chance to remove ambiguity. He qualified it: the writers are mostly agents, so their ergonomics come before the principle where the two pull apart. He expects to rebuild many stores from first principles and pick from the originals later.

**What it changed in the rulings above.**

- **AD5 row 2's mention is declined.** The import, when it is built, writes `kind:key` in the five slip fields and adds nothing to `about`. BP1's rows 8 and 8b then decide nothing. AD4's own mentions stay as they are. His reason: where the field holds a proper reference, `ls --refers-to` finds it.
- **AD5's build is deferred, and the homelab is not cut over a second time.** Pieces 9 and 10 of the plan wait until a store is picked from by its reference fields; then they are built into a fresh group that is not cut over. The plumbing (piece 8) and today's importer stay. A cutover would give every record a new id, a rebuild would replace that history again, and whatever cites a homelab id would break twice (margins-claude). margins-claude asks that row 2, the one place the import takes a kind from a hand-written map, be put to him again before it is built.

**The shorthand's stops.** `emit -`, `emit - --fill`, `tick` and the store itself refuse nothing, as before. Each message says what was typed, what the description allows, and the way out.

1. **A kind the description does not name stops.** With a `.loops/store.json` present, `emit <kind>` for a kind not under `kinds` is a usage error. The check is on the kind emitted, also with `--of`, `--prev` and `--root`. A kind declared as `{}` is named. With no file, as today. This amends SD2's "what A leaves alone".
2. **A lifecycle value in neither list stops.** Where the kind declares `lifecycle` and the write states that field, the value must be text equal to a member of `closed` or `active`. A field left out, or unset with `--sets`, passes. So `active` now does something.
3. **A reference field takes only references.** Where the kind declares the field under `refs` and the write states it, the value is one reference or a flat list of them. `[]` passes, and refers to nothing: the field is still written, so `present` holds and SD4 answers no. A reference is text that the record format accepts as a thing's name, with a prefix in the field's list, or any prefix where the list is empty. `null`, a nested list or a member that is not text stops. The target need not exist; the prefix is read from the text alone.
4. **A record id in a reference field** (`r:<id>`) passes only where the field's list is empty. A root's name carries no kind to check.
5. **A comma stops, in a reference and in the key field.** `owner=asset:a,asset:b` is one valid name, of a thing whose key is `a,asset:b`, and nobody means that. The shorthand declines it and shows the list form: `owners:=["asset:a","asset:b"]`. It stops `emit kiln name=a,b` too, since that is how an agent would make a thing the shorthand then cannot refer to. This is a rule of the shorthand alone: a comma stays legal in a thing's name, `of`, `about` and SD4 do not move, and `emit -` writes such a name. It does not promise that the shorthand can never make such a thing: `emit kiln --of kiln:a,b` still does (Astra).
6. **`--root` skips only the key's checks.** For a root that is meant, and for a revision of an existing keyless root, the key field is not checked as a key. The stops on the kind, the lifecycle value and the reference fields still apply to it.

**The description file.** Version 1 is amended in place; no binary that reads the file had been installed anywhere.

7. `key_format` and `search` leave the grammar. Nothing read them. A kind's naming guidance goes in its `note`, where an agent reading `describe` finds it.
8. A `lifecycle` gives at least one value in `closed` or `active`, and none in both.
9. Each kind in a `refs` list is a kind prefix, and not `r`.
10. With a description file present, a plain headline comes only from a described head kind's `headline` or text `key`. A head kind the file does not describe, or heads that disagree, show none. With no file, `name` as before. JSON `ls` keeps its `headline`.

**`describe`.**

11. One more count for each reference field: typed values whose prefix the field's list does not name. With an empty list it is zero. It filters nothing, and SD4's match does not read it.

**Not taken, by agreement of the four:** required fields, a check that a target exists, refusing a payload field the description does not name, and a second list encoding for new writes. These belong to standing, or would burden an agent's ordinary write.

*Amended on 2026-11-25:* a field that every shorthand write of a kind must state was taken, as `every_write`, once a store's owner asked for it. It is a stop in the shorthand and not standing. The record is in [the changelog](../CHANGELOG.md#kyle-rules-two-stops-in-the-shorthand-and-they-are-built).

**A cost, stated.** A list is clumsy in the shorthand: `field:='["asset:a","asset:b"]'`, with the shell's quoting. A repeatable field, or a reference field declared to hold many, could come later; either would be explicit.

**Left for another day** (found in the same look, and not part of this): imported records carry the old tool's `message` where a new write's trailing message goes to `text`; and a trailing message that holds `=` is taken as a field.
