-- 002 renamed the tables but not the columns inside them, so the code started
-- writing reefs_seen into a table that still had groves_seen. The tick failed
-- loudly on the next run, which is the good outcome — a blanket rename across
-- source is exactly the change that silently drifts from a schema.
--
-- These are the only two columns that carried the old name.

ALTER TABLE ticks
  RENAME COLUMN groves_seen TO reefs_seen,
  RENAME COLUMN groves_staked TO reefs_staked;
