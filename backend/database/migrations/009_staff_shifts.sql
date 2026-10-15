BEGIN;

CREATE TABLE IF NOT EXISTS staff_shift (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID NOT NULL REFERENCES condominium(condominium_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL CHECK (BTRIM(name) <> ''),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    weekdays SMALLINT[] NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_shift_weekdays_not_empty CHECK (CARDINALITY(weekdays) > 0),
    CONSTRAINT staff_shift_weekdays_valid CHECK (weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::SMALLINT[]),
    UNIQUE (shift_id, condominium_id)
);

CREATE TABLE IF NOT EXISTS staff_shift_assignment (
    shift_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (shift_id, user_id),
    FOREIGN KEY (shift_id, condominium_id)
        REFERENCES staff_shift(shift_id, condominium_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, condominium_id)
        REFERENCES staff_condominium(user_id, condominium_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS staff_shift_condominium_idx
    ON staff_shift(condominium_id, enabled);
CREATE INDEX IF NOT EXISTS staff_shift_assignment_staff_idx
    ON staff_shift_assignment(user_id, condominium_id);

COMMIT;
