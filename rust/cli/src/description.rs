//! The optional, store-local kind declarations for CLI readers and shorthand emit.
use crate::{Fail, plain::label, usage};
use loops::{envelope::typed_ref, json::Json, record::Record, where_::Field};
use std::{
    collections::{BTreeMap, HashSet},
    fs, io,
    path::Path,
};

#[derive(Default)]
pub(crate) struct Description {
    note: Option<String>,
    pub(crate) kinds: BTreeMap<String, Kind>,
}

#[derive(Default)]
pub(crate) struct Kind {
    note: Option<String>,
    key: Key,
    headline: Option<String>,
    pub(crate) refs: Option<BTreeMap<String, Vec<String>>>,
    pub(crate) lifecycle: Option<Lifecycle>,
    preview: Option<Vec<String>>,
    pub(crate) every_write: Vec<String>,
}

#[derive(Default)]
enum Key {
    #[default]
    Omitted,
    Null,
    Field(String),
}

#[derive(Default)]
pub(crate) struct Lifecycle {
    pub(crate) field: String,
    active: Vec<String>,
    closed: Vec<String>,
}

impl Description {
    /// The directory is the working store's opened .loops directory.
    pub(crate) fn load(dir: &Path) -> Result<Option<Self>, Fail> {
        Self::read(dir, Self::parse)
    }

    /// Keep the validated source for describe, including omitted members and explicit nulls.
    pub(crate) fn with_source(dir: &Path) -> Result<Option<(Self, Json)>, Fail> {
        Self::read(dir, |raw| Ok((Self::parse(raw.clone())?, raw)))
    }

    fn read<T>(
        dir: &Path,
        validate: impl FnOnce(Json) -> Result<T, String>,
    ) -> Result<Option<T>, Fail> {
        let path = dir.join("store.json");
        let bytes = match fs::read(&path) {
            Ok(bytes) => bytes,
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(Fail::System(format!("{}: {e}", path.display()))),
        };
        let invalid = |why: String| usage(format!("{}: {why}", path.display()));
        let input = std::str::from_utf8(&bytes).map_err(|e| invalid(format!("$: {e}")))?;
        let json = loops_eval::parse_json(input).map_err(|e| invalid(format!("$: {e}")))?;
        validate(json).map(Some).map_err(invalid)
    }

    fn parse(json: Json) -> Result<Self, String> {
        let mut desc = Self::default();
        // JSON object member order does not determine the kind grammar.
        let version_number =
            if crate::values::member(&json, "version") == Some(&Json::Int(2_u64.into())) {
                2
            } else {
                1
            };
        let mut version = false;
        let mut kinds = false;
        members(json, "$", |key, at, val| {
            match key.as_str() {
                "version" if val == Json::Int(1_u64.into()) || val == Json::Int(2_u64.into()) => {
                    version = true;
                }
                "version" => return Err(format!("{at}: expected version 1 or 2")),
                "note" => desc.note = Some(string(val, at)?),
                "kinds" => {
                    members(val, at, |name, at, val| {
                        if name.is_empty() {
                            return Err(format!("{at}: expected a nonempty kind name"));
                        }
                        let kind = Kind::parse(val, at, &name, version_number)?;
                        desc.kinds.insert(name, kind);
                        Ok(())
                    })?;
                    kinds = true;
                }
                _ => return Err(format!("{at}: unknown member")),
            }
            Ok(())
        })?;
        if !version {
            return Err("version: missing member".into());
        }
        if !kinds {
            return Err("kinds: missing member".into());
        }
        Ok(desc)
    }

    /// Every head kind must declare the same effective headline field.
    pub(crate) fn headline<'a>(&'a self, heads: &[Record]) -> Option<&'a str> {
        let mut fields = heads
            .iter()
            .map(|head| self.kinds.get(&head.kind)?.headline());
        let common = fields.next().flatten()?;
        fields.all(|field| field == Some(common)).then_some(common)
    }

    pub(crate) fn preview(&self, prefix: &str) -> Option<&[String]> {
        self.kinds.get(prefix_kind(prefix)?)?.preview.as_deref()
    }

    pub(crate) fn lifecycle(&self, kind: &str) -> Option<&Lifecycle> {
        self.kinds.get(kind)?.lifecycle.as_ref()
    }
}

pub(crate) fn prefix_kind(prefix: &str) -> Option<&str> {
    let (kind, _) = prefix.split_once(':')?;
    natural_kind(kind).then_some(kind)
}

// The reserved record-ID prefix selects roots across kinds.
fn natural_kind(name: &str) -> bool {
    name != "r" && !name.contains(':') && typed_ref(&format!("{name}:x"))
}

impl Kind {
    fn headline(&self) -> Option<&str> {
        self.headline.as_deref().or_else(|| self.key_field())
    }

    pub(crate) fn key_field(&self) -> Option<&str> {
        match &self.key {
            Key::Field(name) => Some(name.as_str()),
            Key::Null | Key::Omitted => None,
        }
    }

