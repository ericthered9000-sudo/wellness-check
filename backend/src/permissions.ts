/**
 * Permission Management
 * Handles role-based access control for family connections
 */

import { Request, Response, NextFunction } from 'express';

// Permission types
export interface Permissions {
  canViewWellness: boolean;
  canViewActivity: boolean;
  canViewAlerts: boolean;
  canInvite: boolean;
  isAdmin: boolean;
  userRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      permissions?: Permissions;
    }
  }
}

// Permission levels
export const PERMISSION_LEVELS: Record<string, Permissions> = {
  viewer: {
    canViewWellness: true,
    canViewActivity: true,
    canViewAlerts: false,
    canInvite: false,
    isAdmin: false
  },
  editor: {
    canViewWellness: true,
    canViewActivity: true,
    canViewAlerts: true,
    canInvite: false,
    isAdmin: false
  },
  admin: {
    canViewWellness: true,
    canViewActivity: true,
    canViewAlerts: true,
    canInvite: true,
    isAdmin: true
  }
};

// Permission middleware
export function checkPermission(
  requiredPermission: keyof Permissions
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId, permissions } = req;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!permissions) {
      return res.status(403).json({ error: 'Permission check failed' });
    }
    
    // Handle userRole as a special case
    if (requiredPermission === 'userRole' && !permissions.userRole) {
      return res.status(403).json({ error: 'Permission check failed' });
    }
    
    // Check other permissions
    if (permissions[requiredPermission] !== true) {
      return res.status(403).json({ error: `Insufficient permission: ${requiredPermission} required` });
    }
    
    next();
  };
}

// Get user permissions for a senior
export function getUserPermissions(db: any, userId: string, seniorId: string): Permissions | null {
  const stmt = db.prepare(`
    SELECT fc.role, u.role as userRole
    FROM family_connections fc
    JOIN users u ON fc.family_member_id = u.id
    WHERE fc.senior_id = ? AND fc.family_member_id = ?
  `);
  
  const connection = stmt.get(seniorId, userId) as any;
  
  if (!connection) {
    return null;
  }
  
  // Get base permissions based on role
  const basePermissions = PERMISSION_LEVELS[connection.role] || PERMISSION_LEVELS.viewer;
  
  return {
    ...basePermissions,
    userRole: connection.userRole
  };
}

// Admin permission check
export function requireAdminPermission(db: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { userId, userRole } = req;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (userRole === 'senior') {
      return res.status(403).json({ error: 'Seniors cannot manage family connections' });
    }
    
    const connections = db.prepare(`
      SELECT * FROM family_connections WHERE family_member_id = ?
    `).all(userId) as any[];
    
    // Check if any connection has admin role
    const hasAdminPermission = connections.some(
      (c: any) => c.role === 'admin'
    );
    
    if (!hasAdminPermission) {
      return res.status(403).json({ error: 'Admin permission required' });
    }
    
    req.permissions = {
      ...PERMISSION_LEVELS.admin,
      userRole: userRole || 'family'
    };
    
    next();
  };
}

// Export for use in index.ts
export function setUserPermissions(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  req.userId = userId || 'demo-user';
  
  // Default permissions
  req.permissions = {
    canViewWellness: true,
    canViewActivity: true,
    canViewAlerts: true,
    canInvite: false,
    isAdmin: false,
    userRole: 'family'
  };
  
  next();
}
