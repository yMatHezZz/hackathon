PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hub_meta (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO hub_meta(id, revision) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS processes (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)));
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL CHECK(origin IN ('prefeitura','requerente')),
  priority TEXT NOT NULL CHECK(priority IN ('Baixa','Média','Alta','Urgente')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload))
);
CREATE INDEX IF NOT EXISTS tickets_by_origin_date ON tickets(origin, created_at DESC);
CREATE TABLE IF NOT EXISTS messages (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  kind TEXT NOT NULL CHECK(kind IN ('customer','support','internal','log')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_by_ticket ON messages(ticket_id, sequence);
CREATE TABLE IF NOT EXISTS knowledge (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)));
INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
