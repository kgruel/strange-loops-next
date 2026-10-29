//! Closed selection tests and their parser from model/Loops/Spec.lean.
use crate::{
    envelope::{record_id, typed_ref},
    families::Tri,
    json::Json,
    occurred::{Claim, Span},
    record::{Digest, Record, Shown, Val, id_text},
};
use std::fmt;

/// Lean: `Loops.EnvField`, model/Loops/Spec.lean.
/// These envelope fields remain available when the reader lacks the payload.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnvField {
    /// The record's kind name.
    Kind,
    /// The typed reference for the observer who emits the record.
    Observer,
    /// The references for the things this record concerns.
    About,
    /// The ids of the records this record supersedes.
    Prev,
    /// The id of the grant this record uses, if any.
    Under,
    /// The ids of the records whose payloads this record erases.
    Erases,
    /// The observer's current time at emission.
    Emitted,
    /// The observer's claim about past time, if any.
    Occurred,
}
impl EnvField {
    /// Lean: `Loops.EnvField.all`, model/Loops/Spec.lean.
    /// Lists every envelope field in declaration order.
    pub const ALL: [Self; 8] = [
        Self::Kind,
        Self::Observer,
        Self::About,
        Self::Prev,
        Self::Under,
        Self::Erases,
        Self::Emitted,
        Self::Occurred,
    ];

    /// Lean: `Loops.EnvField.name`, model/Loops/Spec.lean.
    /// Returns the field name without the `env.` prefix.
    pub fn name(self) -> &'static str {
        match self {
            Self::Kind => "kind",
            Self::Observer => "observer",
            Self::About => "about",
            Self::Prev => "prev",
            Self::Under => "under",
            Self::Erases => "erases",
            Self::Emitted => "emitted",
            Self::Occurred => "occurred",
        }
    }
    /// Lean: `Loops.EnvField.type`, model/Loops/Spec.lean.
    /// Returns the argument domain for this envelope field.
    pub fn field_type(self) -> FieldType {
        match self {
            Self::Kind => FieldType::Text,
            Self::Observer | Self::About => FieldType::Refs,
            Self::Prev | Self::Under | Self::Erases => FieldType::Ids,
            Self::Emitted | Self::Occurred => FieldType::Time,
        }
    }
}

/// Lean: `Loops.FieldType`, model/Loops/Spec.lean.
/// A field type restricts test arguments without converting their values.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FieldType {
    /// Text with at least one character.
    Text,
    /// Typed references that the envelope grammar accepts.
    Refs,
    /// Record id text that the envelope grammar accepts.
    Ids,
    /// Time claims that the occurred grammar accepts.
    Time,
    /// Text, exact integers, or Boolean payload values.
    Payload,
}

