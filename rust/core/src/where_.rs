//! Closed selection tests and their parser from model/Loops/Spec.lean.
use crate::{
    envelope::{record_id, typed_ref},
    families::Tri,
    json::Json,
    occurred::{Claim, Span},
    record::{Record, Shown, Val, id_text},
};
use std::fmt;

/// `EnvField` (model/Loops/Spec.lean): fields available to every reader.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnvField {
    /// EnvField.kind (model/Loops/Spec.lean).
    Kind,
    /// EnvField.observer (model/Loops/Spec.lean).
    Observer,
    /// EnvField.about (model/Loops/Spec.lean).
    About,
    /// EnvField.prev (model/Loops/Spec.lean).
    Prev,
    /// EnvField.under (model/Loops/Spec.lean).
    Under,
    /// EnvField.erases (model/Loops/Spec.lean).
    Erases,
    /// EnvField.emitted (model/Loops/Spec.lean).
    Emitted,
    /// EnvField.occurred (model/Loops/Spec.lean).
    Occurred,
}
impl EnvField {
    /// EnvField.all (model/Loops/Spec.lean), in declared order.
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

    /// EnvField.name (model/Loops/Spec.lean).
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
    /// EnvField.type (model/Loops/Spec.lean).
    pub fn field_type(self) -> FieldType {
        match self {
            Self::Kind => FieldType::Text,
            Self::Observer | Self::About => FieldType::Refs,
            Self::Prev | Self::Under | Self::Erases => FieldType::Ids,
            Self::Emitted | Self::Occurred => FieldType::Time,
        }
    }
}

/// `FieldType` (model/Loops/Spec.lean): the argument domain, not a coercion rule.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FieldType {
    /// FieldType.text (model/Loops/Spec.lean).
    Text,
    /// FieldType.refs (model/Loops/Spec.lean).
    Refs,
    /// FieldType.ids (model/Loops/Spec.lean).
    Ids,
    /// FieldType.time (model/Loops/Spec.lean).
    Time,
    /// FieldType.payload (model/Loops/Spec.lean).
    Payload,
}

/// Field (model/Loops/Spec.lean).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Field {
    /// Field.env (model/Loops/Spec.lean).
    Env(EnvField),
    /// Field.payload (model/Loops/Spec.lean).
    Payload(String),
}
impl Field {
    /// Field.ofName (model/Loops/Spec.lean): unknown env names never become payload fields.
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
    /// Field.name (model/Loops/Spec.lean).
    pub fn name(&self) -> String {
        match self {
            Self::Env(f) => format!("env.{}", f.name()),
            Self::Payload(n) => n.clone(),
        }
    }
    /// Field.onEnvelope (model/Loops/Spec.lean).
    pub fn on_envelope(&self) -> bool {
        matches!(self, Self::Env(_))
    }
    /// Field.type (model/Loops/Spec.lean).
    pub fn field_type(&self) -> FieldType {
        match self {
            Self::Env(f) => f.field_type(),
            Self::Payload(_) => FieldType::Payload,
        }
    }
    /// Field.read (model/Loops/Spec.lean): None is unknown, Some(empty) is known absent.
    pub fn read(&self, r: &Record) -> Option<Vec<Item>> {
        let text = |s: &str| Item::Val(Val::Str(s.into()));
        let ids = |ns: &[crate::number::Nat]| ns.iter().map(|n| text(&id_text(n))).collect();
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

/// Item (model/Loops/Spec.lean): a value read, or a time span without its spelling.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Item {
    /// Item.val (model/Loops/Spec.lean).
    Val(Val),
    /// Item.time (model/Loops/Spec.lean).
    Time(Span),
}
impl Item {
    /// Item.atLeast (model/Loops/Spec.lean): numeric value or time START.
    pub fn at_least(&self, bound: &Arg) -> bool {
        match (bound, self) {
            (Arg::Val(Val::Int(i)), Self::Val(Val::Int(j))) => i <= j,
            (Arg::Time(c), Self::Time(s)) => c.span().start() <= s.start(),
            _ => false,
        }
    }
    /// Item.below (model/Loops/Spec.lean): numeric value or time START.
    pub fn below(&self, bound: &Arg) -> bool {
        match (bound, self) {
            (Arg::Val(Val::Int(i)), Self::Val(Val::Int(j))) => j < i,
            (Arg::Time(c), Self::Time(s)) => s.start() < c.span().start(),
            _ => false,
        }
    }
}

/// Arg (model/Loops/Spec.lean): retains a time's written claim as well as its span.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Arg {
    /// Arg.val (model/Loops/Spec.lean).
    Val(Val),
    /// Arg.time (model/Loops/Spec.lean).
    Time(Claim),
}
impl Arg {
    /// Arg.matches (model/Loops/Spec.lean): time equality compares whole spans.
    pub fn matches(&self, item: &Item) -> bool {
        match (self, item) {
            (Self::Val(v), Item::Val(w)) => v == w,
            (Self::Time(c), Item::Time(s)) => c.span() == s,
            _ => false,
        }
    }
}

