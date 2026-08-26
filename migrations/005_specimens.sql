-- Step 3 of docs/PLAN.md. The tables the real loop needs.

ALTER TABLE reefs
  ADD COLUMN handle VARCHAR(32) NULL,
  ADD COLUMN best_streak SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  -- When charges were last settled. Charges themselves are derived, never
  -- stored as a counter that can drift.
  ADD COLUMN charges_updated_at DATETIME NULL;

-- NULL repeats freely under a MySQL unique index, so handles can be assigned
-- lazily on first read instead of needing a backfill that guesses at them.
ALTER TABLE reefs ADD UNIQUE KEY uniq_handle (handle);

-- Everything ever discovered. Permanent: releasing clears `slot`, never the row.
CREATE TABLE IF NOT EXISTS specimens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  address       VARCHAR(44)     NOT NULL,
  species       VARCHAR(24)     NOT NULL,
  tier          ENUM('common','uncommon','rare','legendary') NOT NULL,
  seed          INT UNSIGNED    NOT NULL,
  discovered_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Which display slot it occupies, or NULL when returned to the reef.
  slot          SMALLINT UNSIGNED NULL,
  PRIMARY KEY (id),
  -- Capacity enforced by the database, so two taps cannot both take a slot.
  UNIQUE KEY uniq_slot (address, slot),
  KEY idx_addr (address),
  CONSTRAINT fk_spec_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carry the old plants across so nobody loses what they planted.
INSERT INTO specimens (address, species, tier, seed, discovered_at, slot)
SELECT p.address,
       CASE p.species WHEN 'sprout' THEN 'guppy' WHEN 'fern' THEN 'grass'
                      WHEN 'bloom' THEN 'angel'  WHEN 'elder' THEN 'shark'
                      ELSE p.species END,
       CASE p.species WHEN 'bloom' THEN 'uncommon' WHEN 'elder' THEN 'legendary'
                      ELSE 'common' END,
       p.seed, p.planted_at, p.plot_index
FROM plants p
WHERE NOT EXISTS (SELECT 1 FROM specimens s WHERE s.address = p.address AND s.slot = p.plot_index);

-- One row per roll. Charges are derived from these plus charges_updated_at.
CREATE TABLE IF NOT EXISTS rolls (
  id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  address   VARCHAR(44)     NOT NULL,
  rolled_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source    ENUM('charge','payment') NOT NULL DEFAULT 'charge',
  PRIMARY KEY (id),
  KEY idx_addr_time (address, rolled_at),
  CONSTRAINT fk_roll_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feeding your own reef. Presence of the row is the whole fact.
CREATE TABLE IF NOT EXISTS feeds (
  address VARCHAR(44) NOT NULL,
  day     DATE        NOT NULL,
  PRIMARY KEY (address, day),
  CONSTRAINT fk_feed_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feeding somebody else's. Rate limited on the device, not the wallet: a
-- wallet is free to create, and requestDeviceIdentifier is stable across
-- reinstalls and across accounts on one phone.
CREATE TABLE IF NOT EXISTS feedings (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_address VARCHAR(44)     NOT NULL,
  to_address   VARCHAR(44)     NOT NULL,
  day          DATE            NOT NULL,
  device_hash  CHAR(64)        NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY one_per_device_per_day (device_hash, day),
  KEY idx_recipient_day (to_address, day),
  CONSTRAINT fk_fed_from FOREIGN KEY (from_address) REFERENCES reefs (address) ON DELETE CASCADE,
  CONSTRAINT fk_fed_to   FOREIGN KEY (to_address)   REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
