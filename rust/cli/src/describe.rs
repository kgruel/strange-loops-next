//! Compare each local description with live values in the selected, admitted union.
use crate::{
    Description, Fail, Format, count,
    description::{Kind, Lifecycle},
    finish_answer, object, plain, realm,
    references::count_values,
    registry::SelectedStore,
    say,
    selection::Union,
    text,
    values::{Field, Fields, member, records_by_thing, setter_values, thing_about},
};
use loops::{
    envelope::record_id,
    json::{Json, str_cmp},
    live::LiveState,
    record::{Record, id_text},
};
use loops_place::dir::Held;
use std::{
    collections::{BTreeMap, HashMap, HashSet},
    fmt::Write,
    ops::Range,
};

#[derive(Default)]
struct Keys {
    equal: usize,
    different: usize,
    unset: usize,
    conflict: usize,
    not_read: usize,
    keyless_roots: usize,
}

impl Keys {
    fn observe(&mut self, thing: &str, field: &str, fields: &Fields<'_, '_>) {
        if record_id(thing) {
            self.keyless_roots += 1;
            return;
        }
        let suffix = thing.split_once(':').map(|(_, key)| key);
        match fields.read(field) {
            Field::Value(Json::Str(s)) if Some(s.as_str()) == suffix => self.equal += 1,
            Field::Value(_) => self.different += 1,
            Field::Unset => self.unset += 1,
            Field::Conflict(_) => self.conflict += 1,
            Field::Unknown(_) => self.not_read += 1,
        }
    }

    fn counts(&self) -> [(&'static str, usize); 6] {
        [
            ("equal", self.equal),
            ("different", self.different),
            ("unset", self.unset),
            ("conflict", self.conflict),
            ("not_read", self.not_read),
            ("keyless_roots", self.keyless_roots),
        ]
    }
}

#[derive(Default)]
struct Status {
    outside: BTreeMap<String, (Json, usize)>,
    unset: usize,
    conflict: usize,
    not_read: usize,
}

impl Status {
    fn observe(&mut self, life: &Lifecycle, thing: &Thing<'_>) {
        match thing.fields.read(&life.field) {
            Field::Unset => self.unset += 1,
            Field::Conflict(_) => self.conflict += 1,
            Field::Unknown(_) => self.not_read += 1,
            Field::Value(_) => {}
        }
        for value in setter_values(thing.held, thing.state, &life.field).flatten() {
            if !life.lists(value) {
                self.outside
                    .entry(value.canon())
                    .or_insert_with(|| (value.clone(), 0))
                    .1 += 1;
            }
        }
    }

