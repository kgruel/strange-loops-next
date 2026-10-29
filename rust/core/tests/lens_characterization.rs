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
            let doc = vec![section(id, &[line, ":::", "\\x"]), section(id, &[])];
            let rendered = lens::render(&doc);
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
    let noncanonical = vec!["::: id".into(), "\\ordinary".into(), ":::".into()];
    let normal = lens::normalize(&noncanonical).expect("valid");
    assert_eq!(lens::normalize(&normal), Some(normal));
}

#[test]
fn no_op_and_put_get_require_unique_ordered_ids() {
    let base = vec![section("a", &["one"]), section("b", &["two"])];
    let edited = vec![section("a", &["changed"]), section("b", &["::: "])];
    assert_eq!(lens::edit(&base, &lens::render(&base)), Some(vec![]));
    assert_eq!(lens::apply(&base, &lens::diff(&base, &edited)), edited);
    let reversed = vec![edited[1].clone(), edited[0].clone()];
    assert_ne!(lens::apply(&base, &lens::diff(&base, &reversed)), reversed);
    let duplicate = vec![section("a", &["first"]), section("a", &["second"])];
    assert_ne!(
        lens::edit(&duplicate, &lens::render(&duplicate)),
        Some(vec![])
    );
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
