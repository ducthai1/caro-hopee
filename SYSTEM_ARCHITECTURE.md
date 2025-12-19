# Game Hub System Architecture

## Tổng quan hệ thống

Hệ thống Game Hub là một nền tảng web cho phép người dùng chơi nhiều mini-game, với Caro (Tic-Tac-Toe) là game đầu tiên. Hệ thống được thiết kế để dễ dàng mở rộng với các game mới trong tương lai.

### Tech Stack

**Frontend:**
- React 18 với TypeScript
- Material-UI (MUI) cho UI components
- React Router v7 (Data Router) cho navigation
- Socket.io-client cho real-time communication
- Context API cho state management

**Backend:**
- Node.js với Express.js
- TypeScript
- MongoDB với Mongoose
- Socket.io Server cho real-time communication
- JWT cho authentication (single access token, 7 days expiry)
- bcryptjs cho password hashing

**Deployment:**
- Frontend: Vercel
- Backend: Railway/Render
- Database: MongoDB Atlas

---

## 1. System Architecture

### 1.1 Kiến trúc tổng thể

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
│   Vercel        │
└────────┬────────┘
         │ HTTP/REST + WebSocket
         │
┌────────▼────────┐
│   Backend       │
│   (Express)     │
│   Railway/Render│
└────────┬────────┘
         │
┌────────▼────────┐
│   MongoDB       │
│   Atlas         │
└─────────────────┘
```

### 1.2 Kiến trúc Monolith với Modular Design

Hệ thống sử dụng kiến trúc monolith nhưng được tổ chức theo module để dễ mở rộng:

```
backend/src/
├── controllers/     # Route handlers
├── services/        # Business logic
├── models/          # Database models
├── routes/          # Express routes
├── middleware/      # Express middleware
├── config/         # Configuration
└── utils/          # Utility functions
```

### 1.3 Authentication Flow

**Single Access Token Approach:**
- User đăng nhập/đăng ký → Nhận access token (JWT)
- Token có thời hạn 7 ngày
- Token được lưu trong localStorage (frontend)
- Mỗi request gửi token trong header: `Authorization: Bearer <token>`
- Token hết hạn → User phải đăng nhập lại

**Không sử dụng Refresh Token:**
- Đã loại bỏ cơ chế refresh token để đơn giản hóa
- Token được tạo với `expiresIn: '7d'`

---

## 2. Database Design

### 2.1 ERD (Entity Relationship Diagram)

```
┌─────────────┐
│    User     │
│─────────────│
│ _id (PK)    │
│ username    │
│ email       │
│ password    │
│ wins        │ (legacy)
│ losses      │ (legacy)
│ draws       │ (legacy)
│ totalScore  │ (legacy)
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│    GameStats        │
│─────────────────────│
│ _id (PK)            │
│ userId (FK)         │
│ gameId              │
│ wins                │
│ losses              │
│ draws               │
│ totalScore          │
│ customStats (Map)   │
│ lastPlayed          │
└──────┬──────────────┘
       │
       │ N:1
       │
┌──────▼──────────────┐
│    GameType         │
│─────────────────────│
│ _id (PK)            │
│ gameId (unique)     │
│ name                │
│ description         │
│ isActive            │
└─────────────────────┘

┌─────────────┐
│   Game      │
│─────────────│
│ _id (PK)    │
│ roomId      │
│ roomCode    │
│ gameType    │
│ player1     │
│ player2     │
│ board       │
│ gameStatus  │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│   GameSession       │
│─────────────────────│
│ _id (PK)            │
│ gameId              │
│ sessionId (unique)  │
│ players[]           │
│ gameData            │
│ startedAt           │
│ finishedAt          │
│ duration            │
│ isValid             │
└─────────────────────┘

