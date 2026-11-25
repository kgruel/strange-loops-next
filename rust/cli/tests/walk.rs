//! The product walk: one person emits, reads and folds through the `loops` binary.
use loops::json::Json;
use loops_eval::parse_json;
use std::{
    fs,
    io::{ErrorKind, Write},
    path::{Path, PathBuf},
    process::{Command, Output, Stdio},
};

struct Store {
    dir: PathBuf,
    scratch: PathBuf,
}
impl Store {
    fn scratch(name: &str) -> Self {
        let scratch = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join(format!("walk-{name}"));
        let _ = fs::remove_dir_all(&scratch);
        let dir = scratch.join("store");
        fs::create_dir_all(&dir).expect("store scratch directory");
        fs::create_dir_all(scratch.join("home/xdg-config/loops")).expect("child config directory");
        Self { dir, scratch }
    }
    fn new(name: &str) -> Self {
        let store = Self::scratch(name);
        store.ok(&["init"]);
        store
    }
    fn command(&self, args: &[&str]) -> Command {
        let mut cmd = self.hermetic_command(env!("CARGO_BIN_EXE_loops"));
        cmd.arg("-C").arg(&self.dir).args(args);
        cmd
    }
    fn hermetic_command(&self, program: &str) -> Command {
        let mut cmd = Command::new(program);
        cmd.env("HOME", self.scratch.join("home"))
            .env("XDG_CONFIG_HOME", self.scratch.join("home/xdg-config"))
            .env_remove("XDG_CACHE_HOME")
            .env("LOOPS_CACHE_DIR", self.scratch.join("cache"))
            .env_remove("LOOPS_KEY")
            .env_remove("LOOPS_OBSERVER")
            .env("LOOPS_KEY_FILE", self.dir.join("device-key"));
        cmd
    }
    fn run(&self, args: &[&str], stdin: &str) -> Output {
        let mut child = self
            .command(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("loops runs");
        if let Err(error) = child
            .stdin
            .take()
            .expect("stdin")
            .write_all(stdin.as_bytes())
        {
            // A usage refusal can exit before reading the supplied input.
            assert_eq!(
                error.kind(),
                ErrorKind::BrokenPipe,
                "writing stdin: {error}"
            );
        }
        child.wait_with_output().expect("loops exits")
    }
    fn ok_with(&self, args: &[&str], stdin: &str) -> String {
        let out = self.run(args, stdin);
        assert!(
            out.status.success(),
            "{args:?}: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        String::from_utf8(out.stdout)
            .expect("UTF-8")
            .trim_end()
            .to_owned()
    }
    fn ok(&self, args: &[&str]) -> String {
        self.ok_with(args, "")
    }
    fn json(&self, args: &[&str]) -> Json {
        parse_json(&self.ok(args)).expect("JSON answer")
    }
    /// The exit code and what stderr says.
    fn fails(&self, args: &[&str], stdin: &str) -> (i32, String) {
        let out = self.run(args, stdin);
        (
            out.status.code().expect("exit code"),
            String::from_utf8_lossy(&out.stderr).trim_end().to_owned(),
        )
    }
    /// The ids an `emit -` changeset wrote, in line order.
    fn changeset(&self, drafts: &str) -> Vec<String> {
        let out = parse_json(&self.ok_with(&["emit", "-"], drafts)).expect("JSON");
        let Json::Arr(records) = at(&out, &["records"]) else {
            panic!("records")
        };
        records
            .iter()
            .map(|r| text(r, &["id"]).to_owned())
            .collect()
    }
    fn segments(&self) -> Vec<PathBuf> {
        let mut found = Vec::new();
        for dir in fs::read_dir(self.dir.join(".loops/segments")).expect("segments") {
            for file in fs::read_dir(dir.expect("entry").path()).expect("key directory") {
                found.push(file.expect("entry").path());
            }
        }
        found.sort();
        found
    }
}
fn at<'a>(j: &'a Json, path: &[&str]) -> &'a Json {
    path.iter().fold(j, |j, name| match j {
        Json::Obj(members) => members
            .iter()
            .find(|(k, _)| k == name)
            .map_or_else(|| panic!("no member {name}"), |(_, v)| v),
        _ => panic!("{name}: not an object"),
    })
}
fn text<'a>(j: &'a Json, path: &[&str]) -> &'a str {
    match at(j, path) {
        Json::Str(s) => s,
        other => panic!("{path:?}: {other:?}"),
    }
}
/// A list of text, such as an envelope's `prev` or `about`.
fn strings(j: &Json, path: &[&str]) -> Vec<String> {
    match at(j, path) {
        Json::Arr(items) => items
            .iter()
            .map(|x| match x {
                Json::Str(s) => s.clone(),
                other => panic!("{path:?}: {other:?}"),
            })
            .collect(),
        other => panic!("{path:?}: {other:?}"),
    }
}
/// The ids of the heads `loops of` shows, newest first: the first is the winner.
fn head_ids(state: &Json) -> Vec<String> {
    ids(state, &["heads"])
}
fn len(j: &Json, path: &[&str]) -> usize {
    match at(j, path) {
        Json::Arr(items) => items.len(),
        other => panic!("{path:?}: {other:?}"),
    }
}
const SPEC: &str = r#"{"vertex":"decisions","from":[{"store":".","kind":["decision"]}],"fold":{
  "all":{"count":true},
  "settled":{"count":true,"where":{"status":{"is":"settled"}}},
  "weight":{"sum":"n"},
  "current":{"latest-by":"of","follow":"prev"}}}"#;

const FOLLOW: &str = r#"{"vertex":"now","from":[{"store":".","kind":["task"]}],"fold":{
  "all":{"count":true},
  "now":{"count":true,"follow":"prev"},
  "open":{"count":true,"follow":"prev","where":{"status":{"is":"open"}}},
  "est":{"sum":"n","follow":"prev"}}}"#;

/// A slot's value and unread count.
fn tally(slots: &Json, slot: &str) -> (Json, Json) {
    (
        at(slots, &[slot, "value"]).clone(),
        at(slots, &[slot, "unread"]).clone(),
    )
}

#[test]
fn payload_field_examples_match_the_model_through_emit_and_fold() {
    // The CLI signs and stores each payload. Fixture ids and arrival order
    // are irrelevant to these slots, which read only the written fields.
    for (name, raw) in [
        (
            "backups",
            include_str!("../../../vectors/spec/run/pv2-backups.json"),
        ),
        (
            "settings",
            include_str!("../../../vectors/spec/run/pv2-settings.json"),
        ),
        (
            "zero",
            include_str!("../../../vectors/spec/run/pv2-written-zero.json"),
        ),
        (
            "empty",
            include_str!("../../../vectors/spec/run/pv2-written-empty.json"),
        ),
    ] {
        let store = Store::new(name);
        let vector = parse_json(raw).expect("PV2 vector");
        let Json::Arr(orders) = at(&vector, &["input", "orders"]) else {
            panic!("orders")
        };
        let Json::Arr(records) = &orders[0] else {
            panic!("records")
        };
        for record in records {
            let draft = Json::Obj(vec![
                ("kind".into(), at(record, &["kind"]).clone()),
                ("of".into(), at(record, &["of"]).clone()),
                ("payload".into(), at(record, &["fields"]).clone()),
            ]);
            store.changeset(&draft.canon());
        }
        let spec = at(&vector, &["input", "spec"]).canon();
        let slots = parse_json(&store.ok_with(&["fold", "-"], &spec)).expect("slots");
        assert_eq!(slots.canon(), at(&vector, &["expect"]).canon(), "{name}");
    }
}

#[test]
fn a_backfilled_revision_moves_the_head_out_of_the_window() {
    let store = Store::new("window");
    let emit = |fields: &[&str]| {
        let mut args = vec!["emit", "backup", "--emitted", "2026-11-21T20:00:00Z"];
        args.extend(fields);
        store.ok(&args)
    };
    let first = emit(&["first report"]);
    emit(&[
        "--prev",
        &first,
        "--occurred",
        "2026-11-16",
        "corrected date",
    ]);
    emit(&["--occurred", "2026-11-17", "older backup"]);

    let spec = r#"{"vertex":"backups","from":[{"store":".","kind":["backup"]}],"fold":{
        "occurred":{"count":true,"where":{"env.occurred":{"at-least":"2026-11-21","below":"2026-11-22"}}},
        "emitted":{"count":true,"where":{"env.emitted":{"at-least":"2026-11-21","below":"2026-11-22"}}},
        "when":{"count":true,"where":{"env.when":{"at-least":"2026-11-21","below":"2026-11-22"}}},
        "heads":{"count":true,"follow":"prev","where":{"env.when":{"at-least":"2026-11-21","below":"2026-11-22"}}}}}"#;
    let slots = parse_json(&store.ok_with(&["fold", "-"], spec)).expect("fold result");
    for (slot, count) in [
        ("occurred", 0_u64),
        ("emitted", 3),
        ("when", 1),
        ("heads", 0),
    ] {
        assert_eq!(
            tally(&slots, slot),
            (Json::Int(count.into()), Json::Int(0_u64.into())),
            "{slot}"
        );
    }
}

#[test]
fn count_and_sum_follow_the_heads() {
    let s = Store::new("now");
    let n = |v: i64, u: i64| (Json::Int(v.into()), Json::Int(u.into()));
    let first = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "status=open",
        "n:=3",
        "Open",
    ]);
    // Two revisions that each name only the first: a fork, and both heads
    // are current. `loops emit` would name the one in the other, so the fork
    // is a changeset that states its own `prev`.
    let pair = s.changeset(&format!(
        "{{\"kind\":\"task\",\"of\":\"task:1\",\"prev\":[\"{first}\"],\"payload\":{{\"status\":\"open\",\"n\":5,\"text\":\"Bigger\"}}}}\n\
         {{\"kind\":\"task\",\"of\":\"task:1\",\"prev\":[\"{first}\"],\"payload\":{{\"status\":\"done\",\"n\":1,\"text\":\"Done\"}}}}\n"
    ));
    let fork = &pair[1];
    let slots = parse_json(&s.ok_with(&["fold", "-"], FOLLOW)).expect("JSON");
    let got = ["all", "now", "open", "est"].map(|k| tally(&slots, k));
    assert_eq!(got, [n(3, 0), n(2, 0), n(1, 0), n(6, 0)]);
    // An erased head is still current: counted by its envelope, unread to a sum.
    s.json(&["erase", &fork[2..12], "not ours to say"]);
    let slots = parse_json(&s.ok_with(&["fold", "-"], FOLLOW)).expect("JSON");
    let got = ["all", "now", "open", "est"].map(|k| tally(&slots, k));
    assert_eq!(got, [n(3, 0), n(2, 0), n(1, 1), n(5, 1)]);
}

const GROUPED: &str = r#"{"vertex":"per-project","from":[{"store":".","kind":["task"]}],"fold":{
  "every":{"count":true,"by":"env.about:project"},
  "now":{"count":true,"follow":"prev","by":"env.about:project"},
  "list":{"collect":true,"follow":"prev","by":"env.about:project"}}}"#;

const KEYED: &str = r#"{"vertex":"tasks","from":[{"store":".","kind":["task"]}],"fold":{
  "state":{"latest-by":"of","follow":"keys"},
  "open":{"latest-by":"of","follow":"keys","where":{"status":{"is":"open"}}},
  "open-heads":{"latest-by":"of","follow":"prev","where":{"status":{"is":"open"}}}}}"#;

/// The things a latest-by slot holds.
fn things(j: &Json, slot: &str) -> usize {
    let Json::Obj(kvs) = at(j, &[slot, "things"]) else {
        panic!("{slot} has no things")
    };
    kvs.len()
}

/// The ids a keyed thing lists, from a slot's `things`.
fn ids(j: &Json, path: &[&str]) -> Vec<String> {
    let Json::Arr(xs) = at(j, path) else {
        panic!("{path:?} is not a list")
    };
    xs.iter().map(|x| text(x, &["id"]).to_owned()).collect()
}

#[test]
fn latest_by_follows_keys_through_the_live_setters() {
    let s = Store::new("keyed");
    let fold = || parse_json(&s.ok_with(&["fold", "-"], KEYED)).expect("JSON");
    let root = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "status=open",
        "title=Write",
        "Write the spec",
    ]);
    let title = s.ok(&[
        "emit",
        "task",
        "--prev",
        &root,
        "--sets",
        "title",
        "title=Rewrite",
    ]);
    // The head sets only `title`; `status` is still read from the root, which
    // is read whole and live for every key the head does not set.
    let slots = fold();
    let state = ["state", "things", "task:1"];
    assert_eq!(
        ids(&slots, &[&state[..], &["keys", "title"]].concat()),
        std::slice::from_ref(&title)
    );
    assert_eq!(
        ids(&slots, &[&state[..], &["whole"]].concat()),
        std::slice::from_ref(&root)
    );
    assert_eq!(
        ids(&slots, &[&state[..], &["heads"]].concat()),
        std::slice::from_ref(&title)
    );
    assert_eq!(things(&slots, "open"), 1);
    assert_eq!(things(&slots, "open-heads"), 0);
    // A concurrent emit sets `status`: two heads, each live for its key. It
    // names only the root, so it is a changeset that states its own `prev`.
    let status = s.changeset(&format!(
        "{{\"kind\":\"task\",\"of\":\"task:1\",\"prev\":[\"{root}\"],\"sets\":[\"status\"],\"payload\":{{\"status\":\"done\"}}}}\n"
    ))
    .remove(0);
    let slots = fold();
    assert_eq!(
        ids(&slots, &[&state[..], &["keys", "status"]].concat()),
        std::slice::from_ref(&status)
    );
    assert_eq!(len(&slots, &[&state[..], &["heads"]].concat()), 2);
    assert_eq!(things(&slots, "open"), 0);
    // Erased, the setter keeps its envelope and `sets`: `status` is unknown.
    s.json(&["erase", &status[2..12], "not ours to say"]);
    let slots = fold();
    assert_eq!(at(&slots, &["open", "unread"]), &Json::Int(1_i64.into()));
    assert_eq!(
        ids(&slots, &[&state[..], &["keys", "status"]].concat()),
        std::slice::from_ref(&status)
    );
    // A pure join settles both heads and sets nothing: it is the one head, and
    // the two setters stay live for their keys. `loops emit` names every live
    // record of the thing, the root among them, without a `--prev`.
    let join = s.ok(&["emit", "task", "--of", "task:1", "--sets-nothing"]);
    let mut live = vec![root.clone(), title.clone(), status.clone()];
    live.sort();
    assert_eq!(strings(&s.json(&["get", &join]), &["env", "prev"]), live);
    let slots = fold();
    assert_eq!(ids(&slots, &[&state[..], &["heads"]].concat()), [join]);
    assert_eq!(
        ids(&slots, &[&state[..], &["keys", "status"]].concat()),
        [status]
    );
    assert_eq!(
        ids(&slots, &[&state[..], &["keys", "title"]].concat()),
        [title]
    );
    assert_eq!(ids(&slots, &[&state[..], &["whole"]].concat()), [root]);
}

const KEYED_SLOTS: &str = r#"{"vertex":"tasks","from":[{"store":".","kind":["task"]}],"fold":{
  "tasks":{"count":true,"follow":"keys"},
  "heads":{"count":true,"follow":"prev"},
  "open":{"count":true,"follow":"keys","where":{"status":{"is":"open"}}},
  "open-heads":{"count":true,"follow":"prev","where":{"status":{"is":"open"}}},
  "est":{"sum":"n","follow":"keys"},
  "live":{"collect":true,"follow":"keys"}}}"#;

#[test]
fn count_sum_and_collect_follow_keys_through_the_things() {
    let s = Store::new("keyed-slots");
    let fold = || parse_json(&s.ok_with(&["fold", "-"], KEYED_SLOTS)).expect("JSON");
    let n = |v: i64, u: i64| (Json::Int(v.into()), Json::Int(u.into()));
    let root = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "status=open",
        "n:=3",
        "Write the spec",
    ]);
    let title = s.ok(&[
        "emit",
        "task",
        "--prev",
        &root,
        "--sets",
        "title",
        "title=Rewrite",
    ]);
    // The head sets only `title`: over heads the task is not open, over its
    // live setters it is, and `n` is still read from the root.
    let slots = fold();
    let got = ["tasks", "heads", "open", "open-heads", "est"].map(|k| tally(&slots, k));
    assert_eq!(got, [n(1, 0), n(1, 0), n(1, 0), n(0, 0), n(3, 0)]);
    assert_eq!(ids(&slots, &["live", "heads"]), [title, root.clone()]);
    // A concurrent emit sets `n`: two heads, one thing, and `n` read from it.
    // It names only the root, so it is a changeset.
    let only_root = format!(
        "{{\"kind\":\"task\",\"of\":\"task:1\",\"prev\":[\"{root}\"],\"sets\":[\"n\"],\"payload\":{{\"n\":5}}}}\n"
    );
    let five = s.changeset(&only_root).remove(0);
    let slots = fold();
    let got = ["tasks", "heads", "est"].map(|k| tally(&slots, k));
    assert_eq!(got, [n(1, 0), n(2, 0), n(5, 0)]);
    assert_eq!(len(&slots, &["live", "heads"]), 3);
    // Another sets `n` too: two live setters, so the sum cannot read it,
    // although no values are compared.
    s.changeset(&only_root);
    let slots = fold();
    let got = ["tasks", "heads", "est"].map(|k| tally(&slots, k));
    assert_eq!(got, [n(1, 0), n(3, 0), n(0, 1)]);
    assert!(ids(&slots, &["live", "heads"]).contains(&five));
}

#[test]
fn count_groups_by_mention_over_every_record_and_over_the_heads() {
    let s = Store::new("per-project");
    let first = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "--about",
        "project:x",
        "Open",
    ]);
    // The task moves to project y: its revision mentions y, not x.
    s.ok(&[
        "emit",
        "task",
        "--prev",
        &first,
        "--about",
        "project:y",
        "Moved",
    ]);
    s.ok(&[
        "emit",
        "task",
        "--of",
        "task:2",
        "--about",
        "project:x",
        "Other",
    ]);
    let slots = parse_json(&s.ok_with(&["fold", "-"], GROUPED)).expect("JSON");
    let count = |slot: &str, key: &str| at(&slots, &[slot, "groups", key, "value"]).clone();
    let n = |v: i64| Json::Int(v.into());
    // Every record: the moved task's first version still counts in x.
    assert_eq!([count("every", "x"), count("every", "y")], [n(2), n(1)]);
    // Over the heads, only the current version counts, in y.
    assert_eq!([count("now", "x"), count("now", "y")], [n(1), n(1)]);
    // A collect that follows prev lists each current version under its mention.
    let listed = |key: &str| match at(&slots, &["list", "groups", key, "heads"]) {
        Json::Arr(hs) => hs.len(),
        _ => panic!("heads"),
    };
    assert_eq!([listed("x"), listed("y")], [1, 1]);
    for slot in ["every", "now", "list"] {
        assert_eq!(at(&slots, &[slot, "unread"]), &n(0));
        assert_eq!(at(&slots, &[slot, "ungrouped"]), &n(0));
        let Json::Obj(groups) = at(&slots, &[slot, "groups"]) else {
            panic!("groups")
        };
        let keys: Vec<&str> = groups.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(keys, ["x", "y"]);
    }
}

#[test]
fn emit_revise_fork_fold_and_erase() {
    let s = Store::new("decision");
    let thing = "repo:strange-loops";
    let first = s.ok(&[
        "emit",
        "decision",
        "--of",
        thing,
        "status=leaning",
        "n:=1",
        "Go, in the old repo",
    ]);
    assert!(first.starts_with("r:") && first.len() == 54);
    // The first emit made the signing key, and the record names it.
    let who = s.json(&["whoami"]);
    assert_eq!(text(&who, &["key"]), text(&who, &["observer"]));
    let got = s.json(&["get", &first[2..10]]);
    assert_eq!(text(&got, &["env", "observer"]), text(&who, &["key"]));
    assert_eq!(text(&got, &["payload", "text"]), "Go, in the old repo");
    assert_eq!(text(&got, &["payload", "status"]), "leaning");

    // A revision replaces it; a second revision of the same record is a fork, and both heads show.
    // Written without --of, a revision is of what it replaces, and its envelope says so.
    let second = s.ok(&[
        "emit",
        "decision",
        "--about",
        "lang:rust",
        "--prev",
        &first[2..10],
        "status=settled",
        "n:=2",
        "Rust, in a new repo",
    ]);
    let got = s.json(&["get", &second]);
    assert_eq!(text(&got, &["env", "of"]), thing);
    assert_eq!(
        at(&got, &["env", "about"]),
        &Json::Arr(vec![Json::Str("lang:rust".into())])
    );
    let state = s.json(&["of", thing]);
    assert_eq!(head_ids(&state), [second]);
    // A mention makes no head.
    let mentioned = s.json(&["of", "lang:rust"]);
    assert_eq!(len(&mentioned, &["heads"]), 0);
    assert_eq!(at(&mentioned, &["records"]), &Json::Int(0_i64.into()));
    // The verb that shows a thing is `of`; `about` names no verb.
    assert_eq!(s.fails(&["about", thing], "").0, 2);
    // A fork names only the first, so it is a changeset that states its `prev`.
    let fork = s
        .changeset(&format!(
            "{{\"kind\":\"decision\",\"of\":\"{thing}\",\"prev\":[\"{first}\"],\"payload\":{{\"status\":\"settled\",\"n\":4,\"text\":\"Zig\"}}}}\n"
        ))
        .remove(0);
    let state = s.json(&["of", thing]);
    assert_eq!(head_ids(&state)[0], fork);
    assert_eq!(len(&state, &["heads"]), 2);
    assert_eq!(at(&state, &["records"]), &Json::Int(3_i64.into()));

    // A fold reads the same set: counts cover history, latest-by the heads.
    fs::create_dir_all(s.dir.join(".loops/vertices")).expect("vertices");
    fs::write(s.dir.join(".loops/vertices/decisions.json"), SPEC).expect("spec");
    let slots = s.json(&["read", "decisions"]);
    assert_eq!(
        slots,
        parse_json(&s.ok_with(&["fold", "-"], SPEC)).expect("JSON")
    );
    assert_eq!(at(&slots, &["all", "value"]), &Json::Int(3_i64.into()));
    assert_eq!(at(&slots, &["settled", "value"]), &Json::Int(2_i64.into()));
    assert_eq!(at(&slots, &["weight", "value"]), &Json::Int(7_i64.into()));
    assert_eq!(len(&slots, &["current", "things", thing]), 2);

    // Erasing drops the opening here and says so to every reader: the id, the
    // signature and the fork stay, and the folds count what they can't read.
    let before = s.ok(&["export"]);
    let erasure = s.json(&["erase", &fork[2..12], "not ours to say"]);
    assert_eq!(
        at(&erasure, &["openings-removed"]),
        &Json::Int(1_i64.into())
    );
    let gone = s.json(&["get", &fork]);
    assert_eq!(text(&gone, &["id"]), fork);
    assert!(text(&gone, &["commit"]).starts_with("h:"));
    assert!(!s.ok(&["export"]).contains("Zig") && before.contains("Zig"));
    for file in s.segments() {
        assert!(!fs::read_to_string(file).expect("segment").contains("Zig"));
    }
    let slots = s.json(&["read", "decisions"]);
    assert_eq!(at(&slots, &["all", "value"]), &Json::Int(3_i64.into()));
    assert_eq!(at(&slots, &["weight", "value"]), &Json::Int(3_i64.into()));
    assert_eq!(at(&slots, &["weight", "unread"]), &Json::Int(1_i64.into()));
    assert_eq!(at(&slots, &["settled", "unread"]), &Json::Int(1_i64.into()));
    assert_eq!(head_ids(&s.json(&["of", thing]))[0], fork);
    let check = s.json(&["check"]);
    assert_eq!(
        (len(&check, &["refused"]), len(&check, &["altered"])),
        (0, 0)
    );
}

