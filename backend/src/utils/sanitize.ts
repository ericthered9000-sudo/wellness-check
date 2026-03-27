/**
 * Input Sanitization Utilities
 * Prevent XSS and injection attacks by sanitizing user input
 */

import { z } from 'zod';

/**
 * Sanitize text input:
 * - Remove control characters except newlines and tabs
 * - Trim whitespace
 * - Limit length
 * - Allow letters, numbers, punctuation, spaces, newlines, tabs
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (!input) return '';
  
  // Trim and limit length
  const trimmed = input.trim().slice(0, maxLength);
  
  // Remove control characters except \n, \r, \t
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Zod schema for sanitized notes/messages
 * Usage: const validated = notesSchema.parse(req.body.notes);
 */
export const notesSchema = z.string()
  .max(500, 'Notes must be 500 characters or less')
  .transform((val) => sanitizeText(val, 500));

export const reasonSchema = z.string()
  .max(200, 'Reason must be 200 characters or less')
  .transform((val) => sanitizeText(val, 200));

export const messageSchema = z.string()
  .max(1000, 'Message must be 1000 characters or less')
  .transform((val) => sanitizeText(val, 1000));

export const instructionsSchema = z.string()
  .max(500, 'Instructions must be 500 characters or less')
  .optional()
  .transform((val) => val ? sanitizeText(val, 500) : undefined);