┌─────────────┐
│ Leaderboard │
│─────────────│
│ _id (PK)    │
│ gameId      │
│ period      │
│ periodStart │
│ periodEnd   │
│ rankings[]  │
│ updatedAt   │
└─────────────┘
```

### 2.2 Database Models

#### 2.2.1 User Model
```typescript
interface IUser {
  _id: ObjectId;
  username: string;
  email: string;
  password: string; // hashed
  wins: number; // legacy, kept for backward compatibility
  losses: number; // legacy
  draws: number; // legacy
  totalScore: number; // legacy
  createdAt: Date;
  lastLogin: Date;
}
```

**Indexes:**
- `{ email: 1 }` (unique)
- `{ username: 1 }` (unique)

#### 2.2.2 GameType Model
```typescript
interface IGameType {
  _id: ObjectId;
  gameId: string; // unique, lowercase (e.g., 'caro')
  name: string; // Display name (e.g., 'Cờ Caro')
  description: string;
  isActive: boolean;
  createdAt: Date;
}
```

**Indexes:**
- `{ gameId: 1 }` (unique)
- `{ isActive: 1 }`

#### 2.2.3 GameStats Model
```typescript
interface IGameStats {
  _id: ObjectId;
  userId: ObjectId; // FK to User
  gameId: string; // FK to GameType
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  customStats: Map<string, any>; // Game-specific stats
  lastPlayed: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**
- `{ userId: 1, gameId: 1 }` (unique compound)
- `{ gameId: 1, totalScore: -1 }` (for leaderboard)
- `{ gameId: 1, wins: -1 }` (for leaderboard)
- `{ userId: 1 }` (for user queries)

#### 2.2.4 Leaderboard Model
```typescript
interface IRanking {
  userId: ObjectId;
  rank: number;
  score: number;
  wins: number;
  updatedAt: Date;
}

interface ILeaderboard {
  _id: ObjectId;
  gameId: string;
  period: 'daily' | 'weekly' | 'all-time';
  periodStart: Date;
  periodEnd: Date | null;
  rankings: IRanking[];
  updatedAt: Date;
}
```

**Indexes:**
- `{ gameId: 1, period: 1, periodStart: -1 }`
- `{ gameId: 1, period: 1 }`

**Caching Strategy:**
- Daily leaderboard: Refresh mỗi 1 giờ
- Weekly leaderboard: Refresh mỗi 6 giờ
- All-time: Query trực tiếp từ GameStats (không cache)

#### 2.2.5 GameSession Model
```typescript
interface IPlayerResult {
  userId: ObjectId | null;
  guestId: string | null;
  score: number;
  result: 'win' | 'loss' | 'draw';
}

interface IGameSession {
  _id: ObjectId;
  gameId: string;
  sessionId: string; // unique UUID
  players: IPlayerResult[];
  gameData: any; // Flexible schema for game-specific data
  startedAt: Date;
  finishedAt: Date | null;
  duration: number; // seconds (calculated)
  isValid: boolean; // For anti-cheat validation
  createdAt: Date;
}
```

**Indexes:**
- `{ gameId: 1, finishedAt: -1 }`
- `{ 'players.userId': 1 }`
- `{ sessionId: 1 }` (unique)
- `{ gameId: 1, createdAt: -1 }`

**Auto-calculation:**
- `duration` được tính tự động khi `finishedAt` được set

#### 2.2.6 Game Model (Existing)
```typescript
interface IGame {
  _id: ObjectId;
  roomId: string; // unique
  roomCode: string; // unique, 6 chars, uppercase
  gameType: string; // 'caro' (default)
  player1: ObjectId | null;
  player2: ObjectId | null;
  player1GuestId: string | null;
  player2GuestId: string | null;
  boardSize: number;
  board: number[][];
  currentPlayer: 1 | 2;
  gameStatus: 'waiting' | 'playing' | 'finished' | 'abandoned';
  winner: 1 | 2 | 'draw' | null;
  rules: GameRules;
  score: GameScore;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
}
```

---

## 3. API Design

### 3.1 Authentication APIs

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Đăng ký user mới |
| POST | `/login` | No | Đăng nhập, nhận JWT token |
| GET | `/me` | Yes | Lấy thông tin user hiện tại |

**Request/Response Examples:**

```typescript
// POST /api/auth/register
Request: {
  username: string;
  email: string;
  password: string;
}

Response: {
  token: string; // JWT access token
  user: {
    _id: string;
    username: string;
    email: string;
    wins: number;
    losses: number;
    draws: number;
    totalScore: number;
    createdAt: Date;
    lastLogin: Date;
  }
}

// POST /api/auth/login
Request: {
  email: string;
  password: string;
}

Response: {
  token: string; // JWT access token (7 days expiry)
  user: User
}
```

### 3.2 Game Stats APIs

**Base Path:** `/api/games/:gameId/stats`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:gameId/stats/:userId` | No | Lấy stats của user cho game |
| GET | `/:gameId/stats/my-stats` | Yes | Lấy stats của user hiện tại |
| POST | `/:gameId/stats/submit` | Yes | Submit kết quả game (có validation) |

**Request/Response Examples:**

```typescript
// POST /api/games/caro/stats/submit
Request: {
  result: 'win' | 'loss' | 'draw';
  score?: number; // Optional, server calculates if not provided
  gameData?: {
    roomId: string;
    roomCode: string;
    boardSize: number;
    // ... other game-specific data
  };
  timestamp: number; // Unix timestamp
  nonce: string; // UUID for replay attack prevention
}

Response: {
  success: boolean;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    totalScore: number;
  };
  sessionId?: string; // GameSession ID if created
}
```

**Validation Middleware:**
- `validateScore`: Kiểm tra nonce, timestamp, rate limit, score reasonableness
- `scoreSubmissionLimiter`: Rate limiting (10 requests/minute)

### 3.3 Leaderboard APIs

**Base Path:** `/api/leaderboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:gameId` | No | Lấy leaderboard (daily/weekly/all-time) |
| GET | `/:gameId/rank/:userId` | No | Lấy rank của user |
| GET | `/:gameId/around/:userId` | No | Lấy players xung quanh user rank |
| GET | `/top` | No | Legacy endpoint (backward compatible) |

**Query Parameters:**
- `period`: `'daily' | 'weekly' | 'all-time'` (default: `'all-time'`)
- `limit`: number (default: 50)
- `offset`: number (default: 0)
- `range`: number (for `/around/:userId`, default: 5)

**Response Example:**

```typescript
// GET /api/leaderboard/caro?period=daily&limit=10
Response: {
  gameId: 'caro';
  period: 'daily';
  rankings: [
    {
      rank: 1;
      userId: string;
      username: string;
      score: number;
      wins: number;
    }
  ];
  limit: 10;
  offset: 0;
  total: number;
}
```

### 3.4 Game APIs (Existing)

**Base Path:** `/api/games`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create` | No | Tạo game mới |
| GET | `/:roomId` | No | Lấy game state |
| POST | `/:roomId/join` | No | Join game |
| POST | `/:roomId/leave` | No | Leave game |
| GET | `/user/:userId` | No | Lấy games của user |
| GET | `/waiting` | No | Lấy danh sách games đang chờ |

