# Changelog

What was built and what Kyle ruled, newest first, by date.
What is next is in [ROADMAP.md](ROADMAP.md). What waits on Kyle is in [DECISIONS.md](DECISIONS.md). The long design notes are in [notes/](notes/).

Each date starts with a short list. Under it is the record as it was written at the time, moved here from `ROADMAP.md` on 2026-11-21 and changed only where a sentence pointed at a place in that file.
Since Kyle's ruling of 2026-11-21 (W7), only a choice that changes a record's bytes or id, a result's bytes or hash, a refusal code, or what a spec answers comes to him, through [DECISIONS.md](DECISIONS.md). Every other implementer choice is written here and stands unless he objects.
The record starts where the old roadmap's did. For anything earlier, and for every merge, see `git log`.

## 2026-11-24

In brief:
- **A walk of identity, standing and sharing is written, at Kyle's request:** identity through three scenes, then the thinnest slice through standing and sharing, then stewardship and the case of two stewards, ending in twenty-one draft entries. Nothing is put or ruled.
- **The first outside contribution:** the import's exporter reads an old kind whose fold has several named slots, as the old tool does. John Spann wrote it, from a pilot of his own.
- Built: `--in <name>`, a store by name on every verb that takes one; `.loops/store.json` read and used by the plain views; `ls --active`; `loops describe` and `ls --refers-to`, with `--group`; and the import's recipe for a payload, with no change to what it writes.
- **Kyle rules the strict shorthand:** with a description, `emit` stops on a kind, a status or a reference the description does not allow. He declines the mention in AD5's row 2 and defers the import's AD5 work; the homelab is not cut over a second time.
- **Kyle rules BP1:** what was entered is accepted strictly; two rows go the other way from the recommendation.
- The build of the rulings is planned and begun, and BP1 is put to Kyle: nine narrow cases the plan found open, each with a recommendation.
- **Kyle rules SD1 to SD4 and AD5, each as recommended.** A store describes its kinds in a plain file that refuses nothing; `emit` stops on a key slip; reference fields are described and not copied into `about`; `ls --refers-to` reads them; the import writes a reference as `kind:key`, and the homelab will be imported afresh. Nothing is built yet.
- SD1 to SD3 are put to Kyle: what a store says about its kinds. A plain `.loops/store.json` that describes each kind and refuses nothing (SD1); `emit` stopping before it signs a write that contradicts a declared key (SD2); and whether reference fields are copied into `about`, where an erasure does not reach them (SD3: recommended, describe them and copy nothing). Nothing is built.
- SD4 and AD5 are put to Kyle, later the same day: a read of everything that refers to a thing, taken from the declared reference fields (SD4); and the import writing a reference field as `kind:key` where the old store proves it, which means importing the homelab afresh (AD5). Nothing is built.

### The walk of identity, standing and sharing

Kyle and Neon worked out a plan on the evening of 2026-11-24 that puts identity and names first among the next steps. Kyle asked this session for a walk before anything is built. It is [the identity walk](notes/2026-11-24-identity-walk.md).

- **Three scenes:** one person with several agents on one machine; a small team sharing a store through a git host; and someone outside the project.
- **What it found.** Keys and names say which keys are one writer, and say nothing about on whose word a record was written, which is the question a workflow run through agents raises. On a machine where an agent runs as the person, the person's signature means no more than the agent's. The one change to what a spec answers is the reader's rule for a record whose key does not speak for its observer. Shared name tables need a steward and can wait. A store with several writers before retiring exists rests on the git host as the boundary, which nobody has ruled.
- **Eight draft entries, ID1 to ID8,** each with a leaning. None is put to Kyle. `DECISIONS.md` lists the walk under "Being prepared".
- **Run for it, on the binary from main:** two keys writing one thing, and the plain view naming neither; a write as a lineage refused (`observer-unbound`); a tick by one key over a record another key wrote, which checks `same`.
- **Part two, the same evening.** Kyle read part one and said identity cannot be settled alone. He gave the direction for a second part: anybody can emit; records travel as git objects, without pull requests; standing decides what is canonical, and a director or a lead has more of it than a junior developer; git is presumed for now and will not be the only storage.
- **What part two found.** "More standing" holds as being counted for more kinds and being able to accept a proposal, and breaks as a rank. Standing is a clause of admission, before the heads: a filter on the observer applied afterwards makes a thing vanish from the view (run). A record that does not count is held and shown as a proposal. Accepting one by restating it works today. Sharing without pull requests leaves a plain shared file with no guardian, which brings signed declarations forward. A trial of the whole slice needs no anchor.
- **Run for part two:** one git ref per writer on a bare repository, two writers pushing and a third clone reading the union with `loops check` clean; and the observer filter before and after a lead restates a junior's value.
- **Six more draft entries, SL1 to SL6.** Part two withdraws the leaning of ID5 that the git host is the admission boundary.
- **Part three, stewardship.** Kyle said part two raises how stewardship is managed, for the description file and everything else that defines a store, and agreed that the steward should be a lineage for the team, with grants from it. Part three takes that as given. One mechanism covers every definition: the steward alone counts for a closed set of definition kinds, and anyone else's change is a proposal. One steward removes the case of two removing each other. A grant's scope fits the envelope when it is a set of kinds, written as `kind:` mentions (run today as an ordinary record, and read again after its payload was erased), which makes a kind a thing. Someone leaving is routine in a company, so an end of grant is the one later piece a kept team store needs early. Five more draft entries, SW1 to SW5.
- **Part four, two stewards.** Kyle: a store always starts with one steward, so a second has to be added. The walk follows that. A second steward is a grant of the definition kinds with the right to grant, so everyone's standing is a chain of grants from the anchor. A grant is ended by its granter or anyone above, so removal runs one way and two stewards cannot remove each other; a founder's standing is never ended. Grants and ends both only grow, so who counts has no fork (run: two grants and an end written apart, read together). The one fork two stewards can make is an ordinary conflict on a description's field (run). Two more draft entries, SW6 and SW7. Left open: what a reader does when the cover of an end is withheld.
- **Part five, what the council broke.** At Kyle's word the walk was put to margins, Neon and Astra in a room, asking where it is wrong. All three answered the same night, and several steps marked as holding do not hold. Each was run again here before it was accepted. Leaving a record out before the heads breaks accepting by restating (margins; run): a record that does not count stays in the order and sets nothing. A tree of grants over lineages can form a cycle (margins): the tree is over grant records, each naming the grant above it in `under`. A grant that names no store can be copied into another store of the same team (Neon): the chain ends at one store's anchor, and every record in a store with standing names its grant. One ref per writer loses a segment when one key writes from two clones (Neon; run): an outbox per place. The cover of an end goes in its envelope as its topmost ids (margins). The trial's list is grants as records with the steward named by the spec, not a file (Neon). Restating a proposal that clears a field loses the clearing unless the unset is restated too (Astra; run), so accepting is a verb's work and the affirm stance is worth more than the walk had it. A record counts by the one grant it names, and a second path to its writer does not sustain it (Astra). A second round added five more: a proposal from someone with no grant names the store's anchor in `under` (Astra); a cover by its topmost ids needs a closed cut (Astra; run by Astra); a store that continues another names the old anchor and a tick, since under the chain old records would otherwise count nowhere (margins); the four things admission checks of `under` (margins); and an end is of the grant it ends (margins). Neon then found four more against the replacements: the trial needs an anchor of its own, signed by a bare key; an explicit cut closes over `prev` only and would have to follow `under` (run); binding by `under` ends verbatim promotion between stores, which becomes a restatement or an affirm; and a person's grant should carry the right to grant to their own seats.
- **Not changed:** the order in `ROADMAP.md`. Kyle has said identity is the next question; he has not ruled a new order.

### The exporter reads a fold of several slots

The first change from outside: John Spann's, as pull request 22 on the GitHub copy, from a pilot importing a store of his own. This session reviewed it and Kyle asked for one change before it went in.

- **What was refused.** `tools/shadow/export.py` took a kind only when its fold was one slot named `items`. The old tool allows several slots with any names, such as `observations "collect" 500; count "inc"; updated "latest"`, and his vertex has one. He had exported from an edited copy, so the map's `vertex_sha256` named the copy.
- **What it reads now.** Only `parse_vertex` in `tools/shadow/vertex.py` changed. The first slot decides, as the old tool reads a kind's items from its first slot alone: `by "<field>"` keys the kind and `collect N` collects it. Later slots are checked against the old tool's ten operations and their arguments, and left out of the map.
- **What it refuses.** A first slot that is neither `by` nor `collect`, a later `by`, a second `collect`, a slot name used twice, an operation the old tool does not have, and wrong arguments for one. It is stricter than the old loader, which takes extra arguments.
- **The one change asked for.** As first written, a `collect` slot counted in any position. Run on the old tool (0.11.0), `count "inc"; items "collect" 2` shows no items, so the map's limit would have described a read that does not happen, and `compare.py --old-json` left two of three roots unexplained. The second commit makes the first slot decide.
- **What does not change.** The map format, the Rust import and `compare.py`. Every vertex the exporter took before gives the same map, so no journal pin moves and no record's bytes or id change.
- **Checked here:** the 25 tests, and a scratch store written with the old tool, exported, imported and compared (7 of 7 things equal).
- **Left open, found by the same pilot:** `compare.py --old-json` exits 1 whenever an export root is absent from the old read, also when the absence is counted as `missing_key_roots` or `outside_collect_limit`. That is how it was built, not this change.

### Kyle rules the strict shorthand, declines a mention, and defers the import's AD5 work

After BP1, Kyle asked whether the day's decisions were conforming to stores built up iteratively under the old tool, and said he would rather be strictly explicit going forward, with one qualification: agents are the main writers, and their ergonomics come first where the two pull apart. He expects to rebuild many stores from first principles and pick from the originals later. The coordinator listed what the build still carried over; he took what was recommended; the four settled the lines in the room. The record is [ST1](notes/2026-11-24-kinds-and-references.md#st1-the-shorthand-is-strict-and-the-description-says-what-it-allows).

- **Three more stops in the shorthand `emit`,** each a usage error before signing that names the way out: a kind the description does not name; a lifecycle value in neither list; a reference field holding anything but a reference of a listed kind, or a list of them. A field left out passes. `emit -` and the store refuse nothing.
- **A comma stops in a reference and in the key field.** `owner=asset:a,asset:b` is one valid name that nobody means. Astra first held to the record format's own test, under which it passes; margins-claude too; both took the stop after Kyle's note on ergonomics, as a rule of the shorthand alone. Astra showed it gives no guarantee that the shorthand cannot make such a thing, and it is written without one.
- **The description file loses `key_format` and `search`** (Neon, who had put them in the sketch with nothing reading them), a `lifecycle` must list a value and none twice, and a `refs` list holds kind prefixes. Version 1 is amended in place: no binary that reads the file was installed.
- **No `name` headline once a description exists,** in the three places Neon found.
- **`describe` counts references whose kind the field does not list.**
- **Not taken:** required fields, a check that a target exists, refusing an undeclared payload field.
- **AD5 row 2's mention is declined.** The import, when built, repairs the field and adds nothing to `about`. Kyle's reason: a proper reference in the field is found by `ls --refers-to`. The lines above this section that say "with a mention" are as ruled earlier in the day.
- **AD5's build is deferred, and there is no second cutover of the homelab.** All four recommended it once he said he would rebuild. Pieces 9 and 10 wait; piece 8's plumbing and today's importer stay.

What is left of the pass: the description tightened, the `emit` shorthand with its stops, and `--add-about` and `--drop-about`.

### Kyle rules BP1

Ruled in the coordinator's session on 2026-11-24, on one principle he stated: **accept strictly what was entered, and do not infer or work round a likely error.** The entry as put, with the ruling at its head, is at the end of [the kinds and references note](notes/2026-11-24-kinds-and-references.md#bp1-nine-narrow-cases-the-build-plan-found-open).

