import Loops.Batch
import Laws.Record

/-!
# Laws of writing

* **Checked.** `write` succeeds exactly when every check passes
  (`writeProblem_none`, in `Loops.Stored`), and what it returns carries the
  proof (`Written`). A batch writes through `write`, so every record it
  returns carries the same proof.
* **Closed codes.** Every refusal `writeProblem` gives is in `writeCodes`, so
  choosing among a batch's refusals by that list never loses one.
* **The set decides the refusal.** Which refusal a batch reports depends only
  on which refusals there are, not on the order of its drafts.
* **Member order.** A written payload's commitment doesn't depend on the
  order its members are listed in: `write` established the distinct names
  that `canon_member_order` needs.
-/

namespace Loops

open List

theorem Env.problem_codes {e : Env} {c : String} (h : e.problem = some c) : c ∈ writeCodes := by
  unfold Env.problem at h
  repeat' split at h
  all_goals cases h
  all_goals simp [writeCodes]

theorem writeProblem_codes {env : Env} {salt : List UInt8} {payload : Json} {c : String}
    (h : writeProblem env salt payload = some c) : c ∈ writeCodes := by
  unfold writeProblem at h
  split at h
  · rename_i he; cases h; exact Env.problem_codes he
  · repeat' split at h
    all_goals cases h
    all_goals simp [writeCodes]

theorem firstRefusal_set {cs ds : List String} (h : ∀ c, c ∈ cs ↔ c ∈ ds)
    (hw : ∀ c ∈ cs, c ∈ writeCodes) : firstRefusal cs = firstRefusal ds := by
  unfold firstRefusal
  have hp : cs.contains = ds.contains := by
    funext c
    cases hc : cs.contains c <;> cases hd : ds.contains c <;> simp_all
  rw [hp]
  cases hf : writeCodes.find? ds.contains with
  | some c => rfl
  | none =>
    have hcs : cs = [] := by
      cases cs with
      | nil => rfl
      | cons c cs' =>
        have hm := hw c mem_cons_self
        have := List.find?_eq_none.1 hf c hm
        simp at this
        exact absurd ((h c).1 mem_cons_self) this
    have hds : ds = [] := by
      cases ds with
      | nil => rfl
      | cons d ds' => exact absurd ((h d).2 mem_cons_self) (by simp [hcs])
    simp [hcs, hds]

theorem keysDistinct_obj {kvs : List (String × Json)} (h : (Json.obj kvs).keysDistinct = true) :
    (kvs.map (·.1)).Nodup := by
  simp only [Json.keysDistinct, Bool.and_eq_true, decide_eq_true_eq] at h
  exact h.1

/-- A written payload's commitment doesn't depend on its members' order. -/
theorem Written.commit_member_order (H : Hash) (w : Written) {kvs kvs' : List (String × Json)}
    (hw : w.payload = .obj kvs) (hp : kvs ~ kvs') :
    commitOf H w.salt (.obj kvs') = w.stored.commit H := by
  have hd := keysDistinct_obj (hw ▸ w.ok.members)
  simp only [Written.stored, make, Stored.commit, commitOf, hw, canon_member_order hp hd]

end Loops
