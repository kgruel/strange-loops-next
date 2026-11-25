//! Check the compact and full views against the records written by the walk.
use super::{Json, Store, fixed_store, monday, parse_json};

use std::fmt::Write;

const NAME: &str = "kiln:east";

struct View<'a> {
    heads: &'a [&'a str],
    records: usize,
    about: &'a str,
    values: &'a str,
    compact_rows: &'a str,
    fields: &'a str,
    rows: &'a str,
    live: &'a [(&'a str, &'a [&'a str])],
}

impl View<'_> {
    fn check(&self, store: &Store) {
        for full in [false, true] {
            let heads: Vec<_> = self
                .heads
                .iter()
                .map(|id| store.json(&["get", id]))
                .collect();
            let rows = if full { self.rows } else { self.compact_rows };
            let mut answer = vec![
                ("thing".into(), Json::Str(NAME.into())),
                (
                    "records".into(),
                    parse_json(&self.records.to_string()).expect("count"),
                ),
                ("values".into(), parse_json(self.values).expect("values")),
                ("heads".into(), Json::Arr(heads)),
                (
                    "about".into(),
                    Json::Arr(vec![Json::Str(self.about.into())]),
                ),
            ];
            if !rows.is_empty() {
                answer.push(("setters".into(), parse_json(rows).expect("rows")));
            }
            if full {
                let live = self
                    .live
                    .iter()
                    .map(|(id, keys)| {
                        let Json::Obj(mut line) = store.json(&["get", id]) else {
                            panic!("line")
                        };
                        line.push((
                            "keys".into(),
                            Json::Arr(keys.iter().map(|s| Json::Str((*s).into())).collect()),
                        ));
                        Json::Obj(line)
                    })
                    .collect();
                answer.push(("live".into(), Json::Arr(live)));
            }
            let args = if full {
                vec!["of", "--setters", NAME, "--json"]
            } else {
                vec!["of", NAME]
            };
            assert_eq!(
                monday(store, &args),
                format!("{}\n", Json::Obj(answer).canon())
            );
            if !full {
                let mut plain = format!(
                    "thing  {NAME}\nrecords  {}\nheads  {}{}\nabout  {}\n",
                    self.records,
                    self.heads.len(),
                    self.fields,
                    self.about
                );
                for id in self.heads {
                    writeln!(plain, "head  {id}\n  emitted  12 hours ago\n  occurred  —")
                        .expect("write string");
                }
                assert_eq!(monday(store, &["of", NAME, "--plain"]), plain);
            }
        }
    }
}

