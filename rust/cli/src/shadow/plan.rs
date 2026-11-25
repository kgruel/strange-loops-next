//! Preflight the entire group using compact recipes pointing into frozen exports.
//! Payloads and signed lines are materialized one bounded changeset at a time.
pub(super) mod roots;
use super::{
    Input, Point, Runtime, digest, event,
    id_map::IdMap,
    journal::{Journal, Seed},
    mapping::{self, Fate, History, Unnamed},
    mismatch, refs,
    report::{Counts, Report},
    source::{self, Fact},
};
use crate::{Fail, prepare_changeset, refused, text, unclean};
use loops::{base32, batch, json::Json};
use loops_place::{
    dir::Held,
    key::Key,
    line::{Line, hash},
};
use std::{
    collections::{HashMap, HashSet},
    fs::File,
    io::{BufReader, Read, Seek, SeekFrom},
    ops::Range,
};

const MAX_ROWS: usize = 1000;
const MAX_BYTES: usize = 4 * 1024 * 1024;

fn fingerprint(f: &Fact, parsed: Result<Json, loops_eval::Error>) -> String {
    let payload = match parsed {
        Ok(j) if j.keys_distinct() && j.in_range() => Json::Arr(vec![text("json"), j]),
        _ => Json::Arr(vec![text("raw"), text(&f.payload)]),
    };
    digest(
        Json::Arr(vec![
            text(&f.kind),
            text(f.ts_bits.to_string()),
            text(&f.observer),
            text(&f.origin),
            f.signature.as_ref().map_or(Json::Null, text),
            payload,
        ])
        .canon()
        .as_bytes(),
    )
}

pub(super) struct Identities {
    pub seeds: HashMap<String, Seed>,
    omitted: HashMap<String, String>,
}
impl From<&Journal> for Identities {
    fn from(j: &Journal) -> Self {
        Self {
            seeds: j.seeds.clone(),
            omitted: j.omitted.clone(),
        }
    }
}
impl Identities {
    fn omit(&mut self, old: &str, fp: String, omitted_rows: &mut Vec<Json>) {
        if self.fingerprint(old).is_none() {
            omitted_rows.push(Json::Arr(vec![text(old), text(&fp)]));
            self.omitted.insert(old.to_owned(), fp);
        }
    }
    fn seed(&mut self, old: &str, fingerprint: &str, runtime: &Runtime) -> Result<(), Fail> {
        if let std::collections::hash_map::Entry::Vacant(entry) = self.seeds.entry(old.to_owned()) {
            entry.insert((runtime.seed)(old, fingerprint.to_owned())?);
        }
        Ok(())
    }
    fn conflicts(&self, old: &str, fingerprint: &str) -> bool {
        self.fingerprint(old)
            .is_some_and(|known| known != fingerprint)
    }

    fn fingerprint(&self, old: &str) -> Option<&String> {
        self.seeds
            .get(old)
            .map(|s| &s.fingerprint)
            .or_else(|| self.omitted.get(old))
    }
}
/// A source index also identifies its unique destination in the group.
pub(super) struct Occurrence {
    source: usize,
    coordinate: Vec<i64>,
    line: FactLine,
    fingerprint: String,
    pub fate: Fate,
    root: Option<usize>,
    fields: Vec<refs::Field>,
}

#[derive(Default)]
pub(super) struct Index {
    copies: HashMap<String, Vec<Occurrence>>,
    roots: Vec<(String, usize)>,
}

pub(super) struct Cut {
    file: File,
    arrivals: Vec<String>,
    prefix: String,
    prefix_changed: bool,
}

impl Index {
    pub(super) fn collect(
        inputs: &[Input],
        unnamed: Unnamed,
        journal: &Journal,
        report: &mut Report,
    ) -> Result<(Self, Vec<Cut>), Fail> {
        let mut index = Self::default();
        let cuts = inputs
            .iter()
            .enumerate()
            .map(|(source, input)| {
                index.collect_cut(
                    source,
                    input,
                    unnamed,
                    journal.cuts.get(&input.name),
                    &mut report.sources[source].1,
                )
            })
            .collect::<Result<_, _>>()?;
        Ok((index, cuts))
    }

