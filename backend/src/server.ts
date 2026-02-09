import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { setupSocketIO } from './config/socket.io';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './services/socketService';
import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import gameStatsRoutes from './routes/gameStatsRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import userRoutes from './routes/userRoutes';
import luckyWheelRoutes from './routes/luckyWheelRoutes';
import adminRoutes from './routes/adminRoutes';
import xiDachRoutes from './routes/xiDachRoutes';
import wordChainRoutes from './routes/wordChainRoutes';
import { setupWordChainSocketHandlers } from './services/word-chain-socket';
import { authLimiter, gameCreationLimiter, gameJoinLimiter, apiLimiter } from './middleware/rateLimiter';
import { cleanupInactiveGuests } from './controllers/luckyWheelController';
import { cleanupAllInactiveGames } from './services/gameCleanupService';
import { loadDictionary } from './services/word-chain-dictionary';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = setupSocketIO(httpServer);

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Apply rate limiting (M4 fix: prevent DoS attacks)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/games/create', gameCreationLimiter);
app.use('/api/games/join', gameJoinLimiter);
app.use('/api/leaderboard', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/games', gameStatsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lucky-wheel', luckyWheelRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/xi-dach', xiDachRoutes);
app.use('/api/word-chain', wordChainRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Lightweight ping endpoint to prevent Render from sleeping
app.get('/ping', (req, res) => {
  res.status(200).json({ pong: Date.now() });
});

// Setup socket handlers
setupSocketHandlers(io);
setupWordChainSocketHandlers(io);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;

// Scheduled cleanup jobs
const startCleanupJob = () => {
  // Run cleanup immediately on startup
  cleanupInactiveGuests()
    .then((count) => {
      console.log(`[Cleanup] Deleted ${count} inactive guest configs on startup`);
    })
    .catch(() => {});

  cleanupAllInactiveGames().catch(() => {});

  // Guest cleanup: every hour
  setInterval(async () => {
    try {
      const count = await cleanupInactiveGuests();
      if (count > 0) {
        console.log(`[Cleanup] Deleted ${count} inactive guest configs`);
      }
    } catch {
      // Best-effort cleanup
    }
  }, 60 * 60 * 1000); // 1 hour

  // Game room cleanup: every 6 hours (less frequent, larger data)
  setInterval(async () => {
    try {
      await cleanupAllInactiveGames();
    } catch {
      // Best-effort cleanup
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
};

const startServer = async () => {
  try {
    await connectDatabase();

    // Load Vietnamese dictionary for Word Chain game
    loadDictionary();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startCleanupJob();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
