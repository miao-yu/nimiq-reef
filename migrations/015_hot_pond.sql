-- One pond runs each epoch, the same for everyone.
--
-- Nimiq epochs are global: every reef's epoch turns at the same instant,
-- because it is the chain's clock rather than ours. That makes it the one
-- shared clock the game already owned and never used — the cheapest way for a
-- handful of players to feel like they are in the same place on the same day.
--
-- Pinned rather than derived on the fly. The elected set is read fresh on every
-- request, so a validator joining or leaving mid-epoch would silently move the
-- hot pond and break the only promise the mechanic makes.
CREATE TABLE IF NOT EXISTS hot_ponds (
  epoch      INT UNSIGNED NOT NULL,
  pond       VARCHAR(44)  NOT NULL,
  chosen_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (epoch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The bonus cast. One per reef per epoch, in the hot pond only.
--
-- UNIQUE (address, epoch) is what enforces it — the same shape that already
-- holds one feed per wallet per day, and equally unfarmable by a double tap.
CREATE TABLE IF NOT EXISTS hot_casts (
  address    VARCHAR(44)  NOT NULL,
  epoch      INT UNSIGNED NOT NULL,
  cast_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, epoch),
  CONSTRAINT fk_hot_cast_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

