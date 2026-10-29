//! External binary64, JCS, and SUPERCOP fixtures.
use ed25519_dalek::{Signature, Signer, SigningKey};
use loops::{binary64::Number, json};
use serde::de::{self, Deserialize, Deserializer, MapAccess, SeqAccess, Visitor};
use std::{
    fmt, fs,
    path::{Path, PathBuf},
    process::Command,
};

#[derive(Debug)]
enum Value {
    Null,
    Bool(bool),
    Number(Number),
    String(String),
    Array(Vec<Self>),
    Object(Vec<(String, Self)>),
}

impl<'de> Deserialize<'de> for Value {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // RawValue keeps decimal tokens away from serde's numeric conversions and reserved map keys.
        let raw = Box::<serde_json::value::RawValue>::deserialize(deserializer)?;
        let text = raw.get();
        if matches!(text.as_bytes().first(), Some(b'-' | b'0'..=b'9')) {
            return text.parse().map(Self::Number).map_err(de::Error::custom);
        }
        let mut parser = serde_json::Deserializer::from_str(text);
        parser
            .deserialize_any(ValueVisitor)
            .map_err(de::Error::custom)
    }
}

struct ValueVisitor;
impl<'de> Visitor<'de> for ValueVisitor {
    type Value = Value;

    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("finite binary64 JSON with distinct object names")
    }
    fn visit_unit<E: de::Error>(self) -> Result<Value, E> {
        Ok(Value::Null)
    }
    fn visit_bool<E: de::Error>(self, value: bool) -> Result<Value, E> {
        Ok(Value::Bool(value))
    }
    fn visit_str<E: de::Error>(self, value: &str) -> Result<Value, E> {
        Ok(Value::String(value.into()))
    }
    fn visit_seq<A: SeqAccess<'de>>(self, mut sequence: A) -> Result<Value, A::Error> {
        let mut values = Vec::new();
        while let Some(value) = sequence.next_element()? {
            values.push(value);
        }
        Ok(Value::Array(values))
    }
    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Value, A::Error> {
        let mut members = Vec::new();
        while let Some((name, value)) = map.next_entry::<String, Value>()? {
            if members.iter().any(|(previous, _)| previous == &name) {
                return Err(de::Error::custom(format!("duplicate object name {name:?}")));
            }
            members.push((name, value));
        }
        Ok(Value::Object(members))
    }
}

impl Value {
    fn canon(&self) -> String {
        match self {
            Self::Null => "null".into(),
            Self::Bool(value) => value.to_string(),
            Self::Number(value) => value.canon(),
            Self::String(value) => json::quote(value),
            Self::Array(values) => format!(
                "[{}]",
                values.iter().map(Self::canon).collect::<Vec<_>>().join(",")
            ),
            Self::Object(members) => {
                let mut ordered: Vec<_> = members.iter().collect();
                ordered.sort_by(|left, right| json::str_cmp(&left.0, &right.0));
                format!(
                    "{{{}}}",
                    ordered
                        .into_iter()
                        .map(|(name, value)| format!("{}:{}", json::quote(name), value.canon()))
                        .collect::<Vec<_>>()
                        .join(",")
                )
            }
        }
    }
}

fn parse(source: &str) -> Result<Value, serde_json::Error> {
    let mut parser = serde_json::Deserializer::from_str(source);
    let value = Value::deserialize(&mut parser)?;
    parser.end()?;
    Ok(value)
}

fn jcs_pairs(root: &Path, files: &[PathBuf]) -> Result<Vec<(PathBuf, PathBuf)>, String> {
    let pairs: Vec<_> = [
        "arrays",
        "french",
        "structures",
        "unicode",
        "values",
        "weird",
    ]
    .into_iter()
    .map(|name| {
        (
            root.join("jcs/input").join(format!("{name}.json")),
            root.join("jcs/output").join(format!("{name}.json")),
        )
    })
    .collect();
    let mut expected: Vec<_> = pairs
        .iter()
        .flat_map(|(input, output)| [input.clone(), output.clone()])
        .collect();
    expected.sort();
    let mut actual = files.to_vec();
    actual.sort();
    if actual != expected {
        return Err(format!(
            "{}: JCS file pairs differ; expected {expected:?}, found {actual:?}",
            root.display()
        ));
    }
    Ok(pairs)
}

fn check_jcs(root: &Path, files: &[PathBuf]) -> Result<usize, String> {
    let pairs = jcs_pairs(root, files)?;
    for (input, output) in &pairs {
        let source =
            fs::read_to_string(input).map_err(|error| format!("{}: {error}", input.display()))?;
        let value = parse(&source).map_err(|error| format!("{}: {error}", input.display()))?;
        let expected =
            fs::read(output).map_err(|error| format!("{}: {error}", output.display()))?;
        if value.canon().as_bytes() != expected {
            return Err(format!(
                "{}: canonical bytes differ from {}",
                input.display(),
                output.display()
            ));
        }
    }
    Ok(pairs.len() * 2)
}

