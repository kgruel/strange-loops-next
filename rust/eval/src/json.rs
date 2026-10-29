//! RFC 8259 ingestion, preserving object order and repeated names.
use crate::Error;
use loops::{json::Json, number::Number};
use serde::de::{self, Deserialize, Deserializer, MapAccess, SeqAccess, Visitor};
use std::fmt;

struct Raw(Json);
impl<'de> Deserialize<'de> for Raw {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        // RawValue avoids serde_json's reserved number-map collision and gives
        // each numeric lexeme directly to binary64 parsing, exactly once.
        let raw = Box::<serde_json::value::RawValue>::deserialize(d)?;
        let text = raw.get();
        if matches!(text.as_bytes().first(), Some(b'-' | b'0'..=b'9')) {
            let n: Number = text.parse().map_err(de::Error::custom)?;
            return Ok(Self(n.whole().map_or(Json::Number(n), Json::Int)));
        }
        let mut parser = serde_json::Deserializer::from_str(text);
        parser
            .deserialize_any(RawVisitor)
            .map_err(de::Error::custom)
    }
}
struct RawVisitor;
impl<'de> Visitor<'de> for RawVisitor {
    type Value = Raw;
    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("RFC 8259 JSON with finite binary64 numbers")
    }
    fn visit_unit<E: de::Error>(self) -> Result<Raw, E> {
        Ok(Raw(Json::Null))
    }
    fn visit_bool<E: de::Error>(self, v: bool) -> Result<Raw, E> {
        Ok(Raw(Json::Bool(v)))
    }
    fn visit_str<E: de::Error>(self, v: &str) -> Result<Raw, E> {
        Ok(Raw(Json::Str(v.into())))
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut a: A) -> Result<Raw, A::Error> {
        let mut xs = Vec::new();
        while let Some(Raw(v)) = a.next_element()? {
            xs.push(v);
        }
        Ok(Raw(Json::Arr(xs)))
    }
    fn visit_map<A: MapAccess<'de>>(self, mut a: A) -> Result<Raw, A::Error> {
        let mut xs = Vec::new();
        while let Some((k, Raw(v))) = a.next_entry()? {
            xs.push((k, v));
        }
        Ok(Raw(Json::Obj(xs)))
    }
}

/// Parse RFC 8259 JSON, keeping duplicate members and their written order.
///
/// Numeric lexemes round once to finite binary64; safe-whole values become
/// `Json::Int`. Nonfinite results, malformed JSON, and lone surrogates fail.
/// This is an input decoder, not an exact-integer output decoder.
///
/// # Errors
/// Returns a location-bearing JSON error or a nonfinite-number refusal.
pub fn parse_json(text: &str) -> Result<Json, Error> {
    let mut d = serde_json::Deserializer::from_str(text);
    let raw = Raw::deserialize(&mut d)?;
    d.end()?;
    Ok(raw.0)
}

// Walk raw metadata without converting numeric lexemes, while asking serde_json
// to decode every string and object key as Unicode scalar values.
struct UnicodeChecked;
impl<'de> Deserialize<'de> for UnicodeChecked {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let raw = Box::<serde_json::value::RawValue>::deserialize(d)?;
        match raw.get().as_bytes().first() {
            Some(b'"') => {
                serde_json::from_str::<String>(raw.get()).map_err(de::Error::custom)?;
            }
            Some(b'[' | b'{') => {
                let mut parser = serde_json::Deserializer::from_str(raw.get());
                parser
                    .deserialize_any(UnicodeVisitor)
                    .map_err(de::Error::custom)?;
            }
            _ => {} // RawValue already checked syntax; numbers must remain untouched.
        }
        Ok(Self)
    }
}

struct UnicodeVisitor;
impl<'de> Visitor<'de> for UnicodeVisitor {
    type Value = ();
    fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("a JSON array or object")
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut a: A) -> Result<(), A::Error> {
        while a.next_element::<UnicodeChecked>()?.is_some() {}
        Ok(())
    }
    fn visit_map<A: MapAccess<'de>>(self, mut a: A) -> Result<(), A::Error> {
        while a.next_entry::<String, UnicodeChecked>()?.is_some() {}
        Ok(())
    }
}

pub(crate) fn validate_metadata(
    raw: &serde_json::value::RawValue,
) -> Result<(), serde_json::Error> {
    serde_json::from_str::<UnicodeChecked>(raw.get()).map(|_| ())
}

/// An envelope holds raw members so metadata (especially `expect`) is never
/// used in the computation. The JSON syntax still must be valid.
pub(crate) struct Envelope(pub Vec<(String, Box<serde_json::value::RawValue>)>);
impl<'de> Deserialize<'de> for Envelope {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct Entries;
        impl<'de> Visitor<'de> for Entries {
            type Value = Envelope;
            fn expecting(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str("a vector object")
            }
            fn visit_map<A: MapAccess<'de>>(self, mut a: A) -> Result<Envelope, A::Error> {
                let mut entries: Vec<(String, Box<serde_json::value::RawValue>)> = Vec::new();
                while let Some((k, v)) = a.next_entry()? {
                    if entries.iter().any(|(earlier, _)| earlier == &k) {
                        return Err(de::Error::custom(format!(
                            "the vector: duplicate member {k}"
                        )));
                    }
                    entries.push((k, v));
                }
                Ok(Envelope(entries))
            }
        }
        d.deserialize_map(Entries)
    }
}

#[cfg(test)]
mod tests {
    use super::parse_json;
    use loops::json::Json;

    #[test]
    fn raw_members_surrogates_and_number_grammar() {
        let j = parse_json(r#"{"z":0,"a":1,"z":2,"$serde_json::private::Number":"12"}"#)
            .expect("raw members");
        let Json::Obj(kvs) = j else { panic!("object") };
        assert_eq!(
            kvs.iter().map(|(k, _)| k.as_str()).collect::<Vec<_>>(),
            ["z", "a", "z", "$serde_json::private::Number"]
        );
        for bad in [
            "NaN",
            "Infinity",
            "-Infinity",
            "1e999",
            "-1e999",
            "01",
            "1.",
            "1e",
            "+1",
            "[1,]",
            r#""\ud800""#,
            r#""\udc00""#,
            "0 1",
        ] {
            assert!(parse_json(bad).is_err(), "{bad}");
        }
        assert_eq!(
            parse_json(r#""\ud834\udd1e""#).expect("pair"),
            Json::Str("𝄞".into())
        );
        for raw in ["-0", "-0.0", "-0e20", "0.0", "1e-999"] {
            assert_eq!(parse_json(raw).expect("zero").canon(), "0");
        }
        for (raw, expected) in [
            ("1.0", "1"),
            ("1e2", "100"),
            ("9007199254740993", "9007199254740992"),
            ("0.10000000000000001", "0.1"),
        ] {
            assert_eq!(parse_json(raw).expect("number").canon(), expected);
        }
    }
}
