import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import cors from 'cors';
import helmet from 'helmet';
import { analyzeWellness, recordDailyScore, checkForAlerts } from './pattern';
import medicationsRouter from './routes/medications';
import reportsRouter from './routes/reports';
import visitsRouter from './routes/visits';
import { initVisits } from './visits';
import { checkPermission, PERMISSION_LEVELS } from './permissions';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { setupInviteRoutes } from './routes/invites';
// import healthRouter from './routes/health'; // TODO: Fix fetch import

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Database setup - use /data directory on Railway for persistent storage
import { existsSync, mkdirSync } from 'fs';

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? `${process.env.RAILWAY_VOLUME_MOUNT_PATH}/wellness.db`
  : process.env.DATA_DIR 
    ? `${process.env.DATA_DIR}/wellness.db`
    : './wellness.db';

const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
if (dbDir && !existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

console.log(`Database path: ${dbPath}`);
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK(role IN ('senior', 'family')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Add password_hash column if it doesn't exist (for existing databases)
  INSERT OR IGNORE INTO pragma_table_info SELECT 'password_hash', 'TEXT', 0, 0, 0 FROM pragma_table_info('users') LIMIT 0;

  CREATE TABLE IF NOT EXISTS senior_profiles (
    user_id TEXT PRIMARY KEY,
    timezone TEXT DEFAULT 'America/Chicago',
    home_lat REAL,
    home_lng REAL,
    home_radius REAL DEFAULT 100,
    health_share_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS family_connections (
    id TEXT PRIMARY KEY,
    senior_id TEXT NOT NULL,
    family_member_id TEXT NOT NULL,
    permission_level TEXT DEFAULT 'view' CHECK(permission_level IN ('view', 'alert', 'full')),
    role TEXT DEFAULT 'viewer' CHECK(role IN ('viewer', 'editor', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senior_id) REFERENCES users(id),
    FOREIGN KEY (family_member_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('motion', 'location', 'screen', 'charging', 'checkin')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS wellness_scores (
    id TEXT PRIMARY KEY,
    senior_id TEXT NOT NULL,
    date DATE NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
    factors TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senior_id) REFERENCES users(id),
    UNIQUE(senior_id, date)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    senior_id TEXT NOT NULL,
    type TEXT NOT NULL,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senior_id) REFERENCES users(id)
  );

  -- Medication Reminders Tables
  CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    unit TEXT,
    instructions TEXT,
    schedule TEXT,
    times TEXT,
    next_due DATETIME,
    last_taken DATETIME,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS medication_logs (
    id TEXT PRIMARY KEY,
    medication_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'taken',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
  CREATE INDEX IF NOT EXISTS idx_medication_logs_user ON medication_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_medication_logs_date ON medication_logs(taken_at);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Weekly Reports Table
  CREATE TABLE IF NOT EXISTS weekly_reports (
    id TEXT PRIMARY KEY,
    senior_id TEXT NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    avg_wellness_score REAL,
    steps_avg INTEGER,
    heart_rate_avg REAL,
    sleep_avg REAL,
    medication_adherence REAL,
    insights TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senior_id) REFERENCES users(id),
    UNIQUE(senior_id, week_start)
  );
`);

// Create HTTP server for Socket.io
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);

  // Join a room for a specific user
  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`Socket ${socket.id} joined room user:${userId}`);
  });

  // Join a room for family dashboard
  socket.on('join:family', (seniorId: string) => {
    socket.join(`family:${seniorId}`);
    console.log(`Socket ${socket.id} joined family room for senior:${seniorId}`);
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Helper function to emit real-time updates
function emitWellnessUpdate(userId: string, data: any) {
  io.to(`user:${userId}`).emit('wellness:update', data);
}

function emitFamilyUpdate(seniorId: string, data: any) {
  io.to(`family:${seniorId}`).emit('wellness:family_update', data);
}

function emitAlertNotification(seniorId: string, alert: string) {
  io.to(`family:${seniorId}`).emit('wellness:alert', { alert });
}

function emitCheckInNotification(seniorId: string, checkInData: any) {
  io.to(`family:${seniorId}`).emit('wellness:checkin', checkInData);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Medication routes
app.use('/api/medications', medicationsRouter);

// Auth routes
app.use('/api/auth', authRouter(db));

// Weekly reports routes
app.use('/api/reports', reportsRouter);

// Doctor visits routes
app.use('/api/visits', visitsRouter);

// Initialize visits tables
initVisits(db as any);

// Invite code routes for family connections
setupInviteRoutes(db as any);

// Health integration routes (Google Fit, etc.)
// TODO: Fix node-fetch import
// app.use('/api/health', healthRouter);

// ====== PERMISSION HELPERS ======

// Get user permissions middleware
function setUserPermissions(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    req.userId = 'demo-user';
    req.permissions = { ...PERMISSION_LEVELS.viewer };
    return next();
  }
  
  // Extract seniorId from route parameters if available
  let seniorId = req.params.seniorId || req.params.userId;
  if (!seniorId && req.params.familyMemberId) {
    seniorId = req.params.familyMemberId;
  }
  
  if (seniorId) {
    req.userId = userId;
    req.permissions = {
      canViewWellness: true,
      canViewActivity: true,
      canViewAlerts: true,
      canInvite: false,
      isAdmin: false,
      userRole: 'family'
    };
  }
  
  next();
}

app.use(setUserPermissions);

// Users API
app.post('/api/users', (req, res) => {
  const { id, email, role } = req.body;
  
  if (!id || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields: id, email, role' });
  }
  
  try {
    const stmt = db.prepare('INSERT INTO users (id, email, role) VALUES (?, ?, ?)');
    stmt.run(id, email, role);
    res.status(201).json({ id, email, role });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Activity Events API
app.post('/api/activity', (req, res) => {
  const { userId, type, value } = req.body;
  
  if (!userId || !type) {
    return res.status(400).json({ error: 'Missing required fields: userId, type' });
  }
  
  const id = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const stmt = db.prepare(
      'INSERT INTO activity_events (id, user_id, type, value) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, userId, type, JSON.stringify(value || null));
    
    // Record updated wellness score
    const score = recordDailyScore(db, userId);
    
    // Emit real-time updates
    const newActivity = { id, userId, type, timestamp: new Date().toISOString() };
    emitWellnessUpdate(userId, { type: 'activity', data: newActivity });
    
    // Get family connections for this user
    const connections = db.prepare(
      'SELECT family_member_id FROM family_connections WHERE senior_id = ?'
    ).all(userId);
    
    // Emit update to all family members
    connections.forEach((conn: any) => {
      emitFamilyUpdate(conn.family_member_id, {
        type: 'activity',
        data: newActivity
      });
    });
    
    res.status(201).json({ id, userId, type, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

app.get('/api/activity/:userId', (req, res) => {
  const { userId } = req.params;
  const { since, limit = '100' } = req.query;
  
  let query = 'SELECT * FROM activity_events WHERE user_id = ?';
  const params: any[] = [userId];
  
  if (since) {
    query += ' AND timestamp >= ?';
    params.push(since);
  }
  
  query += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit as string));
  
  const events = db.prepare(query).all(...params);
  res.json(events.map((e: any) => ({
    ...e,
    value: e.value ? JSON.parse(e.value) : null
  })));
});

// Wellness Score API
app.get('/api/wellness/:userId', (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const score = db.prepare(
    'SELECT * FROM wellness_scores WHERE senior_id = ? AND date = ?'
  ).get(userId, targetDate);
  
  if (!score) {
    // Calculate a placeholder score based on recent activity
    const recentActivity = db.prepare(`
      SELECT COUNT(*) as count FROM activity_events 
      WHERE user_id = ? AND timestamp >= datetime('now', '-24 hours')
    `).get(userId) as { count: number };
    
    const calculatedScore = Math.min(100, (recentActivity.count * 5) + 50);
    
    return res.json({
      seniorId: userId,
      date: targetDate,
      score: calculatedScore,
      factors: { activityCount: recentActivity.count },
      calculated: true
    });
  }
  
  res.json(score);
});

// Family Connections API
app.post('/api/connections', (req, res) => {
  const { seniorId, familyMemberId, permissionLevel = 'view', role = 'viewer' } = req.body;
  
  if (!seniorId || !familyMemberId) {
    return res.status(400).json({ error: 'Missing required fields: seniorId, familyMemberId' });
  }
  
  const id = `${seniorId}-${familyMemberId}`;
  
  try {
    const stmt = db.prepare(
      'INSERT INTO family_connections (id, senior_id, family_member_id, permission_level, role) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, seniorId, familyMemberId, permissionLevel, role);
    res.status(201).json({ id, seniorId, familyMemberId, permissionLevel, role });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Connection already exists' });
    }
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

app.get('/api/connections/family/:familyMemberId', (req, res) => {
  const connections = db.prepare(
    'SELECT fc.*, u.email as senior_email FROM family_connections fc JOIN users u ON fc.senior_id = u.id WHERE fc.family_member_id = ?'
  ).all(req.params.familyMemberId);
  res.json(connections);
});

app.post('/api/connections/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be viewer, editor, or admin' });
  }
  
  try {
    const stmt = db.prepare('UPDATE family_connections SET role = ? WHERE id = ?');
    const result = stmt.run(role, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json({ success: true, role });
  } catch (error: any) {
    console.error('Failed to update role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Check-in API
app.post('/api/checkin', (req, res) => {
  const { userId, status, message } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing required field: userId' });
  }
  
  const id = `${userId}-${Date.now()}`;
  
  try {
    // Record as activity event
    const stmt = db.prepare(
      'INSERT INTO activity_events (id, user_id, type, value) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, userId, 'checkin', JSON.stringify({ status, message }));
    
    // Get senior ID for notification
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as { role?: 'senior' | 'family' } | undefined;
    
    if (user?.role === 'senior') {
      // Emit real-time update to family
      const checkInData = {
        id,
        userId,
        status,
        message,
        timestamp: new Date().toISOString()
      };
      
      // Find family connections
      const connections = db.prepare(
        'SELECT family_member_id FROM family_connections WHERE senior_id = ?'
      ).all(userId);
      
      connections.forEach((conn: any) => {
        emitFamilyUpdate(conn.family_member_id, {
          type: 'checkin',
          data: checkInData
        });
      });
      
      emitCheckInNotification(userId, checkInData);
    }
    
    res.status(201).json({ id, userId, status, message, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// Push Notification Endpoints
app.post('/api/notifications/register', (req, res) => {
  const { userId, subscription } = req.body;
  
  if (!userId || !subscription) {
    return res.status(400).json({ error: 'Missing required fields: userId, subscription' });
  }
  
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription format' });
  }
  
  try {
    const id = `${userId}-${Date.now()}`;
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    );
    
    res.status(201).json({ success: true, subscriptionId: id });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Subscription already exists' });
    }
    res.status(500).json({ error: 'Failed to register subscription' });
  }
});

app.get('/api/notifications/subscriptions/:userId', (req, res) => {
  const { userId } = req.params;
  
  const subscriptions = db.prepare(
    'SELECT id, endpoint, created_at FROM push_subscriptions WHERE user_id = ?'
  ).all(userId);
  
  res.json(subscriptions);
});

// Pattern Analysis API
app.get('/api/pattern/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const score = analyzeWellness(db, userId);
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze pattern' });
  }
});

app.post('/api/pattern/:userId/record', (req, res) => {
  const { userId } = req.params;
  try {
    const score = recordDailyScore(db, userId);
    res.json({ score });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record daily score' });
  }
});

app.get('/api/alerts/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const alerts = checkForAlerts(db, userId);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check for alerts' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🏥 Wellness Check API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ WebSocket server ready`);
});
// Force rebuild Fri Mar 13 11:38:53 PM CDT 2026
