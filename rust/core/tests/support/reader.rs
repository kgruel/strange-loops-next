//! Gen.Read.record (model/Gen/Read.lean): shape checks, no writer-only validation.
use loops::{
    base32, envelope,
    json::Json,
    number::{Int, Nat},
    occurred::{Claim, Stamp},
    record::{Record, Shown, Val, id_text},
};

/// Gen.Read.members? (model/Gen/Read.lean), duplicates before unknown members.
pub(super) fn members<'a>(
    path: &str,
    allowed: &[&str],
    j: &'a Json,
) -> Result<&'a [(String, Json)], String> {
    let Json::Obj(kvs) = j else {
        return Err(format!("{path}: expected object"));
    };
    // Gen.Read.object checks duplicates before members? checks unknown keys.
    for (i, (k, _)) in kvs.iter().enumerate() {
        if kvs[..i].iter().any(|(earlier, _)| earlier == k) {
            return Err(format!("{path}: duplicate member {k}"));
        }
    }
    for (k, _) in kvs {
        if !allowed.contains(&k.as_str()) {
            return Err(format!("{path}: unknown member {k}"));
        }
    }
    Ok(kvs)
}
/// Gen.Read.req (model/Gen/Read.lean), no hidden fixture defaults.
pub(super) fn required<'a>(
    path: &str,
    kvs: &'a [(String, Json)],
    name: &str,
) -> Result<&'a Json, String> {
    optional(kvs, name).ok_or_else(|| format!("{path}: missing {name}"))
}
fn optional<'a>(kvs: &'a [(String, Json)], name: &str) -> Option<&'a Json> {
    kvs.iter().find(|(k, _)| k == name).map(|(_, v)| v)
}
/// Gen.Read.list (model/Gen/Read.lean), strict array shape.
pub(super) fn list<'a>(path: &str, j: &'a Json) -> Result<&'a [Json], String> {
    match j {
        Json::Arr(xs) => Ok(xs),
        _ => Err(format!("{path}: expected array")),
    }
}
fn text<'a>(path: &str, j: &'a Json) -> Result<&'a str, String> {
    match j {
        Json::Str(s) => Ok(s),
        _ => Err(format!("{path}: expected text")),
    }
}
fn int(path: &str, j: &Json) -> Result<Int, String> {
    match j {
        Json::Int(i) => Ok(i.clone()),
        _ => Err(format!("{path}: expected integer")),
    }
}
fn texts(path: &str, j: &Json) -> Result<Vec<String>, String> {
    list(path, j)?
        .iter()
        .enumerate()
        .map(|(i, j)| text(&format!("{path}[{i}]"), j).map(str::to_owned))
        .collect()
}
fn reader_id(path: &str, j: &Json) -> Result<Nat, String> {
    let s = text(path, j)?;
    if !envelope::record_id(s) {
        return Err(format!("{path}: expected record id"));
    }
    let mut acc = 0_u32;
    let mut bits = 0;
    let mut bytes = Vec::new();
    for c in s[2..].bytes() {
        let digit = b"abcdefghijklmnopqrstuvwxyz234567"
            .iter()
            .position(|b| *b == c)
            .ok_or_else(|| format!("{path}: invalid base32"))?;
        acc = (acc << 5) | u32::try_from(digit).map_err(|e| format!("{path}: {e}"))?;
        bits += 5;
        if bits >= 8 {
            bits -= 8;
            bytes.push(u8::try_from((acc >> bits) & 255).map_err(|e| format!("{path}: {e}"))?);
        }
        acc &= (1 << bits) - 1;
    }
    if bytes.len() != 32 || base32::base32(&bytes) != s[2..] {
        return Err(format!("{path}: noncanonical base32 digest"));
    }
    let n: Nat = num_bigint::BigUint::from_bytes_be(&bytes)
        .to_string()
        .parse()
        .map_err(|e| format!("{path}: {e}"))?;
    if id_text(&n) != s {
        return Err(format!("{path}: id does not round trip"));
    }
    Ok(n)
}
fn ids(path: &str, j: &Json) -> Result<Vec<Nat>, String> {
    list(path, j)?
        .iter()
        .enumerate()
        .map(|(i, j)| reader_id(&format!("{path}[{i}]"), j))
        .collect()
}
fn shown(path: &str, j: &Json) -> Result<Shown, String> {
    match text(path, j)? {
        "here" => Ok(Shown::Here),
        "withheld" => Ok(Shown::Withheld),
        "erased" => Ok(Shown::Erased),
        _ => Err(format!("{path}: unknown shown")),
    }
}
fn fields(path: &str, j: &Json) -> Result<Vec<(String, Val)>, String> {
    let Json::Obj(kvs) = j else {
        return Err(format!("{path}: expected fields object"));
    };
    // Reuse object duplicate validation, allowing precisely the written names.
    let allowed: Vec<_> = kvs.iter().map(|(k, _)| k.as_str()).collect();
    members(path, &allowed, j)?;
    kvs.iter()
        .map(|(k, v)| {
            if k == "value" || k == "n" {
                return Err(format!("{path}: builtin field {k}"));
            }
            let val = match v {
                Json::Str(s) => Val::Str(s.clone()),
                Json::Int(i) => Val::Int(i.clone()),
                Json::Bool(b) => Val::Bool(*b),
                _ => return Err(format!("{path}.{k}: expected primitive")),
            };
            Ok((k.clone(), val))
        })
        .collect()
}

