//! Spec slots, parsing, and execution from model/Loops/Spec.lean.
use crate::{
    envelope::typed_ref,
    families::{self, Result as FoldResult, Tri},
    fold::latest_fold,
    json::Json,
    number::{Int, Nat},
    record::{Digest, Record, Shown},
    things::{admit, ids_of, per_thing},
    where_::{Cond, Refusal, RefusalCode, Tests, parse_where},
};

/// Lean: `Loops.FoldType`, model/Loops/Spec.lean.
/// A slot uses one fold from this closed vocabulary.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FoldType {
    /// Counts every selected record with a known test result.
    Count,
    /// Adds readable integers from the named payload field.
    Sum(String),
    /// Finds the smallest readable integer in the named payload field.
    Min(String),
    /// Finds the largest readable integer in the named payload field.
    Max(String),
    /// Reports selected current heads for each thing.
    LatestBy,
    /// Reports selected records newest first.
    Collect {
        /// Uses current per-thing heads instead of all records.
        follow: bool,
        /// Caps known matches without changing the unknown head count.
        limit: Option<Nat>,
    },
}

/// Lean: `Loops.Slot`, model/Loops/Spec.lean.
/// A named fold keeps its where tests in written order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Slot {
    /// The result member name.
    pub name: String,
    /// The fold and its arguments.
    pub fold_type: FoldType,
    /// The ordered field tests, or an empty conjunction.
    pub tests: Tests,
}

/// Lean: `Loops.SlotValue`, model/Loops/Spec.lean.
/// A slot result keeps its value and unread count.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SlotValue {
    /// A count and its unknown test count.
    Nat(FoldResult<Nat>),
    /// An integer sum and its unread count.
    Int(FoldResult<Int>),
    /// An optional integer extremum and its unread count.
    Opt(FoldResult<Option<Int>>),
    /// Current heads by thing, with distinct unknown ids counted across things.
    Things {
        /// Each selected thing and the selected current heads it holds.
        things: Vec<(String, Vec<(Digest, Shown)>)>,
        /// The number of distinct chosen ids with unknown payload tests.
        unread: Nat,
    },
    /// Records newest first, with unknown heads counted before the limit.
    Heads {
        /// The ids and reader forms of the selected records.
        heads: Vec<(Digest, Shown)>,
        /// The number of chosen heads with unknown payload tests.
        unread: Nat,
    },
}

impl Record {
    /// Lean: `Loops.Record.unlinked`, model/Loops/Spec.lean.
    /// Clones the record without succession links.
    #[must_use]
    pub fn unlinked(&self) -> Self {
        Self {
            prev: Vec::new(),
            ..self.clone()
        }
    }
}

/// Lean: `Loops.newestFirst`, model/Loops/Spec.lean.
/// Clears succession links and orders records by the latest fold.
/// Duplicate removal uses full record equality after the links are cleared.
pub fn newest_first(xs: &[Record]) -> Vec<Record> {
    latest_fold(&xs.iter().map(Record::unlinked).collect::<Vec<_>>()).heads
}

/// Lean: `Loops.limitTo`, model/Loops/Spec.lean.
/// Returns at most the limit, or all items when the limit exceeds machine width.
pub fn limit_to<'a, T>(limit: Option<&Nat>, xs: &'a [T]) -> &'a [T] {
    let n = limit.map_or(xs.len(), |k| usize::try_from(&k.0).unwrap_or(xs.len()));
    &xs[..n.min(xs.len())]
}

/// Lean: `Loops.shownIds`, model/Loops/Spec.lean.
/// Returns ids with their reader forms in record order.
pub fn shown_ids(hs: &[Record]) -> Vec<(Digest, Shown)> {
    hs.iter().map(|h| (h.id, h.shown)).collect()
}

