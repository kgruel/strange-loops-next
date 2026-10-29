//! Test-only Gen.Read fixture ingestion and Gen.OccurredVectors.utc rendering.
pub(super) mod fold;
mod reader;
use loops::{json::Json, time::Moment};
use serde::de::{self, Deserialize, Deserializer, MapAccess, SeqAccess, Visitor};
use std::fmt;

struct Raw(Json);
impl<'de> Deserialize<'de> for Raw {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        // Gen.Read.number keeps arbitrary Ints and rejects fraction/exponent spellings.
        // RawValue preserves each number's lexeme without the arbitrary_precision
        // visitor's reserved-map-key collision, which would alter raw object members.
        let raw = Box::<serde_json::value::RawValue>::deserialize(d)?;
        let text = raw.get();
        if matches!(text.as_bytes().first(), Some(b'-' | b'0'..=b'9')) {
            return text
                .parse()
                .map(|i| Self(Json::Int(i)))
                .map_err(de::Error::custom);
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
        f.write_str("Lean integer JSON")
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
/// Gen.Read.parseJson (model/Gen/Read.lean), integer-only with raw member order.
pub(super) fn parse(text: &str) -> Json {
    let mut d = serde_json::Deserializer::from_str(text);
    let raw = Raw::deserialize(&mut d).expect("integer JSON vector");
    d.end().expect("no trailing JSON");
    raw.0
}
/// Gen.Read.unbase32 (model/Gen/Read.lean), test-fixture byte ingestion.
pub(super) fn decode(text: &str) -> Vec<u8> {
    let mut acc = 0_u32;
    let mut bits = 0;
    let mut out = Vec::new();
    for c in text.bytes() {
        let digit = b"abcdefghijklmnopqrstuvwxyz234567"
            .iter()
            .position(|b| *b == c)
            .expect("base32 vector digit");
        acc = (acc << 5) | u32::try_from(digit).expect("base32 index");
        bits += 5;
        if bits >= 8 {
            bits -= 8;
            out.push(u8::try_from((acc >> bits) & 255).expect("masked byte"));
        }
        acc &= (1 << bits) - 1;
    }
    assert_eq!(acc, 0, "nonzero padding bits");
    out
}
/// Gen.OccurredVectors.utc (model/Gen/Occurred.lean), exact fixture time text.
pub(super) fn utc(moment: &Moment) -> String {
    // Lean: Gen.OccurredVectors.{civil,utc}, model/Gen/Occurred.lean.
    let seconds = moment.seconds();
    let shifted_day = seconds.div_euclid(86400) + 719_468;
    let era = shifted_day.div_euclid(146_097);
    let doe = shifted_day - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year_number = yoe + era * 400 + i64::from(month <= 2);
    let year = if year_number < 0 {
        format!("-{:04}", -year_number)
    } else {
        format!("{year_number:04}")
    };
    let day_seconds = seconds.rem_euclid(86400);
    let frac = if moment.fraction().is_empty() {
        String::new()
    } else {
        format!(
            ".{}",
            moment
                .fraction()
                .iter()
                .map(u8::to_string)
                .collect::<String>()
        )
    };
    format!(
        "{year}-{month:02}-{day:02}T{:02}:{:02}:{:02}{frac}Z",
        day_seconds / 3600,
        day_seconds / 60 % 60,
        day_seconds % 60
    )
}
