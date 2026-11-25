//! SD1's local presentation defaults and byte-for-byte isolation boundary.
use super::{SALT, Store, WHEN, fixed_emit, fixed_store, save_morning};
use std::{fs, path::PathBuf};

const SPEC: &str = r#"{"vertex":"kiln","from":[{"store":".","kind":["kiln"]}],"fold":{"kilns":{"latest-by":"of","follow":"keys"}}}"#;
const TWO: &str = r#"{"vertex":"kiln","from":[{"store":"."},{"store":"backups"}],"fold":{"kilns":{"latest-by":"of","follow":"keys"}}}"#;
const FULL: &str = r#"{"version":1,"note":"workshop","kinds":{
    "kiln":{"note":"kilns","key":"slug","headline":"title",
            "refs":{"yard":["yard","potter"],"workshop":[]},"lifecycle":{"field":"status","active":["hot",""],"closed":["cold"]},
            "preview":["status","yard"]},
    "potter":{"key":null},"workshop":{}}}"#;
const CHANGED: &str = r#"{"version":1,"kinds":{"kiln":{"key":"slug","preview":["title"]}}}"#;
const BAD: &str = r#"{"version":1,"kinds":{"#;
const UNKNOWN: &str =
    r#"{"version":1,"kinds":{"kiln":{},"potter":{"lifecycle":{"field":"status","clsoed":[]}}}}"#;

fn path(s: &Store) -> PathBuf {
    s.dir.join(".loops/store.json")
}

fn describe(s: &Store, bytes: impl AsRef<[u8]>) {
    fs::write(path(s), bytes).expect("fixture description");
}

fn kiln(s: &Store) -> String {
    fixed_emit(
        s,
        &[
            "kiln",
            "--of",
            "kiln:east",
            "--about",
            "yard:west",
            "name=Kiln",
            "title=East kiln",
            "slug=east",
            "status=hot",
            "yard=yard:west",
        ],
    )
}