#[test]
fn a_batch_is_one_changeset_and_labels_name_its_records() {
    let s = Store::new("batch");
    let drafts = r#"{"label":"@d","kind":"decision","of":"repo:strange-loops","payload":{"text":"Rust, in a new repo"}}
{"kind":"note","about":["@d"],"payload":{"text":"phones and extensions need the core itself"}}
{"label":"@d2","kind":"decision","of":"repo:strange-loops","prev":["@d"],"payload":{"text":"until the rename"}}
"#;
    let out = parse_json(&s.ok_with(&["emit", "-"], drafts)).expect("JSON");
    let Json::Arr(records) = at(&out, &["records"]) else {
        panic!("records")
    };
    assert_eq!(records.len(), 3);
    assert_eq!(text(&records[0], &["label"]), "@d");
    assert_eq!(s.segments().len(), 1, "one changeset, one segment");
    let note = s.json(&["get", text(&records[1], &["id"])]);
    assert_eq!(
        at(&note, &["env", "about"]),
        &Json::Arr(vec![Json::Str(text(&records[0], &["id"]).into())])
    );
    let state = s.json(&["of", "repo:strange-loops"]);
    assert_eq!(head_ids(&state), [text(&records[2], &["id"])]);
    // The note mentions the first decision, which is of the repo: neither the
    // mention nor the decision's id makes a thing with records of it.
    let mentioned = s.json(&["of", text(&records[0], &["id"])]);
    assert_eq!(at(&mentioned, &["records"]), &Json::Int(0_i64.into()));
    assert_eq!(len(&mentioned, &["heads"]), 0);
    assert_eq!(
        s.ok(&["export", "--about", text(&records[0], &["id"])]),
        s.ok(&["export", "--kind", "note"])
    );
    assert_eq!(s.ok(&["export", "--of", text(&records[0], &["id"])]), "");
    assert_eq!(
        s.ok(&["export", "--of", "repo:strange-loops"])
            .lines()
            .count(),
        2
    );

    // A label in `of` names a record of the same changeset.
    let out = parse_json(&s.ok_with(
        &["emit", "-"],
        "{\"label\":\"@r\",\"kind\":\"note\"}\n{\"kind\":\"note\",\"of\":\"@r\",\"prev\":[\"@r\"]}\n",
    ))
    .expect("JSON");
    let Json::Arr(pair) = at(&out, &["records"]) else {
        panic!("records")
    };
    assert_eq!(
        text(&s.json(&["get", text(&pair[1], &["id"])]), &["env", "of"]),
        text(&pair[0], &["id"])
    );

    // A label in `under` names a record of the same changeset: a grant and a
    // record acting under it, written together.
    let out = parse_json(&s.ok_with(
        &["emit", "-"],
        "{\"kind\":\"note\",\"under\":\"@g\"}\n{\"label\":\"@g\",\"kind\":\"grant\"}\n",
    ))
    .expect("JSON");
    let Json::Arr(acting) = at(&out, &["records"]) else {
        panic!("records")
    };
    assert_eq!(
        text(
            &s.json(&["get", text(&acting[0], &["id"])]),
            &["env", "under"]
        ),
        text(&acting[1], &["id"])
    );

    // Nothing is written unless every draft is taken.
    let held = s.ok(&["export"]);
    for (bad, code) in [
        (r#"{"kind":"note","about":["@nobody"]}"#, "label-unknown"),
        (r#"{"kind":"note","of":"@nobody"}"#, "label-unknown"),
        (r#"{"kind":"note","under":"@nobody"}"#, "label-unknown"),
        (
            r#"{"label":"@u","kind":"grant","under":"@u"}"#,
            "label-cycle",
        ),
        (r#"{"kind":"","payload":{}}"#, "kind-empty"),
        (
            r#"{"kind":"note","of":"thing:x","prev":["r:0000000000000000000000000000000000000000000000000000"]}"#,
            "prev-unknown",
        ),
        // A changeset states its `of`: nothing fills it in.
        (
            r#"{"kind":"note","prev":["r:0000000000000000000000000000000000000000000000000000"]}"#,
            "of-missing",
        ),
        (
            "{\"label\":\"@a\",\"kind\":\"note\",\"of\":\"thing:x\"}\n{\"kind\":\"note\",\"of\":\"@a\"}",
            "of-not-root",
        ),
        (
            r#"{"kind":"note","colour":"red"}"#,
            "draft-field-unknown at line 2: colour",
        ),
        (
            r#"{"kind":"note","payload":{"n":9007199254740993}}"#,
            "number-out-of-range",
        ),
    ] {
        let (exit, said) = s.fails(&["emit", "-"], &format!("{{\"kind\":\"note\"}}\n{bad}\n"));
        assert_eq!(
            (exit, said.as_str()),
            (1, format!("refused: {code}").as_str())
        );
    }
    assert_eq!(s.ok(&["export"]), held);
    assert_eq!(s.segments().len(), 3);
}

#[test]
fn a_changeset_line_gets_the_cores_code_for_a_missing_or_mistyped_field() {
    let s = Store::new("mistyped");
    s.ok_with(&["emit", "-"], "{\"kind\":\"note\"}\n");
    let held = s.ok(&["export"]);
    for (bad, code) in [
        // A missing or mistyped envelope field gets the core's code for it,
        // in the writer's order across the changeset (Kyle, 2026-11-11).
        (r#"{"kind":7}"#, "kind-empty"),
        (r#"{"payload":{}}"#, "kind-empty"),
        (r#"{"kind":"note","observer":7}"#, "observer-not-typed"),
        (r#"{"kind":"note","emitted":null}"#, "emitted-not-rfc3339"),
        (r#"{"kind":"note","under":["@x"]}"#, "under-not-record-id"),
        // A label beside a mistyped member is still a label, checked first.
        (r#"{"kind":"note","about":["@nobody",7]}"#, "label-unknown"),
        (
            "{\"label\":\"@a\",\"kind\":\"note\"}\n{\"kind\":\"note\",\"about\":[\"@a\",7]}",
            "about-not-typed",
        ),
        // A label refusal on one line outranks a mistyped field on another.
        (
            "{\"kind\":7}\n{\"kind\":\"note\",\"about\":[\"@nobody\"]}",
            "label-unknown",
        ),
        // A salt that is not base32hex text is not 16 bytes, after the envelope.
        (r#"{"kind":"note","salt":7}"#, "salt-not-16-bytes"),
        (r#"{"kind":"note","salt":"!"}"#, "salt-not-16-bytes"),
        ("{\"kind\":\"note\",\"salt\":7}\n{\"kind\":7}", "kind-empty"),
        // The line's own shape stays the CLI's.
        ("7", "draft-shape at line 2: a draft is a JSON object"),
        (
            r#"{"label":7,"kind":"note"}"#,
            "draft-shape at line 2: label is text",
        ),
    ] {
        let (exit, said) = s.fails(&["emit", "-"], &format!("{{\"kind\":\"note\"}}\n{bad}\n"));
        assert_eq!(
            (exit, said.as_str()),
            (1, format!("refused: {code}").as_str()),
            "{bad}"
        );
    }
    assert_eq!(s.ok(&["export"]), held, "nothing is written");
}

#[test]
fn a_revision_is_of_what_it_replaces_and_the_store_decides_of_not_root() {
    let s = Store::new("of");
    let decision = s.ok(&["emit", "decision", "--of", "repo:strange-loops", "start"]);
    let decision = decision.as_str();
    // A revision written without --of is of what it replaces: here a root,
    // whose thing is its own id, and then a revision of it, whose thing is its `of`.
    let root = s.ok(&["emit", "note", "first"]);
    let revised = s.ok(&["emit", "note", "--prev", &root, "second"]);
    let again = s.ok(&["emit", "note", "--prev", &revised, "third"]);
    for id in [&revised, &again] {
        assert_eq!(text(&s.json(&["get", id]), &["env", "of"]), root);
    }
    let state = s.json(&["of", &root]);
    assert_eq!(head_ids(&state), std::slice::from_ref(&again));
    assert_eq!(at(&state, &["records"]), &Json::Int(3_i64.into()));

    // What the writer holds decides `of-not-root` and `prev-unrelated`, from the store.
    let held = s.ok(&["export"]);
    for (args, code) in [
        (vec!["--of", revised.as_str()], "of-not-root"),
        (vec!["--of", decision], "of-not-root"),
        (
            vec!["--of", &revised[2..12], "--prev", &again],
            "of-not-root",
        ),
        (vec!["--prev", &root, "--prev", decision], "prev-unrelated"),
        (
            vec!["--of", "repo:other", "--prev", &again],
            "prev-unrelated",
        ),
        (vec!["--of", "Untyped:x"], "of-not-typed"),
    ] {
        let mut argv = vec!["emit", "note"];
        argv.extend(args);
        assert_eq!(
            s.fails(&argv, ""),
            (1, format!("refused: {code}")),
            "{argv:?}"
        );
    }
    assert_eq!(s.ok(&["export"]), held);
    // An `of` naming a root is a revision's thing, stated rather than filled in.
    let stated = s.ok(&["emit", "note", "--of", &root, "--prev", &again, "fourth"]);
    assert_eq!(head_ids(&s.json(&["of", &root])), [stated]);
}

#[test]
fn an_under_target_is_held_whatever_its_shown_state() {
    let s = Store::new("under");
    let grant = s.ok(&["emit", "grant", "to wren"]);
    let missing = "r:0000000000000000000000000000000000000000000000000000";
    // A held target, by its id or a prefix, in one record or a changeset.
    let acting = s.ok(&["emit", "note", "--under", &grant[2..12], "acting"]);
    assert_eq!(text(&s.json(&["get", &acting]), &["env", "under"]), grant);
    s.ok_with(
        &["emit", "-"],
        &format!("{{\"kind\":\"note\",\"under\":\"{grant}\"}}\n"),
    );
    // A target nobody here holds is refused, and nothing is written.
    let held = s.ok(&["export"]);
    assert_eq!(
        s.fails(&["emit", "note", "--under", missing, "x"], ""),
        (1, "refused: under-unknown".into())
    );
    for (bad, code) in [
        (
            r#"{"kind":"note","under":"r:0000000000000000000000000000000000000000000000000000"}"#,
            "under-unknown",
        ),
        // An unheld `prev` outranks an unheld `under`, on one line or two, in either order.
        (
            r#"{"kind":"note","of":"thing:x","prev":["r:0000000000000000000000000000000000000000000000000000"],"under":"r:0000000000000000000000000000000000000000000000000000"}"#,
            "prev-unknown",
        ),
        (
            "{\"kind\":\"note\",\"under\":\"r:0000000000000000000000000000000000000000000000000000\"}\n{\"kind\":\"note\",\"of\":\"thing:x\",\"prev\":[\"r:0000000000000000000000000000000000000000000000000000\"]}",
            "prev-unknown",
        ),
        (
            "{\"kind\":\"note\",\"of\":\"thing:x\",\"prev\":[\"r:0000000000000000000000000000000000000000000000000000\"]}\n{\"kind\":\"note\",\"under\":\"r:0000000000000000000000000000000000000000000000000000\"}",
            "prev-unknown",
        ),
        // And an unheld `under` outranks `of-not-root`, in either order.
        (
            "{\"kind\":\"note\",\"under\":\"r:0000000000000000000000000000000000000000000000000000\"}\n{\"label\":\"@a\",\"kind\":\"note\",\"of\":\"thing:x\"}\n{\"kind\":\"note\",\"of\":\"@a\"}",
            "under-unknown",
        ),
        (
            "{\"label\":\"@a\",\"kind\":\"note\",\"of\":\"thing:x\"}\n{\"kind\":\"note\",\"of\":\"@a\"}\n{\"kind\":\"note\",\"under\":\"r:0000000000000000000000000000000000000000000000000000\"}",
            "under-unknown",
        ),
    ] {
        assert_eq!(
            s.fails(&["emit", "-"], &format!("{bad}\n")),
            (1, format!("refused: {code}")),
            "{bad}"
        );
    }
    // On this path the CLI's own prev-unknown still comes first.
    assert_eq!(
        s.fails(
            &["emit", "note", "--under", missing, "--prev", missing, "x"],
            ""
        ),
        (1, "refused: prev-unknown".into())
    );
    assert_eq!(s.ok(&["export"]), held);
    // What the target is is not checked: a note is as good as a grant here.
    s.ok(&["emit", "note", "--under", &acting, "under a note"]);

    // An erased target is still held: its envelope is.
    let erased = s.ok(&["emit", "grant", "to kyle"]);
    s.ok(&["erase", &erased]);
    s.ok(&["emit", "note", "--under", &erased, "under an erased grant"]);

    // So is a withheld one: a store holding the erased line without its eraser.
    let other = Store::new("under-withheld");
    let line = s
        .ok(&["export"])
        .lines()
        .find(|line| line.contains(&erased[2..]) && !line.contains("\"erasure\""))
        .expect("the erased line")
        .to_owned();
    other.ok_with(&["import"], &format!("{line}\n"));
    let withheld = other.ok(&["get", &erased]);
    assert!(withheld.contains(&erased) && !withheld.contains("\"payload\""));
    other.ok(&["emit", "note", "--under", &erased, "under a withheld grant"]);
    other.ok_with(
        &["emit", "-"],
        &format!("{{\"kind\":\"note\",\"under\":\"{erased}\"}}\n"),
    );
}

#[test]
fn sets_is_stated_on_either_path_and_kept_without_the_payload() {
    let s = Store::new("sets");
    let sets = |id: &str| s.json(&["get", id]);
    let root = s.ok(&[
        "emit",
        "task",
        "--sets",
        "title",
        "--sets",
        "status",
        "--sets",
        "title",
        "title=Write the spec",
        "status=open",
    ]);
    assert_eq!(
        at(&sets(&root), &["env", "sets"]),
        &Json::Arr(vec![Json::Str("status".into()), Json::Str("title".into())])
    );
    // An empty `sets` is stated with --sets-nothing, and written; a revision's
    // `of` is still filled in from what it replaces.
    let join = s.ok(&["emit", "task", "--prev", &root, "--sets-nothing"]);
    assert_eq!(at(&sets(&join), &["env", "sets"]), &Json::Arr(vec![]));
    assert_eq!(text(&sets(&join), &["env", "of"]), root);
    // A declared key the payload lacks is written; nothing compares them.
    let status = s.ok(&[
        "emit",
        "task",
        "--prev",
        &join,
        "--sets",
        "status",
        "title=renamed",
    ]);
    assert_eq!(text(&sets(&status), &["env", "of"]), root);
    // `--whole` states no `sets`: the emit is read whole.
    let whole = s.ok(&["emit", "task", "--prev", &status, "--whole", "title=whole"]);
    assert!(!s.ok(&["get", &whole]).contains("\"sets\""));
    // A changeset line states `sets` itself, empty or not; a key is never a label.
    s.ok_with(
        &["emit", "-"],
        "{\"label\":\"@a\",\"kind\":\"task\",\"sets\":[]}\n{\"kind\":\"task\",\"of\":\"@a\",\"prev\":[\"@a\"],\"sets\":[\"@a\"],\"payload\":\"done\"}\n",
    );
    let held = s.ok(&["export"]);
    assert!(held.contains("\"sets\":[\"@a\"]"));
    assert_eq!(
        s.fails(&["emit", "task", "--sets", "", "x"], ""),
        (1, "refused: sets-not-keys".into())
    );
    for (bad, code) in [
        (r#"{"kind":"task","sets":"title"}"#, "sets-not-keys"),
        (r#"{"kind":"task","sets":["title",7]}"#, "sets-not-keys"),
        (r#"{"kind":"task","sets":[""]}"#, "sets-not-keys"),
        // After erases, before of-missing, across the changeset.
        (
            "{\"kind\":\"task\",\"sets\":null}\n{\"kind\":\"task\",\"erases\":[\"x\"]}",
            "erases-not-record-id",
        ),
        (
            "{\"label\":\"@a\",\"kind\":\"task\"}\n{\"kind\":\"task\",\"prev\":[\"@a\"]}\n{\"kind\":\"task\",\"sets\":7}",
            "sets-not-keys",
        ),
    ] {
        assert_eq!(
            s.fails(&["emit", "-"], &format!("{bad}\n")),
            (1, format!("refused: {code}")),
            "{bad}"
        );
    }
    for args in [
        ["emit", "task", "--sets", "title", "--sets-nothing"],
        ["emit", "task", "--sets-nothing", "--sets", "title"],
        ["emit", "task", "--whole", "--sets", "title"],
        ["emit", "task", "--sets", "title", "--whole"],
        ["emit", "task", "--whole", "--sets-nothing", "x"],
        ["emit", "task", "--sets-nothing", "--whole", "x"],
    ] {
        assert_eq!(s.fails(&args, "").0, 2, "{args:?}");
    }
    assert_eq!(s.ok(&["export"]), held, "nothing is written");

    // The envelope survives erasure, `sets` with it; withheld too.
    s.ok(&["erase", &status]);
    let erased = s.ok(&["get", &status]);
    assert!(erased.contains("\"sets\":[\"status\"]") && !erased.contains("\"payload\""));
    let other = Store::new("sets-withheld");
    let line = s
        .ok(&["export"])
        .lines()
        .find(|line| line.contains(&status[2..]) && !line.contains("\"erasure\""))
        .expect("the erased line")
        .to_owned();
    other.ok_with(&["import"], &format!("{line}\n"));
    let withheld = other.ok(&["get", &status]);
    assert!(withheld.contains("\"sets\":[\"status\"]") && !withheld.contains("\"payload\""));
}

#[test]
fn two_stores_converge_by_export_and_import() {
    let (a, b) = (Store::new("sync-a"), Store::new("sync-b"));
    let thing = "repo:strange-loops";
    let root = a.ok(&["emit", "decision", "--of", thing, "start"]);
    b.ok_with(&["import"], &a.ok(&["export"]));
    // Each revises what both hold, apart; a third record exists only in b.
    // A revision is of what it replaces, filled in from the imported line.
    // Each revision is read whole, so it leaves the root no key.
    let from_a = a.ok(&[
        "emit",
        "decision",
        "--prev",
        &root,
        "--whole",
        "a's revision",
    ]);
    let from_b = b.ok(&[
        "emit",
        "decision",
        "--prev",
        &root,
        "--whole",
        "b's revision",
    ]);
    // An emit of the thing names every live record of it b holds: b's revision.
    let note = b.ok(&["emit", "note", "--of", thing, "--whole", "only b so far"]);
    assert_eq!(
        strings(&b.json(&["get", &note]), &["env", "prev"]),
        std::slice::from_ref(&from_b)
    );
    // A record that only mentions the thing is none of its heads.
    b.ok(&["emit", "note", "--about", thing, "said in passing"]);
    assert_ne!(a.ok(&["export"]), b.ok(&["export"]));
    // b can't revise a record it doesn't hold.
    assert_eq!(
        b.fails(&["emit", "note", "--prev", &from_a, "x"], ""),
        (1, "refused: prev-unknown".into())
    );
    b.ok_with(&["import"], &a.ok(&["export"]));
    a.ok_with(&["import"], &b.ok(&["export"]));
    assert_eq!(a.ok(&["export"]), b.ok(&["export"]));
    assert_eq!(a.ok(&["export"]).lines().count(), 5);
    // Both now show the same fork, with the same winner.
    let (sa, sb) = (a.json(&["of", thing]), b.json(&["of", thing]));
    assert_eq!(sa, sb);
    // Two heads: a's revision and b's note, which replaced b's revision.
    // The note that only mentions the thing is not one of them.
    assert_eq!(len(&sa, &["heads"]), 2);
    assert_eq!(at(&sa, &["records"]), &Json::Int(4_i64.into()));
    assert!(!a.ok(&["export", "--of", thing]).contains("said in passing"));
    assert!(
        a.ok(&["export", "--about", thing])
            .contains("said in passing")
    );
    let mut heads = head_ids(&sa);
    heads.sort_unstable();
    let mut expected = [from_a.as_str(), note.as_str()];
    expected.sort_unstable();
    assert_eq!(heads, expected);
    // Importing again adds nothing, and a line that doesn't check adds nothing at all.
    let before = a.segments().len();
    a.ok_with(&["import"], &b.ok(&["export"]));
    assert_eq!(
        a.segments().len(),
        before,
        "the same lines are the same segment"
    );
    assert_eq!(a.ok(&["export"]), b.ok(&["export"]));
    let forged = b.ok(&["export"]).replace("only b so far", "only b, so far");
    assert_eq!(a.fails(&["import"], &forged).0, 1);
    assert_eq!(a.ok(&["export"]), b.ok(&["export"]));
}

#[test]
fn usage_refusals_and_a_missing_store_exit_apart() {
    let s = Store::new("exits");
    assert_eq!(s.fails(&["frobnicate"], "").0, 2);
    assert_eq!(s.fails(&["emit"], "").0, 2);
    assert_eq!(
        s.fails(&["emit", "note", "--about", "untyped"], ""),
        (1, "refused: about-not-typed".into())
    );
    assert_eq!(
        s.fails(&["emit", "note", "--of", "Not:typed"], ""),
        (1, "refused: of-not-typed".into())
    );
    assert_eq!(
        s.fails(&["get", "zzzz"], ""),
        (1, "refused: id-unknown: zzzz".into())
    );
    assert_eq!(s.fails(&["read", "nothing"], "").0, 1);
    assert_eq!(
        s.fails(&["fold", "-"], r#"{"vertex":"v"}"#),
        (1, "refused: from-missing at from".into())
    );
    // A key writes only as itself until something binds it to an observer; nothing is written.
    let held = s.ok(&["export"]);
    assert_eq!(
        s.fails(&["emit", "note", "--observer", "sl:kyle", "x"], ""),
        (
            1,
            "refused: observer-unbound: sl:kyle is not this key".into()
        )
    );
    assert_eq!(
        s.fails(
            &["emit", "-"],
            "{\"kind\":\"note\",\"observer\":\"sl:kyle\"}\n"
        )
        .0,
        1
    );
    assert_eq!(s.ok(&["export"]), held);
    let nowhere = Store {
        dir: Path::new("/").to_owned(),
        ..Store::scratch("no-store")
    };
    assert_eq!(nowhere.fails(&["export"], "").0, 2);
}

/// What a verb writes on stdout and stderr, and its exit code.
fn answer(s: &Store, args: &[&str], stdin: &str) -> (i32, String, String) {
    let out = s.run(args, stdin);
    (
        out.status.code().expect("exit code"),
        String::from_utf8(out.stdout).expect("UTF-8"),
        String::from_utf8_lossy(&out.stderr).trim_end().to_owned(),
    )
}
/// A store that holds `lines` and nothing else, so every line checks.
fn holding(name: &str, lines: &str) -> Store {
    let s = Store::new(name);
    s.ok_with(&["import"], lines);
    fs::create_dir_all(s.dir.join(".loops/vertices")).expect("vertices");
    fs::write(s.dir.join(".loops/vertices/decisions.json"), SPEC).expect("spec");
    s
}
/// Each verb that answers from the store writes, byte for byte, what the
/// clean store answers, then is refused as `loops check` is; the clean store
/// exits 0 and says nothing on stderr.
fn answers_then_refuses(s: &Store, clean: &Store, verbs: &[(&[&str], &str)], why: &str) {
    for (args, stdin) in verbs {
        let (code, out, err) = answer(clean, args, stdin);
        assert_eq!((code, err.as_str()), (0, ""), "{args:?} on the clean store");
        let stores = if matches!(args[0], "read" | "fold") {
            " (stores: .)"
        } else {
            ""
        };
        assert_eq!(
            answer(s, args, stdin),
            (1, out, format!("refused: {why}{stores}")),
            "{args:?}"
        );
    }
}

#[test]
fn a_verb_that_answers_from_a_store_that_does_not_check_answers_then_refuses() {
    let s = Store::new("tampered");
    let thing = "repo:strange-loops";
    let kept = s.ok(&[
        "emit",
        "decision",
        "--of",
        thing,
        "status=leaning",
        "n:=1",
        "Go",
    ]);
    let changed = s.ok(&[
        "emit",
        "decision",
        "--prev",
        &kept,
        "status=settled",
        "n:=2",
        "Rust",
    ]);
    fs::create_dir_all(s.dir.join(".loops/vertices")).expect("vertices");
    fs::write(s.dir.join(".loops/vertices/decisions.json"), SPEC).expect("spec");
    let mut remaining = String::new();
    for line in s.ok(&["export"]).lines().filter(|l| !l.contains("Rust")) {
        remaining.push_str(line);
        remaining.push('\n');
    }
    let clean = holding("tampered-clean", &remaining);
    // A tamperer changes the second decision's text in place: its line no
    // longer checks, and its segment's name is no longer its hash.
    let segment = s
        .segments()
        .into_iter()
        .find(|p| fs::read_to_string(p).expect("segment").contains("Rust"))
        .expect("the second decision's segment");
    let bytes = fs::read_to_string(&segment).expect("segment");
    fs::write(&segment, bytes.replace("Rust", "Zig!")).expect("tampered");

    let why = "store-not-clean: 1 line refused, 1 segment altered; `loops check` lists them";
    let verbs: &[(&[&str], &str)] = &[
        (&["read", "decisions"], ""),
        (&["read", "decisions", "--values"], ""),
        (&["fold", "-"], SPEC),
        (&["fold", "-", "--values"], SPEC),
        (&["of", thing], ""),
        (&["get", &kept], ""),
        (&["export"], ""),
        (&["export", "--of", thing], ""),
    ];
    answers_then_refuses(&s, &clean, verbs, why);
    // The answer is the first decision's alone.
    let (_, out, _) = answer(&s, &["of", thing], "");
    assert_eq!(
        head_ids(&parse_json(&out).expect("JSON")),
        std::slice::from_ref(&kept)
    );
    // The changed line is not held, so the verb's own refusal stands.
    assert_eq!(
        s.fails(&["get", &changed], ""),
        (1, format!("refused: id-unknown: {changed}"))
    );
    // `loops check` lists the line and the segment, and is refused the same way.
    let (code, out, err) = answer(&s, &["check"], "");
    assert_eq!((code, err), (1, format!("refused: {why}")));
    let report = parse_json(&out).expect("JSON");
    assert_eq!(
        (len(&report, &["refused"]), len(&report, &["altered"])),
        (1, 1)
    );
    // A writer warns and goes on: what it writes is its own.
    let (code, id, err) = answer(&s, &["emit", "note", "--about", thing, "seen"], "");
    assert_eq!((code, err), (0, format!("warning: {why}")));
    assert!(id.starts_with("r:"));

    let (code, tick, err) = answer(&s, &["tick", "decisions", "--all"], "");
    assert_eq!((code, err), (0, format!("warning: {why}")));
    let (_, line, _) = answer(&s, &["get", tick.trim_end()], "");
    let mut covered = [kept, id.trim_end().to_owned()];
    covered.sort_unstable();
    assert_eq!(
        strings(&parse_json(&line).expect("tick"), &["payload", "covers"]),
        covered
    );
    let (code, verdict, err) = answer(&s, &["tick", "--check", tick.trim_end()], "");
    assert_eq!(
        verdict.trim_end(),
        r#"{"answer":"same","closure":"yes","taken-not-covered":0}"#
    );
    assert_eq!((code, err), (1, format!("refused: {why}")));
}

#[test]
fn a_segment_altered_with_every_line_checking_is_refused_after_the_answer() {
    let s = Store::new("cut");
    let ids = s.changeset(concat!(
        "{\"kind\":\"decision\",\"of\":\"repo:a\",\"payload\":{\"status\":\"open\",\"n\":1}}\n",
        "{\"kind\":\"decision\",\"of\":\"repo:b\",\"payload\":{\"status\":\"open\",\"n\":2}}\n",
    ));
    // One line is cut from the changeset's segment: what is left checks.
    let [segment] = s.segments().try_into().expect("one segment");
    let bytes = fs::read_to_string(&segment).expect("segment");
    let first = bytes.lines().next().expect("a line");
    fs::write(&segment, format!("{first}\n")).expect("cut");
    let clean = holding("cut-clean", &format!("{first}\n"));
    fs::create_dir_all(s.dir.join(".loops/vertices")).expect("vertices");
    fs::write(s.dir.join(".loops/vertices/decisions.json"), SPEC).expect("spec");
    let held = ids
        .iter()
        .find(|id| first.contains(id.as_str()))
        .expect("the line kept");

    let why = "store-not-clean: 0 lines refused, 1 segment altered; `loops check` lists them";
    let verbs: &[(&[&str], &str)] = &[
        (&["read", "decisions"], ""),
        (&["fold", "-"], SPEC),
        (&["of", "repo:a"], ""),
        (&["of", "repo:b"], ""),
        (&["get", held], ""),
        (&["export"], ""),
    ];
    answers_then_refuses(&s, &clean, verbs, why);
    let (code, out, err) = answer(&s, &["check"], "");
    assert_eq!((code, err), (1, format!("refused: {why}")));
    let report = parse_json(&out).expect("JSON");
    assert_eq!(
        (len(&report, &["refused"]), len(&report, &["altered"])),
        (0, 1)
    );
    assert_eq!(at(&report, &["records"]), &Json::Int(1_i64.into()));
}

/// The live records of one thing, as a collect that follows `keys` lists them.
fn live_of(s: &Store, thing: &str) -> Vec<String> {
    let spec = format!(
        r#"{{"vertex":"live","from":[{{"store":".","of":"{thing}"}}],"fold":{{"live":{{"collect":true,"follow":"keys"}}}}}}"#
    );
    let mut live = ids(
        &parse_json(&s.ok_with(&["fold", "-"], &spec)).expect("JSON"),
        &["live", "heads"],
    );
    live.sort();
    live
}

/// Writes one emit through `loops emit` and checks that its `prev` names
/// every live record of `thing` the store held before it, and nothing else.
fn anchored_emit(s: &Store, thing: &str, args: &[&str]) -> String {
    let live = live_of(s, thing);
    let mut command = vec!["emit", "task", "--of", thing];
    command.extend(args);
    let id = s.ok(&command);
    let got = s.json(&["get", &id]);
    let prev = if live.is_empty() {
        assert!(!s.ok(&["get", &id]).contains("\"prev\""), "{args:?}");
        Vec::new()
    } else {
        strings(&got, &["env", "prev"])
    };
    assert_eq!(prev, live, "{args:?}");
    id
}

/// Every record above a record that is live in the store names it in `prev`:
/// the histories `loops emit` writes are anchored.
fn assert_anchored(s: &Store) {
    let lines: Vec<Json> = s
        .ok(&["export"])
        .lines()
        .map(|l| parse_json(l).expect("a stored line"))
        .collect();
    let id = |l: &Json| text(l, &["id"]).to_owned();
    let thing = |l: &Json| match at(l, &["env"]) {
        Json::Obj(env) if env.iter().any(|(k, _)| k == "of") => text(l, &["env", "of"]).to_owned(),
        _ => id(l),
    };
    let prev = |l: &Json| match at(l, &["env"]) {
        Json::Obj(env) if env.iter().any(|(k, _)| k == "prev") => strings(l, &["env", "prev"]),
        _ => Vec::new(),
    };
    let mut things: Vec<String> = lines.iter().map(thing).collect();
    things.sort();
    things.dedup();
    for t in things {
        let of: Vec<&Json> = lines.iter().filter(|l| thing(l) == t).collect();
        for x in live_of(s, &t) {
            // The records above x, through the records of its thing.
            let mut above: Vec<String> = vec![x.clone()];
            let mut grew = true;
            while grew {
                grew = false;
                for l in &of {
                    if !above.contains(&id(l)) && prev(l).iter().any(|p| above.contains(p)) {
                        above.push(id(l));
                        grew = true;
                    }
                }
            }
            for l in of.iter().filter(|l| above[1..].contains(&id(l))) {
                assert!(
                    prev(l).contains(&x),
                    "{} is above {x} and does not name it",
                    id(l)
                );
            }
        }
    }
}

const OPEN: &str = r#"{"vertex":"open","from":[{"store":".","kind":["task"]}],"fold":{
  "open":{"count":true,"follow":"keys","where":{"status":{"is":"open"}}},
  "open-heads":{"count":true,"follow":"prev","where":{"status":{"is":"open"}}},
  "titles":{"collect":true,"follow":"keys","where":{"title":{"is":"Rewrite"}}},
  "per-project":{"count":true,"follow":"keys","by":"env.about:project"}}}"#;

#[test]
fn an_emit_names_every_live_record_of_its_thing_and_carries_its_about() {
    let s = Store::new("anchor");
    // The note's history: a task created whole, then status set, then title.
    let whole = [
        "--about",
        "project:x",
        "status=open",
        "title=Write",
        "Write the spec",
    ];
    let w = anchored_emit(&s, "task:1", &whole);
    let st = anchored_emit(&s, "task:1", &["--sets", "status", "status=done"]);
    let ti = anchored_emit(&s, "task:1", &["--sets", "title", "title=Rewrite"]);
    anchored_emit(&s, "task:2", &whole);
    anchored_emit(&s, "task:2", &["--sets", "title", "title=Rewrite"]);
    // The title names the status setter and the whole-read root, both live.
    let mut both = vec![st.clone(), w];
    both.sort();
    assert_eq!(strings(&s.json(&["get", &ti]), &["env", "prev"]), both);
    // Every emit carries the thing's whole `about`, copied from its heads.
    for id in [&st, &ti] {
        assert_eq!(
            strings(&s.json(&["get", id]), &["env", "about"]),
            ["project:x"]
        );
    }
    // Following keys, task:2 is open and task:1 done; over heads, neither
    // head sets `status`, so neither reads open.
    let slots = parse_json(&s.ok_with(&["fold", "-"], OPEN)).expect("JSON");
    let n = |v: i64| Json::Int(v.into());
    assert_eq!(at(&slots, &["open", "value"]), &n(1));
    assert_eq!(at(&slots, &["open-heads", "value"]), &n(0));
    assert_eq!(len(&slots, &["titles", "heads"]), 5);
    assert_eq!(at(&slots, &["per-project", "groups", "x", "value"]), &n(2));
    assert_eq!(live_of(&s, "task:1").len(), 3);
    // A whole-read emit names the same records and is then the only live one.
    let again = anchored_emit(&s, "task:1", &["--whole", "status=open", "title=Again"]);
    assert_eq!(live_of(&s, "task:1"), std::slice::from_ref(&again));
    let state = parse_json(&s.ok_with(&["fold", "-"], KEYED)).expect("JSON");
    let task = ["state", "things", "task:1"];
    assert_eq!(
        ids(&state, &[&task[..], &["whole"]].concat()),
        std::slice::from_ref(&again)
    );
    assert_eq!(ids(&state, &[&task[..], &["heads"]].concat()), [again]);
    assert_eq!(
        at(&state, &[&task[..], &["keys"]].concat()),
        &Json::Obj(vec![])
    );
    assert_anchored(&s);
}

#[test]
fn an_emit_over_a_merged_fork_names_both_heads_and_every_mention() {
    let (a, b) = (Store::new("anchor-a"), Store::new("anchor-b"));
    let w = anchored_emit(
        &a,
        "task:1",
        &["--about", "project:x", "status=open", "title=Write"],
    );
    b.ok_with(&["import"], &a.ok(&["export"]));
    // Apart, a moves the task to project y and b sets its title.
    let moved = anchored_emit(
        &a,
        "task:1",
        &["--sets", "status", "--about", "project:y", "status=open"],
    );
    let titled = anchored_emit(&b, "task:1", &["--sets", "title", "title=Rewrite"]);
    assert_eq!(
        strings(&b.json(&["get", &titled]), &["env", "about"]),
        ["project:x"]
    );
    a.ok_with(&["import"], &b.ok(&["export"]));
    // Merged, the thing has two heads and the root is still live for `text`.
    let mut live = vec![w, moved, titled];
    live.sort();
    assert_eq!(live_of(&a, "task:1"), live);
    // One emit names all three and mentions what both heads mention.
    let join = anchored_emit(&a, "task:1", &["--sets-nothing"]);
    assert_eq!(
        strings(&a.json(&["get", &join]), &["env", "about"]),
        ["project:x", "project:y"]
    );
    assert_eq!(head_ids(&a.json(&["of", "task:1"])), [join]);
    assert_anchored(&a);
}

#[test]
fn about_is_replaced_by_about_and_emptied_by_no_about() {
    let s = Store::new("about");
    let slots = || parse_json(&s.ok_with(&["fold", "-"], OPEN)).expect("JSON");
    let n = |v: i64| Json::Int(v.into());
    anchored_emit(
        &s,
        "task:1",
        &["--about", "project:x", "--about", "team:a", "status=open"],
    );
    assert_eq!(
        at(&slots(), &["per-project", "groups", "x", "value"]),
        &n(1)
    );
    // `--about` states the whole `about`: the task moves to y, and leaves the team.
    let moved = anchored_emit(
        &s,
        "task:1",
        &["--sets", "status", "--about", "project:y", "status=done"],
    );
    assert_eq!(
        strings(&s.json(&["get", &moved]), &["env", "about"]),
        ["project:y"]
    );
    let grouped = slots();
    let Json::Obj(groups) = at(&grouped, &["per-project", "groups"]) else {
        panic!("groups")
    };
    assert_eq!(
        groups.iter().map(|(k, _)| k.as_str()).collect::<Vec<_>>(),
        ["y"]
    );
    // `--no-about` states none: the task mentions nothing and is ungrouped.
    let none = anchored_emit(&s, "task:1", &["--sets", "title", "--no-about", "title=x"]);
    assert!(!s.ok(&["get", &none]).contains("\"about\""));
    assert_eq!(at(&slots(), &["per-project", "ungrouped"]), &n(1));
    // An emit after it copies nothing.
    let after = anchored_emit(&s, "task:1", &["--sets", "title", "title=y"]);
    assert!(!s.ok(&["get", &after]).contains("\"about\""));
    // The two together are a usage error, and nothing is written.
    let held = s.ok(&["export"]);
    for args in [
        [
            "emit",
            "task",
            "--of",
            "task:1",
            "--no-about",
            "--about",
            "project:x",
        ],
        [
            "emit",
            "task",
            "--of",
            "task:1",
            "--about",
            "project:x",
            "--no-about",
        ],
    ] {
        assert_eq!(s.fails(&args, "").0, 2, "{args:?}");
    }
    assert_eq!(s.ok(&["export"]), held);
}

#[test]
fn occurred_is_copied_replaced_and_cleared() {
    let s = Store::new("occurred");
    let base = s.ok(&[
        "emit",
        "task",
        "--of",
        "adr:7",
        "--occurred",
        "2009",
        "title=ADR",
    ]);
    let updated = s.ok(&["emit", "task", "--of", "adr:7", "status=accepted"]);
    assert_eq!(
        text(&s.json(&["get", &updated]), &["env", "occurred"]),
        "2009"
    );

    for args in [&["emit", "task"][..], &["emit", "task", "--of", "adr:8"]] {
        let first = s.ok(args);
        assert!(!has(&s.json(&["get", &first]), &["env"], "occurred"));
    }

    let changed = s.ok(&["emit", "task", "--prev", &updated, "--occurred", "2019"]);
    assert_eq!(
        text(&s.json(&["get", &changed]), &["env", "occurred"]),
        "2019"
    );
    // The older, live title setter still states 2009. Only heads supply occurred.
    let carried = s.ok(&["emit", "task", "--prev", &changed]);
    let record = s.json(&["get", &carried]);
    assert!(strings(&record, &["env", "prev"]).contains(&base));
    assert_eq!(text(&record, &["env", "occurred"]), "2019");

    let cleared = s.ok(&["emit", "task", "--of", "adr:7", "--no-occurred"]);
    let later = s.ok(&["emit", "task", "--of", "adr:7"]);
    for id in [cleared, later] {
        assert!(!has(&s.json(&["get", &id]), &["env"], "occurred"));
    }

    let held = s.ok(&["export"]);
    for flags in [
        ["--occurred", "2009", "--no-occurred"],
        ["--no-occurred", "--occurred", "2009"],
    ] {
        let (code, error) = s.fails(&[&["emit", "task"][..], &flags].concat(), "");
        assert_eq!(code, 2);
        assert!(error.contains("--no-occurred takes no --occurred beside it"));
    }
    assert_eq!(s.ok(&["export"]), held);
}

#[test]
fn disagreeing_heads_supply_no_occurred() {
    let a = Store::new("occurred-fork-a");
    let b = Store::new("occurred-fork-b");
    let base = a.ok(&["emit", "task", "--of", "adr:7"]);
    b.ok_with(&["import"], &a.ok(&["export"]));
    let left = a.ok(&["emit", "task", "--prev", &base, "--occurred", "2009"]);
    let right = b.ok(&["emit", "task", "--prev", &base, "--occurred", "2019"]);
    a.ok_with(&["import"], &b.ok(&["export"]));
    let heads = head_ids(&a.json(&["of", "adr:7"]));
    assert_eq!(heads.len(), 2);
    assert!(heads.contains(&left) && heads.contains(&right));
    let joined = a.ok(&["emit", "task", "--of", "adr:7"]);
    assert!(!has(&a.json(&["get", &joined]), &["env"], "occurred"));
}

#[test]
fn an_erased_or_withheld_head_supplies_occurred() {
    let s = Store::new("occurred-erased");
    let id = s.ok(&["emit", "task", "--of", "adr:7", "--occurred", "2009"]);
    s.ok(&["erase", &id]);
    let other = Store::new("occurred-withheld");
    other.ok_with(&["import"], &s.ok(&["export", "--kind", "task"]));
    for (store, shown) in [(&s, "erased"), (&other, "withheld")] {
        let state = store.json(&["of", "adr:7"]);
        let Json::Arr(unheld) = at(&state, &["unheld"]) else {
            panic!("unheld records")
        };
        assert_eq!(text(&unheld[0], &["id"]), id);
        assert_eq!(text(&unheld[0], &["shown"]), shown);
        let next = store.ok(&["emit", "task", "--of", "adr:7"]);
        assert_eq!(
            text(&store.json(&["get", &next]), &["env", "occurred"]),
            "2009"
        );
    }
}

#[test]
fn an_erased_or_withheld_live_record_is_named_and_a_first_record_names_nothing() {
    let s = Store::new("anchor-erased");
    let w = anchored_emit(&s, "task:1", &["status=open", "title=Write"]);
    let st = anchored_emit(&s, "task:1", &["--sets", "status", "status=done"]);
    let erasure = s.json(&["erase", &st, "not ours to say"]);
    // An erasure is a root, its own thing, and names nothing in `prev`.
    assert!(!s.ok(&["get", text(&erasure, &["id"])]).contains("\"prev\""));
    // The erased setter keeps its envelope, is still live, and is named.
    let mut both = vec![st.clone(), w];
    both.sort();
    assert_eq!(live_of(&s, "task:1"), both);
    let erased = s.ok(&["export"]);
    anchored_emit(&s, "task:1", &["--sets", "title", "title=Rewrite"]);
    // A store holding the setter's envelope without its eraser holds it withheld.
    let other = Store::new("anchor-withheld");
    let lines: String = erased
        .lines()
        .filter(|l| !l.contains("\"erasure\""))
        .flat_map(|l| [l, "\n"])
        .collect();
    other.ok_with(&["import"], &lines);
    assert!(!other.ok(&["get", &st]).contains("\"payload\""));
    assert_eq!(live_of(&other, "task:1"), both);
    anchored_emit(&other, "task:1", &["--sets", "title", "title=Rewrite"]);
    // A root and the first record of a natural key name nothing.
    let root = s.ok(&["emit", "note", "first"]);
    assert!(!s.ok(&["get", &root]).contains("\"prev\""));
    anchored_emit(&s, "task:9", &["status=open"]);
    // A thing named by a root's id is that root's thing: the root is named.
    let revised = s.ok(&["emit", "note", "--of", &root, "second"]);
    assert_eq!(
        strings(&s.json(&["get", &revised]), &["env", "prev"]),
        [root]
    );
    assert_anchored(&s);
    assert_anchored(&other);
}

#[test]
fn a_changeset_fills_nothing_in_and_reads_whole() {
    let s = Store::new("anchor-changeset");
    anchored_emit(
        &s,
        "task:1",
        &["--about", "project:x", "--occurred", "2009", "status=open"],
    );
    let loose = s
        .changeset("{\"kind\":\"task\",\"of\":\"task:1\",\"sets\":[\"status\"],\"payload\":{\"status\":\"done\"}}\n")
        .remove(0);
    let line = s.ok(&["get", &loose]);
    assert!(!line.contains("\"prev\"") && !line.contains("\"about\""));
    assert!(!line.contains("\"occurred\""));
    // Unanchored, it is a second head and a second live setter of `status`:
    // the two disagree, so the task's status is unknown, not wrong.
    assert_eq!(len(&s.json(&["of", "task:1"]), &["heads"]), 2);
    let slots = parse_json(&s.ok_with(&["fold", "-"], OPEN)).expect("JSON");
    assert_eq!(
        tally(&slots, "open"),
        (Json::Int(0_i64.into()), Json::Int(1_i64.into()))
    );
}

/// The answer with what `--values` adds taken out: each listed record's
/// envelope and payload, and a keyed thing's about and values.
fn without_values(j: &Json) -> Json {
    match j {
        Json::Obj(members) => Json::Obj(
            members
                .iter()
                .filter(|(k, _)| {
                    !["env", "payload", "about", "values", "setters", "unheld"]
                        .contains(&k.as_str())
                })
                .map(|(k, v)| (k.clone(), without_values(v)))
                .collect(),
        ),
        Json::Arr(items) => Json::Arr(items.iter().map(without_values).collect()),
        other => other.clone(),
    }
}
fn str_json(text: &str) -> Json {
    Json::Str(text.into())
}
/// Each setter's id and value, from `setters.<key>`.
fn setter_values(j: &Json, path: &[&str]) -> Vec<(String, Option<Json>)> {
    let Json::Arr(xs) = at(j, path) else {
        panic!("{path:?} is not a list")
    };
    xs.iter()
        .map(|x| {
            let Json::Obj(members) = x else {
                panic!("a setter")
            };
            let value = members
                .iter()
                .find(|(k, _)| k == "value")
                .map(|(_, v)| v.clone());
            (text(x, &["id"]).to_owned(), value)
        })
        .collect()
}
fn has(j: &Json, path: &[&str], name: &str) -> bool {
    matches!(at(j, path), Json::Obj(members) if members.iter().any(|(k, _)| k == name))
}

const PROJECT: &str = r#"{"vertex":"project","from":[{"store":"."}],"fold":{
  "open":{"latest-by":"of","follow":"keys","where":{"status":{"is":"open"}}},
  "heads":{"latest-by":"of","follow":"prev","where":{"env.kind":{"is":"decision"}}},
  "open-tasks":{"count":true,"follow":"keys","where":{"env.kind":{"is":"task"},"status":{"is":"open"}}},
  "log":{"collect":true,"where":{"env.kind":{"is":"log"}}}}}"#;

#[test]
fn a_session_reads_values_and_an_update_sets_only_the_fields_it_names() {
    let s = Store::new("session");
    for (kind, thing, name, message) in [
        (
            "task",
            "task:fix-login",
            "fix-login",
            "Login fails on expired token",
        ),
        (
            "task",
            "task:bench-oom",
            "bench-oom",
            "Workbench OOM, lost sessions",
        ),
        (
            "decision",
            "decision:auth-jwt",
            "auth-jwt",
            "Short-lived JWTs",
        ),
    ] {
        let first = s.ok(&[
            "emit",
            kind,
            "--of",
            thing,
            "--about",
            "project:loops",
            &format!("name={name}"),
            "status=open",
            message,
        ]);
        // The first record of a thing is read whole.
        assert!(!s.ok(&["get", &first]).contains("\"sets\""));
    }
    s.ok(&["emit", "log", "cargo cache locked"]);
    // The old habit: re-emit the field that changed, and nothing else.
    let done = s.ok(&["emit", "task", "--of", "task:bench-oom", "status=done"]);
    assert_eq!(
        strings(&s.json(&["get", &done]), &["env", "sets"]),
        ["status"]
    );
    let state = s.json(&["of", "task:bench-oom"]);
    assert_eq!(
        at(&state, &["values"]),
        &Json::Obj(vec![
            ("name".into(), str_json("bench-oom")),
            ("status".into(), str_json("done")),
            ("text".into(), str_json("Workbench OOM, lost sessions")),
        ])
    );
    assert_eq!(strings(&state, &["about"]), ["project:loops"]);
    assert_eq!(head_ids(&state), [done]);
    assert_eq!(at(&state, &["records"]), &Json::Int(2_i64.into()));
    // An emit naming no field sets none: a pure join, here moving the task.
    let moved = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:fix-login",
        "--about",
        "project:x",
    ]);
    assert_eq!(
        at(&s.json(&["get", &moved]), &["env", "sets"]),
        &Json::Arr(vec![])
    );
    let state = s.json(&["of", "task:fix-login"]);
    assert_eq!(text(&state, &["values", "name"]), "fix-login");
    assert_eq!(strings(&state, &["about"]), ["project:x"]);

    // One read at the start of a session: each open item's name and status.
    fs::create_dir_all(s.dir.join(".loops/vertices")).expect("vertices");
    fs::write(s.dir.join(".loops/vertices/project.json"), PROJECT).expect("spec");
    let read = s.json(&["read", "project", "--values"]);
    let open =
        |thing: &str, key: &str| text(&read, &["open", "things", thing, "values", key]).to_owned();
    assert_eq!(
        [
            open("task:fix-login", "name"),
            open("task:fix-login", "status")
        ],
        ["fix-login", "open"]
    );
    assert_eq!(open("decision:auth-jwt", "text"), "Short-lived JWTs");
    assert_eq!(things(&read, "open"), 2, "bench-oom is done");
    let decision = at(&read, &["heads", "things", "decision:auth-jwt"]);
    let Json::Arr(heads) = decision else {
        panic!("heads")
    };
    assert_eq!(text(&heads[0], &["payload", "name"]), "auth-jwt");
    assert_eq!(strings(&heads[0], &["env", "about"]), ["project:loops"]);
    let Json::Arr(log) = at(&read, &["log", "heads"]) else {
        panic!("log")
    };
    assert_eq!(text(&log[0], &["payload", "text"]), "cargo cache locked");
    // Without --values the answer is the protocol's, byte for byte, and
    // --values only adds to it.
    let plain = s.ok(&["read", "project"]);
    assert_eq!(plain, s.ok_with(&["fold", "-"], PROJECT));
    assert_eq!(without_values(&read).canon(), plain);
    assert_eq!(s.ok_with(&["fold", "-", "--values"], PROJECT), read.canon());
}

const STATE: &str = r#"{"vertex":"state","from":[{"store":".","kind":["task"]}],"fold":{
  "state":{"latest-by":"of","follow":"keys"}}}"#;

#[test]
fn a_key_with_two_live_setters_shows_each_value_with_its_id() {
    let (a, b) = (Store::new("values-a"), Store::new("values-b"));
    a.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "status=open",
        "title=Write",
    ]);
    b.ok_with(&["import"], &a.ok(&["export"]));
    // Apart, each sets `status`; merged, both are live for it.
    let done = a.ok(&["emit", "task", "--of", "task:1", "status=done"]);
    let held = b.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "--about",
        "project:b",
        "status=held",
    ]);
    a.ok_with(&["import"], &b.ok(&["export"]));
    let state = a.json(&["of", "task:1"]);
    assert_eq!(text(&state, &["values", "title"]), "Write");
    assert!(!has(&state, &["values"], "status"), "no winner is picked");
    let mut got = setter_values(&state, &["setters", "status"]);
    got.sort_by(|x, y| x.0.cmp(&y.0));
    let mut expected = vec![
        (done, Some(str_json("done"))),
        (held, Some(str_json("held"))),
    ];
    expected.sort_by(|x, y| x.0.cmp(&y.0));
    assert_eq!(got, expected);
    // The keyed slot shows the same values beside its keyed state.
    let read = parse_json(&a.ok_with(&["fold", "-", "--values"], STATE)).expect("JSON");
    let thing = at(&read, &["state", "things", "task:1"]);
    for member in ["about", "values", "setters"] {
        assert_eq!(at(thing, &[member]), at(&state, &[member]));
    }
    let Json::Arr(heads) = at(thing, &["heads"]) else {
        panic!("heads")
    };
    assert_eq!(heads.len(), 2);
    for head in heads {
        let record = a.json(&["get", text(head, &["id"])]);
        assert_eq!(at(head, &["env"]), at(&record, &["env"]));
        assert!(!has(head, &[], "payload"));
    }
    let plain = parse_json(&a.ok_with(&["fold", "-"], STATE)).expect("JSON");
    for member in ["keys", "whole"] {
        assert_eq!(
            at(thing, &[member]),
            at(&plain, &["state", "things", "task:1", member])
        );
    }
}

#[test]
fn an_erased_or_withheld_live_setter_shows_as_unknown() {
    let s = Store::new("values-erased");
    let root = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "status=open",
        "title=Write",
    ]);
    let done = s.ok(&["emit", "task", "--of", "task:1", "status=done"]);
    s.ok(&["erase", &done]);
    let state = s.json(&["of", "task:1"]);
    assert_eq!(text(&state, &["values", "title"]), "Write");
    assert!(!has(&state, &["values"], "status"));
    assert_eq!(
        setter_values(&state, &["setters", "status"]),
        [(done.clone(), None)]
    );
    // A store holding the setter without its eraser holds it withheld.
    let other = Store::new("values-withheld");
    let lines: String = s
        .ok(&["export"])
        .lines()
        .filter(|l| !l.contains("\"erasure\""))
        .flat_map(|l| [l, "\n"])
        .collect();
    other.ok_with(&["import"], &lines);
    let state = other.json(&["of", "task:1"]);
    assert!(!has(&state, &["values"], "status"));
    let Json::Arr(setters) = at(&state, &["setters", "status"]) else {
        panic!("setters")
    };
    assert_eq!(text(&setters[0], &["shown"]), "withheld");
    // An erased record read whole hides every key it sets: it is listed as unheld.
    s.ok(&["erase", &root]);
    let state = s.json(&["of", "task:1"]);
    assert_eq!(at(&state, &["values"]), &Json::Obj(vec![]));
    assert_eq!(ids(&state, &["unheld"]), [root]);
    assert_eq!(
        setter_values(&state, &["setters", "status"]),
        [(done, None)]
    );
}

#[test]
fn an_undeclared_key_is_not_shown_and_whole_replaces_everything() {
    let s = Store::new("values-declared");
    s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "status=open",
        "title=Write",
        "Write it",
    ]);
    // The emit declares `status` and `title`: `colour` is in its payload and
    // not read, and `title`, declared and missing, is unset.
    let stated = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "--sets",
        "status",
        "--sets",
        "title",
        "status=done",
        "colour=red",
    ]);
    let state = s.json(&["of", "task:1"]);
    assert_eq!(
        at(&state, &["values"]),
        &Json::Obj(vec![
            ("status".into(), str_json("done")),
            ("text".into(), str_json("Write it")),
        ])
    );
    assert!(!has(&state, &["values"], "colour") && !has(&state, &["values"], "title"));
    // A collect lists the record's payload as it is stored.
    let live = parse_json(&s.ok_with(
        &["fold", "-", "--values"],
        r#"{"vertex":"v","from":[{"store":".","of":"task:1"}],"fold":{"live":{"collect":true,"follow":"keys"}}}"#,
    ))
    .expect("JSON");
    let Json::Arr(records) = at(&live, &["live", "heads"]) else {
        panic!("heads")
    };
    assert_eq!(text(&records[0], &["id"]), stated);
    assert_eq!(text(&records[0], &["payload", "colour"]), "red");
    // --whole states no `sets`: the emit replaces everything.
    let whole = s.ok(&["emit", "task", "--of", "task:1", "--whole", "status=done"]);
    assert!(!s.ok(&["get", &whole]).contains("\"sets\""));
    let state = s.json(&["of", "task:1"]);
    assert_eq!(
        at(&state, &["values"]),
        &Json::Obj(vec![("status".into(), str_json("done"))])
    );
    assert_eq!(head_ids(&state), [whole]);
    // --whole beside --sets or --sets-nothing is a usage error; so is a
    // second argument to read or fold, and nothing is written.
    let held = s.ok(&["export"]);
    for args in [
        &[
            "emit", "task", "--of", "task:1", "--whole", "--sets", "status", "status=x",
        ][..],
        &[
            "emit",
            "task",
            "--of",
            "task:1",
            "--sets-nothing",
            "--whole",
        ],
        &["read", "project", "other", "--values"],
        &["fold", "-", "-"],
        &["of", "task:1", "--values"],
    ] {
        assert_eq!(s.fails(args, "").0, 2, "{args:?}");
    }
    assert_eq!(s.ok(&["export"]), held);
}

