-- The garden became an aquarium. 001 is left exactly as it was applied —
-- migrations are history and rewriting one makes the record lie about what
-- ran. This moves the tables forward instead.
--
-- InnoDB updates foreign keys automatically on RENAME TABLE, so the
-- constraints on plants and reef_days follow without being touched.

RENAME TABLE groves TO reefs;
RENAME TABLE grove_days TO reef_days;

-- `plants` is deliberately untouched. Step 3 of docs/PLAN.md replaces it with
-- `specimens`, and renaming it here would only mean renaming it twice.
