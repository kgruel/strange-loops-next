//! Binary64 boundaries from gaps:model/Loops/Number.lean and model/Gen/Checks.lean.
use loops::binary64::{Error, Number};
use std::collections::HashSet;

#[test]
fn checked_construction_preserves_finite_bits() {
    for bits in [
        0,
        0x8000_0000_0000_0000,
        1,
        0x8000_0000_0000_0001,
        0x000f_ffff_ffff_ffff,
        0x0010_0000_0000_0000,
        0x7fef_ffff_ffff_ffff,
        0xffef_ffff_ffff_ffff,
    ] {
        let number = Number::from_bits(bits).expect("finite bits");
        assert_eq!(number.bits(), bits, "bits {bits:016x}");
        assert_eq!(Number::try_from(f64::from_bits(bits)), Ok(number));
    }
    for bits in [
        0x7ff0_0000_0000_0000,
        0xfff0_0000_0000_0000,
        0x7ff0_0000_0000_0001,
        0x7ff8_0000_0000_0000,
        0xfff8_0000_0000_0001,
        u64::MAX,
    ] {
        assert_eq!(Number::from_bits(bits), Err(Error::NonFinite));
        assert_eq!(
            Number::try_from(f64::from_bits(bits)),
            Err(Error::NonFinite)
        );
    }
}

#[test]
fn parsing_accepts_complete_rfc8259_number_tokens() {
    for text in [
        "0",
        "-0",
        "1",
        "-10",
        "0.5",
        "-0.25",
        "1.0",
        "1e2",
        "1E2",
        "1e+2",
        "1E-2",
        "0e0",
        "-0.0e+10",
        "10.0100e-002",
        "1e0000000000000000000000000000000000000001",
    ] {
        let number = text.parse::<Number>().expect("RFC 8259 token");
        assert_eq!(
            number.bits(),
            text.parse::<f64>().expect("decimal float").to_bits(),
            "token {text}"
        );
    }
}

#[test]
fn parsing_rejects_non_json_spellings_and_surrounding_text() {
    for text in [
        "",
        "-",
        "+1",
        "01",
        "-01",
        "00.1",
        ".5",
        "-.5",
        "1.",
        "1.e2",
        "1e",
        "1E",
        "1e+",
        "1e-",
        "1e+-2",
        "1e2.0",
        "1_0",
        "0x10",
        "NaN",
        "nan",
        "inf",
        "Infinity",
        "-Infinity",
        " 1",
        "1 ",
        "1\n",
        "\t0",
        "1,",
        "[1]",
        "1 2",
        "1\0",
        "１",
        "١",
        "−1",
    ] {
        assert_eq!(
            text.parse::<Number>(),
            Err(Error::InvalidSyntax),
            "token {text:?}"
        );
    }
}

#[test]
fn parsing_rounds_halfway_values_to_even() {
    for (text, bits) in [
        (
            "1.00000000000000011102230246251565404236316680908203125",
            0x3ff0_0000_0000_0000,
        ),
        (
            "1.00000000000000011102230246251565404236316680908203126",
            0x3ff0_0000_0000_0001,
        ),
        (
            "1.00000000000000033306690738754696212708950042724609375",
            0x3ff0_0000_0000_0002,
        ),
        ("9007199254740990.5", 0x433f_ffff_ffff_fffe),
        ("9007199254740991.5", 0x4340_0000_0000_0000),
    ] {
        assert_eq!(
            text.parse::<Number>().expect("finite decimal").bits(),
            bits,
            "token {text}"
        );
    }
}

#[test]
fn parsing_allows_subnormals_and_signed_underflow() {
    for (text, bits) in [
        ("1e-400", 0),
        ("-1e-400", 0x8000_0000_0000_0000),
        ("2.4703282292062327e-324", 0),
        ("2.4703282292062328e-324", 1),
        ("-2.4703282292062328e-324", 0x8000_0000_0000_0001),
        ("5e-324", 1),
        ("2.225073858507201e-308", 0x000f_ffff_ffff_ffff),
        ("2.2250738585072014e-308", 0x0010_0000_0000_0000),
        ("1e-999999999999999999999999", 0),
    ] {
        assert_eq!(
            text.parse::<Number>().expect("finite decimal").bits(),
            bits,
            "token {text}"
        );
    }
}