    fn collect_cut(
        &mut self,
        i: usize,
        input: &Input,
        unnamed: Unnamed,
        checkpoint: Option<&(usize, String)>,
        counts: &mut Counts,
    ) -> Result<Cut, Fail> {
        let map = input.map.as_ref().map_err(refused)?;
        let file = File::open(&input.facts)?;
        let mut arrivals = Vec::new();
        let mut prefix = Vec::new();
        let mut prefix_changed = false;
        let summary = source::scan(BufReader::new(&file), map, |f| {
            counts.add("facts_read", 1);
            if f.observer.is_empty() {
                counts.add("empty_observer", 1);
            }
            prefix.extend_from_slice(&f.raw_digest);
            prefix = hash(&prefix);
            if checkpoint
                .is_some_and(|(n, sum)| *n == arrivals.len() + 1 && *sum != base32::base32(&prefix))
            {
                prefix_changed = true;
            }
            let payload = f.parsed_payload();
            let fate = mapping::classify(map, unnamed, &f, payload.as_ref());
            let root = match &fate {
                Fate::Included(Ok(row)) if !matches!(row.target, mapping::Target::Keyed(_)) => {
                    self.roots.push((f.id.clone(), i));
                    Some(self.roots.len() - 1)
                }
                _ => None,
            };
            let fields = if matches!(fate, Fate::Included(Ok(_))) {
                refs::Field::read(payload.as_ref().expect("included payload"), map)
            } else {
                Vec::new()
            };
            let occurrence = Occurrence {
                fields,
                root,
                source: i,
                fingerprint: fingerprint(&f, payload),
                fate,
                coordinate: f.coordinate,
                line: FactLine {
                    span: f.span,
                    sum: f.raw_digest,
                },
            };
            self.copies
                .entry(f.id.clone())
                .or_default()
                .push(occurrence);
            arrivals.push(f.id);
        })
        .map_err(|e| match e {
            source::ScanError::Invalid(why) => refused(format!("{}: {why}", input.name)),
            source::ScanError::Io(e) => Fail::System(format!("{}: {e}", input.facts.display())),
        })?;
        counts.add(
            "old_ticks_left_out",
            usize::try_from(summary.ticks).map_err(super::invalid)?,
        );
        debug_assert_eq!(summary.facts, u64::try_from(arrivals.len()).expect("count"));
        Ok(Cut {
            file,
            arrivals,
            prefix: base32::base32(&prefix),
            prefix_changed,
        })
    }

    pub(super) fn seed(
        &self,
        cuts: &[Cut],
        identities: &mut Identities,
        runtime: &Runtime,
    ) -> Result<(), Fail> {
        for (source, cut) in cuts.iter().enumerate() {
            for id in &cut.arrivals {
                let row = self.occurrence(id, source);
                if matches!(row.fate, Fate::Included(_)) {
                    identities.seed(id, &row.fingerprint, runtime)?;
                }
            }
        }
        Ok(())
    }

    pub(super) fn occurrence(&self, old: &str, source: usize) -> &Occurrence {
        let copies = &self.copies[old];
        let at = copies
            .binary_search_by_key(&source, |row| row.source)
            .expect("each cut indexes its unique ids in group source order");
        &copies[at]
    }
}

#[derive(Clone)]
struct FactLine {
    span: Range<u64>,
    sum: Vec<u8>,
}

struct Item {
    old: String,
    id: String,
    draft: batch::Draft,
    line: FactLine,
    prior: Option<usize>,
    recipe: refs::PayloadRecipe,
}
struct Chunk {
    items: Vec<Item>,
    bytes: usize,
}
pub(super) struct Plan {
    held: Held,
    file: File,
    chunks: Vec<Chunk>,
    cut: (usize, String),
    omitted: Vec<Json>,
}
impl Plan {
    fn verify(&mut self, key: &Key, verified: fn(Vec<Line>)) -> Result<(), Fail> {
        let mut staged = HashMap::new();
        for chunk in &self.chunks {
            let lines = prepare(&mut self.file, chunk, key, &self.held, &mut staged)?;
            verified(lines);
        }
        Ok(())
    }
    fn schedule(
        &mut self,
        p: super::mapping::Prepared,
        old: String,
        line: &FactLine,
        prior: Option<usize>,
        counts: &mut Counts,
    ) {
        if prior.is_some() && self.held.line(&p.id).is_some() {
            counts.add("already_imported", 1);
            return;
        }
        counts.add("would_write", 1);
        let mut draft = p.draft;
        let size = draft.payload.canon().len() + draft.env.to_json().canon().len() + 512;
        draft.payload = Json::Null;
        self.push(
            Item {
                old,
                id: p.id,
                draft,
                recipe: p.recipe,
                line: line.clone(),
                prior,
            },
            size,
        );
    }
    fn push(&mut self, item: Item, size: usize) {
        if self.chunks.last().is_none_or(|c| {
            c.items.len() >= MAX_ROWS
                || c.bytes.saturating_add(size) > MAX_BYTES
                || c.items[0].prior != item.prior
        }) {
            self.chunks.push(Chunk {
                items: Vec::new(),
                bytes: 0,
            });
        }
        let c = self.chunks.last_mut().expect("chunk exists");
        c.bytes += size;
        c.items.push(item);
    }
}

