//! A spec resolves names in the CLI and runs each source over all the checked lines.
use super::{Json, Store, answer, at, has, ids, parse_json, save_morning, text, things};
use std::{fs, path::PathBuf};

const MORNING: &str = r#"{"vertex":"morning","from":[{"store":"workshop","kind":["task"]},{"store":"yard","kind":["note"]}],"fold":{"items":{"count":true}}}"#;
const BOTH: &str = r#"{"vertex":"morning","from":[{"store":"workshop"},{"store":"yard"}],"fold":{"items":{"count":true},"list":{"collect":true},"latest":{"latest-by":"of","follow":"prev"}}}"#;
const LOCAL: &str = r#"{"workshop":"store","yard":"yard"}"#;
const USER: &str = r#"{"workshop":"../../../store","yard":"../../../yard"}"#;
const DOT: &str = r#"{"vertex":"morning","from":[{"store":"."}],"fold":{"items":{"count":true}}}"#;

fn sibling(s: &Store, name: &str) -> Store {
    let dir = s.scratch.join(name);
    fs::create_dir_all(&dir).expect("sibling directory");
    Store {
        dir,
        scratch: s.scratch.clone(),
    }
}

fn pair(name: &str) -> (Store, Store) {
    let shop = Store::new(name);
    let yard = sibling(&shop, "yard");
    yard.ok(&["init"]);
    (shop, yard)
}

fn user_list(s: &Store) -> PathBuf {
    s.scratch.join("home/xdg-config/loops/stores.json")
}

#[test]
fn dot_reads_the_current_store_from_its_root_and_a_subdirectory() {
    let shop = Store::new("registry-dot");
    shop.ok(&["emit", "note"]);
    save_morning(&shop, DOT);
    let below = sibling(&shop, "store/sub/dir");
    for start in [&shop, &below] {
        assert_eq!(start.ok(&["read", "morning", "--plain"]), "items  1");
    }
    assert_eq!(
        answer(&below, &["fold", "-"], &DOT.replace('.', "lab")),
        (1, String::new(), "refused: store-unknown: lab".into())
    );
}

