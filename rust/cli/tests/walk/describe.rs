//! Counts are over admitted things, distinct setters and immediate list members.
use super::{Json, Store, answer, at, fixed_store, parse_json, text};
use std::fs;

fn put(s: &Store, raw: &str) {
    fs::write(s.dir.join(".loops/store.json"), raw).expect("description");
}

fn sites(report: &Json) -> &[Json] {
    let Json::Arr(sites) = at(report, &["stores"]) else {
        panic!("stores array")
    };
    sites
}

fn site<'a>(report: &'a Json, store: &Store) -> &'a Json {
    let path = store.dir.canonicalize().expect("store directory");
    sites(report)
        .iter()
        .find(|s| text(s, &["directory"]) == path.to_str().expect("fixture path"))
        .expect("selected store")
}

fn expect(value: &Json, keys: &[&str], json: &str) {
    assert_eq!(
        at(value, keys).canon(),
        parse_json(json).expect("expected JSON").canon(),
        "{keys:?}"
    );
}

#[test]
fn descriptions_preserve_declarations_and_measure_key_and_lifecycle_drift() {
    let s = fixed_store("kiln-describe-fit");
    let description = r#"{"note":"Workshop kilns","version":1,"kinds":{
        "kiln":{"key":"slug","note":"Use a slug.","headline":"notes","preview":[],
                "lifecycle":{"field":"stage","closed":["cold"],"active":["hot"]}},
        "backups":{"key":null,"note":"Backups"},
        "yard":{"key":"name","refs":{"kilns":[]},"lifecycle":{"field":"stage","closed":["cold"]}}}}"#;
    put(&s, description);
    s.changeset(r#"{"kind":"kiln","of":"kiln:east:1","payload":{"slug":"east:1","stage":"parked"}}
{"kind":"kiln","of":"kiln:west","payload":{"slug":3,"stage":"cold"}}
{"kind":"kiln","of":"kiln:north","payload":{"slug":"south","stage":"hot"}}
{"kind":"kiln","of":"kiln:unset","payload":{}}
{"kind":"kiln","of":"kiln:fork","sets":["slug","stage"],"payload":{"slug":"east","stage":"parked"}}
{"kind":"kiln","of":"kiln:fork","sets":["slug","stage"],"payload":{"slug":"west","stage":{"yard":2}}}
{"kind":"potter","of":"potter:east","payload":{}}"#);
    let hidden = s.changeset(
        r#"{"kind":"kiln","of":"kiln:hidden","payload":{"slug":"hidden","stage":"parked"}}"#,
    );
    s.ok(&["erase", &hidden[0]]);
    let root = s.ok(&["emit", "kiln", "--root", "slug=old", "stage=hot"]);
    s.ok(&["emit", "kiln", "--prev", &root, "slug=new"]);
    let report = s.json(&["describe"]);
    let here = site(&report, &s);
    expect(here, &["description"], description);
    expect(
        here,
        &["fit", "kiln"],
        r#"{"declared":true,"things":7,
        "key":{"equal":1,"different":2,"unset":1,"conflict":1,"not_read":1,"keyless_roots":1},
        "lifecycle":{"outside":[{"value":"parked","count":2},{"value":{"yard":2},"count":1}],
                     "unset":1,"conflict":1,"not_read":1},"refs":{}}"#,
    );
    expect(
        here,
        &["fit", "potter"],
        r#"{"declared":false,"things":1,"key":null,"lifecycle":null,"refs":{}}"#,
    );
    expect(
        here,
        &["fit", "backups"],
        r#"{"declared":true,"things":0,"key":null,"lifecycle":null,"refs":{}}"#,
    );
    expect(
        here,
        &["fit", "yard"],
        r#"{"declared":true,"things":0,"key":{"equal":0,"different":0,"unset":0,"conflict":0,"not_read":0,"keyless_roots":0},
        "lifecycle":{"outside":[],"unset":0,"conflict":0,"not_read":0},
        "refs":{"kilns":{"held_here":0,"held_elsewhere_in_group":0,"not_in_group":0,"not_typed":0,"not_read":0,"without_mention":0,"unlisted_prefix":0,"things_unset":0}}}"#,
    );
    let plain = s.ok(&["describe", "--plain"]);
    for part in [
        "description  version 1",
        "note  Workshop kilns",
        "KIND",
        "DECLARATION",
        "THINGS",
        "keyless_roots",
        "outside values  2",
        "parked",
        "HERE",
        "ELSEWHERE IN SELECTED GROUP",
        "OUTSIDE SELECTED GROUP",
        "WITHOUT MENTION",
        "UNLISTED PREFIX",
    ] {
        assert!(plain.contains(part), "{part}\n{plain}");
    }
    assert!(plain.find("DECLARATION") < plain.find("fit\n"));
    assert_eq!(
        answer(&s, &["describe"], ""),
        (0, format!("{}\n", report.canon()), String::new())
    );
}

