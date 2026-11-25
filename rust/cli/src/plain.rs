//! Human-readable views of inventory, things and spec results.
mod fold;
mod json_syntax;
pub(crate) use fold::fold;

use crate::{
    Fail,
    description::Description,
    usage,
    values::{Field, Fields, member, thing_about},
};
use loops::{
    json::{Json, quote, str_cmp},
    live::LiveState,
    record::{Record, Shown, id_text},
    time::{Moment, instant},
};
use loops_place::{clock, dir::Held};
use std::{cell::OnceCell, env, fmt::Write};

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum Format {
    Json,
    Plain,
}

fn unicode_escape(out: &mut String, c: char) {
    for unit in c.encode_utf16(&mut [0; 2]) {
        write!(out, "\\u{unit:04x}").expect("write string");
    }
}

/// JCS escapes ASCII controls. Also neutralize DEL, C1, line separators
/// and invisible formatting controls that could change the terminal layout.
fn visible(s: &str) -> String {
    let mut out = String::new();
    for c in s.chars() {
        if c.is_control() || (!c.is_ascii() && c.escape_debug().count() > 1) {
            unicode_escape(&mut out, c);
        } else {
            out.push(c);
        }
    }
    out
}

pub(crate) fn label(s: &str) -> String {
    if s.is_empty() {
        return "\"\"".into();
    }
    let quoted = quote(s);
    visible(&quoted[1..quoted.len() - 1])
}

fn text(s: &str) -> String {
    let conflict = s
        .strip_prefix("conflict (")
        .and_then(|tail| {
            tail.split_once("): ")
                .map(|(n, _)| n)
                .or_else(|| tail.strip_suffix(')'))
        })
        .is_some_and(|n| {
            !n.is_empty()
                && (n == "0" || !n.starts_with('0'))
                && n.bytes().all(|b| b.is_ascii_digit())
        });
    if s.is_empty()
        || s.trim() != s
        || matches!(s, "—" | "unknown" | "null" | "true" | "false")
        || conflict
        || json_syntax::number_or_container(s)
    {
        visible(&quote(s))
    } else {
        label(s)
    }
}

pub(crate) fn value(v: &Json) -> String {
    match v {
        Json::Str(s) => text(s),
        _ => visible(&v.canon()),
    }
}

/// Only text supplies a headline. Missing openings and competing setters
/// retain their field states in all the plain thing views.
pub(crate) fn headline(f: &Field) -> String {
    match f {
        Field::Value(v) if !matches!(v, Json::Str(_)) => "—".into(),
        _ => field(f),
    }
}

fn preview(setter: &Json) -> String {
    const LIMIT: usize = 40;
    let rendered = match member(setter, "value") {
        Some(Json::Str(s)) if s.contains(" | ") => visible(&quote(s)),
        Some(v) => value(v),
        None if matches!(member(setter, "shown"), Some(Json::Str(s)) if s == "here") => "—".into(),
        None => "unknown".into(),
    };
    match rendered.char_indices().nth(LIMIT - 1) {
        Some((end, c)) if end + c.len_utf8() < rendered.len() => format!("{}…", &rendered[..end]),
        _ => rendered,
    }
}

pub(crate) fn field(f: &Field) -> String {
    match f {
        Field::Value(v) => value(v),
        Field::Unset => "—".into(),
        Field::Unknown(_) => "unknown".into(),
        Field::Conflict(rs) => format!(
            "conflict ({}): {}",
            rs.len(),
            rs.iter().map(preview).collect::<Vec<_>>().join(" | ")
        ),
    }
}

/// Use single-column spellings where padding matters, without assuming
/// terminal-specific widths for combining marks, wide glyphs or emoji.
pub(crate) fn table(header: Vec<String>, rows: impl Iterator<Item = Vec<String>>) -> String {
    let mut widths = vec![0; header.len() - 1];
    let mut rows: Vec<_> = std::iter::once(header).chain(rows).collect();
    for row in &mut rows {
        for (w, cell) in widths.iter_mut().zip(row) {
            if !cell.is_ascii() && cell != "—" {
                let mut escaped = String::new();
                for c in cell.chars() {
                    if c.is_ascii() || matches!(c, '—' | '…') {
                        escaped.push(c);
                    } else {
                        unicode_escape(&mut escaped, c);
                    }
                }
                *cell = escaped;
            }
            *w = (*w).max(cell.chars().count());
        }
    }
    let mut out = String::new();
    for row in rows {
        if !out.is_empty() {
            out.push('\n');
        }
        for (i, cell) in row.iter().enumerate() {
            out.push_str(cell);
            if let Some(w) = widths.get(i) {
                out.extend(std::iter::repeat_n(' ', w - cell.chars().count() + 2));
            }
        }
    }
    out
}

fn now() -> Result<Moment, Fail> {
    match env::var("LOOPS_TEST_PLAIN_NOW") {
        Ok(s) => {
            instant(&s).ok_or_else(|| usage("LOOPS_TEST_PLAIN_NOW needs a canonical UTC instant"))
        }
        Err(env::VarError::NotPresent) => clock::now()
            .and_then(|s| instant(&s))
            .ok_or_else(|| Fail::System("the clock is outside 1970–9999".into())),
        Err(env::VarError::NotUnicode(_)) => {
            Err(usage("LOOPS_TEST_PLAIN_NOW needs a canonical UTC instant"))
        }
    }
}