### 3.5 User APIs

**Base Path:** `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:userId` | No | Lấy user profile |
| GET | `/:userId/games` | No | Lấy tất cả game stats của user |
| PUT | `/:userId` | Yes | Update profile (chỉ user hiện tại) |

---

## 4. Authentication & Authorization

### 4.1 JWT Token Structure

```typescript
interface TokenPayload {
  userId: string;
  username: string;
}

// Token được tạo với:
jwt.sign(payload, JWT_SECRET, {
  expiresIn: '7d' // 7 days
});
```

### 4.2 Middleware

**authMiddleware:**
- Kiểm tra `Authorization: Bearer <token>` header
- Verify token với `JWT_SECRET`
- Attach `user` object vào `req.user`

```typescript
interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}
```

### 4.3 API Protection

**Protected Endpoints:**
- Tất cả endpoints có `authMiddleware` yêu cầu valid JWT token
- Token hết hạn → 401 Unauthorized
- Không có token → 401 Unauthorized

**Public Endpoints:**
- Game creation, joining
- Leaderboard viewing
- User profile viewing (public info only)

---

## 5. Game Stats & Leaderboard System

### 5.1 Stats Calculation

**Score Calculation (Server-side):**
```typescript
// Default scoring (có thể customize per game)
if (result === 'win') {
  score = 10;
} else if (result === 'loss') {
  score = 0;
} else if (result === 'draw') {
  score = 5;
}

// Custom scoring có thể được định nghĩa trong GameType
```

**Stats Update:**
- Khi game kết thúc, frontend gọi `POST /api/games/:gameId/stats/submit`
- Server validate submission
- Update `GameStats` document
- Tạo `GameSession` record cho audit trail

