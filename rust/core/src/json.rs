//! Canonical integer JSON: Json and its helpers in model/Loops/Json.lean.
use crate::number::Int;
use std::cmp::Ordering;

/// Lean: `Loops.Json`, model/Loops/Json.lean.
/// This raw JSON value keeps object member order and duplicate names.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub enum Json {
    /// The JSON null value.
    #[default]
    Null,
    /// A true or false value.
    Bool(bool),
    /// An exact integer with no size bound.
    Int(Int),
    /// Text that contains Unicode scalar values.
    Str(String),
    /// An array that keeps value order.
    Arr(Vec<Json>),
    /// An object that keeps member order and duplicate names.
    Obj(Vec<(String, Json)>),
}
/// Lean: `Loops.strLt` and `Loops.utf16`, model/Loops/Json.lean.
/// Compares text by UTF-16 code units, not Unicode scalar values.
pub fn str_cmp(a: &str, b: &str) -> Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}
/// Lean: `Loops.canonSet`, model/Loops/Json.lean.
/// Returns distinct strings in UTF-16 order.
pub fn canon_set(xs: &[String]) -> Vec<String> {
    let mut ys = xs.to_vec();
    ys.sort_by(|a, b| str_cmp(a, b));
    ys.dedup();
    ys
}
/// Lean: `Loops.quote` and `Loops.escapeChar`, model/Loops/Json.lean.
/// Quotes JSON text and escapes control characters without changing other Unicode text.
pub fn quote(s: &str) -> String {
    use std::fmt::Write;
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c < '\u{20}' => {
                write!(out, "\\u00{:02x}", u32::from(c)).expect("String writes are infallible");
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}
impl Json {
    /// Lean: `Loops.Json.canon`, model/Loops/Json.lean.
    /// Writes canonical integer JSON and keeps the first member for each duplicate name.
    /// This function does not validate the value.
    pub fn canon(&self) -> String {
        match self {
            Self::Null => "null".into(),
            Self::Bool(b) => b.to_string(),
            Self::Int(i) => i.to_string(),
            Self::Str(s) => quote(s),
            Self::Arr(xs) => format!(
                "[{}]",
                xs.iter().map(Self::canon).collect::<Vec<_>>().join(",")
            ),
            Self::Obj(xs) => {
                // Stable sort preserves Lean's foldl/insertBy first-wins behavior.
                let mut members: Vec<_> = xs.iter().collect();
                members.sort_by(|a, b| str_cmp(&a.0, &b.0));
                members.dedup_by(|a, b| a.0 == b.0);
                format!(
                    "{{{}}}",
                    members
                        .into_iter()
                        .map(|(k, v)| format!("{}:{}", quote(k), v.canon()))
                        .collect::<Vec<_>>()
                        .join(",")
                )
            }
        }
    }
    /// Lean: `Loops.Json.keysDistinct`, model/Loops/Json.lean.
    /// Checks every raw object for duplicate member names, including nested objects.
    pub fn keys_distinct(&self) -> bool {
        match self {
            Self::Arr(xs) => xs.iter().all(Self::keys_distinct),
            Self::Obj(xs) => xs
                .iter()
                .enumerate()
                .all(|(i, (k, v))| !xs[..i].iter().any(|(p, _)| p == k) && v.keys_distinct()),
            _ => true,
        }
    }
    /// Lean: `Loops.Json.inRange` and `Loops.maxExact`, model/Loops/Json.lean.
    /// Checks every raw integer against ±(2^53 - 1), including values under duplicate names.
    pub fn in_range(&self) -> bool {
        match self {
            Self::Int(i) => {
                *i >= Int::from(-9_007_199_254_740_991_i64)
                    && *i <= Int::from(9_007_199_254_740_991_i64)
            }
            Self::Arr(xs) => xs.iter().all(Self::in_range),
            Self::Obj(xs) => xs.iter().all(|(_, v)| v.in_range()),
            _ => true,
        }
    }
}
