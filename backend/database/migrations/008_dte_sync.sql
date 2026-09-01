BEGIN;

CREATE TABLE IF NOT EXISTS dte_sync_cursor (
    type_document INTEGER PRIMARY KEY,
    last_folio BIGINT NOT NULL DEFAULT 0 CHECK (last_folio >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dte_sync_cursor (type_document, last_folio)
VALUES (33, 0), (39, 0), (1001, 0)
ON CONFLICT (type_document) DO NOTHING;

CREATE TABLE IF NOT EXISTS dte_sync_item (
    type_document INTEGER NOT NULL,
    folio BIGINT NOT NULL,
    board_id BIGINT NOT NULL,
    monday_item_id BIGINT,
    relbase_status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    last_error TEXT,
    last_attempt_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    relbase_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (type_document, folio),
    CONSTRAINT chk_dte_sync_status
        CHECK (sync_status IN ('pending', 'processing', 'synced', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS dte_sync_monday_item_unique
    ON dte_sync_item (monday_item_id)
    WHERE monday_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS dte_sync_refresh_idx
    ON dte_sync_item (sync_status, updated_at);

COMMIT;
