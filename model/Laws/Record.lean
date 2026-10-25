import Loops.Stored

/-!
# Laws of the record

* **Erasure keeps the id.** Forgetting the opening changes storage, not the
  record: every reference, tick and signature still resolves.
* **An opening checks.** A record's own salt and payload open its commitment.
* **Sets are sets.** Reordering or repeating `about` or `prev` gives the
  same envelope bytes, so the same id.
* **Member order is free.** Reordering an object's members never changes its
  canonical text.

These hold for any hash `H`; the vectors use SHA-256.
-/

namespace Loops

open List

/-! ## Erasure -/

theorem erase_keeps_id (H : Hash) (r : Stored) : (erase H r).id H = r.id H := by
  simp [erase, Stored.id, Stored.commit]

theorem erase_idem (H : Hash) (r : Stored) : erase H (erase H r) = erase H r := by
  simp [erase, Stored.commit]

theorem opening_checks (H : Hash) (env : Env) (salt : List UInt8) (payload : Json) :
    opens H ((make env salt payload).commit H) salt payload = true := by
  simp [opens, make, Stored.commit]

/-! ## The UTF-16 order is a strict total order -/

theorem lexLt_irrefl : ∀ a : List Nat, lexLt a a = false
  | [] => rfl
  | x :: xs => by simp [lexLt, lexLt_irrefl xs]

