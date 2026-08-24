-- Grove core tables.
--
-- Growth is never stored. Plants record when they were planted and a seed; how
-- grown they are is derived on read from the current day. Storing a growth
-- number would let the garden drift away from the chain.

CREATE TABLE IF NOT EXISTS groves (
  -- User-friendly Nimiq address: 9 groups of 4 plus 8 spaces = exactly 44 chars.
  address      VARCHAR(44)  NOT NULL,
  -- Day 1 of this grove, in UTC. Every plant's age is measured from here.
  first_day    DATE         NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plants (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  address     VARCHAR(44)     NOT NULL,
  -- Which plot it occupies. The unique key below is what makes planting
  -- permanent: a plot can be filled once and never replaced.
  plot_index  TINYINT UNSIGNED NOT NULL,
  species     ENUM('sprout','fern','bloom','elder') NOT NULL,
  -- Grove day index at planting time, so growth = f(currentDay - planted_day).
  planted_day INT UNSIGNED    NOT NULL,
  planted_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Stable per-plant randomness: lean, wobble, petal placement.
  seed        INT UNSIGNED    NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_plot (address, plot_index),
  CONSTRAINT fk_plants_grove FOREIGN KEY (address) REFERENCES groves (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per grove per UTC day, written by the tick. Consecutive days with
-- staked_luna > 0 are what unlock species — never the size of the stake.
CREATE TABLE IF NOT EXISTS grove_days (
  address     VARCHAR(44)     NOT NULL,
  day         DATE            NOT NULL,
  staked_luna BIGINT UNSIGNED NOT NULL DEFAULT 0,
  -- Which validator, if any. Grove is validator-neutral; this is for display.
  delegation  VARCHAR(44)     NULL,
  observed_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, day),
  CONSTRAINT fk_days_grove FOREIGN KEY (address) REFERENCES groves (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tick history, so a gap in watering is visible after the fact rather than
-- silently looking like nobody staked.
CREATE TABLE IF NOT EXISTS ticks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ran_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  block_number  INT UNSIGNED    NULL,
  groves_seen   INT UNSIGNED    NOT NULL DEFAULT 0,
  groves_staked INT UNSIGNED    NOT NULL DEFAULT 0,
  error         TEXT            NULL,
  PRIMARY KEY (id),
  KEY idx_ran_at (ran_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
