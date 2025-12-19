# Migration Guide - Game Hub Architecture

This guide explains how to migrate from the old single-game architecture to the new multi-game hub architecture.

## Prerequisites

- MongoDB database connection
- Node.js and npm installed
- Backend dependencies installed (`npm install` in `backend/`)

## Migration Steps

### Step 1: Initialize Game Types

First, create the game types in the database:

```bash
cd backend
npm run init:gametypes
```

This will create the `caro` game type. You can add more game types later by editing `backend/src/scripts/initGameTypes.ts`.

### Step 2: Migrate User Stats

Migrate existing user statistics from the `User` model to the new `GameStats` model:

```bash
cd backend
npm run migrate:stats
```

This script will:
- Find all users with wins/losses/draws/totalScore > 0
- Create corresponding `GameStats` records for the `caro` game
- Skip users that already have stats (safe to run multiple times)

### Step 3: Deploy Backend

Deploy the updated backend to Render. The new models and APIs will be available.

### Step 4: Deploy Frontend

Deploy the updated frontend to Vercel. The new UI will use the new APIs.

## Database Changes

### New Collections

1. **GameTypes**: Stores game definitions
2. **GameStats**: Stores per-game statistics for each user
3. **Leaderboard**: Cached leaderboard data for performance
4. **GameSession**: Audit trail for game sessions
5. **RefreshToken**: Stores refresh tokens for JWT authentication

### Modified Collections

1. **Users**: Legacy fields (wins, losses, draws, totalScore) kept for backward compatibility
2. **Games**: Added `gameType` field to identify the game

## API Changes

### New Endpoints

- `GET /api/games/:gameId/stats/:userId` - Get user stats for a game
- `GET /api/games/:gameId/stats/my-stats` - Get current user's stats
- `POST /api/games/:gameId/stats/submit` - Submit game result
- `GET /api/leaderboard/:gameId` - Get leaderboard for a game
- `GET /api/leaderboard/:gameId/rank/:userId` - Get user's rank
- `GET /api/users/:userId/games` - Get all game stats for a user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and invalidate refresh token

### Updated Endpoints

- `GET /api/leaderboard/top` - Still works, but now supports `gameId` query parameter
- `GET /api/users/:userId/profile` - Returns user profile (legacy stats included for compatibility)

## Environment Variables

No new environment variables required. Existing variables work:
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET` (optional, defaults to JWT_SECRET)
- `JWT_EXPIRES_IN` (optional, defaults to 24h)
- `JWT_REFRESH_EXPIRES_IN` (optional, defaults to 7d)

## Rollback Plan

If you need to rollback:

1. The legacy `User.wins/losses/draws/totalScore` fields are still present
2. Old API endpoints still work (backward compatible)
3. Frontend can be reverted to previous version
4. New collections can be dropped if needed (but data will be lost)

## Testing

After migration:

1. Test user login/register (should work as before)
2. Play a game and verify stats are saved to `GameStats`
3. Check leaderboard shows correct rankings
4. Verify profile page shows game-specific stats

## Adding New Games

To add a new game:

1. Add game type to `backend/src/scripts/initGameTypes.ts`
2. Run `npm run init:gametypes`
3. Create game-specific logic in `backend/src/games/{gameId}/`
4. Add frontend components for the new game
5. Update `HomePage.tsx` to include the new game in the sidebar

## Notes

- Migration scripts are idempotent (safe to run multiple times)
- Legacy user stats are kept for backward compatibility
- New games will automatically use the new stats system
- Leaderboard caching improves performance but may show slightly stale data (refreshes automatically)

