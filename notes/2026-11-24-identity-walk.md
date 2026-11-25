# Identity, standing and sharing: a walk before anything is anchored

**Written on 2026-11-24 at Kyle's request. Nothing here is put to him or ruled.** It is a walk in the manner of [the trust walk](../design/rethink/sections/11-trust.html): three real scenes taken step by step, each step marked as holding, breaking or open. The draft entries are what the walk found to decide. They are drafts: none is in `DECISIONS.md` yet.

The note has two parts. Part one, sections 1 to 8, walks identity. Kyle read it and said that identity cannot be settled alone, so [part two](#part-two-the-thinnest-slice-through-standing-and-sharing), sections 9 to 13, walks the thinnest slice through standing and sharing. Part two withdraws one leaning of part one (ID5). Kyle then said that this raises how stewardship is managed, for the description file and everything else that defines a store as much as for the list, so [part three](#part-three-stewardship), sections 14 to 16, walks that. [Part four](#part-four-two-stewards), sections 17 and 18, takes the case part three had set aside.

**Read [part five](#part-five-what-the-council-broke) beside the rest.** Kyle had the walk put to margins, Neon and Astra in a chat room, asking where it is wrong. Several steps marked as holding do not hold. Parts one to four are left as they were written, and part five says what broke and what replaces it. Where they differ, part five is the current reading.

It was prompted by a plan Kyle and Neon worked out the same evening, kept outside the repository, which puts identity and names first among the next steps: lineages with two tiers of key, a seat per agent, `name` records, and key profiles in the CLI. This walk asks what that step has to settle, and finds it is wider in one place and narrower in another.

"Today" below is the `loops` binary built from main on 2026-11-24 (`6ebbca7`). Every "today" answer was run in a scratch store with invented names.

## 1. Why identity is walked before it is built

Most of what was built this month can be redone. A storage layout, a plain view, a description file and a search index are all computed from the records, and the records do not change when they are replaced.

Three things are not like that, because they are inside what is signed:

- **The observer.** It is in the envelope, and an erasure keeps the envelope. A record written by a device key says so for as long as it exists.
- **Which store holds a thing's records.**
- **The reference vocabulary in payloads.**

Identity is the first of these. An anchor made in haste is kept forever or abandoned, and the trust walk says so in one line: "No anchor that anyone means to keep should be made until this walk is closed." This note is an attempt to close it for stratum 1.

## 2. What exists today

**The observer is the signing key.** `loops emit` refuses any other, on the write side:

```
$ loops emit kiln --of kiln:east status=warm --observer sl:example
refused: observer-unbound: sl:example is not this key
```

**No reader compares an observer with a key.** A reader checks each line's envelope, commitment, id and signature. A line whose observer is not its signing key can arrive through `loops import`, is read like any other, and is counted by `loops check` as `unbound` ([`rust/PLACE.md`](../rust/PLACE.md), choice 3 under "Choices made here"). So today's answer to "what does a reader do with a record it cannot attribute" is: include it, and count it in one verb.

**The plain views do not say who wrote anything.** Two keys wrote `kiln:east` here, and the second replaced the first:

```
$ loops of kiln:east --plain
thing  kiln:east
records  2
heads  1
  status  hot
head  r:v2a8cfeu…
  emitted  now
```

**The envelope already has a place for "on whose behalf".** `under` is an optional envelope field, "the record id of the grant it acts on", with its own refusals (`under-not-record-id`, `under-unknown`). Nothing writes it yet.

**A tick by one key can cover a record another key wrote.** An agent's key wrote a proposal, and the potter's key wrote a tick over it:

```
$ loops tick spec.json --cover r:gmg55s2b…          (as the potter's key)
r:egmc3nev…
$ loops tick --check r:egmc3nev…
{"answer":"same","closure":"yes","taken-not-covered":1}
```

The tick's observer is the potter's key, and its payload lists what it covers.

**The model has stratum 1.** [`model/Loops/Keys.lean`](../model/Loops/Keys.lean) defines an anchor, a binding, `Speaks` and `Attributed`, and [`model/Laws/Keys.lean`](../model/Laws/Keys.lean) proves six laws. A record is attributed when its observer is its signing key, or when that key speaks for the observer. Nothing in the model retires a key, and nothing outside the model reads these definitions.

**The one outside user already keeps names.** rex-chat pins a name to each key in a file on the reader's machine, one line per name. Its room has five writers, and five keys are not readable as five people.

## 3. What the design already says

These are settled or leaning in the design pages, and the walk takes them as its starting point.

- **An observer is a lineage id** ([Observers](../design/rethink/sections/03-observers.html)). Names never take part in matching.
- **A lineage id is the hash of its anchor record** ([Lineage](../design/rethink/sections/04-lineage.html)). The same key signing a second anchor starts a second lineage.
- **Two tiers of key**, settled by Kyle on 2026-11-10. The root signs what changes standing, and a bound key signs the rest. Only the root binds a key.
- **An agent is not a key of yours.** The seat has its own lineage and root. Your root signs a grant naming it, and its records carry `under`.
- **The root is presence:** the key that asks for you before it signs. Grants, retirements and the affirming of a proposal need you present. Ordinary emits do not.
- **A lost bound key speaks for you for good** until retiring exists. Retiring is a tick with a stance, and so waited for ticks, which are now built.
- **Left open on the Lineage page:** whether a model swap is the same observer (leaning yes), what two sessions of one lineage at once mean, and whether people get lineages at all (leaning yes).

## 4. Scene one: one person, several agents, one machine

The cast is the workbench as it is: a person, a coordinating agent session, workers that session starts, an agent from a second vendor, and a chat room between them kept in a store. All of them run as one operating-system user.

**Who writes.** Nearly every record is written by an agent at the person's word. That includes the person's own decisions: an agent types them into a changelog, and git records the person as the author. The person's key signs almost nothing.

*Holds, as far as "which agent wrote this" goes.* A seat per harness gives each agent its own observer. rex-chat does this today with a key per agent.

**The person decides something.** The agent writes "the potter ruled A". Under the design that record is the seat's word about the potter: hearsay. The design's answer is that the potter affirms it, with the root key, which asks for them.

*Breaks for a step that is only keys and names.* Stances are part of standing and are not in that step. So after it, the store still cannot tell a decision the person made from a decision an agent says they made. In a workflow run through agents, that is the question people will ask of it. Three ways to answer it are in [ID2](#id2-a-persons-word-when-an-agent-does-the-writing).

**A session.** Each session of a harness could be its own observer, or all sessions could be one seat. The Lineage page leans to one seat, and to a session saying what it is in a record.

*Holds, with one consequence.* What changes per session (the model, the task, the repository) belongs on a thing for the session, written by the seat. Kept as fields on the seat's own thing, two sessions at once would conflict on them.

**A worker.** The coordinating session starts workers and collects their reports. The workers here write code and no records, so there is nothing yet to attribute.

*Open, and nothing asks for it.* A worker that never writes a record needs no identity. One that writes into a shared store is a seat like any other.

**Where the keys are.** Every key on this machine is a file the one user can read. An agent running as that user can sign with any of them. The trust walk calls this "the honest limit".

*Breaks more than it first seems.* On such a machine, a record signed by the person's bound key proves no more than one signed by the agent's. The separation between "the potter" and "the potter's agent" is a convention there, however the lineages are drawn. It becomes real only where the person's key is out of the agent's reach: on another machine, or behind a prompt. That suggests a rule stronger than "the root stays off the workbench" ([ID3](#id3-a-persons-keys-on-a-machine-where-agents-run-as-them)).

## 5. Scene two: a small team

The cast is three people with laptops their employer issues and replaces, an agent harness on each, a shared CI, and one git repository that holds the store. The git host decides who can push.

**The first write.** A person's anchor, the binding for their laptop's key and their first record land in the store together. Every clone can then check all three offline.

*Holds.* It is what the Sharing page calls "stores verify themselves".

**The laptop is replaced.** The root key has to be on the new one, or reachable from it. "Make it where it will stay" cannot mean an employer's laptop, which lasts three years. So the root key is recovery material from the first day: in a vault, and on whichever laptop is current.

*Holds, with a trap.* The lineage is the anchor, not the key. A person who restores the root key on a new laptop and runs the first-run step again makes a second anchor, and with it a second lineage that shares nothing with the first but its root. The recovery material is the key and the anchor line together, and the first-run step must look for an anchor before it makes one ([ID6](#id6-recovery-and-a-second-anchor)).

**A record arrives before its binding.** Two people work on branches. One binds a new laptop on their branch and writes from it. The other merges only the records. For a while, a clone holds a record whose key does not yet speak for its observer.

*Open, and the largest choice here.* The model says the set decides and that holding more never silences a key, so this record becomes attributed when the binding arrives. A reader that refused the whole store in the meantime would refuse over a state that mends itself. A reader that leaves the record out changes what a fold answers before and after. A reader that includes it and says so, as today's does, lets anyone write as anyone until someone looks. And a tick has to say which of these its result was computed under ([ID4](#id4-a-record-whose-key-does-not-speak-for-its-observer)).

**Two stores.** A binding is held in one store, and the bound key writes into another. Read alone, the second store cannot attribute the record. Read together, it can.

*Holds if each store carries what its own records need.* That is the copy on first write, and it has to happen again for each new binding, in each store that key writes to. `loops check` can then say which records a store cannot attribute from what it holds alone.

**A profile.** A person's email, team and the like are fields on a thing named by their lineage. If two stores each hold a first write of that thing, a read of both shows no value for any field, equal values included. That is the whole-read rule as built, and it was run on 2026-11-24 with a service in place of a person.

*Breaks unless one store is the home of a lineage's own thing.* It is the same trap as any thing written first in two stores, and it needs its rule whatever identity does.

**A laptop is lost.** Its bound key is in someone else's hands. Under the trust walk's rule, no store meant to last has a second writer until retiring exists. This team's store has several.

*Holds only on a premise that nobody has ruled.* The premise is that the git host is the admission boundary: a stolen key is no use without the right to push, and a person who leaves loses that right. It is a reasonable premise for these stores. It is also the first time the project would rest on something outside the records, and it stops holding the day a store is shared any other way ([ID5](#id5-the-git-host-as-the-boundary-and-a-lost-key)).

**A person leaves.** Their records stand, as they should. The employer wants their keys to stop, which is the same premise. The person may want their name and email gone. Those are payloads and can be erased. Their lineage id cannot: it is on every record they wrote, in every clone.

*Holds, and shows what a lineage id is: a permanent pseudonym.* It also links every store that person writes in. One lineage used for an employer's stores and for a public repository joins the two for anyone who reads both ([ID1](#id1-who-gets-a-lineage), [ID7](#id7-what-identity-leaves-erasable)).

**Names.** The plan has `potter` and `potter/agent` shown in place of ids, with "trusted team names" ranked above a self-chosen one. But nothing yet says who may name for a team: that is a steward, and stewards are stratum 2. Until then any writer can sign a name record calling their lineage `potter`.

*Breaks for shared name tables, holds for two smaller things.* A self-chosen name shown with a few characters of the id is honest. So is a reader's own list of names, which is what rex-chat already keeps. A table the team shares has to wait for someone with the standing to keep it ([ID8](#id8-names-in-the-first-step)).

**Typing a name.** The plan lets `owner=potter` stand for `owner=sl:…`, resolved before signing. ST1, ruled on 2026-11-24, makes that a stop: a reference field takes a typed reference. And a name resolved from the writer's own list means the same command signs different bytes on two machines.

*Breaks against a ruling of the same day.* A unique start of an id, as `r:` ids already allow, has neither problem.

## 6. Scene three: someone outside

The cast is a contributor outside the project. On 2026-11-24 the first one sent a change through the public mirror, after importing a store of his own with the old tool's exporter.

**He sends code.** His identity is a git author line and an account on the host. Nothing of this protocol is involved, and nothing needs to be.

*Holds.*

**He sends records, one day.** His anchor certifies itself: every record under it is provably from one writer. Who that writer is, nothing says. A name he gives himself is a claim, and the reader's own name for him is the only one that means anything to the reader.

*Holds, with no registry.* A stranger is checkable as consistent and not as anyone in particular. That is the right amount.

**He imports old history.** The old tool's observers were free text such as `potter/agent`. The import signs every record with the importing key and carries the old observer as a mention, `observer:<old text>`. So imported history is the importer's word about what an old store said.

*Holds, and stays as it is.* No later lineage can honestly claim those records. They can be adopted, record by record, once stances exist.

**The store is public.** Every lineage id, every binding and every time a key was added is readable by anyone, for good.

*Holds, as long as it is known in advance.* It is one more reason for a lineage per realm.

## 7. What the three scenes show

**Keys and names answer "which keys are one writer". They do not answer "on whose word".** In scene one, the second question is the one that matters, and the envelope already has `under` for it. A first step that is honest for a workflow run through agents needs some way for a person's own word to be in the store, even a small one.

**The separation between a person and their agent is physical before it is cryptographic.** On a machine where an agent runs as the person, no arrangement of lineages makes the person's signature mean more than the agent's.

**The reader's rule is the protocol change.** Everything else in stratum 1 is new records of ordinary shape. What a fold and a tick do with a record that cannot be attributed changes what a spec answers.

**Shared names can wait, and typed names should.** A reader's own list and a self-chosen name beside a short id cover the need that rex-chat found.

**Retiring can wait only if the premise about the git host is said out loud.** (Part two withdraws that premise: the host delivers, and standing decides what counts.)

## 8. Draft entries

None of these is put. Each says what it would change, so that the ones that reach bytes or answers can be told from the rest.

### ID1: who gets a lineage

**Question.** What is the unit that an observer names?

**Example.** One person has a laptop from an employer, a machine at home, an agent harness on each, and writes in an employer's stores and in a public repository.

| | Lineages | Cost |
| --- | --- | --- |
| **A (leaning)** | One per person per realm (work, own). One per harness per person per realm. A session and a worker are things a seat writes about, and get none. | "The same person" across realms is a claim they may make and need not. Four lineages for the example. |
| B | One per person, everywhere. Seats as in A. | Every store that person writes in is linked by one id that cannot be erased. |
| C | One per session. | No continuity for an agent, which the Lineage page was written to give. |

**Changes:** the observer in every record written afterwards. Permanent.

### ID2: a person's word when an agent does the writing

**Question.** After the first step, can the store hold a person's own decision, as distinct from an agent's account of it?

**Example.** An agent writes `ruling:kiln-schedule` with `chosen=A`, at the potter's word in a conversation.

| | What the store holds | Cost |
| --- | --- | --- |
| A | The agent's record only. A person's word exists only where their key signed. | Honest and empty: almost nothing is the person's word. |
| **B (leaning, as the interim)** | The agent's record, and a tick signed by the person's key that covers it. Run today, above. | A tick says "this spec over these records gave this result". It does not say "I agree", and what it covers is in its payload. It is evidence that the person's key saw the record, and no more. |
| C | The agent's record, and an `affirm` stance by the person, signed with presence, as the design has it. | Stances are standing work. It is the right answer and not a small one. |

**Changes:** nothing in bytes for A or B. C adds a kind that admission will read.

### ID3: a person's keys on a machine where agents run as them

**Question.** Does a person have any key of their own on such a machine?

| | On the agent's machine | Cost |
| --- | --- | --- |
| **A (leaning)** | Seats only. The person's keys are on a machine the agent does not run on, or behind a prompt. The person writes there or affirms from there. | The person cannot emit as themselves from the workbench shell. Today that is where nearly all of Kyle's own typing happens. |
| B | A bound key of the person, in a file. The root is elsewhere, as the trust walk has it. | A record under the person's lineage from that machine proves nothing an agent could not have produced. |

**Changes:** nothing in bytes. It decides what a person's signature is worth.

### ID4: a record whose key does not speak for its observer

**Question.** What does a reader do with it?

**Example.** A clone holds a record with observer `sl:7f3a…` signed by a key that no held binding names, because the binding is on a branch not yet merged.

| | A fold | Cost |
| --- | --- | --- |
| A | Refuses the read. | A store is unreadable in a state that the next merge mends. |
| **B (leaning)** | Leaves the record out and counts it beside the result, as `where` counts what it could not read. | A fold's answer changes when the binding arrives. That is already true of a late `prev`. |
| C | Includes it and counts it, as `loops check` does today with `unbound`. | Anyone who can add a line can write as anyone, until someone reads the count. |

**With it:** a tick's cover would take in the anchors and bindings that make its covered records count, as it takes in `prev` and `under` ancestors today. Otherwise two machines holding different bindings check the same tick differently.

**Changes:** what a spec answers, and what a tick covers. This is the entry that needs the model and vectors.

### ID5: the git host as the boundary, and a lost key

**Question.** May a store with several writers be kept before retiring exists?

| | Rule | Cost |
| --- | --- | --- |
| A | No. The trust walk's interim rule stands, and retiring is built in the same step. | A larger first step: a retirement is a tick with a stance, and a law (`speaks.grows`) gives way to one with a cut. |
| B (the leaning when part one was written; **withdrawn in part two**) | Yes, for a store shared only through a git host, on the stated premise that the host's access control is admission. A `key-lost` kind exists from the start, ordinary now, for a later retirement to cite. | The premise is outside the records. A store that leaves git, or a host that is misconfigured, has no defence. |

**Changes:** nothing in bytes for B. A changes what a reader counts.

**After part two.** Kyle's direction is that anybody can emit and that standing, not the host, decides what is canonical. So the host is not the boundary, and this entry becomes: what a lost key can do once standing is in records ([section 11](#11-standing-walked)). A junior's lost key can propose. A lead's can write what a lead's records count for, and cannot change who counts. Retiring is still what closes it.

### ID6: recovery, and a second anchor

**Question.** What does a person keep so that a new machine is the same lineage?

**Leaning.** The root key and the anchor line together. The first-run step looks for an anchor that its root signed, in the recovery material and in the stores it can reach, and makes one only when told to. A second anchor by the same root is allowed by the model and is almost always a mistake.

**Changes:** nothing in bytes. It is what the CLI does on first run.

### ID7: what identity leaves erasable

**Question.** What about a person can be removed later?

**Leaning.** The anchor's payload is empty. A name, an email and everything else are fields on the lineage's own thing, in one home store, and can be erased. The id, the bindings and the fact of each record cannot.

**Changes:** nothing in bytes beyond ID1. It is a convention to write down before the first profile is written.

### ID8: names in the first step

**Question.** How much of naming does the first step build?

| | Built | Cost |
| --- | --- | --- |
| **A (leaning)** | A self-chosen name, shown beside the start of the id. A reader's own list of names, as rex-chat keeps. A unique start of an `sl:` id accepted wherever an `r:` start is. | No team table, and no `owner=potter`. |
| B | A, and shared name records ranked by trust, and names accepted in reference fields. | Nothing yet says who may name for a team. ST1 would need an exception. |

**Changes:** nothing in bytes for A. B changes what the shorthand accepts.

# Part two: the thinnest slice through standing and sharing

*Part five breaks steps in this part: see [section 19](#19-what-broke-and-what-replaces-it), items 1, 4, 5 and 10.*

**Added later on 2026-11-24.** Kyle's direction for this part, in his words where they are short:

- Git is where sharing starts, and this walk presumes it. It "will not be the only storage method of which we can control access", which makes standing more important.
- "Anybody can emit into a continual stream of records", and strictness is progressive.
- For git: records travel as git objects, without pull requests.
- What is canonical in a view of the store is decided by standing: "my director or myself would have more standing than our junior devs".

None of that is a ruling. It is what this part takes as given.

## 9. What exists today for this

**Anyone replaces anything.** `emit` anchors a write on the thing's heads, and admission permits every replacement of a held, related record ([`rust/PLACE.md`](../rust/PLACE.md), choice 5). A lead wrote `chosen=weekly` and a junior then wrote `chosen=daily`:

```
$ loops of decision:kiln-schedule --plain
thing  decision:kiln-schedule
records  2
heads  1
  chosen  daily
```

One head, no conflict, and nobody named.

**A filter on the observer is not standing.** A spec can test `env.observer` in a slot's `where`. But `where` is applied after the heads are found. Run after each of three writes, with a slot that keeps only the lead's records:

| After | The slot shows |
| --- | --- |
| the lead writes `weekly` | `chosen: weekly` |
| the junior writes `daily` | nothing: the decision is gone from the view |
| the lead writes `daily` again, anchored on the junior's | `chosen: daily` |

The middle row is the one that matters. A view of what the lead has said should still say `weekly`.

**The spec already has the right place.** [`protocol/spec.md`](../protocol/spec.md): "Settle forms before admission, then run heads and all slots over admitted records." Admission today reads only `prev` and `of`. A source selects by `store`, `kind`, `about` and `of`, and that too comes after the heads. So standing is a clause of admission, and nothing else in a spec can stand in for it.

**The design's sentence for this.** "A steward's changeset takes effect. Anyone else's is a visible proposal that takes effect if a steward affirms it" ([Residence](../design/rethink/sections/09-residence.html), of declarations). And of an agent: "admission at read ignores records outside the grant" ([Sharing](../design/rethink/sections/10-sharing.html)).

**Git objects, one ref per writer.** Run on a bare repository on one machine, with no host involved. Each of two writers put the tree of their own closed segments on a ref named for their key, with no history, and pushed only that ref:

```
lead pushed    refs/loops/w/a73s4gdr…
junior pushed  refs/loops/w/m8rb4ohk…
working trees: 0 changed files          branches on the hub: main
a plain clone brings 2 refs, of which loops: 0
git ls-remote lists 2 loops refs
$ loops check                           (a third clone, after one fetch of refs/loops/*)
{"altered":[],"lines":2,"records":2,"refused":[],"segments":2,"unbound":0}
```

## 10. Sharing, walked

The cast for both walks: a director, a lead, two junior developers and an agent seat for each, in one repository that people outside the team can read.

**Each writer pushes their own ref.** The ref holds that writer's segments and nothing else.

*Holds.* No two writers touch the same ref, so there is no race on push and never anything to merge. It is the single-writer segment carried into git. The working tree and the branches are untouched, and no pull request is involved.

**A reader fetches every ref and keeps the union.**

*Holds, with one rule: a reader never drops a record because a ref moved.* A ref is a mailbox, and the store is what has been taken out of it. A ref that loses a segment is either an erasure, which arrives as a record and is applied as one, or the alarm the Sharing page describes.

**Who can deliver.** Whoever the host lets push can move or delete any writer's ref. Hosts guard branches and tags. Whether either of Kyle's hosts can guard other refs is not tested.

*Holds for delivery and for nothing else.* A signature stops a forged record. It does not stop a removed one, though every clone that fetched still holds it. This is "anybody can emit", seen from the storage.

**Who can read.** A plain clone does not fetch these refs. Anyone who can read the repository can list and fetch them.

*Breaks one hope.* The store is out of sight of an outside contributor, not withheld from one. A store that has to be withheld is a separate repository, or a storage that withholds.

**An erasure.** The writer's segment is rewritten and their ref moves. The hub drops the old object when it next collects, and each clone does when it does.

*Holds as a request.* It is better than a branch, where history keeps the payload for good.

**Another storage, later.** A bucket or a server with access rules per prefix can enforce what git cannot: that only a writer writes under their own prefix. The layout by writer is what makes that possible, so it is the part to keep. What decides canonical cannot live in the storage's access rules, because they differ from one storage to the next.

*Holds, and it is the reason standing ends up in records.*

## 11. Standing, walked

**Everyone emits.** This is today. Nothing is canonical: the junior's write above replaced the lead's.

*Holds as the first rung.*

**What "more standing" means.** There are three readings.

- *Rank: where two disagree, the higher wins.* **Breaks.** The junior's write above was a replacement, not a disagreement, so rank had nothing to decide. To help, rank would have to say who may replace whom, which puts an order among writers inside admission. Two leads who disagree still conflict. And a junior's dissent, which ought to be seen, is hidden.
- *Counted or not, for the whole store.* Holds, and is coarse.
- *Counted or not, kind by kind.* A junior's `note` and `task` count. Only a lead's or a director's `decision` and `service` do. **Holds.** It is the design's grant with a scope, and the description file already lists a store's kinds.

So "more standing" is being counted for more kinds, and being able to accept what others propose. It is not a rank.

**A record that does not count.** It is held, it is shown as a proposal, and it is never part of the canonical state. Every result says how many it left out. After the junior's write, the decision still reads `weekly`, with one proposal against it.

*Holds.* It is one clause more in the admission stage that exists. It changes what a spec answers.

**Accepting a proposal, with no pull request.**

- *Restating.* The lead emits the same fields, anchored on the proposal. This works today: it is the third row of the table in section 9. The lead's record is canonical and its `prev` leads back to the junior's. The cost is a copied payload, and a canonical record whose author is the lead.
- *Affirming.* A stance by someone with standing that mentions the proposal, after which the proposal itself counts. It is the design's answer and keeps the junior as the author. It is a new kind that admission reads, and admission then reads stances before it reads anything else.

*Both hold. Restating needs nothing built.*

**Where the list of who counts is kept.** There are three places, in order of effort.

1. *A file of the reader's own,* as rex-chat keeps names. Each reader then has their own canon, which is not what a team means by the word.
2. *A plain file that all share.* **Breaks under sharing without pull requests.** What guarded `.loops/store.json` was review on a branch. In git objects that anyone can push, a plain file belongs to whoever pushed last. So the file stays on the branch under ordinary review, or it becomes:
3. *Signed records.* A store anchor that names the stewards, and a steward's record that says who counts for which kinds.

*A finding of this walk:* sharing without pull requests is what brings signed declarations forward. The same holds for the description file itself, now that ST1 lets it stop a write.

**The list changes.** A junior is added for `decision`: do their old proposals become canonical, the ones a lead passed over included? A director leaves and is taken off: does every decision they made drop out of the canon?

*Breaks on removal.* That is "retire through" again: a removal has to cover what stands, and a cover is a tick. Until retiring exists the list only grows, and a departure is recorded and waits. An addition is open: the design judges a record by what was in effect at its `emitted`, which a writer can backdate.

**An agent seat.** If the lead's seat is listed for `decision`, the agent makes canon alone. If it is not, the agent proposes and the lead accepts with their own key, which means something only where that key is out of the agent's reach.

*Holds, and it joins the two parts.* Accepting a proposal is the person's word that part one was looking for (ID2), and it is worth what the person's key is worth (ID3). Listing a seat for some kinds is what the Sharing page calls "presence given ahead of time".

**A lost key.** A junior's can propose and no more. A lead's can write what a lead's records count for. Neither can change who counts, which takes a root key.

*Holds better than in part one,* where a lost key could do anything its owner could. Retiring is still what closes it.

**Strict.** The last rung: a store refuses, at the write or at the import, what would not count. Nothing in this slice needs it.

*Open.* With it, "progressive" has four rungs: open, listed, anchored, strict. Each keeps the records of the one before, as the Residence page says of a store raised to strict.

## 12. The slice

| | Piece | What it changes |
| --- | --- | --- |
| 1 | **Delivery by one ref per writer.** `loops` pushes this writer's ref and fetches the rest into the union. | The place and the CLI. No record's bytes. |
| 2 | **Admission by a list.** A record counts for its kind when its observer is listed for it. Every other record is held and counted as proposed. | What a spec answers. The model and vectors. |
| 3 | **Reads that show both.** The canonical state, the proposals against it, and who wrote each. | The CLI. |
| 4 | **Accepting by restating.** | Nothing. A verb for it would be a convenience. |
| 5 | **The list.** For a trial, a file on the reviewed branch that names keys. For a store that is kept, a store anchor and a steward's records that name lineages. | The trial form: one input a spec must name. The kept form: two standing kinds. |

**Not in it:** grants with `under`, the affirm stance, retiring, strict refusal, shared names, and declarations of kinds as records.

**One constraint on piece 2.** The list has to be something the spec names or the store holds. A tick records a result, and a second machine can check it only if it can find the same list.

**What this means for part one.** The trial form of the slice needs no anchor: the list can name keys as they are today. So a team can learn what it wants canonical to mean on stores declared disposable, before any lineage is made. ID1, ID4 and ID6 are then settled before the first store that is kept.

## 13. Draft entries for the slice

### SL1: what "more standing" means

| | Standing is | Cost |
| --- | --- | --- |
| A | A rank among writers. | Decides nothing when a write replaces another. Hides dissent. |
| B | Counted or not, per store. | A junior's notes are proposals too. |
| **C (leaning)** | Counted or not, per kind, with the right to accept. | A scope has to be written somewhere. A set of kinds is the smallest one. |

**Changes:** what the list holds.

### SL2: a record that does not count

**Example.** The junior's `chosen=daily` on a decision the lead set to `weekly`.

| | A fold | Cost |
| --- | --- | --- |
| A | Leaves it out and says nothing. | A proposal nobody knows about. |
| **B (leaning)** | Leaves it out of the state, lists it as proposed, and counts it beside the result. | Every read has a second part. |
| C | Includes it and marks it. | It is not canonical then, which was the point. |

**Changes:** what a spec answers. This is the same question as ID4 with a different reason for not counting, and the two should have one answer.

### SL3: accepting a proposal

| | By | Cost |
| --- | --- | --- |
| **A (leaning, first)** | Restating it, anchored on it. Works today. | The payload is written twice, and the canonical author is the one who accepted. |
| B | An affirm stance. | A kind that admission reads, and stances read before everything else. |

**Changes:** nothing for A. B is standing work.

### SL4: where the list is kept, rung by rung

**Leaning.** For a trial: a plain file on the reviewed branch, naming keys, read as an input the spec names. For a store that is kept: a store anchor and a steward's records, naming lineages. Never a plain file among the git objects that anyone can push.

**Changes:** the kept form adds two standing kinds, with everything standing reads in the envelope, as the trust walk has it.

### SL5: when the list changes

**Leaning.** The list only grows until retiring exists. In the trial a record is judged by the list as it is held now. In the kept form an addition names a tick it takes effect from, so that a backdated `emitted` gains nothing.

**Changes:** what a spec answers after an addition.

### SL6: how records travel in git

| | Layout | Cost |
| --- | --- | --- |
| **A (leaning)** | One ref per writer, no history, holding that writer's segments. Run above. | A setup step per clone, and a host that does not guard these refs. |
| B | One shared ref. | Every push races every other, and a fetch, union and retry loop is needed. |
| C | Segment files in the working tree, as today. | Thousands of small files in every diff and search, and a pull request or a push to a branch for every record. |

**Changes:** nothing in bytes. It is a second place beside the directory.

# Part three: stewardship

*Part five breaks steps in this part: see [section 19](#19-what-broke-and-what-replaces-it), items 3, 6, 7 and 14.*

**Added later still on 2026-11-24.** Kyle, on reading part two: this "raises, of course, how stewardship is managed. Which is the same consideration for store.json, and anything else defining how a Place is structured." And, of one answer: "I agree on the steward being a lineage for the team, and grants from there." That agreement is taken as given below. It is not yet a ruling.

## 14. One question, asked three times

Who may change the list of who counts? Who may change the description of kinds? Who may change the stewards? Each is the same question about a different definition of the store.

**One mechanism.** A definition is a thing of one of a small closed set of kinds. The steward counts for those kinds and nobody else does. Then part two's rule covers all three: the steward's change takes effect, and anyone else's is a proposal the steward can accept. The Residence page says this of declarations. Here it is said of every definition.

**Where it stops.** The steward is named by the store's anchor, and the anchor's hash is the store's id. Nothing changes the anchor. A store is defined by its founding steward, and everything after is that steward's signed change.

**What is the store's and what is the reader's.** Kinds, who counts and the steward travel with the store and must read the same for everyone. Where stores are on a machine, pinned names and keys belong to one reader. Only the first need a steward.

## 15. Stewardship, walked

The cast is part two's: a director, a lead, two junior developers, a seat for each, and now a lineage for the team.

**The team makes the store.** A lineage for the team, whose root the organisation holds, signs the store's anchor. It is the only steward.

*Holds, and it removes a problem.* With two stewards, each could remove the other at once, and some order among them would have to decide. One steward cannot be removed by another. Two changes signed by the one root on two machines are a fork on `prev` by one writer, which is shown and which a later change by the same root settles.

**The team grants.** A grant is the team's record about a person's lineage: this lineage counts for these kinds, and may accept proposals for them. The director and the lead are granted `decision` and `service`, the juniors `note` and `task`.

*Holds.* The list of part two is the set of grants the store holds. Admission looks for a grant from the store's steward to the record's observer that covers the record's kind. No record has to cite its grant with `under` for that: there is one steward to look under.

**Where a grant's scope is written.** The trust walk leaned to standing that reads envelopes only, and noted that a scope "does not fit an envelope". A set of kinds does fit, as mentions. Written today as an ordinary record:

```
$ loops emit grant --root --about sl:junior-example --about kind:note --about kind:task
r:9480a85q…
  kind   grant
  about  kind:note, kind:task, sl:junior-example
  payload {}
```

A spec that takes grants mentioning `kind:note` finds it, and finds it again after its payload is erased.

*Holds for a scope that is a set of kinds.* A reader needs no payload to judge a record, so admission answers yes or no and never unknown. A finer scope (these things, these fields) would not fit, and nothing asks for one yet ([SW3](#sw3-where-a-grants-scope-is-written)).

**A kind is then a thing.** `kind:note` is a typed reference like any other. The description of the `note` kind, which `.loops/store.json` holds today, can be fields on the thing `kind:note`, written by the steward.

*Holds, and it is the unification again.* The file stays what people read and edit. For a store that is kept it is a rendering of those records, and an edit to it becomes a proposal, or the steward's change.

**Someone joins.** Their grant needs the team's root. The root is in the organisation's keeping and is not a tap away.

*Breaks on friction, two ways out.* Either the team's root grants someone the right to grant within a scope, which is delegation and has to narrow at each step. Or the review the team already has stays the way definitions change, and what it produces is signed: a change to the grants or the description is reviewed on a branch, and on merge a signer that holds the team's root writes the records. The first is more machinery in the model. The second keeps the root in a service, and whoever controls that service controls the store ([SW2](#sw2-how-the-teams-root-is-used), [SW4](#sw4-who-may-grant)).

**Someone leaves.** In a company this is routine, where a lost key is rare. Their grant has to end, and an ended grant must not take their past decisions out of the canon.

*Breaks until retiring exists, and sooner than part one's lost key.* An end of grant is a retirement: the steward's record about the grant, with a tick that covers what stands. Ticks are built. This is the one piece of "later" that a team store that is kept needs from its first month ([SW5](#sw5-ending-a-grant)).

**A seat.** An agent's seat needs no grant in this slice. It proposes, and its person accepts under their own grant.

*Holds.* A grant to a seat is "presence given ahead of time" and can come when someone wants it.

**The team's root is lost, or taken.** Lost: the store's definitions are frozen as they stand, and its records go on. Taken: whoever has it defines the store.

*Breaks, as every root does.* The answers are the ones the trust walk gave for a person: keep it where it is seldom used, and if it is gone, a new store that takes the old records as history.

**Several stores.** One team lineage can anchor many stores. A grant is held in the store it applies to, so that each store can be judged from what it holds.

*Holds, with copying.* A person granted in six stores has six grants. Tooling can write them together.

**Before any of it is built.** In the trial of part two, the list is a reviewed file and whoever can merge to that branch is the steward in practice. Nothing here is needed for it.

*Holds, and the step up is small:* the same review, with a signature at the end of it.

## 16. Draft entries for stewardship

### SW1: one mechanism for every definition

**Leaning.** Yes. A closed set of definition kinds; the steward alone counts for them; anyone else's change is a proposal. The description of kinds, the grants and the anchor are all read by it.

**Changes:** what admission reads first. It is the trust walk's ladder with the rungs named.

### SW2: how the team's root is used

| | The root | Cost |
| --- | --- | --- |
| A | In the organisation's vault, taken out by a person for each change. | Every joiner, leaver and change of description waits for that person. |
| **B (leaning)** | Held by a signer that writes a definition record when a reviewed change merges. | The signer and the review are the boundary for definitions. A compromised signer defines the store. |

**Changes:** nothing in bytes. It is custody, which Kyle called the application's business on 2026-11-10.

### SW3: where a grant's scope is written

| | Scope | Cost |
| --- | --- | --- |
| **A (leaning)** | A set of kinds, as `kind:` mentions in the grant's envelope. Run above. | No finer scope. A kind becomes a thing with a reserved prefix. |
| B | In the payload, in spec vocabulary. | A reader without the payload cannot judge, so admission answers three ways. |

**Changes:** what a grant's envelope holds. Permanent for each grant written.

### SW4: who may grant

| | Granting | Cost |
| --- | --- | --- |
| **A (leaning, first)** | The team's root only. A grant carries the right to accept proposals for its kinds, and no right to grant. | See SW2: every grant needs the root. |
| B | A grant may carry the right to grant within its own scope. | Chains of grants, each narrower, each to be checked. |

**Changes:** B adds a rule to admission. A adds none.

**After part four.** A second steward is exactly B: a grant of the definition kinds that carries the right to grant. So B is needed as soon as a store has a second steward, and not before.

### SW5: ending a grant

| | A leaver | Cost |
| --- | --- | --- |
| A | Keeps counting until retiring is built. The host takes away their right to deliver. | The host is the boundary again, for this one case. |
| **B (leaning, before a team store is kept)** | The steward writes an end of grant with a tick that covers what stands. | A law of the model changes: holding more can now silence a writer, after a cut. |

**Changes:** B changes what a reader counts.

# Part four: two stewards

*Part five breaks steps in this part: see [section 19](#19-what-broke-and-what-replaces-it), items 2, 8 and 9.*

**Added on 2026-11-24, after part three.** Kyle: "I suppose the two stewards case needs to be tackled. A lineage on the store is always going to start with one - so a second has to be added, then."

That second sentence is most of the answer. The walk follows it.

## 17. Two stewards, walked

**A second steward is added.** The store starts with the lineage its anchor names. Anyone else who is to change definitions gets that from someone who already can. Since a steward is whoever counts for the definition kinds (SW1), adding one is a grant of those kinds, with the right to grant.

*Holds, and it needs nothing new.* "Steward" is not a second kind of standing. It is a grant with a wide scope. Everyone's standing in a store is then a chain of grants that starts at the anchor.

**Who may end whom.** Every grant has a granter, so the grants form a tree with the founder at its root. A grant is ended by its granter, or by anyone above the granter in that tree.

*Holds, and it is why two stewards cannot remove each other.* The second steward holds a grant from the first, or from someone the first granted. The first holds no grant from the second. So removal runs one way, down the tree, and there is no pair in which each may end the other. This is the one place the walk needs an order among writers, and the order is not a rank anyone assigns: it is who granted whom.

**The founder.** The founder holds no grant. Nothing ends the founder's standing, because the anchor is the store.

*Holds as the limit it is.* A store whose founder is lost or wrong is answered by a new store that takes the old records as history. For a team, the founder is the team's lineage, which is meant to outlast its people.

**Two founders.** A store between two teams as equals has an anchor that names both. Neither granted the other.

*Holds, by giving something up.* Equals cannot expel each other. They can disagree, visibly, and they can part: each makes a new store. What is left open is whether one founder may end a grant the other made ([SW6](#sw6-a-second-steward)).

**Both act at once, adding.** One grants a junior `note`. The other grants a different junior `note`. Neither has seen the other's record.

*Holds.* Each grant is its own thing. Run in two stores and read together in a third:

```
KIND        RECORDS
grant       2
grant-end   1
```

Two grants and one end, held side by side, in whatever order they arrived.

**Both act at once, one ending.** The first ends a grant. The second, not having seen that, does nothing to it, because an end cannot be undone: giving the standing back is a new grant with a new id.

*Holds.* Grants only grow and ends only grow. Who counts is what has been granted and not ended, and that is the same for every reader who holds the same records. There is no fork to settle in who counts.

**The first ends the second's grant while the second is acting.** The second has just granted a third person, and the first has not seen that.

*Holds, by the cover.* The end carries a tick that covers what stands. The grant to the third person is outside it and does not count, nor does anything that person wrote under it. If the first had seen that grant, it stands, and the first can end it too, being above it.

**Both change one description apart.** Both set `headline` on the `note` kind, to different fields. Run:

```
$ loops of kind:note --plain
thing  kind:note
records  3
heads  2
  headline  conflict (2): text | title
  key  name
```

*Holds as an ordinary conflict, and that is the only kind of fork two stewards can make.* The key they did not both touch is unharmed. What a reader does with the field in conflict is the choice: the design leans to the newer of the two by content order, with the fork shown. The stricter answer is that a field in conflict is not in effect until one of them settles it ([SW7](#sw7-a-definition-two-stewards-changed-apart)).

**What a reader needs to judge all this.** Who granted whom and for which kinds is in envelopes. The cover of an end is a tick's list of ids, and that list is in a payload.

*Open.* A reader without that payload cannot say which of a leaver's records stand. Either an end's cover is never withheld or erased, which is the second rule the trust walk hoped to avoid, or admission answers "unknown" for those records. The trust walk left this to be unpacked, and it still is.

## 18. Draft entries for two stewards

### SW6: a second steward

**Leaning.** A second steward is a grant of the definition kinds, with the right to grant. A grant is ended by its granter or by anyone above the granter. A founder's standing is never ended.

**Left open inside it.** With two founders, may one end a grant the other made?

| | Between founders | Cost |
| --- | --- | --- |
| **A (leaning)** | Yes. Founders are equals over the whole store. | Two founders who disagree can grant and end in turn. It is visible, and the remedy is to part. |
| B | No. Each ends only what is under their own grants. | One founder cannot remove the other's bad choice, only leave. |

**Changes:** what admission reads of a grant. With one founder, which is where a team starts, the open part does not arise.

### SW7: a definition two stewards changed apart

| | The field in conflict | Cost |
| --- | --- | --- |
| A | The newer by content order is in effect, and the fork is shown. The design's leaning. | A change takes effect that one steward has not seen, on the strength of a time its writer states. |
| **B (leaning)** | Not in effect until one of them settles it. `describe` shows both. | Until then the CLI behaves as if the field were not declared. |

**Changes:** what the shorthand and the plain views do during a fork. B follows the principle Kyle gave for BP1: what was entered is taken as entered, and nothing is chosen for the writers.

# Part five: what the council broke

**Added on 2026-11-24, the same night.** At Kyle's word the walk was put to margins, Neon and Astra in a room, `#identity-and-standing`, with one request: say where it is wrong. All three answered. What could be run was run again here on main (`c483cb9`) before it was accepted.

## 19. What broke, and what replaces it

**1. Leaving a record out before the heads (sections 9 and 11, SL2, SL3). Found by margins.** Part two said a record that does not count is left out of the state, and that a lead accepts a proposal by restating it. The two do not go together. `emit` anchors a write on the heads, so the lead's restatement names the junior's proposal and not the canonical record the proposal had replaced. Leave the proposal out and that chain is cut. The lead wrote `monthly` and then `weekly`, the junior wrote `daily`, and the lead wrote once more. Each store was then read without the junior's record:

| The lead's last write | Everything held | The junior's record left out |
| --- | --- | --- |
| `chosen=daily` | `chosen daily` | `heads 2`, `chosen conflict (2): daily \| weekly` |
| `chosen=weekly` | `chosen weekly` | `heads 2`, `chosen conflict (2): weekly \| weekly` |
| `note=kiln-two` | `chosen daily`, `note kiln-two` | `heads 2`, `chosen weekly`, `note kiln-two` |

Section 9's third row did not show this, because there the canonical value was the thing's first record, which every later write names.

*Replaced by:* a record that does not count stays in the order of what is above what, and sets nothing, its envelope included. Heads and live setters come from the records that count. The canonical value then stands until a record that counts is above it and sets that key. It asks nothing of writers, and it is the reading for a record whose key does not speak for its observer as well, so SL2 and ID4 have one answer.

**2. A tree of grants over lineages (section 17, SW6). Found by margins.** Nothing stops a steward from granting its own granter. The founder grants A, A grants B, and B grants A. Each of A and B is now above the other, the founder's end of A's grant does nothing, and if A and B end each other at once there are two consistent readings and no rule between them. Who counts was defined in terms of itself.

*Replaced by:* the tree is over grant records. Every grant and every end names, in `under`, the grant it acts under, down to the store's anchor. A record's id covers its envelope, so `under` cannot form a cycle. An end takes with it the grants made under the ended grant, from then on. A record stands only if every end that counts covers it.

*A consequence for a team:* ending a lead's grant ends the standing of everyone that lead granted. People are better granted by the team's lineage directly, and a right to grant kept rare.

**3. A grant that names no store (section 15, SW3). Found by Neon.** One team lineage anchors a sandbox and a production store. A grant made in the sandbox is a valid line when copied into production, and "anybody can emit" lets anyone copy it. The same holds for an ordinary record by someone granted in both.

*Replaced by:* the `under` chain of item 2 ends at one store's anchor, and an ordinary record names its grant in `under`. This reverses section 15's "no record has to cite its grant". It changes the bytes of every record written in a store that has standing.

**4. One ref per writer, with no history (section 10, SL6). Found by Neon, run again here.** One key wrote from two clones. The second clone's push was refused without force, and with force the hub's ref held one segment, the first clone's gone. "No race on push and never anything to merge" is false once one key writes from two places, which two checkouts on one laptop already are.

*Replaced by, as a leaning:* an outbox for each place that writes, with ordinary history, so a push adds to what is there. Readers take the union and drop duplicates by a segment's hash. It also gives imported lines and copied anchors a place to go. A forced push is kept for an erasure, which then has to reach every outbox that holds the segment. That last part is open.

**5. "Only a writer writes under their own prefix" (section 10). Found by Neon.** A steward who erases a leaver's payload has to rewrite a segment the leaver wrote.

*Replaced by:* the writer and the store's stewards.

**6. A kind as a thing, across stores (section 15). Found by Neon.** Two stores that each describe `kind:note` conflict when read together, on equal values too. And a steward's description copied from one of its stores into another arrives as a valid second head there.

*Replaced by:* a definition is bound to its store by `under` like everything else. A read of several stores judges each record by its own store's standing. Whether a definition is ever read through a union is open.

**7. A right to grant, written as a mention (SW3, SW4). Found by Neon.** `kind:grant` among a grant's mentions cannot say which kinds may be granted onward.

*Replaced by:* the right to grant is a record kind of its own, with the kinds it may pass on as its mentions.

**8. The cover of an end, withheld (section 17). Answered by margins.** The model proves that a withheld or erased payload never changes who speaks. An end whose cover is in a payload would break that.

*Replaced by, as the leading answer:* a cover that is closed in what exists is fixed by its topmost ids, and an end carries those ids as mentions in its envelope. Item 18 says what "closed in what exists" takes. The cost is an envelope about as wide as the number of things the leaver wrote in.

**9. What a tick covers (ID4). Found by margins.** Anchors, bindings and grants are not enough. A cover also needs every held end that applies to them, or a tick records an answer in which a leaver still counts.

**10. The trial's list as a reviewed file (section 12, SL4). Found by Neon.** A tick covers record ids in the store. It cannot cover a file outside it, so a result computed with such a list could not be checked on a second machine.

*Replaced by:* grants are records from the first day, and the spec names the steward: a key in the trial, the store's anchor afterwards. Nothing is built for the trial that is thrown away.

*Still argued.* Neon would run the trial on anchors declared disposable, since one person with two machines and a seat is three observers on bare keys, and stratum 1 is already modelled. The cost is that ID4 has to be ruled and built first. This is Kyle's to choose.

**11. A short `sl:` value (section 5, ID8). Found by Neon.** `owner=sl:7f3a` is a typed reference, so today the shorthand signs it as written and it matches nothing afterwards.

*Replaced by:* a reference field that takes `sl` stops on a value that is not a whole lineage id.

**12. Names (ID8). Argued by Neon.** A name for a seat, signed by a person the reader has pinned, needs no steward. It joins the first step.

**13. A tick as a person's word (ID2, option B).** Withdrawn. Restating by someone with standing is that word.

**14. `emit grant` beside a description (section 15). Found by Neon.** ST1 stops it, since the description does not name the kind. The example in section 15 ran in a store with no description. Standing kinds get their own verbs, or go through `emit -`.

**15. Restating a proposal that clears a field (section 11, SL3). Found by Astra, run again here.** The lead had `chosen=weekly` and `day=warm`. The junior's proposal set `chosen=daily` and cleared `day`. With the proposal setting nothing:

| The lead restates | The canon reads |
| --- | --- |
| `chosen=daily` | `chosen daily`, `day warm` |
| `chosen=daily`, and the unset of `day` | `chosen daily`, `day —` |

*Replaced by:* accepting restates the proposal's `sets` exactly, cleared keys included. That is a verb's work and not a person's. Two proposals stacked on one thing would need their combined edit restated, where an affirm stance makes each count where it is. So the affirm stance is worth more, and sooner, than SL3 had it.

**16. Two paths to one writer (section 17, SW6). Found by Astra.** Two stewards each grant the potter the same kind. If the potter then grants someone, which steward is above that grant?

*Replaced by:* with the tree over grant records, a grant names the one grant it acts under, and a record the one grant it counts by. A second valid path does not sustain either. When the cited grant ends, the writer cites the other from then on.

**17. A proposal from someone with no grant (SL2). Found by Astra.** With every counted record bound to a store by `under`, a proposal from a writer who has no grant names no store at all. A potter proposes a new kiln for the yard: nothing says it is for the yard.

*Replaced by:* every record in a store with standing names something in `under`: its grant, or the store's anchor itself when it has none. A record under the anchor from anyone but a founder is a proposal addressed to that store. It confers nothing.

**18. A cover by its topmost ids needs a closed cut (item 8). Found and run by Astra.** Two stores held the same topmost record. One also held its parent and one did not. A tick over that record reported `closure: yes` in the first and `closure: no` in the second, with the same topmost id.

*Replaced by:* the verb that writes an end refuses to sign unless its tick checks `closure: yes`. A reader that is missing an envelope in between cannot show that a leaver's record lies under a topmost id, so that record does not count yet: it is shown as proposed, and counts once the envelope arrives. Admission keeps two answers, and no third is added. The error is on one side only: nothing is counted that should not be, and it mends as a late binding does. So a withheld payload is fine, and a missing envelope is late (margins).

**19. "A new store that takes the old records as history" (sections 15 and 17). Found by margins.** The walk gave this as the remedy for a root that is lost or taken, and for founders who part. Under the chain, every old record ends at the old anchor, so none of them counts in the new store.

*Replaced by:* a store that continues another names the old anchor and a tick in its own anchor. Records chained to the old anchor count inside that tick's cover. For a root that was taken, the cover can stop before the theft.

**20. What admission checks of `under` (item 3). Stated by margins.** Today nothing about an `under` target is checked beyond its being held when written. The clause checks four things: a record's observer is the one its grant names; the record's kind is one of that grant's kinds; a grant's observer is the one named by the grant above it; and that grant carries the right to grant what is granted. A grant names exactly one grantee, or counts for nobody.

**21. What an end holds (items 2 and 8). Proposed by margins.** An end has three things to say: the grant it ends, the right it ends it by, and what stands. A grant is a root, so an end can be `of` it. Its right is in `under`, and its mentions hold only the cover.

**Found to hold, by margins, run on main:** a tick already follows `under`, so its cover takes in a record's grants and its store's anchor with nothing built. And an `under` whose target is not held is refused only at the write, so outboxes can be read in any order.

## 20. What stands, and what goes to Kyle now

**Unbroken so far:** "more standing" as being counted for more kinds and not as a rank (SL1); standing as a clause of admission; the team's lineage as the founder; removal running one way, now over grant records; grants and ends that only grow.

**The entries that would go to Kyle, as they now read:**

| Entry | Now |
| --- | --- |
| SL1 | Unchanged. |
| SL2 with ID4 | A record that does not count stays in the order and sets nothing. It is shown as proposed and counted beside the result. |
| A new one | In a store with standing, every record names in `under` its grant, or the store's anchor when it has none; every grant names the grant above it, down to the anchor. Admission checks the four things in item 20. |
| ID1 | Unchanged. |
| SW3 | A grant's mentions are the one granted and the kinds. Its store comes from `under`. A right to grant is a separate kind. |
| SW5 | An end is of the grant it ends. It carries the topmost ids of a closed cut of what stands, and takes the grants beneath it. |
| Another new one | A store that continues another names the old anchor and a tick in its own anchor. |
| SW6 | A second steward holds a right to grant. The tree is over grant records. |
| SL3 | Accepting is a verb that restates the proposal's `sets` exactly. The affirm stance comes sooner. |

## 21. An order, if the leanings hold

1. **SL1 and SL2 put to Kyle**, with ID4 and `under` on every record, since they decide what a fold answers and what a record holds. As they read in section 20.
2. **The trial slice**, on stores declared disposable: admission by grants in the model, vectors and Rust, with the steward named by the spec; delivery by an outbox per place; reads that show canon and proposals. On keys as they are, or on disposable anchors, as Kyle chooses (section 19, item 10).
3. **ID1, ID6, SW1 and SW3 put to Kyle.** Then anchors and bindings, a lineage for the team, the store's anchor, and grants as records in place of the file.
4. **SW5, an end of grant,** before the first team store that is kept.
5. **A second steward, when a store wants one:** SW6 and SW7, and the right to grant.
6. **Afterwards:** the affirm stance, grants with `under`, strict.

## 22. What this walk did not do

- It did not test a git host. What a host does with refs outside branches and tags, and who may move them, is argued and not run.
- It did not walk a scope finer than a set of kinds, or who may erase.
- It did not settle whether one founder may end another's grant (SW6), how an erasure reaches every outbox, or whether a definition is ever read through a union of stores.
- It did not walk a company above its teams: who makes a team's lineage, and what a team is called outside itself.
- It rests on one workbench and on a description of one team.
- It takes the two tiers as settled. One question it passed by: the lineage id is the hash of the anchor and not of the root key. That allows a root more than one lineage, which ID1 leans on, and costs the trap in ID6.
