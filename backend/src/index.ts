import 'dotenv/config'; // Load .env file
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger';
import { analyzeWellness, recordDailyScore, checkForAlerts } from './pattern';
import medicationsRouter from './routes/medications';
import reportsRouter from './routes/reports';
import visitsRouter from './routes/visits';
import wellnessRouter from './routes/wellness';
import { initVisits } from './visits';
import { checkPermission, PERMISSION_LEVELS } from './permissions';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { AuthRequest } from './types/auth';
import invitesRouter from './routes/invites';
import accountRouter from './routes/account';
import subscriptionsRouter from './routes/subscriptions';
import { apiLimiter, checkinLimiter, connectionLimiter } from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway/load balancers (fixes rate limiter behind proxy)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow specific origins only - no wildcards
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:3000',
      'http://localhost:3001',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'https://lucid-growth-production-c2f0.up.railway.app',
      // Expo development
      'exp://localhost',
      'exp://192.168.1.1',
    ];
    // Also allow any origin that matches Expo's local network pattern
    const isLocalExpo = origin && (
      origin.startsWith('exp://192.168.') ||
      origin.startsWith('exp://10.') ||
      origin.startsWith('exp://172.')
    );
    if (allowedOrigins.includes(origin) || isLocalExpo) {
      callback(null, true);
    } else {
      logger.debug('CORS blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// HTTPS enforcement middleware (for self-hosting, Railway handles HTTPS termination)
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false') {
    logger.debug('Redirecting to HTTPS', { url: req.url });
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Apply general API rate limiter to all routes
app.use('/api', apiLimiter);

// Database setup
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

logger.info('Database initialized', { path: dbPath });
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

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'family', 'premium')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK(billing_cycle IN ('monthly', 'annual')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'trialing', 'cancelled', 'expired', 'unpaid')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    current_period_start DATETIME,
    current_period_end DATETIME,
    cancel_at_period_end INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checkout_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier TEXT NOT NULL,
    billing TEXT NOT NULL,
    stripe_session_id TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'expired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
  CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user ON checkout_sessions(user_id);

  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
  CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user ON checkout_sessions(user_id);
`);

// Migration: Add password_hash column if missing (for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
  logger.info('Migration: Added password_hash column');
} catch (e) {
  // Column already exists - that's fine
  logger.debug('password_hash column already exists');
}

// Create HTTP server for Socket.io
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.debug('WebSocket client connected', { socketId: socket.id });

  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug('Socket joined user room', { socketId: socket.id, room: `user:${userId}` });
  });

  socket.on('join:family', (seniorId: string) => {
    socket.join(`family:${seniorId}`);
    logger.debug('Socket joined family room', { socketId: socket.id, room: `family:${seniorId}` });
  });

  socket.on('disconnect', () => {
    logger.debug('WebSocket client disconnected', { socketId: socket.id });
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

// Register auth routes FIRST before other middleware
logger.debug('Registering auth routes...');
app.use('/api/v1/auth', authRouter(db));
logger.debug('Auth routes registered');

// Wellness routes (must be before medications to avoid route conflicts)
app.use('/api/v1/wellness', wellnessRouter(db));

// Medication routes
app.use('/api/v1/medications', medicationsRouter);

// Weekly reports routes
app.use('/api/v1/reports', reportsRouter);

// Doctor visits routes
app.use('/api/v1/visits', visitsRouter);

// Initialize visits tables
initVisits(db as any);

// Invite code routes for family connections
app.use('/api/v1/invites', invitesRouter(db));

// Account management routes (delete account, get account info)
app.use('/api/v1/account', accountRouter(db));

// Subscription routes (plans, checkout, webhooks)
app.use('/api/v1/subscriptions', subscriptionsRouter(db));

// Permission helpers - DEPRECATED: Use authMiddleware instead
// Keeping for backward compatibility but marking as deprecated
function setUserPermissions(req: express.Request, res: express.Response, next: express.NextFunction) {
  logger.warn('setUserPermissions is deprecated. Use authMiddleware for protected routes.');
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    req.userId = 'demo-user';
    req.permissions = { ...PERMISSION_LEVELS.viewer };
    return next();
  }
  
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

// Users API - Protected routes
app.post('/api/users', authMiddleware, (req: AuthRequest, res) => {
  // Only allow self-registration or admin
  const { id, email, role } = req.body;
  
  // Verify user can only create their own account
  if (req.user && req.user.id !== id) {
    return res.status(403).json({ error: 'Cannot create account for another user' });
  }
  
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

app.get('/api/users/:id', authMiddleware, (req: AuthRequest, res) => {
  // Users can only view their own profile
  if (req.user && req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // Don't return password hash
  const { password_hash, ...safeUser } = user as any;
  res.json(safeUser);
});

// Activity Events API - Protected routes
app.post('/api/activity', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id; // From token, not body (authMiddleware guarantees user is set)
  const { type, value } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Missing required field: type' });
  }
  
  const id = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const stmt = db.prepare(
      'INSERT INTO activity_events (id, user_id, type, value) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, userId, type, JSON.stringify(value || null));
    
    const score = recordDailyScore(db, userId);
    
    const newActivity = { id, userId, type, timestamp: new Date().toISOString() };
    emitWellnessUpdate(userId, { type: 'activity', data: newActivity });
    
    // Emit to family members who have permission
    const connections = db.prepare(
      'SELECT family_member_id FROM family_connections WHERE senior_id = ?'
    ).all(userId);
    
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

app.get('/api/activity/:userId', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Users can only view their own activity, or family can view their senior's
  if (req.user && req.user.id !== userId) {
    // Check if user is family member with permission to view this senior
    const connection = db.prepare(
      'SELECT * FROM family_connections WHERE senior_id = ? AND family_member_id = ?'
    ).get(userId, req.user.id);
    
    if (!connection) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
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

// Wellness Score API - Protected routes
app.get('/api/wellness/:userId', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  // Users can only view their own wellness, or family can view their senior's
  if (req.user && req.user.id !== userId) {
    // Check if user is family member with permission to view this senior
    const connection = db.prepare(
      'SELECT * FROM family_connections WHERE senior_id = ? AND family_member_id = ?'
    ).get(userId, req.user.id);
    
    if (!connection) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const score = db.prepare(
    'SELECT * FROM wellness_scores WHERE senior_id = ? AND date = ?'
  ).get(userId, targetDate);
  
  if (!score) {
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

// Family Connections API - Protected routes
app.post('/api/connections', authMiddleware, connectionLimiter, (req: AuthRequest, res) => {
  const { seniorId, familyMemberId, permissionLevel = 'view', role = 'viewer' } = req.body;
  
  // Users can only create connections for themselves
  if (req.user && req.user.id !== familyMemberId) {
    return res.status(403).json({ error: 'Cannot create connection for another user' });
  }
  
  if (!seniorId || !familyMemberId) {
    return res.status(400).json({ error: 'Missing required fields: seniorId, familyMemberId' });
  }
  
  // SECURITY: Check subscription limits before allowing new connection
  try {
    // Get senior's subscription tier
    const subscription = db.prepare(`
      SELECT tier FROM subscriptions WHERE user_id = ? AND status = 'active'
    `).get(seniorId) as any;
    
    const tier = subscription?.tier || 'free';
    const tierLimits: Record<string, number> = {
      free: 1,
      family: 5,
      premium: 999999 // unlimited
    };
    
    const maxFamilyMembers = tierLimits[tier] || 1;
    
    // Count current family members for this senior
    const currentCount = db.prepare(`
      SELECT COUNT(*) as count FROM family_connections WHERE senior_id = ?
    `).get(seniorId) as { count: number };
    
    if (currentCount.count >= maxFamilyMembers) {
      return res.status(403).json({ 
        error: 'Subscription limit reached',
        message: `Your ${tier} plan allows ${maxFamilyMembers} family member${maxFamilyMembers === 1 ? '' : 's'}. Upgrade to add more.`,
        current: currentCount.count,
        max: maxFamilyMembers,
        tier: tier
      });
    }
    
    const id = `${seniorId}-${familyMemberId}`;
    
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

app.get('/api/connections/family/:familyMemberId', authMiddleware, (req: AuthRequest, res) => {
  // Users can only view their own connections
  if (req.user && req.user.id !== req.params.familyMemberId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const connections = db.prepare(
    'SELECT fc.*, u.email as senior_email FROM family_connections fc JOIN users u ON fc.senior_id = u.id WHERE fc.family_member_id = ?'
  ).all(req.params.familyMemberId);
  res.json(connections);
});

app.post('/api/connections/:id/role', authMiddleware, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be viewer, editor, or admin' });
  }
  
  // Verify user has permission to modify this connection
  const connection = db.prepare('SELECT * FROM family_connections WHERE id = ?').get(id) as any;
  if (!connection) {
    return res.status(404).json({ error: 'Connection not found' });
  }
  
  // Only the family member or an admin can update the role
  if (req.user && req.user.id !== connection.family_member_id) {
    // Check if user is admin on this connection
    if (connection.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  try {
    const stmt = db.prepare('UPDATE family_connections SET role = ? WHERE id = ?');
    const result = stmt.run(role, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json({ success: true, role });
  } catch (error: any) {
    logger.error('Failed to update role', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Check-in API - Protected route
app.post('/api/checkin', authMiddleware, checkinLimiter, (req: AuthRequest, res) => {
  // SECURITY: User can only check in for themselves
  const userId = req.user!.id;
  const { status, message } = req.body;
  
  const id = `${userId}-${Date.now()}`;
  
  try {
    const stmt = db.prepare(
      'INSERT INTO activity_events (id, user_id, type, value) VALUES (?, ?, ?, ?)'
    );
    stmt.run(id, userId, 'checkin', JSON.stringify({ status, message }));
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as { role?: 'senior' | 'family' } | undefined;
    
    if (user?.role === 'senior') {
      const checkInData = {
        id,
        userId,
        status,
        message,
        timestamp: new Date().toISOString()
      };
      
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

// Push Notification Endpoints - Protected routes
app.post('/api/notifications/register', authMiddleware, (req: AuthRequest, res) => {
  const userId = req.user!.id; // From token, not body (authMiddleware guarantees user is set)
  const { subscription } = req.body;
  
  if (!subscription) {
    return res.status(400).json({ error: 'Missing required field: subscription' });
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

app.get('/api/notifications/subscriptions/:userId', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Users can only view their own subscriptions
  if (req.user && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const subscriptions = db.prepare(
    'SELECT id, endpoint, created_at FROM push_subscriptions WHERE user_id = ?'
  ).all(userId);
  
  res.json(subscriptions);
});

// Pattern Analysis API - Protected routes
app.get('/api/pattern/:userId', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Users can only view their own pattern, or family can view their senior's
  if (req.user && req.user.id !== userId) {
    const connection = db.prepare(
      'SELECT * FROM family_connections WHERE senior_id = ? AND family_member_id = ?'
    ).get(userId, req.user.id);
    
    if (!connection) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  try {
    const score = analyzeWellness(db, userId);
    res.json(score);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze pattern' });
  }
});

app.post('/api/pattern/:userId/record', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Users can only record their own score
  if (req.user && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const score = recordDailyScore(db, userId);
    res.json({ score });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record daily score' });
  }
});

app.get('/api/alerts/:userId', authMiddleware, (req: AuthRequest, res) => {
  const { userId } = req.params;
  
  // Users can only view their own alerts, or family can view their senior's
  if (req.user && req.user.id !== userId) {
    const connection = db.prepare(
      'SELECT * FROM family_connections WHERE senior_id = ? AND family_member_id = ?'
    ).get(userId, req.user.id);
    
    if (!connection) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  
  try {
    const alerts = checkForAlerts(db, userId);
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check for alerts' });
  }
});

// Start server
server.listen(PORT, () => {
  logger.info('Wellness Check API running', { port: PORT, url: `http://localhost:${PORT}` });
  logger.info('Health check endpoint', { url: `http://localhost:${PORT}/health` });
  logger.info('WebSocket server ready');
  logger.info('Auth routes registered', { routes: ['/api/auth/register', '/api/auth/login'] });
});
