/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and credential stuffing
 */

import rateLimit from 'express-rate-limit';

// Auth endpoints: 20 attempts per 15 minutes (relaxed for testing)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: {
    success: false,
    error: 'Too many attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Invite redeem: 3 attempts per hour (prevent brute force)
export const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: 'Too many invite code attempts. Please wait and try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter: 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check-in limiter: 10 per minute (prevent spam)
export const checkinLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 check-ins per minute
  message: {
    success: false,
    error: 'Too many check-ins, please wait'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Connection limiter: 5 per hour (prevent abuse)
export const connectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 connection attempts per hour
  message: {
    success: false,
    error: 'Too many connection attempts, please wait'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