impl FactLine {
    fn payload(&self, file: &mut File) -> Result<Json, Fail> {
        file.seek(SeekFrom::Start(self.span.start))?;
        let mut bytes = vec![
            0;
            usize::try_from(self.span.end - self.span.start)
                .expect("span came from a String")
        ];
        file.read_exact(&mut bytes)?;
        if hash(&bytes) != self.sum {
            return Err(mismatch("export changed after preflight"));
        }
        let json = loops_eval::parse_json(std::str::from_utf8(&bytes).expect("verified UTF-8"))
            .map_err(super::invalid)?;
        let Json::Obj(fields) = json else {
            return Err(mismatch("export row changed"));
        };
        let raw = fields
            .iter()
            .find(|(k, _)| k == "payload")
            .ok_or_else(|| mismatch("export lost payload"))?;
        loops_eval::parse_writer_payload(source::string(&raw.1).map_err(super::invalid)?)
            .map_err(super::invalid)
    }
}

// Use the held envelopes and the batches prepared earlier in this pass.
// Only raw payload text is reread; the verified span must still match exactly.
fn prepare(
    file: &mut File,
    chunk: &Chunk,
    key: &Key,
    held: &Held,
    staged: &mut HashMap<String, batch::Held>,
) -> Result<Vec<Line>, Fail> {
    let mut drafts = Vec::with_capacity(chunk.items.len());
    for item in &chunk.items {
        let mut d = item.draft.clone();
        d.payload = item.recipe.apply(item.line.payload(file)?);
        drafts.push(d);
    }
    let view = |id: &str| staged.get(id).cloned().or_else(|| held.writer_view(id));
    let lines = prepare_changeset(&view, key, &drafts, || Ok(()))?;
    for (item, line) in chunk.items.iter().zip(&lines) {
        if line.id() != item.id {
            return Err(mismatch("checked batch disagrees with prospective id"));
        }
        staged.insert(
            item.id.clone(),
            batch::Held {
                of: line.env().of.clone(),
                prev: line.env().prev.clone(),
            },
        );
    }
    Ok(lines)
}

fn read_destination(
    input: &Input,
    key: &Key,
    j: &Journal,
    counts: &mut Counts,
) -> Result<Held, Fail> {
    let held = input.dest.read()?;
    counts.add("destination_reads", 1);
    if let Some(problem) = unclean(&held) {
        return Err(refused(problem));
    }
    let prior = j.records.get(&input.name);
    let allowed: HashSet<_> = prior
        .into_iter()
        .flat_map(|rows| rows.values().map(|(id, _)| id.as_str()))
        .collect();
    if held
        .lines()
        .iter()
        .any(|line| !allowed.contains(line.id()) || line.key() != key.public())
    {
        return Err(mismatch(&format!(
            "{}: destination holds an unreserved record or signer",
            input.name
        )));
    }
    Ok(held)
}