/// Op (model/Loops/Spec.lean): the closed test vocabulary.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Op {
    /// Op.is (model/Loops/Spec.lean).
    Is(Arg),
    /// Op.not (model/Loops/Spec.lean).
    Not(Arg),
    /// Op.present (model/Loops/Spec.lean).
    Present,
    /// Op.absent (model/Loops/Spec.lean).
    Absent,
    /// Op.atLeast (model/Loops/Spec.lean).
    AtLeast(Arg),
    /// Op.below (model/Loops/Spec.lean).
    Below(Arg),
}
impl Op {
    /// Op.test (model/Loops/Spec.lean): not and absent are complements even on empty lists.
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

/// Cond (model/Loops/Spec.lean).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Cond {
    /// Cond.field (model/Loops/Spec.lean).
    pub field: Field,
    /// Cond.op (model/Loops/Spec.lean).
    pub op: Op,
}
impl Cond {
    /// Cond.eval (model/Loops/Spec.lean).
    pub fn eval(&self, r: &Record) -> Tri {
        self.field
            .read(r)
            .map_or(Tri::Unknown, |items| Tri::of_bool(self.op.test(&items)))
    }
    /// Cond.all (model/Loops/Spec.lean): conjunction, with Yes for no conditions.
    pub fn all(cs: &[Self], r: &Record) -> Tri {
        cs.iter().rfold(Tri::Yes, |t, c| c.eval(r).and(t))
    }
}

/// Tests and Tests.conds (model/Loops/Spec.lean): written field/operator order, including repeats.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Tests(pub Vec<(Field, Vec<Op>)>);
impl Tests {
    /// Tests.conds (model/Loops/Spec.lean): flatten without reordering.
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

/// Refusal.code (model/Loops/Spec.lean), the implemented where-parser subset.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[non_exhaustive]
pub enum RefusalCode {
    /// parseWhere's where-invalid (model/Loops/Spec.lean).
    WhereInvalid,
}
impl RefusalCode {
    /// Refusal.code (model/Loops/Spec.lean): exact wire spelling.
    pub fn code(self) -> &'static str {
        match self {
            Self::WhereInvalid => "where-invalid",
        }
    }
}
impl fmt::Display for RefusalCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code())
    }
}

/// Refusal (model/Loops/Spec.lean): typed code and original field path.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Refusal {
    /// Refusal.code (model/Loops/Spec.lean).
    pub code: RefusalCode,
    /// Refusal.path (model/Loops/Spec.lean).
    pub path: String,
}
impl Refusal {
    /// Refusal.code (model/Loops/Spec.lean): exact wire spelling.
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

/// parseArg (model/Loops/Spec.lean): validate against the field's exact domain.
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
        Json::Int(i) if ty == FieldType::Payload => Ok(Arg::Val(Val::Int(i.clone()))),
        Json::Bool(b) if ty == FieldType::Payload => Ok(Arg::Val(Val::Bool(*b))),
        _ => Err(invalid(path)),
    }
}

/// parseBound (model/Loops/Spec.lean): only payload integers or times.
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

/// parseOp (model/Loops/Spec.lean): validate one operator without changing error paths.
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

/// parseField (model/Loops/Spec.lean): at least one operator, in written order.
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

/// parseWhere (model/Loops/Spec.lean): nonempty map; duplicate checks belong to the outer boundary.
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
