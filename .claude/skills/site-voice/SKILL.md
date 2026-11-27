---
name: site-voice
description: The voice and look of strangeloops.dev. Use when writing or changing anything a reader of the site sees - a heading, an introduction, a noun's or verb's entry in the grammar, a decision's summary, a label, a figure caption - or when adding a section or component to the front page under design/front. Covers how the prose reads, what must not be simplified away, and the visual rules the page keeps.
---

# The voice and look of the site

The front page of strangeloops.dev was designed in one pass, with Kyle, and tested on readers who do not know the project. They found it easy to read. This file says what that pass did, so later changes stay in step with it. It was drawn from the page itself by comparing its wording with the repository's earlier wording, pair by pair.

## 1. Where the words live

The page is built from the repository. Nothing a reader sees is typed into the page.

- Before changing a sentence, find its source: `DECISIONS.md`, `CHANGELOG.md`, `GUIDE.md` (the guide view is built from it; `<!-- guide:... -->` comments mark its interactive pieces), `design/laws/laws.json`, `design/front/grammar.json`, `design/front/walk.json`, or another file under `design/front/`. Change it there and build.
- **A law's sentence is never written by hand.** It is composed from the law's parts (`change`, `stays`, and the rest) by its shape's template. To change how laws read, change a template, and expect every law of that shape to change.
- **A decision entry that waits on a ruling was reviewed as it was put.** Reword its question, options or costs only with a review that it still asks the same thing. The page may add a short plain summary beside an entry; it may not replace the entry's words.
- A count in a heading ("Thirteen nouns", "Forty-six rulings") is worked out from the data. Never type one.

## 2. The voice

Write for a capable reader who has never seen the project and is reading on a phone. Each rule below has a pair from the page: the earlier wording, then what replaced it.

**One idea to a sentence.** Where a colon or a semicolon joins two claims, write two sentences.

> Hold records, and nothing else: it owns no meaning.
> **Holds records, and nothing else. It owns no meaning.**

> Nothing a record says is true; it is said, by its observer.
> **Nothing a record says is true. It is said, by its observer.**

**Plain verbs and everyday words.** Prefer the word a person would say aloud.

| Earlier | On the page |
| --- | --- |
| append it to a store | add it to a store |
| a value anyone can recompute | a value anyone can work out again |
| written canonically | written one canonical way |
| the id doesn't move | the id stays |

**Say what happens, not what it is called.** Unpack a term of art into the event it names. Keep the term where the page defines it, and nowhere before.

> Within a thing, an unreplaced revision is a head. Concurrent revisions form a fork.
> **Inside a thing, a record that nothing replaces is a head. Two records that replace the same one make a fork.**

**A definition says what the thing is or does, in the third person.** Not an instruction to it.

> Say who saw it. → **Says who saw it.**
> Write a standing question as data anyone can check. → **A standing question, written as data anyone can check.**

**A heading is a whole sentence that makes the section's point.** A reader who reads only the headings should get the argument.

- "A record is one sentence, signed."
- "Each layer is as high as it is temporary."
- "Two verbs write, seven read, three work on text, and one refuses."

**A question is asked as a question.** A decision's heading is the question a person would ask, and each option answers it in the same grammatical form, so the options can be compared at a glance.

> IS4: what a grant's envelope holds → **Where is a grant's scope written?**
> A: **In its mentions:** exactly one grantee and the kinds. B: **In the payload,** in spec vocabulary.

**Point at something the reader has already seen.** An example names a card, a person or a thing from the walk on the same page: "Kim's copy, which holds E without its payload." Do not invent a second example where the walk has one.

**An introduction says what the section is for and what to do in it.** Two or three sentences, the last often an invitation: "Pick a layer, then throw it away."

**Small things.**
- Contractions are fine where speech would use them: can't, doesn't, couldn't.
- Numbers under a hundred are words in running prose and digits in tables and counts shown as data.
- Labels are sentence case. No words in capitals for emphasis.
- No italics in headings. Italic is for a title or a word being named.
- Code font is for what a reader could type or would see in output: a verb, a field, an id, a kind. Not for emphasis.
- People in examples have first names (Rosa, Ben, Kim, Wren, Alice) and things have real keys (`recipe:chili`, `kiln:east`).

## 3. What must survive the simplifying

The pass that made the page readable also dropped a few conditions that the sentence needed. A plainer sentence is only better if it is still true.

- **Keep the premise.** If a claim holds only under a condition, the condition stays, in plain words. "A store is a set. Read its places in any order and you keep the same records" lost "when forms agree", and without it the sentence promises more than the law does.
- **Keep the scope.** "Gives each subject its own state" is true within one fixed set of admitted records. If the narrower claim is the proved one, say it, or put the limit in the entry's detail.
- **Keep exact names.** A verb, a field, a refusal code or a law's name is never paraphrased.
- **Keep the status honest.** A status word says only what its key says. Do not show something as built, proved or ruled unless the repository says so today; the page's status of a thing is generated from the sources, not written.
- **Say what was not checked.** Where a page shows a run, it is a run that was made. Where something is proposed and not run, it says so.

When a reworded claim touches a law, read the law's sentence and its premises beside the new wording before keeping it.

## 4. The look

The stylesheet, `design/front/styles.css`, is the reference. Use its custom properties and its existing classes; do not add a colour, a font size or a shadow that it does not already have.

- **Three typefaces, three jobs.** The serif (Newsreader) carries statements: headings, introductions, a noun's purpose, a decision's question. The sans (Inter) carries explanation, labels and controls. The mono (JetBrains Mono) carries code, ids and counts. They are served with the page (`design/front/fonts/`); the page asks nothing of another host.
- **Ink on paper, and one alert colour.** `--ink` on `--ground` and `--sheet`, with `--muted` and `--faint` for less. `--alert` means erased, refused, a fork or a conflict, and nothing else. No other hue.
- **Light and dark both.** Every colour comes from a custom property that has both values.
- **One sheet deep.** Content sits on a white sheet with a hairline and a short shadow. No box inside a box: rows inside a sheet are split by hairlines, and a group of sheets lies on a grey tray.
- **Lines of 65 to 75 characters** for running text. Tables sit inset in their sheet.
- **A status is a mark and a word,** from the `status` key of `design/front/grammar.json`, shown the same way everywhere: proved, designed (decided in the design, not built, and not a ruling) and open. "Ruled" means an entry in the decisions log and nothing else. A dashed edge means not yet.
- **Motion explains.** A figure moves to show a step of the model, and holds still under `prefers-reduced-motion`.
- **Works at phone width.** A figure that cannot shrink gets a plain list in its place, as the decisions map does.

## 5. Before the change is done

1. The words are in a source file, and `node design/build.mjs` regenerates the page with no other difference.
2. Each new sentence was read aloud, and the heading alone makes the section's point.
3. Any claim that was simplified still holds, with its premise.
4. The page was looked at in light and dark, and at phone width.
5. `node design/build.mjs` succeeds (it checks every link, including links to places the page's script creates), and `node design/mutants.mjs` and `node --test design/decisions/*.test.mjs design/front/*.test.mjs` pass. The pages under `out/` are not committed.
