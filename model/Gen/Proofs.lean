import Lean

/-!
# Proofs: which theorems each proof uses, and what each states

`lake exe proofs <file>` loads the built `Laws` modules (and the `Loops` modules
they import) and writes, for every theorem declared in them, its module, its
statement as Lean prints it, and the theorems of ours its proof refers to. CI
runs it and fails if the file changed, so the file is a pure render of the
proofs, as the vectors are of the model.

It reads proof terms Lean has already checked, so an edge says only "this proof
uses that theorem", never "this law depends on that one": which theorems make
up a law is `protocol/laws.md`'s to say, and the design page joins the two.

Lean compiles parts of a proof into declarations of its own: auxiliary
theorems (`_proof_1`, `match_1`, `eq_1`, …) and auxiliary definitions, such
as the `_f` structural recursion makes. None is written; a proof that uses
one uses what it uses. A proof by computation (`decide`) refers to the
definitions it evaluates, not to theorems, so it uses none.
-/

open Lean Meta

/-- A declaration of ours: one from a `Laws` or `Loops` module. -/
def moduleOf? (env : Environment) (n : Name) : Option Name := do
  let i ← env.getModuleIdxFor? n
  let m ← env.header.moduleNames[i.toNat]?
  if (`Laws).isPrefixOf m || (`Loops).isPrefixOf m then some m else none

/-- The theorems of ours a declaration's body refers to, looking through auxiliary
declarations of either kind. -/
partial def usesOf (env : Environment) (n : Name) : StateM NameSet NameSet := do
  let some c := env.find? n | return {}
  let some body := c.value? (allowOpaque := true) | return {}
  let mut out : NameSet := {}
  for d in body.getUsedConstants do
    if d == n || (moduleOf? env d).isNone then continue
    if d.isInternalDetail then
      if (← get).contains d then continue
      modify (·.insert d)
      for e in (← usesOf env d) do out := out.insert e
    else if let some (.thmInfo _) := env.find? d then
      out := out.insert d
  return out

/-- A theorem's statement as Lean prints it, on one line. -/
def statement (env : Environment) (t : Expr) : IO String := do
  let ctx : Core.Context := { fileName := "<proofs>", fileMap := default, maxHeartbeats := 0 }
  let (fmt, _) ← (MetaM.run' (ppExpr t)).toIO ctx { env }
  return " ".intercalate (((fmt.pretty 100).replace "\n" " ").splitOn " " |>.filter (· ≠ ""))

unsafe def main (args : List String) : IO UInt32 := do
  let [file] := args | IO.eprintln "usage: proofs <file>"; return 1
  initSearchPath (← findSysroot)
  -- Notation lives in environment extensions: load them, so statements print as written.
  enableInitializersExecution
  let env ← importModules #[{ module := `Laws }] {} (trustLevel := 1024) (loadExts := true)
  let mut rows : Array (String × Json) := #[]
  for (n, c) in env.constants.toList do
    let .thmInfo t := c | continue
    if n.isInternalDetail then continue
    let some m := moduleOf? env n | continue
    let uses := ((usesOf env n).run' {}).toList.map toString |>.toArray.qsort (· < ·)
    rows := rows.push (toString n, Json.mkObj [("module", toString m), ("uses", toJson uses),
      ("states", ← statement env t.type)])
  rows := rows.qsort (·.1 < ·.1)
  let text := Json.pretty (Json.mkObj [("theorems", Json.mkObj rows.toList)])
  IO.FS.writeFile file (text ++ "\n")
  IO.println s!"wrote {rows.size} theorems to {file}"
  return 0