### 5.2 Leaderboard Strategy

**Caching:**
- **Daily**: Cache trong `Leaderboard` collection, refresh mỗi 1 giờ
- **Weekly**: Cache trong `Leaderboard` collection, refresh mỗi 6 giờ
- **All-time**: Query trực tiếp từ `GameStats` (không cache)

**Cache Rebuild:**
- Tự động rebuild khi cache expired
- Query top 1000 players từ `GameStats`
- Sort by `totalScore` desc, `wins` desc
- Lưu vào `Leaderboard` collection

**Performance:**
- Indexes được tối ưu cho leaderboard queries
- Pagination support (limit/offset)
- Efficient queries với compound indexes

### 5.3 User Rank Calculation

**All-time:**
```typescript
rank = countDocuments({
  gameId,
  $or: [
    { totalScore: { $gt: userStats.totalScore } },
    { totalScore: userStats.totalScore, wins: { $gt: userStats.wins } }
  ]
}) + 1;
```

**Daily/Weekly:**
- Lấy từ cached `Leaderboard.rankings`
- Tìm user trong rankings array

---

## 6. Anti-cheat & Security

### 6.1 Anti-cheat Service

**Validation Steps:**
1. **Nonce Check**: Prevent replay attacks
   - Nonce phải là UUID unique
   - Nonce không được reuse trong 5 phút
   - In-memory cache (production: Redis)

2. **Timestamp Check**: Prevent old submissions
   - Timestamp không được quá 5 phút so với server time
   - Timestamp không được trong tương lai

3. **Rate Limiting**: Prevent spam
   - Max 10 submissions/minute per user/guest
   - Sử dụng `express-rate-limit`

4. **Score Validation**: Prevent fake scores
   - Score phải hợp lý với result type
   - Win: score > 0
   - Loss: score = 0
   - Draw: score >= 0
   - Score không được quá cao (suspicious threshold)

5. **Suspicious Pattern Detection:**
   - Win rate > 95% với > 20 games → Flag suspicious
   - > 5 games finished trong 1 phút → Flag suspicious

### 6.2 Game Session Audit Trail

Mỗi game submission tạo một `GameSession` record:
- `sessionId`: UUID unique
- `players`: Array of player results
- `gameData`: Game-specific data (roomId, roomCode, etc.)
- `isValid`: Flag cho suspicious submissions
- `duration`: Tự động tính từ `startedAt` và `finishedAt`

### 6.3 Security Measures

**Password:**
- Hashed với bcryptjs (salt rounds: 10)
- Không lưu plain text

**JWT:**
- Secret key từ environment variable
- Token không chứa sensitive data
- Expiry: 7 days

**Rate Limiting:**
- Score submission: 10 req/min
- Auth endpoints: 5 req/min
- General API: 100 req/min

**Input Validation:**
- Mongoose schema validation
- Express validator middleware
- TypeScript type checking

---

## 7. Frontend Architecture

### 7.1 Component Structure

```
frontend/src/
├── components/
│   ├── GameBoard/        # Game board UI
│   ├── GameControls/     # Game controls (undo, surrender, etc.)
│   ├── GameInfo/         # Game information display
│   ├── PlayerCard/       # Player card component
│   ├── RoomCodeDisplay/   # Room code display
│   └── RuleSelector/      # Rule selection UI
├── contexts/
│   ├── AuthContext.tsx   # Authentication state
│   ├── GameContext.tsx   # Game state management
│   └── SocketContext.tsx # Socket.io connection
├── pages/
│   ├── HomePage.tsx       # Home page với sidebar
│   ├── GameRoomPage.tsx   # Game room page
│   ├── JoinGamePage.tsx   # Join game page
│   ├── LeaderboardPage.tsx # Leaderboard page
│   ├── ProfilePage.tsx    # User profile page
│   └── LoginPage.tsx      # Login/Register page
├── services/
│   ├── api.ts            # REST API client
│   └── socketService.ts  # Socket.io client
└── types/
    ├── game.types.ts     # Game-related types
    ├── socket.types.ts   # Socket event types
    └── user.types.ts     # User-related types
```

### 7.2 State Management

