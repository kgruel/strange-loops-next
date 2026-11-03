//! Independent external standards, as required by the binary64 ruling in ROADMAP.md.
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use flate2::read::GzDecoder;
use loops::number::Number;
use std::{fs, io::Read, path::Path};

#[test]
fn all_4000_binary64_canonical_spellings_and_roundtrips() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vectors/standard/es6-numbers.txt");
    let source = fs::read_to_string(path).expect("ES6 standard data");
    let mut count = 0;
    let mut failures = Vec::new();
    let mut outside_writer_range = 0;
    for (index, line) in source.lines().enumerate() {
        let (hex, expected) = line.split_once(',').expect("hex,canon");
        let bits = u64::from_str_radix(hex, 16).expect("IEEE hex");
        let n = Number::new(f64::from_bits(bits)).expect("finite standard number");
        assert_eq!(n.bits(), bits, "constructor keeps finite bits at {index}");
        if !n.in_range() {
            outside_writer_range += 1;
        }
        if n.canon() != expected {
            failures.push(format!(
                "row {index}, {hex}: got {} expected {expected}",
                n.canon()
            ));
        }
        let roundtrip: Number = n.canon().parse().expect("canonical f64 parse");
        // JCS deliberately erases the zero sign, and no other bit.
        assert!(
            roundtrip.bits() == bits
                || (f64::from_bits(bits) == 0.0 && f64::from_bits(roundtrip.bits()) == 0.0),
            "roundtrip row {index}, {hex}"
        );
        count += 1;
    }
    assert_eq!(count, 4000);
    assert!(
        outside_writer_range > 0,
        "canon tests include unsafe magnitudes"
    );
    assert_eq!(failures, Vec::<String>::new(), "all standard rows executed");
}

#[test]
fn nonfinite_refused_and_negative_zero_written_as_zero() {
    for n in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        assert!(Number::new(n).is_err());
    }
    for raw in ["NaN", "Infinity", "-Infinity", "1e999", "-1e999"] {
        assert!(loops_eval::parse_json(raw).is_err(), "{raw}");
    }
    assert_eq!(
        Number::new(-0.0).expect("finite").bits(),
        (-0.0_f64).to_bits()
    );
    assert_eq!(Number::new(-0.0).expect("finite").canon(), "0");
    assert_eq!(loops_eval::parse_json("-0").expect("JSON").canon(), "0");
}

#[test]
fn all_128_supercop_signing_verifying_and_embedded_fields() {
    let path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../vectors/standard/ed25519.input.gz");
    let mut source = String::new();
    GzDecoder::new(fs::File::open(path).expect("SUPERCOP gzip"))
        .read_to_string(&mut source)
        .expect("gzip text");
    let mut count = 0;
    for (index, line) in source.lines().enumerate() {
        let fields: Vec<_> = line.split(':').collect();
        assert_eq!(fields.len(), 5, "sk||pk:pk:msg:sig||msg: row {index}");
        assert_eq!(fields[4], "", "trailing colon row {index}");
        let secret_public = hex::decode(fields[0]).expect("sk||pk hex");
        assert_eq!(secret_public.len(), 64, "sk||pk row {index}");
        let seed: [u8; 32] = secret_public[..32].try_into().expect("seed");
        let public: [u8; 32] = hex::decode(fields[1])
            .expect("pk hex")
            .try_into()
            .expect("pk length");
        assert_eq!(
            secret_public[32..],
            public,
            "embedded public key row {index}"
        );
        let message = hex::decode(fields[2]).expect("message hex");
        let signed_message = hex::decode(fields[3]).expect("sig||msg hex");
        assert_eq!(
            signed_message.len(),
            64 + message.len(),
            "sig||msg row {index}"
        );
        assert_eq!(
            signed_message[64..],
            message,
            "embedded message row {index}"
        );
        let signature = Signature::from_slice(&signed_message[..64]).expect("signature length");
        let signing = SigningKey::from_bytes(&seed);
        assert_eq!(
            signing.verifying_key().to_bytes(),
            public,
            "derived pk row {index}"
        );
        assert_eq!(signing.sign(&message), signature, "signature row {index}");
        let verifying = VerifyingKey::from_bytes(&public).expect("public key");
        verifying
            .verify(&message, &signature)
            .unwrap_or_else(|e| panic!("verify row {index}: {e}"));
        verifying
            .verify_strict(&message, &signature)
            .unwrap_or_else(|e| panic!("strict verify row {index}: {e}"));
        count += 1;
    }
    assert_eq!(count, 128);
}