/// Lean: `Loops.chosen`, model/Loops/Spec.lean.
/// Chooses a head by its source and envelope tests only.
pub fn chosen(sel: impl Fn(&Record) -> bool, cs: &[Cond], h: &Record) -> bool {
    sel(h)
        && cs
            .iter()
            .filter(|c| c.field.on_envelope())
            .rfold(Tri::Yes, |t, c| c.eval(h).and(t))
            == Tri::Yes
}

/// Lean: `Loops.payTest`, model/Loops/Spec.lean.
/// Combines only payload tests, with an empty conjunction equal to Yes.
pub fn pay_test(cs: &[Cond], h: &Record) -> Tri {
    cs.iter()
        .filter(|c| !c.field.on_envelope())
        .rfold(Tri::Yes, |t, c| c.eval(h).and(t))
}

/// Lean: `Loops.latestOf`, model/Loops/Spec.lean.
/// Resolves each thing over all records before applying source and where tests.
pub fn latest_of(sel: impl Fn(&Record) -> bool, cs: &[Cond], xs: &[Record]) -> SlotValue {
    let mut things = Vec::new();
    let mut unknown = Vec::new();
    for (thing, state) in per_thing(xs) {
        let mut kept = Vec::new();
        for h in state.heads.iter().filter(|h| chosen(&sel, cs, h)) {
            match pay_test(cs, h) {
                Tri::Yes => kept.push((h.id, h.shown)),
                Tri::Unknown => unknown.push(h.clone()),
                Tri::No => {}
            }
        }
        if !kept.is_empty() {
            things.push((thing, kept));
        }
    }
    SlotValue::Things {
        things,
        unread: Nat(ids_of(&unknown).len().into()),
    }
}

/// Lean: `Loops.collectOf`, model/Loops/Spec.lean.
/// Selects all records or current per-thing heads, then orders and limits known matches.
/// Unknown tests count heads before the limit, not distinct ids across things.
#[expect(
    clippy::fn_params_excessive_bools,
    reason = "Lean collectOf takes the explicit follow flag"
)]
pub fn collect_of(
    sel: impl Fn(&Record) -> bool,
    cs: &[Cond],
    follow: bool,
    limit: Option<&Nat>,
    xs: &[Record],
) -> SlotValue {
    let pool = if follow {
        per_thing(xs)
            .into_iter()
            .flat_map(|(_, s)| s.heads)
            .collect()
    } else {
        xs.to_vec()
    };
    let hs = newest_first(
        &pool
            .into_iter()
            .filter(|h| chosen(&sel, cs, h))
            .collect::<Vec<_>>(),
    );
    let unknown = hs
        .iter()
        .filter(|h| pay_test(cs, h) == Tri::Unknown)
        .count();
    let kept: Vec<_> = hs
        .into_iter()
        .filter(|h| pay_test(cs, h) == Tri::Yes)
        .collect();
    SlotValue::Heads {
        heads: shown_ids(limit_to(limit, &kept)),
        unread: Nat(unknown.into()),
    }
}

impl Slot {
    /// Lean: `Loops.Slot.run`, model/Loops/Spec.lean.
    /// Runs one slot without admission, settlement, or duplicate-id removal.
    pub fn run(&self, sel: impl Fn(&Record) -> bool, xs: &[Record]) -> SlotValue {
        let cs = self.tests.conds();
        let ev = |r: &Record| if sel(r) { Cond::all(&cs, r) } else { Tri::No };
        match &self.fold_type {
            FoldType::Count => SlotValue::Nat(families::count_acc().select(ev, xs)),
            FoldType::Sum(f) => SlotValue::Int(families::sum_on(f).select(ev, xs)),
            FoldType::Min(f) => SlotValue::Opt(families::min_on(f).select(ev, xs)),
            FoldType::Max(f) => SlotValue::Opt(families::max_on(f).select(ev, xs)),
            FoldType::LatestBy => latest_of(sel, &cs, xs),
            FoldType::Collect { follow, limit } => {
                collect_of(sel, &cs, *follow, limit.as_ref(), xs)
            }
        }
    }