#[test]
fn parsing_rounds_exact_subnormal_halfway_values_to_even() {
    for (coefficient, bits) in [(1_u8, 0_u64), (3, 2)] {
        // coefficient * 2^-1075 is an exact midpoint between adjacent subnormals.
        let digits = (num_bigint::BigUint::from(coefficient)
            * num_bigint::BigUint::from(5_u8).pow(1075))
        .to_string();
        let text = format!("0.{}{digits}", "0".repeat(1075 - digits.len()));
        assert_eq!(text.parse::<Number>().expect("exact midpoint").bits(), bits);
        assert_eq!(
            format!("-{text}")
                .parse::<Number>()
                .expect("negative exact midpoint")
                .bits(),
            bits | 0x8000_0000_0000_0000
        );
        if coefficient == 1 {
            assert_eq!(
                format!("{text}1")
                    .parse::<Number>()
                    .expect("just above the midpoint")
                    .bits(),
                1
            );
        }
    }
}

#[test]
fn parsing_refuses_overflow_but_accepts_finite_limits() {
    for text in ["1.7976931348623157e308", "1.7976931348623158e308"] {
        assert_eq!(
            text.parse::<Number>().expect("maximum finite").bits(),
            f64::MAX.to_bits()
        );
        assert_eq!(
            format!("-{text}")
                .parse::<Number>()
                .expect("minimum finite")
                .bits(),
            f64::MIN.to_bits()
        );
    }
    for text in [
        "1e400",
        "-1e400",
        "1.7976931348623159e308",
        "1e999999999999999999999999",
    ] {
        assert_eq!(
            text.parse::<Number>(),
            Err(Error::NonFinite),
            "token {text}"
        );
    }
}

#[test]
fn signed_zero_keeps_bitwise_equality_and_hashing_but_renders_as_zero() {
    let positive = Number::from_bits(0).expect("positive zero");
    let negative = Number::from_bits(0x8000_0000_0000_0000).expect("negative zero");
    assert_ne!(positive, negative);
    assert_eq!(HashSet::from([positive, negative]).len(), 2);
    for text in ["0", "0.0", "0e100", "0e999999999999999999999999"] {
        assert_eq!(text.parse::<Number>(), Ok(positive), "token {text}");
    }
    for text in ["-0", "-0.0", "-0e100", "-0e999999999999999999999999"] {
        assert_eq!(text.parse::<Number>(), Ok(negative), "token {text}");
    }
    for number in [positive, negative] {
        assert_eq!(number.canon(), "0");
        assert_eq!(number.to_string(), "0");
        assert_eq!(number.whole(), Some(0));
    }
}

#[test]
fn whole_reads_only_safe_integers_after_rounding() {
    for (text, expected) in [
        ("1.0", Some(1)),
        ("1e2", Some(100)),
        ("-1e2", Some(-100)),
        ("1e-400", Some(0)),
        ("-1e-400", Some(0)),
        ("9007199254740990.5", Some(9_007_199_254_740_990)),
        ("9007199254740991", Some(9_007_199_254_740_991)),
        ("-9007199254740991", Some(-9_007_199_254_740_991)),
        ("9007199254740992", None),
        ("-9007199254740992", None),
        ("9007199254740991.5", None),
        ("-9007199254740991.5", None),
        ("1.5", None),
        ("-0.5", None),
        ("5e-324", None),
        ("1.7976931348623157e308", None),
    ] {
        assert_eq!(
            text.parse::<Number>().expect("finite decimal").whole(),
            expected,
            "token {text}"
        );
    }
}

#[test]
fn canon_uses_ecmascript_exponent_boundaries_and_shortest_digits() {
    for (text, expected) in [
        ("1e-7", "1e-7"),
        ("1e-6", "0.000001"),
        ("1e-5", "0.00001"),
        ("1e20", "100000000000000000000"),
        ("1e21", "1e+21"),
        ("1e22", "1e+22"),
        ("-1e-6", "-0.000001"),
        ("-1e21", "-1e+21"),
        ("123.4500", "123.45"),
        ("1e2", "100"),
        ("0.0025", "0.0025"),
        ("333333333.33333329", "333333333.3333333"),
        ("5e-324", "5e-324"),
        ("-5e-324", "-5e-324"),
        ("1.7976931348623157e308", "1.7976931348623157e+308"),
    ] {
        let number = text.parse::<Number>().expect("finite decimal");
        assert_eq!(number.canon(), expected, "token {text}");
        assert_eq!(number.to_string(), expected, "token {text}");
    }
    for (bits, expected) in [
        (1e-6_f64.to_bits() - 1, "9.999999999999997e-7"),
        (1e-6_f64.to_bits() + 1, "0.0000010000000000000002"),
        (1e21_f64.to_bits() - 1, "999999999999999900000"),
        (1e21_f64.to_bits() + 1, "1.0000000000000001e+21"),
    ] {
        assert_eq!(
            Number::from_bits(bits).expect("finite bits").canon(),
            expected,
            "bits {bits:016x}"
        );
    }
}