/// Lean: `Loops.Field`, model/Loops/Spec.lean.
/// A test reads either a named payload field or a known envelope field.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Field {
    /// A known envelope field that all readers can read.
    Env(EnvField),
    /// A payload field name that requires the payload to be present.
    Payload(String),
}
impl Field {
    /// Lean: `Loops.Field.ofName`, model/Loops/Spec.lean.
    /// Reads a nonempty field name and refuses unknown names after `env.`.
    pub fn of_name(name: &str) -> Option<Self> {
        if name.is_empty() {
            None
        } else if let Some(suffix) = name.strip_prefix("env.") {
            EnvField::ALL
                .into_iter()
                .find(|f| f.name() == suffix)
                .map(Self::Env)
        } else {
            Some(Self::Payload(name.into()))
        }
    }
    /// Lean: `Loops.Field.name`, model/Loops/Spec.lean.
    /// Returns the written field name, with `env.` for envelope fields.
    pub fn name(&self) -> String {
        match self {
            Self::Env(f) => format!("env.{}", f.name()),
            Self::Payload(n) => n.clone(),
        }
    }
    /// Lean: `Loops.Field.onEnvelope`, model/Loops/Spec.lean.
    /// States whether this field remains known without a payload.
    pub fn on_envelope(&self) -> bool {
        matches!(self, Self::Env(_))
    }
    /// Lean: `Loops.Field.type`, model/Loops/Spec.lean.
    /// Returns the domain that this field permits for test arguments.
    pub fn field_type(&self) -> FieldType {
        match self {
            Self::Env(f) => f.field_type(),
            Self::Payload(_) => FieldType::Payload,
        }
    }
    /// Lean: `Loops.Field.read`, model/Loops/Spec.lean.
    /// Returns values in raw list order, including repeats.
    /// Returns `None` for unknown payload data and an empty list for a known absent field.
    pub fn read(&self, r: &Record) -> Option<Vec<Item>> {
        let text = |s: &str| Item::Val(Val::Str(s.into()));
        let ids = |ns: &[Digest]| ns.iter().map(|n| text(&id_text(n))).collect();
        Some(match self {
            Self::Env(EnvField::Kind) => vec![text(&r.kind)],
            Self::Env(EnvField::Observer) => vec![text(&r.observer)],
            Self::Env(EnvField::About) => r.about.iter().map(|s| text(s)).collect(),
            Self::Env(EnvField::Prev) => ids(&r.prev),
            Self::Env(EnvField::Under) => ids(r.under.as_slice()),
            Self::Env(EnvField::Erases) => ids(&r.erases),
            Self::Env(EnvField::Emitted) => {
                vec![Item::Time(Span::point(r.emitted.moment().clone()))]
            }
            Self::Env(EnvField::Occurred) => r
                .occurred
                .iter()
                .map(|c| Item::Time(c.span().clone()))
                .collect(),
            Self::Payload(f) => {
                if r.shown != Shown::Here {
                    return None;
                }
                r.get(f).into_iter().map(Item::Val).collect()
            }
        })
    }
}

/// Lean: `Loops.Item`, model/Loops/Spec.lean.
/// A field read yields a payload value or a time span without its text spelling.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Item {
    /// A text, integer, or Boolean value that the field holds.
    Val(Val),
    /// A parsed time span without its written claim.
    Time(Span),
}
impl Item {
    /// Lean: `Loops.Item.atLeast`, model/Loops/Spec.lean.
    /// Tests an inclusive lower bound on an integer or the span's start.
    pub fn at_least(&self, bound: &Arg) -> bool {
        match (bound, self) {
            (Arg::Val(Val::Int(i)), Self::Val(Val::Int(j))) => i <= j,
            (Arg::Time(c), Self::Time(s)) => c.span().start() <= s.start(),
            _ => false,
        }
    }
    /// Lean: `Loops.Item.below`, model/Loops/Spec.lean.
    /// Tests an exclusive upper bound on an integer or the span's start.
    pub fn below(&self, bound: &Arg) -> bool {
        match (bound, self) {
            (Arg::Val(Val::Int(i)), Self::Val(Val::Int(j))) => j < i,
            (Arg::Time(c), Self::Time(s)) => s.start() < c.span().start(),
            _ => false,
        }
    }
}

/// Lean: `Loops.Arg`, model/Loops/Spec.lean.
/// A test argument holds a value or a time claim with its text and span.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Arg {
    /// A value that the field's argument domain permits.
    Val(Val),
    /// A time claim that keeps its written text and parsed span.
    Time(Claim),
}
impl Arg {
    /// Lean: `Loops.Arg.matches`, model/Loops/Spec.lean.
    /// Compares exact values, or whole time spans without their spelling.
    pub fn matches(&self, item: &Item) -> bool {
        match (self, item) {
            (Self::Val(v), Item::Val(w)) => v == w,
            (Self::Time(c), Item::Time(s)) => c.span() == s,
            _ => false,
        }
    }
}