fn relative(at: &Moment, now: &Moment) -> String {
    let future = at > now;
    let (later, earlier) = if future { (at, now) } else { (now, at) };
    let seconds =
        later.seconds() - earlier.seconds() - i64::from(later.fraction() < earlier.fraction());
    let (n, unit) = match seconds {
        0 => return "now".into(),
        1..60 => (seconds, "second"),
        60..3600 => (seconds / 60, "minute"),
        3600..86400 => (seconds / 3600, "hour"),
        _ => (seconds / 86400, "day"),
    };
    let s = if n == 1 { "" } else { "s" };
    if future {
        format!("in {n} {unit}{s}")
    } else {
        format!("{n} {unit}{s} ago")
    }
}

pub(crate) fn thing(
    held: &Held,
    name: &str,
    records: usize,
    state: &LiveState<'_>,
    heads: &[Record],
    desc: Option<&Description>,
    detail: crate::values::Setters,
) -> Result<String, Fail> {
    let now = now()?;
    let mut out = format!("thing  {}", label(name));
    let fields = Fields::new(held, state);
    if let Some(key) = desc.and_then(|d| d.headline(heads)) {
        write!(out, "  {}", headline(&fields.read(key))).expect("write string");
    }
    write!(out, "\nrecords  {records}\nheads  {}", heads.len()).expect("write string");
    keyed_fields(&mut out, &fields, state, "");
    write!(
        out,
        "\nabout  {}",
        mentions(thing_about(heads).iter().map(String::as_str))
    )
    .expect("write string");
    for head in heads {
        write!(
            out,
            "\nhead  {}\n  emitted  {}\n  occurred  {}",
            id_text(&head.id),
            relative(head.emitted.moment(), &now),
            head.occurred.as_ref().map_or("—", |c| c.text())
        )
        .expect("write string");
    }
    if detail == crate::values::Setters::All {
        let mut live = crate::values::SetterRecords::default();
        for key in &fields.names {
            live.add(key, &state.setters(key));
        }
        for (record, keys) in live.ordered() {
            write!(
                out,
                "\nlive  {}\n  emitted  {}\n  keys  {}\n  about  {}",
                id_text(&record.id),
                relative(record.emitted.moment(), &now),
                mentions(keys.iter().map(String::as_str)),
                mentions(record.about.iter().map(String::as_str))
            )
            .expect("write string");
            write_payload(&mut out, "", crate::values::payload(held, &record));
        }
    }
    Ok(out)
}

fn write_payload(out: &mut String, indent: &str, payload: Option<&Json>) {
    write!(out, "\n{indent}  payload").expect("write string");
    match payload {
        Some(Json::Obj(members)) if !members.is_empty() => {
            let mut fields: Vec<_> = members.iter().collect();
            fields.sort_by(|a, b| str_cmp(&a.0, &b.0));
            for (key, v) in fields {
                write!(out, "\n{indent}    {}  {}", label(key), value(v)).expect("write string");
            }
        }
        Some(v) => write!(out, "  {}", value(v)).expect("write string"),
        None => out.push_str("  unknown"),
    }
}

/// Field state is read identically in the thing and keyed fold views.
fn keyed_fields(out: &mut String, fields: &Fields<'_, '_>, state: &LiveState<'_>, indent: &str) {
    for k in &fields.names {
        write!(out, "\n{indent}  {}  {}", label(k), field(&fields.read(k))).expect("write string");
    }
    if state.whole().iter().any(|r| r.shown != Shown::Here) {
        write!(out, "\n{indent}other fields  unknown").expect("write string");
    }
}

fn mentions<'a>(names: impl IntoIterator<Item = &'a str>) -> String {
    let names: Vec<_> = names.into_iter().map(text).collect();
    if names.is_empty() {
        "—".into()
    } else {
        names.join(" ")
    }
}

/// The same sorted, distinct IDs that get and of resolve, including
/// records outside a listing or a spec's sources.
pub(crate) struct Prefixes<'a> {
    held: &'a Held,
    sorted: OnceCell<Vec<&'a str>>,
}

impl<'a> Prefixes<'a> {
    pub(crate) fn new(held: &'a Held) -> Self {
        Self {
            held,
            sorted: OnceCell::new(),
        }
    }

    fn mentions(&self, ids: &[String]) -> String {
        mentions(ids.iter().map(|id| self.short(id)))
    }

    pub(crate) fn short<'s>(&self, id: &'s str) -> &'s str {
        if !id.starts_with("r:") {
            return id;
        }
        let ids = self.sorted.get_or_init(|| self.held.ids_from(""));
        let Ok(i) = ids.binary_search(&id) else {
            return id;
        };
        // In sorted order, only the two neighbours can force a longer prefix.
        let mut len = "r:".len() + 8;
        for neighbour in [i.checked_sub(1).and_then(|n| ids.get(n)), ids.get(i + 1)]
            .into_iter()
            .flatten()
        {
            let common = id
                .bytes()
                .zip(neighbour.bytes())
                .take_while(|(a, b)| a == b)
                .count();
            len = len.max(common + 1);
        }
        &id[..len]
    }
}
