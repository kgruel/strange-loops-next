//! Section and outcome helpers from model/Gen/Run.lean.
use super::reader::{list, members, required, text, texts};
use loops::{
    json::Json,
    lens::{Outcome, Section},
};

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