/// Lean: `Loops.Op`, model/Loops/Spec.lean.
/// An operator tests the values that one field supplies.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Op {
    /// At least one field value matches the argument.
    Is(Arg),
    /// No field value matches the argument, including when the field is absent.
    Not(Arg),
    /// The field supplies at least one value.
    Present,
    /// The field supplies no values.
    Absent,
    /// At least one integer or span start meets an inclusive lower bound.
    AtLeast(Arg),
    /// At least one integer or span start meets an exclusive upper bound.
    Below(Arg),
}
impl Op {
    /// Lean: `Loops.Op.test`, model/Loops/Spec.lean.
    /// Tests known field values. `Not` and `Absent` also hold on empty lists.
    pub fn test(&self, items: &[Item]) -> bool {
        match self {
            Self::Is(a) => items.iter().any(|i| a.matches(i)),
            Self::Not(a) => !items.iter().any(|i| a.matches(i)),
            Self::Present => !items.is_empty(),
            Self::Absent => items.is_empty(),
            Self::AtLeast(a) => items.iter().any(|i| i.at_least(a)),
            Self::Below(a) => items.iter().any(|i| i.below(a)),
        }
    }
}

/// Lean: `Loops.Cond`, model/Loops/Spec.lean.
/// A condition applies one operator to one record field.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Cond {
    /// The field that supplies values for this condition.
    pub field: Field,
    /// The test that this condition applies to the field's values.
    pub op: Op,
}
impl Cond {
    /// Lean: `Loops.Cond.eval`, model/Loops/Spec.lean.
    /// Tests the field, or returns `Unknown` when the reader lacks its payload.
    pub fn eval(&self, r: &Record) -> Tri {
        self.field
            .read(r)
            .map_or(Tri::Unknown, |items| Tri::of_bool(self.op.test(&items)))
    }
    /// Lean: `Loops.Cond.all`, model/Loops/Spec.lean.
    /// Combines all conditions. `No` overrides `Unknown`, and an empty conjunction returns `Yes`.
    pub fn all(cs: &[Self], r: &Record) -> Tri {
        cs.iter().rfold(Tri::Yes, |t, c| c.eval(r).and(t))
    }
}

/// Lean: `Loops.Tests`, model/Loops/Spec.lean.
/// A where map keeps fields and operators in written order, including repeats.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Tests(pub Vec<(Field, Vec<Op>)>);
impl Tests {
    /// Lean: `Loops.Tests.conds`, model/Loops/Spec.lean.
    /// Returns one condition per operator without changing written order.
    pub fn conds(&self) -> Vec<Cond> {
        self.0
            .iter()
            .flat_map(|(f, os)| {
                os.iter().map(|op| Cond {
                    field: f.clone(),
                    op: op.clone(),
                })
            })
            .collect()
    }
}

impl Val {
    /// Lean: `Loops.Val.toJson`, model/Loops/Spec.lean.
    /// Encodes a payload value without a writer range check.
    pub fn to_json(&self) -> Json {
        match self {
            Self::Str(s) => Json::Str(s.clone()),
            Self::Int(i) => Json::Int(i.clone()),
            Self::Number(n) => Json::Number(*n),
            Self::Bool(b) => Json::Bool(*b),
        }
    }
}

impl Arg {
    /// Lean: `Loops.Arg.toJson`, model/Loops/Spec.lean.
    /// Encodes the argument and keeps a time claim's original spelling.
    pub fn to_json(&self) -> Json {
        match self {
            Self::Val(v) => v.to_json(),
            Self::Time(c) => Json::Str(c.text().into()),
        }
    }
}

impl Op {
    /// Lean: `Loops.Op.toJson`, model/Loops/Spec.lean.
    /// Encodes one named operator with its argument.
    pub fn to_json(&self) -> (String, Json) {
        let (name, value) = match self {
            Self::Is(a) => ("is", a.to_json()),
            Self::Not(a) => ("not", a.to_json()),
            Self::Present => ("present", Json::Bool(true)),
            Self::Absent => ("absent", Json::Bool(true)),
            Self::AtLeast(a) => ("at-least", a.to_json()),
            Self::Below(a) => ("below", a.to_json()),
        };
        (name.into(), value)
    }
}

