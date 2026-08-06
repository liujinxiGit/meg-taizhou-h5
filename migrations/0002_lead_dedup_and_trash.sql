ALTER TABLE leads ADD COLUMN client_id TEXT NULL;
ALTER TABLE leads ADD COLUMN suspicious_group_id TEXT NULL;
ALTER TABLE leads ADD COLUMN status_before_delete TEXT NULL;
ALTER TABLE leads ADD COLUMN deleted_at TEXT NULL;
ALTER TABLE leads ADD COLUMN deleted_by TEXT NULL;
ALTER TABLE leads ADD COLUMN delete_reason TEXT NULL;

CREATE TABLE IF NOT EXISTS lead_operation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('soft_delete', 'restore')),
  actor TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (claim_code) REFERENCES leads(claim_code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leads_dedup
  ON leads(client_id, campaign, service, created_at)
  WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_client_recent
  ON leads(client_id, created_at)
  WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_suspicious_group
  ON leads(suspicious_group_id)
  WHERE suspicious_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);
CREATE INDEX IF NOT EXISTS idx_operation_history_claim_code ON lead_operation_history(claim_code);
CREATE INDEX IF NOT EXISTS idx_operation_history_created_at ON lead_operation_history(created_at);
