import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it in .env file.');
}
const JWT_EXPIRES_IN = '7d'; // 7 days

export const generateToken = (user: { id: string; email: string; role: 'senior' | 'family' }): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Try to get token from cookie first (httpOnly), then from Authorization header
  const token = req.cookies?.auth_token || req.headers.authorization?.substring(7);
  
  if (!token) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role
  };
  
  next();
};

export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
    }
  }
  
  next();
};

export const requireRole = (...roles: ('senior' | 'family')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};