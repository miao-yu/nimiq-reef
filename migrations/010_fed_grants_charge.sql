-- Being fed by somebody else grants a charge.
--
-- Attendance creates opportunity, and this is the one case where the attendance
-- is not your own. Capped at one a day so the social loop pays out without
-- becoming a second source of charges: the primary supply is still the epoch.
--
-- `reason` distinguishes it from the outgoing-transaction bonus so the two
-- limits do not silently share one budget. Existing rows are all outgoing.
ALTER TABLE bonus_charges ADD COLUMN reason ENUM('outgoing','fed') NOT NULL DEFAULT 'outgoing';
ALTER TABLE bonus_charges ADD COLUMN day DATE NULL;
UPDATE bonus_charges SET day = DATE(granted_at) WHERE day IS NULL;
ALTER TABLE bonus_charges MODIFY COLUMN day DATE NOT NULL;

-- One per reason per day. The primary key (address, epoch) still applies on top
-- of this, so two bonuses can never land in the same epoch whatever earned them.
ALTER TABLE bonus_charges ADD UNIQUE KEY one_per_day_per_reason (address, day, reason);