theorem lexLt_trans : ∀ {a b c : List Nat}, lexLt a b = true → lexLt b c = true → lexLt a c = true
  | [], [], _, h, _ => by simp [lexLt] at h
  | [], _ :: _, [], _, h => by simp [lexLt] at h
  | [], _ :: _, _ :: _, _, _ => rfl
  | _ :: _, [], _, h, _ => by simp [lexLt] at h
  | x :: xs, y :: ys, [], _, h => by simp [lexLt] at h
  | x :: xs, y :: ys, z :: zs, h₁, h₂ => by
    simp only [lexLt] at *
    by_cases hxy : x < y
    · by_cases hyz : y < z
      · simp [show x < z by omega]
      · by_cases hyz' : y = z
        · subst hyz'; simp [hxy]
        · simp [hyz, hyz'] at h₂
    · by_cases hxy' : x = y
      · subst hxy'
        simp [hxy] at h₁
        by_cases hyz : x < z
        · simp [hyz]
        · by_cases hyz' : x = z
          · subst hyz'; simp [hyz] at h₂ ⊢; exact lexLt_trans h₁ h₂
          · simp [hyz, hyz'] at h₂
      · simp [hxy, hxy'] at h₁

theorem lexLt_total : ∀ {a b : List Nat}, a ≠ b → lexLt a b = true ∨ lexLt b a = true
  | [], [], h => absurd rfl h
  | [], _ :: _, _ => Or.inl rfl
  | _ :: _, [], _ => Or.inr rfl
  | x :: xs, y :: ys, h => by
    simp only [lexLt]
    by_cases hxy : x < y
    · simp [hxy]
    · by_cases hyx : y < x
      · simp [hyx]
      · have e : x = y := by omega
        subst e
        have : xs ≠ ys := fun e => h (e ▸ rfl)
        simp [hxy, lexLt_total this]

theorem lexLt_asymm {a b : List Nat} (h : lexLt a b = true) : lexLt b a = false := by
  cases h' : lexLt b a
  · rfl
  · have := lexLt_trans h h'; rw [lexLt_irrefl] at this; exact absurd this (by simp)

/-! ## UTF-16 is injective on strings -/

theorem char_valid (c : Char) : c.toNat < 0xd800 ∨ (0xdfff < c.toNat ∧ c.toNat < 0x110000) := by
  have h := c.valid
  unfold UInt32.isValidChar Nat.isValidChar at h
  exact h

theorem utf16Char_cons {c d : Char} {r s : List Nat} (h : utf16Char c ++ r = utf16Char d ++ s) :
    c = d ∧ r = s := by
  have hc := char_valid c
  have hd := char_valid d
  unfold utf16Char at h
  by_cases h1 : c.toNat < 0x10000 <;> by_cases h2 : d.toNat < 0x10000 <;>
    simp only [h1, h2, ite_true, ite_false, List.cons_append, List.cons.injEq] at h
  · exact ⟨Char.toNat_inj.1 h.1, h.2⟩
  · omega
  · omega
  · refine ⟨Char.toNat_inj.1 ?_, h.2.2⟩
    omega

theorem utf16_inj_list : ∀ {a b : List Char}, a.flatMap utf16Char = b.flatMap utf16Char → a = b
  | [], [], _ => rfl
  | [], d :: _, h => by
    simp only [List.flatMap_nil, List.flatMap_cons] at h
    unfold utf16Char at h; split at h <;> simp at h
  | c :: _, [], h => by
    simp only [List.flatMap_nil, List.flatMap_cons] at h
    unfold utf16Char at h; split at h <;> simp at h
  | c :: cs, d :: ds, h => by
    simp only [List.flatMap_cons] at h
    obtain ⟨rfl, h'⟩ := utf16Char_cons h
    rw [utf16_inj_list h']

theorem utf16_inj {a b : String} (h : utf16 a = utf16 b) : a = b :=
  String.toList_inj.1 (utf16_inj_list h)

/-! ## Sorting by a key -/

theorem mem_insertBy {α : Type} {key : α → List Nat} {x a : α} {l : List α} :
    a ∈ insertBy lexLt key x l → a = x ∨ a ∈ l := by
  induction l with
  | nil => simp [insertBy]
  | cons y ys ih =>
    simp only [insertBy]
    split
    · simp
    · split
      · intro h; exact Or.inr h
      · intro h
        rcases mem_cons.1 h with rfl | h
        · exact Or.inr mem_cons_self
        · rcases ih h with h | h
          · exact Or.inl h
          · exact Or.inr (mem_cons_of_mem _ h)

theorem mem_insertBy_self {α : Type} {key : α → List Nat} {x : α} {l : List α} :
    x ∈ insertBy lexLt key x l ∨ ∃ y ∈ l, key y = key x := by
  induction l with
  | nil => simp [insertBy]
  | cons y ys ih =>
    simp only [insertBy]
    split
    · simp
    · split
      · rename_i h; exact Or.inr ⟨y, mem_cons_self, h.symm⟩
      · rcases ih with h | ⟨z, hz, hk⟩
        · exact Or.inl (mem_cons_of_mem _ h)
        · exact Or.inr ⟨z, mem_cons_of_mem _ hz, hk⟩

theorem mem_insertBy_of_mem {α : Type} {key : α → List Nat} {x a : α} {l : List α} (h : a ∈ l) :
    a ∈ insertBy lexLt key x l := by
  induction l with
  | nil => simp at h
  | cons y ys ih =>
    simp only [insertBy]
    split
    · exact mem_cons_of_mem _ h
    · split
      · exact h
      · rcases mem_cons.1 h with rfl | h
        · exact mem_cons_self
        · exact mem_cons_of_mem _ (ih h)

def Sorted {α : Type} (key : α → List Nat) (l : List α) : Prop :=
  l.Pairwise fun a b => lexLt (key a) (key b) = true

theorem sorted_insertBy {α : Type} {key : α → List Nat} {x : α} {l : List α} (h : Sorted key l) :
    Sorted key (insertBy lexLt key x l) := by
  induction l with
  | nil => simp [insertBy, Sorted]
  | cons y ys ih =>
    unfold Sorted at *
    rw [pairwise_cons] at h
    simp only [insertBy]
    split
    · rename_i hxy
      refine pairwise_cons.2 ⟨?_, pairwise_cons.2 h⟩
      intro a ha
      rcases mem_cons.1 ha with rfl | ha
      · exact hxy
      · exact lexLt_trans hxy (h.1 a ha)
    · split
      · exact pairwise_cons.2 h
      · rename_i hxy hne
        have hyx : lexLt (key y) (key x) = true := by
          rcases lexLt_total (Ne.symm hne) with h' | h'
          · exact h'
          · simp_all
        refine pairwise_cons.2 ⟨?_, ih h.2⟩
        intro a ha
        rcases mem_insertBy ha with rfl | ha
        · exact hyx
        · exact h.1 a ha

theorem sortBy_go {α : Type} (key : α → List Nat) (xs acc : List α) (hacc : Sorted key acc) :
    Sorted key (xs.foldl (fun acc x => insertBy lexLt key x acc) acc) ∧
    (∀ a, a ∈ xs.foldl (fun acc x => insertBy lexLt key x acc) acc → a ∈ xs ∨ a ∈ acc) ∧
    (∀ a, a ∈ xs ∨ a ∈ acc → ∃ b ∈ xs.foldl (fun acc x => insertBy lexLt key x acc) acc, key b = key a) := by
  induction xs generalizing acc with
  | nil => exact ⟨hacc, fun a h => Or.inr h, fun a h => ⟨a, by simpa using h, rfl⟩⟩
  | cons x xs ih =>
    obtain ⟨h1, h2, h3⟩ := ih (insertBy lexLt key x acc) (sorted_insertBy hacc)
    refine ⟨h1, ?_, ?_⟩
    · intro a ha
      rcases h2 a ha with h | h
      · exact Or.inl (mem_cons_of_mem _ h)
      · rcases mem_insertBy h with rfl | h
        · exact Or.inl mem_cons_self
        · exact Or.inr h
    · intro a ha
      rcases ha with ha | ha
      · rcases mem_cons.1 ha with rfl | ha
        · rcases mem_insertBy_self (key := key) (x := a) (l := acc) with h | ⟨y, hy, hk⟩
          · exact h3 a (Or.inr h)
          · obtain ⟨b, hb, hkb⟩ := h3 y (Or.inr (mem_insertBy_of_mem hy))
            exact ⟨b, hb, hkb.trans hk⟩
        · exact h3 a (Or.inl ha)
      · exact h3 a (Or.inr (mem_insertBy_of_mem ha))

theorem sortBy_sorted {α : Type} (key : α → List Nat) (xs : List α) : Sorted key (sortBy key xs) :=
  (sortBy_go key xs [] (by simp [Sorted])).1

/-- With a key that tells the elements apart, sorting keeps exactly the elements. -/
theorem mem_sortBy {α : Type} {key : α → List Nat} {xs : List α}
    (inj : ∀ a ∈ xs, ∀ b ∈ xs, key a = key b → a = b) (a : α) :
    a ∈ sortBy key xs ↔ a ∈ xs := by
  obtain ⟨_, h2, h3⟩ := sortBy_go key xs [] (by simp [Sorted])
  constructor
  · intro h; simpa using h2 a h
  · intro h
    obtain ⟨b, hb, hk⟩ := h3 a (Or.inl h)
    have hbx : b ∈ xs := by simpa using h2 b hb
    rw [← inj b hbx a h hk]; exact hb

/-- Two sorted lists with the same elements are the same list. -/
theorem sortBy_ext {α : Type} {key : α → List Nat} {xs ys : List α}
    (h : ∀ a, a ∈ sortBy key xs ↔ a ∈ sortBy key ys) : sortBy key xs = sortBy key ys := by
  have ne : ∀ {a b : α}, lexLt (key a) (key b) = true → a ≠ b := fun h e => by
    subst e; rw [lexLt_irrefl] at h; exact absurd h (by simp)
  apply Perm.eq_of_pairwise (le := fun a b => lexLt (key a) (key b) = true)
    (fun a b _ _ h₁ h₂ => by rw [lexLt_asymm h₁] at h₂; exact absurd h₂ (by simp))
    (sortBy_sorted key xs) (sortBy_sorted key ys)
  exact (perm_ext_iff_of_nodup ((sortBy_sorted key xs).imp ne) ((sortBy_sorted key ys).imp ne)).2 h

/-! ## Sets are sets -/

theorem canonSet_eq {xs ys : List String} (h : ∀ s, s ∈ xs ↔ s ∈ ys) : canonSet xs = canonSet ys := by
  apply sortBy_ext
  intro a
  rw [mem_sortBy (fun a _ b _ e => utf16_inj e), mem_sortBy (fun a _ b _ e => utf16_inj e), h]

theorem env_sets {e e' : Env} (hk : e.kind = e'.kind) (ho : e.observer = e'.observer)
    (he : e.emitted = e'.emitted) (hoc : e.occurred = e'.occurred) (hu : e.under = e'.under)
    (ha : ∀ s, s ∈ e.about ↔ s ∈ e'.about) (hp : ∀ s, s ∈ e.prev ↔ s ∈ e'.prev) :
    e.toJson.canon = e'.toJson.canon := by
  simp only [Env.toJson, hk, ho, he, hoc, hu, canonSet_eq ha, canonSet_eq hp]

/-- Reordering or repeating `about` or `prev` never changes a record's id. -/
theorem id_sets (H : Hash) {e e' : Env} (commit : String) (hk : e.kind = e'.kind)
    (ho : e.observer = e'.observer) (he : e.emitted = e'.emitted) (hoc : e.occurred = e'.occurred)
    (hu : e.under = e'.under) (ha : ∀ s, s ∈ e.about ↔ s ∈ e'.about)
    (hp : ∀ s, s ∈ e.prev ↔ s ∈ e'.prev) : idOf H e commit = idOf H e' commit := by
  have : e.toJson = e'.toJson := by
    simp only [Env.toJson, hk, ho, he, hoc, hu, canonSet_eq ha, canonSet_eq hp]
  simp [idOf, idPreimage, Json.canon, Json.canonMembers, this]

/-! ## Member order is free -/

theorem eq_of_mem_of_nodup_map {α β : Type} {f : α → β} :
    ∀ {l : List α}, (l.map f).Nodup → ∀ a ∈ l, ∀ b ∈ l, f a = f b → a = b
  | [], _, a, ha, _, _, _ => by simp at ha
  | x :: xs, hn, a, ha, b, hb, e => by
    simp only [map_cons, nodup_cons, mem_map, not_exists, not_and] at hn
    rcases mem_cons.1 ha with ha' | ha' <;> rcases mem_cons.1 hb with hb' | hb'
    · rw [ha', hb']
    · rw [ha'] at e; exact absurd e.symm (hn.1 b hb')
    · rw [hb'] at e; exact absurd e (hn.1 a ha')
    · exact eq_of_mem_of_nodup_map hn.2 a ha' b hb' e

theorem canonMembers_eq (kvs : List (String × Json)) :
    Json.canonMembers kvs = kvs.map fun kv => (kv.1, kv.2.canon) := by
  induction kvs with
  | nil => rfl
  | cons kv kvs ih => obtain ⟨k, v⟩ := kv; simp [Json.canonMembers, ih]

/-- Reordering an object's members never changes its canonical text. -/
theorem canon_member_order {kvs kvs' : List (String × Json)} (hp : kvs ~ kvs')
    (hd : (kvs.map (·.1)).Nodup) : (Json.obj kvs).canon = (Json.obj kvs').canon := by
  have hd' : (kvs'.map (·.1)).Nodup := (hp.map _).nodup_iff.1 hd
  have inj : ∀ (l : List (String × Json)), (l.map (·.1)).Nodup →
      ∀ a ∈ Json.canonMembers l, ∀ b ∈ Json.canonMembers l, utf16 a.1 = utf16 b.1 → a = b := by
    intro l hl a ha b hb e
    rw [canonMembers_eq] at ha hb
    have hl' : ((l.map fun kv => (kv.1, kv.2.canon)).map (·.1)).Nodup := by
      rw [map_map]; exact hl
    exact eq_of_mem_of_nodup_map hl' a ha b hb (utf16_inj e)
  have hs : sortBy (fun kv => utf16 kv.1) (Json.canonMembers kvs) =
      sortBy (fun kv => utf16 kv.1) (Json.canonMembers kvs') := by
    apply sortBy_ext
    intro a
    rw [mem_sortBy (inj kvs hd), mem_sortBy (inj kvs' hd'), canonMembers_eq, canonMembers_eq]
    exact (hp.map _).mem_iff
  simp only [Json.canon, hs]

end Loops
