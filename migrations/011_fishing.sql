-- Fishing: a cast that gets away still spends the charge.
--
-- A miss has to leave a row in `rolls`, because that table *is* the charge
-- ledger — chargesFrom replays it. Without a row the charge is not spent and a
-- miss costs nothing, which removes the only tension the minigame has.
ALTER TABLE rolls MODIFY COLUMN source ENUM('charge','payment','miss') NOT NULL DEFAULT 'charge';

-- Which pond it came from. Nullable because every row written before fishing
-- existed came from the Discover button, which had no pond.
ALTER TABLE rolls ADD COLUMN pond VARCHAR(44) NULL;
ALTER TABLE specimens ADD COLUMN pond VARCHAR(44) NULL;