    fn counts(&self) -> [(&'static str, usize); 3] {
        [
            ("unset", self.unset),
            ("conflict", self.conflict),
            ("not_read", self.not_read),
        ]
    }

    fn json(&self) -> Json {
        let outside = ordered(&self.outside)
            .into_iter()
            .map(|(_, (val, n))| object(vec![("value", val.clone()), ("count", count(*n))]));
        let mut members = count_members(self.counts());
        members.push(("outside", Json::Arr(outside.collect())));
        object(members)
    }
}

#[derive(Default)]
struct References {
    held_here: usize,
    elsewhere: usize,
    outside: usize,
    not_typed: usize,
    not_read: usize,
    without_mention: usize,
    unlisted_prefix: usize,
    things_unset: usize,
}

impl References {
    fn counts(&self) -> [(&'static str, usize); 8] {
        [
            ("held_here", self.held_here),
            ("held_elsewhere_in_group", self.elsewhere),
            ("not_in_group", self.outside),
            ("not_typed", self.not_typed),
            ("not_read", self.not_read),
            ("without_mention", self.without_mention),
            ("unlisted_prefix", self.unlisted_prefix),
            ("things_unset", self.things_unset),
        ]
    }

    fn observe(&mut self, field: &str, prefixes: &[String], thing: &Thing<'_>, site: usize) {
        if matches!(thing.fields.read(field), Field::Unset) {
            self.things_unset += 1;
        }
        let coverage = count_values(setter_values(thing.held, thing.state, field), |target| {
            let (prefix, _) = target
                .split_once(':')
                .expect("typed reference has a prefix");
            if !prefixes.is_empty() && !prefixes.iter().any(|p| p == prefix) {
                self.unlisted_prefix += 1;
            }
            match thing.locations.get(target) {
                Some(sites) if sites.contains(&site) => self.held_here += 1,
                Some(_) => self.elsewhere += 1,
                None => self.outside += 1,
            }
            if thing
                .mentions
                .binary_search_by(|name| str_cmp(name, target))
                .is_err()
            {
                self.without_mention += 1;
            }
        });
        self.not_typed += coverage.not_typed;
        self.not_read += coverage.not_read;
    }
}

fn count_members(
    entries: impl IntoIterator<Item = (&'static str, usize)>,
) -> Vec<(&'static str, Json)> {
    entries
        .into_iter()
        .map(|(label, n)| (label, count(n)))
        .collect()
}

#[derive(Default)]
struct EveryWrite {
    missing: usize,
    not_read: usize,
}

#[derive(Default)]
struct Fit {
    every_write: BTreeMap<String, EveryWrite>,
    declared: bool,
    things: usize,
    key: Option<Keys>,
    lifecycle: Option<Status>,
    refs: BTreeMap<String, References>,
}

impl Fit {
    fn declared(kind: &Kind) -> Self {
        Self {
            every_write: kind
                .every_write
                .iter()
                .map(|f| (f.clone(), EveryWrite::default()))
                .collect(),
            declared: true,
            things: 0,
            key: kind.key_field().map(|_| Keys::default()),
            lifecycle: kind.lifecycle.as_ref().map(|_| Status::default()),
            refs: kind
                .refs
                .iter()
                .flat_map(|refs| refs.keys())
                .map(|field| (field.clone(), References::default()))
                .collect(),
        }
    }

    fn observe(&mut self, site: usize, kind: Option<&Kind>, thing: &Thing<'_>) {
        self.things += 1;
        let Some(kind) = kind else { return };
        if let (Some(key), Some(field)) = (&mut self.key, kind.key_field()) {
            key.observe(thing.name, field, &thing.fields);
        }
        if let (Some(status), Some(life)) = (&mut self.lifecycle, &kind.lifecycle) {
            status.observe(life, thing);
        }
        if let Some(refs) = &kind.refs {
            for (field, prefixes) in refs {
                self.refs
                    .get_mut(field)
                    .expect("declared reference field")
                    .observe(field, prefixes, thing, site);
            }
        }
    }

    fn json(&self) -> Json {
        object(vec![
            (
                "every_write",
                Json::Obj(
                    self.every_write
                        .iter()
                        .map(|(field, n)| {
                            (
                                field.clone(),
                                object(vec![
                                    ("records_missing", count(n.missing)),
                                    ("records_not_read", count(n.not_read)),
                                ]),
                            )
                        })
                        .collect(),
                ),
            ),
            ("things", count(self.things)),
            ("declared", Json::Bool(self.declared)),
            (
                "key",
                self.key
                    .as_ref()
                    .map_or(Json::Null, |k| object(count_members(k.counts()))),
            ),
            (
                "lifecycle",
                self.lifecycle.as_ref().map_or(Json::Null, Status::json),
            ),
            (
                "refs",
                Json::Obj(
                    self.refs
                        .iter()
                        .map(|(field, r)| (field.clone(), object(count_members(r.counts()))))
                        .collect(),
                ),
            ),
        ])
    }
}

// A target lives in a store only through an admitted record of it.
type Locations<'a> = HashMap<&'a str, HashSet<usize>>;

struct Thing<'a> {
    name: &'a str,
    held: &'a Held,
    state: &'a LiveState<'a>,
    fields: Fields<'a, 'a>,
    mentions: Vec<String>,
    locations: &'a Locations<'a>,
}

struct Site {
    directory: String,
    description: Option<(Description, Json)>,
    lines: Range<usize>,
    fit: BTreeMap<String, Fit>,
}

impl Site {
    fn json(&self) -> Json {
        let fit = self
            .fit
            .iter()
            .map(|(name, fit)| (name.clone(), fit.json()));
        object(vec![
            ("directory", text(&self.directory)),
            (
                "description",
                self.description
                    .as_ref()
                    .map_or(Json::Null, |(_, raw)| raw.clone()),
            ),
            ("fit", Json::Obj(fit.collect())),
        ])
    }