impl Tests {
    /// Lean: `Loops.Tests.toJson`, model/Loops/Spec.lean.
    /// Encodes fields and operators in written order, including repeats.
    pub fn to_json(&self) -> Json {
        Json::Obj(
            self.0
                .iter()
                .map(|(f, os)| (f.name(), Json::Obj(os.iter().map(Op::to_json).collect())))
                .collect(),
        )
    }
}

/// Lean: `Loops.Refusal.code`, model/Loops/Spec.lean.
/// This type names the closed refusal vocabulary for spec parsing.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[non_exhaustive]
pub enum RefusalCode {
    /// A field, argument, operator, or map shape breaks the where grammar.
    WhereInvalid,
    /// A raw object repeats a member name.
    MemberDuplicate,
    /// The spec root is not an object.
    SpecNotObject,
    /// An object contains an unknown member name.
    UnknownKey,
    /// The spec has no vertex member.
    VertexMissing,
    /// The vertex is not nonempty text.
    VertexInvalid,
    /// The spec has no sources.
    FromMissing,
    /// A source or its fields break the source grammar.
    FromInvalid,
    /// A slot name or fold map breaks the slot grammar.
    FoldInvalid,
    /// A slot names zero or multiple fold types.
    FoldType,
    /// Latest-by does not name its succession link.
    FollowMissing,
    /// A succession link or its fold type is invalid.
    FollowInvalid,
    /// A limit is not a positive collect limit.
    LimitInvalid,
    /// A fold argument breaks its type's grammar.
    FoldArgument,
}
impl RefusalCode {
    /// Lean: `Loops.Refusal.code`, model/Loops/Spec.lean.
    /// Returns the exact wire code for this refusal code.
    pub fn code(self) -> &'static str {
        match self {
            Self::WhereInvalid => "where-invalid",
            Self::MemberDuplicate => "member-duplicate",
            Self::SpecNotObject => "spec-not-object",
            Self::UnknownKey => "unknown-key",
            Self::VertexMissing => "vertex-missing",
            Self::VertexInvalid => "vertex-invalid",
            Self::FromMissing => "from-missing",
            Self::FromInvalid => "from-invalid",
            Self::FoldInvalid => "fold-invalid",
            Self::FoldType => "fold-type",
            Self::FollowMissing => "follow-missing",
            Self::FollowInvalid => "follow-invalid",
            Self::LimitInvalid => "limit-invalid",
            Self::FoldArgument => "fold-argument",
        }
    }
}
impl fmt::Display for RefusalCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

/// Lean: `Loops.Refusal`, model/Loops/Spec.lean.
/// A refusal names the failed check and the original field path.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Refusal {
    /// The check that refuses the spec or where input.
    pub code: RefusalCode,
    /// The written field path where the check fails.
    pub path: String,
}
impl Refusal {
    /// Lean: `Loops.Refusal.code`, model/Loops/Spec.lean.
    /// Returns the exact wire code for this refusal.
    pub fn code(&self) -> &'static str {
        self.code.code()
    }
}
impl fmt::Display for Refusal {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} at {}", self.code, self.path)
    }
}
impl std::error::Error for Refusal {}

fn invalid(path: &str) -> Refusal {
    Refusal {
        code: RefusalCode::WhereInvalid,
        path: path.into(),
    }
}

