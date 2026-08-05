CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  store TEXT NOT NULL DEFAULT 'taizhou',
  campaign TEXT NOT NULL DEFAULT 'taizhou-opening-2026',
  service TEXT NOT NULL,
  language TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'direct',
  page_path TEXT,
  device_type TEXT,
  browser_family TEXT,
  event_stage TEXT NOT NULL DEFAULT 'claim_opened',
  status TEXT NOT NULL DEFAULT 'new',
  note TEXT NOT NULL DEFAULT '',
  status_changed_at TEXT
);

CREATE TABLE IF NOT EXISTS lead_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_code TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY (claim_code) REFERENCES leads(claim_code) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_claim_code ON leads(claim_code);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_service ON leads(service);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_store ON leads(store);
CREATE INDEX IF NOT EXISTS idx_history_claim_code ON lead_status_history(claim_code);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON lead_status_history(changed_at);