fn es6_row(source: &str) -> Result<(), String> {
    let (bits, expected) = source.split_once(',').ok_or("expected hex bits,decimal")?;
    if bits.is_empty() || bits.len() > 16 || !bits.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(format!("invalid binary64 bits {bits:?}"));
    }
    let bits = u64::from_str_radix(bits, 16).map_err(|error| error.to_string())?;
    let number = Number::from_bits(bits).map_err(|error| error.to_string())?;
    let actual = number.canon();
    if actual != expected {
        return Err(format!(
            "bits {bits:x}: expected {expected:?}, found {actual:?}"
        ));
    }
    Ok(())
}

fn check_es6(path: &Path) -> Result<(), String> {
    let source =
        fs::read_to_string(path).map_err(|error| format!("{}: {error}", path.display()))?;
    for (index, row) in source.lines().enumerate() {
        es6_row(row).map_err(|error| format!("{} row {}: {error}", path.display(), index + 1))?;
    }
    let count = source.lines().count();
    if count != 4000 {
        return Err(format!(
            "{}: expected 4000 rows, found {count}",
            path.display()
        ));
    }
    Ok(())
}

fn unhex(source: &str) -> Result<Vec<u8>, String> {
    if source.len() % 2 != 0 || !source.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(format!("invalid even-length hex {source:?}"));
    }
    source
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let text = std::str::from_utf8(pair).map_err(|error| error.to_string())?;
            u8::from_str_radix(text, 16).map_err(|error| error.to_string())
        })
        .collect()
}

struct SupercopCase {
    seed: [u8; 32],
    secret_public: [u8; 32],
    public: [u8; 32],
    message: Vec<u8>,
    signature: [u8; 64],
}

fn supercop_case(row: &str) -> Result<SupercopCase, String> {
    let fields: Vec<_> = row.split(':').collect();
    let [secret, public, message, attached, ""] = fields.as_slice() else {
        return Err("expected sk||pk:pk:msg:sig||msg: fields".into());
    };
    let secret = unhex(secret)?;
    let public = unhex(public)?;
    let message = unhex(message)?;
    let attached = unhex(attached)?;
    if secret.len() != 64 || public.len() != 32 || message.len() > 639 {
        return Err(format!(
            "invalid field byte lengths: secret {}, public {}, message {}",
            secret.len(),
            public.len(),
            message.len()
        ));
    }
    if attached.len() != 64 + message.len() || attached.get(64..) != Some(message.as_slice()) {
        return Err("attached signature has invalid length or message suffix".into());
    }
    Ok(SupercopCase {
        seed: secret[..32].try_into().map_err(|_| "invalid seed length")?,
        secret_public: secret[32..]
            .try_into()
            .map_err(|_| "invalid secret public key length")?,
        public: public.try_into().map_err(|_| "invalid public key length")?,
        message,
        signature: attached[..64]
            .try_into()
            .map_err(|_| "invalid signature length")?,
    })
}

fn check_supercop_row(row: &str) -> Result<(), String> {
    let case = supercop_case(row)?;
    let key = SigningKey::from_bytes(&case.seed);
    let public = key.verifying_key();
    if public.to_bytes() != case.secret_public || public.to_bytes() != case.public {
        return Err("derived public key differs from a stored public key".into());
    }
    if key.sign(&case.message).to_bytes() != case.signature {
        return Err("derived signature differs from stored signature".into());
    }
    public
        .verify_strict(&case.message, &Signature::from_bytes(&case.signature))
        .map_err(|error| format!("stored signature verification fails: {error}"))
}

