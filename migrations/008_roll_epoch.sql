-- Charges are meant to arrive when an epoch turns, not twelve hours after you
-- happened to spend one. Replaying that needs to know which epoch a roll fell
-- in, so record it.
--
-- Existing rows get 0, which is older than any live epoch and therefore counts
-- as fully regenerated — the forgiving direction.
ALTER TABLE rolls ADD COLUMN epoch INT UNSIGNED NOT NULL DEFAULT 0;