    fn plain(&self) -> String {
        let mut out = format!("store  {}\n", plain::label(&self.directory));
        match &self.description {
            None => out.push_str("description  none"),
            Some((_, raw)) => {
                write!(
                    out,
                    "description  version {}",
                    member(raw, "version").expect("validated version").canon()
                )
                .expect("write string");
                if let Some(note) = member(raw, "note") {
                    write!(out, "\nnote  {}", plain::value(note)).expect("write string");
                }
                let Some(Json::Obj(kinds)) = member(raw, "kinds") else {
                    unreachable!("validated kinds object")
                };
                let rows = ordered(kinds.iter().map(|(k, v)| (k, v)))
                    .into_iter()
                    .map(|(k, v)| vec![plain::label(k), plain::value(v)]);
                write!(out, "\n{}", table(&["KIND", "DECLARATION"], rows)).expect("write string");
            }
        }
        let kinds = ordered(&self.fit);
        let rows = kinds.iter().map(|(name, f)| {
            vec![
                plain::label(name),
                f.declared.to_string(),
                f.things.to_string(),
            ]
        });
        write!(
            out,
            "\nfit\n{}",
            table(&["KIND", "DECLARED", "THINGS"], rows)
        )
        .expect("write string");
        for (name, f) in kinds {
            let label = plain::label(name);
            if let Some(k) = &f.key {
                write!(out, "\n{label} key\n{}", count_table(k.counts())).expect("write string");
            }
            if let Some(life) = &f.lifecycle {
                write!(out, "\n{label} lifecycle\n{}", count_table(life.counts()))
                    .expect("write string");
                let rows = ordered(&life.outside)
                    .into_iter()
                    .map(|(_, (v, n))| vec![plain::value(v), n.to_string()]);
                write!(
                    out,
                    "\noutside values  {}\n{}",
                    life.outside.len(),
                    table(&["VALUE", "COUNT"], rows)
                )
                .expect("write string");
            }
            if !f.refs.is_empty() {
                let rows = ordered(&f.refs).into_iter().map(|(field, r)| {
                    let mut row = vec![plain::label(field)];
                    row.extend(r.counts().map(|(_, n)| n.to_string()));
                    row
                });
                write!(
                    out,
                    "\n{label} references\n{}",
                    table(
                        &[
                            "FIELD",
                            "HERE",
                            "ELSEWHERE IN SELECTED GROUP",
                            "OUTSIDE SELECTED GROUP",
                            "NOT TYPED",
                            "NOT READ",
                            "WITHOUT MENTION",
                            "UNLISTED PREFIX",
                            "THINGS UNSET"
                        ],
                        rows
                    )
                )
                .expect("write string");
            }
            if !f.every_write.is_empty() {
                let rows = ordered(&f.every_write).into_iter().map(|(field, n)| {
                    vec![
                        plain::label(field),
                        n.missing.to_string(),
                        n.not_read.to_string(),
                    ]
                });
                write!(
                    out,
                    "\n{label} every write\n{}",
                    table(&["FIELD", "RECORDS MISSING", "RECORDS NOT READ"], rows)
                )
                .expect("write string");
            }
        }
        out
    }
}

/// Use the same name order for visible rows and arrays as for JSON members.
fn ordered<'a, V: 'a>(
    entries: impl IntoIterator<Item = (&'a String, &'a V)>,
) -> Vec<(&'a String, &'a V)> {
    let mut rows: Vec<_> = entries.into_iter().collect();
    rows.sort_unstable_by(|(a, _), (b, _)| str_cmp(a, b));
    rows
}

fn table(header: &[&str], rows: impl Iterator<Item = Vec<String>>) -> String {
    plain::table(header.iter().map(|s| (*s).into()).collect(), rows)
}

fn count_table(entries: impl IntoIterator<Item = (&'static str, usize)>) -> String {
    table(
        &["BUCKET", "COUNT"],
        entries
            .into_iter()
            .map(|(k, v)| vec![k.into(), v.to_string()]),
    )
}

fn measure(held: &Held, sites: &mut [Site], records: &[Record]) {
    let groups = records_by_thing(records);
    let mut by_id = HashMap::new();
    for (name, rs) in &groups {
        for r in rs {
            by_id.insert(id_text(&r.id), (name.as_str(), *r));
        }
    }
    let mut locations = Locations::new();
    for (index, site) in sites.iter_mut().enumerate() {
        let mut counted = HashSet::new();
        for line in &held.lines()[site.lines.clone()] {
            let Some(&(thing, record)) = by_id.get(line.id()) else {
                continue;
            };
            locations.entry(thing).or_default().insert(index);
            let Some(fit) = site.fit.get_mut(&record.kind) else {
                continue;
            };
            if fit.every_write.is_empty() || !counted.insert(line.id()) {
                continue;
            }
            let payload = crate::values::payload(held, record);
            for (field, n) in &mut fit.every_write {
                match payload {
                    None => n.not_read += 1,
                    Some(p) if member(p, field).is_none() => n.missing += 1,
                    Some(_) => {}
                }
            }
        }
    }
    for (name, records) in &groups {
        let state = LiveState::new(records.clone());
        let heads = state.heads();
        let thing = Thing {
            name,
            held,
            state: &state,
            fields: Fields::new(held, &state),
            mentions: thing_about(&heads),
            locations: &locations,
        };
        let kinds: HashSet<_> = heads.iter().map(|r| r.kind.as_str()).collect();
        for &index in &locations[name.as_str()] {
            let site = &mut sites[index];
            for &kind in &kinds {
                let spec = site
                    .description
                    .as_ref()
                    .and_then(|(d, _)| d.kinds.get(kind));
                site.fit
                    .entry(kind.to_owned())
                    .or_default()
                    .observe(index, spec, &thing);
            }
        }
    }
}

pub(crate) fn run(stores: Vec<SelectedStore>, format: Format) -> Result<(), Fail> {
    let union = Union::read(stores)?;
    let mut sites: Vec<_> = union
        .sites
        .into_iter()
        .map(|site| {
            let fit = site
                .description
                .iter()
                .flat_map(|(d, _)| &d.kinds)
                .map(|(name, kind)| (name.clone(), Fit::declared(kind)))
                .collect();
            Site {
                directory: site.directory,
                description: site.description,
                lines: site.lines,
                fit,
            }
        })
        .collect();
    measure(&union.held, &mut sites, &realm(&union.held));
    sites.sort_by(|a, b| str_cmp(&a.directory, &b.directory));
    let output = match format {
        Format::Json => object(vec![(
            "stores",
            Json::Arr(sites.iter().map(Site::json).collect()),
        )])
        .canon(),
        Format::Plain if sites.is_empty() => "stores  0".into(),
        Format::Plain => sites
            .iter()
            .map(Site::plain)
            .collect::<Vec<_>>()
            .join("\n\n"),
    };
    finish_answer(say(&output), union.integrity)
}
