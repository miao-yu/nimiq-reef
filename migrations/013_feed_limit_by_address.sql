-- The daily feed limit moves from the device to the wallet.
--
-- The device identifier was guarding an exploit that does not pay: bonus_charges
-- is UNIQUE (address, day, reason), so a reef collects at most one 'fed' charge
-- a day however many feeds arrive, and giving earns the giver nothing. Farming
-- wallets bought a bigger vanity counter and *cost* discoverability, because the
-- 'quiet' sort ranks by fewest lifetime feeds.
--
-- What it cost was real: the candidate list refused outright outside Nimiq Pay,
-- and the button could not be greyed honestly because the session knows your
-- address but not what you are holding.
--
-- device_hash is kept and made nullable rather than dropped. The column has no
-- use once the limit moves, but dropping it destroys data to save nothing.

ALTER TABLE feedings DROP INDEX one_per_device_per_day;
ALTER TABLE feedings MODIFY COLUMN device_hash CHAR(64) NULL;
ALTER TABLE feedings ADD UNIQUE KEY one_per_wallet_per_day (from_address, day);
