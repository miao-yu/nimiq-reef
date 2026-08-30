-- The bonus cast still produces a roll, but must not read as a charge spent.
--
-- rolls IS the charge ledger — chargesFrom replays it, counting every row as a
-- spend — so the free cast needs a source of its own and the replay has to skip
-- it. Without this the epoch's gift would silently bill the player for itself.
ALTER TABLE rolls MODIFY COLUMN source ENUM('charge','payment','miss','hot') NOT NULL DEFAULT 'charge';
