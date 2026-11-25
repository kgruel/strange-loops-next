//! Apply a destination store's declarations to one shorthand emit before it is signed.
use crate::{
    Fail,
    description::{Description, Kind},
    draft::Single,
    plain::{label, value},
    refused, usage,
    values::member,
};
use loops::{
    batch::{self, Draft},
    envelope::{record_id, typed_ref},
    json::Json,
};
use std::fmt::Write;

const RAW: &str = "emit - writes anything the store accepts.";

fn names<'a>(items: impl IntoIterator<Item = &'a String>) -> String {
    value(&Json::Arr(
        items.into_iter().cloned().map(Json::Str).collect(),
    ))
}

/// Set a derived address before filling. Return the field to compare if the
/// caller supplied an address or predecessors, whose thing the filler resolves.
pub(crate) fn prepare<'a>(
    desc: &'a Description,
    single: &mut Single,
) -> Result<Option<&'a str>, Fail> {
    let draft = &mut single.statement.draft;
    batch::check_label_names(std::iter::once(&*draft)).map_err(|e| refused(e.code()))?;
    if !draft.payload.keys_distinct() {
        return Err(refused("member-duplicate"));
    }
    let name = &draft.env.kind;
    let kind = desc.kinds.get(name).ok_or_else(|| {
        usage(format!(
            "emit {}: store.json does not name this kind. It names {}. Use one of them, or add the kind to .loops/store.json. {RAW}",
            label(name),
            names(desc.kinds.keys())
        ))
    })?;
    check_fields(kind, &draft.payload)?;
    let Some(field) = kind.key_field().filter(|_| !single.root) else {
        return Ok(None);
    };
    if draft.env.of.is_some() || !draft.env.prev.is_empty() {
        return Ok(Some(field));
    }
    let raw = member(&draft.payload, field).ok_or_else(|| usage(format!(
        "emit {}: missing declared key field {}. State {}=<key> or --of <thing>, or use --root for a keyless root.",
        label(name), label(field), label(field)
    )))?;
    let key = key_text(field, raw)?;
    draft.env.of = Some(format!("{name}:{key}"));
    Ok(None)
}

fn key_text<'a>(field: &str, raw: &'a Json) -> Result<&'a str, Fail> {
    match raw {
        Json::Str(s) if s.contains(',') => Err(usage(format!(
            "key field {}={} contains a comma. Supply a comma-free key, omit the field and state --of, or use --root for a keyless root. {RAW}",
            label(field),
            value(raw)
        ))),
        Json::Str(s) if !s.is_empty() => Ok(s),
        _ => Err(usage(format!(
            "key field {}={} must be nonempty text. Supply a text key, omit the field and state --of, or use --root for a keyless root. {RAW}",
            label(field),
            value(raw)
        ))),
    }
}

pub(crate) fn compare_key(draft: &Draft, field: &str, source: &str) -> Result<(), Fail> {
    let Some(thing) = draft.env.of.as_deref() else {
        return Ok(());
    };
    // A root has no natural key. Leave malformed addresses to the writer.
    if record_id(thing) || !typed_ref(thing) {
        return Ok(());
    }
    if let Some(raw) = member(&draft.payload, field) {
        let stated = key_text(field, raw)?;
        let (_, expected) = thing.split_once(':').expect("typed thing has a prefix");
        if stated != expected {
            return Err(usage(format!(
                "{}={} disagrees with the key {} of {} from {source}. Make {} agree with the thing or omit the field. {RAW}",
                label(field),
                value(raw),
                label(expected),
                label(thing),
                label(field)
            )));
        }
    }
    Ok(())
}

fn check_fields(kind: &Kind, payload: &Json) -> Result<(), Fail> {
    if let Some(rule) = &kind.lifecycle {
        if let Some(raw) = member(payload, &rule.field) {
            if !rule.lists(raw) {
                return Err(usage(format!(
                    "{}={} is not a listed lifecycle value. Use text from closed {} or active {}. {RAW}",
                    label(&rule.field),
                    value(raw),
                    names(rule.closed()),
                    names(rule.active())
                )));
            }
        }
    }
    if let Some(refs) = &kind.refs {
        for (field, prefixes) in refs {
            if let Some(raw) = member(payload, field) {
                let items = match raw {
                    Json::Arr(items) => items.as_slice(),
                    scalar => std::slice::from_ref(scalar),
                };
                for item in items {
                    check_reference(field, prefixes, item)?;
                }
            }
        }
    }
    Ok(())
}