fn copy_id(from: &Store, to: &Store, id: &str) {
    to.ok_with(&["import"], &from.ok(&["get", id]));
}

#[test]
fn unlisted_prefix_counts_typed_occurrences_and_keeps_them_searchable() {
    let s = fixed_store("kiln-describe-prefixes");
    let root = s.ok(&["emit", "potter"]);
    s.ok(&[
        "emit",
        "kiln",
        "--of",
        "kiln:east",
        &format!(r#"owners:=["yard:east","potter:west","{root}","bare",["potter:west"]]"#),
    ]);
    for (prefixes, want) in [(r#"["yard"]"#, "2"), ("[]", "0")] {
        put(
            &s,
            &format!(r#"{{"version":1,"kinds":{{"kiln":{{"refs":{{"owners":{prefixes}}}}}}}}}"#),
        );
        let report = s.json(&["describe"]);
        let field = at(site(&report, &s), &["fit", "kiln", "refs", "owners"]);
        expect(field, &["unlisted_prefix"], want);
        expect(field, &["not_typed"], "2");
        for target in ["potter:west", &root] {
            expect(
                &s.json(&["ls", "--refers-to", target]),
                &["things"],
                r#"["kiln:east"]"#,
            );
        }
    }
}

#[test]
fn union_reads_new_heads_but_reports_each_locations_own_declarations_and_targets() {
    let shop = fixed_store("workshop-describe-union");
    let yard = fixed_store("yard-describe-union");
    let writer = fixed_store("backups-describe-union");
    let old = writer.ok(&[
        "emit",
        "kiln",
        "--of",
        "kiln:east",
        "--about",
        "yard:old",
        "owners=yard:old",
    ]);
    copy_id(&writer, &shop, &old);
    let next = writer.ok(&["emit","kiln","--prev",&old,"--about","yard:both",
        r#"owners:=["yard:local","yard:local","yard:local","yard:both","yard:remote","kiln:missing","yard:old","bare",["yard:local"],{},null,1,false]"#]);
    copy_id(&writer, &yard, &next);
    // Another kind on a parallel head supplies a separate setter and mention.
    shop.changeset(r#"{"kind":"potter","of":"kiln:east","sets":["owners"],"payload":{"owners":"yard:remote"},"about":["yard:remote"]}"#);
    shop.ok(&["emit", "yard", "--of", "yard:local"]);
    let both = shop.ok(&["emit", "yard", "--of", "yard:both"]);
    copy_id(&shop, &yard, &both);
    yard.ok(&["emit", "yard", "--of", "yard:remote"]);

    // The union's eraser hides a whole setter even where an opening still exists.
    let hidden = writer.ok(&["emit", "kiln", "--of", "kiln:hidden", "owners=yard:old"]);
    copy_id(&writer, &shop, &hidden);
    let eraser = writer.json(&["erase", &hidden]);
    copy_id(&writer, &yard, text(&eraser, &["id"]));
    shop.changeset(
        r#"{"kind":"kiln","of":"kiln:none","sets":["owners"],"payload":{}}
{"kind":"kiln","of":"kiln:empty","payload":{"owners":[]}}"#,
    );
    put(
        &shop,
        r#"{"version":1,"kinds":{"kiln":{"refs":{"owners":["potter"],"spare":[]}}}}"#,
    );
    put(
        &yard,
        r#"{"version":1,"kinds":{"kiln":{"refs":{"owners":[]}},"potter":{"key":null}}}"#,
    );
    let binding = format!("yard={}", yard.dir.display());
    let args = ["--store", &binding, "--in", "yard", "--in", ".", "describe"];
    let report = shop.json(&args);
    let a = site(&report, &shop);
    let b = site(&report, &yard);
    // Local three times, shared once, remote twice, missing and an obsolete mention.
    expect(
        a,
        &["fit", "kiln", "refs", "owners"],
        r#"{"held_here":4,"held_elsewhere_in_group":2,"not_in_group":2,"not_typed":6,"not_read":1,"without_mention":5,"unlisted_prefix":8,"things_unset":1}"#,
    );
    expect(
        b,
        &["fit", "kiln", "refs", "owners"],
        r#"{"held_here":3,"held_elsewhere_in_group":3,"not_in_group":2,"not_typed":6,"not_read":0,"without_mention":5,"unlisted_prefix":0,"things_unset":0}"#,
    );
    expect(a, &["fit", "kiln", "refs", "spare", "not_read"], "1");
    assert!(!super::has(b, &["fit", "kiln", "refs"], "spare"));
    expect(a, &["fit", "kiln", "things"], "4");
    expect(b, &["fit", "kiln", "things"], "1");
    for (store, declared) in [(a, "false"), (b, "true")] {
        expect(store, &["fit", "potter", "things"], "1");
        expect(store, &["fit", "potter", "declared"], declared);
    }
}

#[test]
fn local_group_membership_aliases_overrides_and_absence() {
    let s = fixed_store("workshop-describe-group");
    let yard = fixed_store("yard-describe-group");
    let local = s.dir.join("stores.json");
    let user = s.scratch.join("home/xdg-config/loops/stores.json");
    fs::write(&user, r#"{"backups":"missing"}"#).expect("user list");
    assert_eq!(
        answer(&s, &["--group", "describe"], ""),
        (2, String::new(), "--group needs a local stores.json".into())
    );
    fs::write(&local, "{}").expect("empty local list");
    assert_eq!(s.ok(&["--group", "describe"]), r#"{"stores":[]}"#);
    assert_eq!(s.ok(&["--group", "describe", "--plain"]), "stores  0");

    fs::write(&local, r#"{"workshop":".","potter":".","yard":"missing"}"#).expect("local list");
    let binding = format!("yard={}", yard.dir.display());
    let args = [
        "--store",
        &binding,
        "--store",
        "backups=missing",
        "--group",
        "describe",
    ];
    let report = s.json(&args);
    assert_eq!(sites(&report).len(), 2);
    for store in [&s, &yard] {
        expect(site(&report, store), &["description"], "null");
        expect(site(&report, store), &["fit"], "{}");
    }
    let named = [
        "--store", &binding, "--in", "yard", "--in", "potter", "--in", "yard", "--in", "workshop",
        "describe",
    ];
    assert_eq!(answer(&s, &args, ""), answer(&s, &named, ""));
    assert_eq!(
        answer(&s, &["describe"], ""),
        answer(&s, &["--in", "workshop", "describe"], "")
    );
    assert!(
        yard.ok(&["describe", "--plain"])
            .contains("description  none")
    );
    fs::write(&user, "{").expect("invalid unrelated user file");
    assert_eq!(s.json(&args), report);
    put(&s, "{");
    let failure = answer(&s, &["--group", "describe"], "");
    assert_eq!(failure.0, 1);
    assert_eq!(failure.1, "");
    assert!(
        failure.2.starts_with("refused: store-unknown: yard:"),
        "{}",
        failure.2
    );
    let failure = answer(&s, &args, "");
    assert_eq!(failure.0, 2);
    assert_eq!(failure.1, "");
    assert!(failure.2.contains(".loops/store.json"));
}

#[test]
fn describe_only_accepts_one_selection_mode_and_no_operands() {
    let absent = Store::scratch("workshop-describe-selectors");
    for args in [
        &["--in", "yard", "--group", "describe"][..],
        &["--group", "--in", "yard", "describe"],
        &["--group", "--group", "describe"],
        &["--group", "describe", "kiln"],
        &["--in", "yard", "describe", "--json", "--plain"],
    ] {
        let (code, out, _) = answer(&absent, args, "");
        assert_eq!((code, out.as_str()), (2, ""), "{args:?}");
    }
}

#[test]
fn target_residence_requires_union_admission_and_accepts_a_full_root_id() {
    use loops::{envelope::Env, stored};
    use loops_place::{key::Key, line::Line};
    let s = fixed_store("kiln-describe-admission");
    let yard = fixed_store("yard-describe-admission");
    put(
        &s,
        r#"{"version":1,"kinds":{"kiln":{"refs":{"owner":[]}}}}"#,
    );
    let root = yard.ok(&["emit", "potter"]);
    let key = Key::from_text(&"0".repeat(52)).expect("fixture key");
    let unrelated = stored::write(
        Env {
            kind: "yard".into(),
            of: Some("yard:other".into()),
            prev: vec![root.clone()],
            observer: key.public(),
            emitted: super::WHEN.into(),
            ..Env::default()
        },
        vec![0; 16],
        Json::Null,
    )
    .expect("signed fixture draft");
    s.ok_with(&["import"], &Line::sign(&unrelated, &key).render());
    s.ok(&[
        "emit",
        "kiln",
        "--of",
        "kiln:east",
        &format!(r#"owner:=["yard:other","{root}"]"#),
    ]);
    let single = s.json(&["describe"]);
    expect(
        site(&single, &s),
        &["fit", "kiln", "refs", "owner", "held_here"],
        "1",
    );
    let binding = format!("yard={}", yard.dir.display());
    let joined = s.json(&["--store", &binding, "--in", ".", "--in", "yard", "describe"]);
    let here = site(&joined, &s);
    assert!(!super::has(here, &["fit"], "yard"));
    expect(
        here,
        &["fit", "kiln", "refs", "owner"],
        r#"{"held_here":0,"held_elsewhere_in_group":1,"not_in_group":1,"not_typed":0,"not_read":0,"without_mention":2,"unlisted_prefix":0,"things_unset":0}"#,
    );
}

#[test]
fn report_checked_lines_then_identify_the_unclean_store() {
    let s = fixed_store("workshop-describe-dirty");
    let yard = fixed_store("yard-describe-clean");
    s.ok(&["emit", "potter", "name=potter"]);
    let segment = s.segments().pop().expect("fixture segment");
    let bytes = fs::read_to_string(&segment)
        .expect("read segment")
        .replace("potter", "kiln");
    fs::write(segment, bytes).expect("tamper scratch line");
    let binding = format!("yard={}", yard.dir.display());
    let (status, out, err) = answer(
        &s,
        &["--store", &binding, "--in", ".", "--in", "yard", "describe"],
        "",
    );
    assert_eq!(status, 1);
    let report = parse_json(&out).expect("complete report");
    assert_eq!(sites(&report).len(), 2);
    expect(site(&report, &s), &["fit"], "{}");
    assert!(err.starts_with("refused: store-not-clean:"), "{err}");
    assert!(
        err.ends_with(&format!("(stores: {})", s.dir.display())),
        "{err}"
    );
}

#[test]
fn one_shared_setter_counts_once_even_with_different_local_visibility() {
    let writer = fixed_store("potter-describe-writer");
    let shop = fixed_store("workshop-describe-bare");
    let yard = fixed_store("yard-describe-open");
    let id = writer.ok(&[
        "emit",
        "kiln",
        "--of",
        "kiln:east",
        r#"owners:=["yard:missing","yard:missing"]"#,
    ]);
    copy_id(&writer, &yard, &id);
    writer.ok(&["erase", &id]);
    copy_id(&writer, &shop, &id); // Just the bare line, without the eraser.
    for s in [&shop, &yard] {
        put(
            s,
            r#"{"version":1,"kinds":{"kiln":{"refs":{"owners":[]}}}}"#,
        );
    }
    let single = shop.json(&["describe"]);
    expect(
        site(&single, &shop),
        &["fit", "kiln", "refs", "owners", "not_read"],
        "1",
    );
    let binding = format!("yard={}", yard.dir.display());
    let report = shop.json(&["--store", &binding, "--in", "yard", "--in", ".", "describe"]);
    for entry in sites(&report) {
        expect(entry, &["fit", "kiln", "things"], "1");
        expect(
            entry,
            &["fit", "kiln", "refs", "owners"],
            r#"{"held_here":0,"held_elsewhere_in_group":0,"not_in_group":2,
            "not_typed":0,"not_read":0,"without_mention":2,"unlisted_prefix":0,"things_unset":0}"#,
        );
    }
}

#[cfg(unix)]
#[test]
fn two_working_directories_linking_the_same_data_count_once() {
    let shop = fixed_store("workshop-describe-links");
    let alias = shop.scratch.join("potter");
    fs::create_dir(&alias).expect("alias store directory");
    std::os::unix::fs::symlink(shop.dir.join(".loops"), alias.join(".loops")).expect("shared data");
    let binding = format!("potter={}", alias.display());
    let named = shop.ok(&["--store", &binding, "--in", "potter", "describe"]);
    assert_eq!(
        named,
        shop.ok(&["-C", alias.to_str().expect("alias path"), "describe"])
    );
    let both = shop.json(&[
        "--store", &binding, "--in", ".", "--in", "potter", "describe",
    ]);
    assert_eq!(sites(&both).len(), 1);
    assert_eq!(
        text(&sites(&both)[0], &["directory"]),
        alias.to_str().expect("first canonical directory")
    );
}

#[test]
fn reference_fields_count_things_left_unset() {
    let s = fixed_store("kiln-describe-unset");
    put(
        &s,
        r#"{"version":1,"kinds":{"kiln":{"refs":{"evidence":["firing"]}}}}"#,
    );
    let check = |expected: usize| {
        let report = s.json(&["describe"]);
        expect(
            site(&report, &s),
            &["fit", "kiln", "refs", "evidence", "things_unset"],
            &expected.to_string(),
        );
        let plain = s.ok(&["describe", "--plain"]);
        let mut table = plain
            .split("kiln references\n")
            .nth(1)
            .expect("references")
            .lines();
        assert!(
            table
                .next()
                .expect("header")
                .ends_with("UNLISTED PREFIX  THINGS UNSET")
        );
        let row = table.next().expect("evidence row");
        assert_eq!(
            row.split_whitespace().last(),
            Some(expected.to_string().as_str())
        );
    };
    check(0);
    s.ok(&["emit", "kiln", "--of", "kiln:east"]);
    check(1);
    s.ok(&["emit", "kiln", "--of", "kiln:west", "evidence=firing:one"]);
    s.ok(&["emit", "kiln", "--of", "kiln:west", "--sets", "evidence"]);
    check(2);
    s.ok(&["emit", "kiln", "--of", "kiln:north", "evidence:=[]"]);
    check(2);
    s.changeset(
        r#"{"kind":"kiln","of":"kiln:south","sets":["evidence"],"payload":{}}
{"kind":"kiln","of":"kiln:south","sets":["evidence"],"payload":{"evidence":"firing:two"}}"#,
    );
    check(2);
}
