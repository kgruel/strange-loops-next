//! Premise and boundary cases for model/Laws/Lens.lean.
use loops::lens::{self, Outcome, Section};

fn section(id: &str, body: &[&str]) -> Section {
    Section {
        id: id.into(),
        body: body.iter().map(|s| (*s).into()).collect(),
    }
}

#[test]
fn parse_render_and_normalize_for_character_lists() {
    let values = ["", "é🦀", "\r\n", "::: x", "\\", "\\::: ", "a\nb\rc"];
    for id in values {
        for line in values {
            let doc = vec![
                section(id, &[line, ":::", "\\x"]),
                section(&format!("{id}-other"), &[]),
            ];
            let rendered = lens::render(&doc);
            if id.is_empty() {
                assert_eq!(lens::parse(&rendered), None, "empty edited id");
                assert_eq!(lens::normalize(&rendered), None);
                assert_eq!(lens::edit(&[], &rendered), None);
                continue;
            }
            assert_eq!(
                lens::parse(&rendered),
                Some(doc),
                "id {id:?}, line {line:?}"
            );
            assert_eq!(lens::normalize(&rendered), Some(rendered.clone()));
            assert_eq!(
                lens::normalize(&lens::normalize(&rendered).expect("valid")),
                Some(rendered)
            );
        }
    }
    for id in values {
        let duplicate = lens::render(&[section(id, &["first"]), section(id, &["second"])]);
        assert_eq!(lens::parse(&duplicate), None, "repeated edited id {id:?}");
        assert_eq!(lens::normalize(&duplicate), None);
        assert_eq!(lens::edit(&[], &duplicate), None);
    }
    let noncanonical = vec!["::: id".into(), "\\ordinary".into(), ":::".into()];
    let normal = lens::normalize(&noncanonical).expect("valid");
    assert_eq!(lens::normalize(&normal), Some(normal));
}

#[test]
fn no_op_and_put_get_require_unique_ordered_ids() {
    let base = vec![section("a", &["one"]), section("b", &["two"])];
    let edited = vec![section("a", &["changed"]), section("b", &["::: "])];
    let no_op = lens::edit(&base, &lens::render(&base)).expect("valid base");
    assert_eq!(no_op.outcomes, vec![]);
    assert_eq!(no_op.applied, base);
    let result = lens::edit(&base, &lens::render(&edited)).expect("valid edit");
    assert_eq!(result.applied, edited);
    let reversed = vec![edited[1].clone(), edited[0].clone()];
    assert_ne!(lens::apply(&base, &lens::diff(&base, &reversed)), reversed);
    let duplicate = vec![section("a", &["first"]), section("a", &["second"])];
    assert_eq!(lens::edit(&duplicate, &lens::render(&duplicate)), None);
    assert_ne!(
        lens::apply(&duplicate, &lens::diff(&duplicate, &duplicate)),
        duplicate
    );
}

#[test]
fn absent_unknown_and_duplicate_first_match() {
    let base = vec![section("x", &["first"]), section("x", &["second"])];
    let ignored = vec![
        Outcome::Absent { id: "x".into() },
        Outcome::Unknown { id: "x".into() },
    ];
    assert_eq!(lens::apply(&base, &ignored), base);
    assert_eq!(lens::lookup("x", &base), Some(base[0].body.as_slice()));
    let outcomes = vec![
        Outcome::Accepted {
            id: "x".into(),
            body: vec!["one".into()],
        },
        Outcome::Accepted {
            id: "x".into(),
            body: vec!["two".into()],
        },
    ];
    assert_eq!(
        lens::apply(&base, &outcomes),
        vec![section("x", &["one"]), section("x", &["one"])]
    );
}