    /// Lean: `Loops.Slot.toJson`, model/Loops/Spec.lean.
    /// Encodes the fold before follow, limit, and optional where members.
    pub fn to_json(&self) -> (String, Json) {
        let mut kvs = match &self.fold_type {
            FoldType::Count => vec![("count".into(), Json::Bool(true))],
            FoldType::Sum(f) => vec![("sum".into(), Json::Str(f.clone()))],
            FoldType::Min(f) => vec![("min".into(), Json::Str(f.clone()))],
            FoldType::Max(f) => vec![("max".into(), Json::Str(f.clone()))],
            FoldType::LatestBy => vec![
                ("latest-by".into(), Json::Str("about".into())),
                ("follow".into(), Json::Str("prev".into())),
            ],
            FoldType::Collect { follow, limit } => {
                let mut out = vec![("collect".into(), Json::Bool(true))];
                if *follow {
                    out.push(("follow".into(), Json::Str("prev".into())));
                }
                if let Some(k) = limit {
                    out.push(("limit".into(), Json::Int(Int(k.0.clone().into()))));
                }
                out
            }
        };
        if !self.tests.0.is_empty() {
            kvs.push(("where".into(), self.tests.to_json()));
        }
        (self.name.clone(), Json::Obj(kvs))
    }
}

/// Lean: `Loops.Source`, model/Loops/Spec.lean.
/// A source selects by envelope data. The caller resolves its store name.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Source {
    /// The store that supplies records before execution.
    pub store: String,
    /// The allowed kinds, or all kinds when empty.
    pub kinds: Vec<String>,
    /// The selected thing, or all things when absent.
    pub about: Option<String>,
}
impl Source {
    /// Lean: `Loops.Source.takes`, model/Loops/Spec.lean.
    /// Tests kind and thing membership, including anchors about nothing.
    pub fn takes(&self, r: &Record) -> bool {
        (self.kinds.is_empty() || self.kinds.contains(&r.kind))
            && self.about.as_ref().is_none_or(|t| r.is_about(t))
    }
    /// Lean: `Loops.Source.toJson`, model/Loops/Spec.lean.
    /// Encodes store, optional kinds, then optional thing.
    pub fn to_json(&self) -> Json {
        let mut kvs = vec![("store".into(), Json::Str(self.store.clone()))];
        if !self.kinds.is_empty() {
            kvs.push((
                "kind".into(),
                Json::Arr(self.kinds.iter().cloned().map(Json::Str).collect()),
            ));
        }
        if let Some(a) = &self.about {
            kvs.push(("about".into(), Json::Str(a.clone())));
        }
        Json::Obj(kvs)
    }
}