fn check_reference(field: &str, prefixes: &[String], item: &Json) -> Result<(), Fail> {
    let text = match item {
        Json::Str(s) => Some(s.as_str()),
        _ => None,
    };
    let prefix = text
        .filter(|s| typed_ref(s))
        .and_then(|s| s.split_once(':'))
        .map(|(prefix, _)| prefix);
    let comma = text.is_some_and(|s| s.contains(','));
    if !comma
        && prefix
            .is_some_and(|p| prefixes.is_empty() || prefixes.iter().any(|allowed| allowed == p))
    {
        return Ok(());
    }
    let allowed = if prefixes.is_empty() {
        "any prefix (including r)".to_owned()
    } else {
        names(prefixes)
    };
    let field = label(field);
    let mut message = format!(
        "{field}: {} is not an allowed reference. Use a kind:key or a flat list of references. Allowed prefixes: {allowed}.",
        value(item)
    );
    if comma {
        let prefix = prefixes
            .first()
            .map(String::as_str)
            .or(prefix)
            .unwrap_or("kind");
        write!(message, " A comma in a reference is literal. For multiple targets use {field}:='[\"{prefix}:a\",\"{prefix}:b\"]'.").expect("write string");
    }
    Err(usage(format!("{message} {RAW}")))
}

/// Quote operands containing spaces or shell punctuation in a suggested command.
fn argument(s: &str) -> String {
    if !s.is_empty()
        && s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"_./:=-".contains(&c))
    {
        s.to_owned()
    } else if s.chars().any(char::is_control) {
        format!("$'{}'", s.as_bytes().escape_ascii())
    } else {
        format!("'{}'", s.replace('\'', "'\\''"))
    }
}

pub(crate) fn check_write(
    args: &[String],
    kind: Option<&Kind>,
    draft: &Draft,
    stated_sets: Option<&[String]>,
    would_infer_sets: impl FnOnce() -> bool,
) -> Result<(), Fail> {
    if stated_sets != Some(&[]) {
        if let Some(kind) = kind {
            let missing: Vec<_> = kind
                .every_write
                .iter()
                .filter(|field| member(&draft.payload, field).is_none())
                .collect();
            if !missing.is_empty() {
                let typed = args
                    .iter()
                    .map(|a| argument(a))
                    .collect::<Vec<_>>()
                    .join(" ");
                return Err(usage(format!(
                    "emit {typed}: missing every_write fields {}. State each field on this write, use --sets-nothing for a join with no payload fields, or use emit - for an exception.",
                    names(missing)
                )));
            }
        }
    }
    let Some(sets) = stated_sets else {
        return Ok(());
    };
    let Json::Obj(fields) = &draft.payload else {
        unreachable!("shorthand payload is an object")
    };
    let omitted = loops::json::canon_set(
        &fields
            .iter()
            .filter(|(k, _)| !sets.contains(k))
            .map(|(k, _)| k.clone())
            .collect::<Vec<_>>(),
    );
    if omitted.is_empty() {
        return Ok(());
    }
    let flags = omitted
        .iter()
        .map(|k| format!("--sets {}", argument(k)))
        .collect::<Vec<_>>()
        .join(" ");
    let fields = names(&omitted);
    let mut message = if sets.is_empty() {
        format!(
            "--sets-nothing cannot carry payload fields {fields}. Replace --sets-nothing with {flags}, or drop the fields."
        )
    } else {
        let mut msg = format!("--sets leaves out payload fields {fields}. Add {flags}.");
        if sets.iter().all(|k| member(&draft.payload, k).is_some()) && would_infer_sets() {
            msg.push_str(" You can also drop --sets to infer the keys on this revision.");
        }
        msg
    };
    message.push_str(" Use emit - to carry a payload field without setting it.");
    Err(usage(message))
}
