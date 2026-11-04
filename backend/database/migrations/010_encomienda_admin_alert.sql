ALTER TABLE encomienda
    ADD COLUMN IF NOT EXISTS last_admin_alert_at TIMESTAMPTZ NULL;