const GROUPED_VALUES: &str = r#"{"vertex":"grouped","from":[{"store":".","kind":["task"]}],"fold":{
  "by-project":{"collect":true,"follow":"keys","by":"env.about:project"},
  "heads-by-status":{"collect":true,"follow":"prev","by":"status"},
  "n":{"count":true,"follow":"keys","by":"status"}}}"#;

#[test]
fn a_grouped_slot_writes_the_values_inside_each_group() {
    let s = Store::new("values-grouped");
    s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "--about",
        "project:x",
        "status=open",
        "One",
    ]);
    let two = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:2",
        "--about",
        "project:y",
        "status=open",
        "Two",
    ]);
    let closed = s.ok(&["emit", "task", "--of", "task:2", "status=done"]);
    let read = parse_json(&s.ok_with(&["fold", "-", "--values"], GROUPED_VALUES)).expect("JSON");
    assert_eq!(
        without_values(&read).canon(),
        s.ok_with(&["fold", "-"], GROUPED_VALUES)
    );
    // Following keys, task 2's live records are its whole-read root and the
    // record that set `status`; each is listed with its payload.
    let Json::Arr(y) = at(&read, &["by-project", "groups", "y", "heads"]) else {
        panic!("y")
    };
    for entry in y {
        let record = s.json(&["get", text(entry, &["id"])]);
        assert_eq!(at(entry, &["env"]), at(&record, &["env"]));
    }
    let listed: Vec<(&str, &Json)> = y
        .iter()
        .map(|r| (text(r, &["id"]), at(r, &["payload"])))
        .collect();
    assert_eq!(
        listed,
        [
            (
                closed.as_str(),
                &Json::Obj(vec![("status".into(), str_json("done"))])
            ),
            (
                two.as_str(),
                &Json::Obj(vec![
                    ("status".into(), str_json("open")),
                    ("text".into(), str_json("Two")),
                ])
            ),
        ]
    );
    // Over heads, each group's records carry their payloads too.
    let Json::Arr(open) = at(&read, &["heads-by-status", "groups", "open", "heads"]) else {
        panic!("open")
    };
    assert_eq!(text(&open[0], &["payload", "text"]), "One");
    // A count has no ids, so nothing is added.
    assert_eq!(
        at(&read, &["n"]).canon(),
        at(&without_values(&read), &["n"]).canon()
    );
}