#[expect(
    clippy::too_many_arguments,
    reason = "The preflight shares group reservations and reporting, and owns a distinct history for this source."
)]
pub(super) fn preflight(
    input: &Input,
    i: usize,
    index: &Index,
    cut: Cut,
    roots: &mut roots::Roots,
    ids: &mut IdMap,
    key: &Key,
    j: &Journal,
    identities: &mut Identities,
    report: &mut Report,
    verified: fn(Vec<Line>),
) -> Result<Plan, Fail> {
    let map = input.map.as_ref().map_err(refused)?;
    let held = read_destination(input, key, j, &mut report.sources[i].1)?;

    let mut plan = Plan {
        held,
        file: cut.file,
        chunks: Vec::new(),
        omitted: Vec::new(),
        cut: (cut.arrivals.len(), cut.prefix),
    };
    let prior = j.records.get(&input.name);
    let mut history = History::default();
    let mut matched = 0;
    let checkpoint = j.cuts.get(&input.name);
    let mut drift = cut.prefix_changed;

    for old in cut.arrivals {
        let row = index.occurrence(&old, i);
        ids.seen(&old);
        let local = prior.and_then(|p| p.get(&old));
        if local.is_some() {
            matched += 1;
        }
        let context = |why: &str| format!("{} {:?} {old}: {why}", input.name, row.coordinate);
        if identities.conflicts(&old, &row.fingerprint) {
            let code = if local.is_some() {
                "shadow-state-mismatch"
            } else {
                "shadow-id-conflict"
            };
            report.problem(i, code, context(code));
            continue;
        }
        let classification = match &row.fate {
            Fate::Omitted { defect } => {
                identities.omit(&old, row.fingerprint.clone(), &mut plan.omitted);
                report.omitted(i, &old, defect.as_ref());
                continue;
            }
            Fate::Included(result) => result,
        };
        let seed = &identities.seeds[&old];
        let included = match classification {
            Ok(included) => included,
            Err(e) => {
                report.problem(i, e.code(), context(&e.to_string()));
                continue;
            }
        };
        let payload = row.line.payload(&mut plan.file)?;
        let own = match &included.target {
            mapping::Target::Keyed(name) => Some(name.as_str()),
            _ => None,
        };
        let changes = roots.take_changes(index, row, own);
        match history.prepare_included(included, payload, changes, key, &seed.salt, &seed.emitted) {
            Err(e) => report.problem(i, e.code(), context(&e.to_string())),
            Ok(p) => {
                if local.is_some_and(|(expected, _)| *expected != p.id) {
                    drift = true;
                    continue;
                }
                ids.record(&old, input, &p);
                report.included(i, &old, &p, map.kinds.get(&included.kind));
                plan.schedule(
                    p,
                    old,
                    &row.line,
                    local.map(|(_, b)| *b),
                    &mut report.sources[i].1,
                );
            }
        }
    }
    if drift
        || checkpoint.is_some_and(|(n, _)| *n > plan.cut.0)
        || prior.is_some_and(|p| matched != p.len())
    {
        return Err(mismatch(&format!(
            "{}: recorded source prefix or mapping changed",
            input.name
        )));
    }
    if report.errors.is_empty() {
        plan.verify(key, verified)?;
    }
    Ok(plan)
}

impl Plan {
    pub(super) fn pin_cut(
        &mut self,
        input: &Input,
        j: &mut Journal,
        log: &mut File,
    ) -> Result<(), Fail> {
        if j.cuts.get(&input.name) != Some(&self.cut) {
            j.append(
                log,
                &event(
                    "cut",
                    [
                        text(&input.name),
                        text(self.cut.0.to_string()),
                        text(&self.cut.1),
                        Json::Arr(std::mem::take(&mut self.omitted)),
                    ],
                ),
            )?;
        }
        Ok(())
    }
    pub(super) fn publish(
        &mut self,
        input: &Input,
        key: &Key,
        j: &mut Journal,
        log: &mut File,
        runtime: &Runtime,
        counts: &mut Counts,
    ) -> Result<(), Fail> {
        let mut staged = HashMap::new();
        for chunk in &self.chunks {
            let lines = prepare(&mut self.file, chunk, key, &self.held, &mut staged)?;
            let batch = if let Some(n) = chunk.items[0].prior {
                n
            } else {
                let n = j.batches.len();
                let entries = chunk
                    .items
                    .iter()
                    .map(|r| Json::Arr(vec![text(&r.old), text(&r.id)]))
                    .collect();
                (runtime.at)(Point::BeforeReserve)?;
                j.append(
                    log,
                    &event("reserve", [text(&input.name), Json::Arr(entries)]),
                )?;
                (runtime.at)(Point::Reserved)?;
                n
            };
            input.dest.append(&lines)?;
            counts.add("written", lines.len());
            (runtime.at)(Point::Appended)?;
            if chunk.items[0].prior.is_none() {
                j.append(log, &event("done", [text(batch.to_string())]))?;
            }
        }
        // This includes a stop after the segment rename with all IDs already held.
        for n in 0..j.batches.len() {
            if j.batches[n] == input.name && !j.done.contains(&n) {
                j.append(log, &event("done", [text(n.to_string())]))?;
            }
        }
        Ok(())
    }
}