**Context API:**
- `AuthContext`: User authentication state
- `GameContext`: Current game state, game actions
- `SocketContext`: Socket connection management

**State Flow:**
```
User Action → Context Method → API/Socket Call → State Update → UI Re-render
```

### 7.3 Routing

**React Router v7 (Data Router):**
```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/game/:roomId',
    element: <GameRoomPage />,
  },
  {
    path: '/join',
    element: <JoinGamePage />,
  },
  {
    path: '/leaderboard',
    element: <LeaderboardPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
]);
```

**Navigation Protection:**
- `useBlocker` cho game room (prevent accidental navigation)
- `beforeunload` event cho tab close warning

### 7.4 Real-time Communication

**Socket.io Events:**

**Client → Server:**
- `join-room`: Join game room
- `leave-room`: Leave game room
- `make-move`: Make a move
- `request-undo`: Request undo
- `approve-undo`: Approve undo
- `reject-undo`: Reject undo
- `surrender`: Surrender game
- `new-game`: Start new game in same room

**Server → Client:**
- `room-joined`: Confirmed room join
- `player-joined`: Another player joined
- `player-left`: A player left
- `move-made`: A move was made
- `game-finished`: Game ended
- `score-updated`: Score updated
- `undo-requested`: Undo request received
- `undo-approved`: Undo was approved
- `undo-rejected`: Undo was rejected
- `game-error`: Game error occurred

---

## 8. Deployment

### 8.1 Frontend (Vercel)

**Build Command:**
```bash
cd frontend && npm run build
```

**Output Directory:**
```
frontend/build
```

**Environment Variables:**
```
REACT_APP_API_BASE_URL=https://your-backend-url.com/api
REACT_APP_SOCKET_URL=https://your-backend-url.com
```

### 8.2 Backend (Railway/Render)

