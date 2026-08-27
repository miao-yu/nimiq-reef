-- The one free miss a day.
--
-- It cannot live in `rolls`: that table is the charge ledger and chargesFrom
-- counts every row in it as a charge spent, which is the whole point of a
-- forgiven miss not being there. So presence of a row here is the fact, the
-- same shape as `feeds`.
--
-- `day` is written by the app from utcDay(), never derived from a timestamp.
-- rolled_at defaults to CURRENT_TIMESTAMP, which MySQL records in the server's
-- local zone — four hours off UTC on this box — so DATE(rolled_at) is not the
-- UTC day and must never be used as one.
CREATE TABLE IF NOT EXISTS forgiven_misses (
  address VARCHAR(44) NOT NULL,
  day     DATE        NOT NULL,
  used_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, day),
  CONSTRAINT fk_forgiven_reef FOREIGN KEY (address) REFERENCES reefs (address) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
