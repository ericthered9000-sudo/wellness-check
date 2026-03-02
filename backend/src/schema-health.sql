-- Google Fit Integration Schema
-- Add to existing database

-- Google Fit OAuth connections
CREATE TABLE IF NOT EXISTS google_fit_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  google_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT NOT NULL,
  token_expires_at DATETIME,
  scopes TEXT, -- JSON array of granted scopes
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_sync_at DATETIME,
  sync_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Health data synced from providers
CREATE TABLE IF NOT EXISTS health_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL CHECK(source IN ('google_fit', 'apple_health', 'manual', 'fitbit')),
  data_type TEXT NOT NULL CHECK(data_type IN ('steps', 'heart_rate', 'sleep', 'weight', 'calories', 'distance', 'active_minutes')),
  value REAL NOT NULL,
  unit TEXT,
  metadata TEXT, -- JSON for additional data
  recorded_at DATETIME NOT NULL,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sleep sessions (detailed sleep data)
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'google_fit',
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  deep_minutes INTEGER,
  light_minutes INTEGER,
  rem_minutes INTEGER,
  awake_minutes INTEGER,
  efficiency_score REAL, -- percentage of time actually sleeping
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Heart rate readings
CREATE TABLE IF NOT EXISTS heart_rate_readings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'google_fit',
  bpm REAL NOT NULL,
  recorded_at DATETIME NOT NULL,
  activity_context TEXT, -- 'resting', 'walking', 'exercise', 'sleep'
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step counts (daily summaries)
CREATE TABLE IF NOT EXISTS step_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  distance_meters REAL,
  calories INTEGER,
  active_minutes INTEGER,
  source TEXT NOT NULL DEFAULT 'google_fit',
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Sync status tracking
CREATE TABLE IF NOT EXISTS health_sync_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  sync_type TEXT NOT NULL CHECK(sync_type IN ('full', 'delta', 'manual')),
  status TEXT NOT NULL CHECK(status IN ('started', 'completed', 'failed')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_data_user_type ON health_data(user_id, data_type);
CREATE INDEX IF NOT EXISTS idx_health_data_recorded ON health_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user ON sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_heart_rate_user ON heart_rate_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_steps_user_date ON step_summaries(user_id, date);