fn check_supercop(path: &Path) -> Result<(), String> {
    let output = Command::new("gzip")
        .arg("-dc")
        .arg(path)
        .output()
        .map_err(|error| format!("{}: gzip fails: {error}", path.display()))?;
    if !output.status.success() {
        return Err(format!(
            "{}: gzip exits with {}: {}",
            path.display(),
            output.status,
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let source =
        String::from_utf8(output.stdout).map_err(|error| format!("{}: {error}", path.display()))?;
    for (index, row) in source.lines().enumerate() {
        check_supercop_row(row)
            .map_err(|error| format!("{} row {}: {error}", path.display(), index + 1))?;
    }
    let count = source.lines().count();
    if count != 128 {
        return Err(format!(
            "{}: expected 128 rows, found {count}",
            path.display()
        ));
    }
    Ok(())
}

pub(super) fn check(root: &Path, files: &[PathBuf]) -> Result<usize, String> {
    let consumed = check_jcs(root, files)?;
    check_supercop(&root.join("ed25519.input.gz"))?;
    check_es6(&root.join("es6-numbers.txt"))?;
    Ok(consumed)
}

#[test]
fn adapter_rejects_invalid_leaves_and_duplicate_names() {
    for source in [
        r#"{"a":1,"a":2}"#,
        r#"[{"a":1,"\u0061":2}]"#,
        "1e309",
        "[0,1e309]",
        r#"{"x":-1e9999}"#,
        "NaN",
        "Infinity",
        "-Infinity",
        "01",
        "+1",
        "1.",
        "1e",
        "[.5]",
        r#""\ud800""#,
        r#"{"\udfff":0}"#,
        "0 true",
    ] {
        assert!(parse(source).is_err(), "adapter case {source:?}");
    }
}

#[test]
fn adapter_sorts_utf16_and_preserves_raw_objects() {
    let source = r#"{"\ue000":1,"\ud83d\ude00":2,"$serde_json::private::Number":1e0}"#;
    let value = parse(source).unwrap_or_else(|error| panic!("adapter case {source}: {error}"));
    assert_eq!(
        value.canon(),
        "{\"$serde_json::private::Number\":1,\"😀\":2,\"\u{e000}\":1}",
        "adapter case {source}"
    );
    let source = "[1.0,-0,9007199254740993,1e-9999]";
    let value = parse(source).unwrap_or_else(|error| panic!("adapter case {source}: {error}"));
    assert_eq!(
        value.canon(),
        "[1,0,9007199254740992,0]",
        "adapter case {source}"
    );
}

#[test]
fn jcs_pairing_rejects_missing_extra_and_nested_files() {
    let root = Path::new("standard-case");
    let files: Vec<_> = ["input", "output"]
        .into_iter()
        .flat_map(|side| {
            [
                "arrays",
                "french",
                "structures",
                "unicode",
                "values",
                "weird",
            ]
            .into_iter()
            .map(move |name| root.join("jcs").join(side).join(format!("{name}.json")))
        })
        .collect();
    assert!(jcs_pairs(root, &files).is_ok(), "JCS case complete pairs");
    assert!(
        jcs_pairs(root, &files[..11]).is_err(),
        "JCS case missing file"
    );
    for extra in ["jcs/input/extra.json", "jcs/input/nested/arrays.json"] {
        let mut changed = files.clone();
        changed.push(root.join(extra));
        assert!(
            jcs_pairs(root, &changed).is_err(),
            "JCS case extra file {extra}"
        );
    }
}

#[test]
fn fixture_rows_reject_invalid_grammar() {
    for row in [
        "",
        "0",
        "0,0,0",
        "0,0 ",
        "0x0,0",
        "10000000000000000,0",
        "7ff0000000000000,Infinity",
    ] {
        assert!(es6_row(row).is_err(), "ES6 case row {row:?}");
    }
    for row in ["", "::::", "00:00:0:00:", "00:00:gg:00:", "00:00::00:extra"] {
        assert!(supercop_case(row).is_err(), "SUPERCOP case row {row:?}");
    }
    let secret = "00".repeat(64);
    let public = "00".repeat(32);
    let signature = "00".repeat(64);
    let row = format!("{secret}:{public}:01:{signature}02:");
    assert!(
        supercop_case(&row).is_err(),
        "SUPERCOP case suffix row {row}"
    );
}

#[test]
fn supercop_checks_each_key_signature_and_message() {
    fn hex(bytes: &[u8]) -> String {
        use std::fmt::Write;
        let mut text = String::with_capacity(bytes.len() * 2);
        for byte in bytes {
            write!(text, "{byte:02x}").expect("hex writes to a string");
        }
        text
    }
    let seed = [7_u8; 32];
    let message = b"fixture mutation";
    let key = SigningKey::from_bytes(&seed);
    let public = hex(&key.verifying_key().to_bytes());
    let signature = hex(&key.sign(message).to_bytes());
    let fields = [
        format!("{}{public}", hex(&seed)),
        public,
        hex(message),
        format!("{signature}{}", hex(message)),
        String::new(),
    ];
    assert!(
        check_supercop_row(&fields.join(":")).is_ok(),
        "SUPERCOP case valid synthetic record"
    );
    for (field, offset) in [(0, 0), (0, 64), (1, 0), (2, 0), (3, 0), (3, 128)] {
        let mut changed = fields.clone();
        let replacement = if changed[field].as_bytes()[offset] == b'0' {
            "1"
        } else {
            "0"
        };
        changed[field].replace_range(offset..=offset, replacement);
        assert!(
            check_supercop_row(&changed.join(":")).is_err(),
            "SUPERCOP case mutated field {field}, hex offset {offset}"
        );
    }
}
