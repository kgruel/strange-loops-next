import Loops.Things
import Loops.Json

/-!
# The spec, as data

A vertex's spec is JSON, parsed into a closed type: `from` chooses records
by what their envelopes carry, and `fold` names slots, each one fold from
the closed vocabulary with an optional `where`.

* **`where`** has six operators: `is`, `not`, `present`, `absent`,
  `at-least`, `below`. A test on `kind` or `about` reads the envelope and
  always answers; a test on a payload field answers unknown when the payload
  is missing. A `where` map holds when every test does (Kleene's and).
* **Accumulating slots** (count, sum, min, max) select, then fold.
* **Slots over heads** (latest-by, collect) read each thing's state, which
  supersession has already settled over everything the reader holds
  (`Loops.Things`); `from` and the envelope tests then choose heads, and the
  payload tests filter them. Selecting first would bring back a record whose
  successor is of another kind, or no longer matches, or is withheld.
* `about` is a set, so a test on it asks whether the record is about a thing.

Step 2 accepts these keys. `ticks`, `boundary` and the other spec keys are
recognized and carried, not yet evaluated; `as`, `by`, `order`, `set` and
`weight-by` arrive with the steps that need them.
-/

namespace Loops

/-! ## `where` -/

/-- Where a field lives. `kind` and `about` are on the envelope; any other
name is a payload field. -/
inductive Field where
  | kind
  | about
  | payload (name : String)
  deriving Repr, DecidableEq

def Field.ofName (s : String) : Field :=
  if s = "kind" then .kind else if s = "about" then .about else .payload s

def Field.name : Field → String
  | .kind => "kind"
  | .about => "about"
  | .payload s => s

def Field.onEnvelope : Field → Bool
  | .payload _ => false
  | _ => true

/-- The closed set of operators. -/
inductive Op where
  | is (v : Val)
  | not (v : Val)
  | present
  | absent
  | atLeast (i : Int)
  | below (i : Int)
  deriving Repr, DecidableEq

structure Cond where
  field : Field
  op : Op
  deriving Repr, DecidableEq

/-- The values a field holds for this reader (none, one, or a set, as for
`about`), or `none` when its payload is missing. -/
def Field.read : Field → Record → Option (List Val)
  | .kind, r => some [.str r.kind]
  | .about, r => some (r.about.map .str)
  | .payload f, r => if r.shown = .here then some (r.get f).toList else none

def Val.atLeast (i : Int) : Val → Bool
  | .int j => decide (i ≤ j)
  | _ => false

def Val.below (i : Int) : Val → Bool
  | .int j => decide (j < i)
  | _ => false

/-- An operator on what a field holds. `is` asks whether a value is among
them and `not` is its complement; `absent` is the complement of `present`;
`at-least` and `below` hold only for numbers. -/
def Op.test : Op → List Val → Bool
  | .is v, xs => xs.contains v
  | .not v, xs => !xs.contains v
  | .present, xs => !xs.isEmpty
  | .absent, xs => xs.isEmpty
  | .atLeast i, xs => xs.any (Val.atLeast i)
  | .below i, xs => xs.any (Val.below i)

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

structure Slot where
  name : String
  type : FoldType
  cond : List Cond := []
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
  let ev := fun r => if sel r then Cond.all s.cond r else Tri.no
  match s.type with
  | .count => .nat (Count.acc.select ev xs)
  | .sum f => .int ((Sum.on f).select ev xs)
  | .min f => .opt ((Min.on f).select ev xs)
  | .max f => .opt ((Max.on f).select ev xs)
  | .latestBy => latestOf sel s.cond xs
  | .collect follow limit => collectOf sel s.cond follow limit xs

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

/-- Selection reads only the envelope. -/
def Source.takes (s : Source) (r : Record) : Bool :=
  (s.kinds.isEmpty || s.kinds.contains r.kind) && s.about.all r.about.contains

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

def parseVal (path : String) : Json → Parse Val
  | .str s => pure (.str s)
  | .int i => pure (.int i)
  | .bool b => pure (.bool b)
  | _ => refuse "where-invalid" path

def parseOp (path : String) : String × Json → Parse Op
  | ("is", v) => .is <$> parseVal path v
  | ("not", v) => .not <$> parseVal path v
  | ("present", .bool true) => pure .present
  | ("absent", .bool true) => pure .absent
  | ("at-least", .int i) => pure (.atLeast i)
  | ("below", .int i) => pure (.below i)
  | _ => refuse "where-invalid" path

def parseWhere (path : String) : Json → Parse (List Cond)
  | .obj fs => do
    let css ← fs.mapM fun (name, ops) =>
      let p := s!"{path}.{name}"
      match ops with
      | .obj [] => refuse "where-invalid" p
      | .obj os => os.mapM fun o => do pure ⟨Field.ofName name, ← parseOp p o⟩
      | _ => refuse "where-invalid" p
    pure css.flatten
  | _ => refuse "where-invalid" path

def foldTypes : List String := ["count", "sum", "min", "max", "latest-by", "collect"]
def slotKeys : List String := foldTypes ++ ["where", "follow", "limit", "note"]
def sourceKeys : List String := ["store", "kind", "about"]
def specKeys : List String :=
  ["vertex", "note", "from", "fold", "ticks", "order", "resolve", "window", "boundary",
    "param", "covers", "into", "bundle"]

def checkKeys (allowed : List String) (path : String) (kvs : List (String × Json)) :
    Parse Unit :=
  match kvs.find? (!allowed.contains ·.1) with
  | some (k, _) => refuse "unknown-key" (if path = "" then k else s!"{path}.{k}")
  | none => pure ()

def parseSlot (name : String) : Json → Parse Slot
  | .obj kvs => do
    let path := s!"fold.{name}"
    checkKeys slotKeys path kvs
    let (t, arg) ← match kvs.filter (foldTypes.contains ·.1) with
      | [p] => pure p
      | _ => refuse "fold-type" path
    let follow ← match kvs.lookup "follow" with
      | none => pure false
      | some (.str "prev") =>
        if t = "collect" || t = "latest-by" then pure true
        else refuse "follow-invalid" s!"{path}.follow"
      | some _ => refuse "follow-invalid" s!"{path}.follow"
    let limit ← match kvs.lookup "limit" with
      | none => pure none
      | some (.int i) =>
        if t = "collect" && i > 0 then pure (some i.toNat)
        else refuse "limit-invalid" s!"{path}.limit"
      | some _ => refuse "limit-invalid" s!"{path}.limit"
    let type ← match t, arg with
      | "count", .bool true => pure FoldType.count
      | "sum", .str f => pure (.sum f)
      | "min", .str f => pure (.min f)
      | "max", .str f => pure (.max f)
      | "latest-by", .str "about" => pure .latestBy
      | "collect", .bool true => pure (.collect follow limit)
      | _, _ => refuse "fold-argument" s!"{path}.{t}"
    let cond ← match kvs.lookup "where" with
      | none => pure []
      | some w => parseWhere s!"{path}.where" w
    pure ⟨name, type, cond⟩
  | _ => refuse "fold-invalid" s!"fold.{name}"

def parseKinds (path : String) : Json → Parse (List String)
  | .arr ks => ks.mapM fun
    | .str k => pure k
    | _ => refuse "from-invalid" path
  | _ => refuse "from-invalid" path

def parseSource : Json → Parse Source
  | .obj kvs => do
    checkKeys sourceKeys "from" kvs
    let store ← match kvs.lookup "store" with
      | some (.str s) => pure s
      | _ => refuse "from-invalid" "from.store"
    let kinds ← match kvs.lookup "kind" with
      | none => pure []
      | some j => parseKinds "from.kind" j
    let about ← match kvs.lookup "about" with
      | none => pure none
      | some (.str a) => pure (some a)
      | some _ => refuse "from-invalid" "from.about"
    pure ⟨store, kinds, about⟩
  | _ => refuse "from-invalid" "from"

/-- Parse a spec. Checked in order: an object, known keys, `vertex`, `from`,
then each slot of `fold`. -/
def Spec.ofJson : Json → Parse Spec
  | .obj kvs => do
    checkKeys specKeys "" kvs
    let vertex ← match kvs.lookup "vertex" with
      | some (.str v) => pure v
      | _ => refuse "vertex-missing" "vertex"
    let sources ← match kvs.lookup "from" with
      | none => pure []
      | some (.arr xs) => xs.mapM parseSource
      | some _ => refuse "from-invalid" "from"
    let slots ← match kvs.lookup "fold" with
      | none => pure []
      | some (.obj fs) => fs.mapM fun (n, j) => parseSlot n j
      | some _ => refuse "fold-invalid" "fold"
    pure ⟨vertex, sources, slots⟩
  | _ => refuse "spec-not-object" ""

/-! ## Back to JSON: the parsed form, as the vectors show it -/

def Val.toJson : Val → Json
  | .str s => .str s
  | .int i => .int i
  | .bool b => .bool b

def Op.toJson : Op → String × Json
  | .is v => ("is", v.toJson)
  | .not v => ("not", v.toJson)
  | .present => ("present", .bool true)
  | .absent => ("absent", .bool true)
  | .atLeast i => ("at-least", .int i)
  | .below i => ("below", .int i)

def condsToJson (cs : List Cond) : Json :=
  let names := cs.foldl (fun ns c => if ns.contains c.field.name then ns else ns ++ [c.field.name]) []
  .obj (names.map fun n => (n, .obj ((cs.filter (·.field.name == n)).map (·.op.toJson))))

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
  (s.name, .obj (type ++ if s.cond.isEmpty then [] else [("where", condsToJson s.cond)]))

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
