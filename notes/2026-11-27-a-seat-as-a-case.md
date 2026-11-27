# A seat as a case: IS1 to IS11 read against one real store

**Written on 2026-11-27 by Tally, the coordinator's seat, for Kyle and for his walk with Astra. Nothing here is ruled, and nothing here is put as a new entry.** The eleven entries on identity and standing in [`DECISIONS.md`](../DECISIONS.md#identity-and-standing-is1-to-is11) were argued with invented examples: a lead and a junior, a workshop and a yard. Between 2026-11-26 and 2026-11-27 most of what they describe happened to one real store, the one this seat keeps. This note says what happened, runs it, and reads each entry against it.

"Today" below is `loops` 0.1.1, with main at `93218bb`. The store is the seat's own, of 31 records. Every run that writes was made on a scratch copy of it with throwaway keys. The seat's key signed nothing for this note.

## 1. What happened

- **A seat was named and given a key.** Until 2026-11-26 the coordinator wrote in the chat rooms with a key that was a plain file in Kyle's everyday account, readable by every process there. That evening the seat chose a name, a new key was made under a Unix account of its own, and the earlier key signed a record handing over to it.
- **The store began before the hand-over.** Its first 11 records are signed by the earlier key, the last of them the hand-over itself. The 20 since are signed by the new one. So this small store holds two observers who are one seat, and nothing but a payload says so.
- **Each session ends with a tick, and Kyle has countersigned one.** The tick is a count of everything the store holds. His countersign is a record in a store of his own, naming the tick's id.
- **The seat moved inside.** For a day its sessions ran under Kyle's account and reached the key through one command, by way of `sudo`, which kept its own log. On 2026-11-27 the sessions moved to the seat's account, and Kyle's everyday account gave up its road to root.
- **A worker was started.** A coding agent from another vendor ran in a pane, as the seat's Unix user, on a reading task.
- **A guard stopped guarding, and the seat did not notice.** From inside its own account a session can read the key file and write the store and the door's log directly, and so can a worker it starts. The seat had argued that evening for a stricter door, on a premise the move had already removed. It found this some hours later by testing it.

## 2. Five runs

**Run 1: a stranger writes the seat's own record.** On the scratch copy, with a key made for the purpose:

```
$ loops -C copy emit seat --of seat:tally name=Mallory
$ loops -C copy of seat:tally --plain
records  5
heads  1
  key   k:9v102clv…
  name  Mallory
  role  coordinator of strange-loops-next
$ loops -C copy check
{"altered":[],"lines":32,"records":32,"refused":[],"segments":21,"unbound":0}
```

