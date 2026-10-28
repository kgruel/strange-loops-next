import Lean

/-!
# Proofs: which theorems each proof uses

`lake exe proofs <file>` loads the built `Laws` modules (and the `Loops` modules
they import) and writes, for every theorem declared in them, its module and the
theorems of ours its proof refers to. CI runs it and fails if the file changed,
so the file is a pure render of the proofs, as the vectors are of the model.

It reads proof terms Lean has already checked, so an edge says only "this proof
uses that theorem", never "this law depends on that one": which theorems make
up a law is `protocol/laws.md`'s to say, and the design page joins the two.

Auxiliary theorems Lean generates (`_proof_1`, `match_1`, `eq_1`, …) aren't
written; a proof that uses one uses what it uses.
-/

open Lean

/-- A declaration of ours: one from a `Laws` or `Loops` module. -/
def moduleOf? (env : Environment) (n : Name) : Option Name := do
  let i ← env.getModuleIdxFor? n
  let m ← env.header.moduleNames[i.toNat]?
  if (`Laws).isPrefixOf m || (`Loops).isPrefixOf m then some m else none

/-- The theorems of ours a theorem's proof refers to, looking through auxiliary ones. -/
partial def usesOf (env : Environment) (n : Name) : StateM NameSet NameSet := do
  let some (.thmInfo t) := env.find? n | return {}
  let mut out : NameSet := {}
  for c in t.value.getUsedConstants do
    if c == n || (moduleOf? env c).isNone then continue
    let some (.thmInfo _) := env.find? c | continue
    if c.isInternalDetail then
      if (← get).contains c then continue
      modify (·.insert c)
      for d in (← usesOf env c) do out := out.insert d
    else
      out := out.insert c
  return out

def main (args : List String) : IO UInt32 := do
  let [file] := args | IO.eprintln "usage: proofs <file>"; return 1
  initSearchPath (← findSysroot)
  let env ← importModules #[{ module := `Laws }] {} (trustLevel := 1024)
  let mut rows : Array (String × Json) := #[]
  for (n, c) in env.constants.toList do
    let .thmInfo _ := c | continue
    if n.isInternalDetail then continue
    let some m := moduleOf? env n | continue
    let uses := ((usesOf env n).run' {}).toList.map toString |>.toArray.qsort (· < ·)
    rows := rows.push (toString n, Json.mkObj [("module", toString m), ("uses", toJson uses)])
  rows := rows.qsort (·.1 < ·.1)
  let text := Json.pretty (Json.mkObj [("theorems", Json.mkObj rows.toList)])
  IO.FS.writeFile file (text ++ "\n")
  IO.println s!"wrote {rows.size} theorems to {file}"
  return 0
