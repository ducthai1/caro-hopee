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
import leaderboardRoutes from './routes/leaderboardRoutes';
import userRoutes from './routes/userRoutes';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = setupSocketIO(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Setup socket handlers
setupSocketHandlers(io);

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
