/**
 * Standardized API Response Format
 * Ensures consistent error/success responses across all endpoints
 */

import { Response } from 'express';

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Send success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  } as ApiResponse<T>);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  message: string,
  code: string = 'UNKNOWN_ERROR',
  statusCode = 500
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
    },
  } as ApiResponse);
}

/**
 * Send validation error response
 */
export function sendValidationError(res: Response, message: string): void {
  sendError(res, message, 'VALIDATION_ERROR', 400);
}

/**
 * Send not found response
 */
export function sendNotFound(res: Response, resource: string = 'Resource'): void {
  sendError(res, `${resource} not found`, 'NOT_FOUND', 404);
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res: Response, message: string = 'Authentication required'): void {
  sendError(res, message, 'UNAUTHORIZED', 401);
}

/**
 * Send forbidden response
 */
export function sendForbidden(res: Response, message: string = 'Access denied'): void {
  sendError(res, message, 'FORBIDDEN', 403);
}
