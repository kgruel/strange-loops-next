//! Section and outcome helpers from model/Gen/Run.lean.
use super::reader::{list, members, required, text, texts};
use loops::{
    json::Json,
    lens::{self, Outcome, Section},
};

/// Lean: `Gen.lensRun`, `Gen.answer`, model/Gen/Run.lean.
pub(crate) fn answers(layer: &str, input: &Json) -> Result<Vec<Json>, String> {
    if layer != "lens/section" {
        return Err(format!("unsupported lens layer: {layer}"));
    }
    let kvs = members("input", &["base", "text"], input)?;
    let base = sections("input.base", required("input", kvs, "base")?)?;
    let text = texts("input.text", required("input", kvs, "text")?)?;
    let answer = match (lens::parse(&text), lens::edit(&base, &text)) {
        (Some(parsed), Some(outcomes)) => Json::Obj(vec![
            ("parsed".into(), doc(&parsed)),
            ("normalized".into(), lines(&lens::render(&parsed))),
            (
                "outcomes".into(),
                Json::Arr(outcomes.iter().map(outcome).collect()),
            ),
            ("applied".into(), doc(&lens::apply(&base, &outcomes))),
        ]),
        _ => Json::Obj(vec![
            ("parsed".into(), Json::Null),
            ("refused".into(), Json::Bool(true)),
        ]),
    };
    Ok(vec![answer])
}

pub(super) fn sections(path: &str, j: &Json) -> Result<Vec<Section>, String> {
    list(path, j)?
        .iter()
        .enumerate()
        .map(|(i, j)| {
            let p = format!("{path}[{i}]");
            let kvs = members(&p, &["id", "body"], j)?;
            Ok(Section {
                id: text(&format!("{p}.id"), required(&p, kvs, "id")?)?.into(),
                body: texts(&format!("{p}.body"), required(&p, kvs, "body")?)?,
            })
        })
        .collect()
}
pub(super) fn lines(xs: &[String]) -> Json {
    Json::Arr(xs.iter().cloned().map(Json::Str).collect())
}
pub(super) fn doc(xs: &[Section]) -> Json {
    Json::Arr(
        xs.iter()
            .map(|s| {
                Json::Obj(vec![
                    ("id".into(), Json::Str(s.id.clone())),
                    ("body".into(), lines(&s.body)),
                ])
            })
            .collect(),
    )
}
pub(super) fn outcome(o: &Outcome) -> Json {
    Json::Obj(match o {
        Outcome::Accepted { id, body } => vec![
            ("accepted".into(), Json::Str(id.clone())),
            ("body".into(), lines(body)),
        ],
        Outcome::Unknown { id } => vec![("unknown".into(), Json::Str(id.clone()))],
        Outcome::Absent { id } => vec![("absent".into(), Json::Str(id.clone()))],
    })
}

#[cfg(test)]
mod tests {
    use super::answers;
    use crate::parse;

    #[test]
    fn rejects_bad_shapes_layers_and_repeated_members() {
        for input in [
            "{}",
            r#"{"base":[],"text":[],"extra":0}"#,
            r#"{"base":[],"base":[],"text":[]}"#,
            r#"{"base":[{"id":"x","id":"y","body":[]}],"text":[]}"#,
            r#"{"base":[{"id":"x","body":[1]}],"text":[]}"#,
            r#"{"base":[],"text":[1]}"#,
        ] {
            assert!(answers("lens/section", &parse(input)).is_err(), "{input}");
        }
        assert!(answers("lens/other", &parse(r#"{"base":[],"text":[]}"#)).is_err());
    }

    #[test]
    fn refusal_and_empty_document_are_distinct() {
        let refused =
            answers("lens/section", &parse(r#"{"base":[],"text":["::: x"]}"#)).expect("shape");
        assert_eq!(refused, vec![parse(r#"{"parsed":null,"refused":true}"#)]);
        let empty = answers("lens/section", &parse(r#"{"base":[],"text":[]}"#)).expect("shape");
        assert_eq!(
            empty,
            vec![parse(
                r#"{"parsed":[],"normalized":[],"outcomes":[],"applied":[]}"#
            )]
        );
    }
}