/// Lean: `Loops.Spec`, model/Loops/Spec.lean.
/// A vertex spec keeps source and slot order. It discards accepted unused JSON keys.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Spec {
    /// The vertex name.
    pub vertex: String,
    /// The sources, in written order.
    pub sources: Vec<Source>,
    /// The named folds, in written order.
    pub slots: Vec<Slot>,
}
impl Spec {
    /// Lean: `Loops.Spec.takes`, model/Loops/Spec.lean.
    /// Accepts a record when any source accepts its envelope.
    pub fn takes(&self, r: &Record) -> bool {
        self.sources.iter().any(|s| s.takes(r))
    }
    /// Lean: `Loops.Spec.select`, model/Loops/Spec.lean.
    /// Filters records without admission, settlement, or where tests.
    pub fn select(&self, xs: &[Record]) -> Vec<Record> {
        xs.iter().filter(|r| self.takes(r)).cloned().collect()
    }
    /// Lean: `Loops.Spec.run`, model/Loops/Spec.lean.
    /// Admits records with every replacement permitted, then runs each slot.
    /// The caller supplies one record per id. This method does not settle or remove duplicate ids.
    pub fn run(&self, xs: &[Record]) -> Vec<(String, SlotValue)> {
        self.run_with(xs, |_, _| true)
    }
    /// Lean: `Loops.Spec.run`, model/Loops/Spec.lean.
    /// Admits against the original records, then runs each slot.
    /// The caller supplies a pure `EnvOnly` rule that depends only on both envelopes.
    /// Rust does not enforce this proof requirement. This method does not settle or remove duplicate ids.
    pub fn run_with(
        &self,
        xs: &[Record],
        may: impl Fn(&Record, &Record) -> bool,
    ) -> Vec<(String, SlotValue)> {
        let ys = admit(xs, may);
        self.slots
            .iter()
            .map(|s| (s.name.clone(), s.run(|r| self.takes(r), &ys)))
            .collect()
    }
    /// Lean: `Loops.Spec.ofObject`, model/Loops/Spec.lean.
    /// Parses the object without checking duplicate members at any depth.
    ///
    /// # Errors
    /// Returns the first shape or grammar refusal in Lean's fixed check order.
    pub fn of_object(j: &Json) -> Result<Self, Refusal> {
        let Json::Obj(kvs) = j else {
            return Err(refuse(RefusalCode::SpecNotObject, ""));
        };
        check_keys(SPEC_KEYS, None, kvs)?;
        let vertex = spec_vertex(lookup(kvs, "vertex"))?;
        let sources = spec_sources(lookup(kvs, "from"))?;
        let slots = spec_slots(lookup(kvs, "fold"))?;
        Ok(Self {
            vertex,
            sources,
            slots,
        })
    }
    /// Lean: `Loops.Spec.ofJson`, model/Loops/Spec.lean.
    /// Checks raw duplicate members before shape, keys, vertex, sources, and slots.
    ///
    /// # Errors
    /// Returns the first refusal with its exact wire code and dot path.
    pub fn of_json(j: &Json) -> Result<Self, Refusal> {
        if let Some(path) = j.repeat_at(None) {
            return Err(refuse(RefusalCode::MemberDuplicate, &path));
        }
        Self::of_object(j)
    }
    /// Lean: `Loops.Spec.toJson`, model/Loops/Spec.lean.
    /// Encodes vertex, sources, and slots, without accepted unused metadata.
    pub fn to_json(&self) -> Json {
        Json::Obj(vec![
            ("vertex".into(), Json::Str(self.vertex.clone())),
            (
                "from".into(),
                Json::Arr(self.sources.iter().map(Source::to_json).collect()),
            ),
            (
                "fold".into(),
                Json::Obj(self.slots.iter().map(Slot::to_json).collect()),
            ),
        ])
    }
}

fn lookup<'a>(kvs: &'a [(String, Json)], name: &str) -> Option<&'a Json> {
    kvs.iter().find(|(k, _)| k == name).map(|(_, v)| v)
}
fn refuse(code: RefusalCode, path: &str) -> Refusal {
    Refusal {
        code,
        path: path.into(),
    }
}

/// Lean: `Loops.memberPath`, model/Loops/Spec.lean.
/// Joins a member path. An empty parent differs from no parent.
pub fn member_path(parent: Option<&str>, key: &str) -> String {
    parent.map_or_else(|| key.into(), |p| format!("{p}.{key}"))
}
impl Json {
    /// Lean: `Loops.Json.repeatAt`, `repeatIn`, and `repeatMember`, model/Loops/Spec.lean.
    /// Finds the first repeat depth first in written member order. Arrays share their parent's path.
    pub fn repeat_at(&self, path: Option<&str>) -> Option<String> {
        match self {
            Self::Arr(xs) => xs.iter().find_map(|x| x.repeat_at(path)),
            Self::Obj(kvs) => {
                for (i, (k, v)) in kvs.iter().enumerate() {
                    let p = member_path(path, k);
                    if kvs[..i].iter().any(|(seen, _)| seen == k) {
                        return Some(p);
                    }
                    if let Some(repeat) = v.repeat_at(Some(&p)) {
                        return Some(repeat);
                    }
                }
                None
            }
            _ => None,
        }
    }
}

