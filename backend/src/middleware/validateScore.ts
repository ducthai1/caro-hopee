import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { validateGameSubmission, createGameSession } from '../services/antiCheatService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to validate score submissions
 * Validates nonce, timestamp, rate limiting, and score reasonableness
 */
export const validateScore = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { result, score, gameData, timestamp, nonce } = req.body;
    const userId = req.user?.userId || null;
    const guestId = req.body.guestId || null;

    // Generate nonce if not provided (for backward compatibility)
    const submissionNonce = nonce || uuidv4();
    const submissionTimestamp = timestamp || Date.now();

    // Validate submission
    const validation = await validateGameSubmission({
      gameId,
      userId,
      guestId,
      result,
      score,
      gameData: gameData || {},
      timestamp: submissionTimestamp,
      nonce: submissionNonce,
    });

    if (!validation.isValid) {
      res.status(400).json({
        message: validation.reason || 'Invalid score submission',
        suspicious: validation.suspicious,
      });
      return;
    }

    // Attach validation info to request
    (req as any).scoreValidation = {
      isValid: true,
      suspicious: validation.suspicious,
      nonce: submissionNonce,
      timestamp: submissionTimestamp,
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      message: 'Score validation error',
      error: error.message,
    });
  }
};

/**
 * Middleware to create game session record after score submission
 */
export const recordGameSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This will be called after score is successfully submitted
    // Store session info in request for later use
    (req as any).shouldRecordSession = true;
    next();
  } catch (error) {
    // Don't block request if session recording fails
    console.error('Error in recordGameSession middleware:', error);
    next();
  }
};

/**
 * Helper to create game session after successful score submission
 */
export const createSessionAfterSubmission = async (
  gameId: string,
  userId: string | null,
  guestId: string | null,
  result: 'win' | 'loss' | 'draw',
  score: number,
  gameData: any
): Promise<string | null> => {
  try {
    const sessionId = await createGameSession(
      gameId,
      [
        {
          userId,
          guestId,
          score,
          result,
        },
      ],
      gameData,
      true
    );
    return sessionId;
  } catch (error) {
    console.error('Error creating game session:', error);
    return null;
  }
};