#[test]
fn a_collect_keeps_the_envelope_when_the_payload_is_erased_or_withheld() {
    const LOG: &str =
        r#"{"vertex":"v","from":[{"store":".","kind":["note"]}],"fold":{"log":{"collect":true}}}"#;
    let s = Store::new("collect-env");
    let id = s.ok(&["emit", "note", "--about", "project:x", "hello"]);
    let record = s.json(&["get", &id]);
    let env = at(&record, &["env"]);
    assert_ne!(text(env, &["emitted"]), "");
    assert_ne!(text(env, &["observer"]), "");
    assert_eq!(strings(env, &["about"]), ["project:x"]);

    let check = |store: &Store, shown| {
        let fold = parse_json(&store.ok_with(&["fold", "-", "--values"], LOG)).expect("JSON");
        let Json::Arr(entries) = at(&fold, &["log", "heads"]) else {
            panic!("heads")
        };
        assert_eq!(entries.len(), 1);
        assert_eq!(text(&entries[0], &["shown"]), shown);
        assert_eq!(at(&entries[0], &["env"]), env);
        assert_eq!(has(&entries[0], &[], "payload"), shown == "here");
    };
    check(&s, "here");
    s.ok(&["erase", &id]);
    check(&s, "erased");
    let other = Store::new("collect-env-withheld");
    other.ok_with(&["import"], &s.ok(&["export", "--kind", "note"]));
    check(&other, "withheld");
}

#[test]
fn service_lists_are_read_by_folds_and_shown_in_full() {
    let store = Store::new("payload-services");
    let grafana = store.ok(&[
        "emit",
        "svc",
        "--of",
        "svc:grafana",
        r#"watches:=["svc:prometheus","svc:loki"]"#,
    ]);
    let prometheus = store.ok(&[
        "emit",
        "svc",
        "--of",
        "svc:prometheus",
        r#"watches:=["svc:node-exporter"]"#,
    ]);
    let loki = store.ok(&[
        "emit",
        "svc",
        "--of",
        "svc:loki",
        "watches:=[]",
        "notes:=null",
        r#"labels:={"tier":"infra"}"#,
    ]);
    let caddy = store.ok(&["emit", "svc", "--of", "svc:caddy", "ports:=[80,443,8080]"]);
    store.ok(&["emit", "backup", "--of", "backup:nas", "status=failed"]);
    let shown = store.json(&["of", "svc:loki"]);
    assert_eq!(at(&shown, &["values", "notes"]), &Json::Null);
    assert_eq!(
        strings(&shown, &["values", "watches"]),
        Vec::<String>::new()
    );
    assert_eq!(text(&shown, &["values", "labels", "tier"]), "infra");

    for (i, raw) in [
        include_str!("../../../vectors/spec/run/pv3-written.json"),
        include_str!("../../../vectors/spec/run/pv4-members.json"),
        include_str!("../../../vectors/spec/run/pv5-list-bounds.json"),
        include_str!("../../../vectors/spec/run/pv6-list-groups.json"),
        include_str!("../../../vectors/spec/run/pv7-list-numeric.json"),
    ]
    .iter()
    .enumerate()
    {
        let vector = parse_json(raw).expect("service vector");
        let spec = at(&vector, &["input", "spec"]).canon();
        let slots = parse_json(&store.ok_with(&["fold", "-"], &spec)).expect("fold");
        let Json::Obj(expected) = at(&vector, &["expect"]) else {
            panic!("slots")
        };
        for (k, v) in expected {
            if ["missing", "who", "others", "records"].contains(&k.as_str()) {
                continue;
            }
            assert_eq!(at(&slots, &[k]).canon(), v.canon(), "{k}");
        }
        if i == 0 {
            assert_eq!(
                ids(&slots, &["missing", "heads"]),
                std::slice::from_ref(&caddy)
            );
        }
        if i == 1 {
            let mut others = ids(&slots, &["others", "heads"]);
            others.sort();
            let mut expected = [prometheus.clone(), loki.clone(), caddy.clone()];
            expected.sort();
            assert_eq!(others, expected);
            assert_eq!(
                ids(&slots, &["who", "heads"]),
                std::slice::from_ref(&grafana)
            );
        }
        if i == 3 {
            assert_eq!(
                ids(&slots, &["records", "groups", "svc:loki", "heads"]),
                std::slice::from_ref(&grafana)
            );
        }
    }
}

#[test]
fn concurrent_route_lists_are_tested_per_setter_and_displayed_whole() {
    for (label, left, raw) in [
        (
            "apart",
            r#"["svc:a"]"#,
            include_str!("../../../vectors/spec/run/pv-keys-disjoint.json"),
        ),
        (
            "overlap",
            r#"["svc:a","svc:b"]"#,
            include_str!("../../../vectors/spec/run/pv-keys-overlap.json"),
        ),
    ] {
        let (a, b) = (
            Store::new(&format!("routes-a-{label}")),
            Store::new(&format!("routes-b-{label}")),
        );
        a.ok(&["emit", "svc", "--of", "svc:fork", "base=x"]);
        b.ok_with(&["import"], &a.ok(&["export"]));
        let right = if label == "apart" {
            r#"["svc:b"]"#
        } else {
            r#"["svc:a"]"#
        };
        let x = a.ok(&[
            "emit",
            "svc",
            "--of",
            "svc:fork",
            "--sets",
            "routes",
            "--sets",
            "notes",
            "--sets",
            "missing",
            &format!("routes:={left}"),
            "notes:=null",
            "extra:=true",
        ]);
        let y = b.ok(&[
            "emit",
            "svc",
            "--of",
            "svc:fork",
            &format!("routes:={right}"),
        ]);
        a.ok_with(&["import"], &b.ok(&["export"]));
        let vector = parse_json(raw).expect("keyed vector");
        let spec = at(&vector, &["input", "spec"]).canon();
        let slots = parse_json(&a.ok_with(&["fold", "-"], &spec)).expect("slots");
        for k in [
            "a",
            "b",
            "c",
            "present",
            "not-c",
            "routes",
            "null",
            "omitted",
            "undeclared",
        ] {
            assert_eq!(
                at(&slots, &[k]).canon(),
                at(&vector, &["expect", k]).canon(),
                "{label} {k}"
            );
        }
        let values = parse_json(&a.ok_with(&["fold", "-", "--values"], &spec)).expect("decorated");
        let state = a.json(&["of", "svc:fork"]);
        let mut expected = vec![
            (x, Some(parse_json(left).unwrap())),
            (y, Some(parse_json(right).unwrap())),
        ];
        expected.sort_by(|a, b| a.0.cmp(&b.0));
        for thing in [&state, at(&values, &["state", "things", "svc:fork"])] {
            let mut observed = setter_values(thing, &["setters", "routes"]);
            observed.sort_by(|a, b| a.0.cmp(&b.0));
            assert_eq!(observed, expected);
        }
        assert_eq!(without_values(&values).canon(), slots.canon());
    }
}

const FILL: &[&str] = &["emit", "-", "--fill"];
const WHEN: &str = "2026-11-20T00:00:00Z";
const SALT: &str = "00000000000000000000000000";

fn fixed_store(name: &str) -> Store {
    let s = Store::new(name);
    fs::write(s.dir.join("device-key"), "0".repeat(52)).expect("fixed device key");
    s
}

fn fixed_emit(s: &Store, fields: &[&str]) -> String {
    let mut args = vec!["emit", "--emitted", WHEN, "--salt", SALT];
    args.extend(fields);
    s.ok(&args)
}

fn filled(s: &Store, rows: &str) -> Vec<String> {
    let answer = s.ok_with(FILL, rows);
    ids(
        &parse_json(&answer).expect("changeset answer"),
        &["records"],
    )
}

/// Compare the full signed lines using the same observer, clock and salts.
fn assert_twins(batch: &Store, singles: &Store, rows: &str, expected: &[String]) {
    let input = rows
        .lines()
        .map(|line| {
            let Json::Obj(mut fields) = parse_json(line).expect("input line") else {
                panic!("object")
            };
            fields.push(("emitted".into(), Json::Str(WHEN.into())));
            fields.push(("salt".into(), Json::Str(SALT.into())));
            Json::Obj(fields).canon()
        })
        .collect::<Vec<_>>()
        .join("\n");
    let before = batch.segments();
    let out = parse_json(&batch.ok_with(FILL, &input)).expect("filled answer");
    assert_eq!(ids(&out, &["records"]), expected);
    let Json::Arr(entries) = at(&out, &["records"]) else {
        panic!("records")
    };
    for (entry, line) in entries.iter().zip(rows.lines()) {
        let row = parse_json(line).expect("input line");
        assert_eq!(has(entry, &[], "label"), has(&row, &[], "label"));
        if has(&row, &[], "label") {
            assert_eq!(text(entry, &["label"]), text(&row, &["label"]));
        }
    }
    for id in expected {
        assert_eq!(batch.ok(&["get", id]), singles.ok(&["get", id]));
    }
    let after = batch.segments();
    assert_eq!(after.len(), before.len() + 1);
    let segment = after
        .iter()
        .find(|p| !before.contains(p))
        .expect("new segment");
    let bytes = fs::read_to_string(segment).expect("read segment");
    let stored_ids: Vec<_> = bytes
        .lines()
        .map(|line| text(&parse_json(line).expect("signed line"), &["id"]).to_owned())
        .collect();
    assert_eq!(stored_ids, expected);
}