/// Lean: `Loops.foldTypes`, model/Loops/Spec.lean.
/// Lists the closed fold vocabulary in declaration order.
pub const FOLD_TYPES: &[&str] = &["count", "sum", "min", "max", "latest-by", "collect"];
/// Lean: `Loops.slotKeys`, model/Loops/Spec.lean.
/// Lists allowed slot keys, including unused note metadata.
pub const SLOT_KEYS: &[&str] = &[
    "count",
    "sum",
    "min",
    "max",
    "latest-by",
    "collect",
    "where",
    "follow",
    "limit",
    "note",
];
/// Lean: `Loops.sourceKeys`, model/Loops/Spec.lean.
/// Lists allowed source keys.
pub const SOURCE_KEYS: &[&str] = &["store", "kind", "about"];
/// Lean: `Loops.specKeys`, model/Loops/Spec.lean.
/// Lists allowed root keys, including keys without runtime behavior.
pub const SPEC_KEYS: &[&str] = &[
    "vertex", "note", "from", "fold", "ticks", "order", "resolve", "window", "boundary", "param",
    "covers", "into", "bundle",
];

/// Lean: `Loops.checkKeys`, model/Loops/Spec.lean.
/// Checks allowed member names without checking repeats.
///
/// # Errors
/// Returns unknown-key for the first unknown member in written order.
pub fn check_keys(
    allowed: &[&str],
    path: Option<&str>,
    kvs: &[(String, Json)],
) -> Result<(), Refusal> {
    for (k, _) in kvs {
        if !allowed.contains(&k.as_str()) {
            return Err(refuse(RefusalCode::UnknownKey, &member_path(path, k)));
        }
    }
    Ok(())
}

