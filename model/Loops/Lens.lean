/-!
# Lens: keyed sections

One combinator from the lens contract: a document is a list of sections,
each with an id and an opaque body. The syntax is ours:

```
::: <id>
body lines
:::
```

A body line that starts with `:::` or a backslash gets one more backslash
when rendered, so no body can close or open a section. Text is modelled as
a list of lines; splitting a file into lines is outside the model.
-/

namespace Loops.Lens

abbrev Line := List Char

def fence : Line := [':', ':', ':']

/-- A body line that would look like syntax, or like an escape. -/
def reserved (l : Line) : Bool := l.take 3 == fence || l.head? == some '\\'

def escape (l : Line) : Line := if reserved l then '\\' :: l else l

def unescape : Line → Line
  | '\\' :: l => l
  | l => l

def header (id : Line) : Line := fence ++ ' ' :: id

def headerId? : Line → Option Line
  | ':' :: ':' :: ':' :: ' ' :: id => some id
  | _ => none

structure Section where
  id   : Line
  body : List Line
  deriving Repr, DecidableEq, Inhabited

def render (d : List Section) : List Line :=
  d.flatMap fun s => header s.id :: s.body.map escape ++ [fence]

/-- Parser state: outside a section, or inside one with its body so far (reversed). -/
inductive St where
  | top
  | inside (id : Line) (body : List Line)

def parseGo : List Line → St → List Section → Option (List Section)
  | [], .top, acc => some acc.reverse
  | [], .inside _ _, _ => none
  | l :: ls, .top, acc =>
    match headerId? l with
    | some id => parseGo ls (.inside id []) acc
    | none => none
  | l :: ls, .inside id b, acc =>
    if l = fence then parseGo ls .top (⟨id, b.reverse⟩ :: acc)
    else if l.take 3 = fence then none
    else parseGo ls (.inside id (unescape l :: b)) acc

def parse (ls : List Line) : Option (List Section) := parseGo ls .top []

/-- What an edited text means against its base. -/
inductive Outcome where
  /-- An edit to a section the base has: becomes a record. -/
  | accepted (id : Line) (body : List Line)
  /-- A section the base doesn't have: reported, never silently kept. -/
  | unknown (id : Line)
  /-- A section the text dropped: reported; absence is never an edit. -/
  | absent (id : Line)
  deriving Repr, DecidableEq

def lookup (id : Line) : List Section → Option (List Line)
  | [] => none
  | s :: ss => if s.id = id then some s.body else lookup id ss

def diffSection (base : List Section) (s : Section) : Option Outcome :=
  match lookup s.id base with
  | some b => if b = s.body then none else some (.accepted s.id s.body)
  | none => some (.unknown s.id)

def absentSection (edited : List Section) (s : Section) : Option Outcome :=
  if (edited.map (·.id)).contains s.id then none else some (.absent s.id)

def diff (base edited : List Section) : List Outcome :=
  edited.filterMap (diffSection base) ++ base.filterMap (absentSection edited)

def acceptedBody (id : Line) : List Outcome → Option (List Line)
  | [] => none
  | .accepted i b :: os => if i = id then some b else acceptedBody id os
  | _ :: os => acceptedBody id os

def apply (base : List Section) (os : List Outcome) : List Section :=
  base.map fun s => match acceptedBody s.id os with
    | some b => ⟨s.id, b⟩
    | none => s

/-- Read an edited text against its base. -/
def edit (base : List Section) (text : List Line) : Option (List Outcome) :=
  (parse text).map (diff base)

/-- A text's normal form: what rendering its meaning gives back. -/
def normalize (text : List Line) : Option (List Line) :=
  (parse text).map render

end Loops.Lens