**Build Command:**
```bash
cd backend && npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### 8.3 Database (MongoDB Atlas)

**Connection:**
- Connection string từ MongoDB Atlas
- Whitelist IP addresses (hoặc 0.0.0.0/0 cho development)

**Indexes:**
- Tất cả indexes được định nghĩa trong models
- Tự động tạo khi model được load lần đầu

---

## 9. Future Extensibility

### 9.1 Adding New Games

**Steps:**
1. Add game type to `backend/src/scripts/initGameTypes.ts`:
```typescript
await GameType.create({
  gameId: 'new-game',
  name: 'New Game',
  description: 'Description of new game',
  isActive: true,
});
```

2. Run initialization script:
```bash
npm run init:gametypes
```

3. Create game-specific logic (optional):
```
backend/src/games/new-game/
├── gameEngine.ts
├── ruleEngine.ts
└── winChecker.ts
```

4. Add frontend components:
```
frontend/src/components/NewGame/
├── NewGameBoard.tsx
└── NewGameControls.tsx
```

5. Update `HomePage.tsx` sidebar để include new game

**Game-specific Features:**
- `customStats` trong `GameStats` cho game-specific data
- `gameData` trong `GameSession` cho game-specific session data
- Custom scoring logic trong `gameStatsController.ts`

### 9.2 Cross-game Features (Future)

**Achievements:**
- Tạo `Achievement` model
- Track achievements across games
- Display in user profile

**Events:**
- Tạo `Event` model
- Time-limited events
- Special rewards

**Social Features:**
- Friends system
- Private matches
- Chat system

### 9.3 Scaling Considerations

**Current:**
- Monolith architecture
- Single database instance
- In-memory nonce cache

**Future Scaling:**
- **Redis**: For nonce cache, rate limiting, session storage
- **Database Sharding**: By gameId or userId
- **Read Replicas**: For leaderboard queries
- **CDN**: For static assets
- **Load Balancer**: Multiple backend instances
- **Microservices**: Split by domain (auth, games, stats, leaderboard)

---

## 10. Migration & Scripts

### 10.1 Initialization Scripts

**Initialize Game Types:**
```bash
cd backend
npm run init:gametypes
```

**Migrate User Stats:**
```bash
cd backend
npm run migrate:stats
```

### 10.2 Database Migrations

**Manual Migrations:**
- Game types: Run `initGameTypes.ts`
- User stats: Run `migrateUserStats.ts`
- Indexes: Auto-created on model load

**Rollback:**
- Legacy fields (`User.wins/losses/draws/totalScore`) kept for compatibility
- Old API endpoints still work
- New collections can be dropped if needed

---

## 11. Error Handling

### 11.1 Backend Error Handling

**Error Middleware:**
```typescript
// backend/src/middleware/errorHandler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  console.error(err);
  
  // Return appropriate status code
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
};
```

**Error Types:**
- 400: Bad Request (validation errors)
- 401: Unauthorized (auth errors)
- 404: Not Found (resource not found)
- 500: Internal Server Error (server errors)

### 11.2 Frontend Error Handling

**API Error Handling:**
```typescript
// services/api.ts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      authContext.logout();
    }
    return Promise.reject(error);
  }
);
```

**Socket Error Handling:**
```typescript
// Socket error events
socket.on('game-error', (error) => {
  // Display error to user
  setError(error.message);
});
```

---

## 12. Testing Considerations

### 12.1 Backend Testing

**Unit Tests:**
- Service functions
- Utility functions
- Model methods

**Integration Tests:**
- API endpoints
- Database operations
- Socket events

### 12.2 Frontend Testing

**Component Tests:**
- React components
- Context providers
- Custom hooks

**E2E Tests:**
- User flows
- Game flows
- Authentication flows

---

## 13. Performance Optimization

### 13.1 Database Optimization

**Indexes:**
- Compound indexes cho common queries
- Unique indexes cho unique fields
- Sparse indexes cho optional fields

**Query Optimization:**
- Use `select()` để chỉ lấy fields cần thiết
- Use `populate()` efficiently
- Pagination cho large datasets

### 13.2 Frontend Optimization

**Code Splitting:**
- React.lazy() cho route components
- Dynamic imports cho heavy components

**Caching:**
- API response caching (nếu cần)
- LocalStorage cho user preferences

**Bundle Optimization:**
- Tree shaking
- Minification
- Compression

---

## 14. Monitoring & Logging

### 14.1 Logging

**Backend:**
- Console logging cho development
- Structured logging cho production (Winston, Pino)

**Frontend:**
- Console logging cho development
- Error tracking (Sentry, LogRocket)

### 14.2 Monitoring

**Metrics to Track:**
- API response times
- Database query times
- Socket connection count
- Error rates
- User activity

**Tools:**
- Application Performance Monitoring (APM)
- Database monitoring
- Uptime monitoring

---

## 15. Security Checklist

- [x] Password hashing (bcryptjs)
- [x] JWT token authentication
- [x] Input validation
- [x] Rate limiting
- [x] Nonce-based replay attack prevention
- [x] Timestamp validation
- [x] Score validation
- [x] Suspicious pattern detection
- [x] CORS configuration
- [x] Environment variables for secrets
- [ ] HTTPS enforcement (production)
- [ ] SQL injection prevention (N/A, using NoSQL)
- [ ] XSS prevention (React auto-escapes)
- [ ] CSRF protection (JWT in header, not cookie)

---

## 16. API Documentation

### 16.1 OpenAPI/Swagger (Future)

Có thể thêm Swagger/OpenAPI documentation:
```bash
npm install swagger-jsdoc swagger-ui-express
```

### 16.2 Postman Collection (Future)

Tạo Postman collection cho API testing và documentation.

---

## 17. Changelog

### Version 2.0.0 (Current)
- ✅ Multi-game support với GameType model
- ✅ Per-game statistics với GameStats model
- ✅ Leaderboard system với caching
- ✅ Anti-cheat system với validation
- ✅ Game session audit trail
- ✅ Simplified JWT (single access token, no refresh)
- ✅ Improved error handling
- ✅ TypeScript strict mode

### Version 1.0.0 (Legacy)
- Single game (Caro only)
- User stats in User model
- Basic leaderboard
- JWT authentication

---

## 18. Contact & Support

**Documentation:**
- README.md: Setup và basic usage
- MIGRATION_GUIDE.md: Migration từ v1.0.0
- SYSTEM_ARCHITECTURE.md: This document

**Issues:**
- Report bugs và feature requests qua GitHub Issues

---

**Last Updated:** 2025-01-XX
**Version:** 2.0.0
**Status:** Production Ready

