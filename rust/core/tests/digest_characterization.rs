//! Digest boundaries from model/Loops/Record.lean and model/Laws/Order.lean:46.
use loops::{
    fold,
    record::{Digest, Record, Val, id_digest, id_text},
    where_::{EnvField, Field, Item},
};

#[test]
fn digest_conversions_keep_exactly_32_bytes() {
    for bytes in [
        [0; 32],
        [255; 32],
        std::array::from_fn(|i| u8::try_from(i).expect("byte")),
    ] {
        let digest = Digest::from(bytes);
        assert_eq!(id_digest(&digest), &bytes);
        assert_eq!(
            Digest::try_from(bytes.as_slice()).expect("32 bytes"),
            digest
        );
    }
    for len in [0, 1, 31, 33, 64] {
        assert!(
            Digest::try_from(vec![0; len].as_slice()).is_err(),
            "length {len}"
        );
    }
}

#[test]
fn digest_order_uses_unsigned_bytes_from_most_significant_to_least() {
    let mut expected = vec![Digest([0; 32])];
    for index in (0..32).rev() {
        for bit in 0..8 {
            let mut bytes = [0; 32];
            bytes[index] = 1 << bit;
            expected.push(Digest(bytes));
        }
    }
    expected.push(Digest([255; 32]));
    for pair in expected.windows(2) {
        assert!(pair[0] < pair[1]);
        let older = Record {
            id: pair[0],
            ..Record::default()
        };
        let newer = Record {
            id: pair[1],
            ..Record::default()
        };
        assert!(newer.newer(&older));
        assert!(!older.newer(&newer));
        assert_eq!(fold::insert_id(pair[0], &[pair[1]]), pair);
    }
    let mut sorted = expected.iter().rev().copied().collect::<Vec<_>>();
    sorted.sort();
    assert_eq!(sorted, expected);
    let mut low = [255; 32];
    low[0] = 127;
    let mut high = [0; 32];
    high[0] = 128;
    assert!(Digest(low) < Digest(high));
    assert!(Digest([208; 32]) > Digest(high));
    assert!(
        id_text(&Digest([208; 32])) < id_text(&Digest(high)),
        "text order differs"
    );
}

#[test]
fn digest_text_and_consumers_keep_leading_and_high_bytes() {
    let mut high = [0; 32];
    high[0] = 128;
    for (digest, text) in [
        (Digest([0; 32]), format!("r:{}", "a".repeat(52))),
        (Digest([255; 32]), format!("r:{}q", "7".repeat(51))),
        (Digest(high), format!("r:q{}", "a".repeat(51))),
    ] {
        assert_eq!(id_text(&digest), text);
        let r = Record {
            id: digest,
            prev: vec![digest, digest],
            under: Some(digest),
            erases: vec![digest],
            ..Record::default()
        };
        assert_eq!(r.things(), vec![text.clone()]);
        assert!(r.is_about(&text));
        for (field, count) in [
            (EnvField::Prev, 2),
            (EnvField::Under, 1),
            (EnvField::Erases, 1),
        ] {
            assert_eq!(
                Field::Env(field).read(&r),
                Some(vec![Item::Val(Val::Str(text.clone())); count])
            );
        }
    }
}