    fn parse(json: Json, path: &str, name: &str, version: u8) -> Result<Self, String> {
        let mut kind = Self::default();
        members(json, path, |key, at, val| {
            match key.as_str() {
                "note" => kind.note = Some(string(val, at)?),
                "headline" => kind.headline = Some(nonempty(val, at)?),
                "key" if val == Json::Null => kind.key = Key::Null,
                "key" => {
                    let field = nonempty(val, at)?;
                    if !natural_kind(name) {
                        return Err(format!(
                            "{at}: keyed kind needs a natural prefix other than r"
                        ));
                    }
                    kind.key = Key::Field(field);
                }
                "refs" => {
                    let mut refs = BTreeMap::new();
                    members(val, at, |field, at, targets| {
                        if !matches!(Field::of_name(&field), Some(Field::Payload(_))) {
                            return Err(format!("{at}: expected a payload field name"));
                        }
                        refs.insert(field, list(targets, at, kind_prefix)?);
                        Ok(())
                    })?;
                    kind.refs = Some(refs);
                }
                "lifecycle" => kind.lifecycle = Some(Lifecycle::parse(val, at)?),
                "every_write" if version == 2 => {
                    kind.every_write = list(val, at, payload_field)?;
                    if kind.every_write.is_empty() {
                        return Err(format!("{at}: expected at least one payload field"));
                    }
                }
                "preview" => kind.preview = Some(list(val, at, nonempty)?),
                _ => return Err(format!("{at}: unknown member")),
            }
            Ok(())
        })?;
        if let Some(i) = kind
            .every_write
            .iter()
            .position(|f| Some(f.as_str()) == kind.key_field())
        {
            return Err(format!(
                "{path}.every_write[{i}]: also names the kind’s key"
            ));
        }
        Ok(kind)
    }
}

impl Lifecycle {
    pub(crate) fn lists(&self, value: &Json) -> bool {
        matches!(value, Json::Str(s) if self.closed.contains(s) || self.active.contains(s))
    }

    pub(crate) fn closed(&self) -> &[String] {
        &self.closed
    }

    pub(crate) fn active(&self) -> &[String] {
        &self.active
    }

    fn parse(json: Json, path: &str) -> Result<Self, String> {
        let mut lifecycle = Self::default();
        members(json, path, |key, at, val| {
            match key.as_str() {
                "field" => lifecycle.field = nonempty(val, at)?,
                "active" => lifecycle.active = list(val, at, string)?,
                "closed" => lifecycle.closed = list(val, at, string)?,
                _ => return Err(format!("{at}: unknown member")),
            }
            Ok(())
        })?;
        if lifecycle.field.is_empty() {
            return Err(format!("{path}.field: missing member"));
        }
        if lifecycle.active.is_empty() && lifecycle.closed.is_empty() {
            return Err(format!(
                "{path}: expected at least one value in closed or active"
            ));
        }
        let closed: HashSet<_> = lifecycle.closed.iter().collect();
        for (i, value) in lifecycle.active.iter().enumerate() {
            if closed.contains(value) {
                return Err(format!(
                    "{path}.active[{i}]: {} also appears in closed",
                    label(value)
                ));
            }
        }
        Ok(lifecycle)
    }
}

fn members(
    json: Json,
    path: &str,
    mut visit: impl FnMut(String, &str, Json) -> Result<(), String>,
) -> Result<(), String> {
    let Json::Obj(entries) = json else {
        return Err(format!("{path}: expected an object"));
    };
    let mut seen = HashSet::new();
    for (name, value) in entries {
        let at = format!("{path}.{}", label(&name));
        if !seen.insert(name.clone()) {
            return Err(format!("{at}: repeated member"));
        }
        visit(name, &at, value)?;
    }
    Ok(())
}

fn string(json: Json, path: &str) -> Result<String, String> {
    match json {
        Json::Str(s) => Ok(s),
        _ => Err(format!("{path}: expected text")),
    }
}

fn nonempty(json: Json, path: &str) -> Result<String, String> {
    let s = string(json, path)?;
    if s.is_empty() {
        return Err(format!("{path}: expected nonempty text"));
    }
    Ok(s)
}

fn payload_field(json: Json, path: &str) -> Result<String, String> {
    let field = nonempty(json, path)?;
    if field.starts_with("env.") {
        return Err(format!("{path}: expected a payload field name"));
    }
    Ok(field)
}

fn kind_prefix(json: Json, path: &str) -> Result<String, String> {
    let s = nonempty(json, path)?;
    if !natural_kind(&s) {
        return Err(format!(
            "{path}: expected a kind prefix [a-z][a-z0-9-]* other than r"
        ));
    }
    Ok(s)
}

fn list(
    json: Json,
    path: &str,
    item: fn(Json, &str) -> Result<String, String>,
) -> Result<Vec<String>, String> {
    let Json::Arr(items) = json else {
        return Err(format!("{path}: expected an array"));
    };
    let mut strings = Vec::with_capacity(items.len());
    let mut seen = HashSet::new();
    for (i, v) in items.into_iter().enumerate() {
        let at = format!("{path}[{i}]");
        let s = item(v, &at)?;
        if !seen.insert(s.clone()) {
            return Err(format!("{at}: repeated list entry"));
        }
        strings.push(s);
    }
    Ok(strings)
}
