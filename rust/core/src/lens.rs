//! Keyed sections and their text representation from model/Loops/Lens.lean.
//! Each string represents one Lean character list. File line splitting stays outside this module.

/// A section with an opaque body. Lean: `Loops.Lens.Section`, model/Loops/Lens.lean.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Section {
    /// The section identifier.
    pub id: String,
    /// The body lines in their original order.
    pub body: Vec<String>,
}

/// The result of comparing an edited section with its base. Lean: `Loops.Lens.Outcome`, model/Loops/Lens.lean.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Outcome {
    /// A changed section that exists in the base.
    Accepted {
        /// The section identifier.
        id: String,
        /// The edited body.
        body: Vec<String>,
    },
    /// A section that does not exist in the base.
    Unknown {
        /// The section identifier.
        id: String,
    },
    /// A base section that is absent from the edit.
    Absent {
        /// The section identifier.
        id: String,
    },
}

/// Tests whether a body line needs an escape. Lean: `Loops.Lens.reserved`, model/Loops/Lens.lean.
#[must_use]
pub fn reserved(line: &str) -> bool {
    line.starts_with(":::") || line.starts_with('\\')
}

/// Escapes a reserved body line. Lean: `Loops.Lens.escape`, model/Loops/Lens.lean.
#[must_use]
pub fn escape(line: &str) -> String {
    if reserved(line) {
        format!("\\{line}")
    } else {
        line.to_owned()
    }
}

/// Removes only an escape that rendering would add. Lean: `Loops.Lens.unescape`, model/Loops/Lens.lean.
#[must_use]
pub fn unescape(line: &str) -> String {
    match line.strip_prefix('\\') {
        Some(rest) if reserved(rest) => rest.to_owned(),
        _ => line.to_owned(),
    }
}

/// Forms a section header without restricting its identifier. Lean: `Loops.Lens.header`, model/Loops/Lens.lean.
#[must_use]
pub fn header(id: &str) -> String {
    format!("::: {id}")
}

/// Returns the identifier after a header prefix. Lean: `Loops.Lens.headerId?`, model/Loops/Lens.lean.
#[must_use]
pub fn header_id(line: &str) -> Option<&str> {
    line.strip_prefix("::: ")
}

/// Renders sections in order as lines. Lean: `Loops.Lens.render`, model/Loops/Lens.lean.
#[must_use]
pub fn render(doc: &[Section]) -> Vec<String> {
    let mut lines = Vec::new();
    for section in doc {
        lines.push(header(&section.id));
        lines.extend(section.body.iter().map(|line| escape(line)));
        lines.push(":::".to_owned());
    }
    lines
}

/// Parses complete sections with nonempty, distinct ids; an empty document is valid.
/// Returns `None` for invalid syntax or ids. Lean: `Loops.Lens.parse`, model/Loops/Lens.lean.
#[must_use]
pub fn parse(lines: &[String]) -> Option<Vec<Section>> {
    let mut sections = Vec::new();
    let mut current: Option<Section> = None;
    for line in lines {
        if let Some(section) = &mut current {
            if line == ":::" {
                sections.push(current.take()?);
            } else if line.starts_with(":::") {
                return None;
            } else {
                section.body.push(unescape(line));
            }
        } else {
            let id = header_id(line)?;
            if id.is_empty() || sections.iter().any(|section: &Section| section.id == id) {
                return None;
            }
            current = Some(Section {
                id: id.to_owned(),
                body: Vec::new(),
            });
        }
    }
    if current.is_some() {
        None
    } else {
        Some(sections)
    }
}

/// Returns the body of the first section with this identifier. Lean: `Loops.Lens.lookup`, model/Loops/Lens.lean.
#[must_use]
pub fn lookup<'a>(id: &str, sections: &'a [Section]) -> Option<&'a [String]> {
    sections
        .iter()
        .find(|section| section.id == id)
        .map(|section| section.body.as_slice())
}

/// Compares one edited section with the first matching base section. Lean: `Loops.Lens.diffSection`, model/Loops/Lens.lean.
#[must_use]
pub fn diff_section(base: &[Section], section: &Section) -> Option<Outcome> {
    match lookup(&section.id, base) {
        Some(body) if body == section.body => None,
        Some(_) => Some(Outcome::Accepted {
            id: section.id.clone(),
            body: section.body.clone(),
        }),
        None => Some(Outcome::Unknown {
            id: section.id.clone(),
        }),
    }
}

