import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

/**
 * Rate limiter middleware
 * Limits number of requests per user/IP
 */

// In-memory store (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.',
};

/**
 * Create rate limiter middleware
 */
export const createRateLimiter = (options: Partial<RateLimitOptions> = {}) => {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = getIdentifier(req as AuthRequest);
    const now = Date.now();

    let limit = requestCounts.get(identifier);

    // Reset if window expired
    if (!limit || now > limit.resetAt) {
      limit = {
        count: 1,
        resetAt: now + opts.windowMs,
      };
      requestCounts.set(identifier, limit);
      return next();
    }

    // Check if limit exceeded
    if (limit.count >= opts.max) {
      res.status(429).json({
        message: opts.message,
        retryAfter: Math.ceil((limit.resetAt - now) / 1000),
      });
      return;
    }

    // Increment count
    limit.count++;
    next();
  };
};

/**
 * Get identifier for rate limiting (userId, IP, or guestId)
 */
function getIdentifier(req: AuthRequest): string {
  const authReq = req as AuthRequest;
  
  // Prefer authenticated user
  if (authReq.user?.userId) {
    return `user:${authReq.user.userId}`;
  }

  // Fallback to IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiter for score submissions (stricter)
 */
export const scoreSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 score submissions per minute
  message: 'Too many score submissions. Please wait before trying again.',
});

/**
 * Rate limiter for API endpoints (general)
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests. Please try again later.',
});

/**
 * Rate limiter for authentication endpoints (stricter)
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per 15 minutes
  message: 'Too many authentication attempts. Please try again later.',
});

