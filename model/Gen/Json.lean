/-!
# A small JSON writer

Vectors are written byte-for-byte the same on every run: two-space indent,
keys in the order given, arrays of scalars on one line.
-/

namespace Gen

inductive J where
  | null
  | bool (b : Bool)
  | num (n : Nat)
  | int (i : Int)
  | str (s : String)
  | arr (xs : List J)
  | obj (kvs : List (String × J))
  deriving Inhabited

def hex4 (n : Nat) : String :=
  let d := Nat.toDigits 16 n
  String.ofList (List.replicate (4 - d.length) '0' ++ d)

def escape (s : String) : String :=
  s.foldl (init := "\"") (fun acc c =>
    acc ++ match c with
    | '"' => "\\\""
    | '\\' => "\\\\"
    | '\n' => "\\n"
    | '\t' => "\\t"
    | c => if c.toNat < 0x20 then "\\u" ++ hex4 c.toNat else c.toString) ++ "\""

def J.scalar : J → Bool
  | .arr _ | .obj _ => false
  | _ => true

partial def J.render (ind : Nat) : J → String
  | .null => "null"
  | .bool b => toString b
  | .num n => toString n
  | .int i => toString i
  | .str s => escape s
  | .arr [] => "[]"
  | .arr xs =>
    if xs.all J.scalar then "[" ++ ", ".intercalate (xs.map (J.render ind)) ++ "]"
    else
      let pad := String.ofList (List.replicate (ind + 2) ' ')
      "[\n" ++ ",\n".intercalate (xs.map fun x => pad ++ x.render (ind + 2)) ++ "\n" ++
        String.ofList (List.replicate ind ' ') ++ "]"
  | .obj [] => "{}"
  | .obj kvs =>
    let pad := String.ofList (List.replicate (ind + 2) ' ')
    "{\n" ++ ",\n".intercalate (kvs.map fun (k, v) => pad ++ escape k ++ ": " ++ v.render (ind + 2)) ++
      "\n" ++ String.ofList (List.replicate ind ' ') ++ "}"

end Gen