/// Reports a base section when its identifier is absent from the edit. Lean: `Loops.Lens.absentSection`, model/Loops/Lens.lean.
#[must_use]
pub fn absent_section(edited: &[Section], section: &Section) -> Option<Outcome> {
    if edited.iter().any(|s| s.id == section.id) {
        None
    } else {
        Some(Outcome::Absent {
            id: section.id.clone(),
        })
    }
}

/// Reports edits first and absent base sections second. Lean: `Loops.Lens.diff`, model/Loops/Lens.lean.
#[must_use]
pub fn diff(base: &[Section], edited: &[Section]) -> Vec<Outcome> {
    edited
        .iter()
        .filter_map(|s| diff_section(base, s))
        .chain(base.iter().filter_map(|s| absent_section(edited, s)))
        .collect()
}

/// Returns the body of the first matching accepted outcome. Lean: `Loops.Lens.acceptedBody`, model/Loops/Lens.lean.
#[must_use]
pub fn accepted_body<'a>(id: &str, outcomes: &'a [Outcome]) -> Option<&'a [String]> {
    outcomes.iter().find_map(|outcome| match outcome {
        Outcome::Accepted {
            id: accepted_id,
            body,
        } if accepted_id == id => Some(body.as_slice()),
        _ => None,
    })
}

/// Applies the first accepted body to each matching base section. Lean: `Loops.Lens.apply`, model/Loops/Lens.lean.
#[must_use]
pub fn apply(base: &[Section], outcomes: &[Outcome]) -> Vec<Section> {
    base.iter()
        .map(|section| Section {
            id: section.id.clone(),
            body: accepted_body(&section.id, outcomes)
                .map_or_else(|| section.body.clone(), <[String]>::to_vec),
        })
        .collect()
}

/// Parses an edit and compares it with the base. Lean: `Loops.Lens.edit`, model/Loops/Lens.lean.
#[must_use]
pub fn edit(base: &[Section], text: &[String]) -> Option<Vec<Outcome>> {
    parse(text).map(|edited| diff(base, &edited))
}