/// Lean: `Loops.fieldArg`, model/Loops/Spec.lean.
/// Parses a numeric fold's nonempty payload field name.
///
/// # Errors
/// Returns fold-argument at the supplied path for other values.
pub fn field_arg(path: &str, j: &Json) -> Result<String, Refusal> {
    match j {
        Json::Str(s) if !s.is_empty() => Ok(s.clone()),
        _ => Err(refuse(RefusalCode::FoldArgument, path)),
    }
}
/// Lean: `Loops.slotType`, model/Loops/Spec.lean.
/// Finds exactly one written fold member without checking its argument.
///
/// # Errors
/// Returns fold-type for zero or multiple fold members, including repeats.
pub fn slot_type<'a>(path: &str, kvs: &'a [(String, Json)]) -> Result<&'a (String, Json), Refusal> {
    let mut types = kvs.iter().filter(|(k, _)| FOLD_TYPES.contains(&k.as_str()));
    match (types.next(), types.next()) {
        (Some(p), None) => Ok(p),
        _ => Err(refuse(RefusalCode::FoldType, path)),
    }
}
/// Lean: `Loops.slotFollow`, model/Loops/Spec.lean.
/// Parses the explicit prev link for head folds.
///
/// # Errors
/// Returns follow-missing on latest-by, or follow-invalid for an invalid link or fold.
pub fn slot_follow(path: &str, t: &str, j: Option<&Json>) -> Result<bool, Refusal> {
    match j {
        None if t == "latest-by" => Err(refuse(
            RefusalCode::FollowMissing,
            &format!("{path}.follow"),
        )),
        None => Ok(false),
        Some(Json::Str(s)) if s == "prev" && (t == "collect" || t == "latest-by") => Ok(true),
        Some(_) => Err(refuse(
            RefusalCode::FollowInvalid,
            &format!("{path}.follow"),
        )),
    }
}
/// Lean: `Loops.slotLimit`, model/Loops/Spec.lean.
/// Parses an unbounded positive collect limit.
///
/// # Errors
/// Returns limit-invalid when a present limit fails the fold or value check.
pub fn slot_limit(path: &str, t: &str, j: Option<&Json>) -> Result<Option<Nat>, Refusal> {
    match j {
        None => Ok(None),
        Some(Json::Int(i)) if t == "collect" && *i > Int::default() => {
            Ok(i.0.to_biguint().map(Nat))
        }
        Some(_) => Err(refuse(RefusalCode::LimitInvalid, &format!("{path}.limit"))),
    }
}
/// Lean: `Loops.foldType`, model/Loops/Spec.lean.
/// Parses a fold argument without validating the separate follow and limit parameters.
///
/// # Errors
/// Returns fold-argument at path.type for an invalid argument or unknown fold type.
#[expect(
    clippy::fn_params_excessive_bools,
    reason = "Lean foldType takes the explicit follow flag"
)]
pub fn fold_type(
    path: &str,
    t: &str,
    follow: bool,
    limit: Option<Nat>,
    arg: &Json,
) -> Result<FoldType, Refusal> {
    let p = format!("{path}.{t}");
    match (t, arg) {
        ("count", Json::Bool(true)) => Ok(FoldType::Count),
        ("sum", f) => field_arg(&p, f).map(FoldType::Sum),
        ("min", f) => field_arg(&p, f).map(FoldType::Min),
        ("max", f) => field_arg(&p, f).map(FoldType::Max),
        ("latest-by", Json::Str(s)) if s == "about" => Ok(FoldType::LatestBy),
        ("collect", Json::Bool(true)) => Ok(FoldType::Collect { follow, limit }),
        _ => Err(refuse(RefusalCode::FoldArgument, &p)),
    }
}
/// Lean: `Loops.slotTests`, model/Loops/Spec.lean.
/// Parses an optional where map without checking duplicate names.
///
/// # Errors
/// Returns the first where-invalid at the slot's where path.
pub fn slot_tests(path: &str, j: Option<&Json>) -> Result<Tests, Refusal> {
    j.map_or_else(
        || Ok(Tests::default()),
        |w| parse_where(&format!("{path}.where"), w),
    )
}
/// Lean: `Loops.parseSlot`, model/Loops/Spec.lean.
/// Checks name, keys, fold count, follow, limit, argument, then where.
///
/// # Errors
/// Returns the first slot refusal in that order, without duplicate validation.
pub fn parse_slot(name: &str, j: &Json) -> Result<Slot, Refusal> {
    let path = member_path(Some("fold"), name);
    if name.is_empty() {
        return Err(refuse(RefusalCode::FoldInvalid, &path));
    }
    let Json::Obj(kvs) = j else {
        return Err(refuse(RefusalCode::FoldInvalid, &path));
    };
    check_keys(SLOT_KEYS, Some(&path), kvs)?;
    let (t, arg) = slot_type(&path, kvs)?;
    let follow = slot_follow(&path, t, lookup(kvs, "follow"))?;
    let limit = slot_limit(&path, t, lookup(kvs, "limit"))?;
    let fold_type = fold_type(&path, t, follow, limit, arg)?;
    let tests = slot_tests(&path, lookup(kvs, "where"))?;
    Ok(Slot {
        name: name.into(),
        fold_type,
        tests,
    })
}
/// Lean: `Loops.parseKinds`, model/Loops/Spec.lean.
/// Parses one or more nonempty kind names and keeps repeats.
///
/// # Errors
/// Returns from-invalid at the supplied path for invalid shapes or names.
pub fn parse_kinds(path: &str, j: &Json) -> Result<Vec<String>, Refusal> {
    let Json::Arr(ks) = j else {
        return Err(refuse(RefusalCode::FromInvalid, path));
    };
    if ks.is_empty() {
        return Err(refuse(RefusalCode::FromInvalid, path));
    }
    ks.iter()
        .map(|k| match k {
            Json::Str(s) if !s.is_empty() => Ok(s.clone()),
            _ => Err(refuse(RefusalCode::FromInvalid, path)),
        })
        .collect()
}
/// Lean: `Loops.sourceStore`, model/Loops/Spec.lean.
/// Parses the required nonempty store name.
///
/// # Errors
/// Returns from-invalid at from.store when the store is absent or invalid.
pub fn source_store(j: Option<&Json>) -> Result<String, Refusal> {
    match j {
        Some(Json::Str(s)) if !s.is_empty() => Ok(s.clone()),
        _ => Err(refuse(RefusalCode::FromInvalid, "from.store")),
    }
}
/// Lean: `Loops.sourceKinds`, model/Loops/Spec.lean.
/// Parses optional kinds. Absence permits every kind.
///
/// # Errors
/// Returns from-invalid at from.kind for invalid present kinds.
pub fn source_kinds(j: Option<&Json>) -> Result<Vec<String>, Refusal> {
    j.map_or_else(|| Ok(Vec::new()), |k| parse_kinds("from.kind", k))
}
/// Lean: `Loops.sourceAbout`, model/Loops/Spec.lean.
/// Parses an optional typed thing reference.
///
/// # Errors
/// Returns from-invalid at from.about for an invalid present reference.
pub fn source_about(j: Option<&Json>) -> Result<Option<String>, Refusal> {
    match j {
        None => Ok(None),
        Some(Json::Str(a)) if typed_ref(a) => Ok(Some(a.clone())),
        Some(_) => Err(refuse(RefusalCode::FromInvalid, "from.about")),
    }
}
/// Lean: `Loops.parseSource`, model/Loops/Spec.lean.
/// Checks source keys, store, kinds, then about, without checking duplicates.
///
/// # Errors
/// Returns the first source refusal in that fixed order.
pub fn parse_source(j: &Json) -> Result<Source, Refusal> {
    let Json::Obj(kvs) = j else {
        return Err(refuse(RefusalCode::FromInvalid, "from"));
    };
    check_keys(SOURCE_KEYS, Some("from"), kvs)?;
    let store = source_store(lookup(kvs, "store"))?;
    let kinds = source_kinds(lookup(kvs, "kind"))?;
    let about = source_about(lookup(kvs, "about"))?;
    Ok(Source {
        store,
        kinds,
        about,
    })
}
/// Lean: `Loops.specVertex`, model/Loops/Spec.lean.
/// Parses the required nonempty vertex name.
///
/// # Errors
/// Returns vertex-missing for absence, or vertex-invalid for other invalid input.
pub fn spec_vertex(j: Option<&Json>) -> Result<String, Refusal> {
    match j {
        None => Err(refuse(RefusalCode::VertexMissing, "vertex")),
        Some(Json::Str(s)) if !s.is_empty() => Ok(s.clone()),
        Some(_) => Err(refuse(RefusalCode::VertexInvalid, "vertex")),
    }
}
/// Lean: `Loops.specSources`, model/Loops/Spec.lean.
/// Parses a nonempty source array in written order.
///
/// # Errors
/// Returns from-missing for absence or an empty array, or the first source refusal.
pub fn spec_sources(j: Option<&Json>) -> Result<Vec<Source>, Refusal> {
    match j {
        None => Err(refuse(RefusalCode::FromMissing, "from")),
        Some(Json::Arr(xs)) if xs.is_empty() => Err(refuse(RefusalCode::FromMissing, "from")),
        Some(Json::Arr(xs)) => xs.iter().map(parse_source).collect(),
        Some(_) => Err(refuse(RefusalCode::FromInvalid, "from")),
    }
}
/// Lean: `Loops.specSlots`, model/Loops/Spec.lean.
/// Parses optional named slots in written order.
///
/// # Errors
/// Returns fold-invalid for a nonobject fold, or the first slot refusal.
pub fn spec_slots(j: Option<&Json>) -> Result<Vec<Slot>, Refusal> {
    match j {
        None => Ok(Vec::new()),
        Some(Json::Obj(fs)) => fs.iter().map(|(n, s)| parse_slot(n, s)).collect(),
        Some(_) => Err(refuse(RefusalCode::FoldInvalid, "fold")),
    }
}
