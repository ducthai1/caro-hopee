# Cờ Caro Game

A real-time multiplayer Tic-Tac-Toe (Cờ Caro) game built with React and Node.js.

## Features

- **Guest Play**: Play without registration (temporary games)
- **User Accounts**: Register and track your statistics
- **Leaderboard**: See top players ranked by score
- **Real-time Multiplayer**: Play with others using WebSocket
- **Configurable Rules**: 
  - Block Two Ends rule (Chặn 2 đầu)
  - Configurable board size (15x15, 20x20, etc.)
  - Undo moves with opponent approval
- **Game Features**:
  - Surrender
  - Leave game
  - Request undo (with approval)
  - Score tracking across multiple games
  - New game in same room

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI)
- Socket.io-client
- React Router

### Backend
- Node.js with Express
- TypeScript
- MongoDB with Mongoose
- Socket.io
- JWT Authentication
- bcryptjs for password hashing

## Setup

### Prerequisites
- Node.js 16+
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/caro-game
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Start the server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## Project Structure

```
.
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Context providers
│   │   ├── pages/          # Page components
│   │   ├── services/       # API and socket services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── routes/         # Express routes
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utility functions
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Games
- `POST /api/games/create` - Create new game
- `GET /api/games/:roomId` - Get game state
- `POST /api/games/:roomId/join` - Join game
- `GET /api/games/user/:userId` - Get user's games

### Leaderboard
- `GET /api/leaderboard` - Get top players
- `GET /api/leaderboard/user/:userId` - Get user rank

### Users
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update profile

## WebSocket Events

### Client → Server
- `join-room` - Join a game room
- `leave-room` - Leave a game room
- `make-move` - Make a move
- `request-undo` - Request to undo a move
- `approve-undo` - Approve undo request
- `reject-undo` - Reject undo request
- `surrender` - Surrender the game
- `new-game` - Start a new game in the same room

### Server → Client
- `room-joined` - Confirmed room join
- `player-joined` - Another player joined
- `player-left` - A player left
- `move-made` - A move was made
- `game-finished` - Game ended
- `score-updated` - Score updated
- `undo-requested` - Undo request received
- `undo-approved` - Undo was approved
- `undo-rejected` - Undo was rejected
- `game-error` - Game error occurred

## Game Rules

### Win Condition
- 5 in a row (horizontal, vertical, or diagonal)

### Block Two Ends (Chặn 2 đầu)
- When enabled, prevents moves that would allow opponent to have open 4 at both ends
- This is a common rule in Cờ Caro to prevent easy wins

### Undo
- Players can request to undo their last move
- Opponent must approve the undo
- Limited number of undos per game (default: 3)

## Development

### Backend
```bash
npm run dev    # Development with hot reload
npm run build  # Build for production
npm start      # Run production build
```

### Frontend
```bash
npm start      # Development server
npm run build  # Build for production
npm test       # Run tests
```

## License

ISC
