-- The species column was an ENUM of the four garden plants, so inserting a
-- guppy would be rejected outright. Widen it now rather than at Step 3, so the
-- new ladder is usable the moment progression lands instead of leaving the app
-- broken between two commits.
--
-- Existing rows keep their old values; src/lib/tank/adapt.ts still maps them
-- until Step 3 replaces this table with `specimens`.

ALTER TABLE plants MODIFY COLUMN species VARCHAR(24) NOT NULL;

-- Slots come from stake size and reach about 20 at a million NIM, well past
-- what a TINYINT would need, but the column was sized for four plots.
ALTER TABLE plants MODIFY COLUMN plot_index SMALLINT UNSIGNED NOT NULL;
