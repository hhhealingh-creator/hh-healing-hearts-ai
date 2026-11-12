CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agents (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  mode          TEXT NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto', 'human_review')),
  tasks_today   INTEGER NOT NULL DEFAULT 0,
  success_rate  NUMERIC(5,2) NOT NULL DEFAULT 100,
  last_run_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS accounts (
  id                 TEXT PRIMARY KEY,
  platform           TEXT NOT NULL CHECK (platform IN ('facebook','instagram')),
  name               TEXT NOT NULL,
  handle             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'disconnected'
                     CHECK (status IN ('connected','disconnected','error')),
  followers          INTEGER NOT NULL DEFAULT 0,
  publishing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content       TEXT NOT NULL,
  platforms     TEXT[] NOT NULL,
  media_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','scheduled','publishing','published','failed','needs_review')),
  scheduled_for TIMESTAMPTZ,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics       JSONB NOT NULL DEFAULT
                '{"impressions":0,"reach":0,"likes":0,"comments":0,"shares":0}'
);

CREATE TABLE IF NOT EXISTS comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author       TEXT NOT NULL,
  message      TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('facebook','instagram')),
  status       TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','auto_replied','escalated','resolved')),
  category     TEXT CHECK (category IN
               ('routine','sensitive','complaint','medical','donation','beneficiary')),
  reply        TEXT,
  assigned_to  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id                 INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  org_name           TEXT NOT NULL,
  timezone           TEXT NOT NULL DEFAULT 'America/New_York',
  auto_publish       BOOLEAN NOT NULL DEFAULT TRUE,
  auto_reply         BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start  TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end    TEXT NOT NULL DEFAULT '07:00',
  escalation_email   TEXT NOT NULL,
  credentials        JSONB NOT NULL DEFAULT '{}',
  emergency_stop     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS activity_log (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor   TEXT NOT NULL,
  role    TEXT NOT NULL,
  action  TEXT NOT NULL,
  target  TEXT NOT NULL,
  at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_status      ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled   ON posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_comments_status   ON comments(status);
CREATE INDEX IF NOT EXISTS idx_activity_at       ON activity_log(at DESC);