/// Lean: `Loops.parseArg`, model/Loops/Spec.lean.
/// Parses an argument in the field's domain, with safe-whole bounds on payload integers.
///
/// # Errors
/// Returns where-invalid at path for a value outside the argument domain.
pub fn parse_arg(ty: FieldType, path: &str, value: &Json) -> Result<Arg, Refusal> {
    match value {
        Json::Str(s) => match ty {
            FieldType::Payload => Ok(Arg::Val(Val::Str(s.clone()))),
            FieldType::Text if !s.is_empty() => Ok(Arg::Val(Val::Str(s.clone()))),
            FieldType::Refs if typed_ref(s) => Ok(Arg::Val(Val::Str(s.clone()))),
            FieldType::Ids if record_id(s) => Ok(Arg::Val(Val::Str(s.clone()))),
            FieldType::Time => Claim::of(s).map(Arg::Time).ok_or_else(|| invalid(path)),
            _ => Err(invalid(path)),
        },
        Json::Int(i) if ty == FieldType::Payload && value.in_range() => {
            Ok(Arg::Val(Val::Int(i.clone())))
        }
        Json::Bool(b) if ty == FieldType::Payload => Ok(Arg::Val(Val::Bool(*b))),
        _ => Err(invalid(path)),
    }
}

/// Lean: `Loops.parseBound`, model/Loops/Spec.lean.
/// Parses a safe-whole payload integer or time claim as an order bound.
///
/// # Errors
/// Returns where-invalid at path for a bound outside this field's domain.
pub fn parse_bound(ty: FieldType, path: &str, value: &Json) -> Result<Arg, Refusal> {
    match value {
        Json::Int(_) if ty == FieldType::Payload => parse_arg(ty, path, value),
        Json::Str(_) if ty == FieldType::Time => parse_arg(ty, path, value),
        _ => Err(invalid(path)),
    }
}

/// Lean: `Loops.parseOp`, model/Loops/Spec.lean.
/// Parses one known operator and keeps the field's original error path.
///
/// # Errors
/// Returns where-invalid at the field path, not the operator path.
pub fn parse_op(ty: FieldType, path: &str, name: &str, value: &Json) -> Result<Op, Refusal> {
    match (name, value) {
        ("is", v) => parse_arg(ty, path, v).map(Op::Is),
        ("not", v) => parse_arg(ty, path, v).map(Op::Not),
        ("present", Json::Bool(true)) => Ok(Op::Present),
        ("absent", Json::Bool(true)) => Ok(Op::Absent),
        ("at-least", v) => parse_bound(ty, path, v).map(Op::AtLeast),
        ("below", v) => parse_bound(ty, path, v).map(Op::Below),
        _ => Err(invalid(path)),
    }
}

/// Lean: `Loops.parseField`, model/Loops/Spec.lean.
/// Parses a field with at least one operator, in written order.
///
/// # Errors
/// Returns where-invalid at path.name on an invalid name, shape or operator.
pub fn parse_field(path: &str, name: &str, ops: &Json) -> Result<(Field, Vec<Op>), Refusal> {
    let p = format!("{path}.{name}");
    let field = Field::of_name(name).ok_or_else(|| invalid(&p))?;
    let Json::Obj(os) = ops else {
        return Err(invalid(&p));
    };
    if os.is_empty() {
        return Err(invalid(&p));
    }
    let parsed = os
        .iter()
        .map(|(n, v)| parse_op(field.field_type(), &p, n, v))
        .collect::<Result<_, _>>()?;
    Ok((field, parsed))
}

/// Lean: `Loops.parseWhere`, model/Loops/Spec.lean.
/// Parses a nonempty where map in written order, without checking duplicate names.
/// The outer spec or selection boundary checks those duplicates.
///
/// # Errors
/// Returns the first where-invalid in written order, with its field path.
pub fn parse_where(path: &str, value: &Json) -> Result<Tests, Refusal> {
    let Json::Obj(fs) = value else {
        return Err(invalid(path));
    };
    if fs.is_empty() {
        return Err(invalid(path));
    }
    fs.iter()
        .map(|(n, v)| parse_field(path, n, v))
        .collect::<Result<_, _>>()
        .map(Tests)
}
