/**
 * Anti-cheat service for validating game submissions
 */

import GameSession from '../models/GameSession';
import GameStats from '../models/GameStats';
import { v4 as uuidv4 } from 'uuid';

export interface GameSubmission {
  gameId: string;
  userId: string | null;
  guestId: string | null;
  result: 'win' | 'loss' | 'draw';
  score?: number;
  gameData: any;
  timestamp: number;
  nonce: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  suspicious?: boolean;
}

/**
 * Validate game submission
 */
export const validateGameSubmission = async (
  submission: GameSubmission
): Promise<ValidationResult> => {
  try {
    // 1. Check nonce (replay attack prevention)
    const nonceCheck = await checkNonce(submission.nonce, submission.timestamp);
    if (!nonceCheck.isValid) {
      return {
        isValid: false,
        reason: nonceCheck.reason,
        suspicious: true,
      };
    }

    // 2. Check timestamp (prevent old submissions)
    const timestampCheck = checkTimestamp(submission.timestamp);
    if (!timestampCheck.isValid) {
      return {
        isValid: false,
        reason: timestampCheck.reason,
        suspicious: true,
      };
    }

    // 3. Check rate limiting
    const rateLimitCheck = await checkRateLimit(submission.userId, submission.guestId);
    if (!rateLimitCheck.isValid) {
      return {
        isValid: false,
        reason: rateLimitCheck.reason,
        suspicious: true,
      };
    }

    // 4. Validate score is reasonable
    const scoreCheck = validateScore(submission.score, submission.result);
    if (!scoreCheck.isValid) {
      return {
        isValid: false,
        reason: scoreCheck.reason,
        suspicious: true,
      };
    }

    // 5. Check for suspicious patterns
    const patternCheck = await checkSuspiciousPatterns(submission);
    if (patternCheck.suspicious) {
      return {
        isValid: false,
        reason: patternCheck.reason,
        suspicious: true,
      };
    }

    return { isValid: true };
  } catch (error: any) {
    return {
      isValid: false,
      reason: `Validation error: ${error.message}`,
      suspicious: true,
    };
  }
};

/**
 * Check if nonce is valid and not reused
 * In production, use Redis for this
 */
const nonceCache = new Map<string, number>(); // In-memory cache (use Redis in production)
const NONCE_TTL = 5 * 60 * 1000; // 5 minutes

async function checkNonce(nonce: string, timestamp: number): Promise<ValidationResult> {
  if (!nonce || typeof nonce !== 'string') {
    return {
      isValid: false,
      reason: 'Nonce is required',
    };
  }

  // Check if nonce was already used
  const existingTimestamp = nonceCache.get(nonce);
  if (existingTimestamp) {
    return {
      isValid: false,
      reason: 'Nonce already used (replay attack detected)',
    };
  }

  // Store nonce with TTL
  nonceCache.set(nonce, timestamp);
  setTimeout(() => {
    nonceCache.delete(nonce);
  }, NONCE_TTL);

  return { isValid: true };
}

/**
 * Check if timestamp is within acceptable range
 */
function checkTimestamp(timestamp: number): ValidationResult {
  const now = Date.now();
  const timeDiff = Math.abs(now - timestamp);

  // Allow submissions within 5 minutes
  if (timeDiff > 5 * 60 * 1000) {
    return {
      isValid: false,
      reason: 'Timestamp too old or too far in future',
    };
  }

  return { isValid: true };
}

/**
 * Check rate limiting
 */
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 submissions per minute

async function checkRateLimit(
  userId: string | null,
  guestId: string | null
): Promise<ValidationResult> {
  const identifier = userId || guestId || 'unknown';
  const now = Date.now();

  const limit = rateLimitCache.get(identifier);

  if (!limit || now > limit.resetAt) {
    // Reset or create new limit
    rateLimitCache.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });
    return { isValid: true };
  }

  if (limit.count >= RATE_LIMIT_MAX) {
    return {
      isValid: false,
      reason: 'Rate limit exceeded. Please wait before submitting again.',
    };
  }

  limit.count++;
  return { isValid: true };
}

/**
 * Validate score is reasonable
 */
function validateScore(score: number | undefined, result: string): ValidationResult {
  if (score === undefined) {
    // Score is optional, will be calculated on server
    return { isValid: true };
  }

  if (typeof score !== 'number' || !isFinite(score)) {
    return {
      isValid: false,
      reason: 'Invalid score format',
    };
  }

  // Check for suspiciously high scores
  if (score > 1000000) {
    return {
      isValid: false,
      reason: 'Score too high (suspicious)',
      suspicious: true,
    };
  }

  // Check for negative scores (unless allowed)
  if (score < 0 && result !== 'loss') {
    return {
      isValid: false,
      reason: 'Invalid score for result type',
    };
  }

  return { isValid: true };
}

/**
 * Check for suspicious patterns
 */
async function checkSuspiciousPatterns(submission: GameSubmission): Promise<ValidationResult> {
  // 1. Check for too many wins in short time
  if (submission.result === 'win' && submission.userId) {
    const recentWins = await GameStats.findOne({ userId: submission.userId, gameId: submission.gameId });
    if (recentWins) {
      const winRate = recentWins.wins / (recentWins.wins + recentWins.losses + recentWins.draws || 1);
      // Suspicious if win rate > 95% with significant games
      if (winRate > 0.95 && (recentWins.wins + recentWins.losses) > 20) {
        return {
          isValid: true, // Still valid, but flagged
          suspicious: true,
          reason: 'Unusually high win rate detected',
        };
      }
    }
  }

  // 2. Check for rapid submissions
  const recentSessions = await GameSession.countDocuments({
    $or: [
      { 'players.userId': submission.userId },
      { 'players.guestId': submission.guestId },
    ],
    finishedAt: {
      $gte: new Date(Date.now() - 60 * 1000), // Last minute
    },
  });

  if (recentSessions > 5) {
    return {
      isValid: true, // Still valid, but flagged
      suspicious: true,
      reason: 'Too many games finished in short time',
    };
  }

  return { isValid: true };
}

/**
 * Create a game session record for audit trail
 */
export const createGameSession = async (
  gameId: string,
  players: Array<{ userId: string | null; guestId: string | null; score: number; result: 'win' | 'loss' | 'draw' }>,
  gameData: any,
  isValid: boolean = true
): Promise<string> => {
  const sessionId = uuidv4();
  const startedAt = new Date(Date.now() - 5 * 60 * 1000); // Assume game took 5 minutes (adjust based on actual)
  const finishedAt = new Date();

  await GameSession.create({
    gameId,
    sessionId,
    players,
    gameData,
    startedAt,
    finishedAt,
    duration: Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000),
    isValid,
  });

  return sessionId;
};

/**
 * Mark game session as invalid (cheat detected)
 */
export const markSessionInvalid = async (sessionId: string): Promise<void> => {
  await GameSession.updateOne(
    { sessionId },
    { isValid: false }
  );
};

