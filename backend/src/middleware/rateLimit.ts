/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and credential stuffing
 */

import rateLimit from 'express-rate-limit';

// Auth endpoints: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
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
