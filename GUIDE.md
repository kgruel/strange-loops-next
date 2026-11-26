# A guide to loops

`loops` keeps what people and programs said, each statement signed, and answers questions about those statements. This guide is for someone starting out. It has three parts:

1. **How to think about it.** The few ideas everything else follows from.
2. **Laying out your data.** The choices to make before the first write.
3. **Using the command.** Writing, reading, standing questions and ticks, with real output.

A second walk then writes a short book from its sources, where the records are mostly words.

It describes release 0.1.1, and one person's stores on one machine, which is what is built today. Every command on this page was run as written. The ids and times shown are from that run, and yours will differ. The examples are a pottery workshop: kilns, potters and firings.

Two things are left out on purpose:

- **Sharing a store with other people.** It waits on standing, the rules for who may write to a store, and neither is built.
- **How to work with it.** When to write, what is worth keeping, and what you tell an agent about `loops` are habits of your own. This page is for a person to read and follow, and it shows what the command does.

This page is a guide, not the rules. The rules are in [the record](protocol/record.md), [the spec](protocol/spec.md), [the tick](protocol/tick.md) and [the notes on the command](rust/PLACE.md). Where this page and those disagree, they are right.

## Ten minutes: a first store

Install `loops` from a release ([README](README.md#installing-loops)). Then make a signing key and a store:

```sh
loops whoami --init      # make this machine's signing key, once
mkdir -p pottery/workshop && cd pottery/workshop
loops init               # make .loops/ here
```

Say what the store holds. Put this in `.loops/store.json`:

```json
{
  "version": 2,
  "kinds": {
    "kiln": { "key": "name" }
  }
}
```

It says one thing: a `kiln` is named by its `name` field. Now say something about a kiln, and then say something more:

```sh
loops emit kiln name=east status=cold cone:=6
loops emit kiln name=east status=firing
```

Each command prints the id of the record it wrote. `field=text` writes text, and `field:=json` writes any JSON value, here the number 6. Ask what the kiln is now:

```
$ loops of kiln:east --plain
thing  kiln:east  east
records  2
heads  1
  cone  6
  name  east
  status  firing
about  —
head  r:u0rjookveh5gecuk3drq96um1vj0l7jo7jbgka9avivvd6i12ns0
  emitted  now
  occurred  —
```

The status changed and the cone did not. But nothing was changed in place. The store holds two records, and the second one is this, laid out for reading with the signature cut short:

```json
{
  "env": {
    "emitted": "2026-11-26T01:36:30.719Z",
    "kind": "kiln",
    "observer": "k:r6n9026n2at0toq9frtcpuffc02071iar6cioipipbolcb0qd4fg",
    "of": "kiln:east",
    "prev": ["r:29oqd4cm2eua2gg09kp2aqtvnt61tu3e0iuk91u8s8ev3l7qrl70"],
    "sets": ["name", "status"]
  },
  "id": "r:u0rjookveh5gecuk3drq96um1vj0l7jo7jbgka9avivvd6i12ns0",
  "payload": { "name": "east", "status": "firing" },
  "salt": "kla6osph4bbsnt79v7frbj8ok8",
  "sig": { "ed25519": "pf33fodm…", "key": "k:r6n9026n…" }
}
```

It says who wrote it and when, that it is of `kiln:east`, which record it replaces (`prev`), and which fields it sets (`sets`). It does not mention the cone, so the cone still reads from the first record. `loops export --of kiln:east` prints both stored lines.

That is the whole idea. You only ever add records. What a thing is now is worked out each time you ask.

## Part 1: How to think about it

### A store is a set of signed statements

A record is one statement: somebody said this, at this time. It is signed with the writer's key and it never changes. The only write is to add a record.

So a store does not hold the truth about a kiln. It holds what was said about it, by whom. Two people who disagree leave two records, and both are kept. The current state is not stored anywhere. It is computed when you read, and that computation is called a fold.

### A record has an outside and an inside

The outside is the **envelope**. It is small, it has a fixed list of fields, and it is always kept:

| Field | Says |
|---|---|
| `kind` | what sort of statement this is: `kiln`, `firing` |
| `observer` | who says it. Today that is the key that signed it |
| `emitted` | when it was written |
| `occurred` | when the thing it describes happened, if the writer says |
| `of` | the one thing it is a statement of |
| `about` | other things it mentions |
| `prev` | the records it replaces |
| `sets` | the payload fields it sets |
| `erases` | the records whose payloads it erases |
| `under` | the grant it acts on. Grants belong to standing, the rules for who may write to a store, which is not built |

The inside is the **payload**: any JSON. When it is an object, its top-level members are the fields a fold can read. Nothing looks inside a nested object.

The split matters because a payload can be erased, and an envelope cannot. An erased record keeps its id, its signature and its place among the others. Only what it said is gone.

### A record is of one thing

`of` names the thing a record is a statement of: `kiln:east`. The name is a kind, a colon and a key. Two writers who use the same name are writing of the same thing, whether or not they have seen each other's records.

A record with no `of` is a **root**. Its own id, `r:` and 52 characters, is its name. That is the right shape for something that happened once, such as a firing.

`about` only mentions. A record of `kiln:east` that mentions `yard:north` is still a statement of the kiln alone.

### A revision points at what it replaces

A later record of the same thing names the earlier ones in `prev`. The records of a thing that nothing replaces are its **heads**. Usually there is one.

When two writers each revise a thing without having seen the other's record, the thing has two heads. That is a **fork**. Both are kept and both are shown. A later record that names both in `prev` joins them.

You rarely write `prev` yourself. `loops emit` fills it in with what you have read, which by default is everything the store holds.

### A revision says which fields it sets

`sets` lists the payload fields a record sets. `loops emit kiln name=east status=firing` sets `name` and `status`, so `cone` keeps the value an earlier record gave it. Each field of a thing is read from its **live setter**: a record that set the field, where no record replacing it has set that field again.

There are three cases, and they are different records:

- **`sets` names fields.** The record sets those and leaves the rest alone.
- **No `sets` at all.** The record is read whole: it replaces everything. The first write of a thing is like this, and so is a revision made with `--whole`.
- **`"sets": []`.** The record sets nothing. It is a pure join of two heads.

When a field has two live setters, `loops` does not pick one. It shows both and calls it a conflict, and a test that the two would answer differently answers unknown. Someone settles it by writing the field again.

This gives two ways to read a thing, and a fold says which it wants:

- **By its keys** (`"follow": "keys"`): each field from its live setter. Use it for state that changes a field at a time.
- **By its heads** (`"follow": "prev"`): each head as written, from its own payload. Use it for prose that is revised whole.

### The same records give the same answer

A fold's answer depends on which records you hold, never on the order they arrived in. Two machines that hold the same records compute the same bytes. That is what lets a tick, a record that freezes an answer, be checked on another machine. It is also one reason `sum`, `min` and `max` read whole numbers only: a sum of fractions can depend on the order of adding.

Unknown is an answer too. When a payload has been erased, or two setters disagree, a fold does not guess. It answers for what it could read and counts the rest as `unread`.

### loops counts, and you judge

A fold can count, sum, take a minimum or maximum, give each thing's latest state, and list records. Every one of these is exact and repeatable. There is no ranking, no following of links for several hops, and no opinion.

Judgement belongs to a person, a script or an agent. It reads a fold, decides something, and writes the decision back as a new record under its own name. That record can be folded like any other. This is the loop in the name.

### A store owns no meaning

A store is a set of signed lines. What they mean is kept beside them, in two kinds of file you write and review:

- **`.loops/store.json`** describes the store's kinds: the key field, the fields that point at other things, what to show first. The `emit` shorthand follows it and the plain views use it.
- **`.loops/vertices/<name>.json`** holds a question you ask often, as a fold.

Neither is needed to read a record. A record states its thing in full, so a reader with only the stored lines can still fold them.

A store is also cheap to throw away. It is a directory, with no server holding it open. When a layout turns out wrong, start another store and write what matters into it again, which is how Part 2 ends. Expect to do that more than once while you learn what your kinds are.

## Part 2: Laying out your data

Start from a blank page. Decide what the things and events in your work are before you look at an old schema.

### Where one store ends and another begins

Do not make one store per kind. Draw the lines where the data really differs:

- **Who writes it and what travels together.**
- **What is sensitive.** Keep what few people may see apart from what many will.
- **Pace.** Keep noisy, fast collectors apart from slow records such as decisions.

The first two look ahead. Sharing is not built, and when it is, a store is the unit that will be shared and synced.

A file named `stores.json` lists a group of stores by name, and one read can span them. So splitting costs little when you read. One limit to plan around: a tick is made from a single store, so records you want frozen together belong together.

### Three shapes

Every concept is one of these.

| Shape | Use it for | How |
|---|---|---|
| A thing with a key | Something that lasts, changes and is pointed at: a kiln, a potter, a decision | Give the kind a `key` field in the description. `loops emit kiln name=east` writes of `kiln:east`. |
| An event | Something that happened once: a firing, a note of something seen | Give the kind no key. Each write is a root, named by its id, and it points at things through its fields. |
| An edge thing | A link that several writers add to, or one with facts of its own | One thing per link, named `edge:<relation>:<from>:<to>`, with both ends in `about` and the fields `rel`, `from`, `to` and `state` in the payload. |

If a kind feels like both how something is now and what happened to it, it is two kinds. Make a keyed thing for the state (`kiln`) and an event for each happening (`firing`), and point from the event to the thing.

### Where the reason for a change goes

A field of a keyed thing is read as a fact about the thing. Write `status=cooling evidence=<one firing>` and later `status=cold evidence=<another>`, and the kiln's `evidence` is the later one. The earlier record still holds its own, but the kiln no longer shows it. There are three ways to keep reasons readable:

- **Put what happened in an event** and point at the thing from it. The firing stays a record of its own, and a read of everything that refers to the kiln finds it.
- **Cite it on the write, and read it per field.** `loops of kiln:east --setters` shows, for each field, the record that set it with that record's own payload.
- **Require it.** If every write of a kind must say what it rests on, list the field under `every_write` in the description.

### Links between things

| The link | Write it as | Example |
|---|---|---|
| One target under a role | A text field holding `kind:key` | `keeper=potter:ada` |
| A set that one writer states whole | A list field, read as a set | `governs:='["kiln:east","kiln:west"]'` |
| A link several writers add to, or one with facts of its own | An edge thing | `edge:vents-into:east:west` |

Declare each such field under `refs` in the description. The shorthand then checks what you write there, and `ls --refers-to` can answer "what points at this?" across stores.

`about` is for mentions, and they belong to the thing: each revision carries them on, and `--add-about` and `--drop-about` change them one at a time. It does not say what one record rests on. Nothing copies a reference field into `about`.

### Fields

- **Keep the payload flat.** A fold reads top-level fields. If something nested matters, make it a kind of its own that points back.
- **Count in whole numbers.** `sum`, `min`, `max`, `at-least` and `below` read whole numbers within ±(2^53 − 1). Store thousandths, cents or milliseconds, not fractions.
- **Mind text and numbers.** `cone=6` writes the text `"6"`, and `cone:=6` writes the number 6. A test for the number does not match the text.
- **Lists are sets of plain values.** `is`, `not`, `present`, `absent` and grouping work on a list of text, whole numbers or booleans. `at-least`, `below`, `sum`, `min` and `max` do not.

### Time

Every record has `emitted`, the moment it was written, filled in for you. `occurred` is your claim about when the thing happened, and you state it with `--occurred`. It can be coarse: a year, a month, a day (`2026-11-24`), an instant, an interval (`2026-11-20/2026-11-24`), or a start with no end yet (`2026-11-20/..`).

Records are put in order by `occurred` when it is stated and by `emitted` when it is not. So state `occurred` on events and on anything you write after the fact, and leave it off routine changes. A revision copies `occurred` from the heads when they agree. So a routine change to a thing whose last record stated `occurred` claims that earlier time too, unless you give it a time of its own or clear it with `--no-occurred`.

### A field at a time, or whole

- **State that changes piece by piece**, such as a kiln's status and keeper: write ordinary revisions, each setting what it states, and read by keys.
- **Prose that is revised as one piece**, such as a decision's text: revise with `--whole` and read by heads. Two people who revise it at once leave two heads for a person to reconcile, which is what you want for prose. Revise such a kind whole every time. [The second walk](#a-second-walk-a-book-and-its-sources) shows why.

### Write the description first

The description is your model of the store, in a file you can review. This is the workshop's `.loops/store.json`:

```json
{
  "version": 2,
  "note": "The workshop: its kilns, its potters and what was decided.",
  "kinds": {
    "kiln": {
      "note": "A kiln, keyed by where it stands.",
      "key": "name",
      "refs": { "keeper": ["potter"], "evidence": [] },
      "lifecycle": {
        "field": "status",
        "active": ["cold", "firing", "cooling"],
        "closed": ["retired"]
      },
      "preview": ["status", "cone", "keeper"]
    },
    "potter": {
      "key": "name"
    },
    "decision": {
      "note": "A decision, revised whole.",
      "key": "slug",
      "headline": "text",
      "refs": { "governs": ["kiln"] }
    },
    "edge": {
      "note": "One thing per link that has facts of its own.",
      "refs": { "from": [], "to": [] },
      "lifecycle": { "field": "state", "active": ["active"], "closed": ["removed"] }
    }
  }
}
```

And the yard's, which holds events:

```json
{
  "version": 2,
  "note": "What happened in the yard.",
  "kinds": {
    "firing": {
      "note": "One firing of one kiln. An event: written once, never revised.",
      "headline": "text",
      "refs": { "kiln": ["kiln"], "potter": ["potter"] },
      "every_write": ["kiln", "cone"]
    }
  }
}
```

| Member | Says |
|---|---|
| `version` | 1 or 2. Version 2 adds `every_write`. |
| `note` | Words for a reader, on the store or on a kind. |
| `key` | The text field that names the thing: a kiln's `name` gives `kiln:east`. Leave it out for events and for things you name with `--of`. |
| `headline` | The text field shown as the thing's one-line label. Without it, the key field is used. `text` is the field a trailing message is written to. |
| `refs` | The fields that point at other things, each with the kinds it may name. An empty list allows any kind and record ids too. |
| `lifecycle` | A field whose values are sorted into `active` and `closed`. The shorthand accepts only the listed values, and `ls --active` hides things whose value is closed. |
| `preview` | The columns `ls kiln:` shows for the kind's things. Events have no names to list by, so pick their columns with `--fields`. |
| `every_write` | Fields that every shorthand write of the kind must state. |

What the file does:

- **`loops emit <kind>` follows it** and stops before signing when a write contradicts it. The stops are listed in Part 3.
- **The plain views use it** for headlines, columns and `--active`.
- **`loops describe` measures the store against it**, and `ls --refers-to` reads the reference fields it declares.

What it does not do: it refuses nothing in the store itself. `emit -` writes anything the store accepts and never reads the file. A store that turns writers away is standing, which is not built.

### Bringing old data in

Keep the old store as a read-only archive. Pick the things and events worth keeping, and write them again through `loops emit` with `--occurred` set to when each happened. The shorthand's stops then act as a check on every line, and `loops describe` shows what does not fit when you are done. For a large batch, pipe lines into `emit -`, and review with `describe` afterwards, since a batch skips the stops.

## Part 3: Using the command

Read commands print JSON, the same on a terminal and through a pipe. Add `--plain` for a view made for reading. The plain view may change between releases, so scripts use the JSON. Some examples pass the JSON through `jq`, a separate tool for picking values out of it.

### Naming the store

A command acts on the store in the current directory. To act on another:

- **`-C <dir>`** runs as if started in that directory.
- **`--in <name>`** picks a store by name from a group list.
- **`--group`** picks every store in the list. `describe` and `ls --refers-to` take it.
- **`--store <name>=<dir>`** gives a name for one command.

These go before the verb: `loops --in yard ls`, `loops --group describe`. `init`, `whoami` and `shadow-import` take no `--in`.

A group list is a file named `stores.json` that maps names to directories. Make the yard a second store beside the workshop, and list both:

```sh
cd ..                    # into pottery/
loops -C yard init
```

```json
{
  "workshop": "workshop",
  "yard": "yard"
}
```

Save that as `pottery/stores.json`. `loops` looks for the list beside a store's `.loops/`, then in the directory above it, then in `~/.config/loops/stores.json`. Outside a store it looks in the current directory.

Then save the two descriptions from Part 2 as `workshop/.loops/store.json` and `yard/.loops/store.json`. The workshop's replaces the short one from the first ten minutes.

### Writing

```sh
loops --in workshop emit potter name=ada
loops --in workshop emit kiln name=east keeper=potter:ada
loops --in workshop emit kiln name=west status=cold cone:=10 keeper=potter:ada
```

A firing is an event. Its kind has no key, so each write is a root, and the trailing words become its `text` field:

```
$ loops --in yard emit firing kiln=kiln:east cone:=6 potter=potter:ada \
    --occurred 2026-11-25T09:00:00Z "Glaze firing, slow cool"
writing --in yard to ~/pottery/yard (bound by ~/pottery/stores.json)
r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0
```

The first line goes to standard error. It says which store the name led to, and it is left out of the examples below. The second line is the new record's id. Paths are shortened on this page to start at `~/pottery`, and the tool prints them in full.

A second firing, of the other kiln a day earlier, known only to the day:

```sh
loops --in yard emit firing kiln=kiln:west cone:=10 potter=potter:ada \
  --occurred 2026-11-24 "Stoneware, full load"
```

A change to the kiln can cite the firing it rests on, by the firing's id:

```sh
loops --in workshop emit kiln name=east status=cooling \
  evidence=r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0
```

A decision is prose. Write it, then revise it whole:

```sh
loops --in workshop emit decision slug=slow-cool governs=kiln:east \
  "Cool the east kiln slowly after a glaze firing."
loops --in workshop emit decision slug=slow-cool --whole \
  governs:='["kiln:east","kiln:west"]' "Cool every kiln slowly after a glaze firing."
```

An edge thing is written with `--of`, since its name is not one field:

```sh
loops --in workshop emit edge --of edge:vents-into:east:west \
  --about kiln:east --about kiln:west \
  rel=vents-into from=kiln:east to=kiln:west state=active
```

A mention is added to a thing one at a time, and later revisions carry it on:

```sh
loops --in workshop emit kiln name=east --add-about yard:north
```

Other writes, for reference. They are not part of this walk, so the output further down does not show them:

| To | Run |
|---|---|
| Drop a mention | `loops --in workshop emit kiln name=east --drop-about yard:north` |
| Revise a thing you name in full | `loops --in workshop emit edge --of edge:vents-into:east:west state=removed` |
| Write a root of a kind that has a key | `loops --in workshop emit potter --root "A visitor, not yet named"` |
| End the options, so a message may start with a dash | `loops --in workshop emit decision slug=flags -- "--whole replaces the record"` |
| Write an exception the description would stop | `emit -`, below |

On each write the shorthand does these things for you:

- **Names the thing** from the key field: `name=east` gives `of: kiln:east`.
- **Fills `prev`** with the thing's live records, which are its heads and the live setters of its fields, so the write replaces what you have read.
- **Fills `sets`** on a revision with the fields you stated.
- **Carries the thing's mentions** in `about`, and `occurred` when the heads agree on it.
- **Signs the record** and appends it.

### When the shorthand stops you

A stop happens before anything is signed, exits with 2, and tells you what to change. These are real ones from the two stores above. Each was run after `loops --in workshop`, or `loops --in yard` for the firing, and the messages are shortened:

| You wrote | It says |
|---|---|
| `emit glaze name=ash` | `store.json does not name this kind. It names ["decision","edge","kiln","potter"].` |
| `emit kiln status=cold` | `missing declared key field name. State name=<key> or --of <thing>, or use --root for a keyless root.` |
| `emit kiln name=east --of kiln:west status=cold` | `name=east disagrees with the key west of kiln:west from --of.` |
| `emit kiln name=east status=warm` | `status=warm is not a listed lifecycle value. Use text from closed ["retired"] or active ["cold","firing","cooling"].` |
| `emit kiln name=east keeper=yard:north` | `keeper: yard:north is not an allowed reference. … Allowed prefixes: ["potter"].` |
| `emit kiln name=east keeper=potter:ada,potter:bo` | `A comma in a reference is literal. For multiple targets use keeper:='["potter:a","potter:b"]'.` |
| `emit firing kiln=kiln:west` | `missing every_write fields ["cone"]. State each field on this write …` |
| `emit kiln name=east status=cold --sets status` | `--sets leaves out payload fields ["name"]. Add --sets name. You can also drop --sets …` |

The last one holds with or without a description: if you state `--sets` yourself, it must cover every field the command gives. `--sets-nothing` takes no fields at all, so a pure join names its thing with `--of`.

Most stops also name the way out for a true exception: `emit -` writes anything the store accepts.

### Reading

What a store holds, by kind and then by thing:

```
$ loops --in workshop ls --plain
KIND      RECORDS
decision  2
edge      1
kiln      6
potter    1

$ loops --in workshop ls --things --plain
THING                      HEAD KINDS  RECORDS  HEADS  HEADLINE
decision:slow-cool         decision    2        1      Cool every kiln slowly after a glaze firing.
edge:vents-into:east:west  edge        1        1      —
kiln:east                  kiln        5        1      east
kiln:west                  kiln        1        1      west
potter:ada                 potter      1        1      ada
```

`HEAD KINDS` is the kind of the thing's heads, `RECORDS` counts the records of it, and `HEADS` counts those that nothing replaces.

`ls kiln:` lists the things whose names start `kiln:`, with the columns the kind's `preview` names. `--active` hides the closed ones, and `--fields` picks the columns:

```
$ loops --in workshop ls kiln: --active --plain
active  {"closed":["retired"],"field":"status","kind":"kiln"}
THING      HEAD KINDS  RECORDS  HEADS  status   cone  keeper
kiln:east  kiln        5        1      cooling  6     potter:ada
kiln:west  kiln        1        1      cold     10    potter:ada

$ loops --in workshop ls kiln: --fields status,cone --plain
THING      HEAD KINDS  RECORDS  HEADS  status   cone
kiln:east  kiln        5        1      cooling  6
kiln:west  kiln        1        1      cold     10
```

One thing, with each field's value, its mentions and its heads:

```
$ loops --in workshop of kiln:east --plain
thing  kiln:east  east
records  5
heads  1
  cone  6
  evidence  r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0
  keeper  potter:ada
  name  east
  status  cooling
about  yard:north
head  r:ms1a8oju9jutpjlg9vvqejbnjgpukgov0mjg3s45c104emp3kl7g
  emitted  now
  occurred  —
```

`loops --in workshop of kiln:east --setters --plain` prints the same, and then the records behind those values. Each `live` block is one record, the fields it is the live setter of, and its own payload. This is how you ask which write gave the kiln its status, and what that write cited:

```
live  r:ms1a8oju9jutpjlg9vvqejbnjgpukgov0mjg3s45c104emp3kl7g
  emitted  now
  keys  name
  about  yard:north
  payload
    name  east
live  r:1idg81qag4656daodnjcv534sh19g0ncth9oejlg037fr73aufvg
  emitted  now
  keys  evidence status
  about  —
  payload
    evidence  r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0
    name  east
    status  cooling
live  r:5qt0buogksmmlqc9j9v344vf2hpsbp1cl3vvjgo584gbcm1ph560
  emitted  now
  keys  keeper
  about  —
  payload
    keeper  potter:ada
    name  east
live  r:29oqd4cm2eua2gg09kp2aqtvnt61tu3e0iuk91u8s8ev3l7qrl70
  emitted  now
  keys  cone
  about  —
  payload
    cone  6
    name  east
    status  cold
```

Everything that points at a thing, across the group. It reads the reference fields the descriptions declare, as each thing states them now:

```
$ loops --group ls --refers-to kiln:east --plain
target  kiln:east
things  3
  decision:slow-cool
  edge:vents-into:east:west
  r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0
stores  2
  ~/pottery/workshop
  ~/pottery/yard
KIND      FIELD     DESCRIPTION
decision  governs   ~/pottery/workshop/.loops/store.json
edge      from      ~/pottery/workshop/.loops/store.json
edge      to        ~/pottery/workshop/.loops/store.json
firing    kiln      ~/pottery/yard/.loops/store.json
firing    potter    ~/pottery/yard/.loops/store.json
kiln      evidence  ~/pottery/workshop/.loops/store.json
kiln      keeper    ~/pottery/workshop/.loops/store.json
things_not_read  0
values_not_typed  0
fields_read  7
```

The answer says what it read: which stores, which fields, and how many things it could not read. The third thing listed is the firing.

And the records themselves:

| To see | Run |
|---|---|
| One record, by id or the start of one | `loops --in yard get r:hnqjpebh` |
| The events of a store, which are named by their ids | `loops --in yard ls r: --fields kiln,cone,potter --plain` |
| The stored lines of a thing | `loops --in workshop export --of kiln:east` |
| The stored lines of a kind, or of everything | `loops --in yard export --kind firing`, `loops --in yard export` |
| That every line is intact and signed | `loops --in workshop check` |

A record is found in the store that holds it. `get` in the workshop does not find a firing kept in the yard.

### Standing questions

A question you ask often is a **spec**, saved as a **vertex** in `.loops/vertices/`. Make that directory first, with `mkdir -p workshop/.loops/vertices`. This vertex is `workshop/.loops/vertices/overview.json`:

```json
{
  "vertex": "overview",
  "from": [
    { "store": "workshop", "kind": ["kiln"] },
    { "store": "yard", "kind": ["firing"] }
  ],
  "fold": {
    "kilns": {
      "latest-by": "of",
      "follow": "keys",
      "where": { "env.kind": { "is": "kiln" } }
    },
    "kilns_by_status": {
      "count": true,
      "follow": "keys",
      "where": { "env.kind": { "is": "kiln" } },
      "by": "status"
    },
    "firings": {
      "count": true,
      "where": { "env.kind": { "is": "firing" } }
    },
    "hottest": {
      "max": "cone",
      "where": { "env.kind": { "is": "firing" } }
    },
    "this_week": {
      "collect": true,
      "limit": 5,
      "where": {
        "env.kind": { "is": "firing" },
        "env.when": { "at-least": "2026-11-23", "below": "2026-11-30" }
      }
    }
  }
}
```

```
$ loops --in workshop read overview --plain
kilns
  thing  kiln:east  east
    heads
      r:ms1a8oju
    setters  evidence
      r:1idg81qa
    setters  keeper
      r:5qt0buog
    setters  name
      r:ms1a8oju
    setters  status
      r:1idg81qa
    whole
      r:29oqd4cm
  thing  kiln:west  west
    heads
      r:toj639q1
    whole
      r:toj639q1
kilns_by_status
  group  cold  1
  group  cooling  1
  0 ungrouped
  0 not read
firings  2
hottest  10
this_week
  r:hnqjpebh
  r:dvmeq3fl
```

`from` chooses records, and `fold` names the answers you want, each called a slot. Under each kiln, `setters` names the record each field is read from, and `whole` names a live record that is read whole: it supplies every field no setter is listed for, here the cone.

**Sources.** Each entry of `from` names a store and may narrow by `kind` (a list), by `of` (one thing) or by `about` (one mention). The stores named are read together as one set, and a record is taken when any source takes it. A source does not keep its kinds to its own store, so narrow each slot with `where`, as above. The name `.` means the current store.

**Slots.** Each has exactly one fold type:

| Fold type | Gives |
|---|---|
| `"count": true` | how many |
| `"sum"`, `"min"`, `"max"`: a field name | that figure over the field, whole numbers only |
| `"latest-by": "of"` | each thing's current state. It must say `follow` |
| `"collect": true` | the records themselves, newest first, at most `limit` of them |

**`follow`.** Without it, a slot reads every record, replaced or not, which is right for events. `"follow": "keys"` reads each thing once, field by field from its live setters. `"follow": "prev"` reads each head as written.

**`where`.** A map from a field to tests. Every test must hold. A payload field is named plainly. An envelope field starts `env.`: `env.kind`, `env.observer`, `env.of`, `env.about`, `env.prev`, `env.under`, `env.erases`, `env.emitted`, `env.occurred` and `env.when`.

| Test | Holds when |
|---|---|
| `{"is": v}`, `{"not": v}` | the field equals `v`, or a list holds it. `not` is the opposite, so it also holds when the field is absent |
| `{"present": true}`, `{"absent": true}` | the payload has the field, or lacks it |
| `{"at-least": n}`, `{"below": n}` | a whole number, or a time, is at or over `n`, or under it |

`env.when` is the time a record is ordered by: `occurred` if stated, else `emitted`. A window includes its lower bound and leaves out its upper one.

**`by`.** Groups a slot's answer by a payload field, by `env.kind`, by `env.observer`, or by `env.about:<kind>` (each mention of that kind). A list field puts the record in a group for each member.

Four rules to remember:

- **`by` is not allowed on `latest-by`.** Group a `count` or a `collect` instead.
- **`env.when` tests, and does not group.**
- **On a `collect` that follows keys, `limit` counts things**, each listed whole.
- **A key that is not known is refused.** The source field is `kind`, and `kinds` is an error.

`--values` adds the records' payloads and envelopes to the JSON, which is what a script wants. A `collect` slot lists its records under `heads`:

```
$ loops --in workshop read overview --values \
    | jq -c '.this_week.heads[] | {when: .env.occurred, kiln: .payload.kiln, cone: .payload.cone}'
{"when":"2026-11-25T09:00:00Z","kiln":"kiln:east","cone":6}
{"when":"2026-11-24","kiln":"kiln:west","cone":10}
```

To try a spec without saving it, give `fold` a file or `-` for standard input. Without `follow`, this one reads every kiln record, replaced or not, and lists those whose own payload cites evidence:

```
$ echo '{"vertex":"cited","from":[{"store":"workshop","kind":["kiln"]}],
    "fold":{"cited":{"collect":true,"where":{"evidence":{"present":true}}}}}' \
    | loops --in workshop fold - --plain
cited
  r:1idg81qa
```

### Ticks

A **tick** is a record that freezes an answer. It holds the spec, the ids of the records it covered, the result and its hash. Anyone who holds those records can run it again.

Save a second vertex that reads the workshop alone, as `workshop/.loops/vertices/kilns.json`:

```json
{
  "vertex": "kilns",
  "from": [{ "store": ".", "kind": ["kiln"] }],
  "fold": {
    "kilns": { "latest-by": "of", "follow": "keys" }
  }
}
```

Then tick it, and check the tick:

```
$ loops --in workshop tick kilns
r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g

$ loops --in workshop tick --check r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g
{"answer":"same","closure":"yes","taken-not-covered":0}
```

`same` means the covered records still give the recorded answer, and the command exits with 0. Every other answer exits with 1: `differs`, `cannot check` (a payload or a record is missing here, or the tick was made under rules this binary does not have), and `not a tick`.

A tick stays `same` after later writes, because it speaks only for what it covered. `taken-not-covered` then counts the records the spec would take today that the tick did not cover. The next section shows one. `closure` says whether the tick covers everything its covered records replace.

What a tick covers:

| Run | Covers |
|---|---|
| `loops tick <vertex>` | the records the spec's sources take, and what they replace |
| `loops tick <vertex> --as-of 2026-12-01` | what was emitted before the start of that day, or before an instant |
| `loops tick <vertex> --cover <id> --cover <id>` | the records you pick, by id or the start of one |
| `loops tick <vertex> --all` | everything the store holds |

Three things to know:

- **A tick reads its own store alone**, whatever stores its spec names. A tick of `overview` made in the workshop counts no firings, though `read overview` counts them. Tick a vertex whose records live in the store you tick in.
- **A tick is an ordinary record** of kind `tick`, so it is listed, exported and folded like any other. Its payload has `rules`, `spec`, `spec-hash`, `result`, `result-hash` and `covers`, and `withheld` when a covered record's payload was not held.
- **A tick covers what `from` takes, before any slot's `where`.** A vertex that reads every kind and tests for one kind in its slots answers the same as one that names the kind in `from`, and covers far more. Name in `from` only what the slots read.

### Writing from what you read

By default a write claims to have read everything the store holds. A writer that decided from an older reading should say so, by naming the tick it read: `--base <tick id>`. Its `prev` is then filled from what that tick covered. Two writers who worked from the same tick, each without the other's change, then fork honestly instead of one silently replacing the other:

```
$ loops --in workshop emit kiln name=west cone:=9 --base r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g
r:692j0e96fthh361m83oj5l2ld1dea1r0o42tjh8656ldo54iecvg

$ loops --in workshop emit kiln name=west cone:=8 --base r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g
r:q5lh0mv1ne20a9nhtj42utdns2nkpj0vs6a46brma61cljkbcrk0

$ loops --in workshop of kiln:west --plain
thing  kiln:west  conflict (2): west | west
records  3
heads  2
  cone  conflict (2): 8 | 9
  keeper  potter:ada
  name  conflict (2): west | west
  status  cold
about  —
head  r:q5lh0mv1ne20a9nhtj42utdns2nkpj0vs6a46brma61cljkbcrk0
  emitted  now
  occurred  —
head  r:692j0e96fthh361m83oj5l2ld1dea1r0o42tjh8656ldo54iecvg
  emitted  now
  occurred  —
```

A fold shows the same honesty. Asked how many kilns have cone 8, and for the sum of the cones, it answers for the kiln it can read and counts the other as unread:

```
$ echo '{"vertex":"cones","from":[{"store":"workshop","kind":["kiln"]}],"fold":{
    "cone_8":{"count":true,"follow":"keys","where":{"cone":{"is":8}}},
    "total":{"sum":"cone","follow":"keys"}}}' | loops --in workshop fold -
{"cone_8":{"unread":1,"value":0},"total":{"unread":1,"value":6}}
```

The tick made before these two writes still checks. It speaks for what it covered, and now says that two records its spec would take are outside it:

```
$ loops --in workshop tick --check r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g
{"answer":"same","closure":"yes","taken-not-covered":2}
```

Note that `name` is in conflict too, though both sides wrote `west`. Each write stated the key field, so each set it, and `loops` compares no values. Settle a fork with an ordinary write that states the key and each field in conflict. It replaces both heads:

```
$ loops --in workshop emit kiln name=west cone:=8
r:ipse8r6aog7p271m3c6hikiivavj61m0h5rm8vfbfv8924ld6gqg

$ loops --in workshop of kiln:west --plain
thing  kiln:west  west
records  4
heads  1
  cone  8
  keeper  potter:ada
  name  west
  status  cold
about  —
head  r:ipse8r6aog7p271m3c6hikiivavj61m0h5rm8vfbfv8924ld6gqg
  emitted  now
  occurred  —
```

A pure join, `loops --in workshop emit kiln --of kiln:west --sets-nothing`, joins the heads and sets no field. It is right when the two sides changed different fields and both changes stand. It does not settle a field that has two live setters. After shorthand writes the key field is one of those, and the next ordinary write of the thing clears it.

`--base-id <id>` names one record as read, and it can be repeated or given beside `--base`. With either flag, the writer claims to have read only what the flags name and what those records replace, not everything the store holds.

### Batches and exceptions

`emit -` reads a changeset from standard input: one JSON object per line, each a record to write. All of them are written, or none. The two files below are saved in `pottery/`.

```
$ cat firings.jsonl
{"kind":"firing","occurred":"2026-11-20","payload":{"kiln":"kiln:east","cone":6,"text":"Bisque"}}
{"kind":"firing","occurred":"2026-11-21","payload":{"kiln":"kiln:west","cone":10,"text":"Stoneware"}}

$ loops --in yard emit - < firings.jsonl
{"records":[{"id":"r:cogi1h86ac7ka94q88igsm0ofmc9877vj43d86lnrn6vgi7ssc1g"},{"id":"r:lhifir1k14afjh16nn90oald2epvj1nu1u24b8g3jemkpo0fuh30"}]}
```

Plain `emit -` writes each line as given, so a revision there states its own `prev`. With `--fill`, each line is completed as the shorthand would complete it: `prev` from the thing's live records, the mentions carried on, and `sets` from the payload's fields.

```
$ cat revisions.jsonl
{"kind":"kiln","of":"kiln:east","payload":{"status":"cold"}}
{"kind":"kiln","of":"kiln:east","payload":{"cone":7}}

$ loops --in workshop emit - --fill < revisions.jsonl
{"records":[{"id":"r:rd892rg3cglcp0tsp0n9t8ipk7e2rvnlgpkccnjck9kpvoc32u80"},{"id":"r:i7ak43deiedtlb4hvt1mbeol18qbr2fksbje032v6f1dnbp59700"}]}
```

`emit -` never reads the description, so it is also the way to write the one record the description would stop. Check the fit afterwards with `describe`.

### Erasing

```
$ loops --in yard erase r:cogi1h86ac7ka94q88igsm0ofmc9877vj43d86lnrn6vgi7ssc1g "Logged against the wrong kiln"
{"id":"r:6ekpq7hp46p08eu8tg916c7jqojr6kb26ush2ndaj09bf7d4c7d0","openings-removed":1}
```

This writes a record of kind `erasure` that names the target and says why, and removes the target's payload from this store. `openings-removed` counts the payloads removed, which the tool calls openings. The erased record keeps its id, its envelope and its place. An erasure reaches this store only: a copy of the directory or an export made before it still holds the payload. Folds then tell you what they could not read. Of the four firings, one is now unreadable:

```
$ echo '{"vertex":"firings","from":[{"store":"yard","kind":["firing"]}],"fold":{
    "firings":{"count":true},
    "hottest":{"max":"cone"},
    "east":{"count":true,"where":{"kiln":{"is":"kiln:east"}}}}}' | loops --in yard fold -
{"east":{"unread":1,"value":1},"firings":{"unread":0,"value":4},"hottest":{"unread":1,"value":10}}
```

The count still counts it, since counting reads no payload. The test for the east kiln and the hottest cone each report one record unread.

### Checking the fit

`loops describe` measures what a store holds against its description, and refuses nothing. Run it over the group after the batch and the erasure above, and the yard's part ends:

```
$ loops --group describe --plain
…
store  ~/pottery/yard
description  version 2
note  What happened in the yard.
…
fit
KIND     DECLARED  THINGS
erasure  false     1
firing   true      4
firing references
FIELD   HERE  ELSEWHERE IN SELECTED GROUP  OUTSIDE SELECTED GROUP  NOT TYPED  NOT READ  WITHOUT MENTION  UNLISTED PREFIX  THINGS UNSET
kiln    0     3                            0                       0          1         3                0                0
potter  0     2                            0                       0          1         2                0                1
firing every write
FIELD  RECORDS MISSING  RECORDS NOT READ
cone   0                1
kiln   0                1
```

Read it as a list of questions answered:

- **Is every kind described?** `erasure` is not, which is fine: the description names the kinds you write by hand.
- **Where do the references lead?** `HERE`, `ELSEWHERE IN SELECTED GROUP` and `OUTSIDE SELECTED GROUP` say where the things referred to are held. Three firings name a kiln held in another store of the group. One could not be read, the erased one.
- **Are the references well formed?** `NOT TYPED` counts values not written `kind:key`, and `UNLISTED PREFIX` counts those naming a kind the field's `refs` list leaves out. Both are zero here.
- **Which things leave a reference unset?** The batch named no potter. One of its two firings shows here as unset, and the other is the erased one, counted under `NOT READ`.
- **Does every write state what it must?** No record is missing `cone` or `kiln`, and one cannot be read.

`WITHOUT MENTION` counts references whose target the thing does not also mention in `about`. Nothing copies a reference into `about`, so this is usually every reference, and it is not a fault.

For a keyed kind the report also counts things whose key field agrees with their name, disagrees, is unset or is in conflict. When you are moving data in, this report is the test: read each of the other counts that is not zero and decide whether you meant it.

### From scripts and agents

There is no server to run. A script calls `loops` and reads its JSON.

```
$ loops --in workshop of kiln:east | jq -c .values
{"cone":7,"evidence":"r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0","keeper":"potter:ada","name":"east","status":"cold"}
```

| Exit | Means |
|---|---|
| 0 | done |
| 1 | refused: the store or the rules say no, or a tick is not `same` |
| 2 | the command was wrong, or the shorthand stopped it |
| 3 | the system failed: a file could not be read or written |

An agent's turn fits the tools in four steps:

1. **Tick** the vertex it will decide from: `loops tick <vertex>`.
2. **Read** the answer: `loops read <vertex> --values`. The tick's own payload also carries the frozen `result`.
3. **Decide.** This is the agent's own work, outside `loops`.
4. **Write back** with `--base <tick id>`, so the record says what it was decided from.

A fold does not walk links for several hops. To draw a graph, read all the things and the active edge things in one `read --values` and walk them in your own code, or step with `ls --refers-to` and `of`.

It is quick enough to call often. On a store of 9,000 records a fold takes about a quarter of a second, and `emit - --fill` writes 8,000 revisions in under a second ([CHANGELOG](CHANGELOG.md)).

## A second walk: a book and its sources

Kilns and firings are state and events. Much of what people keep is words, and the same shapes hold them. This walk writes a short history of the workshop. Each passage is a thing with a key, revised whole. Each source the book draws on is an event. The book itself is stored nowhere: it is a fold over the passages, and the same records answer other questions too.

### A store for the book

The book has its own pace, so it gets its own store. From `pottery/`:

```sh
loops -C book init
```

Add it to `pottery/stores.json`:

```json
{
  "workshop": "workshop",
  "yard": "yard",
  "book": "book"
}
```

And save this as `book/.loops/store.json`:

```json
{
  "version": 2,
  "note": "A short history of the workshop, and what it was written from.",
  "kinds": {
    "passage": {
      "note": "One passage of the book, revised whole.",
      "key": "slug",
      "headline": "title",
      "refs": { "rests_on": [] },
      "lifecycle": { "field": "status", "active": ["draft", "final"], "closed": ["cut"] },
      "preview": ["chapter", "seq", "status", "title"],
      "every_write": ["title", "chapter", "seq", "status", "text"]
    },
    "source": {
      "note": "Something the book draws on: a memory, a letter, a record. An event: written once.",
      "headline": "text"
    }
  }
}
```

Four choices here suit prose:

- **A short title to scan, and the words in `text`.** `headline` names the title, which is what a list shows. The trailing message of a write goes to `text`. A field holds as much text as you give it, line breaks included: `text="$(cat passage.txt)"` passes a file. The plain views show a line break as `\n`, and the JSON carries the text as written.
- **A status with a closed value.** A passage that is cut is not removed. It is marked, and the fold leaves it out.
- **A field for what a passage rests on.** The empty list under `rests_on` allows any target, record ids included, and an id is the only name a source has.
- **Every write says everything.** `every_write` lists the fields, so the shorthand stops a write that leaves one out. The reason comes below.

### The sources come first

```
$ loops --in book emit source --about kiln:east --about potter:ada --occurred 2019 \
    "Ada: the east kiln came second-hand from a school that was closing. We paid for the van and nothing else."
r:jtuu78n767j4kobna2bg8gmo7mrm6h9fc6slkf1kqibe62d1ml10

$ loops --in book emit source --about kiln:east --occurred 2019-11 \
    "The first firing cracked a shelf at cone 6. Nobody had checked the kiln wash."
r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og

$ loops --in book emit source --about kiln:west --occurred 2023-04 \
    "The west kiln was built on site over one spring, to fire stoneware."
r:jathpduf691r39o202posg8blpmhrga2fvo4e9rokom13hugl9ig
```

A source is said once and never revised. What it is about goes in `about`, and `occurred` is as coarse as what is known: a year, or a month.

### Passages

Each passage says where it sits in the book and which source it rests on:

```
$ loops --in book emit passage slug=a-kiln-from-a-school title="A kiln from a school" \
    chapter:=1 seq:=1 status=draft \
    rests_on:='["r:jtuu78n767j4kobna2bg8gmo7mrm6h9fc6slkf1kqibe62d1ml10"]' \
    "The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van."
r:22drglmlnmngikuuqahfcm8r6d2iqclrl5h4l96jtrisdhpjpkk0

$ loops --in book emit passage slug=the-cracked-shelf title="The cracked shelf" \
    chapter:=1 seq:=2 status=draft \
    rests_on:='["r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og"]' \
    "Its first firing cracked a shelf at cone 6."
r:v5vioj83ubi7gu3flo3f9gns8b8tges6g1e08d3cvtn4qp3280og

$ loops --in book emit passage slug=building-west title="Building the west kiln" \
    chapter:=2 seq:=1 status=draft \
    rests_on:='["r:jathpduf691r39o202posg8blpmhrga2fvo4e9rokom13hugl9ig"]' \
    "The west kiln was built on site, over one spring, to fire stoneware."
r:7r7sbct28geksrpc99lnjbbhcv3c094vv8so2585ok1va24s3v30
```

### The book is a fold

Make `book/.loops/vertices/` with `mkdir -p book/.loops/vertices`, and save this in it as `manuscript.json`:

```json
{
  "vertex": "manuscript",
  "from": [{ "store": ".", "kind": ["passage"] }],
  "fold": {
    "passages": {
      "latest-by": "of",
      "follow": "prev",
      "where": { "status": { "not": "cut" } }
    },
    "by_status": { "count": true, "follow": "prev", "by": "status" }
  }
}
```

The fold gives each passage that is not cut, as it was last written. In the JSON, `passages.things` maps each passage's name to a list of its heads, and with `--values` each head carries its `id`, its `env` and its `payload`.

The fold does not put the passages in order by a field of yours, and it does not lay them out. That part is a script's. Save these two lines as `pottery/print.jq`:

```
sort_by(.chapter, .seq)[]
  | "\(.chapter).\(.seq)  \(.title)\n     \(.text)"
```

Then print the book:

```
$ loops --in book read manuscript --values \
    | jq '[.passages.things[][].payload]' | jq -r -f print.jq
1.1  A kiln from a school
     The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van.
1.2  The cracked shelf
     Its first firing cracked a shelf at cone 6.
2.1  Building the west kiln
     The west kiln was built on site, over one spring, to fire stoneware.
```

Freeze this first draft with a tick:

```
$ loops --in book tick manuscript
r:khh57rpd7fjrvp330vsi7l3bufo7qasphust2mqbd2i09fesm7tg
```

### Two people revise a passage at once

Prose is revised with `--whole`. The record then has no `sets`: it is the full statement, and a field it leaves out is gone from the reading.

Here two people each read the second passage and rewrote it. One machine has one key, so on this page one writer plays both. `--base-id` says what each had read:

```sh
loops --in book emit passage slug=the-cracked-shelf --whole \
  --base-id r:v5vioj83ubi7gu3flo3f9gns8b8tges6g1e08d3cvtn4qp3280og \
  title="The cracked shelf" chapter:=1 seq:=2 status=draft \
  rests_on:='["r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og"]' \
  "Its first firing cracked a shelf at cone 6. Nobody had checked the kiln wash."
loops --in book emit passage slug=the-cracked-shelf --whole \
  --base-id r:v5vioj83ubi7gu3flo3f9gns8b8tges6g1e08d3cvtn4qp3280og \
  title="The cracked shelf" chapter:=1 seq:=2 status=draft \
  rests_on:='["r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og"]' \
  "The first firing went badly: a shelf cracked at cone 6."
```

The passage now has two heads:

```
$ loops --in book read manuscript --plain
passages
  thing  passage:a-kiln-from-a-school
    heads
      r:22drglml
  thing  passage:building-west
    heads
      r:7r7sbct2
  thing  passage:the-cracked-shelf
    heads
      r:jfh669b4
      r:knfkic8o
by_status
  group  draft  4
  0 ungrouped
  0 not read
```

A count that follows heads counts each head, so three passages count as four drafts until someone settles this one.

Read by its keys, as `loops --in book of passage:the-cracked-shelf --plain` reads it, every field is in conflict, the title and the chapter included. That is true, and not much use. The manuscript reads by heads, so the book shows both versions, each as it was written:

```
$ loops --in book read manuscript --values \
    | jq '[.passages.things[][].payload]' | jq -r -f print.jq
1.1  A kiln from a school
     The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van.
1.2  The cracked shelf
     The first firing went badly: a shelf cracked at cone 6.
1.2  The cracked shelf
     Its first firing cracked a shelf at cone 6. Nobody had checked the kiln wash.
2.1  Building the west kiln
     The west kiln was built on site, over one spring, to fire stoneware.
```

Nothing chose between them. A person reads both and writes the passage that stands, and that ordinary write replaces both heads:

```sh
loops --in book emit passage slug=the-cracked-shelf --whole \
  title="The cracked shelf" chapter:=1 seq:=2 status=draft \
  rests_on:='["r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og"]' \
  "The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash."
```

### Whole, every time

The first passage is finished. The short way to say so is stopped:

```
$ loops --in book emit passage slug=a-kiln-from-a-school status=final
emit passage slug=a-kiln-from-a-school status=final: missing every_write fields ["title","chapter","seq","text"]. State each field on this write, use --sets-nothing for a join with no payload fields, or use emit - for an exception.
```

This is why the description lists them. Read by heads, a record is the whole statement. A record that said only `status=final` would be a head with no title, no chapter and no text, and the book would print `null` where the passage was. So **a kind you read by heads is revised whole, every time**:

```sh
loops --in book emit passage slug=a-kiln-from-a-school --whole \
  title="A kiln from a school" chapter:=1 seq:=1 status=final \
  rests_on:='["r:jtuu78n767j4kobna2bg8gmo7mrm6h9fc6slkf1kqibe62d1ml10"]' \
  "The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van."
```

For the same reason, do not take the first way out that the message offers. A join made with `--sets-nothing` is a record with nothing in it. Read by heads it is an empty passage, and since it has no status it is not cut, so it prints. Settle two heads of such a kind with a whole write, as above.

The second chapter is cut, whole as well:

```sh
loops --in book emit passage slug=building-west --whole \
  title="Building the west kiln" chapter:=2 seq:=1 status=cut \
  rests_on:='["r:jathpduf691r39o202posg8blpmhrga2fvo4e9rokom13hugl9ig"]' \
  "The west kiln was built on site, over one spring, to fire stoneware."
```

`ls passage:` shows every passage with the columns `preview` names, the cut one too, and the book leaves it out:

```
$ loops --in book ls passage: --plain
THING                         HEAD KINDS  RECORDS  HEADS  chapter  seq  status  title
passage:a-kiln-from-a-school  passage     2        1      1        1    final   A kiln from a school
passage:building-west         passage     2        1      2        1    cut     Building the west kiln
passage:the-cracked-shelf     passage     4        1      1        2    draft   The cracked shelf

$ loops --in book read manuscript --values \
    | jq '[.passages.things[][].payload]' | jq -r -f print.jq
1.1  A kiln from a school
     The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van.
1.2  The cracked shelf
     The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash.
```

### Asking the same records something else

The book is one fold. The records under it can be folded other ways, by anyone who holds them.

**The first draft, word for word.** A tick's stored `result` names the heads by id alone, and each is still a record:

```
$ for id in $(loops --in book get r:khh57rpd7fjrvp330vsi7l3bufo7qasphust2mqbd2i09fesm7tg \
      | jq -r '.payload.result.passages.things[][]'); do
    loops --in book get $id
  done | jq -s 'map(.payload)' | jq -r -f print.jq
1.1  A kiln from a school
     The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van.
1.2  The cracked shelf
     Its first firing cracked a shelf at cone 6.
2.1  Building the west kiln
     The west kiln was built on site, over one spring, to fire stoneware.
```

**Every wording a passage has had.**

```
$ loops --in book export --of passage:the-cracked-shelf | jq -r '.payload.text'
Its first firing cracked a shelf at cone 6.
Its first firing cracked a shelf at cone 6. Nobody had checked the kiln wash.
The first firing went badly: a shelf cracked at cone 6.
The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash.
```

**What was written from a source.**

```
$ loops --in book ls --refers-to r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og --plain
target  r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og
things  1
  passage:the-cracked-shelf
stores  1
  ~/pottery/book
KIND     FIELD     DESCRIPTION
passage  rests_on  ~/pottery/book/.loops/store.json
things_not_read  0
values_not_typed  0
fields_read  1
```

The other way round, `loops --in book of passage:the-cracked-shelf | jq -r '.values.rests_on[]'` prints the ids a passage rests on, and `get` shows each.

**The sources by when things happened, newest first.** A second vertex, saved as `book/.loops/vertices/sources.json`:

```json
{
  "vertex": "sources",
  "from": [{ "store": ".", "kind": ["source"] }],
  "fold": {
    "per_kiln": { "count": true, "by": "env.about:kiln" },
    "newest_first": { "collect": true, "limit": 10 }
  }
}
```

```
$ loops --in book read sources --plain
per_kiln
  group  east  2
  group  west  1
  0 ungrouped
  0 not read
newest_first
  r:jathpduf
  r:vbql5s2d
  r:jtuu78n7

$ loops --in book read sources --values \
    | jq -r '.newest_first.heads[] | "\(.env.occurred)  \(.payload.text)"'
2023-04  The west kiln was built on site over one spring, to fire stoneware.
2019-11  The first firing cracked a shelf at cone 6. Nobody had checked the kiln wash.
2019  Ada: the east kiln came second-hand from a school that was closing. We paid for the van and nothing else.
```

None of these four questions was planned for when the passages were written. The records were enough.

### The same shape, elsewhere

A decision, a rule of thumb and a lesson learned are the same shape as a passage: a thing with a key, a line to scan, a status with a closed value, and words that are revised whole. Something noticed in passing is the same shape as a source: an event that mentions what it is about. What you call your kinds, and when a thing is worth writing down, are yours to decide.

## What is built, and what is not

| | State | Until then |
|---|---|---|
| Emit, read and fold, signed, for one person's stores on one machine | Built | |
| A store description, the shorthand's stops, `describe`, `ls --refers-to`, reads across a group of stores | Built | |
| Ticks, their check, a tick over a cut, a write against a base | Built | |
| Standing: who may write to a store, grants, a store that refuses a record, names for writers | Not built. The questions wait on a ruling ([DECISIONS](DECISIONS.md#identity-and-standing-is1-to-is11)) | Every record is signed by the machine's key, and that key is its observer. Writers who share a machine share a key. To tell them apart, state the writer in a field of your own |
| Sharing: stores synced between machines and people | Not built | A store is a directory. Copy it, or `export` from one and `import` into another |
| A search index, collectors, a command that edits records as text, a server | Not built | Fold the store directly, and keep search or ranking in a script that reads folds and writes its findings back |

This release is for trying the rules in everyday use, by people and by agents. The command is the cheap part to change. The record, its envelope and the laws are not, though the record format is not frozen yet: read [CHANGELOG](CHANGELOG.md) before moving a store to a newer release. What comes next is in [ROADMAP](ROADMAP.md).

## If you used the old tool

The Python `loops` kept facts in a table, and a `.vertex` file said how to read each kind. What changed:

| Then | Now |
|---|---|
| A later fact with the same key overlaid the fields it carried | A revision names what it replaces in `prev` and the fields it sets in `sets`. The reading is the same, and it is written down in the record |
| The `.vertex` file described the kinds and held a fold | Two files: `.loops/store.json` describes the kinds, and each vertex in `.loops/vertices/` holds a fold |
| The observer was a name, written as text | The observer is the key that signed the record. The import carries an old observer's name as a mention, `observer:<name>` |
| A reference was `owner=person/potter` with an id beside it, or a `ref=` list | A declared reference field holding `kind:key`, read by `ls --refers-to` |
| A thing held by two stores read as one value, the later by time | It reads as two heads, both shown |
| A `.loop` file | No such file. A script pipes lines into `emit -` |
| A store was found by its name | A name in `stores.json`, with `--in` |

`loops shadow-import` copies an old store's export into a new store, to be read beside the old tool. The old tool's ticks are not brought over.

## Words

| Word | Means |
|---|---|
| Record | One signed statement. Never changed |
| Envelope | A record's outside: who, when, of what, replacing what |
| Payload | A record's inside: what was said |
| Thing | What a record is of: a name such as `kiln:east`, or a root's own id |
| Root | A record with no `of` and no `prev`. It starts a thing named by its id |
| Head | A record of a thing that nothing replaces |
| Fork | A thing with two or more heads |
| Live setter | The record a field's value is read from |
| Fold | A computed answer over records |
| Spec | A fold's definition, as JSON |
| Vertex | A spec saved under a name in `.loops/vertices/` |
| Slot | One named answer inside a spec |
| Tick | A record that freezes a fold's answer so it can be checked |
| Store | A directory holding `.loops/` |
| Group | The stores a `stores.json` lists |
| Description | `.loops/store.json`: what a store says about its kinds |

## Where the rules are

- **A record's bytes, its fields and `occurred`:** [protocol/record.md](protocol/record.md).
- **The spec, every test and every refusal:** [protocol/spec.md](protocol/spec.md).
- **The tick and its check:** [protocol/tick.md](protocol/tick.md).
- **What the command does, choice by choice:** [rust/PLACE.md](rust/PLACE.md). `loops` with no arguments prints the usage.
- **The laws the model proves:** [protocol/laws.md](protocol/laws.md).
- **What changed, by date:** [CHANGELOG](CHANGELOG.md).
