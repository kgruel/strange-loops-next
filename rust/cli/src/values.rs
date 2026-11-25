//! The values view: a thing's keyed state with each key's value read from its
//! live setters, as `loops of` shows it and `read --values` and
//! `fold --values` write it beside the ids.
//!
//! This is the CLI's reading, not the protocol's. A fold answers ids; here
//! their envelopes and held payloads are joined in, from what the store holds. Liveness
//! is the core's (`loops::live`), and nothing here compares two values.
use loops::{
    json::{Json, canon_set, str_cmp},
    live,
    record::{Record, Shown, id_text},
    spec::{FoldType, Follow, Slot, Spec},
};
use loops_place::dir::Held;
use std::collections::HashMap;

/// Whether a fold's answer has the values joined in.
#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum View {
    /// The protocol's answer, as it is.
    Ids,
    /// The same answer with the values beside the ids.
    Values,
}

pub(crate) fn shown_name(shown: Shown) -> &'static str {
    match shown {
        Shown::Here => "here",
        Shown::Withheld => "withheld",
        Shown::Erased => "erased",
    }
}

/// The payload a reader holds of a record: none unless it is shown here.
pub(crate) fn payload<'a>(held: &'a Held, record: &Record) -> Option<&'a Json> {
    if record.shown != Shown::Here {
        return None;
    }
    held.line(&id_text(&record.id))?.payload()
}

/// A top-level member of a payload or setter object.
pub(crate) fn member<'a>(payload: &'a Json, key: &str) -> Option<&'a Json> {
    match payload {
        Json::Obj(members) => members.iter().find(|(k, _)| k == key).map(|(_, v)| v),
        _ => None,
    }
}

/// Raw field values, once per distinct live setter. A hidden setter yields
/// None; an open setter with no such member contributes no value.
pub(crate) fn setter_values<'a>(
    held: &'a Held,
    state: &live::LiveState<'_>,
    key: &'a str,
) -> impl Iterator<Item = Option<&'a Json>> {
    state.setters(key).into_iter().filter_map(move |r| {
        if r.shown == Shown::Here {
            payload(held, r).and_then(|p| member(p, key)).map(Some)
        } else {
            Some(None)
        }
    })
}

/// One live setter of `key`: its id and `shown`, and its value of the key
/// when its payload is held and holds the key.
fn setter(held: &Held, record: &Record, key: &str) -> Json {
    let mut members = vec![
        ("id".to_owned(), Json::Str(id_text(&record.id))),
        (
            "shown".to_owned(),
            Json::Str(shown_name(record.shown).into()),
        ),
    ];
    if let Some(value) = payload(held, record).and_then(|p| member(p, key)) {
        members.push(("value".to_owned(), value.clone()));
    }
    Json::Obj(members)
}

/// The result of asking for one key, including the evidence when it is not a value.
pub(crate) enum Field {
    Value(Json),
    Unset,
    Unknown(Vec<Json>),
    Conflict(Vec<Json>),
}

impl Field {
    pub(crate) fn projection(&self) -> Json {
        use crate::{object, text};
        match self {
            Self::Value(v) => object(vec![("state", text("value")), ("value", v.clone())]),
            Self::Unset => object(vec![("state", text("unset"))]),
            Self::Unknown(rs) | Self::Conflict(rs) => {
                let tag = if matches!(self, Self::Unknown(_)) {
                    "unknown"
                } else {
                    "conflict"
                };
                object(vec![
                    ("state", text(tag)),
                    ("setters", Json::Arr(rs.clone())),
                ])
            }
        }
    }
}

pub(crate) struct Fields<'a, 'r> {
    held: &'a Held,
    state: &'a live::LiveState<'r>,
    pub(crate) names: Vec<String>,
}

impl<'a, 'r> Fields<'a, 'r> {
    pub(crate) fn new(held: &'a Held, state: &'a live::LiveState<'r>) -> Self {
        let mut names = state.keys();
        for r in state.whole() {
            if let Some(Json::Obj(members)) = payload(held, r) {
                names.extend(members.iter().map(|(k, _)| k.clone()));
            }
        }
        Self {
            held,
            state,
            names: canon_set(&names),
        }
    }

