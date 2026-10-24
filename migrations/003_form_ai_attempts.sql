CREATE TABLE IF NOT EXISTS form_ai_attempts (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  process_id TEXT NOT NULL REFERENCES processes(id),
  payload TEXT NOT NULL CHECK(json_valid(payload))
);
CREATE INDEX IF NOT EXISTS form_ai_attempts_by_process ON form_ai_attempts(process_id, sequence);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (3, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
