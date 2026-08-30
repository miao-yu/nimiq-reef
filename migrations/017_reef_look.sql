-- How a reef looks, as opposed to what lives in it.
--
-- The only part of a reef somebody chooses: everything else is a consequence
-- of staking and luck. It is also what can make a share card recognisably
-- theirs rather than a picture of the same game.
--
-- Not placement. Creature position stays a function of seed and frame time,
-- which is what lets the server draw the same picture the player sees; floors
-- and walls change the scene without touching a single creature.
ALTER TABLE reefs ADD COLUMN floor VARCHAR(16) NOT NULL DEFAULT 'sand';
ALTER TABLE reefs ADD COLUMN wall  VARCHAR(16) NOT NULL DEFAULT 'open';