/// Gen.Read.record (model/Gen/Read.lean), a strict reader form, not writer validation.
pub(super) fn record(path: &str, j: &Json) -> Result<Record, String> {
    let kvs = members(
        path,
        &[
            "id", "kind", "observer", "about", "value", "prev", "under", "emitted", "occurred",
            "erases", "n", "fields", "shown",
        ],
        j,
    )?;
    let req = |k| required(path, kvs, k);
    let p = |k| format!("{path}.{k}");
    let id = reader_id(&p("id"), req("id")?)?;
    let kind = text(&p("kind"), req("kind")?)?.into();
    let observer = text(&p("observer"), req("observer")?)?.into();
    let about = texts(&p("about"), req("about")?)?;
    let prev = ids(&p("prev"), req("prev")?)?;
    let under = optional(kvs, "under")
        .map(|j| reader_id(&p("under"), j))
        .transpose()?;
    let emitted = Stamp::of(text(&p("emitted"), req("emitted")?)?)
        .ok_or_else(|| format!("{}: invalid stamp", p("emitted")))?;
    let occurred = optional(kvs, "occurred")
        .map(|j| {
            Claim::of(text(&p("occurred"), j)?)
                .ok_or_else(|| format!("{}: invalid claim", p("occurred")))
        })
        .transpose()?;
    let erases = optional(kvs, "erases")
        .map(|j| ids(&p("erases"), j))
        .transpose()?
        .unwrap_or_default();
    let shown = optional(kvs, "shown")
        .map(|j| shown(&p("shown"), j))
        .transpose()?
        .unwrap_or_default();
    let base = Record {
        id,
        kind,
        observer,
        about,
        prev,
        under,
        emitted,
        occurred,
        erases,
        shown,
        ..Record::default()
    };
    if shown == Shown::Here {
        let value = text(&p("value"), req("value")?)?.into();
        let n = int(&p("n"), req("n")?)?;
        let fields = optional(kvs, "fields")
            .map(|j| fields(&p("fields"), j))
            .transpose()?
            .unwrap_or_default();
        Ok(Record {
            value,
            n,
            fields,
            ..base
        })
    } else {
        for k in ["value", "n", "fields"] {
            if optional(kvs, k).is_some() {
                return Err(format!("{path}: hidden payload carries {k}"));
            }
        }
        Ok(base)
    }
}
