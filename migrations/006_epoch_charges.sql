-- Charges move from an invented eight-hour timer to the chain's own clock.
-- An epoch is 43,200 blocks at one second each — twelve hours — so a reef
-- refills twice a day passively, and "your reef refills each epoch" becomes a
-- true statement about Nimiq rather than a decorative one.

-- What the chain said about an address during an epoch. Balance is how we
-- infer activity: getTransactionsByAddress needs a history index the validator
-- does not run, so a change in balance across an epoch is the available proxy.
-- It catches payments in and out — and also a staking reward landing, which is
-- an approximation we accept.
CREATE TABLE IF NOT EXISTS epoch_activity (
  address      VARCHAR(44)     NOT NULL,
  epoch        INT UNSIGNED    NOT NULL,
  balance_luna BIGINT UNSIGNED NOT NULL DEFAULT 0,
  observed_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, epoch),
  CONSTRAINT fk_epoch_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One extra charge per epoch in which the wallet was used. The primary key is
-- the cap: however many transactions somebody makes, they earn one. That is
-- what makes the simpler rule safe — with a hard ceiling of three charges,
-- there is nothing for a spammer to gain.
CREATE TABLE IF NOT EXISTS bonus_charges (
  address    VARCHAR(44)  NOT NULL,
  epoch      INT UNSIGNED NOT NULL,
  granted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, epoch),
  KEY idx_addr_time (address, granted_at),
  CONSTRAINT fk_bonus_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