    pub(crate) fn read(&self, key: &str) -> Field {
        let live = self.state.setters(key);
        if self.names.binary_search_by(|k| str_cmp(k, key)).is_err() {
            // A whole record implicitly sets every key. Only an unavailable
            // live opening can supply an otherwise unmentioned key.
            let hidden: Vec<_> = live
                .iter()
                .filter(|r| r.shown != Shown::Here)
                .map(|r| setter(self.held, r, key))
                .collect();
            return if hidden.is_empty() {
                Field::Unset
            } else {
                Field::Unknown(hidden)
            };
        }
        self.read_named(key, &live)
    }

    fn read_named(&self, key: &str, live: &[&Record]) -> Field {
        match live {
            [] => Field::Unset,
            [one] if one.shown == Shown::Here => payload(self.held, one)
                .and_then(|p| member(p, key))
                .cloned()
                .map_or(Field::Unset, Field::Value),
            [one] => Field::Unknown(vec![setter(self.held, one, key)]),
            several => Field::Conflict(several.iter().map(|r| setter(self.held, r, key)).collect()),
        }
    }
}

/// Gather each record once, with the names visited in Fields' canonical order.
#[derive(Default)]
pub(crate) struct SetterRecords {
    records: Vec<Record>,
    keys: HashMap<loops::record::Digest, Vec<String>>,
}

impl SetterRecords {
    pub(crate) fn add(&mut self, key: &str, records: &[&Record]) {
        for &record in records {
            self.keys
                .entry(record.id)
                .or_insert_with(|| {
                    self.records.push(record.clone());
                    Vec::new()
                })
                .push(key.to_owned());
        }
    }

    pub(crate) fn ordered(mut self) -> impl Iterator<Item = (Record, Vec<String>)> {
        loops::fold::order_heads(&self.records)
            .into_iter()
            .map(move |record| {
                let keys = self.keys.remove(&record.id).expect("collected setter");
                (record, keys)
            })
    }
}