fn stdout(s: &Store, args: &[&str], input: &str) -> Vec<u8> {
    let out = s.run(args, input);
    assert!(
        out.status.success(),
        "{args:?}: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(out.stderr.is_empty(), "{args:?}: {:?}", out.stderr);
    out.stdout
}

fn error(s: &Store, args: &[&str], input: &str, code: i32, at: &str) {
    let out = s.run(args, input);
    assert_eq!(out.status.code(), Some(code), "{args:?}");
    assert!(out.stdout.is_empty(), "{args:?}");
    let msg = String::from_utf8(out.stderr).expect("text diagnostic");
    assert!(
        msg.contains(path(s).to_str().expect("fixture path")),
        "{msg}"
    );
    assert!(msg.contains(at), "expected {at} in {msg}");
    assert!(!msg.starts_with("refused:"), "{msg}");
}

#[test]
fn every_existing_json_read_ignores_every_description() {
    let s = fixed_store("kiln-description-isolation");
    let id = kiln(&s);
    save_morning(&s, SPEC);
    let tick = s.ok(&["tick", "morning", "--emitted", WHEN, "--salt", SALT]);
    let spec_file = ".loops/vertices/morning.json";
    let cases: &[(&[&str], &str)] = &[
        (&["ls"], ""),
        (&["ls", "--things"], ""),
        (&["ls", "kiln:"], ""),
        (&["ls", "kiln:", "--fields", "status,title"], ""),
        (&["ls", "--fields", "yard"], ""),
        (&["of", "kiln:east"], ""),
        (&["get", &id], ""),
        (&["read", "morning"], ""),
        (&["read", "morning", "--values"], ""),
        (&["fold", spec_file], ""),
        (&["fold", spec_file, "--values"], ""),
        (&["fold", "-"], SPEC),
        (&["fold", "-", "--values"], SPEC),
        (&["tick", "--check", &tick], ""),
        (&["check"], ""),
        (&["export"], ""),
        (&["export", "--kind", "kiln"], ""),
        (&["export", "--of", "kiln:east"], ""),
        (&["export", "--about", "yard:west"], ""),
    ];
    let baseline: Vec<_> = cases
        .iter()
        .map(|(args, input)| stdout(&s, args, input))
        .collect();
    for desc in [None, Some(FULL), Some(CHANGED), Some(BAD), Some(UNKNOWN)] {
        if let Some(bytes) = desc {
            describe(&s, bytes);
        }
        for ((args, input), expected) in cases.iter().zip(&baseline) {
            for flags in [&[][..], &["--json"][..]] {
                assert_eq!(
                    stdout(&s, &[flags, args].concat(), input),
                    *expected,
                    "{args:?} {desc:?}"
                );
            }
        }
    }
}

#[test]
fn malformed_and_unknown_members_stop_only_plain_consumers_before_output() {
    let s = fixed_store("kiln-description-errors");
    kiln(&s);
    save_morning(&s, SPEC);
    let cases: &[(&[&str], &str)] = &[
        (&["ls", "--plain"], ""),
        (&["ls", "--things", "--plain"], ""),
        (&["ls", "kiln:", "--fields", "name", "--plain"], ""),
        (&["of", "kiln:east", "--plain"], ""),
        (&["read", "morning", "--plain"], ""),
        (&["fold", "-", "--values", "--plain"], SPEC),
    ];
    for (bytes, at) in [
        (BAD.as_bytes(), "$"),
        (UNKNOWN.as_bytes(), "kinds.potter.lifecycle.clsoed"),
        (&[0xff][..], "$"),
    ] {
        describe(&s, bytes);
        for (args, input) in cases {
            error(&s, args, input, 2, at);
        }
    }
    fs::remove_file(path(&s)).expect("remove fixture file");
    fs::create_dir(path(&s)).expect("directory in place of description");
    for (args, input) in cases {
        error(&s, args, input, 3, "store.json");
    }
    assert_eq!(
        s.ok(&["ls", "--json"]),
        r#"{"kinds":[{"kind":"kiln","records":1}]}"#
    );
}

#[test]
fn grammar_checks_the_version_and_kind_map() {
    let s = fixed_store("potter-description-grammar");
    for good in [
        FULL,
        CHANGED,
        r#"{"version":1,"kinds":{"kiln":{"note":"Use a slug."}}}"#,
        r#"{"version":1.0,"kinds":{}}"#,
        r#"{"version":1e0,"kinds":{"Workshop:kiln":{"key":null,"headline":"env.kind","lifecycle":{"field":"state","closed":["cold"]},"preview":[]},"backups-2":{"key":"slug","refs":{"yard.east":[]}}}}"#,
    ] {
        describe(&s, good);
        stdout(&s, &["ls", "--plain"], "");
    }
    for (json, at) in [
        ("[]", "$: expected an object"),
        ("{}", "version: missing"),
        (r#"{"version":1}"#, "kinds: missing"),
        (r#"{"version":"1","kinds":{}}"#, "version: expected"),
        (r#"{"version":3,"kinds":{}}"#, "version: expected"),
        (r#"{"version":1,"kinds":[]}"#, "kinds: expected"),
        (r#"{"version":1,"kinds":{},"note":false}"#, "note: expected"),
        (r#"{"version":1,"kinds":{},"stores":[]}"#, "stores: unknown"),
        (
            r#"{"version":1,"version":1,"kinds":{}}"#,
            "version: repeated",
        ),
        (
            r#"{"version":1,"kinds":{"kiln":{},"kiln":{}}}"#,
            "kinds.kiln: repeated",
        ),
        (
            r#"{"version":1,"kinds":{"kiln":[]}}"#,
            "kinds.kiln: expected",
        ),
        (
            r#"{"version":1,"kinds":{"":{}}}"#,
            "expected a nonempty kind name",
        ),
        (
            r#"{"version":1,"kinds":{"r":{"key":"slug"}}}"#,
            "kinds.r.key: keyed kind",
        ),
        (
            r#"{"version":1,"kinds":{"kiln:yard":{"key":"slug"}}}"#,
            "kinds.kiln:yard.key: keyed kind",
        ),
        (
            r#"{"version":1,"kinds":{"Kiln":{"key":"slug"}}}"#,
            "kinds.Kiln.key: keyed kind",
        ),
    ] {
        describe(&s, json);
        error(&s, &["ls", "--plain"], "", 2, at);
    }
}

#[test]
fn grammar_checks_each_kind_member_and_nested_name() {
    let s = fixed_store("kiln-description-grammar");
    for (members, at) in [
        (r#""note":1"#, "note: expected"),
        (r#""key":false"#, "key: expected"),
        (r#""key":"""#, "key: expected nonempty"),
        (r#""key_format":"<slug>""#, "key_format: unknown member"),
        (r#""key_format":null"#, "key_format: unknown member"),
        (r#""headline":null"#, "headline: expected"),
        (r#""headline":"""#, "headline: expected nonempty"),
        (r#""headline":"a","headline":"b""#, "headline: repeated"),
        (r#""headlien":"a""#, "headlien: unknown"),
        (r#""refs":"yard""#, "refs: expected"),
        (r#""refs":{"yard":"yard"}"#, "refs.yard: expected"),
        (r#""refs":{"yard":[1]}"#, "refs.yard[0]: expected"),
        (r#""refs":{"yard":[""]}"#, "refs.yard[0]: expected nonempty"),
        (
            r#""refs":{"yard":["yard","yard"]}"#,
            "refs.yard[1]: repeated",
        ),
        (r#""refs":{"yard":[],"yard":[]}"#, "refs.yard: repeated"),
        (r#""refs":{"env.about":[]}"#, "refs.env.about: expected"),
        (
            r#""refs":{"env.workshop":[]}"#,
            "refs.env.workshop: expected",
        ),
        (r#""refs":{"":[]}"#, r#"refs."": expected"#),
        (r#""lifecycle":[]"#, "lifecycle: expected"),
        (r#""lifecycle":{}"#, "lifecycle.field: missing"),
        (r#""lifecycle":{"field":true}"#, "lifecycle.field: expected"),
        (
            r#""lifecycle":{"field":""}"#,
            "lifecycle.field: expected nonempty",
        ),
        (
            r#""lifecycle":{"active":null}"#,
            "lifecycle.active: expected",
        ),
        (r#""lifecycle":{"closed":1}"#, "lifecycle.closed: expected"),
        (
            r#""lifecycle":{"active":[1]}"#,
            "lifecycle.active[0]: expected",
        ),
        (
            r#""lifecycle":{"closed":[{}]}"#,
            "lifecycle.closed[0]: expected",
        ),
        (
            r#""lifecycle":{"closed":["a","a"]}"#,
            "lifecycle.closed[1]: repeated",
        ),
        (
            r#""lifecycle":{"field":"a","field":"b"}"#,
            "lifecycle.field: repeated",
        ),
        (r#""lifecycle":{"clsoed":[]}"#, "lifecycle.clsoed: unknown"),
        (r#""preview":"name""#, "preview: expected"),
        (r#""preview":[false]"#, "preview[0]: expected"),
        (r#""preview":[""]"#, "preview[0]: expected nonempty"),
        (r#""preview":["yard","yard"]"#, "preview[1]: repeated"),
        (r#""search":["yard"]"#, "search: unknown member"),
        (r#""search":{}"#, "search: unknown member"),
        (r#""search":[1]"#, "search: unknown member"),
        (r#""search":[""]"#, "search: unknown member"),
        (r#""search":["yard","yard"]"#, "search: unknown member"),
    ] {
        describe(
            &s,
            format!(r#"{{"version":1,"kinds":{{"kiln":{{{members}}}}}}}"#),
        );
        error(&s, &["ls", "--plain"], "", 2, &format!("kinds.kiln.{at}"));
    }
}

#[test]
fn refs_accept_only_natural_kind_prefixes() {
    let s = fixed_store("kiln-description-refs");
    let write = |list: &str| {
        describe(
            &s,
            format!(r#"{{"version":1,"kinds":{{"kiln":{{"refs":{{"yard":{list}}}}}}}}}"#),
        );
    };
    for list in ["[]", r#"["r2","yard-2"]"#] {
        write(list);
        stdout(&s, &["ls", "--plain"], "");
    }
    for prefix in ["r", "Yard", "yard:west", "yard_2", "2yard"] {
        let list = format!(r#"["yard-2","{prefix}"]"#);
        write(&list);
        error(
            &s,
            &["ls", "--plain"],
            "",
            2,
            "$.kinds.kiln.refs.yard[1]: expected a kind prefix [a-z][a-z0-9-]* other than r",
        );
    }
}

#[test]
fn plain_headlines_previews_and_explicit_fields() {
    let s = fixed_store("yard-description-plain");
    kiln(&s);
    save_morning(&s, SPEC);
    let listing = |prefix| s.ok(&["ls", prefix, "--plain"]);
    let headline_views = |want| {
        for args in [
            &["ls", "--things", "--plain"][..],
            &["of", "kiln:east", "--plain"],
            &["read", "morning", "--plain"],
            &["read", "morning", "--values", "--plain"],
            &["fold", ".loops/vertices/morning.json", "--plain"],
            &[
                "fold",
                ".loops/vertices/morning.json",
                "--values",
                "--plain",
            ],
        ] {
            let view = s.ok(args);
            assert!(
                view.lines()
                    .any(|line| line.contains("kiln:east") && line.ends_with(want)),
                "{args:?}\n{view}"
            );
        }
    };
    let explicit = ["ls", "kiln:", "--fields", "yard,slug", "--plain"];
    let baseline = s.ok(&explicit);
    let original = listing("kiln:");
    assert!(original.ends_with("  Kiln"));
    describe(&s, FULL);
    headline_views("  East kiln");
    for prefix in ["kiln:", "kiln:e"] {
        let view = listing(prefix);
        assert!(
            view.lines()
                .next()
                .expect("header")
                .ends_with("status  yard")
        );
        assert!(view.ends_with("hot     yard:west"));
    }
    assert!(listing("ki").ends_with("  East kiln"));
    assert_eq!(s.ok(&explicit), baseline);
    assert!(
        s.ok(&["of", "kiln:east", "--plain"])
            .contains("  slug  east")
    );
    describe(&s, CHANGED);
    headline_views("  east");
    describe(
        &s,
        r#"{"version":1,"kinds":{"kiln":{"key":null,"preview":[]}}}"#,
    );
    assert_eq!(listing("kiln:"), original.replace("  Kiln", "  —"));
    describe(
        &s,
        r#"{"version":1,"kinds":{"kiln":{"headline":"missing","key":"slug"}}}"#,
    );
    headline_views("  —"); // The chosen field's value is missing.
}

#[test]
fn a_headline_needs_agreement_between_the_actual_head_kinds() {
    let s = fixed_store("workshop-description-heads");
    s.changeset(r#"{"kind":"yard","of":"kiln:east","sets":["name","title"],"payload":{"name":"Kiln","title":"East kiln"}}
{"kind":"potter","of":"kiln:east","sets":[]}"#);
    let spec = SPEC.replace(r#","kind":["kiln"]"#, "");
    save_morning(&s, &spec);
    for (declarations, want) in [
        (
            r#""yard":{"headline":"title"},"potter":{"key":"title"}"#,
            Some("East kiln"),
        ),
        (
            r#""yard":{"headline":"title"},"potter":{"headline":"yard"}"#,
            None,
        ),
        (r#""yard":{"headline":"title"},"potter":{}"#, None),
        (r#""yard":{"headline":"name"}"#, None),
        (r#""kiln":{"headline":"title"}"#, None),
    ] {
        describe(&s, format!(r#"{{"version":1,"kinds":{{{declarations}}}}}"#));
        let cell = want.unwrap_or("—");
        assert!(
            s.ok(&["ls", "--things", "--plain"])
                .ends_with(&format!("  {cell}"))
        );
        let mut expected = String::from("thing  kiln:east");
        if let Some(headline) = want {
            expected.push_str("  ");
            expected.push_str(headline);
        }
        for args in [
            &["of", "kiln:east", "--plain"][..],
            &["read", "morning", "--plain"],
            &["read", "morning", "--values", "--plain"],
            &["fold", "-", "--plain"],
            &["fold", "-", "--values", "--plain"],
        ] {
            let view = s.ok_with(args, if args[0] == "fold" { &spec } else { "" });
            assert!(
                view.lines().any(|line| line.trim_start() == expected),
                "{args:?}\n{view}"
            );
        }
    }
}

#[test]
fn only_the_working_store_supplies_plain_defaults_even_for_a_union() {
    let yard = fixed_store("yard-description-selected");
    let backups = fixed_store("backups-description-source");
    kiln(&backups);
    save_morning(&yard, TWO);
    let binding = format!("backups={}", backups.dir.display());
    let dest = format!("yard={}", yard.dir.display());
    let args = [
        "--store", &binding, "--store", &dest, "--in", "yard", "read", "morning",
    ];
    let expected = stdout(&backups, &args, "");
    describe(&backups, BAD);
    describe(&yard, FULL);
    assert_eq!(stdout(&backups, &args, ""), expected);
    assert_eq!(
        stdout(&backups, &[&args[..], &["--json"]].concat(), ""),
        expected
    );
    assert!(
        backups
            .ok(&[&args[..], &["--plain"]].concat())
            .contains("thing  kiln:east  East kiln\n")
    );
    describe(&yard, UNKNOWN);
    assert_eq!(stdout(&backups, &args, ""), expected);
    let bad = backups.run(&[&args[..], &["--plain"]].concat(), "");
    assert_eq!(bad.status.code(), Some(2));
    assert_eq!(bad.stdout, b"");
    assert!(
        String::from_utf8(bad.stderr)
            .expect("stderr")
            .contains(path(&yard).to_str().expect("path"))
    );

    // A fold outside a store can still read both named sources.
    let outside = Store::scratch("workshop-description-outside");
    let args = [
        "--store", &dest, "--store", &binding, "fold", "-", "--plain",
    ];
    assert!(
        outside
            .ok_with(&args, &TWO.replace(r#"".""#, r#""yard""#))
            .contains("thing  kiln:east  Kiln\n")
    );
}

#[test]
fn fixed_input_writers_keep_their_signed_lines() {
    let writes = |s: &Store| {
        let initial = format!(
            r#"{{"kind":"kiln","of":"kiln:east","payload":{{"slug":"east"}},"emitted":"{WHEN}","salt":"{SALT}"}}"#
        );
        let revision = format!(
            r#"{{"kind":"kiln","of":"kiln:east","payload":{{"status":"hot"}},"emitted":"{WHEN}","salt":"{SALT}"}}"#
        );
        [
            stdout(s, &["emit", "-"], &initial),
            stdout(s, &["emit", "-", "--fill"], &revision),
            stdout(s, &["tick", "-", "--salt", SALT, "--emitted", WHEN], SPEC),
            stdout(s, &["export"], ""),
        ]
    };
    let baseline = writes(&fixed_store("kiln-description-writes"));
    for (name, desc) in [
        ("yard-description-writes", FULL),
        ("workshop-description-writes", r#"{"version":1,"kinds":{}}"#),
        ("potter-description-writes", BAD),
        ("backups-description-writes", UNKNOWN),
    ] {
        let s = fixed_store(name);
        describe(&s, desc);
        assert_eq!(writes(&s), baseline);
    }
}

#[test]
fn headlines_keep_field_states_and_root_prefixes_keep_the_headline_column() {
    let s = fixed_store("potter-description-states");
    describe(
        &s,
        r#"{"version":1,"kinds":{"kiln":{"headline":"title"},"r":{"preview":["yard"]}}}"#,
    );
    let id = s.ok(&["emit", "kiln", "name=workshop", "title:=12"]);
    let row = || s.ok(&["ls", "r:", "--plain"]);
    assert!(row().ends_with("  —"));
    let second =
        format!(r#"{{"kind":"kiln","of":"{id}","sets":["title"],"payload":{{"title":"hot"}}}}"#);
    let fork = s.changeset(&second);
    assert!(row().contains("conflict (2):"));
    s.ok(&["erase", &fork[0]]);
    let view = s.ok(&["of", &id, "--plain"]);
    let line = view.lines().next().expect("thing headline");
    assert!(
        line.contains("conflict (2):") && line.contains("unknown"),
        "{line}"
    );
    let head = s.ok(&["emit", "kiln", "--of", &id, "title=East kiln"]);
    s.ok(&["erase", &head]);
    assert!(
        s.ok(&["of", &id, "--plain"])
            .lines()
            .next()
            .expect("thing headline")
            .ends_with("  unknown")
    );
}

#[test]
fn every_write_uses_the_version_two_kind_grammar() {
    let s = fixed_store("kiln-every-write-grammar");
    for (fields, at) in [
        ("[]", "every_write: expected"),
        (r#"[""]"#, "every_write[0]: expected nonempty"),
        (r#"["cone","cone"]"#, "every_write[1]: repeated"),
        (r#"["env.about"]"#, "every_write[0]: expected"),
        (r#"["name"]"#, "every_write[0]: also names"),
        ("null", "every_write: expected an array"),
    ] {
        describe(
            &s,
            format!(
                r#"{{"kinds":{{"kiln":{{"every_write":{fields},"key":"name"}}}},"version":2}}"#
            ),
        );
        error(&s, &["describe"], "", 2, &format!("kinds.kiln.{at}"));
    }
    let v2 = r#"{"kinds":{"kiln":{"every_write":["evidence"]}},"version":2}"#;
    describe(&s, v2);
    stdout(&s, &["describe"], "");
    describe(&s, v2.replace(":2", ":1"));
    error(
        &s,
        &["describe"],
        "",
        2,
        "kinds.kiln.every_write: unknown member",
    );
    describe(&s, FULL);
    let original = stdout(&s, &["ls", "kiln:", "--plain"], "");
    describe(&s, FULL.replace("\"version\":1", "\"version\":2"));
    assert_eq!(stdout(&s, &["ls", "kiln:", "--plain"], ""), original);
}
