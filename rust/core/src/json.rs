//! Canonical integer JSON: Json and its helpers in model/Loops/Json.lean.
use crate::number::Int;
use std::cmp::Ordering;

/// Loops.Json (model/Loops/Json.lean): object lists retain order and duplicate members.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub enum Json {
    /// Json.null.
    #[default]
    Null,
    /// Json.bool.
    Bool(bool),
    /// Json.int; unbounded until the independent inRange check.
    Int(Int),
    /// Json.str, Unicode scalar text.
    Str(String),
    /// Json.arr, retaining list order.
    Arr(Vec<Json>),
    /// Json.obj, retaining member order and multiplicity.
    Obj(Vec<(String, Json)>),
}
/// strLt/utf16 (model/Loops/Json.lean), exposed as an ordering for Rust sorting.
pub fn str_cmp(a: &str, b: &str) -> Ordering {
    a.encode_utf16().cmp(b.encode_utf16())
}
/// canonSet (model/Loops/Json.lean): sorted, distinct strings in UTF-16 order.
pub fn canon_set(xs: &[String]) -> Vec<String> {
    let mut ys = xs.to_vec();
    ys.sort_by(|a, b| str_cmp(a, b));
    ys.dedup();
    ys
}
/// quote/escapeChar (model/Loops/Json.lean), without ASCII-escaping Unicode.
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
    /// Json.canon (model/Loops/Json.lean): sortBy keeps the FIRST equal-key member.
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
    /// Json.keysDistinct (model/Loops/Json.lean), including nested raw members.
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
    /// Json.inRange/maxExact (model/Loops/Json.lean); independent of keysDistinct.
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
