import Loops.Things
import Loops.Json
import Loops.Envelope

/-!
# The spec, as data

A vertex's spec is JSON, parsed into a closed type: `from` chooses records
by what their envelopes carry, and `fold` names slots, each one fold from
the closed vocabulary with an optional `where`.

* **`where`** has six operators: `is`, `not`, `present`, `absent`,
  `at-least`, `below`. `env.<field>` names an envelope field, and a test on
  one always answers; any other name is a payload field, and a test on it
  answers unknown when the payload is missing. A `where` map holds when
  every test does (Kleene's and).
* **Times** (`env.emitted`, `env.occurred`) are tested by what they read as:
  `is` asks for the same span, however it is spelled, and `at-least` and
  `below` compare starts. A record without `occurred` passes neither.
* **Accumulating slots** (count, sum, min, max) select, then fold.
* **Slots over heads** (latest-by, collect) read each thing's state, which
  supersession has already settled over everything the reader holds
  (`Loops.Things`); `from` and the envelope tests then choose heads, and the
  payload tests filter them. Selecting first would bring back a record whose
  successor is of another kind, or no longer matches, or is withheld.
* **`from` chooses by thing.** `"about": "t"` takes the records about `t`,
  so `"about": "r:X"` takes X, the record about nothing that anchors it, as
  well as its revisions. `env.about` tests the field as written, which holds
  nothing on that record.
* `about`, `prev`, `under` and `erases` are sets, so a test on one asks
  whether it holds a value, and `present` whether it holds any.
* **Arguments** must be what layer 0 would accept in their field, since
  nothing else can match; a payload field takes text, a number or a boolean.
* **The spec is explicit.** No key repeats; no name, field or kind is
  empty; a `from` entry that writes `kind` names at least one, a `where`
  names at least one field, and latest-by writes `"follow": "prev"`;
  collect without it takes every selected record, superseded or not.

`protocol/spec.md` is the grammar this parser implements.

Step 2 accepts these keys. `ticks`, `boundary` and the other spec keys are
recognized and carried, not yet evaluated; `as`, `by`, `order`, `set` and
`weight-by` arrive with the steps that need them.
-/

namespace Loops

/-! ## `where` -/

/-- An envelope field, named in `where` as `env.<name>`. -/
inductive EnvField where
  | kind
  | observer
  | about
  | prev
  | under
  | erases
  | emitted
  | occurred
  deriving Repr, DecidableEq

def EnvField.all : List EnvField := [.kind, .observer, .about, .prev, .under, .erases, .emitted, .occurred]

def EnvField.name : EnvField → String
  | .kind => "kind"
  | .observer => "observer"
  | .about => "about"
  | .prev => "prev"
  | .under => "under"
  | .erases => "erases"
  | .emitted => "emitted"
  | .occurred => "occurred"

/-- What a field holds, which decides what a test on it may compare against:
only what layer 0 would accept in that field, since nothing else can match. -/
inductive FieldType where
  /-- Text that isn't empty: `kind`. -/
  | text
  /-- Typed references, `prefix:value`: `observer`, `about`. -/
  | refs
  /-- Record ids: `prev`, `under`, `erases`. -/
  | ids
  /-- Times: `emitted`, `occurred`. -/
  | time
  /-- A payload field: text, a number or a boolean. -/
  | payload
  deriving Repr, DecidableEq

def EnvField.type : EnvField → FieldType
  | .kind => .text
  | .observer | .about => .refs
  | .prev | .under | .erases => .ids
  | .emitted | .occurred => .time

/-- Where a field lives: on the envelope, or in the payload. -/
inductive Field where
  | env (f : EnvField)
  | payload (name : String)
  deriving Repr, DecidableEq

def envPrefix : String := "env."

/-- A field by its name in `where`; `none` for the empty name, `env.` and a
name the envelope doesn't have. -/
def Field.ofName (s : String) : Option Field :=
  if s.isEmpty then none
  else if envPrefix.isPrefixOf s then (EnvField.all.find? (envPrefix ++ ·.name == s)).map .env
  else some (.payload s)

def Field.name : Field → String
  | .env f => envPrefix ++ f.name
  | .payload s => s

def Field.onEnvelope : Field → Bool
  | .env _ => true
  | .payload _ => false

def Field.type : Field → FieldType
  | .env f => f.type
  | .payload _ => .payload

/-- One thing a field holds, as a test reads it: a value, or a time as its span. -/
inductive Item where
  | val (v : Val)
  | time (s : Span)
  deriving Repr, DecidableEq

/-- What a test compares against: a value, or a time as written with the span it reads as. -/
inductive Arg where
  | val (v : Val)
  | time (c : Claim)
  deriving Repr, DecidableEq

/-- The closed set of operators. `at-least` and `below` take a number or a time. -/
inductive Op where
  | is (a : Arg)
  | not (a : Arg)
  | present
  | absent
  | atLeast (a : Arg)
  | below (a : Arg)
  deriving Repr, DecidableEq

structure Cond where
  field : Field
  op : Op
  deriving Repr, DecidableEq

/-- The items a field holds for this reader (none, one, or a set, as for
`about`), or `none` when its payload is missing. Ids read as their text, which
has one spelling per id; times read as spans, `emitted` as an instant. -/
def Field.read : Field → Record → Option (List Item)
  | .env .kind, r => some [.val (.str r.kind)]
  | .env .observer, r => some [.val (.str r.observer)]
  | .env .about, r => some (r.about.map (.val ∘ .str))
  | .env .prev, r => some (r.prev.map (.val ∘ .str ∘ idText))
  | .env .under, r => some (r.under.toList.map (.val ∘ .str ∘ idText))
  | .env .erases, r => some (r.erases.map (.val ∘ .str ∘ idText))
  | .env .emitted, r => some [.time (Span.point r.emitted.moment)]
  | .env .occurred, r => some (r.occurred.toList.map (.time ∘ (·.span)))
  | .payload f, r => if r.shown = .here then some ((r.get f).toList.map .val) else none

/-- Whether an item is what the argument names: the same value, or the same span. -/
def Arg.matches : Arg → Item → Bool
  | .val v, .val w => v == w
  | .time c, .time s => c.span == s
  | _, _ => false

/-- Whether an item is at least the bound: numbers by value, times by start. -/
def Item.atLeast : Arg → Item → Bool
  | .val (.int i), .val (.int j) => decide (i ≤ j)
  | .time c, .time s => decide (c.span.start ≤ s.start)
  | _, _ => false

/-- Whether an item is below the bound: numbers by value, times by start. -/
def Item.below : Arg → Item → Bool
  | .val (.int i), .val (.int j) => decide (j < i)
  | .time c, .time s => decide (s.start < c.span.start)
  | _, _ => false

/-- An operator on what a field holds. `is` asks whether an item is the
argument and `not` is its complement; `absent` is the complement of
`present`; `at-least` and `below` compare numbers with numbers and times with
times, and hold for nothing else. -/
def Op.test : Op → List Item → Bool
  | .is a, xs => xs.any a.matches
  | .not a, xs => !xs.any a.matches
  | .present, xs => !xs.isEmpty
  | .absent, xs => xs.isEmpty
  | .atLeast a, xs => xs.any (Item.atLeast a)
  | .below a, xs => xs.any (Item.below a)

def Cond.eval (c : Cond) (r : Record) : Tri :=
  match c.field.read r with
  | some x => .ofBool (c.op.test x)
  | none => .unknown

/-- Kleene's and: no wins, then unknown. -/
def Tri.and : Tri → Tri → Tri
  | .no, _ => .no
  | _, .no => .no
  | .unknown, _ => .unknown
  | _, .unknown => .unknown
  | .yes, .yes => .yes

/-- A `where` map holds when every test does. -/
def Cond.all (cs : List Cond) (r : Record) : Tri :=
  cs.foldr (fun c t => (c.eval r).and t) .yes

/-! ## Slots -/

/-- A fold type from the closed vocabulary. -/
inductive FoldType where
  | count
  | sum (field : String)
  | min (field : String)
  | max (field : String)
  /-- Per thing, following `prev`; Latest is a thing's newest head. -/
  | latestBy
  /-- Every selected record newest first, or only the heads when following
  `prev`; at most `limit` of them. -/
  | collect (follow : Bool) (limit : Option Nat)
  deriving Repr, DecidableEq

/-- A `where` map as written: each field with its tests. -/
abbrev Tests := List (Field × List Op)

def Tests.conds (ts : Tests) : List Cond := ts.flatMap fun (f, os) => os.map (Cond.mk f)

structure Slot where
  name : String
  type : FoldType
  tests : Tests := []
  deriving Repr, DecidableEq

/-- What a slot holds. Heads carry what the reader holds of each. -/
inductive SlotValue where
  | nat (r : Result Nat)
  | int (r : Result Int)
  | opt (r : Result (Option Int))
  /-- Latest-by: each thing with its current records (more than one is a fork). -/
  | things (ts : List (String × List (Nat × Shown))) (unread : Nat)
  /-- Collect: records newest first. -/
  | heads (hs : List (Nat × Shown)) (unread : Nat)
  deriving Repr, DecidableEq

def Record.unlinked (r : Record) : Record := { r with prev := [] }

/-- Newest first, each once. -/
def newestFirst (xs : List Record) : List Record :=
  (LatestBy.fold .empty (xs.map Record.unlinked)).heads

def limitTo {α : Type} : Option Nat → List α → List α
  | some k, xs => xs.take k
  | none, xs => xs

def shownIds (hs : List Record) : List (Nat × Shown) := hs.map fun h => (h.id, h.shown)

/-- A head the slot asks about: `from` takes it and its envelope tests hold. -/
def chosen (sel : Record → Bool) (cs : List Cond) (h : Record) : Bool :=
  sel h && Cond.all (cs.filter (·.field.onEnvelope)) h == .yes

def payTest (cs : List Cond) (h : Record) : Tri := Cond.all (cs.filter (!·.field.onEnvelope)) h

/-- Latest-by: each thing's current records, as `perThing` settled them, that
the slot chooses and whose payload tests hold. -/
def latestOf (sel : Record → Bool) (cs : List Cond) (xs : List Record) : SlotValue :=
  let per := (perThing xs).map fun (t, s) => (t, s.heads.filter (chosen sel cs))
  let kept := per.filterMap fun (t, hs) =>
    match hs.filter (payTest cs · == .yes) with
    | [] => none
    | ks => some (t, shownIds ks)
  let unknown := per.flatMap fun (_, hs) => hs.filter (payTest cs · == .unknown)
  .things kept (idsOf unknown).length

/-- Collect: every chosen record, or with `follow` every current one, newest
first. -/
def collectOf (sel : Record → Bool) (cs : List Cond) (follow : Bool) (limit : Option Nat)
    (xs : List Record) : SlotValue :=
  let pool := if follow then (perThing xs).flatMap (·.2.heads) else xs
  let hs := newestFirst (pool.filter (chosen sel cs))
  .heads (shownIds (limitTo limit (hs.filter (payTest cs · == .yes))))
    (hs.filter (payTest cs · == .unknown)).length

/-- Accumulating slots select with `from` and `where`, then fold. -/
def Slot.run (s : Slot) (sel : Record → Bool) (xs : List Record) : SlotValue :=
  let cs := s.tests.conds
  let ev := fun r => if sel r then Cond.all cs r else Tri.no
  match s.type with
  | .count => .nat (Count.acc.select ev xs)
  | .sum f => .int ((Sum.on f).select ev xs)
  | .min f => .opt ((Min.on f).select ev xs)
  | .max f => .opt ((Max.on f).select ev xs)
  | .latestBy => latestOf sel cs xs
  | .collect follow limit => collectOf sel cs follow limit xs

/-! ## The spec -/

/-- One entry of `from`. The store is resolved by the realm; the model folds
the records the named stores hold. -/
structure Source where
  store : String
  kinds : List String := []
  about : Option String := none
  deriving Repr, DecidableEq

structure Spec where
  vertex : String
  sources : List Source := []
  slots : List Slot := []
  deriving Repr, DecidableEq

/-- Selection reads only the envelope: the kind, and the thing, which for a
record about nothing is its own id. -/
def Source.takes (s : Source) (r : Record) : Bool :=
  (s.kinds.isEmpty || s.kinds.contains r.kind) && s.about.all r.isAbout

def Spec.takes (sp : Spec) (r : Record) : Bool := sp.sources.any (·.takes r)

def Spec.select (sp : Spec) (xs : List Record) : List Record := xs.filter sp.takes

/-- Run a spec over the records a reader holds (one per id, as `settle` gives
them). Records not entitled to their `prev` are refused first; `may` is the
store's rule for who may replace whom. -/
def Spec.run (sp : Spec) (xs : List Record) (may : Record → Record → Bool := fun _ _ => true) :
    List (String × SlotValue) :=
  let ys := admit may xs
  sp.slots.map fun s => (s.name, s.run sp.takes ys)

/-! ## From JSON -/

/-- Why a spec is refused, and where. -/
structure Refusal where
  code : String
  path : String
  deriving Repr, DecidableEq

abbrev Parse := Except Refusal

def refuse {α : Type} (code path : String) : Parse α := throw ⟨code, path⟩

/-- What a test on a field of this type may compare against, by layer 0's
own checks: text that isn't empty for `kind`, a typed reference for
`observer` and `about`, a record id for ids, a time in `occurred`'s grammar
for times; text, a number or a boolean for a payload field. -/
def parseArg (ty : FieldType) (path : String) : Json → Parse Arg
  | .str s => match ty with
    | .payload => pure (.val (.str s))
    | .text => if s.isEmpty then refuse "where-invalid" path else pure (.val (.str s))
    | .refs => if typedRef s then pure (.val (.str s)) else refuse "where-invalid" path
    | .ids => if recordId s then pure (.val (.str s)) else refuse "where-invalid" path
    | .time => match Claim.of? s with
      | some c => pure (.time c)
      | none => refuse "where-invalid" path
  | .int i => if ty = .payload then pure (.val (.int i)) else refuse "where-invalid" path
  | .bool b => if ty = .payload then pure (.val (.bool b)) else refuse "where-invalid" path
  | _ => refuse "where-invalid" path

/-- A bound for `at-least` or `below`: a number on a payload field, a time on a time. -/
def parseBound (ty : FieldType) (path : String) : Json → Parse Arg
  | .int i => if ty = .payload then pure (.val (.int i)) else refuse "where-invalid" path
  | .str s => if ty = .time then parseArg ty path (.str s) else refuse "where-invalid" path
  | _ => refuse "where-invalid" path

def parseOp (ty : FieldType) (path : String) : String × Json → Parse Op
  | ("is", v) => .is <$> parseArg ty path v
  | ("not", v) => .not <$> parseArg ty path v
  | ("present", .bool true) => pure .present
  | ("absent", .bool true) => pure .absent
  | ("at-least", v) => .atLeast <$> parseBound ty path v
  | ("below", v) => .below <$> parseBound ty path v
  | _ => refuse "where-invalid" path

/-- Spec paths: a member's key after its object's path, joined by `.`; a
member of the spec itself is its key alone. -/
def memberPath : Option String → String → String
  | none, k => k
  | some p, k => s!"{p}.{k}"

/-- One field of a `where` map, with at least one test. -/
def parseField (path : String) : String × Json → Parse (Field × List Op)
  | (name, ops) => do
    let p := memberPath (some path) name
    let field ← match Field.ofName name with
      | some f => pure f
      | none => refuse "where-invalid" p
    match ops with
    | .obj [] => refuse "where-invalid" p
    | .obj os => do pure (field, ← os.mapM (parseOp field.type p))
    | _ => refuse "where-invalid" p

/-- A `where` map: at least one field, in the order written. -/
def parseWhere (path : String) : Json → Parse Tests
  | .obj [] => refuse "where-invalid" path
  | .obj fs => fs.mapM (parseField path)
  | _ => refuse "where-invalid" path

def foldTypes : List String := ["count", "sum", "min", "max", "latest-by", "collect"]
def slotKeys : List String := foldTypes ++ ["where", "follow", "limit", "note"]
def sourceKeys : List String := ["store", "kind", "about"]
def specKeys : List String :=
  ["vertex", "note", "from", "fold", "ticks", "order", "resolve", "window", "boundary",
    "param", "covers", "into", "bundle"]

def checkKeys (allowed : List String) (path : Option String) (kvs : List (String × Json)) :
    Parse Unit :=
  match kvs.find? (!allowed.contains ·.1) with
  | some (k, _) => refuse "unknown-key" (memberPath path k)
  | none => pure ()

/-- The payload field a numeric fold reads: a name that isn't empty. -/
def fieldArg (path : String) : Json → Parse String
  | .str f => if f.isEmpty then refuse "fold-argument" path else pure f
  | _ => refuse "fold-argument" path

/-- A slot names exactly one fold type. -/
def slotType (path : String) (kvs : List (String × Json)) : Parse (String × Json) :=
  match kvs.filter (foldTypes.contains ·.1) with
  | [p] => pure p
  | _ => refuse "fold-type" path

/-- `follow`: `"prev"`, on collect or latest-by, and always written on latest-by. -/
def slotFollow (path t : String) : Option Json → Parse Bool
  | none => if t = "latest-by" then refuse "follow-missing" s!"{path}.follow" else pure false
  | some (.str "prev") =>
    if t = "collect" || t = "latest-by" then pure true
    else refuse "follow-invalid" s!"{path}.follow"
  | some _ => refuse "follow-invalid" s!"{path}.follow"

/-- `limit`: a positive whole number, on collect only. -/
def slotLimit (path t : String) : Option Json → Parse (Option Nat)
  | none => pure none
  | some (.int i) =>
    if t = "collect" && i > 0 then pure (some i.toNat)
    else refuse "limit-invalid" s!"{path}.limit"
  | some _ => refuse "limit-invalid" s!"{path}.limit"

/-- The fold type with its argument. -/
def foldType (path t : String) (follow : Bool) (limit : Option Nat) (arg : Json) : Parse FoldType :=
  let p := s!"{path}.{t}"
  match t, arg with
  | "count", .bool true => pure .count
  | "sum", f => FoldType.sum <$> fieldArg p f
  | "min", f => FoldType.min <$> fieldArg p f
  | "max", f => FoldType.max <$> fieldArg p f
  | "latest-by", .str "about" => pure .latestBy
  | "collect", .bool true => pure (.collect follow limit)
  | _, _ => refuse "fold-argument" p

def slotTests (path : String) : Option Json → Parse Tests
  | none => pure []
  | some w => parseWhere s!"{path}.where" w

/-- A slot: checked in order, its name, keys, one fold type, `follow`,
`limit`, the fold type's argument, then `where`. -/
def parseSlot (name : String) (j : Json) : Parse Slot :=
  let path := memberPath (some "fold") name
  if name.isEmpty then refuse "fold-invalid" path else
  match j with
  | .obj kvs => do
    checkKeys slotKeys (some path) kvs
    let (t, arg) ← slotType path kvs
    let follow ← slotFollow path t (kvs.lookup "follow")
    let limit ← slotLimit path t (kvs.lookup "limit")
    let type ← foldType path t follow limit arg
    let tests ← slotTests path (kvs.lookup "where")
    pure ⟨name, type, tests⟩
  | _ => refuse "fold-invalid" path

/-- Kinds `from` takes: at least one, each text that isn't empty, as layer 0
requires of `kind`. -/
def parseKinds (path : String) : Json → Parse (List String)
  | .arr [] => refuse "from-invalid" path
  | .arr ks => ks.mapM fun
    | .str k => if k.isEmpty then refuse "from-invalid" path else pure k
    | _ => refuse "from-invalid" path
  | _ => refuse "from-invalid" path

def sourceStore : Option Json → Parse String
  | some (.str s) => if s.isEmpty then refuse "from-invalid" "from.store" else pure s
  | _ => refuse "from-invalid" "from.store"

def sourceKinds : Option Json → Parse (List String)
  | none => pure []
  | some j => parseKinds "from.kind" j

def sourceAbout : Option Json → Parse (Option String)
  | none => pure none
  | some (.str a) => if typedRef a then pure (some a) else refuse "from-invalid" "from.about"
  | some _ => refuse "from-invalid" "from.about"

/-- One entry of `from`: checked in a fixed order, keys, `store`, `kind`,
then `about`, however it is written. -/
def parseSource : Json → Parse Source
  | .obj kvs => do
    checkKeys sourceKeys (some "from") kvs
    let store ← sourceStore (kvs.lookup "store")
    let kinds ← sourceKinds (kvs.lookup "kind")
    let about ← sourceAbout (kvs.lookup "about")
    pure ⟨store, kinds, about⟩
  | _ => refuse "from-invalid" "from"

mutual
/-- Where a key first repeats in its object, depth first in member order:
the repeat's path. Array elements share their array's path, as spec paths
have no indexes. -/
def Json.repeatAt (path : Option String) : Json → Option String
  | .arr xs => Json.repeatIn path xs
  | .obj kvs => Json.repeatMember path [] kvs
  | _ => none

def Json.repeatIn (path : Option String) : List Json → Option String
  | [] => none
  | x :: xs => (x.repeatAt path).orElse fun _ => Json.repeatIn path xs

def Json.repeatMember (path : Option String) (seen : List String) :
    List (String × Json) → Option String
  | [] => none
  | (k, v) :: kvs =>
    if seen.contains k then some (memberPath path k)
    else (v.repeatAt (some (memberPath path k))).orElse fun _ => Json.repeatMember path (k :: seen) kvs
end

def specVertex : Option Json → Parse String
  | none => refuse "vertex-missing" "vertex"
  | some (.str v) => if v.isEmpty then refuse "vertex-invalid" "vertex" else pure v
  | some _ => refuse "vertex-invalid" "vertex"

def specSources : Option Json → Parse (List Source)
  | none | some (.arr []) => refuse "from-missing" "from"
  | some (.arr xs) => xs.mapM parseSource
  | some _ => refuse "from-invalid" "from"

def specSlots : Option Json → Parse (List Slot)
  | none => pure []
  | some (.obj fs) => fs.mapM fun p => parseSlot p.1 p.2
  | some _ => refuse "fold-invalid" "fold"

/-- A spec whose keys are distinct. -/
def Spec.ofObject : Json → Parse Spec
  | .obj kvs => do
    checkKeys specKeys none kvs
    let vertex ← specVertex (kvs.lookup "vertex")
    let sources ← specSources (kvs.lookup "from")
    let slots ← specSlots (kvs.lookup "fold")
    pure ⟨vertex, sources, slots⟩
  | _ => refuse "spec-not-object" ""

/-- Parse a spec. Checked in order: no key repeats in any object
(`member-duplicate`, layer 0's rule, at the first repeat), an object, known
keys, `vertex`, `from`, then each slot of `fold`. A spec reads at least one
source: one with no `from`, or an empty one, is refused (`from-missing`),
never run empty. -/
def Spec.ofJson (j : Json) : Parse Spec :=
  if !j.keysDistinct then refuse "member-duplicate" ((j.repeatAt none).getD "") else Spec.ofObject j

/-! ## Back to JSON: the parsed form, as the vectors show it -/

def Val.toJson : Val → Json
  | .str s => .str s
  | .int i => .int i
  | .bool b => .bool b

/-- An argument as written: a time keeps its spelling. -/
def Arg.toJson : Arg → Json
  | .val v => v.toJson
  | .time c => .str c.text

def Op.toJson : Op → String × Json
  | .is a => ("is", a.toJson)
  | .not a => ("not", a.toJson)
  | .present => ("present", .bool true)
  | .absent => ("absent", .bool true)
  | .atLeast a => ("at-least", a.toJson)
  | .below a => ("below", a.toJson)

/-- A `where` map as written. -/
def Tests.toJson (ts : Tests) : Json := .obj (ts.map fun (f, os) => (f.name, .obj (os.map Op.toJson)))

def Slot.toJson (s : Slot) : String × Json :=
  let type : List (String × Json) := match s.type with
    | .count => [("count", .bool true)]
    | .sum f => [("sum", .str f)]
    | .min f => [("min", .str f)]
    | .max f => [("max", .str f)]
    | .latestBy => [("latest-by", .str "about"), ("follow", .str "prev")]
    | .collect follow limit =>
      [("collect", .bool true)] ++ (if follow then [("follow", .str "prev")] else []) ++
        (match limit with
          | some k => [("limit", .int k)]
          | none => [])
  (s.name, .obj (type ++ if s.tests.isEmpty then [] else [("where", s.tests.toJson)]))

def Source.toJson (s : Source) : Json :=
  .obj ([("store", .str s.store)] ++
    (if s.kinds.isEmpty then [] else [("kind", .arr (s.kinds.map .str))]) ++
    (match s.about with
      | some a => [("about", .str a)]
      | none => []))

def Spec.toJson (sp : Spec) : Json :=
  .obj [("vertex", .str sp.vertex), ("from", .arr (sp.sources.map Source.toJson)),
    ("fold", .obj (sp.slots.map Slot.toJson))]

end Loops
