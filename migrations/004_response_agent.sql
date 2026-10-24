CREATE TABLE IF NOT EXISTS agent_settings (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)));
INSERT OR IGNORE INTO agent_settings(id,enabled) VALUES (1,1);
CREATE TABLE IF NOT EXISTS agent_training (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  target_message_id TEXT NOT NULL,
  status TEXT NOT NULL,
  lease_until INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  UNIQUE(ticket_id,target_message_id)
);
CREATE INDEX IF NOT EXISTS agent_runs_queue ON agent_runs(status,lease_until);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (4,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