#[test]
fn one_and_two_filled_lines_match_successive_single_emits() {
    let batch = fixed_store("filled-twin");
    let singles = fixed_store("single-twin");
    let head = fixed_emit(
        &singles,
        &[
            "task",
            "--of",
            "task:1",
            "--about",
            "project:p",
            "--occurred",
            "2009",
            "title=A",
        ],
    );
    batch.ok_with(&["import"], &singles.ok(&["export"]));
    let first = fixed_emit(&singles, &["task", "--prev", &head, "x:=1"]);
    assert_twins(
        &batch,
        &singles,
        &format!(r#"{{"kind":"task","prev":["{head}"],"payload":{{"x":1}}}}"#),
        &[first],
    );
    let a = fixed_emit(
        &singles,
        &[
            "task",
            "--of",
            "task:1",
            "--about",
            "project:q",
            "--occurred",
            "2010",
            "x:=2",
        ],
    );
    let b = fixed_emit(&singles, &["task", "--of", "task:1", "y:=3"]);
    assert_twins(
        &batch,
        &singles,
        r#"{"kind":"task","of":"task:1","about":["project:q"],"occurred":"2010","payload":{"x":2}}
{"kind":"task","of":"task:1","payload":{"y":3}}"#,
        &[a.clone(), b.clone()],
    );
    let last = batch.json(&["get", &b]);
    let mut live = vec![head, a];
    live.sort();
    assert_eq!(strings(&last, &["env", "prev"]), live);
    assert_eq!(head_ids(&batch.json(&["of", "task:1"])), [b]);
}

#[test]
fn labelled_filled_changesets_match_the_ids_from_single_emits() {
    let batch = fixed_store("filled-labels");
    let singles = fixed_store("single-labels");
    let root = fixed_emit(
        &singles,
        &["note", "--about", "project:p", "--occurred", "2009"],
    );
    let a = fixed_emit(&singles, &["note", "--prev", &root, "x:=1"]);
    let b = fixed_emit(&singles, &["note", "--prev", &a, "--about", &root, "y:=2"]);
    assert_twins(
        &batch,
        &singles,
        r#"{"kind":"note","label":"@r","about":["project:p"],"occurred":"2009"}
{"kind":"note","label":"@a","prev":["@r"],"payload":{"x":1}}
{"kind":"note","prev":["@a"],"about":["@r"],"payload":{"y":2}}"#,
        &[root, a, b],
    );
    let grant = fixed_emit(&singles, &["grant"]);
    let acting = fixed_emit(&singles, &["act", "--under", &grant, "--about", &grant]);
    assert_twins(
        &batch,
        &singles,
        r#"{"kind":"act","under":"@grant","about":["@grant"]}
{"kind":"grant","label":"@grant"}"#,
        &[acting, grant],
    );

    let root = fixed_emit(&singles, &["task"]);
    let a = fixed_emit(&singles, &["task", "--of", &root, "x:=1"]);
    let b = fixed_emit(&singles, &["task", "--of", &root, "--prev", &a, "y:=2"]);
    assert_twins(
        &batch,
        &singles,
        r#"{"kind":"task","label":"@r"}
{"kind":"task","label":"@a","of":"@r","payload":{"x":1}}
{"kind":"task","of":"@r","prev":["@a"],"payload":{"y":2}}"#,
        &[root, a, b],
    );
}

#[test]
fn filled_fields_and_absences_match_the_single_flags() {
    for (i, (members, flags)) in [
        (r#""about":[]"#, vec!["--no-about"]),
        (r#""occurred":null"#, vec!["--no-occurred"]),
        (r#""sets":[]"#, vec!["--sets-nothing"]),
        (r#""sets":null"#, vec!["--whole"]),
        (r#""prev":[]"#, vec![]),
        (
            r#""about":["project:q"],"occurred":"2010","sets":["other"]"#,
            vec![
                "--about",
                "project:q",
                "--occurred",
                "2010",
                "--sets",
                "other",
            ],
        ),
    ]
    .into_iter()
    .enumerate()
    {
        let batch = fixed_store(&format!("fill-none-{i}"));
        let singles = fixed_store(&format!("single-none-{i}"));
        let old = fixed_emit(&singles, &["task", "--of", "task:1", "x:=0"]);
        fixed_emit(
            &singles,
            &[
                "task",
                "--of",
                "task:1",
                "--about",
                "project:p",
                "--occurred",
                "2009",
                "--whole",
                "x:=1",
            ],
        );
        batch.ok_with(&["import"], &singles.ok(&["export"]));
        let mut args = vec!["task", "--of", "task:1", "x:=2"];
        let prev = if members.starts_with(r#""prev""#) {
            String::new()
        } else {
            args.extend(["--prev", &old]);
            format!(r#""prev":["{old}"],"#)
        };
        args.extend(flags);
        let id = fixed_emit(&singles, &args);
        assert_twins(
            &batch,
            &singles,
            &format!(r#"{{"kind":"task","of":"task:1",{prev}{members},"payload":{{"x":2}}}}"#),
            &[id],
        );
    }
}

#[test]
fn a_filled_changeset_uses_envelopes_after_erasure_and_handles_nonobjects() {
    let s = Store::new("filled-erased");
    let h = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:1",
        "--about",
        "project:p",
        "--occurred",
        "2009",
    ]);
    let rows = format!(
        r#"{{"kind":"erasure","label":"@e","erases":["{h}"]}}
{{"kind":"task","of":"task:1","under":"@e","payload":7}}
{{"kind":"task","of":"task:fresh","payload":{{"x":2}}}}"#
    );
    let pair = filled(&s, &rows);
    let eraser = s.json(&["get", &pair[0]]);
    let task = s.json(&["get", &pair[1]]);
    assert!(!has(&eraser, &["env"], "prev"));
    assert_eq!(
        strings(&eraser, &["env", "erases"]),
        std::slice::from_ref(&h)
    );
    assert_eq!(strings(&task, &["env", "prev"]), [h]);
    assert_eq!(strings(&task, &["env", "about"]), ["project:p"]);
    assert_eq!(text(&task, &["env", "occurred"]), "2009");
    assert_eq!(text(&task, &["env", "under"]), pair[0]);
    assert!(!has(&task, &["env"], "sets"));
    let fresh = s.json(&["get", &pair[2]]);
    for key in ["prev", "sets", "about", "occurred"] {
        assert!(!has(&fresh, &["env"], key));
    }
    s.changeset(r#"{"kind":"task","of":"task:1","occurred":"2010"}"#);
    let join = filled(&s, r#"{"kind":"task","of":"task:1"}"#);
    assert!(!has(&s.json(&["get", &join[0]]), &["env"], "occurred"));
}

#[test]
fn filled_refusals_are_ordered_and_atomic() {
    let s = fixed_store("filled-refusals");
    let one = s.ok(&["emit", "task", "--of", "task:1"]);
    let other = s.ok(&["emit", "task", "--of", "task:2"]);
    let export = s.ok(&["export"]);
    let segments = s.segments();
    let unknown = format!("r:{}", "0".repeat(52));
    let infer = format!(r#"{{"kind":"","prev":["{unknown}"]}}"#);
    for (bad, expected) in [
        (
            format!("{infer}\n{{\"kind\":\"bad\",\"about\":[\"@missing\"]}}"),
            "label-unknown",
        ),
        (
            format!("{infer}\n{{\"label\":\"@c\",\"under\":\"@c\"}}"),
            "label-cycle",
        ),
        (
            format!("{infer}\n{{\"label\":\"@c\",\"under\":\"@missing\"}}\n{{\"label\":\"@c\"}}"),
            "label-duplicate",
        ),
        (format!("{{\"kind\":7}}\n{infer}"), "kind-empty"),
        (infer, "prev-unknown"),
        (
            format!(
                r#"{{"kind":"task","label":"@new","of":"task:2"}}
{{"kind":"task","prev":["@new","{one}","{other}"]}}"#
            ),
            "prev-unrelated",
        ),
        (
            format!(r#"{{"kind":"","of":"task:1","prev":["{unknown}"]}}"#),
            "kind-empty",
        ),
        (
            format!(r#"{{"kind":"task","under":"{unknown}"}}"#),
            "under-unknown",
        ),
        (format!(r#"{{"kind":"task","of":"{one}"}}"#), "of-not-root"),
        (r#"{"kind":"task","about":null}"#.into(), "about-not-typed"),
        (
            r#"{"kind":"task","occurred":""}"#.into(),
            "occurred-not-span",
        ),
        (r#"{"kind":"task","sets":[7]}"#.into(), "sets-not-keys"),
        (
            r#"{"sets":null,"sets":[]}"#.into(),
            "member-duplicate at line 2: sets",
        ),
        (
            r#"{"occurred":null,"extra":[]}"#.into(),
            "draft-field-unknown at line 2: extra",
        ),
    ] {
        let input = format!("{{\"kind\":\"valid\"}}\n{bad}");
        assert_eq!(
            answer(&s, FILL, &input),
            (1, String::new(), format!("refused: {expected}")),
            "{bad}"
        );
    }
    assert_eq!(s.ok(&["export"]), export);
    assert_eq!(s.segments(), segments);
}

#[test]
fn plain_changeset_bytes_and_other_dash_invocations_are_preserved() {
    let s = fixed_store("plain-bytes");
    let rows = format!(
        r#"{{"kind":"task","label":"@t","of":"task:1","emitted":"{WHEN}","salt":"{SALT}","payload":{{"x":1}}}}"#
    );
    let id = "r:bqhocbroujp93duvv8qd8g9a7mmd4id3r680mq6ljurjsf31nj50";
    assert_eq!(
        answer(&s, &["emit", "-"], &rows),
        (
            0,
            format!("{{\"records\":[{{\"id\":\"{id}\",\"label\":\"@t\"}}]}}\n"),
            String::new()
        )
    );
    let key = "k:7dl2ff6emqi2qol3l382krodedij45bn3nh479hqo14a32qpr8kg";
    let signature = "gvar8dvnb36qkp857ioc8blifn0lsv47jmf446rqaekl72gqsrlsik8ssa9limlgdho9ii5t9jf6viq5fhq94qa9661odj698rmnq2o";
    let line = format!(
        r#"{{"env":{{"emitted":"{WHEN}","kind":"task","observer":"{key}","of":"task:1"}},"id":"{id}","payload":{{"x":1}},"salt":"{SALT}","sig":{{"ed25519":"{signature}","key":"{key}"}}}}"#
    );
    assert_eq!(
        answer(&s, &["export"], ""),
        (0, format!("{line}\n"), String::new())
    );
    for (bad, code) in [
        (r#"{"kind":"task","sets":null}"#, "sets-not-keys"),
        (r#"{"kind":"task","occurred":null}"#, "occurred-not-span"),
        (
            r#"{"kind":"task","prev":["r:0000000000000000000000000000000000000000000000000000"]}"#,
            "of-missing",
        ),
        (
            "{\"salt\":null,\"kind\":\"ok\"}\n{\"kind\":null}",
            "kind-empty",
        ),
        ("{\"kind\":null}\n{\"about\":[\"@x\"]}", "label-unknown"),
    ] {
        assert_eq!(
            answer(&s, &["emit", "-"], bad),
            (1, String::new(), format!("refused: {code}"))
        );
    }
    assert_eq!(s.fails(&["emit", "task", "--fill"], "").0, 2);
    let dash = s.ok_with(&["emit", "-", "extra"], "not JSONL");
    let got = s.json(&["get", &dash]);
    assert_eq!(text(&got, &["env", "kind"]), "-");
    assert_eq!(text(&got, &["payload", "text"]), "extra");
}

#[test]
fn literal_predecessors_use_the_holding_at_inference_time() {
    let batch = fixed_store("filled-literal");
    let singles = fixed_store("single-literal");
    // Know R's future id without putting its envelope into the batch store.
    let r = fixed_emit(&singles, &["note"]);
    let root = format!(r#"{{"kind":"note","emitted":"{WHEN}","salt":"{SALT}"}}"#);
    let missing = format!(
        r#"{{"kind":"task","prev":["{r}"]}}
{root}"#
    );
    assert_eq!(
        batch.fails(FILL, &missing),
        (1, "refused: prev-unknown".into())
    );
    assert_eq!(batch.segments(), Vec::<PathBuf>::new());
    // With of stated, the final batch check can see the literal target.
    let explicit = format!(
        r#"{{"kind":"task","of":"{r}","prev":["{r}"]}}
{root}"#
    );
    let ids = filled(&batch, &explicit);
    assert_eq!(ids[1], r);
    assert!(!has(&batch.json(&["get", &ids[0]]), &["env"], "sets"));

    // Both targets of the next revision, one literal and one labelled, are
    // now available when its thing is inferred.
    singles.ok_with(&["import"], &batch.ok(&["export"]));
    let a = fixed_emit(&singles, &["task", "--of", &r, "x:=1"]);
    let b = fixed_emit(&singles, &["task", "--prev", &a, "--prev", &r, "y:=2"]);
    assert_twins(
        &batch,
        &singles,
        &format!(
            r#"{{"kind":"task","label":"@a","of":"{r}","payload":{{"x":1}}}}
{{"kind":"task","prev":["@a","{r}"],"payload":{{"y":2}}}}"#
        ),
        &[a, b],
    );
}

const BACKUPS: &str = r#"{"vertex":"backups","from":[{"store":"lab","kind":["backup"]}],"fold":{
  "runs":{"count":true},"mb":{"sum":"mb"},"list":{"collect":true}}}"#;

fn emit_backups(s: &Store) -> Vec<String> {
    [
        ("2026-11-16", "jellyfin", 412),
        ("2026-11-16", "pihole", 3),
        ("2026-11-16", "gitea", 88),
        ("2026-11-17", "jellyfin", 419),
        ("2026-11-17", "pihole", 10),
        ("2026-11-17", "gitea", 95),
    ]
    .iter()
    .map(|(night, service, mb)| {
        s.ok(&[
            "emit",
            "backup",
            "--occurred",
            night,
            &format!("svc={service}"),
            &format!("mb:={mb}"),
        ])
    })
    .collect()
}

#[test]
fn tick_writers_agree_on_the_payload_across_stores() {
    use loops::{
        result::{read_result, result_hash},
        spec::Spec,
        spec_hash::Rules,
    };
    use loops_place::line::hash;

    let a = Store::new("tick-a");
    let b = Store::new("tick-b");
    let mut backups = emit_backups(&a);
    backups.sort_unstable();
    b.ok_with(&["import"], &a.ok(&["export"]));

    let vertices = a.dir.join(".loops/vertices");
    fs::create_dir_all(&vertices).expect("vertices");
    fs::write(vertices.join("backups.json"), BACKUPS).expect("vertex");
    fs::write(b.dir.join("backups.json"), BACKUPS).expect("spec file");
    let id_a = a.ok(&["tick", "backups"]);
    let id_b = b.ok(&["tick", "backups.json", "--of", "tick:backups"]);
    let first = a.json(&["get", &id_a]);
    let other = b.json(&["get", &id_b]);
    assert_ne!(id_a, id_b);
    assert_ne!(
        text(&first, &["env", "observer"]),
        text(&other, &["env", "observer"])
    );
    assert_eq!(text(&first, &["env", "kind"]), "tick");
    assert!(!has(&first, &["env"], "of"));
    let payload = at(&first, &["payload"]);
    assert_eq!(
        payload.canon().as_bytes(),
        at(&other, &["payload"]).canon().as_bytes()
    );
    assert_eq!(text(payload, &["rules"]), "1");
    assert_eq!(strings(payload, &["covers"]), backups);
    assert!(!has(payload, &[], "withheld"));
    let result = at(payload, &["result"]);
    assert_eq!(text(result, &["runs", "value"]), "6");
    assert_eq!(text(result, &["mb", "value"]), "1027");
    let mut collected = strings(result, &["list", "heads"]);
    collected.sort_unstable();
    assert_eq!(collected, backups);
    let spec = Spec::of_json(&parse_json(BACKUPS).expect("JSON")).expect("spec");
    assert_eq!(
        text(payload, &["spec-hash"]),
        spec.hash(&hash, &Rules::current())
    );
    assert_eq!(
        text(payload, &["result-hash"]),
        result_hash(&hash, &read_result(&spec, result).expect("result"))
    );

    let over_ticks = format!(
        r#"{{"vertex":"ticks","from":[{{"store":".","kind":["tick"]}}],"fold":{{
        "covering":{{"count":true,"where":{{"covers":{{"is":"{}"}}}}}}}}}}"#,
        backups[0]
    );
    let folded = parse_json(&a.ok_with(&["fold", "-"], &over_ticks)).expect("fold");
    assert_eq!(
        at(&folded, &["covering", "value"]),
        &Json::Int(1_i64.into())
    );

    let next_id = b.ok_with(&["tick", "-", "--of", "tick:backups"], BACKUPS);
    let next = b.json(&["get", &next_id]);
    assert_eq!(
        strings(&next, &["env", "prev"]),
        std::slice::from_ref(&id_b)
    );
    assert_cut_report(&a, &id_a, "yes", 0);
    assert_cut_report(&b, &id_b, "yes", 0);
    assert_cut_report(&b, &next_id, "yes", 0);
    assert_eq!(strings(&next, &["payload", "covers"]), backups);
    assert_eq!(text(&next, &["payload", "result", "runs", "value"]), "6");
}

#[test]
fn tick_covers_the_eraser_and_withholds_the_erased_backup() {
    let s = Store::new("tick-erased");
    let mut covers = emit_backups(&s);
    let target = covers[0].clone();
    let eraser = s.json(&["erase", &target]);
    covers.push(text(&eraser, &["id"]).to_owned());
    covers.sort_unstable();

    let id = s.ok_with(&["tick", "-"], BACKUPS);
    let tick = s.json(&["get", &id]);
    let payload = at(&tick, &["payload"]);
    assert_eq!(strings(payload, &["covers"]), covers);
    assert_eq!(strings(payload, &["withheld"]), [target]);
    assert_eq!(text(payload, &["result", "runs", "value"]), "6");
    assert_eq!(text(payload, &["result", "mb", "value"]), "615");
    assert_eq!(text(payload, &["result", "mb", "unread"]), "1");
}

#[test]
fn tick_refuses_the_same_spec_as_fold_without_writing() {
    let s = Store::new("tick-invalid");
    s.ok(&["emit", "backup", "mb:=3"]);
    let before = s.ok(&["export"]);
    for bad in ["{", r#"{"vertex":"backups"}"#] {
        let refusal = s.fails(&["fold", "-"], bad);
        assert_eq!(refusal.0, 1);
        assert_eq!(s.fails(&["tick", "-"], bad), refusal);
        assert_eq!(s.ok(&["export"]), before);
    }
}

fn assert_tick_check(s: &Store, id: &str, status: i32, expected: &str) {
    let (code, out, err) = answer(s, &["tick", "--check", id], "");
    assert_eq!((code, err.as_str()), (status, ""), "{id}: {out}");
    assert_eq!(
        out,
        format!(
            "{}\n",
            parse_json(expected).expect("expected verdict").canon()
        )
    );
}

#[test]
fn a_tick_written_on_one_machine_checks_same_on_a_second() {
    let a = Store::new("exit-a");
    let b = Store::new("exit-b");
    fs::write(
        b.dir.join("device-key"),
        loops_place::key::Key::generate()
            .expect("second key")
            .text(),
    )
    .expect("second key file");
    emit_backups(&a);
    let id = a.ok_with(&["tick", "-"], BACKUPS);
    b.ok_with(&["import"], &a.ok(&["export"]));
    assert_ne!(a.json(&["whoami"]), b.json(&["whoami"]));
    assert_tick_check(
        &b,
        &id,
        0,
        r#"{"answer":"same","closure":"yes","taken-not-covered":0}"#,
    );

    b.ok(&["emit", "backup", "mb:=4"]);
    assert_tick_check(
        &b,
        &id[2..id.len() - 1],
        0,
        r#"{"answer":"same","closure":"yes","taken-not-covered":1}"#,
    );
    let fresh = b.ok_with(&["tick", "-"], BACKUPS);
    let line = b.json(&["get", &fresh]);
    assert_eq!(text(&line, &["payload", "result", "runs", "value"]), "7");
    assert_eq!(text(&line, &["payload", "result", "mb", "value"]), "1031");
}

#[test]
fn tick_check_counts_absent_records_and_locally_erased_openings() {
    let a = Store::new("check-inputs-a");
    let b = Store::new("check-inputs-b");
    let backups = emit_backups(&a);
    let id = a.ok_with(&["tick", "-"], BACKUPS);
    b.ok_with(&["import"], &a.ok(&["get", &id]));
    for backup in &backups[..4] {
        b.ok_with(&["import"], &a.ok(&["get", backup]));
    }
    assert_tick_check(
        &b,
        &id,
        1,
        r#"{"answer":"cannot check","reason":"missing inputs",
        "missing-records":2,"missing-openings":0,"closure":"unknown","taken-not-covered":0}"#,
    );

    b.ok_with(&["import"], &a.ok(&["export", "--kind", "backup"]));
    let eraser = a.json(&["erase", &backups[0]]);
    b.ok_with(&["import"], &a.ok(&["get", text(&eraser, &["id"])]));
    assert_tick_check(
        &b,
        &id,
        1,
        r#"{"answer":"cannot check","reason":"missing inputs",
        "missing-records":0,"missing-openings":1,"closure":"yes","taken-not-covered":0}"#,
    );

    let eraser = a.json(&["erase", &id]);
    b.ok_with(&["import"], &a.ok(&["get", text(&eraser, &["id"])]));
    // B still has the original signed line on disk. C gets only its commitment.
    let c = Store::new("check-inputs-c");
    c.ok_with(&["import"], &a.ok(&["get", &id]));
    for store in [&b, &c] {
        assert_tick_check(
            store,
            &id,
            1,
            r#"{"answer":"cannot check","reason":"the tick's payload is not held",
            "closure":"unknown","taken-not-covered":null}"#,
        );
    }
}

#[test]
fn incorrect_claims_and_malformed_ticks_are_imported_as_records() {
    use loops::result::result_hash_of;
    use loops_place::line::hash;

    let a = Store::new("check-claims-a");
    let b = Store::new("check-claims-b");
    let backups = emit_backups(&a);
    let id = a.ok_with(&["tick", "-"], BACKUPS);
    let line = a.json(&["get", &id]);
    let payload = at(&line, &["payload"]);
    let altered = at(payload, &["result"])
        .canon()
        .replace(r#""1027""#, r#""1028""#);
    let claimed = result_hash_of(&hash, &parse_json(&altered).expect("altered result"));
    let computed = text(payload, &["result-hash"]);
    assert_ne!(claimed, computed);
    let hand = a.ok(&[
        "emit",
        "tick",
        "rules=1",
        &format!("spec:={}", at(payload, &["spec"]).canon()),
        &format!("spec-hash={}", text(payload, &["spec-hash"])),
        &format!("covers:={}", at(payload, &["covers"]).canon()),
        &format!("result:={altered}"),
        &format!("result-hash={claimed}"),
    ]);
    let malformed = a.ok(&["emit", "tick", "text=hello"]);
    b.ok_with(&["import"], &a.ok(&["export"]));
    assert_tick_check(
        &b,
        &hand,
        1,
        &format!(
            r#"{{"answer":"differs","claimed-hash":"{claimed}",
        "computed-hash":"{computed}","closure":"yes","taken-not-covered":0}}"#
        ),
    );
    assert_tick_check(
        &b,
        &malformed,
        1,
        r#"{"answer":"not a tick","refused":"tick-member-unknown",
        "path":"text","closure":"unknown","taken-not-covered":null}"#,
    );
    assert_tick_check(
        &b,
        &backups[0],
        1,
        r#"{"answer":"not a tick","refused":"tick-kind",
        "path":"kind","closure":"unknown","taken-not-covered":null}"#,
    );

    for prefix in ["zzzz", "r:"] {
        let refusal = answer(&b, &["get", prefix], "");
        assert_eq!(refusal.0, 1);
        assert_eq!(answer(&b, &["tick", "--check", prefix], ""), refusal);
    }
    for args in [&["tick", "--check"][..], &["tick", "--check", &id, &hand]] {
        assert_eq!(b.fails(args, "").0, 2);
    }
}

#[test]
fn checking_a_tick_over_ticks_needs_only_the_outer_cover() {
    let daily = Store::new("check-daily");
    let weekly = Store::new("check-weekly");
    let checker = Store::new("check-weekly-reader");
    emit_backups(&daily);
    daily.ok_with(&["tick", "-"], BACKUPS);
    daily.ok_with(&["tick", "-"], BACKUPS);
    weekly.ok_with(&["import"], &daily.ok(&["export", "--kind", "tick"]));
    weekly.ok(&["emit", "note", "end of week"]);
    checker.ok_with(&["import"], &weekly.ok(&["export"]));
    let spec = r#"{"vertex":"weekly","from":[{"store":".","kind":["tick","note"]}],"fold":{"entries":{"count":true}}}"#;
    let id = weekly.ok_with(&["tick", "-"], spec);
    let line = weekly.json(&["get", &id]);
    assert_eq!(len(&line, &["payload", "covers"]), 3);
    assert_eq!(text(&line, &["payload", "result", "entries", "value"]), "3");
    checker.ok_with(&["import"], &line.canon());
    assert_eq!(checker.ok(&["export", "--kind", "backup"]), "");
    // The weekly tick itself is now one taken record outside its cover.
    assert_tick_check(
        &checker,
        &id,
        0,
        r#"{"answer":"same","closure":"yes","taken-not-covered":1}"#,
    );
}

const BASE_THING: &str = "svc:jellyfin";
const ONE_UNSHOWN: &str = "the base did not show 1 record that this emit names";
const TWO_UNSHOWN: &str = "the base did not show 2 records that this emit names";

fn fixed_write(store: &Store, args: &[&str], notice: &str) -> String {
    let mut command = vec!["emit", "--emitted", WHEN, "--salt", SALT];
    command.extend(args);
    let (status, out, err) = answer(store, &command, "");
    assert_eq!((status, err), (0, notice.to_owned()), "{args:?}");
    out.trim_end().to_owned()
}

fn jellyfin(s: &Store) -> (String, String) {
    let x = fixed_emit(
        s,
        &[
            "service",
            "--of",
            BASE_THING,
            "port=8096",
            "owner=kyle",
            "--sets",
            "port",
            "--sets",
            "owner",
        ],
    );
    let y = fixed_emit(s, &["service", "--of", BASE_THING, "port=8097"]);
    (x, y)
}

fn prev(s: &Store, id: &str) -> Vec<String> {
    let line = s.json(&["get", id]);
    if has(&line, &["env"], "prev") {
        strings(&line, &["env", "prev"])
    } else {
        Vec::new()
    }
}

fn import_ids(from: &Store, into: &Store, ids: &[String]) {
    let lines = ids
        .iter()
        .map(|id| from.ok(&["get", id]))
        .collect::<Vec<_>>()
        .join("\n");
    into.ok_with(&["import"], &lines);
}

#[test]
fn tk11_names_the_unseen_owner_setter_for_either_edit() {
    for (edit, value) in [("port=8098", "kyle"), ("owner=sam", "sam")] {
        let s = fixed_store(&format!("tk11-{value}"));
        let (x, y) = jellyfin(&s);
        let z = fixed_write(
            &s,
            &["service", "--of", BASE_THING, edit, "--base-id", &y],
            ONE_UNSHOWN,
        );
        let mut expected = vec![x, y];
        expected.sort();
        assert_eq!(prev(&s, &z), expected);
        let whole = s.json(&["of", BASE_THING]);
        assert_eq!(head_ids(&whole), [z]);
        assert_eq!(text(&whole, &["values", "owner"]), value);
        if edit == "port=8098" {
            let slice = fixed_store("tk11-live-slice");
            let live = live_of(&s, BASE_THING);
            assert_eq!(live.len(), 2);
            import_ids(&s, &slice, &live);
            let sliced = slice.json(&["of", BASE_THING]);
            assert_eq!(at(&whole, &["heads"]), at(&sliced, &["heads"]));
            assert_eq!(at(&whole, &["values"]), at(&sliced, &["values"]));
            assert_eq!(text(&sliced, &["values", "port"]), "8098");
            // y is dead under this live slice. No additional live id is named.
            let bare = fixed_emit(&slice, &["service", "--of", BASE_THING, "title=test"]);
            let based = fixed_write(
                &s,
                &[
                    "service",
                    "--of",
                    BASE_THING,
                    "title=test",
                    "--base-id",
                    &live[0],
                    "--base-id",
                    &live[1],
                ],
                "",
            );
            assert_eq!(s.ok(&["get", &based]), slice.ok(&["get", &bare]));
        }
    }
}

#[test]
fn a_base_counts_distinct_live_ancestors_and_follows_only_prev() {
    let s = fixed_store("base-links");
    let (x, y) = jellyfin(&s);
    let z = fixed_emit(&s, &["service", "--of", BASE_THING, "title=home"]);
    let id = fixed_write(
        &s,
        &[
            "service",
            "--of",
            BASE_THING,
            "port=8098",
            "--base-id",
            &z,
            "--base-id",
            &z,
        ],
        TWO_UNSHOWN,
    );
    let mut expected = vec![x.clone(), y.clone(), z];
    expected.sort();
    assert_eq!(prev(&s, &id), expected);

    let input = format!(
        r#"{{"kind":"service","of":"{BASE_THING}","under":"{y}","erases":["{x}"],"payload":{{"title":"reset"}}}}"#
    );
    let separate = ids(
        &parse_json(&s.ok_with(&["emit", "-"], &input)).expect("batch"),
        &["records"],
    );
    let id = fixed_write(
        &s,
        &["service", "--of", BASE_THING, "--base-id", &separate[0]],
        "",
    );
    assert_eq!(prev(&s, &id), separate);
}

#[test]
fn stated_predecessor_outside_the_cover_brings_its_live_ancestors() {
    let s = fixed_store("base-stated");
    let marker = s.ok_with(&["tick", "-"], SPEC);
    let (x, y) = jellyfin(&s);
    let z = fixed_write(
        &s,
        &["service", "port=8098", "--base", &marker, "--prev", &y],
        TWO_UNSHOWN,
    );
    let mut expected = vec![x, y.clone()];
    expected.sort();
    assert_eq!(prev(&s, &z), expected);
    let slice = fixed_store("base-stated-live");
    import_ids(&s, &slice, &live_of(&s, BASE_THING));
    for store in [&s, &slice] {
        let state = store.json(&["of", BASE_THING]);
        assert_eq!(head_ids(&state), [z.as_str()]);
        assert_eq!(text(&state, &["values", "port"]), "8098");
        assert_eq!(text(&state, &["values", "owner"]), "kyle");
    }

    // Y is now dead under Z. Both the stated Y and the live X count once.
    let joined = fixed_write(
        &s,
        &["service", "--base-id", &z, "--prev", &y, "--prev", &y],
        TWO_UNSHOWN,
    );
    expected.push(z);
    expected.sort();
    assert_eq!(prev(&s, &joined), expected);
}

#[test]
fn tick_cover_and_literal_ids_form_one_base_on_both_paths() {
    let s = fixed_store("base-union");
    let left = fixed_emit(&s, &["service", "--of", BASE_THING, "owner=kyle"]);
    let marker = s.ok_with(&["tick", "-", "--all"], SPEC);
    let row = r#"{"kind":"service","of":"svc:jellyfin","payload":{"port":"8096"}}"#;
    let right = ids(
        &parse_json(&s.ok_with(&["emit", "-"], row)).expect("batch"),
        &["records"],
    );
    let mut expected = vec![left.clone(), right[0].clone()];
    expected.sort();
    let joined = fixed_write(
        &s,
        &[
            "service",
            "--of",
            BASE_THING,
            "--base",
            &marker,
            "--base-id",
            &right[0],
            "--base-id",
            &left,
        ],
        "",
    );
    assert_eq!(prev(&s, &joined), expected);
    let (status, out, err) = answer(
        &s,
        &[
            "emit",
            "-",
            "--fill",
            "--base-id",
            &right[0],
            "--base",
            &marker,
        ],
        row,
    );
    assert_eq!((status, err), (0, String::new()));
    let batch = ids(&parse_json(&out).expect("batch"), &["records"]);
    assert_eq!(prev(&s, &batch[0]), expected);
}

#[test]
fn full_base_and_both_default_fills_write_the_original_bytes() {
    let mut signed = Vec::new();
    for mode in ["single", "based", "jsonl", "based-jsonl"] {
        let s = fixed_store(&format!("base-identical-{mode}"));
        let (x, y) = jellyfin(&s);
        let id = match mode {
            "single" => fixed_emit(&s, &["service", "--of", BASE_THING, "port=8098"]),
            "based" => fixed_write(
                &s,
                &[
                    "service",
                    "--of",
                    BASE_THING,
                    "port=8098",
                    "--base-id",
                    &x,
                    "--base-id",
                    &y,
                ],
                "",
            ),
            _ => {
                let mut args = FILL.to_vec();
                if mode == "based-jsonl" {
                    args.extend(["--base-id", &x, "--base-id", &y]);
                }
                let input = format!(
                    r#"{{"kind":"service","of":"{BASE_THING}","emitted":"{WHEN}","salt":"{SALT}","payload":{{"port":"8098"}}}}"#
                );
                let (status, out, err) = answer(&s, &args, &input);
                assert_eq!((status, err), (0, String::new()));
                ids(&parse_json(&out).expect("answer"), &["records"])[0].clone()
            }
        };
        // Captured before changing the writer, with the same key, time and salts.
        assert_eq!(id, "r:55h8n6chc4v2lvrvbp3qakt6pkc7albhrp0ok8lht1birida3dp0");
        signed.push(s.ok(&["get", &id]));
    }
    assert!(signed.windows(2).all(|w| w[0] == w[1]));
}

#[test]
fn a_tick_base_forks_the_older_read_and_preserves_explicit_predecessors() {
    let s = fixed_store("base-stale");
    let original = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:42",
        "--sets",
        "status",
        "--about",
        "project:old",
        "--occurred",
        "2009",
        "status=open",
    ]);
    let marker = s.ok_with(&["tick", "-", "--all", "--of", "tick:series"], SPEC);
    let peer = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:42",
        "--about",
        "project:peer",
        "--occurred",
        "2010",
        "status=review",
    ]);
    let edit = fixed_write(
        &s,
        &[
            "task",
            "--of",
            "task:42",
            "status=done",
            "--base",
            &marker[2..12],
        ],
        "",
    );
    let got = s.json(&["get", &edit]);
    assert_eq!(prev(&s, &edit), [original.as_str()]);
    assert_eq!(strings(&got, &["env", "about"]), ["project:old"]);
    assert_eq!(text(&got, &["env", "occurred"]), "2009");
    let state = s.json(&["of", "task:42"]);
    let mut heads = head_ids(&state);
    heads.sort();
    let mut both = vec![peer.clone(), edit];
    both.sort();
    assert_eq!(heads, both);
    assert!(!has(&state, &["values"], "status"));
    assert_eq!(ids(&state, &["setters", "status"]), head_ids(&state));
    let spec = r#"{"vertex":"fork","from":[{"store":"."}],"fold":{"now":{"latest-by":"of","follow":"prev"}}}"#;
    let folded = parse_json(&s.ok_with(&["fold", "-"], spec)).expect("fold");
    assert_eq!(
        ids(&folded, &["now", "things", "task:42"]),
        head_ids(&state)
    );

    let explicit = fixed_write(
        &s,
        &[
            "task",
            "--prev",
            &peer,
            "--base",
            &marker,
            "--no-about",
            "--no-occurred",
            "status=joined",
        ],
        ONE_UNSHOWN,
    );
    assert_eq!(prev(&s, &explicit), [peer]);
    let line = s.json(&["get", &explicit]);
    assert_eq!(text(&line, &["env", "of"]), "task:42");
    assert!(!has(&line, &["env"], "about") && !has(&line, &["env"], "occurred"));
}

#[test]
fn an_empty_task_base_does_not_open_a_nested_tick() {
    let s = fixed_store("base-daily");
    let a = fixed_emit(&s, &["task", "--of", "task:42", "status=open"]);
    let daily = s.ok_with(&["tick", "-", "--all", "--of", "tick:daily"], SPEC);
    let other = fixed_store("base-weekly");
    import_ids(&s, &other, std::slice::from_ref(&daily));
    let weekly = other.ok_with(&["tick", "-", "--all"], SPEC);
    import_ids(&other, &s, std::slice::from_ref(&weekly));
    let empty = "the base covers no record of task:42";
    let new = fixed_write(
        &s,
        &["task", "--of", "task:42", "--base", &weekly, "status=done"],
        empty,
    );
    assert_eq!(prev(&s, &new), Vec::<String>::new());
    assert!(!has(&s.json(&["get", &new]), &["env"], "sets"));
    let stated = fixed_write(
        &s,
        &["task", "--prev", &a, "--base", &weekly, "status=done"],
        ONE_UNSHOWN,
    );
    assert_eq!(prev(&s, &stated), [a]);

    // The same tick can itself be the literal member, even with a peer tick held.
    let earlier = s.ok_with(&["tick", "-", "--of", "tick:daily"], SPEC);
    let before = s.ok(&["export"]).lines().count();
    let (status, out, err) = answer(
        &s,
        &[
            "tick",
            "-",
            "--all",
            "--of",
            "tick:daily",
            "--base-id",
            &daily,
        ],
        SPEC,
    );
    assert_eq!((status, err), (0, String::new()));
    let tick = out.trim_end();
    assert_eq!(prev(&s, tick), [daily]);
    let covers = strings(&s.json(&["get", tick]), &["payload", "covers"]);
    assert_eq!(covers.len(), before);
    assert!(covers.contains(&earlier));
}

#[test]
fn based_changesets_chain_on_prepared_envelopes_and_report_only_after_append() {
    let s = fixed_store("base-staged");
    let (x, y) = jellyfin(&s);
    let late = fixed_emit(&s, &["service", "--of", BASE_THING, "port=late"]);
    let args = ["emit", "-", "--fill", "--base-id", &y];
    let rows = r#"{"kind":"service","of":"svc:jellyfin","prev":["@first"],"payload":{"owner":"sam"}}
{"kind":"service","label":"@first","of":"svc:jellyfin","about":["project:q"],"occurred":"2010","payload":{"port":"8098"}}"#;
    let before = s.segments();
    let (status, out, err) = answer(&s, &args, &format!("{rows}\n{{\"kind\":\"\"}}"));
    assert_eq!(
        (status, out, err),
        (1, String::new(), "refused: kind-empty".into())
    );
    assert_eq!(s.segments(), before);
    let (status, out, err) = answer(&s, &args, rows);
    assert_eq!((status, err), (0, format!("{ONE_UNSHOWN}\n{TWO_UNSHOWN}")));
    let records = ids(&parse_json(&out).expect("batch"), &["records"]);
    let mut first = vec![x.clone(), y];
    first.sort();
    assert_eq!(prev(&s, &records[1]), first);
    let mut second = vec![x, records[1].clone()];
    second.sort();
    assert_eq!(prev(&s, &records[0]), second);
    let line = s.json(&["get", &records[0]]);
    assert_eq!(strings(&line, &["env", "about"]), ["project:q"]);
    assert_eq!(text(&line, &["env", "occurred"]), "2010");
    assert!(!second.contains(&late));
}

fn refuses_base(s: &Store, selector: &[&str], why: &str) {
    let before = s.segments();
    let mut args = vec!["emit", "note", "--of", "task:42"];
    args.extend(selector);
    assert_eq!(
        answer(s, &args, ""),
        (1, String::new(), format!("refused: {why}"))
    );
    assert_eq!(s.segments(), before);
}

#[test]
fn base_resolution_checks_every_covered_envelope_and_only_the_markers_opening() {
    let a = fixed_store("base-resolution");
    let x = a.ok(&[
        "emit",
        "task",
        "--of",
        "task:42",
        "--about",
        "project:p",
        "--occurred",
        "2009",
    ]);
    let irrelevant = a.ok(&["emit", "other"]);
    let tick = a.ok_with(&["tick", "-", "--all"], SPEC);
    let b = fixed_store("base-resolution-b");
    import_ids(&a, &b, &[x.clone(), tick.clone()]);
    refuses_base(
        &b,
        &["--base", &tick],
        &format!("id-unknown: {irrelevant} covered by {tick}"),
    );
    refuses_base(&b, &["--base", &x], "tick-kind at kind");
    for flag in ["--base", "--base-id"] {
        refuses_base(&b, &[flag, "zzz"], "id-unknown: zzz");
    }
    let malformed = b.ok(&["emit", "tick", "extra=x"]);
    refuses_base(&b, &["--base", &malformed], "tick-member-unknown at extra");

    let mut prefix = None;
    let mut seen = std::collections::HashSet::new();
    for _ in 0..33 {
        let id = b.ok(&["emit", "other"]);
        if !seen.insert(id.as_bytes()[2]) {
            prefix = Some(id[2..3].to_owned());
            break;
        }
    }
    let p = prefix.expect("two ids with same first digit");
    for flag in ["--base", "--base-id"] {
        let get = b.fails(&["get", &p], "");
        assert!(get.1.starts_with("refused: id-ambiguous"));
        assert_eq!(b.fails(&["emit", "task", flag, &p], ""), get);
    }
    for args in [
        vec!["emit", "task", "--base", &tick, "--base", &tick],
        vec!["emit", "task", "--base"],
        vec!["emit", "-", "--base-id", &x],
        vec!["tick", "--check", &tick, "--base", &x],
    ] {
        assert_eq!(b.fails(&args, "").0, 2);
    }

    a.ok(&["erase", &x]);
    let withheld = fixed_store("base-withheld-setter");
    import_ids(&a, &withheld, &[x.clone(), irrelevant, tick.clone()]);
    for store in [&a, &withheld] {
        let id = fixed_write(
            store,
            &["task", "--of", "task:42", "status=done", "--base", &tick],
            "",
        );
        let line = store.json(&["get", &id]);
        assert_eq!(prev(store, &id), [x.as_str()]);
        assert_eq!(strings(&line, &["env", "about"]), ["project:p"]);
        assert_eq!(text(&line, &["env", "occurred"]), "2009");
    }

    let eraser = a.json(&["erase", &tick]);
    import_ids(&a, &b, &[text(&eraser, &["id"]).into()]);
    let bare = fixed_store("base-bare-marker");
    import_ids(&a, &bare, std::slice::from_ref(&tick));
    for store in [&a, &b, &bare] {
        refuses_base(store, &["--base", &tick], "the tick's payload is not held");
    }
    let id = fixed_write(&bare, &["note", "--of", &tick, "--base-id", &tick], "");
    assert_eq!(prev(&bare, &id), [tick]);
}

#[test]
fn a_base_uses_the_version_aware_common_tick_reader() {
    use loops::spec_hash::{Rules, spec_hash_of};
    use loops_place::line::hash;
    let s = fixed_store("base-newer");
    let x = s.ok(&["emit", "task", "--of", "task:42"]);
    let spec = parse_json(r#"{"future":true}"#).expect("opaque spec");
    let wrong_result = format!("res:{}", "0".repeat(52));
    let marker = |version: &str, sh: &str, rh: &str| {
        s.ok(&[
            "emit",
            "tick",
            &format!("rules={version}"),
            &format!("spec:={}", spec.canon()),
            &format!("spec-hash={sh}"),
            &format!("covers:=[\"{x}\"]"),
            "result:=false",
            &format!("result-hash={rh}"),
        ])
    };
    let rules = Rules::of_json(&str_json("2")).expect("version");
    let sh = spec_hash_of(&hash, &rules, &spec);
    let future = marker("2", &sh, &wrong_result);
    let id = fixed_write(&s, &["task", "--of", "task:42", "--base", &future], "");
    assert_eq!(prev(&s, &id), [x.as_str()]);
    let bad = marker("2", &sh, "res:BAD");
    refuses_base(&s, &["--base", &bad], "tick-hash-invalid at result-hash");
    let current = spec_hash_of(&hash, &Rules::current(), &spec);
    let bad = marker("2", &current, &wrong_result);
    refuses_base(
        &s,
        &["--base", &bad],
        "tick-spec-hash-mismatch at spec-hash",
    );
    let bad = marker("1", &current, &wrong_result);
    refuses_base(
        &s,
        &["--base", &bad],
        "tick-result-hash-mismatch at result-hash",
    );
}

#[test]
fn base_admission_is_local_and_ancestry_stops_at_missing_or_unrelated_envelopes() {
    use loops::{envelope::Env, stored};
    use loops_place::{key::Key, line::Line};
    let s = fixed_store("base-admit");
    let unrelated = fixed_emit(&s, &["other", "--of", "other:thing"]);
    let key = Key::from_text(&"0".repeat(52)).expect("fixed key");
    let writer = stored::write(
        Env {
            kind: "task".into(),
            of: Some("task:42".into()),
            prev: vec![unrelated.clone()],
            emitted: WHEN.into(),
            observer: key.public(),
            ..Env::default()
        },
        vec![0; 16],
        Json::Null,
    )
    .expect("checked envelope");
    let orphan = Line::sign(&writer, &key);
    let partial = fixed_store("base-missing-parent");
    for store in [&s, &partial] {
        store.ok_with(&["import"], &orphan.render());
        let id = fixed_write(
            store,
            &["task", "--of", "task:42", "--base-id", orphan.id()],
            "",
        );
        assert_eq!(prev(store, &id), [orphan.id()]);
    }
    let id = fixed_write(
        &s,
        &[
            "task",
            "--of",
            "task:42",
            "--base-id",
            orphan.id(),
            "--base-id",
            &unrelated,
        ],
        "no record of task:42 in the base is admitted",
    );
    assert_eq!(prev(&s, &id), Vec::<String>::new());
    assert!(!has(&s.json(&["get", &id]), &["env"], "sets"));
    let explicit = fixed_write(
        &s,
        &["task", "--prev", orphan.id(), "--base-id", &unrelated],
        &format!("no record of task:42 in the base is admitted\n{ONE_UNSHOWN}"),
    );
    assert_eq!(prev(&s, &explicit), [orphan.id()]);
}

#[test]
fn ls_counts_admitted_ids_and_lists_things_by_literal_name() {
    let s = Store::new("ls-inventory");
    assert_eq!(s.ok(&["ls"]), r#"{"kinds":[]}"#);
    assert_eq!(s.ok(&["ls", "--things"]), r#"{"things":[]}"#);

    let root = s.ok(&[
        "emit",
        "note",
        "--about",
        "mention:only",
        "name=display:only",
    ]);
    s.ok(&["emit", "update", "--prev", &root, "status=open"]);
    s.changeset(r#"{"kind":"task","of":"task:lamp","payload":{}}"#);
    let base = s.ok(&["emit", "task", "--of", "task:kiln", "name=Original"]);
    s.changeset(&format!(
        r#"{{"kind":"task","of":"task:kiln","prev":["{base}"],"sets":["name"],"payload":{{"name":"Left"}}}}
{{"kind":"repair","of":"task:kiln","prev":["{base}"],"sets":["name"],"payload":{{"name":"Right"}}}}"#
    ));

    // A second form of the root in a different segment still counts once.
    s.ok_with(&["import"], &s.ok(&["export"]));
    assert_eq!(
        s.ok(&["ls"]),
        r#"{"kinds":[{"kind":"note","records":1},{"kind":"repair","records":1},{"kind":"task","records":3},{"kind":"update","records":1}]}"#
    );
    let root_row = format!(
        r#"{{"headline":{{"state":"text","value":"display:only"}},"heads":1,"kinds":["update"],"records":2,"thing":"{root}"}}"#
    );
    let kiln = r#"{"headline":{"state":"conflict"},"heads":2,"kinds":["repair","task"],"records":3,"thing":"task:kiln"}"#;
    let lamp = r#"{"headline":{"state":"absent"},"heads":1,"kinds":["task"],"records":1,"thing":"task:lamp"}"#;
    assert_eq!(
        s.ok(&["ls", "--things"]),
        format!(r#"{{"things":[{root_row},{kiln},{lamp}]}}"#)
    );
    assert_eq!(
        s.ok(&["ls", "task:"]),
        format!(r#"{{"things":[{kiln},{lamp}]}}"#)
    );
    assert_eq!(
        s.ok(&["ls", &root[..8]]),
        format!(r#"{{"things":[{root_row}]}}"#)
    );
    for prefix in ["Task:", "mention:", "display:", "task:*", &base] {
        assert_eq!(s.ok(&["ls", prefix]), r#"{"things":[]}"#, "{prefix}");
    }
}

#[test]
fn ls_reads_a_name_only_from_its_live_setters() {
    let s = Store::new("ls-openings");
    let a = s.ok(&["emit", "task", "--of", "task:one", "name=Secret"]);
    s.ok(&["erase", &a]);
    let bare = s.ok(&["get", &a]);
    let reader = holding("ls-withheld", &bare);
    assert_eq!(
        reader.ok(&["ls"]),
        r#"{"kinds":[{"kind":"task","records":1}]}"#
    );
    for store in [&s, &reader] {
        assert_eq!(
            store.ok(&["ls", "task:"]),
            r#"{"things":[{"headline":{"state":"unknown"},"heads":1,"kinds":["task"],"records":1,"thing":"task:one"}]}"#
        );
    }
    // The withheld whole record may set other keys, but this explicit setter
    // now determines name (a list, even with one string, is not a text headline).
    reader.ok(&[
        "emit",
        "task",
        "--of",
        "task:one",
        r#"name:=["not a headline"]"#,
    ]);
    assert_eq!(
        reader.ok(&["ls", "task:"]),
        r#"{"things":[{"headline":{"state":"absent"},"heads":1,"kinds":["task"],"records":2,"thing":"task:one"}]}"#
    );
}

#[test]
fn ls_answers_from_checked_lines_then_reports_an_unclean_store() {
    let s = Store::new("ls-dirty");
    s.ok(&["emit", "note", "--of", "shelf:tools", "name=Tools"]);
    let clean = holding("ls-clean", &s.ok(&["export"]));
    let segment = &s.segments()[0];
    let mut bytes = fs::read(segment).expect("segment");
    bytes.extend_from_slice(b"not JSON\n");
    fs::write(segment, bytes).expect("alter segment");
    answers_then_refuses(
        &s,
        &clean,
        &[
            (&["ls"], ""),
            (&["ls", "--things"], ""),
            (&["ls", "missing:"], ""),
        ],
        "store-not-clean: 1 line refused, 1 segment altered; `loops check` lists them",
    );
}

#[test]
fn version_identifies_the_binary_outside_a_store_without_a_key() {
    let outside = Store::scratch("ls-version");
    assert_eq!(
        outside.ok(&["--version"]),
        concat!("strange-loops-next ", env!("CARGO_PKG_VERSION"))
    );
    assert!(!outside.dir.join("device-key").exists());
    assert_eq!(
        outside.ok(&["--help"]).lines().next(),
        Some("usage: loops [-C <dir>] <verb> ...")
    );
}

struct WalkCache(PathBuf);

impl WalkCache {
    fn new(name: &str) -> Self {
        let path =
            std::env::temp_dir().join(format!("loops-walk-cache-{name}-{}", std::process::id()));
        let mut dir = fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            dir.mode(0o700);
        }
        dir.create(&path).expect("test cache");
        Self(path)
    }

    fn list(&self) -> PathBuf {
        self.0.join("checked-segments-v1")
    }

    fn command(&self, store: &Store, args: &[&str]) -> Command {
        let mut cmd = store.command(args);
        cmd.env("LOOPS_CACHE_DIR", &self.0);
        cmd
    }

    fn compare_fold(&self, store: &Store, count: &str, status: i32) {
        let spec = store.dir.join("count.json");
        fs::write(
            &spec,
            r#"{"vertex":"c","from":[{"store":"."}],"fold":{"facts":{"count":true}}}"#,
        )
        .expect("spec");
        let args = ["fold", spec.to_str().expect("spec path")];
        let full = self
            .command(store, &args)
            .env("LOOPS_CACHE_DIR", "")
            .output()
            .expect("full fold");
        assert_eq!(full.status.code(), Some(status));
        assert_eq!(
            String::from_utf8_lossy(&full.stdout).trim(),
            format!(r#"{{"facts":{{"unread":0,"value":{count}}}}}"#)
        );
        assert_eq!(
            String::from_utf8_lossy(&full.stderr).contains("store-not-clean"),
            status == 1
        );
        for _ in 0..2 {
            let cached = self.command(store, &args).output().expect("cached fold");
            assert_eq!(
                (cached.status, &cached.stdout, &cached.stderr),
                (full.status, &full.stdout, &full.stderr)
            );
        }
    }
}

impl Drop for WalkCache {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn cache_digest(bytes: &[u8]) -> String {
    loops::base32::base32(&loops_place::line::hash(bytes))
}

#[test]
fn cached_folds_preserve_the_answer_and_exit_status_for_each_segment_condition() {
    let store = Store::new("cache-fold");
    let cache = WalkCache::new("fold");
    store.changeset("{\"kind\":\"note\"}\n{\"kind\":\"note\"}");
    cache.compare_fold(&store, "2", 0);
    let path = store.segments().remove(0);
    let whole = fs::read(&path).expect("segment");
    let wrong = path.with_file_name("wrong.jsonl");
    fs::rename(&path, &wrong).expect("wrong name on cached bytes");
    cache.compare_fold(&store, "2", 1);
    fs::rename(&wrong, &path).expect("restore");
    let cut = &whole[..whole.len() - 1];
    fs::write(&path, cut).expect("truncate");
    cache.compare_fold(&store, "1", 1);
    let fits = path.with_file_name(format!("{}.jsonl", cache_digest(cut)));
    fs::rename(&path, &fits).expect("name matches truncated bytes");
    cache.compare_fold(&store, "1", 0);
    let mut bad = whole.clone();
    bad.extend_from_slice(b"{}\n");
    let named_bad = path.with_file_name(format!("{}.jsonl", cache_digest(&bad)));
    fs::rename(&fits, &named_bad).expect("one segment");
    fs::write(named_bad, bad).expect("refused line");
    cache.compare_fold(&store, "2", 1);
    assert_eq!(
        fs::read_to_string(cache.list()).expect("list"),
        format!("{}\n", cache_digest(&whole))
    );
}

#[test]
fn check_and_import_verify_signatures_even_with_a_poisoned_user_cache() {
    let store = Store::new("cache-check");
    let cache = WalkCache::new("check");
    store.changeset(r#"{"kind":"note"}"#);
    let check = || cache.command(&store, &["check"]).output().expect("check");
    assert!(check().status.success());
    assert!(!cache.list().exists());
    cache.compare_fold(&store, "1", 0);
    let path = store.segments().remove(0);
    let mut line = fs::read_to_string(&path).expect("segment");
    let prefix = "\"ed25519\":\"";
    let pos = line.find(prefix).expect("signature") + prefix.len();
    let digit = if line.as_bytes()[pos] == b'0' {
        "1"
    } else {
        "0"
    };
    line.replace_range(pos..=pos, digit);
    let digest = cache_digest(line.as_bytes());
    let renamed = path.with_file_name(format!("{digest}.jsonl"));
    fs::rename(&path, &renamed).expect("fitting name");
    fs::write(&renamed, &line).expect("segment");
    fs::write(cache.list(), format!("{digest}\n")).expect("poison own cache");
    let cached = cache.command(&store, &["export"]).output().expect("export");
    assert!(cached.status.success());
    assert_eq!(cached.stdout, line.as_bytes());
    let full = check();
    assert_eq!(full.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&full.stdout).contains("signature-invalid"));
    assert!(String::from_utf8_lossy(&full.stderr).contains("store-not-clean"));
    let import = cache
        .command(&store, &["import", renamed.to_str().expect("segment path")])
        .output()
        .expect("import");
    assert_eq!(import.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&import.stderr).contains("signature-invalid"));
    // Even an entry planted by the user cannot skip verification when the
    // name or framing fails. The bad complete line must now be refused.
    let wrong = path.with_file_name("renamed.jsonl");
    fs::rename(&renamed, &wrong).expect("wrong filename");
    cache.compare_fold(&store, "0", 1);
    line.push('{');
    let truncated_hash = cache_digest(line.as_bytes());
    let truncated = path.with_file_name(format!("{truncated_hash}.jsonl"));
    fs::rename(wrong, &truncated).expect("fitting filename");
    fs::write(truncated, line).expect("incomplete tail after the complete line");
    fs::write(cache.list(), format!("{truncated_hash}\n")).expect("test entry");
    cache.compare_fold(&store, "0", 1);
}

#[test]
fn erase_rechecks_the_rewritten_segment_and_concurrent_readers_publish_whole_lists() {
    let cache = WalkCache::new("parallel");
    let a = Store::new("cache-parallel-a");
    let b = Store::new("cache-parallel-b");
    let rows = r#"{"kind":"note","payload":{"text":"erase me"}}"#;
    let input = vec![rows; 48].join("\n");
    let id = a.changeset(&input).remove(0);
    b.changeset(&input);
    let mut children = Vec::new();
    for s in [&a, &b] {
        children.push(
            cache
                .command(s, &["ls"])
                .stdout(Stdio::null())
                .spawn()
                .expect("read"),
        );
    }
    for mut child in children {
        assert!(child.wait().expect("exit").success());
    }
    let digests = |s: &Store| {
        s.segments()
            .iter()
            .map(|p| cache_digest(&fs::read(p).expect("segment")))
            .collect::<Vec<_>>()
    };
    let original = digests(&a);
    let mut both = original.clone();
    both.extend(digests(&b));
    let list = fs::read_to_string(cache.list()).expect("complete published list");
    assert!(list.ends_with('\n') && list.lines().all(|d| both.iter().any(|hash| hash == d)));
    for store in [&a, &b] {
        cache.compare_fold(store, "48", 0);
    }
    let erase = cache.command(&a, &["erase", &id]).output().expect("erase");
    assert!(erase.status.success());
    let after = digests(&a);
    assert_eq!(after.len(), 2);
    assert!(after.iter().all(|d| !original.contains(d)));
    let exported = cache
        .command(&a, &["export"])
        .output()
        .expect("read purged store");
    assert!(exported.status.success());
    let held = String::from_utf8(exported.stdout).expect("export");
    let erased = held
        .lines()
        .map(|l| parse_json(l).expect("line"))
        .find(|l| text(l, &["id"]) == id)
        .expect("purged record");
    assert!(has(&erased, &[], "commit") && !has(&erased, &[], "payload"));
    let list = fs::read_to_string(cache.list()).expect("updated list");
    assert!(
        both.iter()
            .chain(&after)
            .all(|d| list.lines().any(|line| line == d))
    );
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            fs::metadata(cache.list())
                .expect("file")
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }
}

#[test]
fn segment_cache_uses_the_users_cache_directory() {
    let store = Store::new("cache-home");
    store.changeset(r#"{"kind":"note"}"#);
    let scratch = WalkCache::new("home");
    let xdg = scratch.0.join("xdg");
    let home = scratch.0.join("home");
    let default = home.join(".cache/loops/checked-segments-v1");
    let read = || {
        let mut cmd = scratch.command(&store, &["export"]);
        cmd.env_remove("LOOPS_CACHE_DIR").env("HOME", &home);
        cmd
    };
    assert!(
        read()
            .env("XDG_CACHE_HOME", &xdg)
            .output()
            .expect("XDG")
            .status
            .success()
    );
    assert!(xdg.join("loops/checked-segments-v1").is_file());
    assert!(!default.exists());
    assert!(
        read()
            .env_remove("XDG_CACHE_HOME")
            .output()
            .expect("fallback")
            .status
            .success()
    );
    assert!(default.is_file());
}

#[test]
fn ordinary_walk_populates_only_its_own_verification_cache() {
    let store = Store::new("private-cache");
    let list = store.scratch.join("cache/checked-segments-v1");
    assert!(!list.exists());
    store.ok(&["emit", "note", "hello"]);
    store.ok(&["ls"]);
    let segment = store.segments().pop().expect("one segment");
    let digest = cache_digest(&fs::read(segment).expect("segment bytes"));
    assert_eq!(
        fs::read_to_string(list).expect("walk's cache"),
        format!("{digest}\n")
    );
    assert!(!store.scratch.join("home/.cache").exists());
}

/// Put the test clock on this child only; other walks can run concurrently.
fn monday(s: &Store, args: &[&str]) -> String {
    let out = s
        .command(args)
        .env("LOOPS_TEST_PLAIN_NOW", "2026-11-20T12:00:00Z")
        .output()
        .expect("plain view");
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    String::from_utf8(out.stdout).expect("text")
}

#[test]
fn a_monday_projection_keeps_typed_values_and_the_prior_name() {
    let s = Store::new("monday-types");
    s.changeset(r#"{"kind":"task","of":"task:kiln","about":["site:shop"],"occurred":"2026-11-18/2026-11-19","emitted":"2026-11-20T08:00:00Z","payload":{"name":"Repair kiln","note":"hot\n\u001b[31m","wait":null,"cost":3,"crew":["Jo",2],"status":"open"}}"#);
    let head = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:kiln",
        "--emitted",
        "2026-11-20T09:00:00Z",
        "--sets",
        "status",
        "--sets",
        "gone",
        "status=done",
    ]);
    s.ok(&["emit", "task", "--of", "task:lamp", "name=Fit lamp"]);
    let names = "name,status,gone,wait,cost,crew,note";
    let all = s.json(&["ls", "--fields", names]);
    assert_eq!(all, s.json(&["ls", "--things", "--fields", names]));
    assert_eq!(all, s.json(&["ls", "--fields", names, "task:"]));
    let Json::Arr(rows) = at(&all, &["things"]) else {
        panic!("things")
    };
    let expected = r#"{"cost":{"state":"value","value":3},"crew":{"state":"value","value":["Jo",2]},"gone":{"state":"unset"},"name":{"state":"value","value":"Repair kiln"},"note":{"state":"value","value":"hot\n\u001b[31m"},"status":{"state":"value","value":"done"},"wait":{"state":"value","value":null}}"#;
    assert_eq!(at(&rows[0], &["fields"]).canon(), expected);
    assert_eq!(text(&rows[1], &["fields", "status", "state"]), "unset");
    assert_eq!(monday(&s, &["ls", "--plain"]), "KIND  RECORDS\ntask  3\n");
    assert_eq!(
        monday(&s, &["ls", "task:", "--fields", "name,status", "--plain"]),
        "THING      HEAD KINDS  RECORDS  HEADS  name         status\ntask:kiln  task        2        1      Repair kiln  done\ntask:lamp  task        1        1      Fit lamp     —\n"
    );
    assert_eq!(
        monday(
            &s,
            &[
                "ls",
                "task:kiln",
                "--fields",
                "gone,wait,cost,crew,note",
                "--plain"
            ]
        ),
        concat!(
            "THING      HEAD KINDS  RECORDS  HEADS  gone  wait  cost  crew      note\n",
            "task:kiln  task        2        1      —     null  3     [\"Jo\",2]  hot\\n\\u001b[31m\n"
        )
    );
    assert_eq!(
        monday(&s, &["of", "task:kiln", "--plain"]),
        format!(
            "thing  task:kiln\nrecords  2\nheads  1\n  cost  3\n  crew  [\"Jo\",2]\n  gone  —\n  name  Repair kiln\n  note  hot\\n\\u001b[31m\n  status  done\n  wait  null\nabout  site:shop\nhead  {head}\n  emitted  3 hours ago\n  occurred  2026-11-18/2026-11-19\n"
        )
    );
}

#[test]
fn listings_and_of_share_name_evidence_on_every_thing() {
    let s = Store::new("monday-setters");
    let fork=s.changeset(r#"{"kind":"task","of":"task:fork","emitted":"2026-11-20T09:00:00Z","occurred":"2026-11-19?","sets":["name"],"payload":{"name":"Left"}}
{"kind":"task","of":"task:fork","emitted":"2026-11-20T12:02:00Z","sets":["name"],"payload":{"name":"Right"}}"#);
    s.changeset(
        r#"{"kind":"task","of":"task:unset","sets":["name"],"payload":{}}
{"kind":"task","of":"task:whole","payload":{"name":"Whole"}}"#,
    );
    let erased = s.ok(&[
        "emit",
        "task",
        "--of",
        "task:erased",
        "--sets",
        "name",
        "--emitted",
        "2026-11-20T09:00:00Z",
        "name=Erased",
    ]);
    s.ok(&["erase", &erased]);
    let source = Store::new("monday-withhold-source");
    let withheld = source.ok(&[
        "emit",
        "task",
        "--of",
        "task:withheld",
        "--emitted",
        "2026-11-20T09:00:00Z",
        "name=Withheld",
    ]);
    source.ok(&["erase", &withheld]);
    s.ok_with(&["import"], &source.ok(&["get", &withheld]));

    let listed = s.json(&["ls", "--things", "--fields", "name"]);
    let Json::Arr(rows) = at(&listed, &["things"]) else {
        panic!("things")
    };
    let inventory = s.json(&["ls", "--things"]);
    let Json::Arr(unprojected) = at(&inventory, &["things"]) else {
        panic!("things")
    };
    assert_eq!(unprojected.len(), rows.len());
    for (row, original) in rows.iter().zip(unprojected) {
        let thing = text(row, &["thing"]);
        assert_eq!(thing, text(original, &["thing"]));
        assert_eq!(at(original, &["headline"]), at(row, &["headline"]));
        let detail = s.json(&["of", thing]);
        let field = at(row, &["fields", "name"]);
        let headline = at(row, &["headline"]);
        let (state, title) = if has(&detail, &["values"], "name") {
            assert_eq!(at(&detail, &["values", "name"]), at(field, &["value"]));
            assert_eq!(at(headline, &["value"]), at(field, &["value"]));
            ("value", "text")
        } else if has(&detail, &[], "setters") {
            let setters = at(&detail, &["setters", "name"]);
            assert_eq!(at(field, &["setters"]), setters);
            if len(field, &["setters"]) > 1 {
                ("conflict", "conflict")
            } else {
                ("unknown", "unknown")
            }
        } else if has(&detail, &[], "unheld") {
            assert_eq!(at(&detail, &["unheld"]), at(field, &["setters"]));
            ("unknown", "unknown")
        } else {
            ("unset", "absent")
        };
        assert_eq!(text(field, &["state"]), state, "{thing}");
        assert_eq!(text(headline, &["state"]), title, "{thing}");
    }
    assert_eq!(
        monday(&s, &["ls", "task:", "--plain"]),
        "THING          HEAD KINDS  RECORDS  HEADS  HEADLINE\ntask:erased    task        1        1      unknown\ntask:fork      task        2        2      conflict (2): Right | Left\ntask:unset     task        1        1      —\ntask:whole     task        1        1      Whole\ntask:withheld  task        1        1      unknown\n"
    );
    for (thing, head, additional) in [
        ("task:erased", erased, "  name  unknown"),
        ("task:withheld", withheld, "other fields  unknown"),
    ] {
        assert_eq!(
            monday(&s, &["of", thing, "--plain"]),
            format!(
                "thing  {thing}\nrecords  1\nheads  1\n{additional}\nabout  —\nhead  {head}\n  emitted  3 hours ago\n  occurred  —\n"
            )
        );
    }
    assert_eq!(
        monday(&s, &["of", "task:fork", "--plain"]),
        format!(
            "thing  task:fork\nrecords  2\nheads  2\n  name  conflict (2): Right | Left\nabout  —\nhead  {}\n  emitted  in 2 minutes\n  occurred  —\nhead  {}\n  emitted  3 hours ago\n  occurred  2026-11-19?\n",
            fork[1], fork[0]
        )
    );
}

#[test]
fn plain_and_json_are_exclusive_on_both_views() {
    let s = Store::new("monday-usage");
    for args in [
        &["--json", "ls", "--plain"][..],
        &["of", "task:kiln", "--plain", "--json"],
    ] {
        let (status, stdout, stderr) = answer(&s, args, "");
        assert_eq!(status, 2);
        assert_eq!(stdout, "");
        assert!(stderr.contains("--plain and --json"));
    }
}

#[test]
fn json_without_plain_keeps_its_original_bytes() {
    let s = fixed_store("monday-json");
    let id = fixed_emit(&s, &["task", "--of", "task:kiln", "name=Kiln"]);
    let spec = r#"{"vertex":"items","from":[{"store":"."}],"fold":{"all":{"collect":true}}}"#;
    fs::create_dir_all(s.dir.join(".loops/vertices")).expect("vertices");
    fs::write(s.dir.join(".loops/vertices/items.json"), spec).expect("spec");
    // Captured from the parent binary with this key, salt, draft and spec.
    let line = r#"{"env":{"emitted":"2026-11-20T00:00:00Z","kind":"task","observer":"k:7dl2ff6emqi2qol3l382krodedij45bn3nh479hqo14a32qpr8kg","of":"task:kiln"},"id":"r:fhdhrbkcj8hsc21u9lt8rm3kgaunmefpto2trjmiolcr701m9nj0","payload":{"name":"Kiln"},"salt":"00000000000000000000000000","sig":{"ed25519":"66mo4pqisosjh1u0bf8j4vaaqdr94pv4949ik18942qv3f75tl9lmpb3qhict4rrpgi4rct0393nq3924klcmk6ub4sfs4fcvkn5c0o","key":"k:7dl2ff6emqi2qol3l382krodedij45bn3nh479hqo14a32qpr8kg"}}"#;
    let of = format!(
        r#"{{"about":[],"heads":[{line}],"records":1,"thing":"task:kiln","values":{{"name":"Kiln"}}}}"#
    );
    let ls = r#"{"things":[{"headline":{"state":"text","value":"Kiln"},"heads":1,"kinds":["task"],"records":1,"thing":"task:kiln"}]}"#;
    let slots = r#"{"all":{"heads":[{"id":"r:fhdhrbkcj8hsc21u9lt8rm3kgaunmefpto2trjmiolcr701m9nj0","shown":"here"}],"unread":0}}"#;
    for (args, stdin, want) in [
        (&["get", id.as_str()][..], "", line),
        (&["of", "task:kiln"], "", of.as_str()),
        (&["ls", "--things"], "", ls),
        (&["read", "items"], "", slots),
        (&["fold", "-"], spec, slots),
    ] {
        assert_eq!(
            answer(&s, args, stdin),
            (0, format!("{want}\n"), String::new())
        );
    }
}

#[test]
fn plain_text_quotes_only_ambiguous_values() {
    let s = Store::new("plain-text");
    let cases = [
        ("empty", "", r#""""#),
        ("absent", "—", r#""—""#),
        ("unknown", "unknown", r#""unknown""#),
        ("null", "null", r#""null""#),
        ("true", "true", r#""true""#),
        ("false", "false", r#""false""#),
        ("conflict", "conflict (12)", r#""conflict (12)""#),
        ("integer", "42", r#""42""#),
        ("exponent", "-3.5e+400", r#""-3.5e+400""#),
        ("array", "[1]", r#""[1]""#),
        ("object", r#"{"x":[true,{}]}"#, r#""{\"x\":[true,{}]}""#),
        ("left", " left", r#"" left""#),
        ("right", "right ", r#""right ""#),
        ("whitespace", "\u{85}edge", r#""\u0085edge""#),
        ("ordinary", "two words", "two words"),
        ("newline", "line\nbreak", r"line\nbreak"),
        ("escape", "a\u{1b}b", r"a\u001bb"),
        ("digits", "01", "01"),
        ("brackets", "[1,]", "[1,]"),
        ("braces", "{x}", "{x}"),
        ("status", "conflict (many)", "conflict (many)"),
    ];
    let mut payload: Vec<_> = cases
        .iter()
        .map(|(k, v, _)| ((*k).to_owned(), Json::Str((*v).to_owned())))
        .collect();
    payload.push(("name".into(), Json::Str("unknown".into())));
    payload.push((
        "nested".into(),
        parse_json(r#"{"labels":["Repair kiln"],"ok":true}"#).expect("object"),
    ));
    let ids = s.changeset(&format!(
        r#"{{"kind":"task","of":"task:quotes","emitted":"2026-11-20T12:00:00Z","about":["site:kiln","area:yard"],"payload":{}}}"#,
        Json::Obj(payload).canon()
    ));
    let detail = monday(&s, &["of", "task:quotes", "--plain"]);
    let lines: Vec<_> = detail.lines().collect();
    for (key, _, expected) in cases {
        assert!(
            lines.contains(&format!("  {key}  {expected}").as_str()),
            "{detail}"
        );
    }
    assert!(lines.contains(&r#"  nested  {"labels":["Repair kiln"],"ok":true}"#));
    assert!(detail.ends_with(&format!(
        "about  area:yard site:kiln\nhead  {}\n  emitted  now\n  occurred  —\n",
        ids[0]
    )));
    assert_eq!(
        monday(&s, &["ls", "task:", "--plain"]),
        "THING        HEAD KINDS  RECORDS  HEADS  HEADLINE\ntask:quotes  task        1        1      \"unknown\"\n"
    );
    assert_eq!(
        monday(&s, &["ls", "--fields", "absent,name", "--plain"]),
        "THING        HEAD KINDS  RECORDS  HEADS  absent  name\ntask:quotes  task        1        1      \"—\"     \"unknown\"\n"
    );
}

const PLAIN_SHAPES: &str = r#"{"vertex":"morning","from":[{"store":".","kind":["task"]}],"fold":{
    "runs":{"count":true},"total":{"sum":"n"},"low":{"min":"n"},"high":{"max":"n"},"list":{"collect":true},
    "counts":{"count":true,"by":"area"},"sums":{"sum":"n","by":"area"},"mins":{"min":"n","by":"area"},
    "maxes":{"max":"n","by":"area"},"lists":{"collect":true,"by":"area"},
    "heads":{"latest-by":"of","follow":"prev"},"keyed":{"latest-by":"of","follow":"keys"}}}"#;

fn save_morning(s: &Store, spec: &str) {
    let dir = s.dir.join(".loops/vertices");
    fs::create_dir_all(&dir).expect("vertices");
    fs::write(dir.join("morning.json"), spec).expect("saved spec");
}

#[test]
fn plain_fold_and_read_show_each_shape_in_written_order() {
    let s = fixed_store("plain-fold-shapes");
    save_morning(&s, PLAIN_SHAPES);
    let spec_path = ".loops/vertices/morning.json";
    let groups = "  0 ungrouped\n  0 not read";
    let empty = format!(
        "runs  0\ntotal  0\nlow  nothing read\nhigh  nothing read\nlist  —\ncounts\n{groups}\nsums\n{groups}\nmins\n{groups}\nmaxes\n{groups}\nlists\n{groups}\nheads  —\nkeyed  —\n"
    );
    assert_eq!(monday(&s, &["read", "morning", "--plain"]), empty);
    // Independent heads on a fork. The newer head lacks n, so each grouped
    // numeric slot has an unread input alongside a real numeric zero.
    let ids = s.changeset(r#"{"kind":"task","salt":"00000000000000000000000000","of":"task:kiln","emitted":"2026-11-20T09:00:00Z","sets":["area","n"],"payload":{"area":"42","n":0}}
{"kind":"task","salt":"00000000000000000000000000","of":"task:kiln","emitted":"2026-11-20T10:00:00Z","sets":["area"],"payload":{"area":"42"}}"#);
    let (a, b) = (&ids[0][..10], &ids[1][..10]);
    let why = "1 not read: needed payload or field unavailable";
    let grouped_numeric = format!("  group  \"42\"  0\n    {why}\n{groups}");
    let expected = format!(
        "runs  2\ntotal  0\n  {why}\nlow  0\n  {why}\nhigh  0\n  {why}\nlist\n  {b}\n  {a}\ncounts\n  group  \"42\"  2\n{groups}\nsums\n{grouped_numeric}\nmins\n{grouped_numeric}\nmaxes\n{grouped_numeric}\nlists\n  group  \"42\"\n    {b}\n    {a}\n{groups}\nheads\n  thing  task:kiln\n    heads\n      {b}\n      {a}\nkeyed\n  thing  task:kiln  —\n    heads\n      {b}\n      {a}\n    setters  area\n      {b}\n      {a}\n    setters  n\n      {a}\n    whole  —\n"
    );
    assert_eq!(monday(&s, &["read", "morning", "--plain"]), expected);
    assert_eq!(monday(&s, &["fold", spec_path, "--plain"]), expected);
    assert_eq!(
        answer(&s, &["fold", "-", "--plain"], PLAIN_SHAPES),
        (0, expected, String::new())
    );
}

#[test]
fn plain_fold_values_show_payloads_and_keyed_setters() {
    let s = fixed_store("plain-fold-values");
    let spec = r#"{"vertex":"morning","from":[{"store":".","kind":["task"]}],"fold":{"list":{"collect":true,"limit":1},"item":{"latest-by":"of","follow":"keys"}}}"#;
    save_morning(&s, spec);
    let ids = s.changeset(r#"{"kind":"task","salt":"00000000000000000000000000","of":"task:kiln","emitted":"2026-11-20T09:00:00Z","occurred":"2026-11-18/2026-11-19","sets":["name","gone"],"payload":{"name":"Repair kiln"}}
{"kind":"task","salt":"00000000000000000000000000","of":"task:kiln","emitted":"2026-11-20T12:02:00Z","sets":["name","status"],"payload":{"name":"Other","status":"done\n\u001b"}}"#);
    let (a, b) = (&ids[0][..10], &ids[1][..10]);
    let observer = text(&s.json(&["whoami"]), &["observer"]).to_owned();
    let newer = format!("{b}  task\n");
    let head_meta = |indent: &str, when: &str, occurred: &str, sets: &str| {
        format!(
            "{indent}emitted  {when}\n{indent}occurred  {occurred}\n{indent}observer  {observer}\n{indent}of  task:kiln\n{indent}sets  {sets}"
        )
    };
    let b_meta = |indent| head_meta(indent, "in 2 minutes", "—", r#"["name","status"]"#);
    let a_meta = head_meta(
        "        ",
        "3 hours ago",
        "2026-11-18/2026-11-19",
        r#"["gone","name"]"#,
    );
    let want = format!(
        "list\n  {newer}{}\n    payload\n      name  Other\n      status  done\\n\\u001b\nitem\n  thing  task:kiln\n    heads\n      {newer}{}\n      {a}  task\n{a_meta}\n    setters  gone\n      {a}\n    setters  name\n      {b}\n      {a}\n    setters  status\n      {b}\n    whole  —\n    fields\n      gone  —\n      name  conflict (2): Other | Repair kiln\n      status  done\\n\\u001b\n    about  —\n",
        b_meta("    "),
        b_meta("        ")
    );
    for args in [
        ["read", "morning", "--values", "--plain"],
        [
            "fold",
            ".loops/vertices/morning.json",
            "--plain",
            "--values",
        ],
    ] {
        assert_eq!(monday(&s, &args), want);
    }
    s.ok(&["erase", b]);
    let erased = monday(&s, &["read", "morning", "--plain", "--values"]);
    assert!(
        erased
            .lines()
            .nth(1)
            .is_some_and(|line| line.ends_with("  erased  task"))
    );
    assert!(erased.contains("    payload  unknown\n"));
    assert!(erased.contains("      status  unknown\n"));
    assert!(!erased.contains("done"));
}

#[test]
fn plain_fold_reports_missing_group_inputs_usage_and_unclean_lines() {
    let s = Store::new("plain-fold-unclean");
    let spec = r#"{"vertex":"morning","from":[{"store":".","kind":["task"]}],"fold":{"areas":{"count":true,"by":"area"}}}"#;
    save_morning(&s, spec);
    let id = s.ok(&["emit", "task", "area=shop"]);
    s.ok(&["erase", &id]);
    s.ok(&["emit", "task", "name=Other"]);
    let want = "areas\n  1 ungrouped\n  1 not read: needed payload or field unavailable\n";
    for args in [
        &["fold", "-", "--plain", "--json"][..],
        &["--json", "read", "morning", "--plain"],
    ] {
        let (code, out, err) = answer(&s, args, spec);
        assert_eq!((code, out), (2, String::new()));
        assert!(err.contains("--plain and --json"));
    }
    let segment = &s.segments()[0];
    let mut bytes = fs::read(segment).expect("read segment");
    bytes.extend_from_slice(b"not JSON\n");
    fs::write(segment, bytes).expect("torn segment");
    for args in [["fold", "-", "--plain"], ["read", "morning", "--plain"]] {
        let (code, out, err) = answer(&s, &args, spec);
        assert_eq!((code, out.as_str()), (1, want));
        assert!(err.contains("store-not-clean"));
    }
}

fn assert_cut_report(s: &Store, tick: &str, closure: &str, outside: usize) {
    assert_tick_check(
        s,
        tick,
        0,
        &format!(r#"{{"answer":"same","closure":"{closure}","taken-not-covered":{outside}}}"#),
    );
}

#[test]
fn tick_cut_two_nights_and_a_late_backup() {
    let s = Store::new("tick-cut-nights");
    let mut first = Vec::new();
    for (night, sizes) in [(16, [412, 3, 88]), (17, [419, 10, 95])] {
        for (service, mb) in ["jellyfin", "pihole", "gitea"].into_iter().zip(sizes) {
            let id = s.ok(&[
                "emit",
                "backup",
                &format!("svc={service}"),
                &format!("mb:={mb}"),
                "--emitted",
                &format!("2026-11-{night}T00:00:00Z"),
            ]);
            if night == 16 {
                first.push(id);
            }
        }
    }
    first.sort_unstable();
    let id = s.ok_with(&["tick", "-", "--as-of", "2026-11-17"], BACKUPS);
    let tick = s.json(&["get", &id]);
    let p = at(&tick, &["payload"]);
    assert_eq!(strings(p, &["covers"]), first);
    assert!(!has(p, &[], "withheld"));
    assert_eq!(text(p, &["result", "runs", "value"]), "3");
    assert_eq!(text(p, &["result", "mb", "value"]), "503");
    assert_cut_report(&s, &id, "yes", 3);
    s.ok(&["emit", "backup", "mb:=4"]);
    assert_cut_report(&s, &id, "yes", 4);
}

#[test]
fn tick_cut_skew_and_named_revision() {
    let s = Store::new("tick-cut-skew");
    let ids = s.changeset(
        r#"{"label":"@a","kind":"note","of":"task:x","emitted":"2000-01-01T00:00:00Z"}
{"label":"@b","kind":"note","of":"task:x","prev":["@a"],"emitted":"2000-01-01T00:00:05Z"}
{"kind":"backup","of":"task:x","prev":["@b"],"emitted":"2000-01-01T00:00:01Z"}
{"kind":"backup","emitted":"2000-01-02T00:00:00Z"}"#,
    );
    let mut chain = ids[..3].to_vec();
    chain.sort_unstable();
    for (flags, expected, outside) in [
        (vec!["--as-of", "2000-01-01T00:00:01Z"], &ids[..1], 2),
        (vec!["--as-of", "2000-01-01T00:00:02Z"], &chain[..], 1),
        (vec!["--cover", &ids[2][2..14]], &chain[..], 1),
        (
            vec!["--cover", &ids[0], "--cover", &ids[2], "--cover", &ids[0]],
            &chain[..],
            1,
        ),
    ] {
        let id = s.ok_with(&[&["tick", "-"][..], &flags].concat(), BACKUPS);
        assert_eq!(
            strings(&s.json(&["get", &id]), &["payload", "covers"]),
            expected
        );
        assert_cut_report(&s, &id, "yes", outside);
    }
}

#[test]
fn tick_cut_leaves_under_and_erases_outside() {
    let s = Store::new("tick-cut-under");
    let grant = s.ok(&["emit", "grant"]);
    let target = s.ok(&["emit", "backup"]);
    let y = s.ok(&["emit", "note", "--under", &grant, "--erases", &target]);
    let id = s.ok_with(&["tick", "-", "--cover", &y], BACKUPS);
    assert_eq!(strings(&s.json(&["get", &id]), &["payload", "covers"]), [y]);
    assert_cut_report(&s, &id, "no", 1);
}

#[test]
fn tick_cut_after_local_erasure_withholds_the_opening() {
    let s = Store::new("tick-cut-erasure");
    let target = s.ok(&[
        "emit",
        "backup",
        "mb:=412",
        "--emitted",
        "2000-01-01T00:00:00Z",
    ]);
    // Leave the target's original open line on disk. Even an outside eraser
    // with no local purge makes that opening unavailable to this writer.
    s.ok(&[
        "emit",
        "erasure",
        "--erases",
        &target,
        "--emitted",
        "2000-01-03T00:00:00Z",
    ]);
    let id = s.ok_with(&["tick", "-", "--as-of", "2000-01-02"], BACKUPS);
    let line = s.json(&["get", &id]);
    let p = at(&line, &["payload"]);
    assert_eq!(strings(p, &["covers"]), std::slice::from_ref(&target));
    assert_eq!(strings(p, &["withheld"]), [target]);
    assert_eq!(text(p, &["result", "runs", "value"]), "1");
    assert_eq!(text(p, &["result", "mb", "value"]), "0");
    assert_eq!(text(p, &["result", "mb", "unread"]), "1");
    assert_cut_report(&s, &id, "yes", 0);
}

#[test]
fn tick_cut_and_base_choose_payload_and_anchor_independently() {
    let s = Store::new("tick-cut-base");
    let anchor = s.ok(&["emit", "note", "--of", "tick:series", "--emitted", WHEN]);
    let base = s.ok_with(&["tick", "-", "--all", "--emitted", WHEN], BACKUPS);
    s.ok(&["emit", "note", "--of", "tick:series", "--emitted", WHEN]);
    let backup = s.ok(&["emit", "backup", "--emitted", "2000-01-01T00:00:00Z"]);
    for (flag, value) in [("--cover", backup.as_str()), ("--as-of", "2000-01-02")] {
        let id = s.ok_with(
            &[
                "tick",
                "-",
                "--base",
                &base,
                flag,
                value,
                "--of",
                "tick:series",
            ],
            BACKUPS,
        );
        assert_eq!(prev(&s, &id), std::slice::from_ref(&anchor));
        assert_eq!(
            strings(&s.json(&["get", &id]), &["payload", "covers"]),
            std::slice::from_ref(&backup)
        );
        assert_cut_report(&s, &id, "yes", 0);
    }
}

#[test]
fn tick_cut_usage_and_id_refusals_leave_store_intact() {
    let s = Store::new("tick-cut-invalid");
    let ids = s.changeset(
        &r#"{"kind":"backup"}
"#
        .repeat(33),
    );
    let before = s.ok(&["export"]);
    for flags in [
        vec!["--as-of", "2000", "--cover", &ids[0]],
        vec!["--cover", &ids[0], "--as-of", "2000"],
        vec!["--as-of", "2000", "--as-of", "2001"],
        vec!["--as-of", "2000/2001"],
        vec!["--as-of", "2000-02-30"],
        vec!["--all", "--as-of", "2000"],
        vec!["--as-of", "2000", "--all"],
        vec!["--all", "--cover", &ids[0]],
        vec!["--cover", &ids[0], "--all"],
        vec!["--slice", "--all"],
        vec!["--all", "--slice"],
        vec!["--cover", &ids[0], "--slice"],
        vec!["--slice", "--cover", &ids[0]],
        vec!["--all", "--all"],
        vec!["--slice", "--slice"],
        vec!["--cover"],
        vec!["--as-of"],
    ] {
        assert_eq!(
            s.fails(&[&["tick", "-"][..], &flags].concat(), BACKUPS).0,
            2,
            "{flags:?}"
        );
    }
    let prefix = ids
        .iter()
        .map(|id| &id[2..3])
        .find(|p| ids.iter().filter(|id| id[2..].starts_with(p)).count() >= 2)
        .expect("33 records share a first base32 digit");
    for operand in [prefix, "no-such-id"] {
        assert_eq!(
            s.fails(&["tick", "-", "--cover", operand], BACKUPS),
            s.fails(&["get", operand], "")
        );
    }
    assert_eq!(s.ok(&["export"]), before);
}

#[test]
fn tick_cut_full_cover_matches_all_signed_tick() {
    let s = Store::new("tick-cut-default");
    let first = s.ok(&["emit", "backup"]);
    let second = s.ok(&["emit", "note", "--erases", &first]);
    let fixed = ["tick", "-", "--emitted", WHEN, "--salt", SALT];
    let all = s.ok_with(&[&fixed[..], &["--all"]].concat(), BACKUPS);
    let explicit = s.ok_with(
        &[&fixed[..], &["--cover", &second, "--cover", &first]].concat(),
        BACKUPS,
    );
    assert_eq!(all, explicit);
    assert_cut_report(&s, &all, "yes", 0);
}

#[test]
fn tick_cut_random_skewed_stores_match_reference_and_replay() {
    const SEED: u32 = 0xc071_2026;
    const CASES: usize = 32;
    eprintln!("tick cut seed {SEED:#x}, {CASES} stores");
    let mut state = SEED;
    let mut pick = |limit: usize| {
        state = state.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        usize::try_from(state >> 8).expect("24 random bits fit usize") % limit
    };
    let mut skewed = 0;
    for case in 0..CASES {
        let s = Store::new(&format!("tick-cut-random-{case}"));
        let n = 6 + pick(13);
        let bound = pick(16);
        let stamp = |sec| format!("2000-01-01T00:00:{sec:02}Z");
        let mut edges = Vec::new();
        let mut seed = Vec::new();
        let mut drafts = Vec::new();
        for i in 0..n {
            let sec = pick(16);
            let mut parents = Vec::new();
            if i > 0 {
                for _ in 0..pick(4) {
                    parents.push(pick(i));
                }
                parents.sort_unstable();
                parents.dedup();
            }
            let prev = parents
                .iter()
                .map(|p| format!(r#""@r{p}""#))
                .collect::<Vec<_>>()
                .join(",");
            drafts.push(format!(r#"{{"label":"@r{i}","kind":"backup","of":"task:x","emitted":"{}","prev":[{prev}],"payload":{{"mb":{i}}}}}"#,stamp(sec)));
            edges.push(parents);
            seed.push(sec < bound);
        }
        let ids = s.changeset(&drafts.join("\n"));
        // Saturate the strict prefix by repeated scans, independently of the
        // CLI's id index and traversal order.
        let mut selected = seed.clone();
        loop {
            let before = selected.clone();
            for (i, parents) in edges.iter().enumerate() {
                if before[i] {
                    for &p in parents {
                        selected[p] = true;
                    }
                }
            }
            if selected == before {
                break;
            }
        }
        skewed += usize::from(selected != seed);
        let mut expected: Vec<_> = ids
            .iter()
            .zip(selected)
            .filter(|(_, yes)| *yes)
            .map(|(id, _)| id.clone())
            .collect();
        expected.sort_unstable();
        let id = s.ok_with(&["tick", "-", "--as-of", &stamp(bound)], BACKUPS);
        let tick = s.json(&["get", &id]);
        assert_eq!(
            strings(&tick, &["payload", "covers"]),
            expected,
            "seed {SEED:#x}, case {case}"
        );
        let verdict = s.json(&["tick", "--check", &id]);
        let report = format!(
            r#"{{"answer":"same","closure":"yes","taken-not-covered":{}}}"#,
            n - expected.len()
        );
        assert_eq!(verdict.canon(), report, "seed {SEED:#x}, case {case}");
    }
    assert!(
        skewed > 0,
        "seed {SEED:#x} must pull in a clock-skewed ancestor"
    );
    eprintln!("{skewed} stores pulled in a predecessor outside the strict prefix");
}

#[test]
fn emit_ends_options_before_literal_fields_and_message() {
    let s = Store::new("emit-end-options");
    assert_eq!(s.fails(&["emit", "message", "--leading-dashes"], "").0, 2);
    let id = s.ok(&["emit", "message", "--", "--leading-dashes"]);
    assert_eq!(
        text(&s.json(&["get", &id]), &["payload", "text"]),
        "--leading-dashes"
    );

    let id = s.ok(&[
        "--json",
        "emit",
        "message",
        "--of",
        "chat:here",
        "--",
        "--of=literal",
        "--qty:=2",
        "--json",
    ]);
    let record = s.json(&["get", &id]);
    assert_eq!(text(&record, &["env", "of"]), "chat:here");
    assert_eq!(
        at(&record, &["payload"]).canon(),
        r#"{"--of":"literal","--qty":2,"text":"--json"}"#
    );
    assert_eq!(
        s.fails(&["emit", "message", "--", "--first", "second"], "")
            .0,
        2
    );
    // Here the first "--" names the key that --sets declares.
    let id = s.ok(&[
        "emit",
        "message",
        "--sets",
        "--",
        "--json",
        "--of",
        "--json",
        "chat:here",
        "--",
        "--=literal",
    ]);
    assert_eq!(text(&s.json(&["get", &id]), &["payload", "--"]), "literal");
    let spec = r#"{"vertex":"morning","from":[{"store":"."}]}"#;
    let tick = s.ok_with(&["tick", "-", "--"], spec);
    assert_eq!(text(&s.json(&["get", &tick]), &["env", "kind"]), "tick");
    let before = s.ok(&["export"]);
    for trailing in ["x=1", "--no-about", "--json"] {
        assert_eq!(s.fails(&["tick", "-", "--", trailing], spec).0, 2);
    }
    assert_eq!(s.ok(&["export"]), before);
}

#[test]
fn whoami_can_make_the_writers_key_before_a_store_exists() {
    let s = Store::scratch("whoami-init");
    assert_eq!(s.fails(&["whoami"], "").0, 2);
    let path = s.dir.join("device-key");
    let (status, output, notice) = answer(&s, &["whoami", "--init"], "");
    let id = output.trim_end();
    assert_eq!(status, 0);
    assert!(id.starts_with("k:"));
    assert_eq!(
        notice,
        format!("loops: made signing key {id} at {}", path.display())
    );
    let seed = fs::read(&path).expect("key created");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            fs::metadata(&path)
                .expect("key metadata")
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }
    assert_eq!(
        answer(&s, &["whoami", "--init"], ""),
        (0, output.clone(), String::new())
    );
    assert_eq!(fs::read(&path).expect("existing key"), seed);
    assert_eq!(text(&s.json(&["whoami"]), &["observer"]), id);
    assert!(!s.dir.join(".loops").exists());
    s.ok(&["init"]);
    let record = s.ok(&["emit", "message", "hello"]);
    assert_eq!(text(&s.json(&["get", &record]), &["sig", "key"]), id);
}

#[test]
fn plain_root_prefixes_resolve_even_when_eight_digits_collide() {
    let s = fixed_store("plain-colliding-prefixes");
    // These two payloads, with the fixed key, instant and salt, share eight digits.
    let a = fixed_emit(&s, &["task", "--whole", "n:=2513597"]);
    let b = fixed_emit(&s, &["task", "--whole", "n:=2618869"]);
    assert_eq!(&a[..10], &b[..10]);
    let (pa, pb) = (&a[..11], &b[..11]);
    let listing = monday(&s, &["ls", "--things", "--plain"]);
    for (prefix, id) in [(pa, &a), (pb, &b)] {
        assert!(
            listing
                .lines()
                .any(|line| line.split_whitespace().next() == Some(prefix))
        );
        assert_eq!(text(&s.json(&["get", prefix]), &["id"]), id);
        assert_eq!(text(&s.json(&["of", prefix]), &["thing"]), id);
    }
    // One record taken, but both are still candidates when resolving its ID.
    let spec = format!(
        r#"{{"vertex":"morning","from":[{{"store":".","of":"{a}"}}],"fold":{{"items":{{"latest-by":"of","follow":"keys"}}}}}}"#
    );
    save_morning(&s, &spec);
    assert_eq!(
        monday(&s, &["read", "morning", "--plain"]),
        format!("items\n  thing  {pa}  —\n    heads\n      {pa}\n    whole\n      {pa}\n")
    );
}

#[test]
fn plain_conflicts_preview_each_live_setter_in_order() {
    let s = Store::new("plain-conflict-previews");
    let ids = s.changeset(r#"{"kind":"task","of":"task:kiln","emitted":"2026-11-20T09:00:00Z","sets":["name","port","note","x"],"payload":{"name":"Kiln","port":9000,"note":"long text that definitely exceeds forty characters here"}}
{"kind":"task","of":"task:kiln","emitted":"2026-11-20T10:00:00Z","sets":["name","port","note","x"],"payload":{"name":"Oven","port":9001,"note":"one\ntwo\u001b","x":"unknown"}}"#);
    let spec = r#"{"vertex":"morning","from":[{"store":"."}],"fold":{"items":{"latest-by":"of","follow":"keys"}}}"#;
    save_morning(&s, spec);
    let detail = monday(&s, &["of", "task:kiln", "--plain"]);
    for line in [
        "  name  conflict (2): Oven | Kiln",
        r"  note  conflict (2): one\ntwo\u001b | long text that definitely exceeds forty…",
        "  port  conflict (2): 9001 | 9000",
        r#"  x  conflict (2): "unknown" | —"#,
    ] {
        assert!(detail.lines().any(|actual| actual == line), "{detail}");
    }
    assert!(
        monday(&s, &["ls", "--fields", "port", "--plain"]).contains("conflict (2): 9001 | 9000")
    );
    assert!(
        monday(&s, &["read", "morning", "--plain"])
            .contains("  thing  task:kiln  conflict (2): Oven | Kiln\n")
    );
    assert!(
        s.ok(&["of", "task:kiln"])
            .contains("exceeds forty characters here")
    );
    s.ok(&["erase", &ids[0]]);
    assert!(monday(&s, &["ls", "task:kiln", "--plain"]).contains("conflict (2): Oven | unknown"));
    assert!(monday(&s, &["of", "task:kiln", "--plain"]).contains("conflict (2): 9001 | unknown"));
}

#[path = "walk/registry.rs"]
mod registry;

#[path = "walk/shadow_import.rs"]
mod shadow_import;

#[path = "walk/tick_slice.rs"]
mod tick_slice;

#[path = "walk/store_by_name.rs"]
mod store_by_name;

#[path = "walk/description.rs"]
mod description;

#[path = "walk/ls_active.rs"]
mod ls_active;

#[path = "walk/describe.rs"]
mod describe;

#[path = "walk/refers_to.rs"]
mod refers_to;

#[path = "walk/emit_strict.rs"]
mod emit_strict;

#[path = "walk/about_flags.rs"]
mod about_flags;

#[path = "walk/setters.rs"]
mod setters;