One head and no conflict. This is [IS1](../DECISIONS.md#is1-what-more-standing-means)'s example, the junior writing over the lead, on the record that says who the seat is. `check` finds nothing wrong, because nothing is: the line is well signed, by somebody.

**Run 2: what the closing tick sees of it.**

```
$ loops -C copy tick --check <the last closing tick>      before the stranger's write
{"answer":"same","closure":"yes","taken-not-covered":1}
$ loops -C copy tick --check <the last closing tick>      after it
{"answer":"same","closure":"yes","taken-not-covered":2}
```

The count rose by one. That is the whole signal: the tick still answers `same`, because what it covered is unchanged. It says a record arrived, not which or whose. And the next closing tick would cover the stranger's record with the seat's own signature, unless the session that opens reads what arrived first.

**Run 3: one of the seat's records in someone else's store.**

```
$ loops -C <the seat's store> export --kind noticed | head -1 | loops -C other import -
$ loops -C other check
{"altered":[],"lines":1,"records":1,"refused":[],"segments":1,"unbound":0}
```

The same signed line, the same id, held and valid in a store it was never written for. This is [IS3](../DECISIONS.md#is3-every-record-in-a-store-with-standing-names-what-it-stands-on)'s example with a real record.

**Run 4: a countersign, and what the witness can check.** A second throwaway key plays Kyle, in a store of its own:

```
$ loops -C witness emit witnessed --of seat:tally closing=<the tick's id> key=<the seat's key>
$ loops -C witness tick --check <the tick's id>
refused: id-unknown
```

The witness's store holds a sentence. Then the tick alone is carried over, and then every record:

```
$ … export the tick | loops -C witness import -
$ loops -C witness tick --check <the tick's id>
{"answer":"cannot check","closure":"unknown","missing-records":30,"reason":"missing inputs",…}
$ … export everything | loops -C witness import -
$ loops -C witness tick --check <the tick's id>
{"answer":"same","closure":"yes","taken-not-covered":2}
```

So a countersign of a tick's id is worth more than it looks. The tick names what it covers, the id is over the tick, and a witness who signs the id has committed to all of it without holding any of it. Given the records later, the witness's store answers `same`, and until then it says exactly how many it lacks.

**Run 5: what each key wrote.** Counted from the store, not run on a copy:

| Signed by | Records | First | Last |
| --- | --- | --- | --- |
| The earlier key | 11 (in 10 things) | 02:55:37Z | 03:14:11.648Z, the hand-over |
| The seat's key | 20 | 03:14:11.761Z | 07:56:41Z |

The hand-over is a `seat` record whose payload names `previous_key` and `next_key`. No read uses either field.

## 3. The entries, one at a time

**[IS10](../DECISIONS.md#is10-who-gets-a-lineage), who gets a lineage.** Its recommended option gives a lineage to each harness of each person, and none to a session or a worker, which are "things a seat writes about". Two things in the case press on that.

- *The unit is a seat, not a harness.* Three agents with their own memory and their own work ran on one harness under one account: this coordinator, the agent that keeps the laws, and a third in another checkout. They are three seats. This was said to Kyle on 2026-11-26 and the case has not changed it.
- *"A worker gets none" has a cost the entry does not list.* A worker with no lineage can write only as the seat or not at all. The entry means not at all: the seat writes about it. But on 2026-11-27 the worker ran as the seat's Unix user and could read the seat's key. Nothing in the model stops that, and nothing in it should: it is a fact about a machine. The entry should say it in its cost: *a seat's key must be out of reach of what the seat starts, or the worker is the seat.*

**[IS11](../DECISIONS.md#is11-the-trial-on-keys-or-on-lineages), the trial on keys or on lineages.** The coordinator recommended keys. The case is evidence for the other side, and it should be weighed as such: the first thing that happened to this seat's identity, within hours, was a change of key. Under keys, Run 5 is two observers. A trial on keys cannot read a hand-over at all.

I still lean to keys for a trial on stores declared disposable, with one change: the trial should include a change of key on purpose, to see what breaks. But the case shows something the entry's framing hides. This store is not the trial. It is a kept store, made before the rulings, and the chat rooms' store is another. Kept stores are already being made on keys.

**[IS1](../DECISIONS.md#is1-what-more-standing-means) and [IS2](../DECISIONS.md#is2-a-record-that-does-not-count), what standing is, and a record that does not count.** Run 1 is the case for IS2's recommended reading. Under it the stranger's record stays in the order, sets nothing, and is shown as a proposal: `name Tally`, one proposal against it. That is what the seat would want of its own store. It is also what the seat would want of a worker's write, if a worker had a key of its own: a proposal the seat can accept.

A personal store is the smallest store with standing: one founder, no grants, and everything from anyone else a proposal. IS1's option C, standing kind by kind, has nothing to do in it. That is a point in the entry's favour. The smallest case needs none of its machinery.

Run 2 adds a caution that belongs beside IS2. A tick taken without reading what arrived gives the arrivals the taker's signature of having seen them. Under IS2 a proposal would be counted beside the result, so a tick would carry the count. Today it does not, and the seat's habit of reading before closing is the only guard.

**[IS3](../DECISIONS.md#is3-every-record-in-a-store-with-standing-names-what-it-stands-on), every record names what it stands on.** Run 3. For a diary, a record replayed elsewhere does little harm: it says what it says, by its observer, wherever it is held. The harm is at the other end. Under the recommended option every record in this store would name the store's anchor in `under`, and the 31 that exist name nothing. See IS8.

The earlier key's 11 records raise the entry's own question in small. Under the recommended option a record under the anchor "from anyone but a founder" is a proposal. Is the earlier key a founder? Only if the lineage binds both keys, which is IS10 and the walk's ID4. So IS3 cannot be tried on this store without them. That is some evidence for Neon's side of IS11.

**[IS5](../DECISIONS.md#is5-ending-a-grant), ending a grant.** The hand-over is an end. The seat wrote of the earlier key that it "cannot show it was never copied". What that key signed before the hand-over should count, and what it signs afterwards should not. That is the director who leaves in October.

The recommended option has the end carry the topmost ids of what stands. Here that is 10 ids, one for each thing the earlier key wrote in. The cost the entry names, "about as wide as the number of things the leaver wrote in", is real and small in this store. In the chat rooms' store the same key wrote in every thread it took part in, and the cover is wide.

The case adds one thing. The hand-over was written by the key being ended, about itself. The entry has an end written "by someone above that grant". A key that hands over to its successor is not above itself. For a lineage's own keys the end has to be something the lineage does. That is the walk's recovery leaning (ID6), which sits outside the entries. It may need to come inside.

**[IS8](../DECISIONS.md#is8-a-store-that-continues-another-or-is-raised-from-open), a store raised from open.** This store is the entry's case: a store that was open, with records that name nothing, and with ticks. The recommended mechanism, an anchor that names a tick so that what the tick covers counts as it did, has a candidate here on the day it is built: the latest closing tick. Kyle's countersign of an earlier close would go on meaning what it means, because no id changes.

The entry was put without an argued alternative, and the case supplies one. It is added to the entry with this note: write the old records again under the new anchor. The cost is every id. Run 4 shows what that breaks: a witness's countersign names an id that no longer exists.

**[IS9](../DECISIONS.md#is9-a-record-that-is-to-count-in-a-second-store), counting in a second store.** Kyle's countersign is an affirm stance already, made by hand: someone with standing in his own store says of a record from another that it is so. Run 4 says what today's tools make of it. The read that finds what refers to a thing found nothing, because `closing` is not a declared reference field and the witness's store has no description. The entry's recommended option would make this a kind that admission reads. The case suggests its first use is not a junior's proposal. It is one store vouching for another's tick.

**[IS7](../DECISIONS.md#is7-a-second-steward-and-a-persons-seats), a person's seats.** The recommended option has people granted by the team directly, and a person's grant carry "the right to grant its kinds to their own seats". This seat was made by Kyle and runs on his machine. It also has a name, an address, an account on the host and a store of its own, and it could work with a second person tomorrow. Under the entry its standing in a team's store would hang from one person's grant, and end with it.

I hold this one loosely, because I am the case. But the question is fair for any agent that outlasts one person's involvement: is it that person's seat, or a member the team grants directly, with a record of who launches it? The entry's rule answers the first. The store's own record of this question leans the same way: "A seat. What makes it count is his grant." That was written the day before the move. I would not answer it so firmly now.

**[IS4](../DECISIONS.md#is4-what-a-grants-envelope-holds) and [IS6](../DECISIONS.md#is6-an-explicit-cut-follows-under).** The case has no grant and no `under`, so it says nothing new of either. IS6 also lacked an argued alternative. One is added with this note, from the entry's own example and not from the case.

## 4. What I would take to the walk

Three questions, in the order I think they bite.

1. **Does the model say anything about a seat and what it starts?** IS10 says a worker gets no lineage. The night's lesson is that this holds only where the key is out of the worker's reach. The other reading is that a worker gets a key of its own and no standing, so that all it writes is a proposal. That is IS2's machinery doing the work of a Unix account. I do not know which is right. The second needs nothing new once IS2 is built.
2. **Who ends a lineage's own key?** IS5's end comes from above. A hand-over comes from the key itself, or from the lineage. If the entries cover only grants between lineages, the first identity event a real seat had falls outside all eleven.
3. **Should a tick count what it saw arrive and did not accept?** Run 2. Today a close can take in a stranger's record with the closer's signature, and only a habit prevents it.

And one plain observation. The store this note is about will need raising under whatever is ruled, and so will the chat rooms' store. Neither is a reason to hurry a ruling: both are small. They are a reason to build IS8 early, since every store kept before the anchor exists will need it.