#[test]
fn each_explicit_binding_can_redirect_dot() {
    let (shop, yard) = pair("registry-dot-redirect");
    shop.ok(&["emit", "task"]);
    yard.changeset("{\"kind\":\"task\"}\n{\"kind\":\"note\"}");
    save_morning(&shop, DOT);
    let read = ["read", "morning", "--plain"];
    assert_eq!(
        shop.ok(&["read", "morning", "--plain", "--store", ".=../yard"]),
        "items  2"
    );
    let local = shop.scratch.join("stores.json");
    fs::write(&local, r#"{".":"yard"}"#).expect("group list");
    assert_eq!(shop.ok(&read), "items  2");
    fs::remove_file(local).expect("remove group list");
    fs::write(user_list(&shop), r#"{".":"../../../yard"}"#).expect("user list");
    assert_eq!(shop.ok(&read), "items  2");
}

#[test]
fn dot_outside_a_store_needs_a_binding() {
    let (shop, yard) = pair("registry-dot-outside");
    yard.ok(&["emit", "note"]);
    let outside = sibling(&shop, "outside");
    fs::write(outside.dir.join("morning.json"), DOT).expect("spec file");
    assert_eq!(
        answer(&outside, &["fold", "morning.json"], ""),
        (1, String::new(), "refused: store-unknown: .".into())
    );
    assert_eq!(
        outside.ok(&["fold", "morning.json", "--store", ".=../yard", "--plain"]),
        "items  1"
    );
}

#[test]
fn dot_and_a_bound_name_supply_one_union() {
    let (shop, yard) = pair("registry-dot-union");
    shop.ok(&["emit", "note"]);
    yard.ok(&["emit", "task"]);
    let spec = MORNING.replace("workshop", ".");
    assert_eq!(
        shop.ok_with(&["fold", "-", "--store", "yard=../yard", "--plain"], &spec),
        "items  2"
    );
}

#[test]
fn adoption_example_counts_three_from_either_store_with_each_binding_source() {
    let (shop, yard) = pair("registry-adoption");
    shop.ok(&["emit", "task"]);
    shop.ok(&["emit", "note"]);
    yard.ok(&["emit", "task"]);
    for s in [&shop, &yard] {
        save_morning(s, MORNING);
    }
    let check = |flags: &[&str]| {
        for s in [&shop, &yard] {
            for (verb, operand) in [("read", "morning"), ("fold", "-")] {
                let args = [&[verb, operand][..], flags].concat();
                assert_eq!(
                    s.ok_with(&args, MORNING),
                    r#"{"items":{"unread":0,"value":3}}"#
                );
            }
        }
    };
    check(&["--store", "workshop=../store", "--store", "yard=../yard"]);
    let local = shop.scratch.join("stores.json");
    fs::write(&local, LOCAL).expect("sibling list");
    check(&[]);
    fs::remove_file(local).expect("remove group list");
    fs::write(user_list(&shop), USER).expect("user list");
    check(&[]);
    fs::rename(
        shop.scratch.join("home/xdg-config"),
        shop.scratch.join("home/.config"),
    )
    .expect("move registry to HOME fallback");
    let out = shop
        .command(&["read", "morning"])
        .env_remove("XDG_CONFIG_HOME")
        .output()
        .expect("HOME fallback");
    assert_eq!(out.status.code(), Some(0));
    assert_eq!(out.stdout, b"{\"items\":{\"unread\":0,\"value\":3}}\n");
}

#[test]
fn nearer_bindings_override_one_name_at_a_time() {
    let (shop, yard) = pair("registry-precedence");
    shop.ok(&["emit", "task"]);
    yard.changeset("{\"kind\":\"task\"}\n{\"kind\":\"task\"}");
    let empty = sibling(&shop, "empty");
    empty.ok(&["init"]);
    let count = |flags: &[&str]| {
        let args = [&["fold", "-", "--plain"][..], flags].concat();
        shop.ok_with(&args, MORNING)
    };
    // yard always comes from the user list, and points to the empty store.
    fs::write(
        user_list(&shop),
        r#"{"yard":"../../../empty","workshop":"../../../store"}"#,
    )
    .expect("user list");
    assert_eq!(count(&[]), "items  1");
    fs::write(shop.scratch.join("stores.json"), r#"{"workshop":"yard"}"#).expect("group list");
    assert_eq!(count(&[]), "items  2");
    assert_eq!(
        count(&[
            "--store",
            "workshop=../yard",
            "--store",
            "workshop=../empty"
        ]),
        "items  0"
    );
    // An empty list at the store root still takes precedence over its parent.
    fs::write(shop.dir.join("stores.json"), "{}").expect("nearer group list");
    assert_eq!(count(&[]), "items  1");
}

#[test]
fn fold_outside_a_store_uses_its_file_and_explicit_or_user_bindings() {
    let (shop, yard) = pair("registry-outside");
    yard.ok(&["emit", "note"]);
    let outside = sibling(&shop, "outside");
    fs::write(outside.dir.join("morning.json"), MORNING).expect("external spec");
    fs::write(shop.scratch.join("stores.json"), "malformed").expect("outside has no group list");
    fs::write(user_list(&shop), USER).expect("user list");
    assert_eq!(outside.ok(&["fold", "morning.json", "--plain"]), "items  1");
    assert_eq!(
        outside.ok_with(
            &["fold", "--store", "yard=../store", "-", "--plain"],
            MORNING
        ),
        "items  0"
    );
}

#[test]
fn values_come_from_both_stores_and_a_copied_line_counts_once() {
    let (shop, yard) = pair("registry-values");
    let shared = shop.ok(&["emit", "note", "name=Supplies"]);
    yard.ok_with(&["import"], &shop.ok(&["export"]));
    let a = shop.ok(&["emit", "task", "name=Repair kiln"]);
    let b = yard.ok(&["emit", "note", "name=Mow lawn"]);
    fs::write(shop.scratch.join("stores.json"), LOCAL).expect("group list");
    save_morning(&shop, BOTH);
    let read = shop.json(&["read", "morning", "--values"]);
    assert_eq!(at(&read, &["items", "value"]).canon(), "3");
    let Json::Arr(heads) = at(&read, &["list", "heads"]) else {
        panic!("heads")
    };
    assert_eq!(heads.len(), 3);
    for (store, id) in [(&shop, &a), (&yard, &b), (&yard, &shared)] {
        let stored = store.json(&["get", id]);
        let head = heads
            .iter()
            .find(|h| text(h, &["id"]) == id)
            .expect("included");
        for member in ["env", "payload"] {
            assert_eq!(at(head, &[member]), at(&stored, &[member]));
        }
    }
}

#[test]
fn an_eraser_in_the_other_store_withholds_the_payload() {
    let (shop, yard) = pair("registry-eraser");
    let target = shop.ok(&["emit", "task", "secret"]);
    yard.ok(&["emit", "note", "--erases", &target]);
    fs::write(shop.scratch.join("stores.json"), LOCAL).expect("group list");
    let read = parse_json(&shop.ok_with(&["fold", "-", "--values"], BOTH)).expect("fold");
    let Json::Arr(heads) = at(&read, &["list", "heads"]) else {
        panic!("heads")
    };
    let erased = heads
        .iter()
        .find(|h| text(h, &["id"]) == target)
        .expect("target");
    assert_eq!(text(erased, &["shown"]), "erased");
    assert!(!has(erased, &[], "payload"));
    assert!(has(&shop.json(&["get", &target]), &[], "payload"));
}

#[test]
fn a_revision_in_yard_follows_its_predecessor_in_workshop() {
    let (shop, yard) = pair("registry-revision");
    let root = shop.ok(&["emit", "task", "--of", "task:kiln", "status=open"]);
    let writer = Store::new("registry-revision-writer");
    writer.ok_with(&["import"], &shop.ok(&["export"]));
    let head = writer.ok(&["emit", "task", "--prev", &root, "status=done"]);
    yard.ok_with(&["import"], &writer.ok(&["get", &head]));
    fs::write(shop.scratch.join("stores.json"), LOCAL).expect("group list");
    let read = parse_json(&yard.ok_with(&["fold", "-"], BOTH)).expect("fold");
    assert_eq!(at(&read, &["items", "value"]).canon(), "2");
    assert_eq!(things(&read, "latest"), 1);
    assert_eq!(ids(&read, &["latest", "things", "task:kiln"]), [head]);
}

#[test]
fn unknown_names_refuse_before_answering_even_inside_a_store() {
    let s = Store::new("registry-unknown");
    s.ok(&["emit", "task"]);
    save_morning(&s, MORNING);
    for (flags, missing) in [(&[][..], "workshop"), (&["--store", "workshop=."], "yard")] {
        let args = [&["read", "morning"][..], flags].concat();
        assert_eq!(
            answer(&s, &args, ""),
            (
                1,
                String::new(),
                format!("refused: store-unknown: {missing}")
            )
        );
    }
    let reverse = MORNING.replace("workshop", "z").replace("yard", "a");
    assert_eq!(
        answer(&s, &["fold", "-"], &reverse),
        (1, String::new(), "refused: store-unknown: z".into())
    );
    let nested = s.dir.join("child");
    fs::create_dir(&nested).expect("directory without .loops");
    assert_eq!(
        answer(
            &s,
            &[
                "fold",
                "-",
                "--store",
                "workshop=child",
                "--store",
                "yard=."
            ],
            MORNING
        ),
        (
            1,
            String::new(),
            format!("refused: store-unknown: workshop: {}", nested.display())
        )
    );
}

#[test]
fn an_aliased_unclean_store_is_counted_once_and_a_clean_store_contributes() {
    let (shop, yard) = pair("registry-dirty");
    yard.ok(&["emit", "note"]);
    shop.ok(&["emit", "task"]);
    let segment = shop.segments().remove(0);
    let mut bytes = fs::read(&segment).expect("segment");
    bytes.extend_from_slice(b"{}\n");
    fs::write(segment, bytes).expect("tampered");
    fs::write(shop.scratch.join("stores.json"), LOCAL).expect("group list");
    let spec = MORNING.replace(
        r#"{"store":"yard","#,
        r#"{"store":"alias"},{"store":"yard","#,
    );
    let (code, out, err) = answer(
        &yard,
        &["fold", "-", "--store", "alias=../yard/../store"],
        &spec,
    );
    assert_eq!(
        (code, out.as_str()),
        (1, "{\"items\":{\"unread\":0,\"value\":2}}\n")
    );
    assert_eq!(
        err,
        "refused: store-not-clean: 1 line refused, 1 segment altered; `loops check` lists them (stores: alias, workshop)"
    );
    // The vertex lives in the dirty store, but both sources now name only the clean one.
    save_morning(&shop, MORNING);
    assert_eq!(
        answer(
            &shop,
            &["read", "morning", "--plain", "--store", "workshop=../yard"],
            ""
        ),
        (0, "items  1\n".into(), String::new())
    );
    let yard_segment = yard.segments().remove(0);
    fs::rename(&yard_segment, yard_segment.with_file_name("altered.jsonl"))
        .expect("alter segment name");
    let (code, out, err) = answer(&shop, &["read", "morning"], "");
    assert_eq!(
        (code, out.as_str()),
        (1, "{\"items\":{\"unread\":0,\"value\":2}}\n")
    );
    assert_eq!(
        err,
        "refused: store-not-clean: 1 line refused, 2 segments altered; `loops check` lists them (stores: workshop, yard)"
    );
}

#[test]
fn malformed_registry_files_are_usage_errors_even_with_overrides() {
    let s = Store::new("registry-malformed");
    for file in [s.dir.join("stores.json"), user_list(&s)] {
        for bytes in [
            &b"{"[..],
            b"[]",
            br#"{"unused":17}"#,
            br#"{"unused":".","\u0075nused":"here"}"#,
            b"\xff",
        ] {
            fs::write(&file, bytes).expect("bad list");
            let (code, out, err) = answer(
                &s,
                &["fold", "-", "--store", "workshop=.", "--store", "yard=."],
                MORNING,
            );
            assert_eq!((code, out.as_str()), (2, ""));
            assert!(err.contains(file.to_str().expect("path")), "{err}");
        }
        fs::remove_file(file).expect("remove list");
    }
}

#[test]
fn store_flags_are_read_and_fold_options_only() {
    let s = Store::new("registry-verbs");
    for verb in [
        "init", "emit", "tick", "ls", "of", "get", "erase", "export", "import", "check", "whoami",
    ] {
        assert_eq!(s.fails(&[verb, "--store", "lab=."], "").0, 2, "{verb}");
    }
    assert_eq!(s.fails(&["tick", "missing", "--store", "lab=."], "").0, 2);
    for bad in ["lab", "=.", "lab="] {
        assert_eq!(s.fails(&["fold", "-", "--store", bad], MORNING).0, 2);
    }
    let literal = s.ok(&[
        "emit", "note", "--sets", "--store", "--sets", "text", "--", "--store",
    ]);
    assert_eq!(
        text(&s.json(&["get", &literal]), &["payload", "text"]),
        "--store"
    );
}

#[test]
fn a_tick_with_unbound_sources_still_covers_and_checks_the_current_store() {
    let s = Store::new("registry-tick");
    let task = s.ok(&["emit", "task"]);
    // Even a broken list cannot affect either tick path.
    fs::write(user_list(&s), "broken").expect("unusable registry");
    let tick = s.ok_with(&["tick", "-"], MORNING);
    let record = s.json(&["get", &tick]);
    assert_eq!(super::strings(&record, &["payload", "covers"]), [task]);
    assert_eq!(text(&record, &["payload", "result", "items", "value"]), "1");
    assert_eq!(
        text(&s.json(&["tick", "--check", &tick]), &["answer"]),
        "same"
    );
}

#[test]
fn group_discovery_starts_at_the_store_root_and_stops_at_its_parent() {
    let s = Store::scratch("registry-depth");
    let current = sibling(&s, "group/workshop");
    current.ok(&["init"]);
    current.ok(&["emit", "task"]);
    save_morning(&current, MORNING);
    let below = sibling(&s, "group/workshop/sub/dir");
    for dir in [&s.scratch, &below.dir] {
        fs::write(dir.join("stores.json"), "invalid").expect("out of search range");
    }
    assert_eq!(
        answer(&below, &["read", "morning"], ""),
        (1, String::new(), "refused: store-unknown: workshop".into())
    );
    fs::write(
        current.dir.join("stores.json"),
        r#"{"workshop":".","yard":"."}"#,
    )
    .expect("root registry");
    assert_eq!(below.ok(&["read", "morning", "--plain"]), "items  1");
}

#[test]
fn fold_from_the_group_uses_its_list_with_or_without_c() {
    let group = Store::scratch("registry-group-start");
    let shop = sibling(&group, "store/workshop");
    let yard = sibling(&group, "store/yard");
    for store in [&shop, &yard] {
        store.ok(&["init"]);
    }
    shop.changeset("{\"kind\":\"task\"}\n{\"kind\":\"note\"}");
    yard.ok(&["emit", "task"]);
    fs::write(group.dir.join("combined.json"), MORNING).expect("spec");
    fs::write(
        group.dir.join("stores.json"),
        r#"{"workshop":"workshop","yard":"yard"}"#,
    )
    .expect("group list");
    let expected = r#"{"items":{"unread":0,"value":3}}"#;
    assert_eq!(shop.ok(&["fold", "../combined.json"]), expected);
    assert_eq!(group.ok(&["fold", "combined.json"]), expected);
    let cwd = group
        .hermetic_command(env!("CARGO_BIN_EXE_loops"))
        .current_dir(&group.dir)
        .args(["fold", "combined.json"])
        .output()
        .expect("fold from group");
    assert!(
        cwd.status.success(),
        "{}",
        String::from_utf8_lossy(&cwd.stderr)
    );
    assert_eq!(cwd.stdout, format!("{expected}\n").as_bytes());

    fs::write(user_list(&group), r#"{"workshop":"../../../store/yard"}"#).expect("user list");
    assert_eq!(group.ok(&["fold", "combined.json"]), expected);
    assert_eq!(
        group.ok(&[
            "fold",
            "combined.json",
            "--store",
            "workshop=yard",
            "--plain"
        ]),
        "items  1"
    );
}

#[test]
fn outside_a_store_only_the_starting_directory_supplies_a_group_list() {
    let group = Store::scratch("registry-group-depth");
    let file = group.dir.join("stores.json");
    fs::write(&file, "{").expect("malformed group list");
    let (code, out, err) = answer(&group, &["fold", "-"], MORNING);
    assert_eq!((code, out.as_str()), (2, ""));
    assert!(err.contains(file.to_str().expect("path")), "{err}");
    let child = sibling(&group, "store/child");
    assert_eq!(
        answer(&child, &["fold", "-"], MORNING),
        (1, String::new(), "refused: store-unknown: workshop".into())
    );
}