/// Parses text and renders its normal form. Lean: `Loops.Lens.normalize`, model/Loops/Lens.lean.
#[must_use]
pub fn normalize(text: &[String]) -> Option<Vec<String>> {
    parse(text).map(|sections| render(&sections))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn section(id: &str, body: &[&str]) -> Section {
        Section {
            id: id.into(),
            body: body.iter().map(|s| (*s).into()).collect(),
        }
    }

    fn lines(values: &[&str]) -> Vec<String> {
        values.iter().map(|s| (*s).into()).collect()
    }

    #[test]
    fn parse_boundaries_and_normal_form() {
        assert_eq!(parse(&[]), Some(vec![]));
        assert_eq!(
            parse(&lines(&["::: x", ":::"])),
            Some(vec![section("x", &[])])
        );
        for text in [
            &["text"][..],
            &["::: x"][..],
            &["::: x", "::: y", ":::"][..],
            &[":::"][..],
        ] {
            assert_eq!(parse(&lines(text)), None, "input {text:?}");
        }
        let text = lines(&["::: x", "\\ordinary", ":::"]);
        assert_eq!(
            normalize(&text),
            Some(lines(&["::: x", "\\\\ordinary", ":::"]))
        );
    }

    #[test]
    fn empty_and_repeated_edited_ids_are_refused() {
        let base = vec![section("x", &["base"])];
        for edited in [
            vec![section("", &[])],
            vec![section("x", &["first"]), section("x", &["second"])],
            vec![section("new", &[]), section("new", &[])],
        ] {
            let text = render(&edited);
            assert_eq!(parse(&text), None, "edited sections {edited:?}");
            assert_eq!(edit(&base, &text), None, "edited sections {edited:?}");
            assert_eq!(normalize(&text), None, "edited sections {edited:?}");
        }
        assert_eq!(
            edit(&base, &[]),
            Some(vec![Outcome::Absent { id: "x".into() }])
        );
    }

    #[test]
    fn arbitrary_lines_and_ids_round_trip() {
        let doc = vec![
            section("\n\r::: ", &["", ":::", "::: x", "\\x", "a\nb\rc"]),
            section("other", &[]),
        ];
        assert_eq!(parse(&render(&doc)), Some(doc));
        for line in ["", "::", ":::", "::: x", "\\", "\\x", "a\nb\r"] {
            assert_eq!(unescape(&escape(line)), line);
        }
        assert_eq!(unescape("\\ordinary"), "\\ordinary");
    }

    #[test]
    fn edited_sections_pair_by_id_and_preserve_outcome_order() {
        let base = vec![
            section("x", &["x base"]),
            section("gone", &[]),
            section("y", &["y base"]),
        ];
        let edited = vec![
            section("y", &["y edit"]),
            section("new", &["unknown"]),
            section("x", &["x edit"]),
        ];
        let outcomes = edit(&base, &render(&edited)).expect("unique edited ids");
        assert_eq!(
            outcomes,
            vec![
                Outcome::Accepted {
                    id: "y".into(),
                    body: lines(&["y edit"])
                },
                Outcome::Unknown { id: "new".into() },
                Outcome::Accepted {
                    id: "x".into(),
                    body: lines(&["x edit"])
                },
                Outcome::Absent { id: "gone".into() },
            ]
        );
        assert_eq!(
            apply(&base, &outcomes),
            vec![
                section("x", &["x edit"]),
                section("gone", &[]),
                section("y", &["y edit"])
            ],
        );
    }

    #[test]
    fn duplicate_base_ids_keep_first_lookup_and_repeated_absence() {
        let base = vec![section("x", &["first"]), section("x", &["second"])];
        // A unique edit is compared only with the first base occurrence.
        assert_eq!(
            edit(&base, &render(&[section("x", &["first"])])),
            Some(vec![])
        );
        let outcomes = edit(&base, &render(&[section("x", &["second"])]))
            .expect("duplicate base ids are not refused");
        assert_eq!(
            outcomes,
            vec![Outcome::Accepted {
                id: "x".into(),
                body: lines(&["second"])
            }]
        );
        assert_eq!(
            apply(&base, &outcomes),
            vec![section("x", &["second"]), section("x", &["second"])]
        );
        assert_eq!(
            edit(&base, &[]),
            Some(vec![
                Outcome::Absent { id: "x".into() },
                Outcome::Absent { id: "x".into() }
            ])
        );
        // Validation belongs to edited text, not the unchecked base.
        assert_eq!(
            edit(&[section("", &[])], &[]),
            Some(vec![Outcome::Absent { id: String::new() }])
        );
    }

    #[test]
    fn line_lists_preserve_carriage_returns_and_body_empty_lines() {
        let text = lines(&["::: x\r", "", "\\::: body\r", ":::"]);
        let doc = vec![section("x\r", &["", "::: body\r"])];
        assert_eq!(parse(&text), Some(doc.clone()));
        assert_eq!(render(&doc), text);
        assert_eq!(parse(&lines(&["::: x", ":::\r"])), None);
        assert_eq!(parse(&lines(&["::: x", ":::", ""])), None);
    }

    #[test]
    fn duplicates_keep_order_and_first_matches() {
        let base = vec![
            section("x", &["a"]),
            section("x", &["b"]),
            section("gone", &[]),
        ];
        let edited = vec![
            section("x", &["b"]),
            section("x", &["c"]),
            section("new", &[]),
        ];
        let outcomes = diff(&base, &edited);
        assert_eq!(
            outcomes,
            vec![
                Outcome::Accepted {
                    id: "x".into(),
                    body: lines(&["b"])
                },
                Outcome::Accepted {
                    id: "x".into(),
                    body: lines(&["c"])
                },
                Outcome::Unknown { id: "new".into() },
                Outcome::Absent { id: "gone".into() }
            ]
        );
        assert_eq!(lookup("x", &base), Some(lines(&["a"]).as_slice()));
        assert_eq!(
            apply(&base, &outcomes),
            vec![
                section("x", &["b"]),
                section("x", &["b"]),
                section("gone", &[])
            ]
        );
        // The raw diff remains permissive, but the text edit refuses repeated ids.
        assert_eq!(edit(&base, &render(&edited)), None);
    }
}
