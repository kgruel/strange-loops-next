// Command budget checks the repo's budgets: tokens per package, the core's
// public surface, a core with nothing to require, and no tests inside
// internal/. Limits live in budget.json; raising one is a reviewed change.
//
// Run from the repo root: go run ./cli/cmd/budget
package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

type budget struct {
	Tokens  map[string]int `json:"tokens"`
	Surface int            `json:"surface"`
}

func main() {
	var b budget
	raw, err := os.ReadFile("budget.json")
	if err == nil {
		err = json.Unmarshal(raw, &b)
	}
	if err != nil {
		fail("budget.json: %v", err)
	}
	var problems []string
	add := func(format string, a ...any) { problems = append(problems, fmt.Sprintf(format, a...)) }

	// Tokens per package: non-test Go source, bytes / 4.
	sizes := map[string]int{}
	for _, root := range []string{"core", "cli"} {
		filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") {
				return err
			}
			if strings.HasSuffix(path, "_test.go") {
				if strings.Contains(filepath.ToSlash(path), "/internal/") {
					add("%s: tests touch only the public API; none inside internal/", path)
				}
				return nil
			}
			info, _ := d.Info()
			sizes[filepath.ToSlash(filepath.Dir(path))] += int(info.Size())
			return nil
		})
	}
	pkgs := make([]string, 0, len(sizes))
	for p := range sizes {
		pkgs = append(pkgs, p)
	}
	slices.Sort(pkgs)
	fmt.Println("tokens (bytes / 4):")
	for _, p := range pkgs {
		tokens := sizes[p] / 4
		limit, ok := b.Tokens[p]
		fmt.Printf("  %-28s %6d / %d\n", p, tokens, limit)
		switch {
		case !ok:
			add("%s: no token budget in budget.json", p)
		case tokens > limit:
			add("%s: %d tokens, budget %d", p, tokens, limit)
		}
	}

	// The core requires nothing.
	mod, _ := os.ReadFile("core/go.mod")
	if strings.Contains(string(mod), "require") {
		add("core/go.mod: the core imports the standard library only")
	}

	// Surface: exported names of package loops, plus the exported fields and
	// methods of the types it aliases.
	names := surface()
	fmt.Printf("surface: %d / %d\n", len(names), b.Surface)
	for _, n := range names {
		fmt.Println("  " + n)
	}
	if len(names) > b.Surface {
		add("package loops: surface %d, budget %d", len(names), b.Surface)
	}

	if len(problems) > 0 {
		for _, p := range problems {
			fmt.Fprintln(os.Stderr, "over budget: "+p)
		}
		os.Exit(1)
	}
}

func surface() []string {
	fset := token.NewFileSet()
	parse := func(dir string) []*ast.File {
		var files []*ast.File
		entries, _ := os.ReadDir(dir)
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), ".go") && !strings.HasSuffix(e.Name(), "_test.go") {
				f, err := parser.ParseFile(fset, filepath.Join(dir, e.Name()), nil, 0)
				if err != nil {
					fail("%v", err)
				}
				files = append(files, f)
			}
		}
		return files
	}
	var names []string
	aliased := map[string]bool{}
	for _, f := range parse("core") {
		for _, d := range f.Decls {
			switch d := d.(type) {
			case *ast.FuncDecl:
				if d.Name.IsExported() {
					names = append(names, d.Name.Name)
				}
			case *ast.GenDecl:
				for _, s := range d.Specs {
					switch s := s.(type) {
					case *ast.TypeSpec:
						if s.Name.IsExported() {
							names = append(names, s.Name.Name)
							if sel, ok := s.Type.(*ast.SelectorExpr); ok && s.Assign.IsValid() {
								aliased[sel.Sel.Name] = true
							}
						}
					case *ast.ValueSpec:
						for _, n := range s.Names {
							if n.IsExported() {
								names = append(names, n.Name)
							}
						}
					}
				}
			}
		}
	}
	// Fields and methods of aliased types, from the internal packages.
	filepath.WalkDir("core/internal", func(path string, d fs.DirEntry, err error) error {
		if err != nil || !d.IsDir() {
			return err
		}
		for _, f := range parse(path) {
			for _, decl := range f.Decls {
				switch d := decl.(type) {
				case *ast.FuncDecl:
					if d.Recv != nil && d.Name.IsExported() {
						if t := recvType(d.Recv.List[0].Type); aliased[t] {
							names = append(names, t+"."+d.Name.Name)
						}
					}
				case *ast.GenDecl:
					for _, s := range d.Specs {
						ts, ok := s.(*ast.TypeSpec)
						if !ok || !aliased[ts.Name.Name] {
							continue
						}
						if st, ok := ts.Type.(*ast.StructType); ok {
							for _, fl := range st.Fields.List {
								for _, n := range fl.Names {
									if n.IsExported() {
										names = append(names, ts.Name.Name+"."+n.Name)
									}
								}
							}
						}
					}
				}
			}
		}
		return nil
	})
	slices.Sort(names)
	return names
}

func recvType(e ast.Expr) string {
	if s, ok := e.(*ast.StarExpr); ok {
		e = s.X
	}
	if id, ok := e.(*ast.Ident); ok {
		return id.Name
	}
	return ""
}

func fail(format string, a ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", a...)
	os.Exit(1)
}
