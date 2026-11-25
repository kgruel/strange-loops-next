//! Render the typed slot results before JSON sorts their member names.
use super::{Prefixes, headline, keyed_fields, now, relative, text, value};
use crate::{
    Fail,
    description::Description,
    values::{Fields, View, records_by_thing, shown_name, thing_about},
};
use loops::{
    json::Json,
    live::LiveState,
    number::Nat,
    record::{Digest, Record, Shown, id_text},
    spec::{GroupValue, SlotValue},
    time::{Moment, instant},
};
use loops_place::dir::Held;
use std::{cell::OnceCell, collections::HashMap, fmt::Write};

struct Reading<'a> {
    held: &'a Held,
    realm: &'a [Record],
    ids: Prefixes<'a>,
    things: OnceCell<HashMap<String, Vec<&'a Record>>>,
    view: View,
    description: Option<&'a Description>,
    clock: Option<Moment>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Detail {
    Id,
    Envelope,
    Payload,
}

fn unread(out: &mut String, indent: &str, count: &Nat) {
    if *count != Nat::default() {
        write!(
            out,
            "\n{indent}{count} not read: needed payload or field unavailable"
        )
        .expect("write string");
    }
}

impl Reading<'_> {
    // Exact IDs and ordering come from the slot. Visibility comes from its
    // settled entries, even if the store still has an opening on disk.
    fn records(
        &mut self,
        out: &mut String,
        indent: &str,
        records: &[(Digest, Shown)],
        detail: Detail,
    ) -> Result<(), Fail> {
        if records.is_empty() {
            out.push_str("  —");
        }
        for (digest, shown) in records {
            let id = id_text(digest);
            write!(out, "\n{indent}{}", self.ids.short(&id)).expect("write string");
            if self.view == View::Ids {
                continue;
            }
            if *shown != Shown::Here {
                write!(out, "  {}", shown_name(*shown)).expect("write string");
            }
            if detail == Detail::Id {
                continue;
            }
            let line = self.held.line(&id).expect("slot names an admitted record");
            let env = line.env();
            let clock = match &self.clock {
                Some(at) => at,
                None => self.clock.insert(now()?),
            };
            let emitted = instant(&env.emitted).expect("checked envelope instant");
            write!(
                out,
                "  {}\n{indent}  emitted  {}\n{indent}  occurred  {}",
                text(&env.kind),
                relative(&emitted, clock),
                env.occurred.as_deref().unwrap_or("—")
            )
            .expect("write string");
            if let Json::Obj(members) = env.to_json() {
                for (key, v) in members {
                    let rendered = match (key.as_str(), &v) {
                        ("kind" | "emitted" | "occurred", _) => continue,
                        ("of" | "under", Json::Str(id)) => text(self.ids.short(id)),
                        ("about", _) => self.ids.mentions(&env.about),
                        ("prev" | "erases", Json::Arr(ids)) => {
                            let shortened = ids
                                .iter()
                                .map(|id| match id {
                                    Json::Str(id) => Json::Str(self.ids.short(id).into()),
                                    other => other.clone(),
                                })
                                .collect();
                            value(&Json::Arr(shortened))
                        }
                        _ => value(&v),
                    };
                    write!(out, "\n{indent}  {key}  {rendered}").expect("write string");
                }
            }
            if detail == Detail::Payload {
                super::write_payload(
                    out,
                    indent,
                    line.payload().filter(|_| *shown == Shown::Here),
                );
            }
        }
        Ok(())
    }

    fn group(&mut self, out: &mut String, indent: &str, group: GroupValue) -> Result<(), Fail> {
        let count = match group {
            GroupValue::Nat(r) => {
                write!(out, "  {}", r.value).expect("write string");
                r.unread
            }
            GroupValue::Int(r) => {
                write!(out, "  {}", r.value).expect("write string");
                r.unread
            }
            GroupValue::Opt(r) => {
                match r.value {
                    Some(n) => write!(out, "  {n}").expect("write string"),
                    None => out.push_str("  nothing read"),
                }
                r.unread
            }
            GroupValue::Heads { heads, unread } => {
                self.records(out, indent, &heads, Detail::Payload)?;
                unread
            }
        };
        unread(out, indent, &count);
        Ok(())
    }

    fn slot(&mut self, out: &mut String, slot: SlotValue) -> Result<(), Fail> {
        match slot {
            SlotValue::Groups {
                groups,
                unread: count,
                ungrouped,
            } => {
                for (key, v) in groups {
                    write!(out, "\n  group  {}", text(&key)).expect("write string");
                    self.group(out, "    ", v)?;
                }
                write!(out, "\n  {ungrouped} ungrouped").expect("write string");
                if count == Nat::default() {
                    out.push_str("\n  0 not read");
                } else {
                    unread(out, "  ", &count);
                }
            }
            SlotValue::Things {
                things,
                unread: count,
            } => {
                if things.is_empty() {
                    out.push_str("  —");
                }
                for (name, heads) in things {
                    write!(out, "\n  thing  {}\n    heads", text(self.ids.short(&name)))
                        .expect("write string");
                    self.records(out, "      ", &heads, Detail::Payload)?;
                }
                unread(out, "  ", &count);
            }
            SlotValue::Keyed {
                things,
                unread: count,
            } => {
                if things.is_empty() {
                    out.push_str("  —");
                }
                for (name, view) in things {
                    let records = &self.things.get_or_init(|| records_by_thing(self.realm))[&name];
                    let state = LiveState::new(records.clone());
                    write!(out, "\n  thing  {}", text(self.ids.short(&name)))
                        .expect("write string");
                    let fields = Fields::new(self.held, &state);
                    let field = match self.description {
                        Some(desc) => desc.headline(&state.heads()),
                        None => (self.view == View::Ids).then_some("name"),
                    };
                    if let Some(field) = field {
                        write!(out, "  {}", headline(&fields.read(field))).expect("write string");
                    }
                    out.push_str("\n    heads");
                    self.records(out, "      ", &view.heads, Detail::Envelope)?;
                    for (key, setters) in view.keys {
                        write!(out, "\n    setters  {}", text(&key)).expect("write string");
                        self.records(out, "      ", &setters, Detail::Id)?;
                    }
                    out.push_str("\n    whole");
                    self.records(out, "      ", &view.whole, Detail::Id)?;
                    if self.view == View::Values {
                        out.push_str("\n    fields");
                        keyed_fields(out, &fields, &state, "    ");
                        write!(
                            out,
                            "\n    about  {}",
                            self.ids.mentions(&thing_about(&state.heads()))
                        )
                        .expect("write string");
                    }
                }
                unread(out, "  ", &count);
            }
            simple => self.group(out, "  ", simple.group())?,
        }
        Ok(())
    }
}

pub(crate) fn fold(
    held: &Held,
    realm: &[Record],
    slots: Vec<(String, SlotValue)>,
    view: View,
    description: Option<&Description>,
) -> Result<String, Fail> {
    if slots.is_empty() {
        return Ok("no slots".into());
    }
    let mut reading = Reading {
        held,
        realm,
        ids: Prefixes::new(held),
        things: OnceCell::new(),
        view,
        description,
        clock: None,
    };
    let mut out = String::new();
    for (name, slot) in slots {
        if !out.is_empty() {
            out.push('\n');
        }
        out.push_str(&text(&name));
        reading.slot(&mut out, slot)?;
    }
    Ok(out)
}
