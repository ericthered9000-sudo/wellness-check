import express from 'express';

const router = express.Router();

// Generate 6-character invite code (e.g., HB-8472)
function generateInviteCode(): string {
  const chars = '0123456789';
  const code = Array(4).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `HB-${code}`;
}

export function setupInviteRoutes(db: any) {
  // Create invite_codes table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      senior_id TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (senior_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
    CREATE INDEX IF NOT EXISTS idx_invite_codes_senior ON invite_codes(senior_id);
  `);

  // POST /api/invites - Generate new invite code for senior
  router.post('/', (req, res) => {
    const { seniorId } = req.body;
    
    if (!seniorId) {
      return res.status(400).json({ error: 'seniorId required' });
    }
    
    const code = generateInviteCode();
    const id = `invite-${seniorId}-${code}`;
    
    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    try {
      // Invalidate any existing codes for this senior
      db.prepare('UPDATE invite_codes SET used = 1 WHERE senior_id = ?').run(seniorId);
      
      // Create new code
      const stmt = db.prepare(
        'INSERT INTO invite_codes (id, code, senior_id, used, expires_at) VALUES (?, ?, ?, ?, ?)'
      );
      stmt.run(id, code, seniorId, 0, expiresAt.toISOString());
      
      res.status(201).json({ 
        id, 
        code, 
        seniorId, 
        expiresAt: expiresAt.toISOString() 
      });
    } catch (error: any) {
      console.error('Failed to create invite code:', error);
      res.status(500).json({ error: 'Failed to generate invite code' });
    }
  });

  // POST /api/invites/redeem - Family member redeems code
  router.post('/redeem', (req, res) => {
    const { code, familyMemberId, seniorId } = req.body;
    
    if (!code || !familyMemberId || !seniorId) {
      return res.status(400).json({ error: 'code, familyMemberId, and seniorId required' });
    }
    
    try {
      // Find the invite code
      const invite = db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(code) as any;
      
      if (!invite) {
        return res.status(404).json({ error: 'Invalid invite code' });
      }
      
      if (invite.used) {
        return res.status(409).json({ error: 'Invite code already used' });
      }
      
      if (new Date(invite.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Invite code expired' });
      }
      
      // Verify code belongs to this senior
      if (invite.senior_id !== seniorId) {
        return res.status(400).json({ error: 'Code does not match senior' });
      }
      
      // Mark code as used
      db.prepare('UPDATE invite_codes SET used = 1 WHERE id = ?').run(invite.id);
      
      // Create family connection
      const connectionId = `${seniorId}-${familyMemberId}`;
      const stmt = db.prepare(
        'INSERT INTO family_connections (id, senior_id, family_member_id, permission_level, role) VALUES (?, ?, ?, ?, ?)'
      );
      stmt.run(connectionId, seniorId, familyMemberId, 'view', 'viewer');
      
      res.status(201).json({ 
        message: 'Connected successfully',
        seniorId: invite.senior_id,
        familyMemberId 
      });
    } catch (error: any) {
      console.error('Failed to redeem invite code:', error);
      res.status(500).json({ error: 'Failed to redeem invite code' });
    }
  });

  // GET /api/invites/:seniorId - Get active invite code for senior
  router.get('/:seniorId', (req, res) => {
    const { seniorId } = req.params;
    
    try {
      const invite = db.prepare('SELECT * FROM invite_codes WHERE senior_id = ? AND used = 0').get(seniorId) as any;
      
      if (!invite) {
        return res.status(404).json({ error: 'No active invite code' });
      }
      
      res.json({
        code: invite.code,
        expiresAt: invite.expires_at
      });
    } catch (error: any) {
      console.error('Failed to fetch invite code:', error);
      res.status(500).json({ error: 'Failed to fetch invite code' });
    }
  });
}

export default router;