pub(crate) fn thing_about(heads: &[Record]) -> Vec<String> {
    let mentions: Vec<_> = heads.iter().flat_map(|r| r.about.iter().cloned()).collect();
    canon_set(&mentions)
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum Setters {
    Compact,
    All,
}

/// Preserve the existing values/setters/unheld view on of, read and fold.
pub(crate) fn thing(
    held: &Held,
    state: &live::LiveState<'_>,
    detail: Setters,
) -> Vec<(&'static str, Json)> {
    let fields = Fields::new(held, state);
    let mut values = Vec::new();
    let mut setters = Vec::new();
    let mut live = (detail == Setters::All).then(SetterRecords::default);
    for key in &fields.names {
        let records = state.setters(key);
        if let Some(live) = &mut live {
            live.add(key, &records);
        }
        let rows = match fields.read_named(key, &records) {
            Field::Unknown(rows) | Field::Conflict(rows) => rows,
            field => {
                if let Field::Value(v) = field {
                    values.push((key.clone(), v));
                }
                if detail == Setters::Compact {
                    continue;
                }
                records.into_iter().map(|r| setter(held, r, key)).collect()
            }
        };
        if !rows.is_empty() {
            setters.push((key.clone(), Json::Arr(rows)));
        }
    }
    let unheld: Vec<Json> = state
        .whole()
        .iter()
        .filter(|r| r.shown != Shown::Here)
        .map(|r| {
            Json::Obj(vec![
                ("id".to_owned(), Json::Str(id_text(&r.id))),
                ("shown".to_owned(), Json::Str(shown_name(r.shown).into())),
            ])
        })
        .collect();
    let mut out = vec![
        (
            "about",
            Json::Arr(
                thing_about(&state.heads())
                    .into_iter()
                    .map(Json::Str)
                    .collect(),
            ),
        ),
        ("values", Json::Obj(values)),
    ];
    if let Some(records) = live {
        let live = records.ordered().filter_map(|(record, keys)| {
            let Json::Obj(mut members) = crate::shown_line(held, &record)? else {
                unreachable!("shown line is an object")
            };
            members.push((
                "keys".into(),
                Json::Arr(keys.into_iter().map(Json::Str).collect()),
            ));
            Some(Json::Obj(members))
        });
        out.push(("live", Json::Arr(live.collect())));
    }
    if detail == Setters::All || !setters.is_empty() {
        out.push(("setters", Json::Obj(setters)));
    }
    if !unheld.is_empty() {
        out.push(("unheld", Json::Arr(unheld)));
    }
    out
}

/// Applies `f` to the member `name` of an object, leaving everything else.
fn at_member(value: Json, name: &str, f: impl Fn(Json) -> Json) -> Json {
    match value {
        Json::Obj(members) => Json::Obj(
            members
                .into_iter()
                .map(|(k, v)| if k == name { (k, f(v)) } else { (k, v) })
                .collect(),
        ),
        other => other,
    }
}

/// Applies `f` to each member of an object, with its name.
fn each_member(value: Json, f: impl Fn(&str, Json) -> Json) -> Json {
    match value {
        Json::Obj(members) => Json::Obj(
            members
                .into_iter()
                .map(|(k, v)| {
                    let v = f(&k, v);
                    (k, v)
                })
                .collect(),
        ),
        other => other,
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum EntryView {
    Envelope,
    EnvelopeAndPayload,
}

/// Add the stored envelope to each entry, and its held payload when requested.
fn entries(held: &Held, list: Json, view: EntryView) -> Json {
    let Json::Arr(mut entries) = list else {
        return list;
    };
    for entry in &mut entries {
        let Some(Json::Str(id)) = member(entry, "id") else {
            continue;
        };
        let Some(line) = held.line(id) else {
            continue;
        };
        let here = matches!(member(entry, "shown"), Some(Json::Str(s)) if s == "here");
        if let Json::Obj(members) = entry {
            members.push(("env".to_owned(), line.env().to_json()));
            if view == EntryView::EnvelopeAndPayload && here {
                if let Some(p) = line.payload() {
                    members.push(("payload".to_owned(), p.clone()));
                }
            }
        }
    }
    Json::Arr(entries)
}

/// Add each thing's about and values, and the envelopes of its heads.
/// A collect or latest-by following `prev` also shows held payloads.
fn slot(held: &Held, by_thing: &HashMap<String, Vec<&Record>>, slot: &Slot, value: Json) -> Json {
    let records = |list| entries(held, list, EntryView::EnvelopeAndPayload);
    if slot.group.is_some() {
        return at_member(value, "groups", |groups| {
            each_member(groups, |_, group| at_member(group, "heads", records))
        });
    }
    match slot.fold_type {
        FoldType::LatestBy {
            follow: Follow::Keys,
        } => at_member(value, "things", |things| {
            each_member(things, |name, view| {
                match at_member(view, "heads", |list| {
                    entries(held, list, EntryView::Envelope)
                }) {
                    Json::Obj(mut members) => {
                        let state =
                            live::LiveState::new(by_thing.get(name).cloned().unwrap_or_default());
                        members.extend(
                            thing(held, &state, Setters::Compact)
                                .into_iter()
                                .map(|(k, v)| (k.to_owned(), v)),
                        );
                        Json::Obj(members)
                    }
                    other => other,
                }
            })
        }),
        FoldType::LatestBy {
            follow: Follow::Prev,
        } => at_member(value, "things", |things| {
            each_member(things, |_, list| records(list))
        }),
        FoldType::Collect { .. } => at_member(value, "heads", records),
        FoldType::Count { .. }
        | FoldType::Sum { .. }
        | FoldType::Min { .. }
        | FoldType::Max { .. } => value,
    }
}

pub(crate) fn records_by_thing(realm: &[Record]) -> HashMap<String, Vec<&Record>> {
    let mut things = HashMap::<String, Vec<&Record>>::new();
    for r in realm {
        things.entry(r.thing()).or_default().push(r);
    }
    things
}

/// A fold's answer, `slots`, with the values joined in, slot by slot.
pub(crate) fn fold(held: &Held, realm: &[Record], spec: &Spec, slots: Json) -> Json {
    let things = records_by_thing(realm);
    each_member(slots, |name, value| {
        match spec.slots.iter().find(|s| s.name == name) {
            Some(s) => slot(held, &things, s, value),
            None => value,
        }
    })
}
