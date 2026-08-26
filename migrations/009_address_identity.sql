-- The address is the handle.
--
-- Reef used to mint a random two-word name so social features never had to
-- show a wallet. That was guarding an open door: stake, delegation and staking
-- history are readable from any Nimiq node for any address, so a reef page
-- discloses nothing a block explorer does not already show. The address also
-- draws the identicon, which is the face people actually recognise.
ALTER TABLE reefs DROP INDEX uniq_handle;
ALTER TABLE reefs DROP COLUMN handle;

-- What the chain does NOT show is which address fed which, and when somebody
-- opens the app. A public reef page makes that inferrable, so it is opt-out.
ALTER TABLE reefs ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0;
