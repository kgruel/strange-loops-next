# A guide to loops

`loops` keeps what people and programs said, each statement signed, and answers questions about those statements. This guide takes you from an empty folder to a working store, and then writes a short book with it.

1. [**Ten minutes: a first store.** Make a store, write twice, and read it back.](#ten-minutes-a-first-store)
2. [**How to think about it.** The few ideas everything else follows from.](#how-to-think-about-it)
3. [**Laying out your data.** The choices to make before the first write.](#laying-out-your-data)
4. [**Using the command.** Writing, reading, standing questions and ticks, with real output.](#using-the-command)
5. [**A second walk: a book.** The same ideas when the records are mostly words.](#a-second-walk-a-book-and-its-sources)

### What it describes

Release 0.1.1, with one person's stores on one machine, which is what is built today. Every command here was run as written. The ids and times are from that run, and yours will differ. The examples are a pottery workshop: kilns, potters and firings.

### What it leaves out

**Sharing a store with other people.** It waits on standing, the rules for who may write to a store, and neither is built.

**How to work with it.** When to write, what is worth keeping and what you tell an agent are your own habits. This page shows what the command does.

### Where the rules are

This is a guide, not the rules. They are in [the record, the spec, the tick and the notes on the command](#where-the-rules-are-1). Where this page and those disagree, they are right.

## Ten minutes: a first store

Make a store, say two things about a kiln, and ask what the kiln is now. That is the whole idea, in five steps.

<!-- guide:stepper -->

`pottery/workshop`

#### 1. Make a key and a store

Install `loops` from a release first, as the README says. Then:

```sh
loops whoami --init      # make this machine's signing key, once
mkdir -p pottery/workshop && cd pottery/workshop
loops init               # make .loops/ here
```

**The store is empty**

`loops init` made `.loops/` here. The store holds no records yet.

#### 2. Say what the store holds

Put this in `.loops/store.json`. It says one thing: a `kiln` is named by its `name` field.

```json
{
  "version": 2,
  "kinds": {
    "kiln": { "key": "name" }
  }
}
```

**The description is beside the store**

`.loops/store.json`: a `kiln` is named by its `name` field.

Still no records. The description only says what the records will mean.

#### 3. Say something about a kiln

```sh
loops emit kiln name=east status=cold cone:=6
```

`field=text` writes text, and `field:=json` writes any JSON value, here the number 6. The command prints the id of the record it wrote.

**One record**

| Head | Envelope | Payload |
| --- | --- | --- |
| `r:29oqd4cm` | of kiln:east · no sets: read whole | `name: east`, `status: cold`, `cone: 6` |

#### 4. Say something more

```sh
loops emit kiln name=east status=firing
```

This doesn't change the first record. It adds a second one that says what it replaces and which fields it sets.

**Two records, one head**

| Head | Envelope | Payload |
| --- | --- | --- |
| `r:u0rjookv` | of kiln:east · prev r:29oqd4cm · sets name, status | `name: east`, `status: firing` |

The faint fields are no longer read. The second record set them again, and the cone is still read from the first.

#### 5. Ask what the kiln is now

```console
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

The status changed and the cone didn't. Point at a field in the reading to see which record it comes from.

**The reading, worked out now**

| Field | Value | From |
| --- | --- | --- |
| `cone` | `6` | `r:29oqd4cm` |
| `name` | `east` | `r:u0rjookv` |
| `status` | `firing` | `r:u0rjookv` |

<!-- guide:end -->

### Nothing changed in place

The store holds two records. Here is the second one, laid out for reading, with the signature cut short:

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

It says who wrote it and when, that it is of `kiln:east`, which record it replaces (`prev`) and which fields it sets (`sets`). It doesn't mention the cone, so the cone is still read from the first record. `loops export --of kiln:east` prints both stored lines.

You only ever add records. What a thing is now is worked out each time you ask.

## How to think about it

Eight ideas. The rest of the guide follows from them.

### A store is a set of signed statements

A record is one statement: somebody said this, at this time. It is signed with the writer's key, and it never changes. The only way to write is to add a record.

So a store doesn't hold the truth about a kiln. It holds what was said about it, and by whom. When two people disagree there are two records, and both are kept. The current state isn't stored anywhere. It is worked out when you read, and that working out is called a **fold**.

### A record has an outside and an inside

The outside is the **envelope**. It is small, its fields are fixed, and it is always kept. The inside is the **payload**, which is any JSON.

<!-- guide:envelope -->

#### Envelope *always kept*

| Field | Says |
| --- | --- |
| `kind` | What sort of statement this is: `kiln`, `firing`. |
| `observer` | Who says it. Today that is the key that signed it. |
| `emitted` | When it was written. |
| `occurred` | When the thing it describes happened, if the writer says. |
| `of` | The one thing it is a statement of. |
| `about` | Other things it mentions. |
| `prev` | The records it replaces. |
| `sets` | The payload fields it sets. |
| `erases` | The records whose payloads it erases. |
| `under` | The grant it acts on. Grants belong to standing, which is not built. |

#### Payload *can be erased*

```json
{ "name": "east", "status": "firing" }
```

When the payload is an object, its top-level members are the fields a fold can read. Nothing looks inside a nested object.

<!-- guide:end -->

The split matters because a payload can be erased and an envelope can't. An erased record keeps its id, its signature and its place among the others. Only what it said is gone.

### A record is of one thing

`of` names the thing a record is a statement of, such as `kiln:east`: a kind, a colon and a key. Two writers who use the same name are writing of the same thing, whether or not they have seen each other's records.

A record with no `of` is a **root**. Its own id, `r:` and 52 characters, is its name. That suits something that happened once, such as a firing.

`about` only mentions. A record of `kiln:east` that mentions `yard:north` is still a statement of the kiln alone.

### A revision points at what it replaces

A later record of the same thing names the earlier ones in `prev`. A thing's **heads** are its records that nothing replaces. Usually there is one.

<!-- guide:diagram headsfig -->

Three diagrams: one head, a fork with two heads, and a join back to one head

| Step | What happens |
| --- | --- |
| One head | The usual case |
| A fork | Two heads, both kept |
| A join | One record names both |

Each arrow is prev: a record points at what it replaces. Filled circles are heads.

<!-- guide:end -->

When two writers each revise a thing without having seen the other's record, the thing has two heads. That is a **fork**. Both are kept, and both are shown. A later record that names both in `prev` joins them.

You rarely write `prev` yourself. `loops emit` fills it in with what you have read, which by default is everything the store holds.

### A revision says which fields it sets

`sets` lists the payload fields a record sets. `loops emit kiln name=east status=firing` sets `name` and `status`, so `cone` keeps the value an earlier record gave it. Each field of a thing is read from its **live setter**: a record that set the field, where no record replacing it has set that field again.

There are three cases, and they are different records. Pick one to see what it does to the kiln.

<!-- guide:sets -->

#### `sets` names fields

| Record | Envelope | Payload |
| --- | --- | --- |
| R1 | the first write: no sets | `name: east`, `status: cold`, `cone: 6` |
| R2 (head) | prev R1 · sets name, status | `name: east`, `status: firing` |

| Field | Value | From |
| --- | --- | --- |
| `name` | `east` | `R2` |
| `status` | `firing` | `R2` |
| `cone` | `6` | `R1` |

**R2 sets two fields and leaves the rest alone.** The cone is still read from R1.

#### No `sets` at all

| Record | Envelope | Payload |
| --- | --- | --- |
| R1 | the first write: no sets | `name: east`, `status: cold`, `cone: 6` |
| R2 (head) | prev R1 · no sets: --whole | `name: east`, `status: firing` |

| Field | Value | From |
| --- | --- | --- |
| `name` | `east` | `R2` |
| `status` | `firing` | `R2` |
| `cone` | `—` | no setter |

**R2 is read whole, so it replaces everything.** It says nothing about the cone, so the kiln has no cone now.

#### `"sets": []`

| Record | Envelope | Payload |
| --- | --- | --- |
| R1 | the first write: no sets | `name: east`, `status: cold`, `cone: 6` |
| B | prev R1 · sets status | `status: firing` |
| C | prev R1 · sets cone | `cone: 8` |
| J (head) | prev B, C · sets [] | no fields |

| Field | Value | From |
| --- | --- | --- |
| `name` | `east` | `R1` |
| `status` | `firing` | `B` |
| `cone` | `8` | `C` |

**B and C each set one field, without having seen each other.** J sets nothing. It joins the two heads into one, and both changes stand.

<!-- guide:end -->

When a field has two live setters, `loops` doesn't pick one. It shows both and calls it a conflict, and a test that the two would answer differently answers unknown. Someone settles it by writing the field again.

That gives two ways to read a thing, and each fold says which it wants:

- **By its keys** (`"follow": "keys"`): each field from its live setter. Use it for state that changes a field at a time.
- **By its heads** (`"follow": "prev"`): each head as written, from its own payload. Use it for prose that is revised whole.

### The same records give the same answer

A fold's answer depends on which records you hold, never on the order they arrived in. Two machines that hold the same records compute the same bytes. That is what lets a **tick**, a record that freezes an answer, be checked on another machine. It is also one reason `sum`, `min` and `max` read whole numbers only: a sum of fractions can depend on the order of adding.

Unknown is an answer too. When a payload has been erased, or two setters disagree, a fold doesn't guess. It answers for what it could read and counts the rest as `unread`.

### `loops` counts, and you judge

A fold can count, sum, take a minimum or a maximum, give each thing's latest state, and list records. Each of these is exact and repeatable. There is no ranking, no following of links for several hops, and no opinion.

<!-- guide:diagram judgefig -->

A loop: records are folded, a person or agent decides, and the decision is written back as a new record

| Step | What happens |
| --- | --- |
| Records | Signed statements in the store |
| A fold | Counts, sums and latest states, exactly |
| A person, a script or an agent | Reads the fold and decides |

The decision is written back as a new record, under its own name, and can be folded like any other.

<!-- guide:end -->

Judgement belongs to a person, a script or an agent. It reads a fold, decides something, and writes the decision back as a new record under its own name. That record can be folded like any other. This is the loop in the name.

### A store owns no meaning

A store is a set of signed lines. What they mean is kept beside them, in two kinds of file that you write and review:

- **`.loops/store.json`** describes the store's kinds: the key field, the fields that point at other things, and what to show first. The `emit` shorthand follows it, and the plain views use it.
- **`.loops/vertices/<name>.json`** holds a question you ask often, as a fold.

Neither is needed to read a record. A record states its thing in full, so a reader with only the stored lines can still fold them.

A store is also cheap to throw away. It is a directory, and no server holds it open. When a layout turns out wrong, start another store and write what matters into it again. Expect to do that more than once while you learn what your kinds are.

## Laying out your data

Start from a blank page. Decide what the things and events in your work are before you look at an old schema.

### Where one store ends and another begins

Don't make one store per kind. Draw the lines where the data really differs:

- **Who writes it, and what travels together.**
- **What is sensitive.** Keep what few people may see apart from what many will.
- **Pace.** Keep noisy, fast collectors apart from slow records such as decisions.

The first two look ahead. Sharing isn't built, and when it is, a store is the unit that will be shared and synced.

A file named `stores.json` lists a group of stores by name, and one read can span them, so splitting costs little when you read. One limit to plan around: a tick is made from a single store, so records you want frozen together belong together.

### Three shapes

Every concept is one of three shapes. Pick something from the workshop to see which.

<!-- guide:shapes -->

#### A thing with a key

one name, many records

**Use it for** Something that lasts, changes and is pointed at.

**How** Give the kind a `key` field in the description. `loops emit kiln name=east` writes of `kiln:east`.

| Things in the workshop | Is named |
| --- | --- |
| A kiln | `kiln:east` |
| A potter | `potter:ada` |
| A decision | `decision:slow-cool` |

#### An event

a root, named by its id

**Use it for** Something that happened once.

**How** Give the kind no key. Each write is a root, named by its id, and it points at things through its fields.

| Things in the workshop | Is named |
| --- | --- |
| A firing | `r:hnqjpebh…` |
| A note of something seen | `r:…, its own id` |

#### An edge thing

the link is a thing

**Use it for** A link that several writers add to, or one with facts of its own.

**How** One thing per link, named `edge:<relation>:<from>:<to>`, with both ends in `about` and the fields `rel`, `from`, `to` and `state` in the payload.

| Things in the workshop | Is named |
| --- | --- |
| One kiln venting into another | `edge:vents-into:east:west` |

<!-- guide:end -->

If a kind feels like both how something is now and what happened to it, it is two kinds. Make a keyed thing for the state (`kiln`) and an event for each happening (`firing`), and point from the event to the thing.

### Where the reason for a change goes

A field of a keyed thing is read as a fact about the thing. Write `status=cooling evidence=<one firing>`, and later `status=cold evidence=<another>`, and the kiln's `evidence` is the later one. The earlier record still holds its own, but the kiln no longer shows it. There are three ways to keep reasons readable:

- **Put what happened in an event,** and point at the thing from it. The firing stays a record of its own, and a read of everything that refers to the kiln finds it.
- **Cite it on the write, and read it per field.** `loops of kiln:east --setters` shows each field with the record that set it, and that record's own payload.
- **Require it.** If every write of a kind must say what it rests on, list the field under `every_write` in the description.

### Links between things

| The link | Write it as | Example |
| --- | --- | --- |
| One target under a role | A text field holding `kind:key` | `keeper=potter:ada` |
| A set that one writer states whole | A list field, read as a set | `governs:='["kiln:east","kiln:west"]'` |
| A link several writers add to, or one with facts of its own | An edge thing | `edge:vents-into:east:west` |

Declare each such field under `refs` in the description. The shorthand then checks what you write there, and `ls --refers-to` can answer “what points at this?” across stores.

`about` is for mentions, and mentions belong to the thing: each revision carries them on, and `--add-about` and `--drop-about` change them one at a time. It doesn't say what one record rests on, and nothing copies a reference field into `about`.

### Fields

- **Keep the payload flat.** A fold reads top-level fields. If something nested matters, make it a kind of its own that points back.
- **Count in whole numbers.** `sum`, `min`, `max`, `at-least` and `below` read whole numbers within ±(2⁵³ − 1). Store thousandths, cents or milliseconds, not fractions.
- **Mind text and numbers.** `cone=6` writes the text `"6"`, and `cone:=6` writes the number 6. A test for the number doesn't match the text.
- **Lists are sets of plain values.** `is`, `not`, `present`, `absent` and grouping work on a list of text, whole numbers or booleans. `at-least`, `below`, `sum`, `min` and `max` don't.

### Time

Every record has `emitted`, the moment it was written, filled in for you. `occurred` is your claim about when the thing happened, and you state it with `--occurred`. It can be as coarse as what you know:

| Precision | Occurred |
| --- | --- |
| A year | `2026` |
| A month | `2026-11` |
| A day | `2026-11-24` |
| An instant | `2026-11-25T09:00:00Z` |
| An interval | `2026-11-20/2026-11-24` |
| A start, no end yet | `2026-11-20/..` |

Records are put in order by `occurred` when it is stated, and by `emitted` when it isn't. So state `occurred` on events and on anything you write after the fact, and leave it off routine changes.

One thing to watch: a revision copies `occurred` from the heads when they agree. A routine change to a thing whose last record stated `occurred` claims that earlier time too, unless you give it a time of its own or clear it with `--no-occurred`.

### A field at a time, or whole

- **State that changes piece by piece**, such as a kiln's status and keeper: write ordinary revisions, each setting what it states, and read by keys.
- **Prose that is revised as one piece**, such as a decision's text: revise with `--whole` and read by heads. Two people who revise it at once leave two heads for a person to reconcile, which is what you want for prose. Revise such a kind whole every time. [The second walk](#a-second-walk-a-book-and-its-sources) shows why.

### Write the description first

The description is your model of the store, in a file you can review. This is the workshop's `.loops/store.json`. Point at a member to see what it says.

<!-- guide:annotated members -->

`workshop/.loops/store.json`

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

Each member of the description has one job. Point at `key`, `refs`, `lifecycle` or any other member.

| Member | Says |
| --- | --- |
| `version` | 1 or 2. Version 2 adds `every_write`. |
| `note` | Words for a reader, on the store or on a kind. |
| `kinds` | The kinds the store describes, by name. The shorthand stops a write of any kind not named here. |
| `kiln` | A thing with a key. `loops emit kiln name=east` writes of `kiln:east`. |
| `potter` | A thing with a key, and nothing more said about it. |
| `decision` | Prose, revised whole. Its key field is `slug`, and the words go to `text`. |
| `edge` | No key: an edge thing is named in full with `--of`, as `edge:vents-into:east:west`. |
| `key` | The text field that names the thing: a kiln's `name` gives `kiln:east`. Leave it out for events and for things you name with `--of`. |
| `headline` | The text field shown as the thing's one-line label. Without it, the key field is used. `text` is the field a trailing message is written to. |
| `refs` | The fields that point at other things, each with the kinds it may name. An empty list allows any kind and record ids too. |
| `keeper` | A reference field. It may name a potter, and nothing else. |
| `evidence` | A reference field with an empty list, so it may name any kind, and record ids too: a firing has no other name. |
| `governs` | A reference field that may name kilns. |
| `from` | A reference field of an edge. Its empty list allows any target. |
| `to` | A reference field of an edge. Its empty list allows any target. |
| `lifecycle` | A field whose values are sorted into `active` and `closed`. The shorthand accepts only the listed values, and `ls --active` hides things whose value is closed. |
| `field` | The payload field the lifecycle reads. |
| `active` | Values that keep a thing in `ls --active`. |
| `closed` | Values that hide a thing from `ls --active`. |
| `preview` | The columns `ls kiln:` shows for the kind's things. Events have no names to list by, so pick their columns with `--fields`. |
| `every_write` | Fields that every shorthand write of the kind must state. |

<!-- guide:end -->

And the yard's, which holds events:

`yard/.loops/store.json`

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

What the file does:

- **`loops emit <kind>` follows it,** and stops before signing when a write contradicts it. The stops are listed in [Using the command](#when-the-shorthand-stops-you).
- **The plain views use it** for headlines, columns and `--active`.
- **`loops describe` measures the store against it,** and `ls --refers-to` reads the reference fields it declares.

What it doesn't do: it refuses nothing in the store itself. `emit -` writes anything the store accepts and never reads the file. A store that turns writers away is standing, which is not built.

### Bringing old data in

Keep the old store as a read-only archive. Pick the things and events worth keeping, and write them again through `loops emit`, with `--occurred` set to when each happened. The shorthand's stops then check every line, and `loops describe` shows what doesn't fit when you are done.

For a large batch, pipe lines into `emit -`, and review with `describe` afterwards, since a batch skips the stops.

## Using the command

Read commands print JSON, the same on a terminal and through a pipe. Add `--plain` for a view made for reading. The plain view may change between releases, so scripts use the JSON.

Some examples pass the JSON through `jq`, a separate tool for picking values out of it.

### Naming the store

A command acts on the store in the current directory. To act on another, put one of these before the verb, as in `loops --in yard ls` or `loops --group describe`:

| Name | What it does |
| --- | --- |
| `-C <dir>` | Run as if started in that directory. |
| `--in <name>` | Pick a store by name from a group list. |
| `--group` | Pick every store in the list. `describe` and `ls --refers-to` take it. |
| `--store <name>=<dir>` | Give a name for one command. |

`init`, `whoami` and `shadow-import` take no `--in`.

A group list is a file named `stores.json` that maps names to directories. Make the yard a second store beside the workshop:

```sh
cd ..                    # into pottery/
loops -C yard init
```

List both, and save it as `pottery/stores.json`:

```json
{
  "workshop": "workshop",
  "yard": "yard"
}
```

`loops` looks for the list beside a store's `.loops/`, then in the directory above it, then in `~/.config/loops/stores.json`. Outside a store it looks in the current directory.

Then save the two descriptions from [Write the description first](#write-the-description-first) as `workshop/.loops/store.json` and `yard/.loops/store.json`. The workshop's replaces the short one from the first ten minutes.

### Writing

A potter, and two kilns kept by her:

```sh
loops --in workshop emit potter name=ada
loops --in workshop emit kiln name=east keeper=potter:ada
loops --in workshop emit kiln name=west status=cold cone:=10 keeper=potter:ada
```

A firing is an event. Its kind has no key, so each write is a root, and the words at the end become its `text` field:

```console
$ loops --in yard emit firing kiln=kiln:east cone:=6 potter=potter:ada \
    --occurred 2026-11-25T09:00:00Z "Glaze firing, slow cool"
writing --in yard to ~/pottery/yard (bound by ~/pottery/stores.json)
r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0
```

The first line goes to standard error and says which store the name led to. It is left out of the examples below. The second line is the new record's id. Paths on this page are shortened to start at `~/pottery`; the tool prints them in full.

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

An edge thing is written with `--of`, since its name isn't one field:

```sh
loops --in workshop emit edge --of edge:vents-into:east:west \
  --about kiln:east --about kiln:west \
  rel=vents-into from=kiln:east to=kiln:west state=active
```

A mention is added to a thing one at a time, and later revisions carry it on:

```sh
loops --in workshop emit kiln name=east --add-about yard:north
```

<!-- guide:more -->

#### Other writes, for reference

They are not part of this walk, so the output further down doesn't show them.

| To | Run |
| --- | --- |
| Drop a mention | `loops --in workshop emit kiln name=east --drop-about yard:north` |
| Revise a thing you name in full | `loops --in workshop emit edge --of edge:vents-into:east:west state=removed` |
| Write a root of a kind that has a key | `loops --in workshop emit potter --root "A visitor, not yet named"` |
| End the options, so a message may start with a dash | `loops --in workshop emit decision slug=flags -- "--whole replaces the record"` |
| Write an exception the description would stop | `emit -`, [below](#batches-and-exceptions) |

<!-- guide:end -->

On each write the shorthand does these things for you:

1. **Names the thing** from the key field: `name=east` gives `of: kiln:east`.
2. **Fills `prev`** with the thing's live records, which are its heads and the live setters of its fields, so the write replaces what you have read.
3. **Fills `sets`** on a revision with the fields you stated.
4. **Carries the thing's mentions** in `about`, and `occurred` when the heads agree on it.
5. **Signs the record** and appends it.

### When the shorthand stops you

A stop happens before anything is signed. It exits with 2 and tells you what to change. These are real ones from the two stores above, each run after `loops --in workshop`, or `loops --in yard` for the firing. The messages are shortened.

| Write | Message |
| --- | --- |
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

```console
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

```console
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

```console
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

Add `--setters` to ask which write gave the kiln its status, and what that write cited. It prints the same, then the records behind the values. Each `live` block is one record, the fields it is the live setter of, and its own payload.

<!-- guide:more -->

#### Show what `--setters` adds

```console
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

<!-- guide:end -->

Everything that points at a thing, across the group. It reads the reference fields the descriptions declare, as each thing states them now. The answer says what it read: which stores, which fields, and how many things it couldn't read. The third thing listed is the firing.

<!-- guide:more -->

#### Show `ls --refers-to kiln:east`

```console
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

<!-- guide:end -->

And the records themselves:

| To see | Run |
| --- | --- |
| One record, by id or the start of one | `loops --in yard get r:hnqjpebh` |
| The events of a store, which are named by their ids | `loops --in yard ls r: --fields kiln,cone,potter --plain` |
| The stored lines of a thing | `loops --in workshop export --of kiln:east` |
| The stored lines of a kind, or of everything | `loops --in yard export --kind firing`, `loops --in yard export` |
| That every line is intact and signed | `loops --in workshop check` |

A record is found in the store that holds it. `get` in the workshop doesn't find a firing kept in the yard.

### Standing questions

A question you ask often is a **spec**, saved as a **vertex** in `.loops/vertices/`. Make that directory first, with `mkdir -p workshop/.loops/vertices`. Point at any part of this one to see what it does.

<!-- guide:annotated spec -->

`workshop/.loops/vertices/overview.json`

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

`from` chooses records, and `fold` names the answers you want. Each answer is called a slot.

| Member | Says |
| --- | --- |
| `vertex` | The name you read it by: `loops read overview`. |
| `from` | Chooses records. Each entry names a store, and may narrow by `kind`, `of` or `about`. The stores named are read together as one set, and a record is taken when any source takes it. |
| `store` | A store from the group list. The name `.` means the current store. |
| `kind` | Narrows a source to these kinds, as a list. The key is `kind`, and `kinds` is an error. |
| `fold` | Names the answers you want. Each answer is a slot, and each slot has exactly one fold type. |
| `kilns` | A slot: each kiln's current state. |
| `latest-by` | Each thing's current state. It must say `follow`, and `by` isn't allowed on it. |
| `follow` | `keys` reads each thing once, field by field from its live setters. `prev` reads each head as written. Without `follow`, a slot reads every record, replaced or not, which is right for events. |
| `where` | A map from a field to tests, and every test must hold. A source doesn't keep its kinds to its own store, so each slot narrows here. |
| `env.kind` | An envelope field. Envelope fields start `env.`, and payload fields are named plainly. |
| `is` | Holds when the field equals the value, or a list holds it. |
| `kilns_by_status` | A slot: how many kilns have each status. |
| `count` | How many. |
| `by` | Groups the slot's answer by a payload field, `env.kind`, `env.observer` or `env.about:<kind>`. A list field puts a record in a group for each member. |
| `firings` | A slot: how many firings. |
| `hottest` | A slot: the hottest cone fired. |
| `max` | The largest value of a field. `sum`, `min` and `max` read whole numbers only. |
| `this_week` | A slot: one week's firings, newest first. |
| `collect` | The records themselves, newest first, at most `limit` of them. `--values` lists them under `heads`. |
| `limit` | At most this many. On a `collect` that follows `keys`, it counts things, each listed whole. |
| `env.when` | The time a record is ordered by: `occurred` if stated, else `emitted`. It tests, and doesn't group. |
| `at-least` | A whole number, or a time, at or over this. A window includes its lower bound. |
| `below` | A whole number, or a time, under this. A window leaves out its upper bound. |

<!-- guide:end -->

```console
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

Under each kiln, `setters` names the record each field is read from, and `whole` names a live record that is read whole: it supplies every field no setter is listed for, here the cone.

#### Sources

Each entry of `from` names a store, and may narrow by `kind` (a list), by `of` (one thing) or by `about` (one mention). The stores named are read together as one set, and a record is taken when any source takes it. A source doesn't keep its kinds to its own store, so narrow each slot with `where`, as above. The name `.` means the current store.

#### Slots

Each slot has exactly one fold type:

| Fold type | Gives |
| --- | --- |
| `"count": true` | How many. |
| `"sum"`, `"min"`, `"max"`: a field name | That figure over the field, whole numbers only. |
| `"latest-by": "of"` | Each thing's current state. It must say `follow`. |
| `"collect": true` | The records themselves, newest first, at most `limit` of them. |

**`follow`**. Without it, a slot reads every record, replaced or not, which is right for events. `"follow": "keys"` reads each thing once, field by field from its live setters. `"follow": "prev"` reads each head as written.

**`where`**. A map from a field to tests, and every test must hold. A payload field is named plainly. An envelope field starts `env.`: `env.kind`, `env.observer`, `env.of`, `env.about`, `env.prev`, `env.under`, `env.erases`, `env.emitted`, `env.occurred` and `env.when`.

| Test | Holds when |
| --- | --- |
| `{"is": v}`, `{"not": v}` | The field equals `v`, or a list holds it. `not` is the opposite, so it also holds when the field is absent. |
| `{"present": true}`, `{"absent": true}` | The payload has the field, or lacks it. |
| `{"at-least": n}`, `{"below": n}` | A whole number, or a time, is at or over `n`, or under it. |

`env.when` is the time a record is ordered by: `occurred` if stated, else `emitted`. A window includes its lower bound and leaves out its upper one.

**`by`**. Groups a slot's answer by a payload field, by `env.kind`, by `env.observer`, or by `env.about:<kind>` (each mention of that kind). A list field puts the record in a group for each member.

#### Four rules to remember

1. **`by` isn't allowed on `latest-by`.** Group a `count` or a `collect` instead.
2. **`env.when` tests, and doesn't group.**
3. **On a `collect` that follows keys, `limit` counts things**, each listed whole.
4. **A key that isn't known is refused.** The source field is `kind`, and `kinds` is an error.

`--values` adds the records' payloads and envelopes to the JSON, which is what a script wants. A `collect` slot lists its records under `heads`:

```console
$ loops --in workshop read overview --values \
    | jq -c '.this_week.heads[] | {when: .env.occurred, kiln: .payload.kiln, cone: .payload.cone}'
{"when":"2026-11-25T09:00:00Z","kiln":"kiln:east","cone":6}
{"when":"2026-11-24","kiln":"kiln:west","cone":10}
```

To try a spec without saving it, give `fold` a file, or `-` for standard input. Without `follow`, this one reads every kiln record, replaced or not, and lists those whose own payload cites evidence:

```console
$ echo '{"vertex":"cited","from":[{"store":"workshop","kind":["kiln"]}],
    "fold":{"cited":{"collect":true,"where":{"evidence":{"present":true}}}}}' \
    | loops --in workshop fold - --plain
cited
  r:1idg81qa
```

### Ticks

A **tick** is a record that freezes an answer. It holds the spec, the ids of the records it covered, the result and its hash. Anyone who holds those records can run it again.

Save a second vertex that reads the workshop alone:

`workshop/.loops/vertices/kilns.json`

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

```console
$ loops --in workshop tick kilns
r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g

$ loops --in workshop tick --check r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g
{"answer":"same","closure":"yes","taken-not-covered":0}
```

| Answer | Meaning |
| --- | --- |
| `same` | The covered records still give the recorded answer. Exits with 0. |
| `differs` | They give another answer. Exits with 1. |
| `cannot check` | A payload or a record is missing here, or the tick was made under rules this binary doesn't have. Exits with 1. |
| `not a tick` | The id isn't a tick. Exits with 1. |

A tick stays `same` after later writes, because it speaks only for what it covered. `taken-not-covered` then counts the records the spec would take today that the tick didn't cover; [the next section](#writing-from-what-you-read) shows one. `closure` says whether the tick covers everything its covered records replace.

| Run | Covers |
| --- | --- |
| `loops tick <vertex>` | The records the spec's sources take, and what they replace. |
| `loops tick <vertex> --as-of 2026-12-01` | What was emitted before the start of that day, or before an instant. |
| `loops tick <vertex> --cover <id> --cover <id>` | The records you pick, by id or the start of one. |
| `loops tick <vertex> --all` | Everything the store holds. |

Three things to know:

- **A tick reads its own store alone,** whatever stores its spec names. A tick of `overview` made in the workshop counts no firings, though `read overview` counts them. Tick a vertex whose records live in the store you tick in.
- **A tick is an ordinary record** of kind `tick`, so it is listed, exported and folded like any other. Its payload has `rules`, `spec`, `spec-hash`, `result`, `result-hash` and `covers`, and `withheld` when a covered record's payload wasn't held.
- **A tick covers what `from` takes, before any slot's `where`.** A vertex that reads every kind and tests for one kind in its slots answers the same as one that names the kind in `from`, and covers far more. Name in `from` only what the slots read.

### Writing from what you read

By default a write claims to have read everything the store holds. A writer that decided from an older reading should say so, by naming the tick it read with `--base <tick id>`. Its `prev` is then filled from what that tick covered.

Two writers who worked from the same tick, each without the other's change, then fork honestly, instead of one silently replacing the other:

```console
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

A fold is just as honest. Asked how many kilns have cone 8, and for the sum of the cones, it answers for the kiln it can read and counts the other as unread:

```console
$ echo '{"vertex":"cones","from":[{"store":"workshop","kind":["kiln"]}],"fold":{
    "cone_8":{"count":true,"follow":"keys","where":{"cone":{"is":8}}},
    "total":{"sum":"cone","follow":"keys"}}}' | loops --in workshop fold -
{"cone_8":{"unread":1,"value":0},"total":{"unread":1,"value":6}}
```

The tick made before these two writes still checks. It speaks for what it covered, and now says that two records its spec would take are outside it:

```console
$ loops --in workshop tick --check r:eikik4k8tgt20rjeu6dn7pjak0ebmevn7b40golo7mcv2vg9675g
{"answer":"same","closure":"yes","taken-not-covered":2}
```

`name` is in conflict too, though both sides wrote `west`. Each write stated the key field, so each set it, and `loops` compares no values. Settle a fork with an ordinary write that states the key and each field in conflict. It replaces both heads:

```console
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

A pure join, `loops --in workshop emit kiln --of kiln:west --sets-nothing`, joins the heads and sets no field. It is right when the two sides changed different fields and both changes stand. It doesn't settle a field that has two live setters. After shorthand writes, the key field is one of those, and the next ordinary write of the thing clears it.

`--base-id <id>` names one record as read. It can be repeated, or given beside `--base`. With either flag, the writer claims to have read only what the flags name and what those records replace, not everything the store holds.

### Batches and exceptions

`emit -` reads a changeset from standard input: one JSON object per line, each a record to write. All of them are written, or none. The two files below are saved in `pottery/`.

```console
$ cat firings.jsonl
{"kind":"firing","occurred":"2026-11-20","payload":{"kiln":"kiln:east","cone":6,"text":"Bisque"}}
{"kind":"firing","occurred":"2026-11-21","payload":{"kiln":"kiln:west","cone":10,"text":"Stoneware"}}

$ loops --in yard emit - < firings.jsonl
{"records":[{"id":"r:cogi1h86ac7ka94q88igsm0ofmc9877vj43d86lnrn6vgi7ssc1g"},{"id":"r:lhifir1k14afjh16nn90oald2epvj1nu1u24b8g3jemkpo0fuh30"}]}
```

Plain `emit -` writes each line as given, so a revision there states its own `prev`. With `--fill`, each line is completed as the shorthand would complete it: `prev` from the thing's live records, the mentions carried on, and `sets` from the payload's fields.

```console
$ cat revisions.jsonl
{"kind":"kiln","of":"kiln:east","payload":{"status":"cold"}}
{"kind":"kiln","of":"kiln:east","payload":{"cone":7}}

$ loops --in workshop emit - --fill < revisions.jsonl
{"records":[{"id":"r:rd892rg3cglcp0tsp0n9t8ipk7e2rvnlgpkccnjck9kpvoc32u80"},{"id":"r:i7ak43deiedtlb4hvt1mbeol18qbr2fksbje032v6f1dnbp59700"}]}
```

`emit -` never reads the description, so it is also the way to write the one record the description would stop. Check the fit afterwards with `describe`.

### Erasing

```console
$ loops --in yard erase r:cogi1h86ac7ka94q88igsm0ofmc9877vj43d86lnrn6vgi7ssc1g "Logged against the wrong kiln"
{"id":"r:6ekpq7hp46p08eu8tg916c7jqojr6kb26ush2ndaj09bf7d4c7d0","openings-removed":1}
```

This writes a record of kind `erasure` that names the target and says why, and removes the target's payload from this store. `openings-removed` counts the payloads removed, which the tool calls openings. The erased record keeps its id, its envelope and its place.

An erasure reaches this store only. A copy of the directory, or an export made before it, still holds the payload.

Folds then tell you what they couldn't read. Of the four firings, one is now unreadable:

```console
$ echo '{"vertex":"firings","from":[{"store":"yard","kind":["firing"]}],"fold":{
    "firings":{"count":true},
    "hottest":{"max":"cone"},
    "east":{"count":true,"where":{"kiln":{"is":"kiln:east"}}}}}' | loops --in yard fold -
{"east":{"unread":1,"value":1},"firings":{"unread":0,"value":4},"hottest":{"unread":1,"value":10}}
```

The count still counts it, since counting reads no payload. The test for the east kiln and the hottest cone each report one record unread.

### Checking the fit

`loops describe` measures what a store holds against its description, and refuses nothing. Run it over the group after the batch and the erasure above, and read the yard's part as a list of questions answered.

<!-- guide:more -->

#### Show how the yard's part of `describe` ends

```console
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

<!-- guide:end -->

| Question | Answer |
| --- | --- |
| Is every kind described? | `erasure` isn't, which is fine: the description names the kinds you write by hand. |
| Where do the references lead? | `HERE`, `ELSEWHERE IN SELECTED GROUP` and `OUTSIDE SELECTED GROUP` say where the things referred to are held. Three firings name a kiln held in another store of the group. One couldn't be read: the erased one. |
| Are the references well formed? | `NOT TYPED` counts values not written `kind:key`, and `UNLISTED PREFIX` counts those naming a kind the field's `refs` list leaves out. Both are zero here. |
| Which things leave a reference unset? | The batch named no potter. One of its two firings shows here as unset, and the other is the erased one, counted under `NOT READ`. |
| Does every write state what it must? | No record is missing `cone` or `kiln`, and one can't be read. |

`WITHOUT MENTION` counts references whose target the thing doesn't also mention in `about`. Nothing copies a reference into `about`, so this is usually every reference, and it isn't a fault.

For a keyed kind the report also counts things whose key field agrees with their name, disagrees, is unset or is in conflict. When you are moving data in, this report is the test: read each of the other counts that isn't zero, and decide whether you meant it.

### From scripts and agents

There is no server to run. A script calls `loops` and reads its JSON.

```console
$ loops --in workshop of kiln:east | jq -c .values
{"cone":7,"evidence":"r:hnqjpebho38j42fs4indjt33e456srag15oq15dum8309ef15ab0","keeper":"potter:ada","name":"east","status":"cold"}
```

| Answer | Meaning |
| --- | --- |
| `0` | Done. |
| `1` | Refused: the store or the rules say no, or a tick is not `same`. |
| `2` | The command was wrong, or the shorthand stopped it. |
| `3` | The system failed: a file couldn't be read or written. |

An agent's turn fits the tools in four steps:

<!-- guide:diagram turnfig -->

An agent's turn: tick, read, decide, write back with the tick as its base

| Step | What happens |
| --- | --- |
| Tick | `loops tick <vertex>` |
| Read | `loops read <vertex> --values` |
| Decide | The agent's own work |
| Write back | `--base <tick id>` |

The record says which tick it was decided from.

<!-- guide:end -->

1. **Tick** the vertex it will decide from: `loops tick <vertex>`.
2. **Read** the answer: `loops read <vertex> --values`. The tick's own payload also carries the frozen `result`.
3. **Decide.** This is the agent's own work, outside `loops`.
4. **Write back** with `--base <tick id>`, so the record says what it was decided from.

A fold doesn't walk links for several hops. To draw a graph, read all the things and the active edge things in one `read --values` and walk them in your own code, or step with `ls --refers-to` and `of`.

It is quick enough to call often. On a store of 9,000 records a fold takes about a quarter of a second, and `emit - --fill` writes 8,000 revisions in under a second, as the changelog records.

## A second walk: a book and its sources

Kilns and firings are state and events. Much of what people keep is words, and the same shapes hold them. This walk writes a short history of the workshop.

Each passage is a thing with a key, revised whole. Each source the book draws on is an event. The book itself is stored nowhere: it is a fold over the passages, and the same records answer other questions too. The printed page beside each step shows the book as it stands.

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

- **A short title to scan, and the words in `text`.** `headline` names the title, which is what a list shows. The words at the end of a write go to `text`. A field holds as much text as you give it, line breaks included: `text="$(cat passage.txt)"` passes a file. The plain views show a line break as `\n`, and the JSON carries the text as written.
- **A status with a closed value.** A passage that is cut isn't removed. It is marked, and the fold leaves it out.
- **A field for what a passage rests on.** The empty list under `rests_on` allows any target, record ids included, and an id is the only name a source has.
- **Every write says everything.** `every_write` lists the fields, so the shorthand stops a write that leaves one out. [The reason comes below.](#whole-every-time)

### The sources come first

<!-- guide:book sources -->

```console
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

A source is said once and never revised. What it is about goes in `about`, and `occurred` is only as exact as what is known: a year, or a month.

#### The sources

| Occurred | Source |
| --- | --- |
| 2019 | Ada: the east kiln came second-hand from a school that was closing. We paid for the van and nothing else. |
| 2019-11 | The first firing cracked a shelf at cone 6. Nobody had checked the kiln wash. |
| 2023-04 | The west kiln was built on site over one spring, to fire stoneware. |

Three events, each said once. The book has no passages yet.

<!-- guide:end -->

### Passages

Each passage says where it sits in the book, and which source it rests on:

```console
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

Make the vertices directory with `mkdir -p book/.loops/vertices`, and save this in it:

`book/.loops/vertices/manuscript.json`

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

The fold gives each passage that isn't cut, as it was last written. In the JSON, `passages.things` maps each passage's name to a list of its heads, and with `--values` each head carries its `id`, its `env` and its `payload`.

The fold doesn't put the passages in order by a field of yours, and it doesn't lay them out. That part is a script's. Save these two lines as `pottery/print.jq`:

```sh
sort_by(.chapter, .seq)[]
  | "\(.chapter).\(.seq)  \(.title)\n     \(.text)"
```

<!-- guide:book draft -->

Then print the book:

```console
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

```console
$ loops --in book tick manuscript
r:khh57rpd7fjrvp330vsi7l3bufo7qasphust2mqbd2i09fesm7tg
```

#### The first draft

| Passage | Title | Text |
| --- | --- | --- |
| 1.1 | A kiln from a school | The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van. |
| 1.2 | The cracked shelf | Its first firing cracked a shelf at cone 6. |
| 2.1 | Building the west kiln | The west kiln was built on site, over one spring, to fire stoneware. |

Three passages, one head each. The tick freezes this.

<!-- guide:end -->

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

```console
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

<!-- guide:book fork -->

Read by its keys, as `loops --in book of passage:the-cracked-shelf --plain` reads it, every field is in conflict, the title and the chapter included. That is true, and not much use. The manuscript reads by heads, so the book shows both versions, each as it was written:

```console
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

#### Two heads

| Passage | Title | Text |
| --- | --- | --- |
| 1.1 | A kiln from a school | The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van. |
| 1.2 | The cracked shelf | The first firing went badly: a shelf cracked at cone 6. |
| 1.2 | The cracked shelf | Its first firing cracked a shelf at cone 6. Nobody had checked the kiln wash. |
| 2.1 | Building the west kiln | The west kiln was built on site, over one spring, to fire stoneware. |

Both versions of 1.2, each as written

A count by heads now says four drafts.

<!-- guide:end -->

<!-- guide:book settled -->

Nothing chose between them. A person reads both and writes the passage that stands, and that ordinary write replaces both heads:

```sh
loops --in book emit passage slug=the-cracked-shelf --whole \
  title="The cracked shelf" chapter:=1 seq:=2 status=draft \
  rests_on:='["r:vbql5s2dkpi9i5hisbcl5eq47qcend6idirrpp2jse3pu2jrm1og"]' \
  "The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash."
```

#### Settled

| Passage | Title | Text |
| --- | --- | --- |
| 1.1 | A kiln from a school | The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van. |
| 1.2 | The cracked shelf | The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash. |
| 2.1 | Building the west kiln | The west kiln was built on site, over one spring, to fire stoneware. |

One ordinary write replaced both heads.

<!-- guide:end -->

### Whole, every time

The first passage is finished. The short way to say so is stopped:

```console
$ loops --in book emit passage slug=a-kiln-from-a-school status=final
emit passage slug=a-kiln-from-a-school status=final: missing every_write fields ["title","chapter","seq","text"]. State each field on this write, use --sets-nothing for a join with no payload fields, or use emit - for an exception.
```

<!-- guide:book null -->

This is why the description lists the fields. Read by heads, a record is the whole statement. A record that said only `status=final` would be a head with no title, no chapter and no text, and the book would print `null` where the passage was. So **a kind you read by heads is revised whole, every time**:

```sh
loops --in book emit passage slug=a-kiln-from-a-school --whole \
  title="A kiln from a school" chapter:=1 seq:=1 status=final \
  rests_on:='["r:jtuu78n767j4kobna2bg8gmo7mrm6h9fc6slkf1kqibe62d1ml10"]' \
  "The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van."
```

#### What a status-only write would print

| Passage | Title | Text |
| --- | --- | --- |
| null.null | null | null |
| 1.2 | The cracked shelf | The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash. |
| 2.1 | Building the west kiln | The west kiln was built on site, over one spring, to fire stoneware. |

Every field null

Not written: a record with only status=final is a head with no title, chapter or text.

<!-- guide:end -->

For the same reason, don't take the first way out that the message offers. A join made with `--sets-nothing` is a record with nothing in it. Read by heads it is an empty passage, and since it has no status it isn't cut, so it prints. Settle two heads of such a kind with a whole write, as above.

The second chapter is cut, whole as well:

```sh
loops --in book emit passage slug=building-west --whole \
  title="Building the west kiln" chapter:=2 seq:=1 status=cut \
  rests_on:='["r:jathpduf691r39o202posg8blpmhrga2fvo4e9rokom13hugl9ig"]' \
  "The west kiln was built on site, over one spring, to fire stoneware."
```

<!-- guide:book final -->

`ls passage:` shows every passage with the columns `preview` names, the cut one too, and the book leaves it out:

```console
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

#### The book now

| Passage | Title | Text |
| --- | --- | --- |
| 1.1 | A kiln from a school | The east kiln came second-hand, from a school that was closing in 2019. It cost the hire of a van. |
| 1.2 | The cracked shelf | The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash. |
| 2.1 | Building the west kiln | The west kiln was built on site, over one spring, to fire stoneware. |

1.1 — status final

2.1 — status cut: left out of the book

1.1 is final. 2.1 is cut, so the book leaves it out.

<!-- guide:end -->

### Asking the same records something else

The book is one fold. The records under it can be folded other ways, by anyone who holds them. None of these four questions was planned for when the passages were written. The records were enough.

<!-- guide:questions -->

#### The first draft, word for word

A tick's stored `result` names the heads by id alone, and each is still a record:

```console
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

#### Every wording a passage has had

```console
$ loops --in book export --of passage:the-cracked-shelf | jq -r '.payload.text'
Its first firing cracked a shelf at cone 6.
Its first firing cracked a shelf at cone 6. Nobody had checked the kiln wash.
The first firing went badly: a shelf cracked at cone 6.
The first firing went badly: a shelf cracked at cone 6. Nobody had checked the kiln wash.
```

<!-- guide:diagram wordings -->

The four wordings of the cracked shelf, as a chain of revisions

One draft, two rewrites made at once, then one settled passage

| Step | What happens |
| --- | --- |
| 1 | First draft |
| 2 | A rewrite |
| 3 | A rewrite |
| 4 | Settled |

The four records of the passage, numbered in the order export prints their text above.

<!-- guide:end -->

#### What was written from a source

```console
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

#### The sources, newest first

A second vertex, saved as `book/.loops/vertices/sources.json`:

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

```console
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

<!-- guide:end -->

### The same shape, elsewhere

A decision, a rule of thumb and a lesson learned are the same shape as a passage: a thing with a key, a line to scan, a status with a closed value, and words that are revised whole. Something noticed in passing is the same shape as a source: an event that mentions what it is about. What you call your kinds, and when a thing is worth writing down, are yours to decide.

## For reference

### What is built, and what is not

| Status | What it covers |
| --- | --- |
| Built | **Emit, read and fold, signed, for one person's stores on one machine.** |
| Built | **A store description, the shorthand's stops, `describe`, `ls --refers-to`, and reads across a group of stores.** |
| Built | **Ticks, their check, a tick over a cut, and a write against a base.** |
| Not built | **Standing: who may write to a store, grants, a store that refuses a record, names for writers.** The questions wait on a ruling, on [Decisions](DECISIONS.md#identity-and-standing-is1-to-is11). Until then, every record is signed by the machine's key, and that key is its observer. Writers who share a machine share a key. To tell them apart, state the writer in a field of your own. |
| Not built | **Sharing: stores synced between machines and people.** Until then, a store is a directory. Copy it, or `export` from one and `import` into another. |
| Not built | **A search index, collectors, a command that edits records as text, a server.** Until then, fold the store directly, and keep search or ranking in a script that reads folds and writes its findings back. |

This release is for trying the rules in everyday use, by people and by agents. The command is the cheap part to change. The record, its envelope and the laws are not, though the record format isn't frozen yet: read the changelog before moving a store to a newer release. What comes next is in the roadmap.

### If you used the old tool

The Python `loops` kept facts in a table, and a `.vertex` file said how to read each kind. What changed:

| Then | Now |
| --- | --- |
| A later fact with the same key overlaid the fields it carried. | A revision names what it replaces in `prev` and the fields it sets in `sets`. The reading is the same, and it is written down in the record. |
| The `.vertex` file described the kinds and held a fold. | Two files: `.loops/store.json` describes the kinds, and each vertex in `.loops/vertices/` holds a fold. |
| The observer was a name, written as text. | The observer is the key that signed the record. The import carries an old observer's name as a mention, `observer:<name>`. |
| A reference was `owner=person/potter` with an id beside it, or a `ref=` list. | A declared reference field holding `kind:key`, read by `ls --refers-to`. |
| A thing held by two stores read as one value, the later by time. | It reads as two heads, both shown. |
| A `.loop` file. | No such file. A script pipes lines into `emit -`. |
| A store was found by its name. | A name in `stores.json`, with `--in`. |

`loops shadow-import` copies an old store's export into a new store, to be read beside the old tool. The old tool's ticks aren't brought over.

### Words

| Word | Meaning |
| --- | --- |
| Record | One signed statement. Never changed. |
| Envelope | A record's outside: who, when, of what, replacing what. |
| Payload | A record's inside: what was said. |
| Thing | What a record is of: a name such as `kiln:east`, or a root's own id. |
| Root | A record with no `of` and no `prev`. It starts a thing named by its id. |
| Head | A record of a thing that nothing replaces. |
| Fork | A thing with two or more heads. |
| Live setter | The record a field's value is read from. |
| Fold | A computed answer over records. |
| Spec | A fold's definition, as JSON. |
| Vertex | A spec saved under a name in `.loops/vertices/`. |
| Slot | One named answer inside a spec. |
| Tick | A record that freezes a fold's answer so it can be checked. |
| Store | A directory holding `.loops/`. |
| Group | The stores a `stores.json` lists. |
| Description | `.loops/store.json`: what a store says about its kinds. |

### Where the rules are

| Rule | Where |
| --- | --- |
| A record's bytes, its fields and `occurred` | `protocol/record.md` |
| The spec, every test and every refusal | `protocol/spec.md` |
| The tick and its check | `protocol/tick.md` |
| What the command does, choice by choice | `rust/PLACE.md`. `loops` with no arguments prints the usage. |
| The laws the model proves | `protocol/laws.md` |
| What changed, by date | `CHANGELOG.md` |