#[test]
fn canon_rounds_shortest_decimal_ties_to_even() {
    // The first case is es6-numbers.txt:168. Node independently confirms all texts.
    for (bits, expected) in [
        (0x4314_3ff3_c1cb_0959, "1424953923781206.2"),
        (0x4314_3ff3_c1cb_095b, "1424953923781206.8"),
        (0x42e0_3329_67d5_a114, "142495392378120.62"),
        (0x42e0_3329_67d5_a11c, "142495392378120.88"),
        (0x3e60_0000_0000_0000, "2.9802322387695312e-8"),
    ] {
        for (sign, text) in [
            (0, expected.to_owned()),
            (1_u64 << 63, format!("-{expected}")),
        ] {
            let number = Number::from_bits(bits | sign).expect("finite bits");
            assert_eq!(number.canon(), text, "bits {:016x}", bits | sign);
            assert_eq!(number.to_string(), text);
            assert_eq!(text.parse::<Number>(), Ok(number));
        }
    }
}

#[test]
fn canon_keeps_power_of_two_intervals_and_neighbors() {
    // The exact value 2^-24 is halfway between these decimals, but only the upper
    // odd coefficient rounds back: its lower rounding interval is narrower.
    let power = Number::from_bits(0x3e70_0000_0000_0000).expect("2^-24");
    assert_ne!("5.960464477539062e-8".parse::<Number>(), Ok(power));
    // Node's JSON.stringify independently confirms these expected texts.
    for (bits, expected) in [
        (0x3e6f_ffff_ffff_ffff, "5.960464477539062e-8"),
        (0x3e70_0000_0000_0000, "5.960464477539063e-8"),
        (0x3e70_0000_0000_0001, "5.960464477539064e-8"),
        (0x3e5f_ffff_ffff_ffff, "2.980232238769531e-8"),
        (0x3e60_0000_0000_0001, "2.980232238769532e-8"),
        (0x4314_3ff3_c1cb_0958, "1424953923781206"),
        (0x4314_3ff3_c1cb_095a, "1424953923781206.5"),
        (0x4314_3ff3_c1cb_095c, "1424953923781207"),
        (0x430f_ffff_ffff_ffff, "1125899906842623.9"),
        (0x4310_0000_0000_0000, "1125899906842624"),
        (0x4310_0000_0000_0001, "1125899906842624.2"),
        (0x431f_ffff_ffff_ffff, "2251799813685247.8"),
        (0x4320_0000_0000_0000, "2251799813685248"),
        (0x4320_0000_0000_0001, "2251799813685248.5"),
        (0x433f_ffff_ffff_ffff, "9007199254740991"),
        (0x4340_0000_0000_0000, "9007199254740992"),
        (0x4340_0000_0000_0001, "9007199254740994"),
        (0x443f_ffff_ffff_ffff, "590295810358705600000"),
        (0x4440_0000_0000_0000, "590295810358705700000"),
        (0x4440_0000_0000_0001, "590295810358705800000"),
        (0x54b2_49ad_2594_c37d, "1e+100"),
        (0x7e37_e43c_8800_759c, "1e+300"),
    ] {
        for (sign, text) in [
            (0, expected.to_owned()),
            (1_u64 << 63, format!("-{expected}")),
        ] {
            let number = Number::from_bits(bits | sign).expect("finite bits");
            assert_eq!(number.canon(), text, "bits {:016x}", bits | sign);
            assert_eq!(text.parse::<Number>(), Ok(number));
        }
    }
}

#[test]
fn canonical_text_roundtrips_finite_bits_except_negative_zero() {
    let mut bits = 0_u64;
    for _ in 0..4096 {
        // A fixed sequence samples signs, exponents, and significands without a dependency.
        bits = bits.wrapping_mul(6_364_136_223_846_793_005).wrapping_add(1);
        if let Ok(number) = Number::from_bits(bits) {
            let text = number.canon();
            assert_eq!(
                text.parse::<Number>().expect("canonical decimal"),
                number,
                "bits {bits:016x}: {text}"
            );
        }
    }
}

#[test]
fn public_types_support_standard_error_and_value_traits() {
    fn value<T: Copy + std::fmt::Debug + Eq + std::hash::Hash + Send + Sync>() {}
    fn error<T: std::error::Error + Copy + Eq + Send + Sync + 'static>() {}
    value::<Number>();
    error::<Error>();
    assert_eq!(
        Error::InvalidSyntax.to_string(),
        "expected an RFC 8259 number token"
    );
    assert_eq!(
        Error::NonFinite.to_string(),
        "expected a finite binary64 value"
    );
}
