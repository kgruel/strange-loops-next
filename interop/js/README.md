# JavaScript port

`loops.mjs` implements the record writer and raw envelope shape checks.
`batch.mjs` checks every draft's envelope keys before labels or values.
The vector harness calls these library boundaries; it does not define the key policy.

## Raw text

A JavaScript object cannot retain repeated JSON members.
The caller must retain every repeated `env` member at the raw-text boundary.
The fuzz adapter re-reads raw text and passes those occurrences to the library shape check.
This rule has adapter tests, but protocol vectors do not cover it.
D5 remains open; this handling does not add a duplicate-member refusal.