- **As recommended:** rows 1 to 4 (the kind and the thing's prefix may differ; a key that is not text stops the shorthand; a root that is meant keeps its payload; adding and dropping one mention is a usage error), row 6 with its option (a list from a literal comma, and from a comma and one space where the map reviews it for a field), rows 7 and 8, and row 9.
- **Row 5, the other way.** A bare key beside a twin that resolves is left as entered and counted. The coordinator had recommended writing `kind:key`. The reference is not lost: AD4 already mentions what the twin resolves to. In the private group it is two fields, where most values are written in full and some are bare; they are to be corrected in the old store before it is exported. The import's check-only report is to count them.
- **Row 8b, the other way.** The mention is cleared: the import mentions only what it repaired. Kyle's reason: where the field holds a proper reference, `ls --refers-to` finds it, and a mention adds nothing he needs.

The rulings free pieces 3 and 4 (the `emit` shorthand and the mention flags) and pieces 9 and 10 (the import).

### Built: a store by name, and the import's recipe

The first two pieces of the plan. Codex workers wrote both; the coordinator read each diff, ran the gate, and made the checks named.

- **`--in <name>` on every verb that takes one store** (plan piece 1): `emit`, `erase`, `tick`, `import`, `get`, `of`, `export`, `check`, `ls`, `read` and `fold`, as [the store descriptions note](notes/2026-11-23-store-descriptions.md#3-a-store-found-by-name-on-every-verb) settles it. `--store name=dir` is taken before the verb too. A write through `--in` says on standard error the name, the directory and what bound it. `init`, `whoami` and `shadow-import` refuse `--in`. `--group` and a second `--in` are usage errors for now; the reads that take several stores come with `describe` and `ls --refers-to`. Tried by hand on a group laid out as the homelab's is, where the first proposal failed: `loops --in audit fold q.json`, with a relative spec that also names a second store, answers.
- **The shadow import carries one recipe** for what it does to a payload (plan piece 8), applied wherever it makes one: the root ids, the prospective ids and `sets`, the check and the write. It only removes the old reference fields, as before, and can hold a replacement that nothing produces yet. Every signed byte is as it was. The check-only report of the new binary equals the old one's, byte for byte, on a private group of six stores (3,817 facts).
- **The description file and the plain views** (plan piece 2). `.loops/store.json`, version 1, is read and checked whole: `version`, `kinds`, and for each kind `note`, `key`, `key_format`, `headline`, `refs`, `lifecycle`, `preview` and `search`. In this piece only the plain views use it: `ls`, `of`, `read` and `fold` with `--plain` take a thing's headline from `headline`, then a text `key`, then `name`, and a plain `ls` of one kind shows its `preview` columns unless `--fields` is given. A file that does not parse, or holds a member this version does not know, stops those views and names the file and the member (exit 2); JSON reads go on. SD1's test is in the suite: the JSON of every read, and the signed bytes of `emit -`, `emit - --fill` and `tick`, are the same with no file, a valid one, a changed one, a malformed one and one with an unknown member. Tried by hand with the example file of SD1 as ruled: a decision, keyed by `topic`, now shows its topic where the headline was empty.
- **`ls <kind>: --active`** (plan piece 5) hides a thing only when its lifecycle field reads as one text value that the description lists under `closed`. A missing, unlisted, conflicting, erased or withheld status stays in view. It takes a prefix that names one kind with a `lifecycle`, and anything else is a usage error. Its output states the kind, the field and the list it applied, in JSON and in plain. It is the first flag whose JSON depends on the description; `ls` without it is the same bytes with and without the file. Tried by hand with the example file of SD1: of five tasks, `done` and `dropped` are hidden, and `open`, `parked` and one with no status are shown.
- **`loops describe`** (plan piece 6) prints each selected store's description as it was written, then how the store fits it. For each kind: its things; for a keyed kind, how many have a key field equal to the key, different, unset, conflicting or unread, and how many are keyless roots; the lifecycle values in neither list, each with its count; and for each reference field, the values held here, held elsewhere in the group, held nowhere in it, not written `kind:key`, not read, and carried by no mention. Nothing it reports is a fault, and drift never changes the exit status. It is the first read of several stores: `--in` may repeat, and `--group` reads every store the local `stores.json` names, that list alone. Every member is opened before anything is read. Every other verb still refuses both. Run on a scratch copy of the six homelab stores as a group, with SD1's example description on the coordination store: 125 threads, with `parked` twice, `closed-bedrock-deferred` once and four unset, as SD1 counted them by hand; the tasks' `source` values all "not typed", being in the old `kind/key` form; 1.1 s cold and 0.7 s warm for 11,000 records.
- **`loops ls --refers-to <thing>`** (plan piece 7, SD4) lists every thing whose declared reference field names the target, across kinds and across the stores selected: the current one, repeated `--in`, or `--group`. Each field is answered by the evaluator's own test, the one a fold's `where` with `is` uses, over all the thing's records, so for one field the list and the count of things not read equal the fold's; the tests compare them. Any yes lists the thing; otherwise any unknown counts it once as not read. Nothing is split and no kind is guessed. The output names the stores, each field read with the description that declared it, and three counts: things not read, values not written `kind:key`, and fields read. Tried by hand on a group of two scratch stores: a service moved from one VM to another is found under the new one and not the old, though its mention still names the old; a second reference field finds a second service; a list matches by member; a value in the old `kind/key` form is counted as not typed. On 9,000 records in 20 segments: 0.24 s with a warm verification cache, 0.55 s cold.
- **The description tightened** (ST1 lines 7 to 11). Version 1 of the file is amended in place, since no installed binary reads it yet. `key_format` and `search` are no longer members, so a file that has either is refused like any misspelt member; a kind's naming guidance goes in its `note`. A `lifecycle` must list at least one value between `closed` and `active`, and none in both. Each kind in a `refs` list must be a kind prefix and not `r`; an empty list still means any prefix. A file that breaks one of these is exit 2 with the place named, for the commands that read the file and no others. With a file present, a plain headline comes only from a described head kind's `headline` or its text `key`: a kind the file does not describe, a kind with neither, and heads whose kinds disagree show none (`—` in the `ls` column, nothing on a thing line). With no file every plain view is as before, and JSON `ls` keeps its headline from `name` either way. `describe` gains `unlisted_prefix` for each reference field: the readable typed values whose prefix the field's list does not name, always zero for an empty list, and counting an `r:` value outside a nonempty one. It filters nothing: `ls --refers-to` still finds such a value. Checked by hand on a scratch store: the six refused files, the three headline cases, the count, and JSON `ls` byte for byte the same with and without the file. 424 tests.
- **The `emit` shorthand follows the description** (SD2, BP1 rows 1 to 3, ST1 lines 1 to 6). `loops emit <kind> field=value` now reads the `.loops/store.json` of the store it writes to, the named one with `--in`. A kind's text key field names the thing: `emit kiln name=east` writes `kiln:east`, the same signed bytes as stating `--of kiln:east`. A keyed kind with no key stated stops and names the three ways out. A stated key that differs from the thing's key stops, with `--of` and with `--prev` alike, compared as text after the first colon. A key that is not nonempty text, or holds a comma, stops. `--root` writes a keyless root that is meant, and cannot be given with `--of` or `--prev`; it and a revision of a keyless root skip the key's checks and no others. With a file present: a kind it does not name stops; a stated lifecycle field must be a text value in `closed` or `active`; a stated reference field takes one reference or a flat list, `[]` included, with a prefix the field's list names (any where the list is empty, and `r:<id>` only there) and no comma. Each stop is exit 2 before anything is signed, with no new refusal code, and its message says what was typed, what the file allows and the way out. `emit -`, `emit - --fill`, `tick` and `erase` never read the file, also beside one that does not parse. With no file, `emit` is as before, with `--root` accepted. Checked by hand on a scratch store: each stop and each allowed write, a revision by `--prev`, a keyless root's revision, and `emit -` beside a broken file. 430 tests.
- **`--add-about` and `--drop-about`** (SD3, BP1 row 4) on the `emit` shorthand change the carried mentions by one thing at a time. The written `about` is the union the writer copies from the thing's heads (from the writer's view under `--base`), plus each added thing, minus each dropped one, in canonical order. A later ordinary revision copies the result. Adding what is carried, dropping what is not, and repeating a flag change nothing. Either flag beside `--about` or `--no-about`, and the same thing added and dropped, is a usage error, so the order of two flags cannot change a signed record. An operand is checked as `--about` checks one, a drop that removes nothing included. They read no description, and no reference field's value reaches `about`. Not on `tick` or `emit -`. With this the pass is built. Checked by hand on a scratch store: an add, a drop with a no-op drop beside it, the copy by the next revision, and each error. 435 tests.

**Implementer choices; they stand under W7.**
- The notice of a named write is printed as soon as the store is opened, so it also appears before a write that then fails its own checks.
- A flag after the verb is the verb's: `emit asset --in yard` is a usage error and does not select a store.
- The usage text keeps its first line and gains a second for the leading options.
- The description states `version` and `kinds`, and a member it does not know is an error anywhere in the file, in a kind the command does not touch too.
- When a thing's heads are of kinds whose headline fields differ, the plain views showed `name` as first built. ST1 replaced this the same day: with a file they show none.
- A `lifecycle` with no value is reported at the `lifecycle` object; a value in both lists is reported at its place in `active`.
- A message in an error names the place in the file as `$.kinds.decision.preview`.
- The shorthand checks in this order: the kind, the lifecycle value, the reference fields by name, then the key. A repeated payload field stays `member-duplicate` and is found before any of them. When `--of` and `--prev` are both stated, a key mismatch names `--of`.
- An operand of `--add-about` or `--drop-about` that is not a thing's name is refused as `--about` refuses one, `about-not-typed`, exit 1, and not as a usage error.
- The message for an unnamed kind offers two ways out besides `emit -`: a kind the file names, or adding the kind to the file.
- `describe` counts a keyless root under the kind of its head, so a root's status appears among a kind's lifecycle values. It reads live values from the union of the selected stores, so a thing two stores hold differently shows as a conflict in each.
- `--refers-to` takes one whole typed target and no other `ls` operand; a target that starts `r:` must be a whole record id.
- `--group` does not read the user's list at all, so a broken user list cannot stop a group's report.
- `--active` given twice is a usage error. The plain form prints the applied rule on a line above the table, also when no row is left.

### The build plan, and BP1 is put

A Codex worker planned the build of the day's rulings in twelve parts and ten merge requests; the coordinator read it and keeps it with the briefs. It found nothing to change under `model/`, `vectors/`, `protocol/`, `interop/` or `design/`, and no refusal code to add. Two pieces are being built: a store by name on the verbs that take one store, and the import carrying a recipe for what it does to a payload, with no change to what it writes.

The plan listed eight cases the rulings leave open that change a signed record or its id. They are put to Kyle as [BP1](notes/2026-11-24-kinds-and-references.md#bp1-nine-narrow-cases-the-build-plan-found-open), with a ninth from the coordinator: a bare key beside a twin that resolves. Read from outside before they were put: Astra kept a repeated key field as `member-duplicate` and exempted a root that is meant from the key's checks; all three asked for a second reviewed list encoding; margins-claude and Astra differ on one row, and both views are in it.

### Kyle rules SD1 to SD4 and AD5

Ruled in the coordinator's session on 2026-11-24, each as recommended by the four who prepared them. The entries as put, with the ruling at the head of each, are in [the kinds and references note](notes/2026-11-24-kinds-and-references.md). The sections below this one tell how they were arrived at.

- **SD1, A.** A store describes its kinds in `.loops/store.json`. The CLI uses it and no read depends on it: with no flag that names the description, the JSON of every read is the same with and without the file. It refuses nothing. It becomes records at step 3.
- **SD2, A.** `emit` stops before it signs a write with no key, or with a key field that disagrees with its thing's key, and names the way out. `--root` writes a keyless root that is meant.
- **SD3, C.** A kind's reference fields are described. Nothing is copied into `about`; a mention is what a writer states. `--add-about` and `--drop-about` are built with it.
- **SD4, A.** `loops ls --refers-to <thing>` reads the declared reference fields as a fold's `is` does, across kinds and across the stores of a group, and states the stores and fields it read and what it could not.
- **AD5, all three rows.** The import writes a reference field as `kind:key` where its twin resolves to the thing it names; in the five slip fields the group's map names, with a mention of the target; and as a list where a twin holds several ids. It never rewrites a kind's key field. This amends AD2, as AD4 did.

**What follows, in order.**

1. The CLI's part: the description file and the shorthand it gives `emit`, the stop and `--root`, `--add-about` and `--drop-about`, `describe`, `ls --active`, `ls --refers-to`, and a store by name on every verb (`--in`, `--group`), whose form is in [the store descriptions note](notes/2026-11-23-store-descriptions.md#3-a-store-found-by-name-on-every-verb), section 3.
2. The import's part: AD5's three rows within its six bounds, pinned in the journal under a new version.
3. (Deferred later the same day, with the import's part; see the section on the strict shorthand.) The homelab imported afresh into new stores and compared, then cut over a second time at Kyle's word. Every record gets a new id and a new observer key. The present live stores are kept aside.

### SD1 to SD3 are put

The entries come from a discussion of Neon's sketch of 2026-11-23 between the coordinator, Neon and margins-claude, held on 2026-11-24 in a chat room kept in a store (rex-tools). Astra (Codex) then reviewed the entries from outside. The four agree on every point in them. What the discussion changed in the sketch:

- **A key slip stops the write; it does not warn** (the coordinator). A warning arrives after a signed record. Neon added `--root` for a keyless root that is meant, and the exemptions for a revision of a keyless root. Astra showed that a revision by `--prev` can still state a key field that disagrees (`emit deploy --prev <id> name=different`), so that exemption covers only the missing key.
- **`closed`, not `active`, does the hiding in `ls --active`** (the coordinator, from counts in the coordination store: 7 of 125 threads and 6 of 18 tasks have a status in neither list).
- **No read's JSON depends on the file** (margins-claude). With no flag that names the description, the JSON of every read is byte for byte the same with and without it, as a test. `--active` is the one such flag and states the list it applied. Neon withdrew a headline taken from the file in `ls` JSON.
- **Reference fields are described and not copied into `about`** (SD3, recommended C). The sketch copied them. margins-claude showed that a copy outlasts an erasure, and checked in its own Python reader that the heads' mentions never miss a readable live reference value (22,925 holdings, with forks and late erasures; margins `e6374dc`). The entry was first merged recommending the copy, with a rule for dropping the old copy on a move and a stop after an erasure. That rule went through four versions in the day. Astra then gave a history none of them handles: two heads over an erased root, joined by a write that moves the field. Nothing but the erased payload says whether the mention one head carries was copied or stated by hand. All four moved to C. margins-claude added the history and a check of removal to its reader (margins `c1a306a`): without an erasure the per-head rule leaves no old copy; after one, an old copy stays in 48 of 388 things even with the stop taken at its best.
- **An unknown key in the file stops the commands that use it** (the coordinator), and `loops describe` reports how the store fits its description (margins-claude and the coordinator).
- **The sketch's first example was rewritten from the store.** `deploy.service` holds 65 bare names and is not a reference; `decision.status` is unset on 186 of 189 decisions, so decisions get no lifecycle.
- **The entries no longer say that nothing changes a record's bytes or id** (Astra). The record format and every existing record are unchanged, but the same shorthand command writes another `of`, and so another id, depending on the file.

### SD4 and AD5 are put

Kyle trialled the import on a second, private group of stores (nothing from it is quoted), and asked for a second round in the room on what it showed. The same four agree on both entries. What each brought:

- **Nothing keeps mentions in step with the fields after the import** (the coordinator). A move written without `--about` keeps the old mention and gains no new one, by the rule of 2026-11-14; shown on today's binary. The coordinator proposed a read taken from the declared reference fields, and the import writing one form.
- **The read answers as a fold does, yes, no or unknown** (Astra, from 15 histories run on today's binary). Neon had it list a thing when any live setter holds the target; that contradicts the spec, where setters whose answers to the test differ answer unknown, and Neon withdrew it. Across fields any yes lists the thing; across stores the records are put together before they are read. margins-claude pointed to the spec's own sentences for it.
- **The read's "no" needs its coverage beside it** (margins-claude). The coordinator had said the import mentions every reference in the audit store. margins-claude found 434 live values there that are a bare key with no kind, no twin and no mention, which that count had not seen (`sl-py/refs_twins.py`, margins `4b0d7cf` and `f410152`). They answer no, so the read states how many values in the fields it read are not typed.
- **The old form was never kept on purpose**, and field and twin agree in all 13,854 facts (Neon, and margins-claude separately, then again as whole values byte for byte).
- **The rewrite's six bounds** (Astra): never a kind's key field, which would rename a thing; decided from the fact's own field and twin; the whole value compared; a list and a bare key only by their own rows; the same rewrite in the check and the write, pinned in the journal, into fresh stores only.
- **The five slip fields are repaired by a line in the group's map, not at read time** (margins-claude; Neon and Astra held the read to exact text). 586 values in old facts resolve, and are mentioned as twinned references are; 75 name nothing imported and stay. Astra had the mention stated as a second choice within the row, since it is permanent and the repair does not need it.
- **A list for several targets** has no homelab case, and changes what `is` answers, so it is a row of its own. All four recommend it: under an exact match, comma text with several targets answers yes for none of them (margins-claude).
- **Read as put before the merge** by Astra and margins-claude, who corrected the draft: it had said a ruling against row 1 would make the read take both forms; it had the import's mentions as complete; it gave "not typed" as naming nothing, where it is about the form alone; and row 2 did not say that a repaired value is also mentioned.

### A store by name on every verb joins the pass

Kyle asked that a store found by name on every verb be built with SD1 to SD4 and not after. The four settled its form in the room, and it is written in [the store descriptions note](notes/2026-11-23-store-descriptions.md#3-a-store-found-by-name-on-every-verb), section 3: `--in <name>` before the verb. It stands under W7. margins-claude showed on the homelab group that `--in` cannot simply be `-C` with the resolved directory; Astra gave the resolver's present edges from 16 checks, the rule that a write names its store on standard error, and that only the two union reads take more than one store; Neon chose the spelling with Kyle's section in mind and added `--store` before the verb. Nothing is built.

## 2026-11-23

In brief:
- `loops emit - --fill` no longer slows with the square of the batch: 2,000 revisions take 0.22 s, not 7 s, and 8,000 take 0.86 s. The records it writes are unchanged. It was the fault the store descriptions note measured.
- [A note on store descriptions](notes/2026-11-23-store-descriptions.md) gathers what the homelab conversion and Kyle and Neon's collector prototype asked of a store's description of its kinds, as the opening input for that question. Nothing in it is ruled. It measures one fault: `emit - --fill` takes time in the square of the batch, 6.7 s for 2,000 revisions against 0.07 s for plain `emit -`.
- The homelab repository is converted, waiting on Kyle's merges (gruel.network !9 to !11): its agents emit with the new tool into the live stores, the changelog page and the session-start hook read them, and CI pins the old stores as a frozen archive. The SRE agent's history search reads them too (committed in the workbench's bench). `estate.py` and `atlas_materialize.py` stay on the archive, at Kyle's word. The import left out 25 facts of kinds no vertex names, and Kyle kept that default.
- `loops` is first on `PATH` on the workbench, and the six homelab stores are cut over: their shadows are the live stores and the old stores are the archive. Converting the homelab repository's writers and readers to the new tool is next. rex-chat names its store `.`, so the release binary on main is built again.
- The six homelab stores are imported again under AD4, into fresh shadows: every thing reads as its export says, and every thing the old tool shows reads as the old tool shows it, references included. Next for adoption: the old tool's remaining callers, then `loops` first on `PATH`.
- AD4 is built in the import: the old stores' references become mentions, the payload is cleaned of the fields they came from, and the journal pins only the vertex's kinds. On copies of the six homelab stores, 14,727 `*_ref` fields and 889 `ref` fields became mentions, and an independent reading of the rule agrees on every keyed thing. The comparison tool checks it against the exports and the old tool's own reading: on the six, every thing the old tool shows is equal, references included.
- Kyle ruled W3b (the JavaScript stays frozen, as the rule) and AD4 (references in the old payloads become mentions, by one rule for old ids, and the payload is cleaned of the fields they came from). AD4 is being built, with the import's pin on the vertex's kinds only.
- The look at the frozen JavaScript that W3 asked for is done and put to Kyle as W3b: it has caught no fault in Lean or Rust alone; it still checks 649 vectors and is the second computation of a spec's slice. Recommended: keep it frozen as the rule.
- The first real import: Kyle's six homelab stores, into shadows outside every repository. Each reads as the old tool does in every field but one, a list of references in a field `ref`. How the old stores' references are carried is put to Kyle as AD4.
- Kyle ruled TK13, yes to all three rows, and `loops tick` now does it: a tick made with no cut named covers only the records its answer depends on, with what is under them; `--all` covers everything. In a store of six backups and 40 notes the tick lists 6 ids, not 46.
- The Rust can work out which records a spec's answer depends on (`loops::slice::spec_slice`). Nothing uses it yet: no verb, flag or default changed, and what `loops tick` does with it waits on TK13. On 488 generated stores and specs the answer over the selected records equals the answer over everything, and a tick over them checks `same`.
- TK13 is put to Kyle: whether `loops tick <spec>` should cover only the records its answer depends on once the binary can work that set out. John's pilot asks for it. A worker planned the build the same day; the plan corrected the entry's second row and added a third, for specs that read things by key.
- Three faults found before the first real import are fixed: an old id need not be 26 characters, the vertex reader skips the `observers` and `sources` blocks, and a fold started in a group's directory reads the `stores.json` there. On copies of six older stores the import then took every fact and each shadow read as its old store did.
- Kyle ruled AD3 for its recommendation in both rows: a fact of a kind the vertex does not name, brought in with `--include-unnamed`, is a root, and the old time is kept to the microsecond. The build already did both. Nothing waits on a ruling.
- Kyle ruled AD1 (how a spec finds the stores it names) and AD2 (how an old store becomes records), each for its recommendation with additions. Both pieces are being built.
- `loops read` and `loops fold` find the stores a spec names and fold their union. A name bound to nothing refuses the read (`store-unknown`). The name `.` is the store the read starts from.
- The import is whole: a comparison tool says, in counts, whether a shadow store reads as its old store did.
- `loops shadow-import` is built: it copies exported old stores into shadow stores, one signed record for each old fact, checks everything before it writes anything, and writes nothing on a second run. On a copy of four real stores it gave the old tool's reading for every thing held by one store.
- The import's first two pieces are built: a script that exports an old store and its vertex to two text files, and the mapping of each old fact to a record, equal byte for byte to what `loops emit - --fill` writes. No verb yet.
- The import has its plan. Two of its choices decide record ids and are put to Kyle as AD3: how a kind the vertex does not name is written when asked for, and how fine the old time is.

### `emit - --fill` keeps its state through the batch

Kyle and Neon's collector prototype found it, and the store descriptions note measured it. For every row, `fill::changeset_with_base` settled and admitted everything the store holds plus every row prepared so far, then used only that row's thing. It now builds an index once, by thing, with each id's preferred form and every erased id, and adds each prepared row to it. A row's realm is read from its own thing's records. Codex wrote it; the coordinator reviewed it.

| Revisions in one batch | Before | After |
| --- | --- | --- |
| 250 | 0.12 s | 0.03 s |
| 1,000 | 1.56 s | 0.10 s |
| 2,000 | 6.98 s | 0.22 s |
| 8,000 | 132 s | 0.86 s |

Release builds, a fresh store each, one new thing per row and then one revision of each.

- **The records are the same.** Main's per-row algorithm is kept as a test-only reference. `fill::differential::indexed_fill_matches_per_row_realm` runs both over 2,048 generated changesets, each with and without a base (seed `0x2026_1123_f111_ba7c`, about 6 s): new things, several revisions of one thing, labels both ways, erasures and `prev` across things, a predecessor that arrives during the batch, withheld and duplicate forms, conflicting base forms, and refusals. Drafts and notices must be equal, in order. Six faults planted in the index were tried, and the tests caught five. The sixth, letting a base walk add again a held form the index already has, writes the same records.
- **`--base` uses the same index.** A base's held ancestors of the row's thing are added for that row only, as before.
- **Two checks in `rust/core` were made linear.** The batch writer's `check_prev` looked up each `prev` target by scanning the batch, and `check_label_names` compared each label with every earlier one. Each now uses a map or a set. The first match and the order of refusals are as before. Without this, 8,000 rows took 5.7 times as long as 2,000.
- **What is still not linear.** Each row still reads all of its own thing's records, so a batch of many revisions of one thing costs in the square of that thing's length.

### The homelab repository converted to the new tool

At Kyle's word (2026-11-23: "a full cutover here on gruel.network"). Each piece is a merge request in gruel.network for him to merge, in order: writers (!9), the changelog (!10), the session-start hook (!11).

- **Where the stores are.** `~/.local/share/loops/gruel.network/<store>` is a symlink to the cut-over shadows, so nothing moved and no live path says "shadow". Kyle chose it.
- **Writers.** The repository's CLAUDE.md, its docs checklist skill and its agent-identity page emit with `loops -C <store> emit <kind> --of <kind>:<key> … --about observer:<name>`, with a table of each kind's key field taken from the old `.vertex` files. Kyle chose plain commands over a wrapper, so the friction stays visible. Every agent on the workbench signs with the one workbench key, so the author is named by an `observer:<name>` mention, as the import named the old observers. The SRE agent's instructions in the bench say the same.
- **The archive is frozen in CI.** A test pins the SHA-256 of the six old `.db` files, in a job on every push and merge request. A stray `sl emit` in one of the coder agent's clones now fails CI.
- **The changelog page.** `scripts/generate_changelog.py` folds each of the two stores once (`collect` over five kinds), and dates a record by `occurred`, else `emitted`. Regenerated from the live stores, the page is byte for byte the old one except one line (below). Its `--check` left CI, which cannot see the stores, for the repository's pre-commit hook, which runs where the stores are. Kyle chose that.
- **The session-start hook** folds the coordination store and the agent's own store with `latest-by: of` and `follow: keys`: open threads, then the newest few things of each kind. The new tool ranks nothing by salience, so "newest" stands in. Two old faults were fixed on the way. The hook's warnings were lost in a subshell, and the monitor read on infra had always exited 127, because `~/.local/bin` is not on a non-interactive SSH's `PATH`. The settings now run the hook by `$CLAUDE_PROJECT_DIR`, so it runs on the workbench at all.
- **The SRE agent's history search** folds each store and matches every word in the payload and in the mentions. AD4 moved the old `ref` fields into mentions, so without the mentions four of 32 old matches for "disk full" were lost. It takes 0.35 s for three stores.
- **Not converted, at Kyle's word:** `estate.py` and `atlas_materialize.py`, which read the audit store. Nothing has written that store since 2026-11-05, and the old tool reads the archive the same way. They move when an audit next writes it. The remote hosts and the Mac stay on the old tool for now.

**25 facts the import left out.** The import's counts showed them all along (`unnamed_left_out: 25`), and the changelog was the first reader to miss one. Each is of a kind its store's vertex does not name: 15 of the agent's observations filed into the coordination store, a deploy filed into the agent's own store, a credential in a host's store, and others. AD2's addition (d) leaves such kinds out by default. A fresh import with `--include-unnamed`, tried on a copy, took 3 s, compared clean and gave the old changelog byte for byte. Swapping it in would have changed every record id, so it was possible only before the first new write. Kyle kept the default. The 25 stay in the archive, and the page loses one line, a credential whose deploy twin has the same message.

**What adoption showed** (input for later, nothing to rule now):
- Every write names its thing and repeats its key: `--of deploy:<slug> name=<slug>`. The key table in the repository's CLAUDE.md is the descriptive half of a store declaration, written by hand (see "Being prepared" in DECISIONS.md).
- A stated `--about` replaces every earlier mention of the thing. An agent that names only itself on a revision drops the thing's mentions, and one that names none carries over the previous author's.
- Imported records all carry the import's `emitted`. Every reader that orders by time has to read `occurred` first.
- With no index or salience, readers fold whole stores and rank by time. That is fast enough at these sizes (under 2,000 records a store), and step 6 lists index and search.

### `loops` first on `PATH` on the workbench; the homelab stores cut over

At Kyle's word (2026-11-23). He works from the workbench alone for now, so his Mac is left as it is.

- **rex-chat names its store `.`** ([rex-tools !1](https://git.gruel.network/kaygee/rex-tools/-/merge_requests/1), closing its issue 12). Since AD1, a read that names a store nothing binds is refused, and rex-chat's specs named `rex-chat`. With the fix its seven tests pass against main's binary; without it every read is refused `store-unknown`. The release binary on main is built again (from `d5ee505`).
- **The old tool's callers use `sl` first.** The homelab repository's hook, scripts, skill and agent instructions moved from `loops` to `sl` (gruel.network !8). painted and siftd already used `sl`.
- **`loops` is the new binary on the workbench.** `~/.local/bin/loops` points at a build installed from main with `cargo install --path rust/cli --root ~/.local/share/loops`; `sl` still points at the old tool. Nothing else on the workbench called `loops` by that name: the SRE agent reads the old SQLite files directly, and margins-claude calls `loops-eval` by path. A reinstall of the old tool through uv would take the name back.
- **The six homelab stores are cut over.** The shadows of the second import are the live stores, under `~/.local/share/loops/shadow/<group>/shadows/`; a `CUTOVER.md` there says so. Importing into them has ended. The old SQLite stores, unchanged since 2026-11-22 and byte for byte what the import read, are the archive, and on the workbench they are read-only, so a stray `sl emit` fails rather than splitting a history. A revision written with the new tool names its thing (`loops -C <store> emit observation --of observation:<topic> …`): the new store has no vertex saying which field is a kind's key. Tried on a scratch copy of one store: two records, one head, and the store checks clean.

**What is not converted yet**, and is next: in the homelab repository, the agent instructions and the skills that emit (they still say `sl emit`, which now fails on the workbench), and the readers that read the archive and so see nothing new: the changelog generator and its CI check, two scripts, the session-start hook, and the SRE agent's history search.

### The homelab stores, imported again under AD4

The shadows of the first real import (earlier the same day) were written before AD4, and the import now refuses their journal by design. They are kept aside, unread, as `~/.local/share/loops/shadow/<group>.first-import-v1/`. The same copies of the six stores were imported again with the binary built from main at `ecb4fab`, into fresh shadows in the group's usual place.

| Step | Result |
| --- | --- |
| The import | 11,047 records, none refused; a second run writes nothing; every shadow passes `loops check`; the id map holds 11,072 old ids |
| Against the exports, as one group | every thing equal in fields and mentions in all six |
| Against the old tool's own reading | every thing the old tool shows is equal, references included; the shadows also hold the 37 facts without their key, as roots |
| Across the six | the 10 things two stores hold under different old ids read with two heads, as before |

### AD4, third piece: the comparison checks references

The last of three pieces of AD4. Python only, in `tools/shadow/`; it changes no store and no Rust.

```
python3 tools/shadow/compare.py --group group.json                      (every source, against its export)
python3 tools/shadow/compare.py --old-json workshop.old.json \
    exports/workshop.facts.jsonl exports/workshop.map.json shadows/workshop   (one source, also against the old tool)
```

- **The whole group is read first**, as the import does, so a reference into another store is resolved, not mistaken for text. A positional comparison finds `group.json` in the working directory.
- **AD4 is worked out again in Python** from the export's original facts: the mentions, the cleaning, the cycles. The id map is used only to translate an old id into the record it became, and each of its entries is checked against the exports and the shadows.
- **Mentions are compared as sets**, from each thing's `about` in `loops fold --values`, and counted apart from fields. A difference in mentions alone fails the comparison.
- **Against the old tool's reading** (`--old-json`): its `refs`, its current `*_ref` fields and its latest observer, cleaned by the same rule. Where the old tool took `ref` away but AD4 keeps it, the export is the witness, and the output says so. Facts without their key and collected items beyond the old tool's limit are shown as coverage differences, never made up.
- Counts only, as before.

**Run by the coordinator on the six homelab stores** (scratch copies, imported by the second piece):

| Compared | Result |
| --- | --- |
| Every source against its export, as one group | every thing equal in fields and mentions: 5,021, 1,021, 35, 122, 10 and 272; no record outside the id map |
| Each source against the old tool's own `sl read --json --all` | every thing the old tool shows is equal, references included; the only difference is the 37 facts without their key, which the shadows hold as roots and the old tool does not show |
| Across the six | 10 things held by two stores under different old ids read with two heads, as AD2 counts them |

A Codex worker wrote it; the coordinator reviewed it and ran the comparisons above.

### AD4, second piece: references become mentions

The second of three pieces of AD4 (ruled 2026-11-23). Rust only, in `rust/cli/src/shadow/`; `rust/PLACE.md` choice 31 and `tools/shadow/FORMAT.md` say it all. No protocol rule and no vector changed. What the import writes changes, as AD4 says, so a shadow written before this is refused (below) and imported again.

- **Mentions.** A `ref` part written `kind:key` or `kind/key` becomes `kind:key`. An old id, in `ref`, in a `<name>_ref` field or in a field the map names under `ref_fields`, becomes its fact's thing, or `r:<id>` for a fact with no key. Each record mentions what its thing refers to after it: every `ref` so far, the current value of each such field, and its own observer.
- **The payload is cleaned.** `ref` goes once every part is accounted for; a `<name>_ref` goes when `<name>` is beside it and every part was an id that became a mention, or its value is empty. Everything else stays as written.
- **Nothing is refused for a reference.** An id of a fact left out, a target that differs between stores, a `ref` part that is neither an id nor `kind:key`, a cycle among records without a key: no mention, the field stays, and it is counted.
- **The order.** Records without a key are prepared before the records that mention them, since their ids are part of what mentions them. Their salts and times are saved in the journal before any batch is written, so an interrupted run resumes to the same bytes.
- **The journal, version 2.** It pins the vertex's kinds and `ref_fields`, not the vertex file. A comment edit and a fresh export write nothing and refuse nothing; a changed fold, kind or `ref_fields` is refused. A version 1 journal is refused before anything is written: import into fresh shadows. A later run that leaves out a store the journal knows is refused.
- **The id map.** After a complete run the import writes `<group>.ids.json` beside the group file: for each old id, the source, store, record and thing it became, or `[]` when it was left out. It holds no salt. A check-only run writes nothing.
- **New counts** in the verb's output: the parts read in each kind of field, the mentions made, self references dropped, each unresolved reason, and the fields taken out or kept.

**Run by the coordinator on copies of the six homelab stores**, into fresh scratch shadows (counts only):

| | |
| --- | --- |
| The import | 11,047 records in 2.7 s, none refused; a second run writes nothing; every shadow passes `loops check` |
| `ref` | 928 parts; 889 fields taken out |
| `*_ref` | 14,910 parts, 14,752 of them old ids; 14,727 fields taken out; 85 kept with no `<name>` beside them, 75 kept with a part that is not an id (158 such parts, the Docker image references) |
| Self references dropped | 188 |
| Mentions | 15,238 across the records |
| The id map | 11,072 old ids; 25 left out |
| An independent reading | the coordinator's own reading of the rule from the exports and the id map agrees with the shadows on every keyed thing (6,437), mentions and field names |

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- A part that names the record's own thing counts as accounted for, so `ref:"task/kiln"` on `task:kiln` is taken out. Its mention is said by `of`.
- When a later revision takes out a `ref` or `*_ref` that the thing still shows from an earlier one, the revision names it in `sets`, which clears it. None of the 11,047 homelab records needed it.
- A `*_ref` field's ids become mentions even when the field stays; an empty value clears that field's mentions; a value that is not text stays as written and gives none.
- A part that is the id of a fact in the group is looked up first, before it is read as `kind/key`.
- An observer mention that is the thing itself is dropped. None here.
- `ref_fields` may not name `ref` or a `*_ref` field; a malformed map is `shadow-map-invalid`.

A Codex worker planned and wrote it; the coordinator reviewed it, ran the gates and made the runs above.

### AD4, first piece: the import reads the whole group before it writes

The first of three pieces of AD4. Rust only, in `rust/cli/src/shadow/`. Nothing observable changed: the same journal, signed lines, refusals and counts as before, byte for byte.

AD4 needs every old id's fate known before any record that mentions it is prepared, because a record's id depends on what it mentions. So the import now reads every export of the group into one index first (each fact's source, place, line hash and what it becomes: a keyed thing, a collected root, a root without its key, an unnamed root, or left out), and only then prepares records. A payload is read again from its place in the export, and its hash must still match.

**Checked by the coordinator on the real homelab import**: the binary built from main and the one from this piece gave identical check-only reports (11,072 facts read, all 11,047 records already written), and no file in the group's directory changed. The worker showed the same on an invented group with fixed seeds: identical segments, journal and reports; and that listing the sources in the other order writes the same segments.

A Codex worker wrote it; the coordinator reviewed it and ran the gates and the check above.

### Ruled by Kyle, 2026-11-23: W3b and AD4

**W3b: option B, as the rule.** The JavaScript stays frozen at what it has: its layers, its 649 vectors and the slice comparison. New steps are built in Lean and Rust. It is fixed when a fault turns up in what it has, and looked at again only if keeping it becomes costly or something needs a third tick answer. The entry as put is in [the order-of-work note](notes/2026-11-21-order-of-work.md#w3b-the-frozen-javascript-after-ticks).

**AD4: rows 1 to 3 as recommended; row 4 the other way; one rule for old ids.** Ruled with Neon, who audited the homelab stores, the platform stores and John's store for it. The entry as put is in [the adoption note](notes/2026-11-22-adoption.md#ad4-references-in-the-old-payloads).

1. A reference in `ref`, `kind:key` or `kind/key`, becomes a mention `kind:key` on its record.
2. An old id becomes a mention of what that fact became: its thing, `kind:key`, or for a fact with no key the new record, `r:<id>`.
3. Each record mentions what its thing refers to after it, as the old tool reads it: every `ref` so far, the current value of each `<name>_ref` field (an empty value clears that field's mention), and only its own observer.
4. **The payload is cleaned, not kept**, because after the cut-over nothing goes back, and dead old ids, or a `ref` that disagrees with the mentions, should not live on in the new stores. The archived old stores keep everything as it was.
   - `ref` is taken out once all its parts are mentions. The old tool took it out too.
   - A field `<name>_ref` is taken out only when the payload also holds `<name>` and every part of its value was an old id that became a mention, or its value is empty. That removes almost every field the old tool generated, and leaves alone fields such as a Docker `image_ref`, a `<name>_ref` with no `<name>` beside it, and any whose target was not imported. Nothing is lost silently.

**The one rule for old ids**, the same wherever they stand:
- Values are split at commas, in `<name>_ref` fields as in `ref`.
- In a `<name>_ref` field, a part counts only if it is the id of a fact in the group. Anything else is never refused and never read as `kind/key`: it simply stays.
- An id of a fact the import leaves out, or one it cannot resolve, is not refused: it gets no mention, its field stays as written, and it is counted.
- A record never mentions its own thing.
- The whole group is read before anything is mapped, also on a later run that adds to a shadow, because references cross between stores in both directions.

**For fields that hold ids under other names** (John's store keeps lists of old ids in fields such as `covers`): the map file may name such fields per source (`ref_fields`). Their old ids become mentions by the same rule; the fields themselves stay untouched.

**Beside the private journal**, the import writes a map from old ids to records and things that holds no salts, so that a script or lens can follow an old id without reading the journal.

**And, while the import is open:** its journal pins the vertex's kinds, not the whole vertex file, so that editing a comment in an old `.vertex` no longer refuses the next run.

The six homelab shadows written earlier the same day follow the other column; they are imported again when this is built.

### The first real import: the homelab stores

At Kyle's word (2026-11-23): his six homelab stores first, into shadows on the workbench outside every repository, and the old tool's callers moved to `sl` before `loops` changes on `PATH`.

**Where it lives.** `~/.local/share/loops/shadow/<group>/` (mode 0700): `old/` holds the copies the import read (the vertex files and the six stores, each checked equal to its original before and after copying and by SQLite's integrity check), `exports/` the two files per store, `private/` the import's key and journal (0600; the journal holds salts), `shadows/<name>/` the six stores, and `stores.json` binding each name, so that `loops fold` across them works from that directory. The binary was built from main at `2c1b14c` into `~/.local/share/loops/build`, leaving the one rex-chat uses alone.

| Step | Result |
| --- | --- |
| The old stores | in step with their remote, last changed 2026-11-22, write-ahead logs empty |
| `loops shadow-import --check-only` | 11,072 facts read, 11,047 to write, none refused; 25 of kinds the vertex does not name and 14 old ticks left out; 37 without their key, written as roots |
| The import | 11,047 records in 2.6 s; every shadow passes `loops check` |
| `compare.py`, against the export | every thing equal in every field, in all six: 5,021, 1,021, 35, 122, 10 and 272 things |
| `compare.py --old-json`, against the old tool's own `sl read --json --all` | equal in two stores; in four, two kinds of difference, below |

**What the old tool reads differently.**
- **The payload field `ref`.** The old tool takes it out of the payload, splits it at commas and gathers the parts across all of a thing's revisions. The import keeps it as text, so the new reading shows only the latest. 894 facts carry it; 53 things read fewer references than the old tool shows.
- Not a difference in the reading, but found with it: **fields `<name>_ref` hold old fact ids** (14,685 of them in 8,363 facts), which name nothing in the shadow. How both kinds of reference are carried is AD4.
- **Facts without their key field.** The old tool does not show them; the import writes them as roots, as AD2's addition (c) says. 37 here.

Nothing else differed. The platform stores have no `ref` field, which is why their comparison against the old tool was clean.

### `loops tick` covers what the answer depends on

The last piece of smaller ticks (TK13, ruled 2026-11-23). Rust only, in the CLI. No protocol rule, no vector's answer, no refusal code and nothing in `rust/core`, `rust/eval` or `rust/place` changed. `loops tick --check`, `loops emit --base`, `read` and `fold` are untouched.

| The command | Covers |
| --- | --- |
| `loops tick <spec>` | the records the spec's answer depends on, and every held record under them through `prev` and `under` **(new)** |
| `loops tick <spec> --all` | everything the store holds: byte for byte what the bare command wrote before |
| `loops tick <spec> --as-of <time>` | unchanged, byte for byte |
| `loops tick <spec> --cover <id>...` | unchanged, byte for byte |
| `loops tick <spec> --as-of <time> --slice` | the small set, taken inside the time cut and staying inside it **(new)** |

`--slice` alone is the bare command said out loud. `--all` with any other selector, and `--slice` with `--cover`, are usage errors.

**Run by the coordinator on the changed binary**, the two examples of the TK13 entry:
- Six backups and 40 notes: the bare tick lists 6 ids in 1,134 bytes; `--all` lists 47 in 3,471; the result hash is the same; a second bare tick does not cover the first.
- After the first backup is voided by a record of another kind, the bare tick over `current` lists 7 ids and answers 5 and 615, as `loops fold` does. Each tick checks `same`.

**A tick can list a record as read without its payload when the record that erased it is not covered.** margins-claude raised this. It happens to a record the tick holds only because another record builds on it or replaces it: the answer needs its envelope and not its payload. Tried with two stores: the laptop erased the voiding record's payload and made the tick (7 covered, 1 withheld); the NAS held that record with its payload and never received the eraser. `loops tick --check` on the NAS: `same`.

**Measured by the worker on invented stores of 10,000 records** (release build, median of five).

| Store | The spec takes | Bare tick | `--all` | Time, bare and `--all` |
| --- | --- | --- | --- | --- |
| Records that stand alone | 10 | 10 ids, 1,309 bytes | 10,000 ids, 570,739 bytes | 203 ms, 222 ms |
| One chain of 10,000, only its last record taken | 1 | 10,000 ids, 570,738 bytes | the same | 287 ms, 276 ms |
| One keyed thing with a forked history of 2,500, among others | that thing | 2,502 ids, 143,368 bytes | 10,000 ids, 570,754 bytes | 226 ms, 252 ms |

The second row is what TK13's second row costs at its worst: a record that sits on a long history brings all of it. The third is the third row's cost: a thing read by key brings its whole history.

**Existing tests.** Nine walk tests named what a bare tick covers. Seven of them are about something else (the base of a write, a store that does not check, a nested tick) and now say `--all`; one is about the default and now expects the small set; one gained the new usage errors. No other expected output changed. The line `--all` writes is pinned against the line the binary built from main wrote before the change, for the same signer, clock and salt; so are `--as-of` and `--cover`.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** Recorded as choice 32 in `rust/PLACE.md`.
- `--slice` is kept as a flag so that the small set can be taken inside `--as-of`. `--as-of` alone still covers the whole cut.
- Which covered records are read without a payload is decided from everything the writer holds, as the two cuts do.
- An empty selection writes a tick that covers nothing.
- A tick that itself erases a record it covers can check `cannot check` at once. That was so before, for every kind of tick.
- "What `loops fold` shows" means the fold over the same store; a tick reads only the store it is written to.

A Codex worker wrote it; the coordinator reviewed it, ran the gates and the runs above, and planted one fault (the writer leaving out what is under the set), which a walk test caught.

### Ruled by Kyle, 2026-11-23: TK13

Yes to all three rows as recommended. The entry as put is in [the tick record note](notes/2026-11-21-tick-record.md#tk13-what-a-tick-covers-when-you-name-no-cut).

1. **`loops tick <spec>` with no cut named** covers the records the spec's answer depends on. `--all` covers everything the store holds, as the bare command did until now.
2. **The set also holds everything under it:** every held record its records build on, through `prev` and `under`, all the way down.
3. **A spec with a slot that reads things by key** covers every record of each thing a source touches, with what erases them and what they name in `prev`.

The part that works the set out was on main and already followed rows 2 and 3. The verb follows since the entry above. `--as-of` and `--cover` keep their meaning.

### The slice family's fold reads the records as held

A correction to the comparison below, from margins-claude after running the selector on sl-py's own stores. `rust/eval/src/slice.rs` only: no verb, no record's bytes, no vector's answer and no case of the fixed seed changed.

The Rust evaluator took the selected records from the settled whole, where an erased record has already lost its payload. So its fold over the selection could not differ from the whole by an eraser left out. Now the fold reads the selected forms as they were given, and settles only those. The tick is still made from the settled records, as `loops tick` makes one: a record held only as a target can be erased by a record the selection rightly leaves out, and a tick that listed it as open could not be checked.

- With a fault planted in the selector (no eraser of a keyed thing's other records), the evaluator answered all 1,440 of sl-py's pairs without an error before this change, and refuses 70 of them after it. The fuzz run itself did stop on that fault before, through its comparison of ids with the JavaScript, never through a fold.
- The fixed seed is unchanged: 488 cases, 1,628 arrival orders, none differs.
- On the selector as built, nothing differs. `sl-py/slice_rust.py` in margins puts 10,800 pairs of a spec and a store through it (things written by two replicas that sync, plain and anchored writers, refused records that a later record names): the ids equal the ones sl-py works out from the law in every pair, and sl-py's own fold over them equals its fold over everything. The same holds on 1,548 inputs bent into shapes the generator does not make (a record naming itself, a cycle, a `prev` to an id not held).

### The selector, compared on generated stores

The second piece of smaller ticks. A new family of the fuzz runner, `slice`, and an input kind of `loops-eval` for it. `rust/core/src/slice.rs` did not change; no verb, no record's bytes and no vector's answer changed. The existing fuzz seeds give the same corpus as before, file for file.

```
node interop/fuzz/run.mjs --family slice --seed slice-ci-1 --n 384 --out <dir>
```

For each generated spec and store, in every arrival order, and for both closure policies, the Rust:
- folds everything, and folds only the records the selector returns, and compares the canonical result bytes and the result hash;
- makes a tick over the selected records and checks it against the whole input: it must answer `same`.

**The fixed seed, run in CI** (19 s on a debug build):

| | |
| --- | --- |
| Cases, arrival orders | 488, 1,628; none differs |
| Specs with no keyed slot, mixed, only keyed slots | 165, 158, 165 |
| The selection is smaller than the store | 90 cases without the downward closure, 81 with it |
| The frozen JavaScript's own set of ids | equal to the Rust's in 486 cases; in 2 it is smaller and contained in it, as the keyed rule here allows |

**It cannot pass by selecting everything.** For each class of record the selector returns, the run counts the cases where leaving that class out loses a record, and asserts each count is above zero: a taken record 99, its eraser 4, its target 7, a successor 28, a successor's target 3, a keyed thing's other record 14, that record's eraser 4, its target 1, the downward closure through `prev` 6 and through `under` 11.

The coordinator planted one fault (the selector ignoring successors): the run stopped at its fifth case with a mismatch and the file to replay it.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- The comparison is a family of the existing runner, so CI uses the same `loops-eval` binary as the other families, and one case can be rerun with `--case <draw>:<step>`.
- Draws the generator marks as deliberately malformed are skipped (53 of them).
- The JavaScript's set is asked for through its test file's own functions without changing any file under `interop/js`.

GitHub's CI was switched off the same day at Kyle's word (the workflow is disabled, not removed); the step mirrored into its file does not run there.

A Codex worker wrote it; the coordinator reviewed it, ran the gates and the planted fault.

### The records a spec's answer depends on: the selector

The first piece of smaller ticks ([TK13](notes/2026-11-21-tick-record.md#tk13-what-a-tick-covers-when-you-name-no-cut)). Rust only, in `rust/core`: a new module `slice` with one public function, and its tests. Nothing calls it yet, so no verb, no record's bytes and no vector's answer changed.

```rust
pub fn spec_slice(spec: &Spec, settled: &[Record], closure: Closure) -> Vec<Digest>
```

Given a spec and the records held (or a cut of them), it returns the ids a reader needs to get the spec's whole answer, by the laws `spec.slice` and `keyed.spec-slice`:

- every record a source takes, by `kind`, `about` and `of`, before any slot's test;
- every record that erases one of them;
- every record one of them names in `prev`;
- every record that names one of them in `prev`, and what such a record names in `prev`;
- for a spec with a slot that reads things by key: every record of each thing a source touches, with what erases them and what they name in `prev` (TK13 row 3, recommended column);
- with `Closure::Downward`: also every held record under those, through `prev` and `under`, all the way down (TK13 row 2, recommended column). `Closure::Exact` leaves that out.

**Tested on invented fixtures.** Each asserts the exact ids under both policies, and that the fold over the selected records gives the same canonical result bytes and the same result hash as the fold over everything. The voided backup of TK13 is one: the six taken records alone answer 6 and 1,027, the seven selected and the whole store both answer 5 and 615. For each class of record above, one test fails when that class is dropped; the worker dropped each in turn, and the coordinator dropped one more (a successor's other target) and saw its test fail.

**Not yet:** a comparison over generated stores and specs, and the flag that asks `loops tick` for this set. Both follow.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- A named record that is not held selects nothing and is not an error.
- A tick among the taken records is one record; the ids in its payload select nothing.
- The ids come back in the order of the input.

A Codex worker planned and wrote it; the coordinator reviewed it and ran the gates.

### Three fixes before the first real import

The import and the store list were tested on Kyle's newer stores only. Neon checked them against an older group of his stores and found three faults; Kyle passed them on, and the coordinator confirmed each on copies. No protocol rule, no record's bytes for a given draft, no refusal code and no vector changed.

- **An old fact id is no longer required to be 26 characters.** Older stores hold ids of 36 characters beside them: 99 facts in three of the stores looked at, which stopped the export at once. An old id is now text of 1 to 128 printable ASCII characters without a space, and unique within its store. The same rule is in the exporter, the Rust reader and the comparison tool; anything else is `shadow-source-invalid`, naming the line. The old id finds a fact's reservation in the journal and is never part of a record's bytes, salt or id, so no existing expected line changed.
- **The vertex reader skips two more blocks.** A top-level `observers` block (who may write, and their keys) and a top-level `sources` block (the files that feed the store) are recognized and skipped, as `edge` and `lifecycle` are inside a kind. Neither changes which record a fact becomes. Seven of the eight single-store vertex files looked at carry one. `combine`, `discover` and anything unknown are still refused, naming the line.
- **A fold started in a group's directory reads the list there.** AD1's list kept with a group of stores was found only from inside a store: beside its `.loops/`, or one directory up. In the layout the list was ruled for, the group's own directory is inside no store, so `loops fold combined.json` run there was refused `store-unknown`. Now, when a read starts in a directory that is inside no store, `stores.json` in that directory is the group's list. Only that directory is looked in, never one further up. Its place in the order is unchanged: above the per-user list, below `--store`. Inside a store nothing changes. This adds a third place to the two in the ruling as recorded; Kyle passed the finding on, and it is his to overrule.

**Run by the coordinator on copies of six older stores** (counts only), with the fixed exporter and an optimised build.

| Step | Result |
| --- | --- |
| Export | all six exported; before the fix three stopped on their ids and five on their vertex |
| `loops shadow-import --check-only` | 11,072 facts read, 11,047 would be written, none refused; 25 of kinds the vertex does not name left out; 37 without their key, written as roots; 14 old ticks left out |
| The import | 11,047 records in 14 s; every shadow passes `loops check` |
| A second run | nothing written; 1.4 s |
| `compare.py`, each store | 35, 10, 272, 122, 1,021 and 5,021 things, every one equal in every field; exit 0 each; 18 s for the largest |

Two things seen and left as they are:
- A build without optimisation is far slower here: the second run took 72 s and the largest comparison over ten minutes. Use `cargo build --release -p loops-cli`.
- One vertex file of that group names a keyed kind that starts with an underscore. Such a kind cannot name a thing, so the import would stop on that store. The store is not on this machine and was not tried.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- More than one `observers` or `sources` block is not refused. Each must be a block without arguments, and its inside must be well formed.
- A refusal of an old id names the line of the export and not the id.
- The import still pins the hash of the whole vertex file, so an edit to an old `.vertex`, even to a comment, refuses the next run (`shadow-state-mismatch`). Whether it should pin only the kinds is asked of Kyle.

A Codex worker wrote the fixes; the coordinator reviewed them, ran the gates and made the runs above.

### Ruled by Kyle, 2026-11-23: AD3

Both rows for the recommended column. The entry as put is in [the adoption note](notes/2026-11-22-adoption.md#ad3-two-details-of-the-import).

1. **A kind the vertex does not name, brought in with `--include-unnamed`:** each such fact is a root. Nothing overlays, and no thing `<kind>:<name>` is made for it. Left out by default, as AD2's addition (d) says.
2. **The old time:** the stored number of seconds is rounded once to the nearest microsecond, ties to even, and written as `occurred` with trailing zeros trimmed.

The build followed both since the import's first piece, so no code, no record and no expected output changed. What the first real import still waits on is in [ROADMAP.md](ROADMAP.md).

### The shadow import: the comparison tool

The last of the import's four pieces (AD2). `tools/shadow/compare.py`, Python standard library only. It changes no store and no Rust.

```
python3 tools/shadow/compare.py exports/workshop.facts.jsonl exports/workshop.map.json shadows/workshop
```

- **The old reading is worked out from the export alone:** the facts of a keyed kind grouped by their key, in the old store's order, a later fact setting the fields it carries. The old tool is not needed. With `--old-json`, the old tool's own answer (`sl read <vertex> --json --all`) is compared too, so a difference between the two old readings is seen.
- **The new reading** is `loops check`, then `loops ls <kind>: --fields …` on the shadow store.
- **It prints counts only**, for the store and for each kind: things old and new, equal in every field, differing, only old, only new, fields in conflict, things with more than one head, records against facts. No payload, name or id is printed unless `--show <n>` asks for field names of up to n differing things. Exit 0 when nothing differs, 1 when something does.
- **Several stores:** with `--also`, it also counts the things held by more than one source and how many of them read with more than one head across the shadows.

**Run by the coordinator on the scratch import of four real stores** (counts only).

| Compared | Result |
| --- | --- |
| The hub store | 825 things, all equal in every field; exit 0 |
| A second store | 243 things, all equal; exit 0 |
| A third store | 160 things, all equal; exit 0 |
| A shadow that had since gained three imported facts and one record written by hand, against its first export | 4 things only new; exit 1 |
| The hub store with the second store | 17 things held by both, 17 with more than one head; exit 1 |

Each line is what the earlier hand comparison found.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- Fields the old tool adds to its own answers (counts and times with a leading underscore) are not compared.
- A conflict counts as a differing field also when its setters carry one value.
- Roots are matched by kind and whole payload, since an export and a shadow share no id for them.
- Across stores, the old reading merges every source's facts of a thing by their time, then their place in the old order.
- The output is one JSON object.

A Codex worker wrote it; the coordinator reviewed it, ran the gates and made the runs above.

### `loops shadow-import`: the verb and its journal

The third of the import's four pieces (AD2). Rust only, in the CLI. No protocol rule, no record's bytes for a given draft and no vector changed; `emit`, `emit -`, `tick` and `erase` write what they wrote. It follows the recommended column of [AD3](notes/2026-11-22-adoption.md#ad3-two-details-of-the-import) until Kyle rules it, and nothing real has been imported outside scratch.

```
python3 tools/shadow/export.py old/workshop.vertex --output-dir exports
loops shadow-import group.json --check-only     # the counts, nothing written
loops shadow-import group.json                  # the import
```

A group file names each source (its exported facts, its map, the new store it goes to) and one private directory for the import's own state. Each destination must already be a store (`loops init`).

- **It checks the whole group before it writes.** One refused fact in any source means nothing is written to any store; the refusal names the source, the fact's place in the old order, the old id and the reason.
- **It answers with counts:** facts read, written, already imported, left out because the vertex does not name their kind, without their key, with an empty observer, things held by more than one store and things that read with more than one head across the stores.
- **A second run writes nothing**, byte for byte. A later run on an old store that has gained facts writes exactly those.
- **A changed, removed or reordered earlier fact, a changed map or a changed flag is refused** (`shadow-state-mismatch`). So is a destination that holds a record the import did not write: a shadow store is the import's alone until cut-over.
- **The same old id in two sources** gets one salt and one `emitted`, so equal histories give one record (AD2, row 8); the same old id with different contents is refused (`shadow-id-conflict`).
- **Its state is private:** a journal, a lock and the import's own signing key, in the directory the group names, readable by the owner only. The journal reserves each record's salt, time and expected id before a batch is written, and marks the batch done after. An interrupted run is finished by the next one with exactly the records an uninterrupted run would have written (tested at three points).
- **It does not call the filler.** Each destination is read once; `prev` and `sets` come from one pass over the facts, in batches of at most 1,000 records or 4 MiB.

**Run by the coordinator on a copy of four real stores** (counts only; the stores are private).

| | |
| --- | --- |
| Facts read | 2,912 |
| Left out, of kinds a vertex no longer names (addition d) | 425 |
| Written | 2,487, each store passing `loops check` |
| With an empty observer, imported without a mention (addition a) | 188 |
| Second run | 0 written, 2,487 already imported, every segment and state file byte-identical, 0.31 s |
| Things read across the hub store and one other, against the old tool's combined reading | 1,034 of 1,051 the same in every field |
| The other 17 | held by both stores under different old ids, of a kind both vertices name: two heads, as row 8 says, where the old tool gave the later value |
| Things read across the hub store and a second other | 985 the same in every field; 71 that the old tool showed are not there |
| An old store that gained three facts | 3 written |
| An earlier fact changed in the old store | refused, nothing written |
| A record written by hand into a shadow store | the next import is refused |

The 71 are a consequence of addition (d) worth knowing. The hub store holds old facts of a kind its own vertex no longer names. The old tool showed them all the same in a combined read, because the other store's vertex names that kind. The import leaves them out, as ruled.

The worker's scale run: 20,000 invented facts over 2,000 things in 3.3 s, 72 MiB at peak, 20 segments, one read of the destination.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 31 of `rust/PLACE.md`.
- The verb is `shadow-import`; `loops import` already means taking in signed lines.
- New refusal codes of the CLI: `shadow-source-invalid`, `shadow-map-invalid`, `shadow-id-conflict`, `shadow-state-mismatch`. The writer's own codes are used where the writer has one.
- `emitted` is taken from the clock when an old id is first reserved, not once for the run.
- `--check-only` creates no key, journal, lock or segment.
- A record whose payload was erased from a shadow store still counts as imported; a rerun does not bring the payload back.
- Recovery promises what the store writer promises today and no more: nothing is said about power loss.

A fault planted by the coordinator (a changed earlier fact no longer noticed by its fingerprint) was caught by two walk tests.

A Codex worker wrote it; the coordinator reviewed it, ran the gates and made the runs above.

### The shadow import: the exporter and the mapping

The first two of the import's four pieces (AD2, ruled 2026-11-23, in [the adoption note](notes/2026-11-22-adoption.md)). Nothing here writes a store yet: the verb, its journal and the comparison tool follow. The mapping follows the recommended column of [AD3](notes/2026-11-22-adoption.md#ad3-two-details-of-the-import) until Kyle rules it.

**The exporter** (`tools/shadow/export.py`, Python standard library only). Given an old `.vertex` file it writes two files into a directory of its own: `<name>.facts.jsonl`, every fact of the old store in the order the store took them in, and `<name>.map.json`, which kinds the vertex reads by a field and which it collects. The Rust import reads those two files and never the old store. The formats are in `tools/shadow/FORMAT.md`.
- The old store is opened read-only in one read transaction, and its bytes are the same afterwards (tested).
- Order is `(arrival_ordinal, arrival_seq)` where the store has both columns and `rowid` where it has neither (AD2, addition b).
- A payload travels as the old store's own JSON text, byte for byte. The time travels as the 64 bits of the stored number.
- The file ends with a count and a running digest, so a cut-off export is refused.
- The vertex reader is strict: it knows `name`, `store`, a kind's `fold { items "by" "<field>" }` and `items "collect" <n>`, and it skips `edge`, `lifecycle`, `search`, `preview`, `boundary` and comments. Anything else, a `combine` vertex among them, is refused with its line. The map is written for a person to read before an import.

**The mapping** (`rust/cli/src/shadow/`). One old fact becomes one draft: `of` is `<kind>:<key>` for a keyed kind, `occurred` is the old time to the microsecond, `about` is `observer:<name>` unless the observer is empty, the payload is untouched. For a revision, `sets` is every field the payload carries and `prev` is the thing's first record, its last record and the last record to set each field, worked out in one pass over the facts. The filler is not called.
- **Checked against the filler:** for generated histories the prepared lines equal, byte for byte, what `loops emit - --fill` writes one line at a time with the same key, salts and times (48 runs of the real command, across batch boundaries).
- **It stops and does not guess** on a key field that is empty, `null` or not text; a keyed kind that is not a single reference prefix, or is `r`; a fact whose kind is `tick`; a payload that is not an object; a repeated member name; a number out of range; a time outside years 0000 to 9999. A defect in a fact that is left out anyway (a kind the vertex does not name) is counted and does not block.

**Run by the coordinator on a copy of four real stores** (counts only): the exporter read all four vertex files and refused the two `combine` vertices; it exported 2,912 facts, found the 425 facts of four kinds one vertex no longer names, and left every source file's bytes unchanged; two exports of one store were identical. Two faults planted in the mapping (the first record dropped from `prev`; the key field left out of `sets`) were each caught by three tests.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7) and will be choice 31 of `rust/PLACE.md` when the verb lands.**
- The exporter refuses a store with a write-ahead file beside it unless told the copy is quiescent (`--quiescent-copy`); it never overwrites an earlier export.
- The export and the map are bound by the vertex file's SHA-256.
- An old fact id is 26 characters and unique in its store; nothing more is asked of its spelling.
- `loops_eval::parse_writer_payload` is now public (the existing reader that carries an out-of-range number to the writer's own refusal). No decoder behaviour changed.
- A new CI job runs the exporter's tests.

A Codex worker planned and wrote it; the coordinator reviewed it, ran the gates and made the runs above.

### Reads across stores: a spec finds the stores it names

Ruled on 2026-11-23 (AD1, in [the adoption note](notes/2026-11-22-adoption.md)) and built the same day. Rust only: the CLI, and one function in `rust/place`. No protocol rule, no record's bytes and no vector changed. `loops tick` and `loops tick --check` stay on the one store in the directory and ignore store names, as before.

`loops read <vertex>` and `loops fold <file | ->` now open every store the spec's sources name, put their checked lines together, and then settle, admit and run the spec once over that union. A record held by two stores counts once; an opening in one store and its eraser in another read as they would in one store.

A real run on the built binary, the example of AD1. `workshop` holds one task and one note, `yard` one task; the spec `morning` has the sources (`workshop`, kind task) and (`yard`, kind note) and counts.

| Run | Answer |
| --- | --- |
| In `workshop`, nothing bound | `refused: store-unknown: workshop`, nothing on standard output, exit 1 |
| With `--store workshop=. --store yard=../yard` | 3 |
| With a `stores.json` in the directory that holds both stores, from `workshop` | 3 |
| The same, from `yard` | 3 |
| `yard` bound to a directory that holds no store | `refused: store-unknown: yard: <directory>` |
| A spec naming `.`, nothing bound, in `workshop` and then in `yard` | 2, then 1 |

Before this, the same spec answered 2 in `workshop` and 1 in `yard`, and a name bound to nothing was read from the current directory.

**How a name is bound.** Name by name, the nearest wins:
1. `--store <name>=<dir>` on `read` or `fold`, repeatable. A relative directory is taken from the directory `-C` gives.
2. A `stores.json` in the directory that holds the current store's `.loops/`, or else in that directory's parent. Nowhere further up, so a stray file higher in the tree cannot redirect a read.
3. The per-user list, `$XDG_CONFIG_HOME/loops/stores.json`, else `~/.config/loops/stores.json`.
4. The name `.` is the store the read starts from, when nothing above binds it.

A list is one JSON object of names and directories; a relative directory is taken from the list's own directory.

**Implementer choices. One of them changes what a read answers and is Kyle's to overrule; the rest stand under his ruling of 2026-11-21 (W7).** The full list is choice 30 of `rust/PLACE.md`.
- **The name `.` means the current store, at the lowest precedence.** The coordinator's first brief had no implicit name, as AD1 was put. Building it showed the cost: after `loops init` and an emit, `loops read <vertex>` was refused until a list was written, and every existing test spec names `.`. The design page already says a vertex kept in `.loops/vertices/` defaults to `from "."`. No other name is implicit: `lab` bound nowhere is refused also inside a store. Outside any store, an unbound `.` is refused like any other name.
- **The list kept with the stores is looked for in two places only**, the store's directory and its parent.
- **A bound directory must itself hold `.loops/`.** There is no upward walk from it, and a directory that holds no store is refused `store-unknown`, with the directory in the message.
- **Several unbound names:** the first in the spec's source order is named.
- **Two names bound to one directory** open it once.
- **A malformed list is a usage failure that names the file** (exit 2), not `store-unknown`. Both lists are read even when `--store` covers every name.
- **A store that does not check:** the read answers from the lines that checked and is then refused `store-not-clean`, as before; the message now ends with the names of the stores concerned, `(stores: yard)`. On a single store this adds `(stores: .)` to a message that had no such ending.
- `--store` on any other verb is a usage error.

Checked beyond the tree's tests: on a copy of two real stores, a fold across both with `--store` gave byte for byte the answer of a fold over one store made by importing both; a fold across three stores of about 2,900 records took 0.28 s. A fault planted in the precedence (the per-user list winning over the list kept with the stores) was caught by a walk test.

**What breaks, and is held back for it.** A spec that names a store other than `.` is now refused until the name is bound. rex-tools names its store `rex-chat` and uses the release binary built from main, so that binary is not rebuilt until rex-tools passes `--store`.

A Codex worker wrote it in two rounds; the coordinator reviewed both, ran the gate and made the runs above.

### Ruled by Kyle, 2026-11-23: AD1 and AD2

Each was an entry in `DECISIONS.md`, with an example. Kyle ruled both in the coordinator's session, after a trial import of a copy of four of his old stores. The entries as put, the additions and the trial's counts are in [the adoption note](notes/2026-11-22-adoption.md).

**AD1: how a spec finds the stores it names.** Option A for both halves, with two additions.
- A store name in a spec's `from` is bound to a directory in a per-user list (`~/.config/loops/stores.json`). The spec travels unchanged; each machine says where its stores are.
- A name bound to nothing refuses the whole read: nothing on standard output, and a refusal that names the store, with the new code `store-unknown`. A missing store is never read as an empty one.
- **Added: `--store <name>=<dir>` on the command** binds a name for that run and overrides the lists.
- **Added: an optional `stores.json` kept with a group of stores.** It binds names for a hub store and the stores beside it, so a directory of stores that refer to each other reads the same wherever it is copied.
- Unchanged: a read across stores takes the union of the named stores first (W1). `loops tick` and `loops tick --check` stay on the one store in the directory.
- Left to the implementer: where the list kept with the stores is looked for, and which binding wins when two sources bind one name. Both are in the entry above.

**AD2: how an old store becomes records.** The recommended column in all eight rows.
1. A fact of a kind the vertex reads by a field is of the thing `<kind>:<value of that field>`. A later fact of the same key is a revision: it names what is live in `prev` and sets the fields it carries.
2. A kind the vertex collects is a root.
3. Revisions follow the order in which the old store took the facts in.
4. The old time becomes `occurred`. `emitted` is the time of the import.
5. A key made for the import signs.
6. The old observer is a mention, `observer:<name>`. The old id is kept in a file beside the import, which also makes a second run write nothing. The payload is the old payload, untouched.
7. The old tool's ticks are left out and counted.
8. A fact held by two old stores is imported into each, with the same salt and time for the same old id. Where the histories differ they are two records, counted.

With four additions:
- **(a)** An old fact with an empty observer is imported with no observer mention.
- **(b)** The order of row 3 is the old store's arrival number where it keeps one, and its row order where it does not.
- **(c)** A fact of a keyed kind that lacks its key field is a root, and is counted.
- **(d)** A kind the vertex does not name is left out by default and counted; a flag brings such kinds in. This amends row 2 for them. A store can still hold the facts of kinds that were moved to another store, and importing them would bring a stale second history of each thing into every read across the two.

**What the trial showed** (counts only; the stores are private). 2,912 facts were imported with none refused. For each of the 1,881 things held by one store, the new reading equals the old tool's in every field. For 226 things held by two stores the old tool gives the later value and the new one reads two heads; (d) removes 209 of them, and the 17 that remain are of a kind both stores name.

## 2026-11-22

In brief:
- The model's prefix at a time is strict, as `loops tick --as-of` is: a record emitted at the time itself is not in it.
- The base lemma is in the model as `keyed.base`, with a correction: an emit against a base keeps the store's names anchored only when the base is closed downward. A witness shows what breaks when it is not.
- A fuzz run compares the model and Rust on ticks, with pairs of faults generated on purpose. Its first version agreed on 20,160 cases and missed a fault planted in Rust; the rebuilt one catches every planted swap tried. margins-claude's Python agrees with Rust on 80,000 more cases.
- The tick has its mutation catalogue: 91 deliberate faults, each caught by something that runs. Five were not caught at first; four vectors and a check were added for them.
- The adoption step has started: `loops ls` lists a store's kinds and things, and `loops --version` says which `loops` this is. Its plan has eight pieces; two need Kyle first (AD1, and the import of the old stores).
- `loops emit --base` fills against what the writer read, a tick or named records, so a stale write shows as a conflict and does not silently replace a setter the writer never saw.
- `loops ls --fields name,status --plain` is the Monday-morning read without a spec: a plain-text view, asked for explicitly, on `ls` and `of`.
- A read remembers which segments it has checked: on a 9,000-record store a fold goes from 0.53 s to 0.24 s. `loops check` still checks everything.
- `loops read` and `loops fold` take `--plain` too: a spec's result as text, for every result shape.
- `loops tick` can cover a cut: `--as-of <time>` for the records emitted before a time with what they build on, `--cover <id>` for named records with what is under them.
- Issue 11 is done: `loops emit -- "--text"` and `loops whoami --init`. The plain view shows a conflict's values and prints record ids as short prefixes that can be typed back.
- The roadmap's last two small pieces: the JavaScript sum is unbounded, as the law index said it was, and the fuzz gives lists, objects and `null` to the `fold`, `realm` and `scenario` families: 24,576 cases agree three ways.
- Kyle ruled TK10 (seven details of `loops tick --check`, each as recommended) and TK11 (a write against a base that does not hold what is under it: option C). Both were already built that way, so no code changed.
- **Kyle closed step 4 (ticks)**, and ruled that `loops tick --check` exits 0 only for `same` (TK12), as built. Adoption is the step in hand; what is left of it waits on AD1 and AD2.

### Step 4 closed, and TK12

Ruled by Kyle on 2026-11-22, in the coordinator's session, after TK10 and TK11 (the entry below).

**Step 4 meets its exit criterion and is closed.** The step was done when a content tick recomputes to the same hash on two machines. That has held since 2026-11-21, in the tree's tests and on real stores: the laptop's tick over the six backups checks `same` on the NAS (the entry of 2026-11-21 has the run).
- Built in the step: the result codec; the tick record in the model, with its laws, vectors and `protocol/tick.md`, and in Rust; `loops tick <spec>` and `loops tick --check <id>`; a tick over a cut, by time or by ids; `loops emit` copying `occurred`, the filler on a changeset, and the filler against a base; the tick's fuzz run and its mutation catalogue.
- Not built, and never in the exit: boundaries, markers, the runner, and what verifying a deep tick tree costs. They come back when something wants them.
- No separate verb shows a result hash. A tick carries its result's hash, and the roadmap lists the verb as a small piece.
- The JavaScript was frozen as a trial for step 4 (W3), to be looked at again when ticks are done. That look is now due; the roadmap says so.

**TK12: the exit status of `loops tick --check`.** 0 only for `same`. `differs`, `cannot check` and "not a tick" exit 1, with the answer on standard output and nothing on standard error, so `loops tick --check <id> && …` is safe in a script. This is what was built (choice 22 of `rust/PLACE.md`). The entry as put is in [the tick record note](notes/2026-11-21-tick-record.md#tk12-the-exit-status-of-the-check), section 11.

Open in `DECISIONS.md` after this: AD1 and AD2. Kyle is still weighing both; nothing else that is ruled is unbuilt. He ruled both on 2026-11-23.

### Ruled by Kyle, 2026-11-22: TK10 and TK11

Each was an entry in `DECISIONS.md`, with an example. Kyle ruled both in the coordinator's session. The entries as they were put are kept in [the tick record note](notes/2026-11-21-tick-record.md#11-the-later-questions-as-they-were-put), section 11.
Both were built to their recommendations before the ruling, so it changed no code, no vector and no record.

**TK10: seven details of `loops tick --check`.** Each row for its recommendation.
1. A payload erased here is not read, also when its bytes are still in an old segment. The check reads what the store's own reading gives: `cannot check`, 1 payload not held.
2. A tick that covers an eraser and leaves the erased record out of `withheld` is not a tick, at once (`tick-withheld-erased`), also on a machine that lacks other covered records.
3. For a tick made under a later version of the rules, the check tests only what no version changes: the members, the two id lists, and that `spec-hash` fits the label for that version. Then `cannot check: made under newer rules`. It does not parse the spec or judge the result's shape.
4. A result that no fold could give (6 runs and five ids listed) is `differs` once the records are held. The reader checks a result's shape and spelling, and nothing about whether its parts agree.
5. `rules` is a positive whole number as decimal text with no leading zero, compared as a number. Anything else is not a tick.
6. A `spec` that is not an object is not a tick. A spec this binary's parser refuses, with a fitting hash, is `cannot check: this binary cannot read the spec`.
7. For `rules` above its own, a binary checks that `result-hash` is spelled as a hash and does not ask whether it fits. For its own version and older ones it requires the fit.

**TK11: a write against a base that does not hold what is under it.** Option C. The filler names the live records of the base together with what is under them in the store, and says on standard error how many records it named that the base did not hold. It never refuses. A value the writer was not shown can still be replaced; the envelope names what was replaced and the line tells the writer. Refusing such a write (option A) belongs with the strict store's policy, which Kyle left for step 3.

Open in `DECISIONS.md` after this: S4 (closing step 4), TK12 (the exit status of the check), AD1 and AD2. The first two were ruled later the same day (the entry above).

### The JavaScript sum, and lists in three more fuzz families

The last two of the roadmap's small pieces.

**The JavaScript sum is unbounded.** The law index said the model, the JavaScript and Rust all sum with unbounded integers. That was false of the JavaScript: it refused with `sum-overflow` past a signed 128-bit sum. The guard is removed, which removes a difference from the model; the JavaScript is frozen for new features only (W3). A sum started at 2^127 − 1 with 2 added gives 170141183460469231731687303715884105729 in all three, and each has a test for it. No vector could reach the old limit: from zero it needs more than 2^74 records.

**Lists, objects and `null` in the `fold`, `realm` and `scenario` fuzz families.** They were generated for `spec/run` and `result` only, though since the payload reading every fold reads a list as a set. The three families now draw payload values as `spec/run` does.

- **Campaign:** 24,576 cases over three seeds (`lists-fold-1`, `lists-realm-1`, `lists-scenario-1`), three ways: 21,548 answers agree, 3,028 are malformed inputs every implementation's decoder refuses, none differ. The inputs held 41,632 lists, 6,972 objects and 6,679 nulls. The coordinator ran 4,500 more with seeds of its own: none differ.
- **What no longer reproduces.** The three families' generated inputs changed for every seed, so the 17 earlier campaigns that mixed families cannot be regenerated case for case in those families. Their retained evidence is kept as it was and is history; the other families and the tick lane generate byte for byte what they did (55,040 and 66,816 inputs compared).

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- The JavaScript's record-facing sum still answers a JavaScript number while the sum is a safe whole number, and a big integer past that, as before.
- In the widened families a record's structured value is the same in every form and arrival order, and `n` and `score` alternate so ordinary numeric and missing-field cases stay covered.

A Codex worker wrote both; the coordinator reviewed them and ran the extra cases.

### Three small CLI pieces: issue 11, and two gaps in the plain view

**`--` ends `emit`'s options** (issue 11, from the outside user). `loops emit message "--leading-dashes"` was a usage error, since every token starting with `--` was taken for a flag. Now `loops emit message -- "--leading-dashes"` writes the text. Before `--` nothing changes.

**`loops whoami --init`** (issue 11). An agent given its own key file could not learn its identity before its first record: `whoami` refused with "the first emit makes one". `whoami --init` makes the key exactly as the first emit would, prints the `k:…` id, needs no store, and prints the same id again when the key exists. Plain `whoami` is unchanged.

**The plain view, after using it.**
- A conflict shows what each side says, in the setters' order: `conflict (2): "9003" | "9002"`. A side whose payload is not held shows `unknown`. Long values are cut; `loops of` without `--plain` has them whole.
- A record id prints as its shortest prefix that is unique in the store, eight digits or more: `r:lde1lssu`. `loops get` and `loops of` take such a prefix, so what is printed can be typed back. A root no longer makes a wide first column.
- A keyed latest-by without `--values` prints each thing's headline beside its name.

The JSON answers of every verb are byte for byte what they were: 2,219 commands over 131 stores were compared, and the signed records of the existing write commands too.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** Choice 29 of `rust/PLACE.md`, and amendments to choices 25 and 27.
- `whoami --init`, not a verb of its own: it is the identity lookup with the making added.
- After `--`, `--json` is text like any other token. `loops tick <spec> --` takes nothing after it.
- A prefix is unique against every record the store holds, not only those shown.

A Codex worker wrote them; the coordinator reviewed them, joined them with main (the argument parser by hand, where it met the tick's new flags) and tried each.

### `loops tick` over a cut: `--as-of` and `--cover`

Ruled on 2026-11-20 ([the cut note](notes/2026-11-15-the-cut.md), sections 1 to 3) and built on 2026-11-22. Rust only, in the CLI. Without the flags `loops tick` covers everything held, byte for byte as before.

- `--as-of <time>` covers the records emitted before the time, and every record they build on through `prev`.
- `--cover <id>`, repeated, covers the named records and every record under them.
- The payload is the ordinary one. `covers` names the records outright and nothing in it says how they were chosen.

**A real run, on the binary built from this change.** Two nights of three backups, the first night 412, 3 and 88 megabytes:

| Command | Covers | Result | Checked in that store |
| --- | ---: | --- | --- |
| `loops tick backups.json --as-of 2026-11-17` | 3 | 3 runs, 503 | `same`, closure `yes`, 3 taken and not covered |
| `loops tick backups.json` | 7 (the six and the tick above) | 6 runs, 1027 | |
| `loops tick backups.json --cover <the second jellyfin backup>` | 2 (it and the first, which it revises) | 2 runs, 831 | `same`, closure `yes`, 4 taken and not covered |

**Two questions the worker stopped on, both answered by the ruled note.**
- **A record emitted exactly at the time is out.** The note says the bound reads as `below` does. The model's `upTo` took the time itself in; margins-claude made it strict the same day (!95), and its laws go through unchanged.
- **A cut follows `prev` only.** The ruling is "a part closed downward over `prev`", and the note leaves `under` for standing. So `--cover y`, where `y` is under a grant outside the cut, covers `y` alone and checks `same` with closure `no`: the check's closure report counts `under` targets and a cut does not. "Closure no" therefore does not mean "not a cut"; saying which kind of target is outside is a refinement not built.

**An erasure after the cut** behaves as the note's section 4 says: a tick as of a time before the erasure covers the erased record, lists it in `withheld`, counts its envelope and leaves its payload unread; it checks `same`.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 28 of `rust/PLACE.md`.
- `--as-of` takes an instant or a date; a date means its start. `--as-of` with `--cover` is a usage error.
- The cut is computed in the CLI: it chooses what `make_tick` is given, and the tick's codec is untouched.
- `--base` works beside both and still selects only the tick record's anchor.

Checked by a randomized test over stores with skewed clocks: the cut equals a plain reference computation, every such tick checks `same`, and in 24 of 32 stores the cut held a record from outside the strict prefix.

A Codex worker wrote it; the coordinator reviewed it, joined it with main and made the run above.

### The adoption step: the plain view on `read` and `fold`

The third piece of the adoption plan. `loops read <vertex> --plain` and `loops fold <spec> --plain` print a spec's result as text for a person, for every shape a result has: a count, a sum, a smallest and a largest (with "nothing read" told from zero), a collect, their grouped forms, and latest-by following `prev` or `keys`. A saved vertex and a spec file print alike.

A real run, on the made-up import store of [AD2](notes/2026-11-22-adoption.md#ad2-how-an-old-store-becomes-records): a spec with a count of open threads, a count by status and a keyed latest-by prints

```
open  0
by status
  group  done  1
  1 ungrouped
  0 not read
threads
  thing  r:6m708qdm…
  thing  thread:kiln
```

with each thing's heads under it; with `--values` each thing shows its fields, its heads' times and its `about`, by the same rules as `loops of --plain`.

- **Slots print in the spec's written order,** not the result's sorted one.
- **The same rules as the plain view of `ls` and `of`:** asked for with `--plain` only; `--plain` with `--json` is a usage error; text bare unless ambiguous; nothing relative in any JSON. The JSON answers of every verb are byte for byte what they were: 1,907 commands over 121 stores were compared.
- **A flaky test, found and fixed.** One new test failed about one run in ten: it piped a spec into a `loops` that refuses its arguments and exits before reading, and the shared test helper failed on the write. The helper now accepts that a child may exit without reading its input. Forty runs since were clean.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 27 of `rust/PLACE.md`.
- Every listed id is printed whole. A grouped slot always shows its `ungrouped` and `not read` counts; elsewhere a zero is left out.
- "Not read" says "needed payload or field unavailable": the result alone cannot tell a payload that is not held from a field that is missing or in conflict.
- Left for later, seen in use: without `--values` a keyed latest-by prints ids only, which tells a person little.

A Codex worker wrote it; the coordinator reviewed it, found the flaky test, joined the branch with main and tried it on a store.

### The adoption step: the cache of checked segments

Ruled by Kyle on 2026-11-21 (W2: yes, in the adoption step) and built as ruled, in `rust/place/src/cache.rs` and the CLI.

- **What it is.** A file per user, `checked-segments-v1` under `~/.cache/loops/` (or `$XDG_CACHE_HOME/loops/`), holding the SHA-256 of each segment that this user's `loops` checked whole and found clean. Nothing else is in it. It is never inside a store, so a store cannot bring its own.
- **What a read does.** It still reads and hashes every segment. On a hit it skips the signature verification of that segment's lines and makes every other check: shape, envelope, commitment and id, canonical line, the segment's name. A segment with a refused line, a name that does not fit its bytes, or an unterminated last line is never listed, so it is checked in full every time.
- **What never uses it.** `loops check` and `import` verify every signature.
- **The property, tested:** for the same bytes on disk, a read with the cache and a read without it give the same records, refusals, alterations, answers and exit status.

**Measured** by the coordinator on a store of 9,000 records in 20 segments, release build, medians of seven runs:

| Command | No cache | Warm cache |
| --- | ---: | ---: |
| A fold that counts | 0.534 s | 0.235 s |
| `loops ls` | 0.529 s | 0.242 s |
| `loops check` | 0.523 s | never uses it |

The worker measured 0.485 s and 0.181 s on a quieter machine. The ruling's estimate was "under 0.2 s"; it is about that. What remains is reading, hashing and parsing.

**What the ruling accepts, shown by hand.** The file is the user's own evidence. A segment with a bad signature whose digest is written into that file by hand is accepted by a plain read (`loops ls` answered, exit 0). `loops check` refuses it (`signature-invalid`), and so does the same read with no cache (`store-not-clean`). Whoever can write the user's cache directory can do this, and can already do worse to the user.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 26 of `rust/PLACE.md`.
- **The library's read is the full one.** `Dir::read()` verifies everything and reads no environment. Only the `loops` binary opts in, in one function that every answering and writing verb but `check` uses. A first version had the library look the cache up itself, and the tests would then have written into the real per-user cache; the coordinator had that taken out, and every test that runs the binary now gets a cache directory of its own. The whole test suite, run with `HOME` set to an empty directory, leaves it empty.
- `LOOPS_CACHE_DIR` names another directory; set to nothing it turns the cache off.
- A cache that is missing, unreadable, malformed or not the user's own (wrong permissions, a symlink, a path into a store) is ignored and the read checks everything. Writing it is atomic; two readers at once can lose an entry, which costs one later full check.
- A correctly named segment whose last line is unterminated reads as it did (the line is skipped, exit 0) and is never listed. The coordinator's brief had said such a segment refuses; the worker showed it does not, and no answer was changed.

**Also here: the fuzz tests build Lean once.** Four test files each started builds of the same Lean executables, so the first run after a model change failed one test and the second passed; it was seen three times. The real-Lean suites now share one entry point that builds before any test runs. Three runs on a stale build pass.

A Codex worker wrote it; the coordinator reviewed it, joined it with main, ran the suite with an empty `HOME` and made the measurements and the poisoned-cache run above.

### The adoption step: `--fields`, and a plain view on `ls` and `of`

The second piece of the adoption plan. `loops ls` takes `--fields a,b,c`, and `ls` and `of` take `--plain`.

A real run on a store from this session, a thing left in conflict by a write against an older base:

```
$ loops ls svc: --fields port,owner --plain
THING         HEAD KINDS  RECORDS  HEADS  port          owner
svc:jellyfin  svc         7        2      conflict (2)  sam
```

and on a store with one task and one note, `loops ls --things --fields name,status --plain` lists the task with `Repair kiln` and `open`, and the note with a dash in both columns.

- **`--fields` is a projection.** Each row carries those fields of the thing's keyed state. A thing that lacks a field is still listed. In JSON a field is its value with its JSON type, or unset, or not held, or in conflict with its setters.
- **One reader.** `ls` and `of` take every field from the same code, so they cannot disagree about a thing. `loops of`, `read --values` and `fold --values` answer byte for byte what they answered before: 801 commands over 96 stores were compared between the old binary and the new.
- **`--plain` is asked for, never guessed.** Without it every answer is the JSON it was, on a terminal and in a pipe alike. A script's answer does not depend on how it was started. `--plain` with `--json` is a usage error.
- **What the plain view shows.** Text prints bare. It keeps JSON quotes only where bare text would read as something else: empty text, text that parses as a number or a list, text equal to one of the view's own marks. A field that is unset shows a dash, one whose setter's payload is not held shows `unknown`, and competing setters show `conflict (2)`, never one side's value. Newlines and control characters in a value are escaped, so a payload cannot forge a row.
- **Times.** `of --plain` shows each head's `emitted` relative to one reading of the clock ("3 hours ago") and `occurred` as it was written. No JSON answer, record, result or export holds a relative time.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 25 of `rust/PLACE.md`.
- The plain view is for reading and may change; the help says so, and that scripts use the JSON.
- `LOOPS_TEST_PLAIN_NOW` fixes "now" for the plain view's relative times, for tests only. It affects nothing else.
- Left for later, seen in use: a root's full id is a wide first column, and a conflict shows how many setters compete but not their values (`loops of` without `--plain` has them).

A Codex worker wrote it in two rounds; the coordinator reviewed it, had text printed bare, joined it with main and tried it on real stores.

### `loops emit --base`: the filler against a base

Ruled on 2026-11-20 ([the cut note](notes/2026-11-15-the-cut.md), section 8) and built on 2026-11-22. Rust only: `rust/place/src/fill.rs` and the CLI. The law is margins-claude's `keyed.base`, in the model since this morning. No protocol rule and no refusal code changed. Without a base, every emit on both paths writes byte for byte what it wrote before.

`--base <tick>` takes the records the tick covers; `--base-id <id>`, repeated, names records; both may be given. They work on `loops emit`, on `loops emit - --fill`, and on `loops tick`, where the base selects only the tick record's anchor and the payload still covers everything held.

**A real run, on the binary built from this change.** One thing, `svc:jellyfin`, in a store that also has a tick T written before the peer's update:

| Step | What the store then reads |
| --- | --- |
| A peer sets `port` to 9000 | `port` 9000, one head |
| A writer who read only T sets `port` to 9001 with `--base T` | `port` in conflict between 9001 and 9000, two heads |
| The same write with no base | `port` 9002, one head: the peer's value is replaced and nothing shows it |

That is the ruling's purpose: a write against an older read shows as a conflict.

**A base that does not hold what is under it** is [TK11](notes/2026-11-21-tick-record.md#tk11-a-write-against-a-base-that-does-not-hold-what-is-under-it), open for Kyle when this was written and built to its recommended option, C. He ruled for C later the same day. The filler takes the selected records of the thing together with what is under them in the store, and tells the writer how many records it named that the base did not show. TK11's two examples, on the built binary:

- `x` sets `port` and `owner`, `y` sets `port` over it. `loops emit svc --of svc:jellyfin port=8098 --base-id y` names `x` and `y` and prints "the base did not show 1 record that this emit names". The whole store, and a store holding only the thing's live records, both read `port` 8098 and `owner` kyle with one head. With the bare base, the second store read a conflict that did not exist.
- `owner=sam` against `--base-id y` replaces `owner` kyle, which the base did not show. The line is printed and the envelope names `x`. Only refusing would stop this; that is TK11's option A, and it is one branch in the filler.

**margins-claude checked the plan against its law before it was code** and found one hole, in the coordinator's wording: a stated `--prev` outside the base named a record without what is under it. So stated `--prev` targets join the selection before "what is under it" is taken, and the count includes them.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 24 of `rust/PLACE.md`.
- Two flags, because a tick named as a record is otherwise ambiguous with the tick as a set of records.
- Everything the filler judges is judged in the base: `prev`, the keys an emit sets when "the thing is held", and the copied `about` and `occurred`. A first emit of a thing the base does not hold is a whole-read first emit, also when the store holds the thing; the CLI says "the base covers no record of" the thing.
- The base tick's payload must be held, and the envelope of every record it covers (`id-unknown` names a missing one). A covered payload need not be held. A tick under another rules version is read once the first reader accepts it.
- In a changeset, one base serves every line, and each line is filled against it and the lines prepared before.
- No warning about a stale base or a conflict: whether a store warns or declines is left for step 3.

Checked by a randomized test: 320 cases, 217 with a base that did not hold what is under it, 67 with the exact shape of TK11's first example, 118 stating a `--prev` outside the base. In every case the write equals the one a writer holding exactly the effective base would make; the thing reads the same from the store's live records as from the whole store, before and after; and the whole store reads every key as it would after the bare write.

CI: the fuzz tests' limit in the `model` job goes from 60 to 300 seconds. The tick fuzz tests added on 2026-11-22 took the run past 60 seconds on a busy runner, and this merge request's first pipeline was cut off there with every test so far passing.

**The same three properties, from outside.** margins-claude wrote the fill again over its own Python reading (`sl-py/basefill.py`, in its repository) and ran 5,000 generated stores, 12,220 writes for each of three kinds of base. The filler's write never read otherwise from the live records alone, was always anchored, and the whole store always read as after the bare write. The bare write failed 2,802 times over arbitrary bases, and never when the printed count was 0. A base that is exactly the live records of a closed part was sound in all 6,109 cases though it is not closed downward. A stated `prev` kept beside the base without what is under it failed 1,003 times even over a closed base; joined first, as built, never.

A Codex worker planned and wrote it; margins-claude checked the plan against the model; the coordinator reviewed it, joined it with main and made the runs above.

### The adoption step: its plan, `loops ls` and `loops --version`

Kyle ruled on 2026-11-21 (W1) that the adoption step's CLI pieces are built beside the tick work. Its exit is `loops` first on `PATH` for his daily work.

**The plan** (a Codex worker's, 2026-11-22), as eight pieces: (1) `loops ls`, with things and a scan by the start of a name; (2) a plain-text view with relative times, and `--fields`, on `ls` and `of`; (3) the plain view on `read` and `fold`; (4) reads across several stores; (5, 6) the import of the old stores as a shadow; (7) the cache of checked segments (W2); (8) `--version`, and the walk that puts `loops` first on `PATH`. Pieces 4 to 6 need Kyle first: [AD1](notes/2026-11-22-adoption.md#ad1-how-a-spec-finds-the-stores-it-names) is written, and the import's choices, which decide the id of every imported record, are owed as an entry. The others are the CLI's alone.

**Built: `loops ls` and `loops --version`.**

- `loops ls` answers the kinds a store holds with their counts of settled, admitted records. `loops ls --things` answers every thing: its name (a natural key, or a root's id), the kinds of its heads, its records, its heads, and its headline. `loops ls <prefix>` answers the things whose name starts with that text, literally: `task:` for natural keys, `r:ab` for roots.
- The headline is the thing's `name` when one live setter holds it as text. Otherwise it says which of three it is: absent, unknown (the setter's payload is not held), or in conflict (several live setters). It never shows one side of a fork.
- A real run on the stores of the entries below: the laptop of the tick example answers `backup` 6 and `tick` 2; a store with `task:kiln` answers its headline "Repair kiln"; the thing left with two heads by a write against a bare base answers 2 heads.
- On 10,000 records in 2,000 things, `loops ls` takes 0.58 s and `loops ls --things` 0.60 s; nearly all of it is checking signatures, which piece 7 is for.
- `loops --version` prints `strange-loops-next 0.1.0`, outside a store and with no key. The first line of `loops --help` is unchanged: an outside tool reads it.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is in `rust/PLACE.md`.
- `ls` with no argument lists kinds, not things, so the first command in an unfamiliar store is short at any size.
- A thing's name here is what `of` names: a mention in `about` and a payload's `name` make no thing name.
- Two live setters of `name` are a conflict also when they wrote the same text, as `loops of` shows them.
- JSON only so far. The plain view is the next piece, and it will be asked for with `--plain`, never chosen by whether the output is a terminal: a script's answer must not depend on how it was started.

A Codex worker wrote both; the coordinator reviewed them, ran the gate and tried `ls` on real stores.

### The tick's mutation catalogue

Kyle's ruling W5 held the tick's mutants back until step 4's exit, which holds since 2026-11-21. The catalogue now has 419 entries: the 328 from before, unchanged, and 91 for the tick, over `SpecHash.lean`, `Tick.lean`, `TickCheck.lean`, the result reader in `Result.lean`, `env.when` in `Spec.lean` and the repeat check in `Json.lean`.

Every one of the 91 was judged by the full runner on this machine, with ten minutes for each command:

| Outcome | Entries |
| --- | ---: |
| Rejected by the build, and also caught by something that runs | 66 |
| Builds, and a vector changes | 24 |
| Builds, and a runtime check fails | 1 |
| Survives, or stands on proofs alone | 0 |

**Five were not caught at first, and each was a real gap.** Two survived outright and three stood on proofs alone. All five change what a reader or a checker answers, so each got something that runs:

| Fault | What now catches it |
| --- | --- |
| Rules versions compared as text in the check (`"10"` before `"2"`) | Vector `newer-ten-under-two`: a version 2 checker meets a rules 10 tick |
| An unheld payload answered before the wrong kind | Vector `wrong-kind-unheld`: a note whose payload is not held is still `tick-kind` |
| A count with a leading zero accepted (`"06"`) | Vector `check-padded-count`, with the hash refitted |
| A covered tick's own `covers` followed | Vector `weekly-inner-records-held`: the checker holds the six backups too, and the weekly tick still counts three records |
| The claim settled over the whole holding, not the covered set | A runtime check on `tickRun`: an eraser outside the cover does not change the covered result's bytes |

So `vectors/tick/` has 131 files. Rust passed the four new ones unchanged.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- Eight of the new entries join the sample that every merge request runs (58 in all), spread over five files.
- One swap that cannot be an entry: an empty `withheld` against a `withheld` outside `covers` reads the same either way round (margins-claude found this in its own fuzz).
- The evidence keeps the five first verdicts beside the final ones, so the gaps stay on record.

A Codex worker wrote the entries, ran them and added the vectors; the coordinator reviewed the run, joined it with main and ran the gate.

### The prefix at a time is strict

`upTo W T` in `model/Laws/Cut.lean` is now the records emitted before `T`; it took a record emitted at `T` itself in. The cut note's section 2 says the bound reads as `below` does, and `loops tick --as-of <time>` is built that way, so the model's name and the CLI now mean the same set at the boundary too. The coordinator's worker found the difference in the model's own witness: at one second the old prefix held `c`, emitted at one second, and the strict one does not.

- The laws of `cut.prefix` hold as before with the bound changed: `prefix_down_iff` (every prefix is closed downward exactly when no record names a later one), `heldOf_prefix`. The first's proof no longer uses the prefix at a record's own time; it uses the prefix at the time of a record named later, which would hold the namer.
- The witness `prefix_reads_wrongly` is at two seconds, where the prefix is again `a` and `c`.
- No vector, no Rust and no protocol rule depends on `upTo`.

margins-claude wrote it.

### The base lemma: an emit against a base

The filler against a base (the cut note, section 8, ruled 2026-11-20) names the base's live records of the thing. This is the law for it, in `model/Laws/LiveSlice.lean`, indexed as `keyed.base`. Model only: no vector, no Rust, no protocol rule.

- **What is proved.** A base is a part of what the store holds. An emit that names only records of the base, and every record of the base live in it, is the emit a holder of exactly the base would have written. When the base holds what the writers of its records held, the store with the emit is still a closed holding whose writers followed the rule (`Anchoring.emit`, `ClosedOver.emit`), so its names are anchored (`anchored_emit`) and `keyed.anchored` applies: its live records, read alone, read every key as it does. A base closed downward is such a part (`anchored_emit_down`, from `closedOver_of_down`). So is a part of one that holds every record live in it (`anchored_emit_live`): a thing's live records at a cut, alone, are a sound base though they are not closed downward.
- **Naming more of what is under the emit** (`liveK_emit_more`). Two emits that set the same keys, the second naming what the first names and besides only records under a name of the first: every record of the store is live for a key with the one exactly when it is with the other. So an emit that names the live records of the base's downward closure, and not of the bare base, reads the same from the whole store and adds only what a reader of a part needs.
- **A correction to what was claimed.** The tick record note, sections 4 and 7, said the lemma holds for any set, closed or not. margins-claude wrote that and it was wrong. Of the rule's three parts, two are the emit's and the third, that a writer holds what the writers of its records held, is about the base. The note is corrected in place, marked with the date.
- **The witness** (`base_closed_needed`). `x` sets `a` and `b`; `y` sets `a` over it and names it. The store is anchored and closed. A writer takes `y` alone as its base and writes `w`, setting `a` and naming `y`. `x` is still live, for `b`, and is under `w` unnamed. The live records are `x` and `w`; read alone they show `x` as a live setter of `a` beside `w`. The whole reads `w` alone.
- **What follows for the filler**, not built here: naming the live records of the base's downward closure in the store, and not of the bare base, is always sound by `anchored_emit_down`, and by `liveK_emit_more` it replaces nothing the bare emit does not. What the filler does with a base that is not closed is not decided.

margins-claude wrote it.

### The tick fuzz: holding Rust to the model's order

The order of refusals for input that is wrong twice is pinned in no protocol text (W4). Inside this repository the model's order decides, and a fuzz run is what holds Rust to it. The JavaScript is frozen (W3), so this run compares Lean and Rust only: `node interop/fuzz/run.mjs --family tick`.

- **The first version was not good enough, and a planted fault showed it.** It agreed on 20,160 cases over three seeds. The coordinator then swapped two checks in Rust's reader (the spelling of `spec-hash` and of `result-hash`), rebuilt, and ran a full seed: all 6,720 cases still agreed. The swapped Rust differs from the model only on a payload with both hashes misspelled, and the generator misspelled one or the other, never both. An order between two checks is exercised only by a case that holds both faults, so the number of agreeing cases measured nothing about order.
- **The rebuilt version generates pairs on purpose and counts them.** `interop/fuzz/tick-order.mjs` lists 114 decision points of the readers and the check, in the model's order. Of their 6,441 pairs, 5,784 can be in one input; the other 657 are listed with the reason each cannot. Every pair that can was generated and confirmed by the model's answer at least three times, at least once in each seed, and the evidence test asserts it.
- **The campaign.** 46,656 cases over three seeds (`tick-order-1` to `3`), 30,456 of them refusals: Lean and Rust agree on every one. The check now runs every fold type: 1,384 `same` and 803 `differs` answers, where the first version had 100 and 8.
- **Planted swaps.** Fourteen pairs of adjacent checks were swapped in Rust, one at a time, by the worker: each was caught, the latest at case 219 of a seed. The hash-spelling swap that the first version missed is caught at case 58. The coordinator planted two more of its own in the result reader (the order of a latest-by slot's members, and which missing member of a scalar slot is named first), with its own seed: both caught within 1,536 cases, and the restored tree runs clean.
- **An outside run agrees.** margins-claude fuzzed its Python against Rust (`sl-py/fuzz_tick.py`, in its own repository): 80,000 cases over two seeds with up to four faults each, none differing, every pair of its 59 faults at least 20 times a seed. Of 17 swaps planted in its Python, 16 were caught; the 17th, an empty `withheld` against a `withheld` outside `covers`, is the same either way round. Its base ticks have only count, sum and collect slots, so it does not reach the order inside groups or keyed things; this run does, and two of the planted swaps are there.
- **In CI.** The fuzz job runs 288 cases of the lane (about 15 seconds). The thinnest catches need a few thousand cases, so the CI run is a smoke test and the campaign above is the evidence.
- **One vector owed to margins-claude:** `outside-erased-taken`: a record outside the cover that the spec takes, erased by an eraser also outside, counts in "taken and not covered". 127 vectors in `vectors/tick/`. Rust passed it unchanged.

No disagreement between the model and Rust was found by either version, so no Rust or model change came of it. The existing fuzz runs are unchanged: their generated inputs are byte for byte what they were.

A Codex worker wrote both versions; the coordinator reviewed them and planted the faults named above.

## 2026-11-21

In brief:
- `loops read --values` and `fold --values` give each listed record's envelope (issue 9, !57).
- The Rust core reads through indexes: a keyed collect over 9,000 records went from 19.8 s to 0.63 s, and no answer changed (!58).
- margins-claude wrote the payload values note (!59). Its seven choices are open.
- The roadmap was split into `ROADMAP.md`, `DECISIONS.md`, this file and `notes/`.
- A result hash is spelled `res:`.
- The model states how a stored payload is read, and a list reads as a set: `present` means written, `is` and `by` read a list's members, and a list is never a number.
- `value` and `n` are ordinary payload fields: a record that does not hold one is unread, absent and ungrouped for it, as for any other name.
- Kyle ruled the seven payload values choices, the result hash's prefix, which choices come to him, and the three classes of edge; he confirmed the keyed-fold and codec choices; issue #10 is closed.
- The tick record is proposed as TK1 to TK9 in `DECISIONS.md`, with [a note](notes/2026-11-21-tick-record.md) (!65). Not ruled.
- `loops emit` copies `occurred` from the heads when they agree; `--no-occurred` states none.
- The roadmap, the decisions, the changelog and the notes are published as a fifth design page, and the rethink and grammar pages are brought up to the rulings since 2026-11-13.
- The full mutation catalogue ran over all 328 entries: 324 caught, two known survivors, and two new ones that are now caught. The full runner asks what the per-merge check asks.
- `loops emit - --fill` fills each line of a changeset as a single emit would, so a collector can write anchored records.
- Kyle ruled the tick record (TK1 to TK9; TK9 as a `rules` member bound into the spec's hash) and the order of work (W1 to W6), each for its recommendation. One new entry, TK10, comes from planning the build.
- The tick record's first piece is in the model: the spec's hash under a rules version, and the window field `env.when` (!72). Rust is being built.
- The tick record's second piece is in the model: a reader for a claimed result, and the tick's payload with its two readers.
- Rust has the spec's hash and `env.when`: `loops fold` takes a window on `env.when`, and Rust runs the 11 tick vectors it implements.
- The tick record's third piece is in the model: what a tick claims, how one is made, and the check with its answers.
- Rust has the tick's payload and the result reader, and runs 72 of the 113 tick vectors.
- The tick has its protocol page, `protocol/tick.md`. margins-claude's Python ran every tick vector from the prose and found two gaps in the readers; both are closed in the model and in Rust.
- Rust checks a tick: all 126 tick vectors run in Rust, none pending.
- `loops tick <spec>` writes a tick. Two stores holding the same six backups, with different keys, wrote payloads equal byte for byte.
- `loops tick --check <id>` checks a tick. A tick written on one machine checks `same` on a second: step 4's exit criterion holds. Closing the step is Kyle's to say.

### `loops tick --check <id>`, and step 4's exit criterion

The second half of piece 7, the last. The verb resolves an id as `get` does, takes the record's payload only when the store's own reading holds it open, checks it against everything the store holds with the core's `check_tick`, and prints one JSON object: the answer and the two reports, spelled as the vectors spell them.

**Step 4 is done when a content tick recomputes to the same hash on two machines.** A real run on the release binary, continuing the two stores of the entry below. The laptop's tick `r:uqmk623s…` covers the six backups.

| Where it is checked | Answer | Exit |
| --- | --- | --- |
| The NAS, after importing the tick | `same`, closure `yes`, 0 taken and not covered | 0 |
| The NAS, after a seventh backup of 4 megabytes | `same`, 1 taken and not covered. A fresh tick there: 7 runs, 1031 | 0 |
| A machine holding four of the six | `cannot check`: 2 records, 0 payloads missing | 1 |
| A copy where one backup was erased afterwards | `cannot check`: 0 records, 1 payload missing | 1 |
| The laptop, on a tick written by hand that claims 1028 | `differs`, with both hashes. The store took the record without complaint | 1 |

Each line is the answer the proposal of this morning predicted for it (TK4, TK5, TK7). The same cases are CLI walk tests, the first under the name `a_tick_written_on_one_machine_checks_same_on_a_second`. Whether step 4 is closed is Kyle's to say: boundaries, markers, the runner and cuts by time or by ids were never in its exit and are not built.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 22 of `rust/PLACE.md`.
- **Exit status 0 only for `same`.** `differs`, `cannot check` and `not a tick` exit 1 with the answer on standard output and nothing on standard error, so `loops tick --check <id> && …` is safe in a script. The alternative was 0 whenever the check completes. Kyle is asked.
- **No rule at the door.** `import` and `emit` take a tick that would answer `differs` or "not a tick"; tests show both.
- **A store whose lines do not all check** answers and is then refused `store-not-clean`, as the other answering verbs are.
- **Checking needs no signing key.**
- The vector evaluator's function that spells an answer is now public (`loops_eval::tick_check_json`), so the CLI and the vectors share one spelling.

A Codex worker wrote it; the coordinator reviewed it, ran the gate and made the run above.

### `loops tick <spec>` writes a tick

The first half of piece 7. The verb reads a spec as `loops fold` does, takes every record the store holds, makes the tick with the core's `make_tick`, and writes one signed record of kind `tick`. It prints the record's id. The verb that checks a tick is the next piece.

A real run, on the release binary built from this change. The laptop holds the proposal's six backups; the NAS imports them and has its own signing key. Each runs `loops tick backups.json` before it has the other's tick.

| | Laptop | NAS |
| --- | --- | --- |
| Record id | `r:uqmk623s…` | `r:8vphpr9i…` |
| Observer | `k:qunercaf…` | `k:8lbav2tp…` |
| Payload | 1,109 bytes | the same 1,109 bytes |
| In it | `rules` "1", six `covers`, no `withheld`, `runs` 6, `mb` 1027, `spec:gs9soetl…` | the same |

Both hashes in the payload recompute from the payload in a few lines of Python. `spec:gs9soetl…` is the hash the proposal worked out by hand.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 21 of `rust/PLACE.md`.
- **The envelope is the writer's, as on any record.** The record is what `loops emit tick` would write with this payload and the same envelope flags: it goes through the same filler and writer, and a test shows the two give the same signed record for the same key, salt and time. So `loops tick <spec>` alone writes a root, and `--of`, `--prev`, `--about`, `--occurred` and the rest of `emit`'s envelope flags mean what they mean there. A second tick `--of tick:backups` names the first in `prev` through the anchor.
- **Everything held, and only that.** No cut by time or by ids, and no slice. A second tick covers the first as one record.
- **The tick is made before its own record is appended**, so it never covers itself.
- **How the spec is named.** `-` is stdin. A path, or a name that is a file under the directory, is read as a file. Any other bare name is a vertex under `.loops/vertices/`.
- **A payload erased here is withheld**, also when its bytes are still in a segment: the store's own reading decides (TK10, row 1).
- A store whose lines do not all check is handled as `emit` handles it: it warns, and the tick covers the lines that check.
- A spec that does not parse writes nothing and is refused with the spec's code. No new refusal code.

A Codex worker wrote it; the coordinator reviewed it, ran the gate and made the run above.

### The tick record: Rust for the check

Piece 6 of the seven. `rust/core/src/tick_check.rs` has the claim's run, what a checker holds open, the missing counts, the covered eraser a tick ignores, closure, the count of records taken and not covered, and `check_tick` with the model's answers in the model's order.

- **Rust runs all 126 tick vectors, none pending.** With margins-claude's Python, the claim and the check now have three implementations that agree: the model, Rust, and one written from the prose.
- **`differs` is decided on bytes** and carries both hashes, as in the model: a test uses a hash that collides on purpose.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- The checker is its own module in the core, and the fixture's JSON spelling of an answer stays in the vector evaluator.
- `rust/GAPS.md`: the one boundary is the evaluator's, as before. A number past binary64's range in a fixture's subject payload or openings is refused as malformed fixture input where the model answers; no stored record can hold one.
- No CLI change here: the verbs are their own piece.

A Codex worker wrote it; the coordinator reviewed it and ran the gates.

### The tick record, piece 4: the protocol page, and two amendments from an outside reading

**The outside reading.** margins-claude wrote the tick's payload and the result reader into its Python (`sl-py`, in another repository) from the prose alone, then ran the vectors: the 11 of piece 1 agreed on the first run, and of the 72 after piece 2, one answer differed. It listed ten things the prose had left it to guess. Two were gaps in the model.

- **Amendment A: a repeated member name at any depth is refused before anything is hashed.** The model's canonical text keeps the first of two members with one name, so a `spec` or `result` with a repeat inside had a hash, and two different texts fitted one `spec-hash`. JCS does not define the text of such an object. The first reader now refuses a repeat anywhere in the payload, `tick-member-duplicate` at the repeated member's path. No stored tick could hold one, since a record's payload is refused for it already; the reader now says the same. One vector, `result-repeated-slot`, changes its answer to this code.
- **Amendment B: the result's hash under newer rules** (TK10, row 7; Kyle's to rule, built as recommended). The label inside the result's hash has its own version, and a binary cannot know a later one. For a `rules` above its own, the first reader checks `result-hash` for spelling only. The reader takes the binary's version for this.
- **`protocol/tick.md`.** The normative page: the record and its payload, the spec and the rules, what a tick claims, reading a payload, the check, reading a tick in a spec, erasure, and the vectors and laws. It says what the outside reading had to guess: `covers` is every record of the set folded, taken by the spec or not, and `withheld` every one of them not held open; the second reader's three answers as the vectors spell them; "not canonical" compares JCS texts, so member order is free; how a hash is spelled; that a path is for a person and is not to be parsed. Each refusal has one fault; the page pins no order for several.
- **A law, under `tick.canonical`.** A payload the first reader accepts has no repeated name at any depth. Two accepted payloads with one canonical text are then equal as JSON up to member order, when their numbers are finite, as a stored record's always are. Without that premise it is false: `null` and a number past binary64's range have one canonical text in the model.
- **Vectors.** 13 more, 126 in `vectors/tick/`: repeats inside `spec` and deep inside `result`; a rules 2 payload whose result hash is under another label; a supplied record the spec does not take (covered all the same); one shown erased (withheld); `"unread": "-0"` with a refitted hash.
- **Rust** follows in the same merge request, since the amendments change answers Rust already gave: the reader's two changes, and `make_tick` in the core, which `write-payload` now uses. Rust runs 80 tick vectors and counts 46 as pending, those of the claim and the check.

- **A second outside reading, of the page itself.** With the amended readers and the check, margins-claude's Python passed all 126 vectors on its first run. It then listed what `protocol/tick.md` had still left it to take from this changelog or from a vector, and the page now says each: an older tick is spared everything past the first reader; how today's comparison is spelled, with its four reasons; that the answers about the version are given only for a payload the first reader accepts; that an ignored covered eraser does not wait for missing records; when closure is unknown; what the count of records taken and not covered counts; and that outside the stored record's domain of finite numbers and well-formed text no answer is defined, the model's included. One vector it asked for is still to add: an outside record that is erased and that the spec takes, which counts.

**The order for a payload with several faults, as now built** (inside this repository only, W4). The first reader: not an object; a repeated name anywhere, found by visiting members in input order, a name before what is inside its value, array elements by index; an unknown member; the first missing member; the version; `spec` not an object; `covers`, then `withheld`; the spelling of `spec-hash`, then of `result-hash`; the spec's hash; the result's hash when the rules are the reader's or older. The result reader: for an object of fixed members, repeats, then extra members in input order, then missing ones in the shape's order (at the root, the spec's slot order); values slot by slot in the spec's order. Inside a slot: `unread` before `value` or `heads`; a grouped slot reads `groups`, `ungrouped`, `unread`; latest-by reads `unread` before `things`; a keyed thing reads `heads`, `keys`, `whole`.

**Implementer choices; they stand under Kyle's rulings of 2026-11-21 (TK7, W4, W7).**
- Amendment A moves one refusal from `tick-result-invalid` to `tick-member-duplicate`. The alternative was to say the readers take a held payload, which can hold no repeat, and leave two vectors about input that cannot occur.
- In Rust, the second reader uses the version given to the first, so a caller cannot change versions after the result hash's fit was left unjudged.
- No mutation-catalogue entry is added (W5). `model/Loops/Number.lean` gains a name for its decimal formatting step so a proof can use it; no number's text changes.

Codex workers wrote the model and the Rust; the coordinator reviewed both, ran the gates and joined the two branches.

### The tick record: Rust for the payload and the result reader

Piece 5 of the seven, taken before piece 4 because it needed nothing from the protocol page. `rust/core/src/tick.rs` has the payload, its JSON and bytes, and the two readers; `rust/core/src/result.rs` has `read_result` and the result hash over a raw member. The checks run in the model's order.

- **Rust runs 72 of the 113 tick vectors and counts 41 as pending**: those of the claim and the check, whose Rust is piece 6. The evidence page credits Rust for `tick.canonical` and `tick.record` now.
- **The seventeen refusal codes** are in the core's refusal vocabulary beside the spec's.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- **The core's types hold nothing a stored record cannot hold.** The worker's first version added a variant for a number past binary64's range to the core's JSON and value types, to match the model on inputs outside the vectors. The coordinator had it taken out: the writer refuses such a number, so no tick's `spec` or `result` can hold one. The boundary stays in the vector evaluator, where it was, and `rust/GAPS.md` lists the fixture inputs on which the evaluator refuses and the model answers (an out-of-range number in a supplied payload; a repeated name inside a raw member that would be echoed). The coming Lean and Rust fuzz run leaves those out.
- No CLI change yet: `loops tick` is piece 7.

A Codex worker wrote it in three rounds; the coordinator reviewed each, brought it up to main and set the run and pending counts.

### The tick record, piece 3: the claim and the check, in the model

The third of the seven pieces, in `model/Loops/TickCheck.lean`. With it the model holds the whole tick record. Rust does not run its vectors yet.

- **The claim** (TK4, TK5). Take the forms of the covered records, read every form of a withheld id without its payload, settle and admit inside that set alone, and run the spec. Nothing follows a covered tick's `covers`.
- **Making a tick.** `covers` is every record given. `withheld` is every one of them not held open, the targets of a covered eraser among them.
- **The check** (TK7, TK9, TK10). In the order the model decides:
  1. The subject is not of kind `tick`: not a tick (`tick-kind`).
  2. Its own payload is not held: cannot check.
  3. The first reader refuses: not a tick, with its code.
  4. Newer rules: cannot check. Older rules: cannot check, with what today's rules give: the same result, another result, or why that is not available.
  5. A spec whose hash fits and that the parser refuses: cannot check. A spec not in its parsed form, or a result of the wrong shape: not a tick.
  6. A held covered eraser names a covered record that `withheld` leaves out: not a tick (`tick-withheld-erased`), whatever else is missing.
  7. Covered records not held, and payloads the tick read that are not held, are counted; if either count is not zero: cannot check, with both. A payload counts as held only when the checker's own reading shows it, so an eraser anywhere in the store takes it away.
  8. The claim is run and its bytes compared: `same`, or `differs` with both hashes.
- **The two reports** beside the answer. Closure: "no" as soon as one held covered record names a `prev` or `under` target outside `covers`; "yes" when every covered envelope is held and none does; else "unknown". Taken and not covered: the records outside `covers` that the spec's sources take from the whole store, read as `loops fold` reads it.
- **Laws.** `tick.inputs`: two holders with consistent forms, each holding what step 7 asks, get the same result bytes. `tick.withheld`: holding the payload of a withheld record changes nothing. `tick.made`: a tick checked against the holding it was made from is `same`, and stays `same` when records arrive that are outside its cover and erase nothing in it. `tick.level`: the claim over a set that contains a tick does not depend on what that tick covers. None assumes anything of the hash function beyond its width.
- **Vectors.** 41 more, 113 in `vectors/tick/`. The proposal's examples are among them: the six backups check `same`; a seventh backup leaves that `same` with one record taken and not covered, and a fresh tick is 7 and 1031; a covered `retired` record gives 5 and 615; a withheld payload gives 615 with 1 unread; a weekly tick over two nightly ticks checks `same` with no backup held; the smallest count under older rules was 0 and is 9 with 2 unread today.

**Implementer choices; they stand under Kyle's rulings of 2026-11-21 (TK7, W4, W7). Rows 1 to 4 and 6 of TK10 are built as recommended and are his to rule.**
- Two more refusal codes: `tick-kind` and `tick-withheld-erased`.
- For a tick under older rules, "not available" names its reason: today's parser does not read the spec, the spec is not in today's parsed form, the tick ignores a covered eraser, or inputs are missing (with the counts).
- The taken-and-not-covered report is given whenever a spec was read, also beside a refusal of the result's shape; closure is "unknown" until the first reader has passed.
- `differs` compares bytes, not hashes: a runtime check uses a hash that collides on purpose and still gets `differs`.
- No mutation-catalogue entry is added (W5).

A Codex worker wrote it; the coordinator reviewed it and ran the gates.

### The tick record: Rust for the spec's hash and `env.when`

Rust for piece 1. `rust/core/src/spec_hash.rs` has the rules version, the label and the hash over a raw JSON member or a parsed spec. `env.when` is a test field in `rust/core/src/where_.rs`, so `loops fold` and `loops read` take a window on it today.

A real store, in the CLI's walk tests: three backups emitted on 2026-11-21. The first states no `occurred`, a revision of it states `occurred` 2026-11-16, and a third states 2026-11-17. A window on 2026-11-21 counts 0 by `env.occurred`, 3 by `env.emitted` and 1 by `env.when`. A slot that follows `prev` counts 0 with the same window, because the backdated revision replaces the one record inside it.

- **Rust runs 11 of the 72 tick vectors and counts 61 as pending.** A tick vector is run when its `input.op` is one the evaluator implements (`hash`, `domains`, `window`). The vector test pins both numbers, so a vector cannot move between them unseen. The pending ones are the payload's, whose Rust is piece 5.
- **The evidence page credits Rust by operation.** `design/laws/laws.json` names the tick operations Rust runs, and a law is marked as checked by Rust only through vectors of those operations.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).**
- A number past binary64's range inside a raw spec member is read as `null` by the vector evaluator when it hashes the member, as the model's canonical text writes it. No stored record can hold such a number, since the writer refuses it; this keeps Rust and the model equal on a vector's input.
- `"by": "env.when"` is refused `by-invalid`, the existing code for a `by` that names no grouping key.
- No new dependency, and no entry in `rust/GAPS.md`: nothing the model states here is left unchecked by Rust.

A Codex worker wrote it; the coordinator reviewed it, brought it up to main (where the payload's vectors had arrived), set the run and pending counts, and made the evidence page's credit follow the operation.

### The tick record, piece 2: the result reader and the payload, in the model

The second of the seven pieces. Rust does not run its vectors yet.

- **The payload** (TK1 to TK5, TK9). `model/Loops/Tick.lean`: the members `rules`, `spec`, `spec-hash`, `covers`, `result`, `result-hash`, and `withheld` only when not empty. The six-backups example is a vector with its full text: 6 runs, 1027 megabytes, `spec:gs9soetl…`.
- **Two readers.** The first checks what no version of the rules changes: the members, the version's spelling, that `spec` is an object, the two id lists (sorted sets of record ids, `withheld` inside `covers` and never written empty), the spelling of both hashes, then that `spec-hash` fits the raw `spec` under the label `rules` names and `result-hash` fits the raw `result`. It parses no spec. The second is for the binary's own version: it parses the spec, requires its text to be that of its parsed form, and reads the result against the slots. For another version it answers which one; for a spec whose hash fits and that the parser refuses, it answers that it cannot read the spec.
- **The result reader.** `readResult` in `model/Loops/Result.lean` reads a claimed result against a spec's slots: the shape of each fold type, integers as decimal text, ids as record ids. It does not ask whether the parts agree. A result that says 6 runs and lists 5 ids reads; the check of piece 3 will answer `differs` for it (TK10, row 4).
- **Laws.** `tick.canonical`: what is written reads back, and whatever reads has one JCS text, reordered members included. `tick.record`: a spec reads a tick record by the payload reading and nothing more: `rules` and the hashes as text, `covers` and `withheld` as sets of ids, `spec` and `result` present with no value.
- **Vectors.** 61 more in `vectors/tick/`, 72 in all: the example, an empty cover, an empty fold, each result shape, three ticks read by a spec (the TK6 example: count 3, 2 covering the first jellyfin backup, a sum of `result` that is 0 with 3 unread), a payload under rules 2, and one file for each single fault.

**Implementer choices; they stand under Kyle's rulings of 2026-11-21 (TK7, W4, W7).**
- **Seventeen refusal codes, each with the path of what broke:** `tick-not-object`, `tick-member-duplicate`, `tick-member-unknown`, `tick-member-missing`, `tick-rules-invalid`, `tick-spec-not-object`, `tick-ids-not-array`, `tick-id-invalid`, `tick-id-duplicate`, `tick-ids-unsorted`, `tick-withheld-empty`, `tick-withheld-outside`, `tick-hash-invalid`, `tick-spec-hash-mismatch`, `tick-result-hash-mismatch`, `tick-spec-noncanonical`, `tick-result-invalid`. One code serves both id lists and both hashes; the path says which. The plan had a code for each member; the worker built the shorter set and the coordinator kept it.
- **The order for a payload with several faults** (inside this repository only, W4): not an object; a repeated member; an unknown member; the first missing member in the order `rules`, `spec`, `spec-hash`, `covers`, `result`, `result-hash`; the version; `spec` not an object; `covers`, then `withheld` (not an array, a bad id, a repeat, the order; then empty, then outside `covers`); the spelling of `spec-hash`, then of `result-hash`; the spec's hash; the result's hash. Then, for the binary's own version: the spec does not parse; its text is not its parsed form's; the result's shape, slot by slot in the spec's order.
- **A result's ids read back as held.** The codec drops what a reader held of each listed id, so the reader gives each the same value and `tick.canonical` is stated up to that.
- **The example's hashes are the vector's own.** The vector uses the model's fixed record ids, so its result hash (`res:7s24f6bt…`) is not the one in the proposal, which used the laptop's ids.
- Rows 3 to 6 of TK10 are built as recommended and are Kyle's to rule.
- No mutation-catalogue entry is added (W5).

A Codex worker wrote it; the coordinator reviewed it, ran the gates and recomputed the example's two hashes.

### The tick record, piece 1: the spec's hash and `env.when`, in the model

The plan for the tick record has seven pieces: (1) the spec's hash and the window field, (2) the result reader and the tick's payload, (3) the claim and the check, (4) the protocol text, (5) the Rust codec, (6) the Rust check, (7) the CLI verbs and the two-machine exit test. This is the first, in the model (!72). Rust for it is being built.

- **The spec's hash** (TK3, TK9). `model/Loops/SpecHash.lean`: a rules version, the label `loops/spec-hash/v<rules>:`, and `spec:` + base32hex of SHA-256 over the label and the JCS text. It is taken of a raw JSON member, so a check can verify it before parsing the spec, and of a parsed spec. The `backups` example hashes to `spec:gs9soetl…`, as the proposal computed by hand.
- **The window field** (TK8). `env.when` in a `where`: a record's `occurred` when it states one, else the instant of its `emitted`. It is always present and is read from the envelope, so also on a record held without its payload.
- **Laws.** `spec.hash`: two parsed specs have the same hash input exactly when the rules version is the same and they differ only in the order of their slots, of a `where`'s fields, or of a field's operators; such specs give the same result bytes. `spec.no-commit` and `spec.no-result`: a spec's hash input is never a record's commitment input or a result's. `window.span` and `window.heads`: what `env.when` reads, and that a window filters the heads, so a revision outside the window still replaces a record inside it.
- **Vectors.** Eleven in `vectors/tick/`: the example hash; member order giving one hash; source order, kind order, a renamed vertex or store, and the rules version each giving another; a dropped `note`; the label's bytes; and two window cases. A backfilled store counts 0 by `env.occurred`, 8 by `env.emitted` and 1 by `env.when` for the same day.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7) unless noted.**
- **A rules version is a positive whole number as decimal text**, compared as a number. This one is row 5 of TK10 and is his to rule.
- **The vectors are published with the model**, before Rust runs them. The Rust vector test and the JavaScript check each name the one directory `tick`, pin its file count and print that they do not run it; every other unknown directory still fails. Rust's exemption goes when its piece merges. The plan would have held the vectors back until then; publishing them lets margins-claude's Python start from them.
- **Reading a carried key later is not a change of rules.** A tick carries the parsed form, which drops carried keys, so earlier ticks keep their meaning. `protocol/spec.md` says so.
- **`env.when` is a test field only.** `"by": "env.when"` is refused.
- **The window's laws are named `window.span` and `window.heads`.**
- **The fuzz does not generate `env.when`.** Its field names come from a fixed list. Given by hand to the frozen JavaScript, a spec with `env.when` is refused `where-invalid`, which is what W3 means: the three-way fuzz stays on the vocabulary all three share.
- No mutation-catalogue entry is added (W5).

A Codex worker planned the seven pieces and wrote this one; the coordinator reviewed it, ran the gates and recomputed the 17 hashes of the vectors in Python.

### Ruled by Kyle, 2026-11-21: the tick record and the order of work

Each was an entry in `DECISIONS.md`, with an example. Kyle ruled for the recommendation every time. The rulings reached the coordinator through Neon, which Kyle told in its own session to send them. Kyle confirmed them in the coordinator's session the same evening, by asking for this record to be merged.
The entries as they were put are kept in [the tick record note](notes/2026-11-21-tick-record.md#10-the-questions-as-they-were-put) and [the order-of-work note](notes/2026-11-21-order-of-work.md).

**The tick record, TK1 to TK9.** The exact form is in [the note](notes/2026-11-21-tick-record.md), sections 1 to 6. Not built yet.
1. A tick is an ordinary record of kind `tick`. Its payload is the whole tick, and it has no id but its record id.
2. It carries its result and the result's hash.
3. It carries its spec as parsed, and the spec's hash. The store names in `from` select nothing in a tick.
4. `covers` lists every record that was folded, each id once. A tick among them is one record and is never opened up.
5. `withheld` lists the covered records read without a payload, and is left out when empty.
6. A later spec reads a tick by the payload reading and nothing more. A total across ticks is not in step 4.
7. A verb checks a tick and answers `same`, `differs` or `cannot check`. No store refuses a tick on import or sync.
8. The window field is `env.when`.
9. A member `rules` states the version of the rules, and the label of the spec's hash is made from it (option D). With it:
   - The rules are everything between the covered records and the result's bytes: settling, admission, what a source takes, the tests, the folds and the payload reading.
   - A new fold type or test does not raise the number. A binary that cannot parse a spec whose hash fits answers "cannot check: this binary cannot read the spec". A fault in one implementation is not a change of rules.
   - For a tick made under older rules, the check also says what today's rules give, the same result or another.

   Neon's addition for the build: the check verifies `spec-hash` over the spec's JCS text before parsing it; a spec that parses and is not in its parsed form is not a tick.

**The order of work, W1 to W6.**
- **W1.** An adoption step comes after ticks and before standing. Its pieces that touch only the CLI (`ls`, the prefix scan, the plain view, reads across stores, the shadow import) are built beside the tick work. The caching reader's law (issue #8) leaves step 4 and is stated when a caching reader is built; this amends the ruling of 2026-11-11 that it is step 4's first law. Reads across stores take the union of the named stores first.
- **W2.** A cache of which segments were checked, in the adoption step.
- **W3.** The JavaScript is frozen at what it has, as a trial for step 4: ticks are built in Lean and Rust. It keeps passing its vectors. Looked at again when ticks are done. The workbench page will use the Rust core compiled for the browser.
- **W4.** One refusal for every input, in the order the model checks; the implementer picks the order and notes it here. The protocol text and the vectors of a new step pin one fault each. The orders already pinned for records and specs stay.
- **W5.** The mutant check on every merge request stays. Step 4's mutants are added after its exit.
- **W6.** `out/` stays committed.

Open in `DECISIONS.md`: TK10, six details of the check that the plan for the build found.

### A changeset can ask for the filler: `loops emit - --fill`

Ruled on 2026-11-20 ([the cut note](notes/2026-11-15-the-cut.md), section 7) and built on 2026-11-21. Rust only: `rust/place/src/fill.rs` and the CLI. No protocol rule and no refusal code changed, and `loops emit -` without the option writes what it wrote before, byte for byte.

With `--fill`, each line gets what `loops emit` would fill in for the same statement: `of` from its `prev`, the keys its payload names, every live record of its thing in `prev`, and the heads' `about` and `occurred`. The changeset is still written whole or not at all.

A real run, on a store holding one backup of `svc:jellyfin` (`H`, about `host:nas`, occurred 2026-11-16):

```
{"kind":"backup","of":"svc:jellyfin","payload":{"mb":419}}
{"kind":"backup","of":"svc:jellyfin","occurred":"2026-11-18","payload":{"state":"ok"}}
```

| Line | `prev` | `about` | `occurred` | `sets` |
| --- | --- | --- | --- | --- |
| 1, with `--fill` | `H` | `host:nas` | 2026-11-16 | `mb` |
| 2, with `--fill` | `H`, line 1 | `host:nas` | 2026-11-18 | `state` |
| 1, without | none | none | none | none |

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7).** The full list is choice 20 of `rust/PLACE.md`.

- **The option is `--fill`, for the whole changeset.** `loops emit task --fill` is a usage error.
- **Lines of one thing chain.** A line is filled against the store and the lines prepared before it, so the second line of a thing names the first, as two emits one after another would. The alternative was two heads made by the tool.
- **How a line states none.** `"about": []` states no mentions; `"occurred": null` no occurrence; `"sets": []` sets no key; `"sets": null` is read whole. The two `null` forms mean this only with `--fill`; a plain changeset refuses them as before.
- **A stated `prev` is kept and the live records are added**, as `--prev` does on a single emit. An exact `prev`, a fork on purpose, is written with a plain changeset.
- **Labels.** A line's labelled prerequisites are prepared first, so a label in `of`, `prev`, `about` or `under` is the final id when the line is filled. A forward label works. The answer and the segment keep input order.
- **Refusals with `--fill` go line by line** after the label checks: an earlier line's field refusal can come before a later line's `prev-unknown`. Without the option the order is unchanged.
- **Only what the store holds.** The filler against a stated base (the cut note, section 8) is a separate piece and is not built.

Checked by a randomized test: 320 cases, each written as one filled changeset and as single emits one after another with the same salts and times. The 207 accepted cases gave the same ids, envelopes and signatures; the 113 refused cases wrote nothing, and the refusal code differed in six, for the reason above. Three hand-written changesets with labels match their single emits too.

Cost: the filler settles the store again for each line. On a store of 9,000 records, one `loops emit` takes 0.54 s and a filled changeset of 200 lines 3.4 s. A collector that writes thousands of lines in one changeset will want that made incremental.

A Codex worker planned and wrote it, and the coordinator reviewed both rounds and ran it against a store.

### The full mutation run after the payload change

GitLab pipeline 2190 ran the whole catalogue on main at `48037ce`. The record is in [the mutation report](model/mutate/REPORT.md). No vector and no protocol rule changed.

| Outcome | Count |
| --- | ---: |
| Rejected by the build | 282 |
| Caught by a changed vector | 20 |
| Caught by an assertion in the generator | 22 |
| Survived | 4 |

Two survivors are the known equivalent ones (`finish-json-hexdigit`, `last-spec-tests-conds`). The other two were new, and each showed a gap:

- **`record-num-hidden`: a check lost with `value` and `n` becoming ordinary fields.** The fault lets a numeric fold read a number from a record whose payload the reader does not hold. A vector caught it on 2026-11-15, through the zero `n` a withheld record then kept. Since !63 a withheld or erased record has no fields, so nothing the model builds reached the guard. No answer was wrong. The guard is now a theorem, `Record.num_hidden`, under the law `numeric.safe-whole`, and a runtime check over a record that keeps a written zero and is marked withheld.
- **`payload-whole-as-number`: a gap in the full runner.** For a mutant that built, the full runner compared the generated vectors and stopped. It never ran `lake exe run --check` or `lake exe checks`, which the per-merge runner does and which catch this fault. It now runs both, and a mutant survives only when all three pass. The new statuses are `killed-by-run-check` and `killed-by-checks`.

Twelve build rejections stood on proofs alone, with nothing that runs objecting. Ten were known. The two new ones (`result-unshown-keeps-shown`, `result-unshown-groups-kept`) change a helper that only the result laws called; a runtime check on a grouped withheld head now catches both.

Run again through the new runner, the six entries give: the two known survivors survive, `payload-whole-as-number` is killed by the checks, and the other three are rejected by the build and by the runtime checks as well.

A Codex worker wrote the change and the coordinator reviewed it. Its choices: the two status names; `numeric.safe-whole` as the law that indexes the new theorem, since it already says when a numeric slot reads a field; and an evidence summary made from the joined file of the shards, which holds no shard baselines or generator logs.

### The decisions page, and the rethink and grammar pages brought up to date

Kyle asked for both on 2026-11-21, for a colleague who reads the site and not the repository.

- **A fifth page, `out/decisions/`.** `DECISIONS.md` is its landing page; `ROADMAP.md`, `CHANGELOG.md` and each file in `notes/` are pages beside it. `node design/build.mjs` renders them with a Markdown renderer of its own, with no dependencies. A new note needs no code change.
- **The build checks what it renders.** It refuses a block it does not support, a link to a heading no page has, and a link to a repository path that does not exist; three new entries in `design/mutants.mjs` hold it to that. The link check now covers every link of every page, the rethink page's included. A link to a file that is not a page goes to the repository on GitHub.
- **So a change to any of these documents changes `out/`.** CI fails when the committed pages differ from a rebuild: run `node design/build.mjs` with every edit to the roadmap, the decisions, the changelog or a note.
- **The rethink page.** Twelve ledger entries for the rulings of 2026-11-13 to 2026-11-21 (declared keys, the anchor, edges, the payload reading, the result codec, the cut, a tick's inputs, the window, an emit against a base, step 2 closed, which choices come to Kyle), with the tick record entered as proposed. About forty passages that called something unbuilt or open are corrected, and the Resolution tab opens with what is ruled since its text was written. Passages that only TK1 to TK9 would change are left until he rules.
- **The grammar page.** The record's entry states the payload reading; `emit`, `test` and `group` are current; the tick's entry says its record is proposed.

A Codex worker wrote the fifth page and the coordinator reviewed it; the coordinator wrote the rethink and grammar changes, from a list of stale passages that a search agent drew up and that was checked passage by passage.

### `loops emit` copies `occurred`

Ruled on 2026-11-20 ([the cut note](notes/2026-11-15-the-cut.md), section 5) and built on 2026-11-21. Rust only: the filler in `rust/place/src/fill.rs` and the CLI. No protocol rule changed.

- An emit of a thing the store holds, with no `--occurred`, carries the `occurred` of the thing's heads when every head states one and all state the same text.
- `--occurred <when>` states a new occurrence, as before. `--no-occurred` states that the record has none. The two together are a usage error.
- A root and the first record of a thing copy nothing. `emit -` fills nothing in, as before.
- The case the ruling was made on, run with both binaries: an ADR emitted with `--occurred 2009-04`, then `status=accepted` with no flag. Before, the update moved the thing out of a window on 2009. Now it stays in it.

Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):
- The heads agree when their `occurred` is the same text. `2009` and `2009?` cover one span and do not agree.
- Where the heads do not agree, or one states none, the emit states none.
- Only the heads are read. A live record under them that states another `occurred` plays no part.
- An erased or withheld head supplies its `occurred`, since the envelope is held.
- The usage error reads `--no-occurred takes no --occurred beside it`.

Checked: the Rust gate (202 tests), with walks for the copy, the two flags, their conflict, a fork whose heads disagree, a first record, an erased and a withheld head, and a changeset. A Codex worker wrote it; the coordinator reviewed it and ran the gate and the ADR case.

### Ruled by Kyle, 2026-11-21

Each was an entry in `DECISIONS.md`, with an example. Kyle ruled for the recommendation every time.

- **Payload values, PV1 to PV7** ([the note](notes/2026-11-21-payload-values.md)). All seven were built the same day, in two pieces, below.
  1. The reading from a stored payload to the fields a fold reads is stated in the model, with vectors. Built the same day, below, with 3 to 7.
  2. `value` and `n` become ordinary fields (option a). Built the same day, below.
  3. `present` means the member was written, for `null`, `{}`, `[]` and `""` alike.
  4. Under `is` and `not`, a list reads as a set of its members.
  5. `at-least` and `below` on a list: neither holds. A list is never a number.
  6. A list gives one group per member under `by`. This amends the ruling of 2026-11-11 that an array is ungrouped.
  7. A list is unread to `sum`, `min` and `max`.

  Kyle's note on a slot that follows `keys`: when two writers set a list field from one base (`routes: ["svc:a"]` and `routes: ["svc:b"]`), a `where` on the field leaves the thing unread and `loops of` shows both setters, while `by` on the field puts the thing in both groups. That is how `by` already reads a scalar field with two live setters ([spec](protocol/spec.md), "A slot with `by` that follows `keys`").
  margins-claude's precision, which follows from the note with no new rule: each `where` test is asked of every live setter, and an answer they share stands. With those two setters, `routes` is `"svc:a"` is unknown (one yes, one no) and the thing is unread; `routes` is `"svc:c"` is no; `routes` present is yes. With `["svc:a", "svc:b"]` and `["svc:a"]`, `is "svc:a"` is yes and `is "svc:b"` is unknown. The payload vectors carry the mixed cases, since a port that unions the lists before testing gets only those wrong.
- **The result codec, RC1.** A result hash has its own prefix, `res:`, not `h:`. Built the same day, below. The other choices are confirmed: a listed record is its id alone; the bytes hold the slots only; slots are in JCS order; no fold type is written; the label is `loops/result-hash/v1:`. Kyle's note: the hash covers the slots without the spec, so it means something only beside its spec inside a tick; a person citing a result cites the tick's `r:` id.
- **Which choices come to Kyle, W7.** A choice comes to him when it changes a record's bytes or id, a result's bytes or hash, a refusal code, or what a spec answers. Every other implementer choice is written in this file and stands unless he objects. The 25 CLI and tooling choices that were waiting stand under this ruling.
- **The keyed-fold choices.** Kyle confirmed the 20 built choices of 2026-11-14 and 2026-11-15: `sets` in the envelope, latest-by following `keys`, the other slots following `keys`, and a keyed collect's `limit`. Among them: `unread` counts things; a test that answers no outranks one that answers unknown; a field no record of the thing sets is absent.
- **Edges, E1.** Three classes, and no change to the envelope. One target under a role is a text field. A set that one observer states whole is a list, read as a set. A relation that several writers add to, or one with facts of its own, is one thing per edge: `of: edge:<rel>:<src>:<dst>`, with `about` naming both ends. Kyle's addition: the edge's payload holds `rel`, `from`, `to` and `state` (`active` or `removed`), so that a fold reads direction and removal from fields and never from the text of `of`. The documents and the import follow this. Nothing is built. An example: `loops emit edge --of edge:routes-to:caddy:grafana --about svc:caddy --about svc:grafana rel=routes-to from=svc:caddy to=svc:grafana state=active port:=3000`.
- **Issue #10 is closed, I10,** with no strict "after" operator. An inbox keeps its own list of the ids it has seen; a reader's tick is for boundaries worth citing.

Still open in `DECISIONS.md`: W1 to W6.

### The payload reading, and lists

**Built, 2026-11-21,** on Kyle's rulings of that day (payload values, choices 1 and 3 to 7).
Until now only the Rust store decided how a stored payload became the fields a fold reads, and it skipped a member that held a list, an object or `null`. The model now states the reading, a vector family pins it, and all three implementations and the store run the same function.

What a fold reads:
- **The reading.** A held payload that is an object gives one field for each top-level member. Any other held payload gives none, so every field is absent. A number is read as binary64 and then as a whole number when it is one within ±(2^53 − 1). Nothing nested is read.
- **`present` means written.** A member that holds `null`, `{}`, `[]` or `""` is present. An object, `null`, and a list with no member an argument can name match no `is`, satisfy every `not`, have no group key and are unread to the numeric folds.
- **A list reads as the set of its members** under `is` and `not`: text, safe whole numbers and booleans. Order and repeats change nothing. A fraction, `null`, an object or a nested list inside it is not a member.
- **A list is never a number.** `at-least` and `below` do not hold on one, and it is unread to `sum`, `min` and `max`, a list of one number included.
- **Under `by`** a record joins the group of each member's key, each once, after members are turned into keys: `[80, "80"]` gives the group `80` once. This is the amendment to the ruling of 2026-11-11.
- **A slot that follows `keys`** gets no new rule. Each test is asked of each live setter's own list, and an answer they share stands; the keys of all live setters are collected, each once.

Over Kyle's example store the CLI answers as he ruled: only caddy has no `watches` recorded (it was all four services); one service watches loki (it was none); neither port bound holds for caddy's `[80, 443, 8080]`; a count by `watches` gives three groups of one with two ungrouped (it was four ungrouped); a `sum` of `ports` reads nothing.

What changed:
- **The model.** A field holds a `HeldField`: one scalar, the readable members of a list, or "written, and nothing can name it". `payloadFields` is the reading and `Stored.readInto` applies it. `Item` gains a case for a list's members and one for a written value nothing can name; `Arg.matches` asks whether a list contains the argument; `HeldField.keys` gives a list's keys.
- **The laws.** A new entry, `payload.read`: the fields depend on the payload alone, not on the envelope, the salt or `sets`; a non-object gives none; looking a name up after the reading is reading the member of that name; every list member kept is one an argument can name. `Cond.payload_present` says `present` on a held payload is exactly "the name is written". Further theorems say `is` on a list is membership, both bounds are false on a list, a list gives no number, and what a list's keys are. Thirteen new theorems in all. The index has 112 entries and 1,220 theorems.
- **One law is narrower, as the ruling requires.** "Each record has at most one key" held for a payload field by its form; a list can give several, so `By.Single` now holds for `env.kind` and `env.observer` only, and with it `By.keys_single`, `By.OneKey.of_single`, `By.accounting_single_form` and `By.count_partition_form`. `By.keys_single_nonlist` keeps the guarantee for every field that holds no list, and the general accounting and partition laws stand as they were. `Record.num_number` is restated over the new field type.
- **The vectors.** A new family, `vectors/payload/`, 18 files: a payload in, the fields out. Ten new `spec/run` files pin Kyle's examples, the two-writer list cases and the mixed cases. No file that existed changed by a byte but `vectors/README.md`, so every changed answer is in a new file and all 23 result texts and hashes stand. There are now 649 generated vectors and 661 JSON fixtures.
- **JavaScript, Rust and the store.** Each has the reading as one function and runs `vectors/payload` through it directly; `Line::record` in the store calls the Rust one. The Rust core's public `Record.fields` holds `record::Held` (`One`, `Many`, `Other`). `loops of` and `--values` show the stored JSON as before.
- **The protocol text.** [`protocol/spec.md`](protocol/spec.md) has a section "Reading a payload" and the new rules under `where`, `by` and the numeric folds, with the sentence that an envelope's empty set is absent while a payload's empty list is present.
- **The mutation catalogue** has 328 entries: 14 new, each caught by a runtime check, and 3 re-pointed.

How it was checked: the four CI gates locally (Rust 198 tests, JavaScript 7,363 vector checks); every tracked file under `vectors/` compared with main; the three-way fuzz with no mismatch, 3,000 cases on seed `payload-reading-1` and 4,000 on `coordinator-reading-1`; Kyle's example store folded by the built CLI; margins-claude's Python implementation, with a reading written without sight of the other two, passes every family (8,483 checks, and 43 of 43 on the payload family) and agrees with the branch's Rust on 148,011 fuzz checks.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):**
- A scalar reads as it did, whether or not an argument can name it. "Written, and nothing can name it" is for an object, `null`, and a list with no readable member. The first plan read an unnameable scalar that way too; margins-claude and this session changed it, so that every existing scalar answer is kept by construction.
- An empty list and a list of only unreadable members read alike. The stored JSON still tells them apart.
- The reading keeps a list's members in the order written, repeats included; the set rule is applied where a test or a grouping reads them.
- The payload family's answers carry tags (`one`, `many`, `other`; `text`, `whole`, `number`, `bool`), with numbers as text. A reader record's `"fields"` in the other families is ordinary JSON.
- The Lean type is named `HeldField`, since `Held` is the batch's type.
- A Codex worker (gpt-6.2-astra) wrote a plan, which margins-claude and this session reviewed, and then the change; this session ran the checks above.

**Found on the way, not changed here:** the fuzz generator puts lists, objects and `null` in the `spec/run` and `result` families only; the `fold`, `realm` and `scenario` families never hold one.

### `value` and `n` are ordinary fields

**Built, 2026-11-21,** on Kyle's ruling of that day (payload values, choice 2).
Every record used to have a `value`, empty text when not written, and an `n`, 0 when not written. The model's `Record` now holds `fields` and nothing else of the payload; `Record.get` is a lookup. A record without `n` is unread to a `sum`, `min` or `max` of `n`, absent to `where`, and ungrouped under `by`.
Over Kyle's example store the CLI now answers as he ruled: the smallest `n` of four backups is 9 with 2 unread (it was 0 with none); 2 of three settings have a `value` (it was 3); a count of backups by `n` leaves two ungrouped (they were in a group `"0"`).

What changed:
- **The model.** `value`, `n` and `nNumber` left `Record`; `withhold` and `erase` clear `fields`. `Sum.step`, `Max.step` and `Min.step`, which read `r.n`, now take a read function `p : Record → Option Int`; `Sum.on f`, `Max.on f` and `Min.on f` are those steps at `(·.num f)`, and `Sum.acc`, `Max.acc` and `Min.acc` are the same folds at the field `n`. `Record.num` is the only function that reads a number from a record.
- **The laws.** Fifteen statements changed, each by holding for every read function `p`: `Sum.batch`, `Sum.perm`, `Sum.fold_eq`, `Sum.repeats`, `Max.batch`, `Max.fold_some`, `Max.fold_eq`, `Max.set_decides`, `Min.batch`, `Min.neg_max`, `Min.set_decides`, the three `acc_fold` bridges and `Max.cannot_follow_prev`. None gained a premise. `Max.fold_eq` now says a record the function cannot read is skipped: `Max.fold p none xs = (xs.filterMap p).max?`. The laws used to be about a fold no spec runs; they now cover the fold a spec runs. The four helper lemmas pinned under D6 stand under their names. The law index has 111 entries and 1196 theorems, as before; two entries were reworded (`numeric.safe-whole`, `sum.repeats`).
- **The vectors.** A record's `value` and `n` are written inside `"fields"`, and only when the case states them. Of 617 generated vectors, 137 changed in the shape of their input records alone and 12 changed an expected answer: a max over heads that never supplied `n` went from 0 with 0 unread to `null` with every head unread (`fold/heads/03`, `fold/view/03`), and ten `realm` sums count such records as unread. The nine `fold/sum` and `fold/extrema` answers and all 23 result texts and hashes are byte for byte as they were. Four new `spec/run` vectors pin Kyle's examples and a written `0` and a written `""` beside them: `pv2-backups`, `pv2-settings`, `pv2-written-zero`, `pv2-written-empty`. There are now 621 generated vectors and 633 JSON fixtures.
- **JavaScript, Rust and the fuzz.** Each dropped its two special cases. The Rust core's public `Record` lost `value`, `n` and `n_number`. `Line::record` in the store reads every top-level text, number and boolean under its own name; a list, an object or `null` is still skipped (the next piece). The fixture readers in Lean and Rust refuse a flat `value` or `n` as an unknown member. The fuzz generator varies whether each of the two names is present and of what type.

How it was checked: the four CI gates locally (Rust 195 tests, JavaScript 7,205 vector checks); every changed vector compared with its old form record by record (4,094 records: each differs only by `value` and `n` leaving or moving into `fields`, and no stated value was dropped); the three-way fuzz with no mismatch, 3,000 cases on seed `payload-fields-1` and 4,000 on `coordinator-payload-1`; margins-claude's Python implementation, moved to the new reading, passes every family (8,167 checks) and agrees with the branch's Rust on 129,015 fuzz checks.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):**
- The low-level folds take a read function and are kept, where the first plan was to delete them. margins-claude and this session agreed it: the laws are at least as strong, and no function reads a record's number but `Record.num`.
- The fixture field of the `fold/sum` and `fold/extrema` families keeps the name `n`. It is now only a name.
- Which records state a `value` or an `n` was decided from the Lean fixture source: an explicit `0` or `""` was kept (one scenario body, two group-key fixtures, the new controls), and a default that a constructor had filled in was dropped.
- The max in `fold/heads/03` and `fold/view/03` was incidental to what each vector shows, so their records were left without `n`.
- A scenario that renders a head reads the text field `value`; a missing one is reported, never read as empty.
- The mutation catalogue keeps 314 entries: 13 were re-pointed or rewritten and none retired. That took under five minutes, four of them the cheap runner (the measure asked for under W5).
- A Codex worker (gpt-6.2-astra) wrote a plan, which margins-claude and this session reviewed, and then the change; this session ran the checks above.

**Found on the way, not changed here:** the JavaScript sum is exact only to a signed 128-bit limit, while the law index calls it unbounded. No vector reaches the limit.

**Corrected:** three rows of the table in the payload values note, section 1, which had dropped a written scalar of the other type.

### A result hash is spelled `res:`

**Built, 2026-11-21,** on Kyle's ruling of that day. The hash of a canonical result is `"res:"` and then the base32hex text it had before; a record's commitment is still `h:`.
The label, the preimage and the canonical bytes did not change, so each of the 23 result vectors changed in its `expect.hash` alone, from `h:` to `res:` with the same digits. No other vector changed, and no record's bytes or id.
The model (`Loops.resultHash`), JavaScript and the Rust core write it; [`protocol/result.md`](protocol/result.md) says that the two hashes now differ in their prefix as well as in what they hash. The law `result.no-commit` is as it was: its statement is about the hashed bytes.
The horizons page's example of a result hash reads `res:7a…`.
No mutation catalogue entry needed to change: the nineteen entries on `Result.lean` still find their lines.
**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):** the tests that a result hash is no commitment now compare the digits after the prefix, since the prefixes alone would make any two differ; a Codex worker (gpt-6.2-astra) wrote the change from a brief, and this session reviewed it and ran the gate.

### `--values` gives the envelope

**Built, 2026-11-21: `--values` gives the envelope** ([issue 9](https://git.gruel.network/kaygee/strange-loops-next/-/issues/9)).
The issue came from rex-tools, a chat room over the `loops` CLI and its first outside user: a timeline needs each record's `emitted`, `observer` and `about`, and got them from a second `loops export` joined by id.
Under `--values`, each `{"id", "shown"}` entry that a collect or a latest-by following `prev` lists gains `env`, the envelope as stored, whatever its `shown`; each thing of a latest-by that follows `keys` gains `about` as `loops of` writes it, and each of its heads gains `env` ([place](rust/PLACE.md), choice 17).
Without the option nothing changes, and taking the added members out still gives the protocol's answer byte for byte. Only `rust/cli` changed.
**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):** no new flag, the envelope comes with `--values`; the member is `env`, the whole stored envelope, not three picked fields; an erased or withheld record's entry has `env` and no `payload`; a keyed thing's `about` is always written, empty when no head mentions anything, as in `loops of`; entries under a keyed thing's `keys` and `whole` gain nothing.

### The Rust read path

`rust/core` was a function-by-function mirror of the model's list scans, and its reads grew with the square of the records held. rex-tools, the first outside user of the CLI, met it within a few hundred records.
The core now settles, admits, orders heads and finds live setters through indexes: by id, by thing, and over the `prev` graph, where each strongly connected part is summarised once and the keys set above it are passed down to what it names (`rust/core/src/live/index.rs`). The model, the vectors, the protocol and JavaScript did not change, and no answer changed.

| Read, release build | Before | After |
|---|---|---|
| A keyed collect over 9,000 records | 19.8 s | 0.63 s |
| The same over 3,000 and 1,000 records | 2.2 s, 0.31 s | 0.20 s, 0.07 s |
| `loops check` over 9,000 records | 0.96 s | 0.53 s |
| rex-tools' `state` vertex, 508 records in 508 segments | 1.59 s | 0.04 s |

What holds it to the model:
- The 629 vectors, as before.
- The list scans it replaced are kept as test-only code (`rust/core/src/scan_tests.rs`), and generated records are run through both: forks, cycles, unheld `prev` targets, repeated and conflicting forms of one id, erased and withheld payloads, and `sets` absent, empty, repeated and of several keys.
- The three-way fuzz against Lean and JavaScript: 3,000 cases on seed `fast-fold-1` and 4,000 on `coordinator-fold-1`, no mismatch.
- The old and new binaries write the same bytes for 38 reads over seven stores, `--values` and `loops of` among them.

A function that still mirrors its Lean definition says `Lean:` in its comment; one that computes the same value another way says "Gives what Lean `x` gives" and how ([porting](rust/PORTING.md)).

**What is still linear and paid on every run:** each verb reads the whole store and checks every line's signature, about 60 microseconds a record. At 9,000 records that is the half second every read now costs, and a store built by 2,000 single emits still takes 145 s, since each emit checks all that came before. Segments are immutable and named by their hash, so a place can remember which segments it has checked. That is the next cost to remove, when it hurts; it needs no change to a record.

**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):**
- The core's public surface gains `live::LiveState` (one thing's records, indexed) and `Spec::run_admitted` (run over records already admitted, so the CLI admits once). Every name that was public still is and gives the same value.
- The reference for the fast path is test-only Rust kept beside it, not a second crate.
- A Codex worker (gpt-6.2-astra) wrote the change from a brief; this session reviewed it and ran the checks above.

### The payload values note

Drafted by margins-claude for Kyle's rulings before any tick is built: [notes/2026-11-21-payload-values.md](notes/2026-11-21-payload-values.md). Nothing in it is built. Its choices are PV1 to PV7 in [DECISIONS.md](DECISIONS.md).

### The roadmap was split

Kyle asked for it on 2026-11-21: the roadmap had grown to 130 KB and he could not scan it for where the work stood.
`ROADMAP.md` now holds only what is next. `DECISIONS.md` holds what waits on Kyle, each with an example. This file holds what was built and ruled. The three long design notes and the retained boundaries moved to `notes/`.
No sentence of the record was dropped. The state of the evidence on that day follows, as the old roadmap's "State" section gave it; from here on, the counts a change moves are written in that change's entry, and the current counts are in the reports this section links to.

### State of the evidence at the split

The tree has three implementations: Lean, JavaScript, and Rust.
Step 1 applies the six settled rulings before records exist.
All three implement the settled decisions D1–D6, and D8a and D8b.
All three carry D8c's `sets` in the envelope and refuse one that is not a set of key names (`sets-not-keys`).
All three read a thing by its live setters in every slot that follows `keys`: latest-by, and count, sum, min, max and collect, with `by` or without.
In all three a collect that follows `keys` counts things in its `limit`, each listed whole (Kyle, 2026-11-15).
All three refuse every envelope shape by name (issue #1) and let a label stand in `under`.
All three writers refuse an `under` target they do not hold (`under-unknown`).
`loops emit` follows D8c's anchor rule: an emit of a thing names in `prev` every live record of it the store holds, and carries the thing's whole `about`.
An emit of a thing the store holds sets the fields it names, and `loops of`, `read --values` and `fold --values` show each key's value from its live setters.
A CLI verb that answers from a store with a line or a segment that does not check writes its answer and is then refused `store-not-clean` (Kyle, 2026-11-20).
The Rust core reads through indexes and gives the answers of the model's list definitions (2026-11-21, [the Rust read path](#the-rust-read-path)).
All three write a vertex's canonical result and its hash (D7): integers as decimal text, ids without `shown`. No CLI verb shows it yet.
All three let count, sum, min and max follow `prev` (issue #3), and group count, sum, min, max and collect with `by` (issue #2).
The law index has 111 entries, 1196 theorems, and 6 boundary witnesses.
See [the law index](design/laws/laws.json) and [proof and boundary data](design/laws/).
These proofs apply only under their stated premises.

The tree has 629 JSON fixtures: 617 generated fixtures and 12 standard fixtures.
Lean replays 608 generated fixtures; 9 occurred fixtures use separate checks.
Rust checks every fixture, six JCS byte pairs, 4,000 binary64 cases, and 128 SUPERCOP signing cases with ed25519-dalek.
Rust passes 194 tests; JavaScript passes 7,173 vector checks and 49 regression and law tests.
Both also check that `spec/run` answers write their members, group, thing and key names included, in the model's order; JavaScript checks `fold/latest-by` answers' thing keys too.
JavaScript refuses a held record's invalid `emitted` or `occurred` before it answers, as the Lean and Rust readers do.
The fuzz suite passes 60 tests.
See [vectors](vectors/README.md), [Rust boundaries](rust/GAPS.md), and [the mutation report](model/mutate/REPORT.md).
These checks provide bounded evidence, not complete JCS or cryptographic correctness.
They do not certify browser accessibility, external links, or official ASD dictionary compliance.

Input numbers round once to binary64.
A number past binary64's range is refused at the writer's number check.
The writer accepts values with magnitude at most 2^53 − 1, including fractions.
Numeric folds read safe whole values only.
Raw constructors and theorem premises retain separate domains.

The gates pass locally on Node 25.9, and CI runs every gate on Node 22.
The `collect-limit-1` campaign, over the generator after a keyed collect's `limit` came to count things, each listed whole, with two more keyed collects whose limit of one or two, plain or per observer, falls inside a thing, checks 5,600 cases, 800 per family, in 288.71 seconds.
It reports 3,638 matches, 1,579 protocol refusals, 383 shared decoder refusals, and no mismatch.
Four wrong ports of the limit in the JavaScript witness each give mismatches on the same seed, over its 800 spec and 800 scenario cases: the limit over records, as first built, 191 and 223; things taken and their records then cut at the limit, the same 191 and 223, since that is the limit over records; the things with the oldest live records taken, 85 and 88; and the limit applied before grouping, 90 and 79. The table is in [the campaign report](interop/fuzz/REPORT.md).
The `keyed-slots-2` campaign, over the generator before the limit counted things, found no mismatch either, nor did the `keyed-slots-1`, `keyed-1`, `sets-1`, `under-1`, `issue-7-1`, `by-collect-1`, `by-shape-1`, `by-1`, `shape-follow-1`, `shape-under-2` and `follow-2` campaigns, each over an earlier generator; `keyed-slots-2`'s eighteen wrong ports are in the report.
Decoder refusals are not agreement; for record and batch inputs JavaScript must also report them as malformed.
The generator carries issue #1's shapes and labels in `under`, followed count, sum, min and max slots, grouped slots, keys written as number text (issue #7), an unknown key beside an envelope that is not an object, `under` targets held or not, `sets` in record and changeset envelopes, latest-by following `keys`, count, sum, min, max and collect following `keys` with `by`, `where` and `limit`, keyed slots with two and three payload tests, keyed collects whose limit falls inside a thing, and `sets` and joins on the records a reader holds, so the same seeds now generate different inputs; earlier campaigns' counts are historical.
The `d8ab-1` and `d1-d6-1` campaigns found no mismatch.
The 42 duplicate-base lens mismatches of the `step1-3` campaign are the class D1 settles.
`interop/fuzz/summarize.py` derives these counts from tracked summaries.
See [the campaign report](interop/fuzz/REPORT.md) for the scripts and current and historical results.
The CI seed `ci-1` checks 28 three-way cases without mismatches.

The mutation catalogue has 314 entries, including nineteen for the result codec, six for the D1 and D2 definitions, nine for D8's `of`, nine for `follow` on count, sum, min and max, ten for issue #1's shapes and labels in `under`, seven for `by`, four for `under-unknown`, ten for `sets`, twenty for latest-by following `keys`, twenty-one for count, sum, min, max and collect following `keys`, and four for a keyed collect's limit counting things.
Ten earlier entries are retargeted at `of` and the one thing it names, three at the `follow` grammar, four at the shape stage and labels in `under`, eleven at the `follow` type on count, sum, min, max and collect, and two at a keyed collect's new site.
It retires the redundant positive-offset guard under R4 and the entry for the deleted `stripZeros` family.
The last full run, in CI on 2026-11-15, covers the 291 entries before a keyed collect's limit counted things: 243 build rejections, 24 vector differences, 22 generator assertion exceptions, and 2 survivors.
It ran at `132ecb2` in four shards. 23 entries timed out at the runner's default of 180 seconds a command, 22 of them in the one shard on a slower CI runner; run again at `122fd7e` with 600 seconds they give 17 build rejections, two vector differences and four generator assertions, and the counts above hold them so.
The four entries for a keyed collect's limit, the two retargeted at the collect's new site and the other entry on `keyedValue`, run alone, give seven build rejections and no survivor.
The runner exits 1 for assertion exceptions; after the second run no timeout or infrastructure failure is left.
Of the nine D8 entries, seven fail the build and two change batch vectors.
The run before it, over the 210 entries before issue #1 and `follow`, reported 165 build rejections, 28 vector differences, 15 generator assertion exceptions, and the same 2 survivors.
The four D6 helper survivors fail the build at their lemmas; the two scoped-equivalence survivors remain.
All-envelope shape checks now belong to each library.
Six deliberate per-envelope faults failed the respective vector layers in Step 1; that probe is not repeated here.
The cheap runner kills 33 of 33 mutants: each compiles and then fails runtime checks.
Build rejections are not semantic proof kills.
Survival does not prove equivalence.
See [the mutation report](model/mutate/REPORT.md) for outcomes, restoration checks, and limits.

## 2026-11-20

In brief:
- Kyle closed step 2: it does the old CLI's workable job, signed.
- A verb that answers from a store that does not check writes its answer and is then refused `store-not-clean`.
- Kyle ruled every section of the cut note, each for the recommendation: [notes/2026-11-15-the-cut.md](notes/2026-11-15-the-cut.md).
- margins-claude brought the cut laws into the model (`keyed.cut`, `cut.prefix`); they are described in sections 1 and 2 of that note.
- The result codec (D7), version 1, is built in all three implementations. Its implementer choices are not confirmed.

### Step 2 closed

What step 2 is:

`loops-place` and the `loops` CLI emit, read and fold for one person, signed, over `.loops/`.
Stored lines match the model's record vectors byte for byte; 34 tests drive the place and the binary.
The layout, the CLI and their refusal codes are a working proposal, not protocol.
[`rust/PLACE.md`](rust/PLACE.md) lists what is implemented and the seventeen choices made on the way.
Two of them need the model: what a place is has no law, and a payload reaches a fold only as `value`, `n` and top-level fields.

**Closed, 2026-11-20.** Kyle ruled that step 2 meets its exit criterion, "It does the old CLI's workable job, signed".
The replay of the exit check's session passes on `main`: an update that names one field keeps the others, `read --values` shows the content, a keyed collect's `limit` lists the newest thing whole, and `check` finds nothing.
Of what the exit check left, none blocks:
- `read` left out a stored line that fails its check, said nothing and exited 0; only `check` reported it. Kyle: a small fix, to warn and exit non-zero. **Built, 2026-11-20:** `read`, `fold`, `of`, `get` and `export` write their answer from the lines that check and are then refused `store-not-clean`, exit 1, when a line was refused or a segment is altered, as `check` is; `emit` and `erase` warn on stderr and go on ([place](rust/PLACE.md), choice 18).
  **Implementer choices, confirmed by Kyle 2026-11-20:** the rule covers every verb that answers from the store, not `read` alone, so `get` of a record that checks is refused too when another line does not; the answer is still written before the refusal; a verb's own refusal, such as `id-unknown` for the id of a refused line, is said instead; `check`'s stderr line now carries the two counts; `emit` and `erase` warn and keep their exit code; `import` does not read the store and says nothing.
- A hand-written JSON spec for each question, no scan by name prefix, no `ls` and no relative times: [the roadmap](ROADMAP.md).
- An import of the old tool's stores, and what its `combine` and `discover` vertices did, wait until they are wanted.
- The old Python `loops` is first on `PATH` on Kyle's machine. That is not the repository's to settle.

### D7: the result codec, version 1

**Built, 2026-11-20: the codec, version 1.** [`protocol/result.md`](protocol/result.md) defines it; the model is `model/Loops/Result.lean`, with a JavaScript witness (`interop/js/result.mjs`) and the Rust core (`rust/core/src/result.rs`).
The canonical result is one JSON object of the spec's slots, every one. An integer is a string of its decimal digits, at `value`, `unread` and `ungrouped` and nowhere else; a listed record is its id text; the bytes are JCS in UTF-8.
The hash is `"h:"` and the base32hex of SHA-256 over the label `loops/result-hash/v1:` and then the bytes.
The 23 vectors in `vectors/result/` give the canonical text and the hash for 16 `spec/run` inputs and 7 new ones: a sum of −2^54, a sum of zero, slots that read nothing, a grouped slot with `ungrouped` and `unread`, and one holding held, withheld and erased, whose bytes are equal.
No CLI verb shows a result hash; the tick work decides that.
The laws:
- `result.exact`: an integer of any size has one text, and the reader accepts no other.
- `result.shown`: two results that differ only in `shown` have the same text, bytes and hash.
- `result.canonical`: for two runs of one spec, the bytes are equal exactly when the results are equal with `shown` set aside. The premise is that the spec names each slot once, which every parsed spec does.
  It is not true of two arbitrary results: no fold tag is written, so a count and a sum that hold the same number write the same JSON, and an empty latest-by reads as an empty keyed one. The bytes name a result only together with its spec.
- `result.no-commit`: no result's hashed bytes are a 16-byte salt and then a canonical payload, so a result hash is never a record's commitment. The label is 21 bytes for that reason. A first draft used a 16-byte label, and a record with that salt and the result as its payload had the result's hash.

**Implementer choices, confirmed by Kyle 2026-11-21, all but the first.** He ruled that day that a result hash has its own prefix, `res:`, and it was built that day.
- A result hash is spelled `h:`, as a commitment is. Only their hashed bytes keep them apart. It could have a typed prefix of its own.
- The label `loops/result-hash/v1:`. A later version's label must not be 16 bytes, and must leave no JSON value after its first 16 bytes.
- A listed record is its id text alone, not `{"id": …}`.
- The bytes hold the slots only: no vertex name and no version member. The version is in the label.
- Slots are in JCS order, not the order the spec writes them.
- No fold tag is written.
- The vector family is a new `vectors/result/` over a subset of the `spec/run` inputs.
- The law names, beside the existing `result.unread` and `result.full`.
- The full mutation catalogue has not run over the nineteen new entries; two of them (`result-unshown-keeps-shown`, `result-unshown-groups-kept`) are expected to be refused by the build alone.

## 2026-11-15

In brief:
- `loops of` shows a thing's values, `--values` writes them beside ids, and an emit of a held thing sets only the fields it names.
- Kyle ruled that a keyed collect's `limit` counts things, each listed whole; built the same day.
- margins-claude drafted the cut note (ruled 2026-11-20).
- The last full mutation run, in CI (see the state of the evidence under 2026-11-21).

### Values beside ids, and an emit that sets the fields it names

**Built, 2026-11-15: values beside ids, and an emit that sets the fields it names.**
The step-2 exit check, against the old CLI's day-to-day jobs, found two gaps in "the old CLI's workable job".
A fold answers `{"id", "shown"}` lists, so a session that used to start with `sl read project` and see each item's name, status and message needed one `loops get` per setter.
And re-emitting `name=x status=done`, the old tool's way to update, was read whole, so it silently dropped every field it did not restate.
Kyle ruled on 2026-11-15: `loops of <thing>` shows the keyed state with each key's value from its live setters, and `read` and `fold` take an option that writes those values beside the ids; and on the single-record path an emit of an existing thing sets the fields it names, with a flag for a whole-read emit, while `emit -` fills nothing in.
Both are built in `rust/cli` and `loops_place::fill` (`rust/PLACE.md`, choices 15–17). Nothing in the model, the vectors, JavaScript, the core or `loops-eval` changed.
`loops of` answers the thing's `about`, its heads newest first, its record count and its `values`, read through the core's `live`: a key with one held live setter shows its value; a key with two or more shows each setter's id and value under `setters`, none picked and none merged; a live setter whose payload is erased or withheld shows its `shown` and no value; an erased or withheld live record read whole is listed as `unheld`; a record with `sets` gives only the keys it declares.
`read --values` and `fold --values` add the same members to each thing of a latest-by that follows `keys`, and a `payload` to each held record a latest-by that follows `prev` or a collect lists, inside each group too; without the option the answer is the protocol's, byte for byte.
An emit of a thing the store holds a record of, stating neither `--sets` nor `--sets-nothing`, is given the top-level keys it names as `sets`; `--whole` states a whole-read emit and is a usage error beside either.
The CLI walk replays the exit check's session with the new defaults: an update by `status=done` alone keeps the name and message, and one `read --values` shows each open item's name and status. It also covers a fork merged from two stores shown with both values, an erased and a withheld live setter, an undeclared key, `--whole`, the usage errors and grouped slots. The exit check's other findings (specs written by hand, prefix scans, `ls`, relative times) are not ruled and not built.
**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):**
- The flags are `--values` and `--whole`.
- The first record of a thing, and a root, stay whole-read: they set every key they name. `--whole` there changes nothing.
- An emit of a held thing that names no field is given `"sets": []`, a pure join, as `--sets-nothing` gives: `loops emit task --of task:1 --about project:y` moves the task and sets nothing. A whole-read emit of nothing takes `--whole`. `--erases` and `--under` change nothing about the inference.
- Held means a record of the thing is in the store as a fold reads it, settled and admitted, an erased or withheld one included.
- `loops of` answers `{"thing", "about", "heads", "records", "values", "setters"?, "unheld"?}`: `heads` are shown lines newest first and replace `winner` and `others`, the first head being the winner; `setters` and `unheld` are written only when they hold something. `about` is the union of the heads' mentions.
- A key whose one held live setter lacks it is unset and not written; a key with several setters is written under `setters` even when none of them holds it.
- The keys shown are those some live record declares and the top-level keys of each held live record read whole. What an `unheld` record read whole sets is unknown and not guessed.
- `--values` adds members, never changes one: `values`, `setters` and `unheld` beside a keyed thing's `keys`, `whole` and `heads`, and `payload` on an `{"id", "shown"}` entry whose `shown` is `here`, the payload as stored, declared keys or not. Counts, sums, minima and maxima gain nothing.
- Existing walk tests that meant a whole-read emit of an existing thing now say `--whole`: the two-store walk's revisions and note, the whole-read emit above keyed ones, and the emit in the `sets` walk that states no `sets`. Walk tests that read `winner` and `others` from `loops of` read `heads`.

### A keyed collect's `limit` counts things

**Built, 2026-11-15: a keyed collect's `limit` counts things**, on Kyle's ruling of that day on margins-claude's point (section 3 of [the declared-keys note](notes/2026-11-11-declared-keys.md)).
A collect that follows `keys` with `limit` lists every live record of the first `limit` selected things and no record of the rest; under `by`, of the first `limit` things in each group. A collect without `follow`, or following `prev`, still counts records.
The things are taken in the order of each one's newest live record, the content order the list itself is in (`thingsInOrder`, `wholeThings`), and their records keep their places in the one newest-first list. `unread` is counted before the limit, as before, and a limit of 0 is still refused (`spec/parse/113`). The result's shape does not change.
The law is in `keyed.slots`: with a limit of `k` the list holds exactly the live records of at most `k` selected things, every live record of each, and leaves out a selected thing with a live record only when it lists `k` things (`keyedValue_collect_limit`, `wholeThings_whole`); the things listed are the newest, each with a live record newer than every live record left out (`keyedValue_collect_newest`, `wholeThings_newest`); over records of distinct things, as when every thing has one live record, it is the limit over records (`wholeThings_distinct`), so `keyed.whole-read` holds as it did.
`spec/run/47`'s two limited slots now list whole things, and `spec/run/51` pins the rest: a limit inside a thing's live records, two things whose records interleave in time, limits of 1 to 4 and one beyond the number of things, a pure-join head and an erased live setter in a listed thing, unread things beside a limit of 1, and under `by` a forked thing in two observer groups, a thing in two payload groups, and a group whose first thing is not the first overall.
**Implementer choices, confirmed by Kyle 2026-11-21:**
- Which things: the first `limit` of the selected things ordered by each one's newest live record, newest first in content order. Content order ends in the record id and a record is of one thing, so no two things tie.
- The records of the things taken stay in one newest-first list across them, as before, not grouped thing by thing: the shape and the order are the ones the slot had, and only which records it holds changed.
- Under `by`, each group orders its own things by their newest live records; a thing in two groups is listed whole in each, and takes a place under the limit in each.

## 2026-11-14

In brief:
- All of D8c was built: `sets` in the envelope, latest-by following `keys`, count, sum, min, max and collect following `keys`, the slice laws for one keyed thing and for a spec, and the writer's anchor rule in `loops emit`.
- Kyle ruled that a slot following `keys` reads a thing's envelope from its heads ("Rule B"); the ruling is in section 3 of [the declared-keys note](notes/2026-11-11-declared-keys.md).
- The implementer choices of these five pieces are not confirmed.

### D8c's `sets` in the envelope

**Built, 2026-11-14: D8c's `sets` in the envelope**, section 1 of [the declared-keys note](notes/2026-11-11-declared-keys.md). Kyle ruled its shape on 2026-11-13.
`sets` is an optional envelope field: a set of top-level payload key names, canonical as `about` is.
Absent and empty differ. Absent is read whole; empty sets nothing, a pure join. The canonical envelope writes `"sets": []`, the one set left in when empty, so the two are different records with different ids (`record/16`, `17`).
One refusal, `sets-not-keys`: a value that is not an array, a member that is not text, or an empty name. It follows `erases-not-record-id` and precedes `of-missing`, in one envelope and across a batch.
Nothing compares `sets` with the payload or with another record's: a declared key the payload lacks, a non-object payload beside a non-empty `sets`, and a root with `sets` are written.
No fold, spec or lens reads it yet; it is carried, hashed into the id, stored, read back and shown, and an erased or withheld record keeps it with its envelope.
The law is `record.keys`; `record.sets` now covers `sets` too.
`record/15`–`19`, `45`–`47` and `shape-sets-*`, and `batch/76`–`82`, pin it.
The keyed fold, liveness per key and their laws are built in the next paragraph, the other slots that follow `keys` in the one after it, the slice laws for one thing and for a spec in the two after that, and the anchor rule in `loops emit` in the last.
**Implementer choices, confirmed by Kyle 2026-11-21** (the flags in the third stand under W7):
- `sets` holds keys, not labels: in a changeset a key that starts with `@` is written as given, neither replaced nor looked up (`batch/76`).
- A held record's `sets` is checked as its other fields are: a stored line whose `sets` is not keys is refused with the writer's code, and one in another order is not canonical. The reader's record in fold, realm, scenario and spec vectors carries `sets` since the keyed fold below.
- `loops emit` takes `--sets <key>`, once per key, and `--sets-nothing` for an empty set; the two together are a usage error, and `--sets ""` is the writer's `sets-not-keys`. `emit -` takes `sets` as a line's envelope field. Nothing is filled in over either flag; an emit with neither is given the keys it names when its thing is held (Step 2, built 2026-11-15).
- A `where` test cannot name `env.sets`: no test reads it.

### Latest-by following `keys`

**Built, 2026-11-14: latest-by following `keys`**, section 2 of [the declared-keys note](notes/2026-11-11-declared-keys.md) and the part of section 3 a latest-by slot needs to select.
`{"latest-by": "of", "follow": "keys"}` reads each thing by its live setters; `"prev"` keeps its meaning and its result.
`"follow": "keys"` on count, sum, min, max and collect was refused with `follow-invalid` until the next paragraph's slice built them.
The reader's record carries `sets`, and settling, withholding and erasure keep it with the envelope.
Liveness is worked out where heads are: after settling and admission, per thing, over the admitted records of it (`Loops/Live.lean`).
A record is above another when its `prev` names it or a record above it, through those records; a setter of a key is live for it when nothing above it sets the key; live for the envelope is a head; live is live for some key, the envelope among them.
The result per thing is `{"keys", "whole", "heads"}`, as in the note's example, beside `unread`: `spec/run/31` is that example.
`from` and the envelope tests choose heads, each alone, and one chosen head selects the thing; each payload test is asked of every live setter of its field, and one answer from all of them is the answer, differing or unheld answers unknown.
`thingTest` (`Cond.onThing` per test) takes a thing's records and is what the next slice's count, sum, min, max, collect and `by` can ask.
The laws are `keyed.live`, `keyed.fold` and `keyed.select`; `spec.set` covers the keyed slot. `spec.slice` does not: `Spec.run_slice` takes a spec with no keyed slot, since a keyed slot reads live setters the spec does not take, and the spec-slice sweep finds slices that answer it differently.
`spec/parse/97`–`110`, `spec/run/31`–`41` and `scenario/keys-01-settled-setter` pin it; the CLI walk reads a keyed thing through `loops fold`.
The slice laws, and the anchor rule and copied `about` in `loops emit`, are built in later paragraphs.
**Implementer choices, confirmed by Kyle 2026-11-21:**
- A field no record of the thing sets is absent, as a missing field in a held payload is: `is`, `present`, `at-least` and `below` answer no, `not` and `absent` answer yes (`spec/run/40`, `task:13`). A live setter that declares a field its payload lacks reads it as absent too.
- A chosen thing whose payload tests answer unknown counts once in `unread`; `unread` counts things, not records.
- Payload tests combine as a `where` map does: a test answering no outranks one answering unknown, so a thing with one disagreeing field and one failing field is not unread.
- `keys` is written in UTF-16 order of its key names, and each list newest first in content order, as heads are.
- Above reaches only through admitted records the reader holds: a `prev` naming a record not held, or a refused record, makes nothing above (`spec/run/41`).
- `value` and `n`, which the reader's record always holds, are payload keys like the others: a record with `sets` sets them only when it declares them, and a field no record sets is absent even when it is `value`.
- `Spec.run_slice` and `Slot.run_slice` take a premise that no slot is a latest-by following `keys`, rather than a slice law for it.
- The law names `keyed.live`, `keyed.fold` and `keyed.select`, and `follow` as a value of a new type `Follow` on latest-by in the model, while the accumulating folds keep a flag.

### Count, sum, min, max and collect following `keys`

**Built, 2026-11-14: count, sum, min, max and collect following `keys`**, section 3 of [the declared-keys note](notes/2026-11-11-declared-keys.md).
`"follow": "keys"` is accepted on every fold type; `follow-invalid` refuses any value but `"prev"` and `"keys"`, at the same check. `spec/parse/98`–`102` are now accepted forms, `106` and `107` pin the argument and `limit` checked after `"keys"`, and `111`–`115` pin the forms with `by`, `where` and `limit` and the refusals left.
Such a slot reads things, selected as latest-by following `keys` selects them (`thingEv`): `from` and the envelope tests choose heads, each alone, and the payload tests are asked of the thing over each field's live setters.
Count counts the selected things; sum, min and max read the field from its one live setter (`soleSetter`); collect lists the selected things' live records (`liveIn`), and its `limit` counts things (2026-11-15). The results keep the shapes of the same slots without `follow`; nothing forced a change.
With `by`, a payload key is read from each live setter of the field and an envelope key from each chosen head (`By.thingKeys`), and each group is the slot without `by` over its things (`Slot.keyedGrouped`).
The laws are `keyed.slots`, `keyed.by` and `keyed.whole-read`: when every record is read whole and every thing has one head, each such slot, grouped or not, gives what the same slot following `prev` gives (`Slot.keys_as_prev`). `spec.set` covers them; `spec.slice` does not, and its premise now leaves out every slot that follows `keys`, as the spec-slice sweep does.
`spec/run/42`–`50` pin it, `42` being the note's count of open tasks beside the same count following `prev`; the CLI walk counts, sums and collects through `loops fold`.
The slice laws are in the two paragraphs after these choices, and the anchor rule and copied `about` in `loops emit` (section 5) in the one after them.
**Implementer choices, confirmed by Kyle 2026-11-21:**
- A field with no live setter is unread to sum, min and max, as a record without the field is; so is one whose live setter holds no safe whole number there. A record with `sets` that does not declare the field is no setter of it, so a field its payload holds but does not declare is unread too (`spec/run/44`, `task:5`).
- `unread` counts things, each at most once in a slot: a thing whose tests are unknown, or a selected thing whose field or key cannot be read. Within a group, a thing whose field cannot be read adds to that group's `unread`, as a record does.
- **Ruled by Kyle, 2026-11-15, on margins-claude's point:** collect's `limit` counts things, each listed whole; under `by`, the things in each group. As first built it cut the one newest-first list of the selected things' live records, as it cuts matching records without `follow`, so a limit could list some of a thing's live records and not others, and a reader of the result read a key as unset whose setter fell past the limit. Built on 2026-11-15.
- Collect writes one list across things in content order, the shape it has without `follow`; it does not group the records by thing.
- A group's own `unread` counts only things whose field cannot be read there; a thing whose tests are unknown is unread at the top, as an unknown record is.
- `follow` on count, sum, min, max and collect is an `Option Follow` in the model, replacing the flag; `FoldType.follow` reads it. `By.count_partition` and its neighbours take a premise that the count does not follow `keys`; over things the partition is `By.keyedAccounting`.
- The law names `keyed.slots`, `keyed.by` and `keyed.whole-read`, and the renamed vectors `spec/parse/106-argument-after-follow-keys-on-sum` and `107-limit-after-follow-keys-on-count`.

### The slice laws for one keyed thing

**Built, 2026-11-14: the slice laws for one keyed thing**, section 4 of [the declared-keys note](notes/2026-11-11-declared-keys.md), in `model/Laws/LiveSlice.lean` (margins-claude).
They are laws only: no definition a reader runs changes, and no vector.
They are stated over `Loops/Live.lean` as it stands (`above`, `liveFor`, `liveEnv`, `live`, `keyedIn`), with the envelope as one more key a record sets, and then behind settling and admission, over `realm`.
*Witnessed* is exact and has no premise (`witnessed_iff`): a part reads its records as the whole does, for a key, exactly when every held setter the whole reads as dead has a setter of the key above it through held records; a part that is witnessed for every key and holds the live records gives the thing's keyed state (`keyedIn_part`).
Convex is one way to be witnessed and not the least (`witnessed_of_convex`, `convex_not_needed`).
With anchored names, every record naming every live record under it, the live records alone give the keyed state, heads included, and every live record is a head or named by one (`anchored_slice`, `keyedIn_live`, `heads_slice`, `live_named_by_head`); over payload keys alone the heads are not given (`heads_need_env`).
The writer's rule leaves anchored names only in a holding that is closed, one that holds what the writers of its records held (`anchored_of_written`); a holder missing a record reads wrongly from its own live records (`closed_needed`).
Behind settling and admission (`keyedIn_slice`, `keyedIn_live_slice`), a part owes each record of the thing it holds every form of it, what erases it, and that it refuses it when the whole does; with anchored names the forms of the live records and what erases them are the slice.
It owes nothing for the `prev` targets of a record the whole admits: any part admits it (`entitled_fewer`).
The laws are `keyed.witnessed`, `keyed.convex`, `keyed.anchored`, `keyed.heads` and `keyed.slice`.
Two things the port found:
- **No cycle over `prev` is a premise** (`NoCycle`) of every law but *witnessed*: a dead setter has a live setter above it only when going up ends. Real ids give that, since an id is a hash of an envelope that holds its `prev`. The model's ids are numbers, and a fold vector has a record that names itself, so the laws state it.
- **`thing.slice`'s `prev` targets do not carry over.** Under `"follow": "prev"` a target's envelope is harmless: the record that names it is above it. Under `keys` an envelope still sets its keys, so a target held without its witness reads as a live setter (`target_needs_witness`). A whole `thing.slice`, which holds every record of the thing, gives the keyed state too (`keyedIn_thing_slice`).
The slice law for a spec with a keyed slot is in the next paragraph.

### The slice for a spec with a keyed slot

**Built, 2026-11-14: the slice for a spec with a keyed slot**, in `model/Laws/KeyedSpecSlice.lean` (margins-claude). Laws only, and the JavaScript spec-slice sweep now checks it.
A slot that follows `keys` reads each thing it selects by its live setters, records the spec need not take, so a spec slice is not enough for it (`keyed_slot_needs_live`).
A part *covers* a thing when its folded records of the thing are the whole's, hold the thing's live records and are witnessed for every key (`Covers`); it then reads everything a keyed slot asks of the thing as the whole does: its heads, its payload tests, each field's one setter, its live records and its group keys.
A part answers every slot that follows `keys`, of any fold type, grouped or not, when it covers each thing, or neither reader can select the thing: the part folds no record of it the spec takes, and the whole has no head of it the spec takes (`KeyedCover`, `Slot.keyed_cover`).
With a spec slice beside the cover, every slot of any spec is answered (`Spec.run_slice_keyed`); a spec whose slots all follow `keys` needs the cover alone (`Spec.run_keyed`). `Spec.run_slice` and `Slot.run_slice` keep their premise: they are the case with no keyed slot, where no cover is needed.
A part of the forms covers a thing as `keyed.slice` says (`covers_of_keyedPart`), and with anchored names by the forms of its live records and what erases them (`covers_of_live`).
The law is `keyed.spec-slice`.
- **A refused record of a covered thing is owed its `prev` targets** (2026-11-15). `KeyedPart` had asked that the whole admit every record of the thing the part holds, and a spec slice can break that by itself: it brings, as a target, a record of a covered thing that the whole refuses (`prev-unrelated`), and it brings the targets only of the records the spec takes. Without the target the part admits the record and reads the keys it sets (`refused_needs_targets`). `KeyedPart` now asks only that the part refuse what the whole refuses, and a part that holds what such a record names in `prev` does (`KeyedPart.of_targets`, by `entitled_part`). What it then holds of a covered thing is held like the rest: witnessed, with its erasers. The collect-limit sweep met the case first.
- **It is proved, and it asks a little more than the experiment needed.** The experiment (margins `sl-py/keyspecslice.py`, 16,000 spec and store pairs, every keyed slot type) was answered by the spec slice with the live records of the things it touches, the members between two sent members, and the erasers of the live records; the spec slice alone answered wrongly in 5,119 and 4,840 of 8,000. The law asks for what erases any record the part holds of a covered thing, since it holds the part's records of the thing to be the whole's records, shown state and all, where a keyed slot reads the shown state of the live ones only.
- **The sweep** (`interop/js/spec-slice.test.mjs`) builds that part for each of 3,912 generated specs and stores and finds every slot, keyed ones among them, answered as the whole answers; it is a proper part in 507, and leaving out the live records changes an answer in 50 and the erasers in 1. The spec slice alone still differs on a keyed slot in 53. Since the generator learned the collects of 2026-11-15 it meets a record of a covered thing that the whole refuses, its `prev` naming a record of another thing, and that the spec slice brings as a target; the part then holds what that record names in `prev` too, so that it refuses it as the whole does, as `Covers` asks: the part's folded records of the thing are the whole's. What the part holds for such a record is held like any record of its thing, with what lies between and what erases it (the helper runs its steps until nothing is added). The generator does not reach a store where that closing matters; margins' experiment does (`sl-py/keyspecslice.py`, mode `refused`, 8,000 spec and store pairs in which a later record of the thing names a refused one): the part without the refused record's targets answers wrongly in 832, with the targets added once in 12, and closed in none.

### The writer

**Built, 2026-11-14: the writer**, section 5 of [the declared-keys note](notes/2026-11-11-declared-keys.md), in `loops emit`.
An emit of a thing names in `prev`, beside any `--prev`, every record of that thing the store holds that is live for some key, the envelope among them, and so every head (`rust/PLACE.md`, choice 11).
The thing is `--of`, or what `--prev` replaces; liveness is the core's `live`, over the store settled and admitted as `loops fold` reads it, so an erased or withheld record is named by its envelope.
With no `--about`, the emit copies `about` from the thing's heads, every mention when there are several; `--about` states the whole `about`, and `--no-about` an empty one.
A root, an erasure and the first record of a thing name nothing and copy nothing. `emit -` fills nothing in, and nothing refuses an unanchored record.
Nothing in the model, the vectors, JavaScript or the core changed: `loops_place::fill` holds the rule, over the core's `live`, and `loops emit` calls it before the batch check.
The CLI walk writes the note's history (a task created whole, then `--sets status`, then `--sets title`) with `loops emit` alone and checks each `prev` against the live records a collect that follows `keys` lists; it covers a whole-read emit above keyed ones, a fork merged by export and import and joined by one emit, an erased and a withheld live record, `--about`, `--no-about` and a moved task, and a changeset that fills nothing in.
`rust/place/tests/anchor.rs` writes 300 seeded random emits through the same filler, over six things and four keys, with whole-read emits, pure joins, moves, explicit `prev`s and erasures: one writer, and two replicas that merge both ways now and then.
Every 25 emits it requires the history to be anchored (every record above a live record names it) and each thing's live records, with the records that erase them, to answer fifteen slots that follow `keys` as the whole holding does: latest-by, count, sum, min, max and collect, with `where`, `limit` and `by`. At 300 emits the slice holds 41 of 300 records for one writer and 44 of 300 merged; no answer differed. Written without the anchor, each emit naming one live record of its thing, the slices answer differently at many checkpoints: in one run, 10 of the 12 for one writer and 10 of the 24 for the two replicas. The counts vary from run to run, since the test's keys and salts are fresh each run; the property has teeth.
Existing walk tests that made a fork with a second `--prev` to one record now write the fork as a changeset that states its own `prev`, since `loops emit` would name the first revision in the second; in the two-store walk, b's note now replaces b's revision, so the merged thing has two heads, not three.
**Implementer choices; they stand under Kyle's ruling of 2026-11-21 (W7):**
- With no `--about`, an emit of a thing copies the union of its heads' mentions, in canonical order; `--about`, once or more, replaces the copy; `--no-about` states an empty `about`; `--no-about` with `--about` is a usage error.
- An emit builds on every head of its thing and every other live record held, whether or not `--prev` names them; an explicit `--prev` is kept beside them, live or not. The heads it builds on, for `about`, are the thing's heads, not an explicit `--prev` that is not one.
- Liveness is read over the admitted records: a held record admission refuses is not named.
- `loops erase` writes a root with `erases` and no `of`, so it names nothing; `--erases` and `--under` on an emit change nothing about the anchor; a thing named by a root's id is that root's thing, and the root is named while it is live.
- What was filled in is not printed: `emit` answers the id, and `loops get` shows the `prev` and `about` written.
- No flag turns the anchor off; `emit -` is the path that fills nothing in.
- The filler, of `of` as well as of the anchor and `about`, moved from the CLI into `loops-place` (`loops_place::fill`), so a test can drive the writer's rule over hundreds of emits without starting the binary for each; the CLI still decides when it runs.

## 2026-11-13

In brief:
- Kyle took `under` targets: a writer refuses an `under` target it does not hold (`under-unknown`). Built the same day.
- Kyle ruled the declared-keys note, sections 1 to 5: [notes/2026-11-11-declared-keys.md](notes/2026-11-11-declared-keys.md).

### `under` targets

**Kyle, 2026-11-13:** "Let's take under targets now."
This replaces the choice deferred on 2026-11-11, that a writer checks no `under` target beyond its shape.
Kyle took margins-claude's view: a writer refuses an `under` target it does not hold, beside `prev-unknown`.
**Built, 2026-11-13.** A new writer refusal, `under-unknown`: a record's `under` must name a record the writer holds, in the batch or in the store.
It runs across the whole batch, after `prev-unknown` and before `of-not-root` and `prev-unrelated`, so no draft order changes the refusal.
A batch member counts, named by its label or by its id.
A stored record counts whatever its shown state: the writer holds an erased or withheld record's envelope.
Nothing else about the target is checked. Whether it is a grant, of what kind and by whom, is still standing's question (step 3).
Readers do not refuse on it, as they do not for `prev-unknown`.
The batch writer and the CLI's single-record path check it against the same store lookup; there the CLI's own `prev-unknown` still comes first.
`batch/67`–`75` pin it: an unheld target refused, a held root and a held revision accepted, a batch member's raw id and an erased target accepted, and the order beside `prev-unknown`, `of-not-root`, `prev-unrelated` and a writer refusal.
No existing vector changed meaning: every earlier batch vector's `under` names a batch member by label.
The CLI walk pins an erased and a withheld stored target.

## 2026-11-11

In brief:
- `"follow": "prev"` on count, sum, min and max (issue #3).
- `by` on count, sum, min, max and collect (issue #2).
- Every envelope shape has a named refusal, and a label may stand in `under` (issue #1).
- Kyle chose the recommendation for D7, the canonical result encoding (built 2026-11-20).
- Kyle agreed that the model states the slice law as *witnessed* (issue #5), and that D8c starts with a design note, which margins-claude drafted that day.

### `"follow": "prev"` on count, sum, min and max

**Built, 2026-11-11: `"follow": "prev"` on count, sum, min and max (issue #3).**
Such a slot folds the whole-reader heads, each thing's heads with each id once, which are the heads latest-by and a followed collect read.
It selects as latest-by does, and its result keeps the shape of the same slot without `follow`.
Every head of a forked thing counts; count counts an erased or withheld head by its envelope, and sum, min and max count it unread.
Any other `follow` value is refused with `follow-invalid`, at the check that already refused it on collect; that check now accepts `"prev"` on every fold type.
The law is `spec.follow`: the answer depends only on the set, through each thing's heads (`heads.set`), not `acc.set`. `heads.why` still holds.
A caching reader for these slots is not built. A record with an unknown `prev` can supersede a head and later be refused when its target arrives, so a reader that caches must keep what such a record supersedes. Holding such records back instead would refuse the slices the anchor rule allows, whose live setters travel without their ancestors. Kyle, 2026-11-11: this is step 4's first law.
**Implementer choices, confirmed by Kyle 2026-11-11:**
- The law's name, `spec.follow`, and its place in the spec table.
- `follow` is a flag on each accumulating fold type, as on collect, not a slot-level field.
- `"follow": "prev"` with `limit` on count is refused with `limit-invalid`, as before: `limit` stays collect's.

### `by` on count, sum, min, max and collect

**Built, 2026-11-11: `by` on count, sum, min, max and collect (issue #2).**
`by` groups a slot by `env.kind`, `env.observer`, the members of `about` under a typed-reference prefix (`env.about:<prefix>`), or a payload field.
It is allowed on count, sum, min, max and collect, following `prev` or not; on latest-by, or naming nothing to group by, it is `by-invalid` at `fold.<name>.by`, checked after `limit` and before the fold's argument.
The result is `{"groups": {<key>: <result>}, "unread": n, "ungrouped": m}`, each `<result>` the slot's own shape.
Settling, admission and the whole-reader heads come first, once, over everything held; each group is then the slot without `by` or `where` over the records selected into it.
The laws are `by.set`, `by.after-admission`, `by.accounting` and `by.partition`; `spec.slice` covers grouped slots without a new premise.
Ordering or top-N across groups, buckets and windows, and `by` on latest-by are not built.
**Kyle's choices, confirmed 2026-11-11:**
- The spelling `env.about:<prefix>`: it reuses `where`'s existing rule that `env.` names the envelope, so a bare name such as `about:project` is a payload field, and no second name is reserved.
- Keys are text, so a text value and a number or boolean value that render alike share a group: the text `"1"` and the number 1, the text `"true"` and `true`.
- A selected record with no key is counted in `ungrouped`: a missing field, no mention under the prefix, or a value that cannot be a key (a fraction, null, an array or an object). *Amended by Kyle on 2026-11-21: a list gives one group for each of its members; see that date.* It is never dropped and never a refusal; only a payload the reader does not hold makes a key unread.
- A record mentioning several things under the prefix counts in each.
- `limit` applies per group; a top-N across groups is a later discussion (the earlier strange-loops had one, in a weather vertex example).
- `by` is allowed on collect that follows `prev`, and refused only on latest-by.
**Implementer choices, confirmed by Kyle 2026-11-11:**
- Groups are written in UTF-16 order of their keys, the order canonical JSON and `thingsOf` use.
- The four law names, and `by` checked before the fold's argument as the issue proposed.

### Issue #1: envelope shape refusals, and a label in `under`

**Built, 2026-11-11.** Every envelope shape has a named refusal, as `protocol/spec.md` has for specs.
An envelope that is not an object is refused with a new code, `envelope-not-object`.
A required field left out, or any field of the wrong JSON type, is refused with that field's existing code, in that field's place.
The model reads such a field as empty text, which every field's own check refuses (`unreadable_refused`).
The same change brings the batch up to the settled ledger entry "A label may stand in `under`": a draft may name another by label in `about`, `of`, `prev` or `under`, never in `erases`, and labels in `under` take part in cycles.
**Kyle's choice, confirmed 2026-11-11:** `loops emit -` reads a changeset line's envelope fields through the core's reader, as `Read.envOf` does.
A field left out or of the wrong JSON type gets the field's own code, in the writer's order across the whole changeset, so another line's label refusal outranks it.
`draft-shape` stays for a line's own shape only: a line that is not a JSON object, or a label that is not text; an unknown member stays `draft-field-unknown` and a repeated one `member-duplicate`.
The CLI fills in `observer` and `emitted` only when a line leaves them out; one given mistyped gets its code, and `observer-unbound` now judges only a typed observer.
A line's salt is read as the core reads one, so one that is not base32hex text is `salt-not-16-bytes` in its place.
**The reviewer's direction, confirmed by Kyle 2026-11-11 when approving !21:**
- One new code, `envelope-not-object`; every other shape fault folds into an existing code, extending "A malformed value uses the field's existing refusal code".
**Implementer choices, confirmed by Kyle 2026-11-11 when approving !21** (an untyped CLI observer is `observer-not-typed`, as above):
- `envelope-not-object` is a shape check across every envelope: after `envelope-field-unknown`, before `string-not-unicode` and every value.
  So a later record variant that is not an object refuses the input, as an unknown key does, though the first envelope decides value refusals (D5).
- A batch draft object without `env` has an envelope that is not an object.
- `null` is a value of the wrong type, not a field left out: `"occurred": null` is `occurred-not-span`.
- A set that is not an array is refused with its code; so is a set with a member that is not text, and a label beside such a member is still a label, so labels are checked first.
- A salt left out, not text, or not canonical base32hex is `salt-not-16-bytes`, in that check's place.
- A batch draft that is not an object, an unknown draft member, a label that is not text, a draft without a payload, and a repeated envelope member name stay malformed input, with no code.

**Implementer choice, confirmed by Kyle 2026-11-11.**
- In JavaScript, a repeated envelope or draft member is seen only from raw text, in the fuzz adapter; the value APIs (`resolveBatch`, `writeRecord`, `seal`, `writeText`) cannot see one (`interop/js/README.md`).

### D7: canonical result encoding, the choice

Kyle chose the recommendation below on 2026-11-11, and on 2026-11-20 ruled that no integer carries a tag and that `shown` is not in the bytes (the cut note, sections 4 and 6). It is built (2026-11-20), and changes no reading; step 4's ticks need it.
The [open design](design/rethink/sections/16-open.html) prefers JCS for results.
Exact, unbounded `Sum` outputs include `9007199254740993` in `phase2-exact-output`.
Neither current tests nor the model define a canonical result hash codec.
**Readings:** Define a separate exact-integer canonical JSON extension, or use typed decimal integer strings inside JCS.
Raw JCS numeric rounding cannot preserve every `Int`.
**Effects:** These choices produce different bytes, hashes, and schemas.
**Recommendation:** Define a separate versioned result codec using typed decimal integer strings under JCS.
Never round or cap current model outputs.

## 2026-11-10

In brief:
- Kyle ruled D8: `of` names a record's one thing, `about` only mentions, and `sets` declares the keys an emit sets.
- D8a and D8b were built across the model, the vectors, JavaScript and Rust.
- Kyle confirmed the landed choices of D1 to D6.
- Kyle set the order of the steps: finish step 2 with D8, then step 4 (ticks), then step 3 (standing) together with step 5 (sharing).

### D8: items, mentions and declared keys

Kyle ruled this on 2026-11-10.
D8a and D8b are built across the model, vectors, JavaScript and Rust, and all of D8c is built: `sets` in the envelope, liveness per key, latest-by following `keys`, count, sum, min, max, collect and `by` following `keys`, the slice laws for one keyed thing and for a spec with a keyed slot, and the anchor rule and copied `about` in `loops emit`.
It changes the settled envelope, so it lands as R1–R6 and D1–D6 did: model, vectors, JavaScript, Rust, then protocol and pages.
**Finding:** Two apps built on the product slice hit one wall on 2026-11-10.
The orchestration dry run is in [Scenarios](design/rethink/sections/13-scenarios.html), step 8; margins-claude's `work` app is described in its notes on merge request !12.
`about` does two jobs: "this record is an emit of this thing" and "this record mentions that thing".
A task about its plan became a rival head of the plan.
A record about something else was not a thing under its own id.
A closing record about the 23 ids it covered became the winner of each.
Restating a whole payload on every change left a writer no basis to merge a fork field by field; the fork showed as two heads, and one writer's merge dropped a change.
The earlier systems (`tasked`, `ticked`) keyed a fold by a field and re-emitted only the changed key.

The choice has three parts. D8a and D8b go together; D8c can follow.

- **D8a, an item field.** One single-valued envelope field, `of`, says which thing a record is an emit of.
  Only a root, a record with no `of` and no `prev`, leaves it out; it is an emit of the thing its own id names.
  Every record with `prev` states `of`. A tool may fill it in; the protocol never infers it.
  `of` is read literally: a reader never resolves it through another record, so a record's thing is a fact of its own envelope.
  An id in `of` names a root; a writer holding a record that is not a root refuses to name it.
  `latest-by` runs over this field; a thing's heads are records of it.
  Every `prev` target must be an emit of the same thing, so `prev` never crosses things.
  One thing replacing another is a new thing that mentions the old one, plus an emit on the old one that closes it: two records, not atomic.
- **D8b, `about` is mention only.** `about` never makes a head.
  `where` and `collect` still read it, so "everything said about X" stays a fold.
  A link needs no new primitive: it is a thing whose `about` names both ends.
- **D8c, declared keys.** An envelope field, `sets`, lists the payload keys an emit sets.
  A keyed fold holds, for each key, the setters no descendant setter of that key replaces, over `prev`.
  Different keys from one head merge; one key set twice from one head leaves two live setters, and the fold reports both.
  A key is unknown exactly when a live setter's payload is not held, as `where` answers.
  Withheld and erased are one state to the fold: an envelope without its payload.
  They differ only in what comes next, which the arrival laws carry: a withheld payload may arrive, an erased one must be dropped.
  Either way a later emit that sets the key makes it known again.
  A declared key absent from the payload is unset, and a payload key that is not declared is not read.
  An absent declaration and an empty one differ: absent means the record is read whole, as today; empty means it sets nothing, which is a pure join of two heads.
  A whole-read emit sets every key, named or not, and stays needed until a later whole-read emit replaces it.

**Readings:** Put identity and keys in the envelope, or in the payload.
In the payload, an erased or withheld emit can be placed only by `prev`, and a slice or a sync cannot be computed from envelopes.
For declared keys, margins-claude's experiment (`sl-py/keyfold.py`) found no wrong answer in 240,000 key answers, and none in 320,000 more with whole-read emits mixed into the chains.
Within one thing, its envelopes plus its live setters' payloads sufficed, and none could be dropped.
The experiment takes the item as given, one thing at a time, with no erasing records and no admission.
That identity belongs in the envelope (D8a) is argued, not measured, and the composition with `thing.slice` is untested.
Without declared keys, a reader needs every payload in the chain, or answers wrongly when an unheld emit is taken to set nothing.
**Effects:** Two new envelope fields enter the id; a record without them keeps its bytes and id.
Records already about a thing stop making heads of it, so the `latest-by` vectors and the heads and slice laws are restated.
`prev-unrelated` is restated over the item field.
A record is an emit of one thing only; today one record can head several.
An erased emit still shows which keys it changed, though not to what.
Kyle accepted this on 2026-11-10: erasure is the emergency stop for something that should not have been emitted, and its job is that the content travels no further.
`kind`, `about` and the times already survive erasure; secrets do not go in envelopes, key names included.
The core starts to read a payload's top-level keys by name.
`thing.slice` as proved covers whole-record folds only; the keyed fold needs its own slice law, argued and not yet stated in Lean.
**Order:** Take D8a and D8b now, in the envelope, before any store is kept.
Take D8c as a second fold family beside whole-record `latest-by`, once D8a's shape is settled and its slice law is stated.
Kyle, 2026-11-11: D8c starts with a design note, before any code. Once an emit can set only some keys, a thing's current state is the merge of its live setters, not one head's payload, and `where`, `follow` and `by` read a head's payload today. The note says how they read a keyed thing, the spec grammar and result of the keyed fold, the writer's anchor rule and the witnessed slice law. margins-claude drafts it.
**Amended by Kyle, 2026-11-10,** on margins-claude's finding in issue #4 (`sl-py/keyslice.py`): D8a first let a record with `prev` leave `of` out and take its thing from what it replaces.
That made a record's thing depend on another record being held, and a partial copy then answered wrongly: 10,276 of 33,634 cases under one slice rule and 412 under the other, against none in 35,200 with `of` stated.
The CLI's "a revision without `--about` is about what it replaces" stays as a writer's convenience only.
The same experiment found that a replaced member sent without the path to what replaced it reads as live, and proposed that what is sent of a thing be convex over `prev`.
Issue #5 corrects the proposal: convexity is sufficient but not exact, and on a steady history the convex part is nearly the whole history.
The exact law is *witnessed*: every held setter of a key that is dead for that key has a setter of that key above it through held records (`witnessed_iff`, in margins-claude's `lean/Convex.lean`).
Either law is about a slice read alone; a slice merged into an older holding is step 5's question.
margins-claude will state the law over the model once D8a is modelled.
Kyle agreed on 2026-11-11 (issue #5): the model states *witnessed*, with convex as a corollary, and a writer's tool fills in the anchor, as it fills in `of`: an emit that sets a key names in `prev` every record its writer holds that sets that key and is still a live setter of some key. Then the live setters alone are a slice. A slice law is about a slice read alone; merging slices is step 5's question.
**Kyle's choices, 2026-11-10,** following margins-claude's reasoning on merge request !13:
- **Names:** the item field is `of` and the declaration is `sets`. A record *of* the task, against a record *about* it; `sets`, like `erases`, is a verb for what the record does.
- **Natural keys:** `of` takes a record id or a natural key, as `about` does.
  A writer can name a thing before holding any record of it, and two writers who start the same named thing join.
  An unnamed thing is rooted at its first record, and a second branch without `prev` joins it by that id.
  In an open store anyone can emit of a name and become a head; that is left to standing, where grants per thing belong.
- **Same value from two setters:** the core declares no conflict.
  The keyed fold reports each key's live setters, newest first, as whole-record `latest-by` gives a winner and the others.
  Whether two of them conflict is a reading made above the core, so the core never defines equality on payload values.
  A reading should not treat agreement as a conflict.
**Kyle, 2026-11-10, on undeclared payload keys:** refusal is progressive.
A writer refuses a payload key it did not declare only in a store declared strict.
Elsewhere the key is written, the keyed fold does not read it, and a whole-record fold, a `where` test or a lens still can.
Making it count takes a new emit that declares it, since the declaration is in the id.

**Built, 2026-11-10: D8a and D8b.**
The model gives each record one thing, `of` or its own id, and makes `about` a mention only.
Its laws are restated over the thing, and `thing.one`, `thing.mentions` and `record.of` join the index.
The vectors are regenerated; JavaScript and Rust agree on every one, and the `d8ab-1` campaign finds no mismatch.
D8c, declared keys, is built in the entries of 2026-11-14, all but its slice laws.
**Kyle's choices, confirmed 2026-11-10:**
- **Spec:** the spec says `"latest-by": "of"`. `from.of` selects a thing's records; `from.about` is a mention test.
- **Filling in `of`:** only the single-record `emit --prev` path fills `of` in, from the record it replaces.
  `emit -` fills nothing in: a changeset states `of` itself.
- **Unheld target:** the CLI refuses `prev-unknown` itself when a revision's target is not held, since it has nothing to fill `of` in from.
  On that path only, this precedes the writer's other checks.
- **Export:** `export --about` is a mention filter and `export --of` filters by thing.
- **Verb:** the verb that shows a thing is `loops of <thing>`, renamed from `loops about <thing>`.
**Implementer choices, confirmed by Kyle 2026-11-11** (there are no stores yet beyond iteration tests, so the missing compatibility path costs nothing):
- The codes `of-not-typed`, `of-missing` and `of-not-root`, and their places: `of-not-typed` right after `about-not-typed`, `of-missing` last of the envelope checks, and `of-not-root` between `prev-unknown` and `prev-unrelated`, all three across the whole batch.
- `"latest-by": "about"` is refused with `fold-argument`; there is no compatibility path.
- A reader polices neither `of-missing` nor roots. A held record with `prev` and no `of` is of its own id, so its `prev` crosses things and admission refuses it.
- `from.about` and `from.of` in one source mean both.
- A held entry in a batch vector is `{"id", "of"?, "prev"}`.

### Settled: D1–D6

The human settles each decision as its written recommendation.

- **D1:** A public lens reader refuses a base that repeats a section id, with `base-id-duplicate`.
  It checks the base before the text, so this refusal precedes every text refusal.
  The raw core keeps first-lookup behavior.
- **D2:** Text is Unicode scalar values.
  A lone surrogate is refused with `string-not-unicode` before hashing, and nothing is substituted.
  The rule covers values, member names, envelopes, and batches.
  The refusal follows `envelope-field-unknown` and precedes `kind-empty`.
  A payload text receives it only when the text is JSON by syntax.
  A fixture that holds a lone surrogate anywhere else, ignored metadata included, is malformed input in all three.
- **D3:** A number past binary64's range is refused by the writer's number check, with `number-out-of-range`.
  That check stays last in the writer's order.
  The Rust core stays finite; its input adapter carries the overflow to that check and to the spec parser.
  Reader records still require finite numbers.
- **D4:** Signing fixtures require a canonical seed of exactly 32 bytes, read only after the record is written.
  No adapter pads or truncates. This is a fixture rule, not a record rule.
- **D5:** A record input's first envelope and first payload decide its refusal, as in Lean.
  Once they are written, a later variant that names another record is malformed input.
  So is a later payload variant that is refused.
- **D6:** Four helper lemmas are proved and pinned.
  They are `Sum.on_step_missing`, `Max.acc_readable`, `Min.acc_readable`, and `Spec.mem_select`.

D2 and D3 left the code name, stage, and precedence to the human.
Kyle confirmed the landed choices on 2026-11-10:
the name `string-not-unicode` and its stage after raw shape, the reuse of `number-out-of-range`, the same overflow handling for spec arguments, and D1 refusing duplicates only.
D1's name `base-id-duplicate`, D5's refused-payload fault, and the Rust stand-in are implementer choices.
See [record rules](protocol/record.md), [the lens contract](protocol/lens.md), and [Rust boundaries](rust/GAPS.md).
D7 is built since 2026-11-20.

## Step 1 and before

In brief:
- The six step-1 rulings, R1 to R6, were applied before any record existed.
- The binary64 standards choice was closed with Option A.

### Settled: step-1 rulings R1–R6

- **R1:** Every byte string uses lowercase, unpadded base32hex.
  Readers require canonical lengths and zero pad bits.
  Proved id text order equals digest order.
- **R2:** The id preimage remains the JCS object containing `commit` and `env`.
- **R3:** Signed bytes remain `loops/record/v1:` followed by the id text, encoded as UTF-8.
- **R4:** Instants use UTC `Z`, seconds 00 through 59, and optional fractions of one through nine digits.
  A fraction ends in a nonzero digit.
  The actual parser has proved spelling uniqueness and parse-render recovery.
- **R5:** Typed references retain lowercase prefixes; sets retain UTF-16 code-unit sorting.
- **R6:** Raw envelope readers return `envelope-field-unknown` before checking values, including `kind-empty`.
  The payload remains the extension point.

See [record rules](protocol/record.md) and [the settled ledger](design/rethink/ledger.json).

### Settled: binary64 standards and writer range

The human closes the standards choice with Option A.
Rust uses native shortest binary64 digits, ECMAScript notation, and exact midpoint tie correction.
The writer refuses every magnitude above 2^53 − 1, including fractional values.
Canonical formatting covers finite binary64 independently of writer acceptance.
A Lean roundtrip proof and a shortest proof do not yet exist; neither blocks this choice.
See [Rust numeric boundaries](rust/GAPS.md) and [record rules](protocol/record.md).
