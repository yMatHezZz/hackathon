CREATE TABLE IF NOT EXISTS process_protocols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