fn row(id: &str, shown: &str, value: Option<&str>) -> String {
    let value = value.map_or_else(String::new, |v| format!(r#","value":"{v}""#));
    format!(r#"{{"id":"{id}","shown":"{shown}"{value}}}"#)
}

fn emit(store: &Store, emitted: &str, args: &[&str]) -> String {
    let mut cmd = vec!["emit", "kiln", "--of", NAME, "--emitted", emitted];
    cmd.extend(args);
    store.ok(&cmd)
}

fn rows_with_first(first: &str) -> impl Fn(&str) -> String {
    let name = row(first, "here", Some("east"));
    let shelf = row(first, "here", Some("2"));
    let text = row(first, "here", Some("first"));
    move |cone: &str| {
        format!(r#"{{"name":[{name}],"shelf":[{shelf}],"text":[{text}],"cone":[{cone}]}}"#)
    }
}

#[test]
fn compact_bytes_and_all_live_setters() {
    let store = &fixed_store("kiln-setters");
    let later = "2026-11-19T23:59:58Z";
    let first = emit(
        store,
        "2026-11-19T23:59:57Z",
        &[
            "name=east",
            "cone=6",
            "shelf=2",
            "--about",
            "firing:one",
            "first",
        ],
    );
    let rows = rows_with_first(&first);
    let view = View {
        heads: &[&first],
        records: 1,
        about: "firing:one",
        values: r#"{"name":"east","shelf":"2","text":"first","cone":"6"}"#,
        compact_rows: "",
        fields: "\n  cone  \"6\"\n  name  east\n  shelf  \"2\"\n  text  first",
        rows: &rows(&row(&first, "here", Some("6"))),
        live: &[(&first, &["cone", "name", "shelf", "text"])],
    };
    view.check(store);
    let second = emit(
        store,
        later,
        &[
            "cone=9",
            "--sets",
            "cone",
            "--about",
            "firing:two",
            "second",
        ],
    );
    let second_row = row(&second, "here", Some("9"));
    let view = View {
        heads: &[&second],
        records: 2,
        about: "firing:two",
        values: r#"{"name":"east","shelf":"2","text":"first","cone":"9"}"#,
        fields: "\n  cone  \"9\"\n  name  east\n  shelf  \"2\"\n  text  first",
        rows: &rows(&second_row),
        live: &[(&second, &["cone"]), (&first, &["name", "shelf", "text"])],
        ..view
    };
    view.check(store);
    check_plain(store, &first, &second);
    let fork = emit(
        store,
        "2026-11-19T23:59:59Z",
        &["--base-id", &first, "cone=8", "--about", "firing:two"],
    );
    let conflict = format!("{},{}", row(&fork, "here", Some("8")), second_row);
    let remaining = r#"{"name":"east","shelf":"2","text":"first"}"#;
    let view = View {
        heads: &[&fork, &second],
        records: 3,
        values: remaining,
        compact_rows: &format!(r#"{{"cone":[{conflict}]}}"#),
        fields: "\n  cone  conflict (2): \"8\" | \"9\"\n  name  east\n  shelf  \"2\"\n  text  first",
        rows: &rows(&conflict),
        live: &[
            (&fork, &["cone"]),
            (&second, &["cone"]),
            (&first, &["name", "shelf", "text"]),
        ],
        ..view
    };
    view.check(store);
    let join = emit(store, later, &["--sets-nothing"]);
    let view = View {
        heads: &[&join],
        records: 4,
        ..view
    };
    view.check(store);
    let unset = emit(store, later, &["--sets", "cone"]);
    let view = View {
        heads: &[&unset],
        records: 5,
        compact_rows: "",
        fields: "\n  cone  —\n  name  east\n  shelf  \"2\"\n  text  first",
        rows: &rows(&row(&unset, "here", None)),
        live: &[(&unset, &["cone"]), (&first, &["name", "shelf", "text"])],
        ..view
    };
    view.check(store);
    store.ok(&["erase", &unset]);
    let erased = row(&unset, "erased", None);
    let view = View {
        compact_rows: &format!(r#"{{"cone":[{erased}]}}"#),
        rows: &rows(&erased),
        fields: "\n  cone  unknown\n  name  east\n  shelf  \"2\"\n  text  first",
        ..view
    };
    view.check(store);
}

fn check_plain(store: &Store, first: &str, second: &str) {
    let plain = monday(store, &["of", NAME, "--plain", "--setters"]);
    let original = monday(store, &["of", NAME, "--plain"]);
    assert_eq!(
        plain,
        format!(
            "{original}live  {second}\n  emitted  12 hours ago\n  keys  cone\n  about  firing:two\n  payload\n    cone  \"9\"\n    text  second\nlive  {first}\n  emitted  12 hours ago\n  keys  name shelf text\n  about  firing:one\n  payload\n    cone  \"6\"\n    name  east\n    shelf  \"2\"\n    text  first\n"
        )
    );
}

#[test]
fn no_keys_and_usage() {
    let store = fixed_store("kiln-no-keys");
    let report = store.json(&["of", NAME, "--setters"]);
    assert_eq!(super::at(&report, &["setters"]).canon(), "{}");
    assert_eq!(super::at(&report, &["live"]).canon(), "[]");
    for args in [
        &["of", "--setters"][..],
        &["of", NAME, "--unknown"],
        &["of", "--setters", "--unknown", NAME],
    ] {
        assert_eq!(store.fails(args, "").0, 2);
    }
}
