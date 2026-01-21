# Socket Events for Player Info Sync

## Event Diagram: Full Player Sync Lifecycle

```
═══════════════════════════════════════════════════════════════════════════════
GAME CREATION (Guest Player 1)
═══════════════════════════════════════════════════════════════════════════════

Frontend (HomePage)
  │
  ├─→ GuestNameDialog.tsx opens
  │     └─→ User enters name → setGuestName() → sessionStorage['caro_guest_name']
  │
  ├─→ gameApi.create({ boardSize, rules, guestId, guestName })
  │     └─→ POST /api/games/create
  │           └─→ gameController.createGame()
  │                 └─→ Save to Game model:
  │                     - player1GuestId = guestId
  │                     - player1GuestName = guestName
  │
  ├─→ Backend emits: io.emit('game-created', { roomId, player1Username: guestName })
  │     └─→ All clients receive → homepage displays waiting game
  │
  └─→ Frontend redirects to GameRoomPage(roomId)


═══════════════════════════════════════════════════════════════════════════════
JOINING GAME (Guest Player 2 via HomePage Waiting Games)
═══════════════════════════════════════════════════════════════════════════════

Frontend (HomePage - WaitingGamesSection)
  │
  ├─→ User clicks "Join Game" on waiting game card
  │
  ├─→ GuestNameDialog.tsx opens
  │     └─→ User enters name → setGuestName() → sessionStorage['caro_guest_name']
  │
  ├─→ gameApi.joinGame({ roomId, guestId, guestName, password? })
  │     └─→ POST /api/games/{roomId}/join
  │           └─→ gameController.joinGame()
  │                 └─→ Save to Game model:
  │                     - player2GuestId = guestId
  │                     - player2GuestName = guestName
  │
  └─→ Frontend redirects to GameRoomPage(roomId)


═══════════════════════════════════════════════════════════════════════════════
SOCKET ROOM JOIN (Both Players)
═══════════════════════════════════════════════════════════════════════════════

Frontend (GameRoomPage.tsx)
  │
  ├─→ useEffect: joinRoom(roomId) called
  │
  ├─→ socketService.emit('join-room', { roomId, playerId: guestId, isGuest: true })
  │     │
  │     └─→ Backend: socketService.ts → 'join-room' handler
  │           │
  │           ├─→ socket.join(roomId)
  │           │
  │           ├─→ Fetch game from DB: Game.findOne({ roomId })
  │           │
  │           ├─→ Build players array:
  │           │     if (game.player1) {
  │           │       fetch username from User model
  │           │     } else if (game.player1GuestId) {
  │           │       use game.player1GuestName OR fallback
  │           │     }
  │           │     → Same for player2
  │           │
  │           └─→ socket.emit('room-joined', {
  │                 roomId,
  │                 players: [
  │                   { id: guestId1, username: 'MyName', isGuest: true, playerNumber: 1 },
  │                   { id: guestId2, username: 'OpponentName', isGuest: true, playerNumber: 2 }
  │                 ],
  │                 gameStatus: 'waiting',
  │                 currentPlayer: 1
  │               })
  │
  └─→ Frontend: GameContext.tsx → 'room-joined' listener (handleRoomJoined)
        │
        ├─→ Validate data structure
        │
        ├─→ setRoomId(roomId)
        │
        ├─→ Map players through updatePlayerWithGuestName():
        │     // Override with local sessionStorage if guestId matches
        │     if (player.isGuest && player.id === getGuestId() && getGuestName()) {
        │       player.username = getGuestName()
        │     }
        │
        ├─→ setPlayers(updatedPlayers)
        │
        └─→ Identify myPlayerNumber based on guestId/userId match


═══════════════════════════════════════════════════════════════════════════════
GAME STARTS (Both Players Connected)
═══════════════════════════════════════════════════════════════════════════════

Frontend (GameRoomPage ReadyToStartState)
  │
  └─→ Player 1 clicks "Start Game"
        │
        ├─→ socketService.emit('start-game', { roomId })
        │
        └─→ Backend: 'start-game' handler
              │
              ├─→ Update game: { gameStatus: 'playing', currentPlayer: 1 }
              │
              └─→ io.to(roomId).emit('game-started', { currentPlayer: 1 })
                    │
                    └─→ Frontend: GameContext → 'game-started' listener
                          └─→ Update game state, enable board


═══════════════════════════════════════════════════════════════════════════════
MID-GAME: PLAYER 2 JOINS LATE (If player1 started early)
═══════════════════════════════════════════════════════════════════════════════

Backend: 'join-room' handler
  │
  ├─→ Build current players array (including both player1 & player2 from DB)
  │
  └─→ socket.emit('room-joined', { players: [...] })
        │
        └─→ Includes both players with names from DB

ALSO:
Backend: Broadcast to others already in room
  │
  └─→ io.to(roomId).emit('player-joined', {
        player: {
          id: newPlayerId,
          username: newPlayerName,
          isGuest: true,
          playerNumber: 2
        }
      })
        │
        └─→ Frontend: GameContext → 'player-joined' listener (handlePlayerJoined)
              │
              ├─→ Map through updatePlayerWithGuestName()
              │
              └─→ setPlayers(prev => [...prev, player])


═══════════════════════════════════════════════════════════════════════════════
PLAYER DISCONNECT
═══════════════════════════════════════════════════════════════════════════════

Frontend: Player closes page / leaves game
  │
  └─→ socketService.emit('leave-room', { roomId })
        │
        └─→ Backend: 'leave-room' handler
              │
              ├─→ socket.leave(roomId)
              │
              ├─→ Determine if game should be deleted/reset
              │
              └─→ io.to(roomId).emit('player-left', {
                    playerId: leavingPlayerId,
                    playerNumber: 1 or 2,
                    roomId,
                    hostTransferred: boolean,
                    game: { ... updated game state ... }
                  })
                    │
                    └─→ Frontend: GameContext → 'player-left' listener
                          │
                          ├─→ Remove from players array
                          │
                          └─→ Trigger reload if needed


═══════════════════════════════════════════════════════════════════════════════
GAME FINISHES
═══════════════════════════════════════════════════════════════════════════════

Backend: Win detected (5 in a row)
  │
  ├─→ Update Game: { gameStatus: 'finished', winner: 1 or 2, winningLine: [...] }
  │
  └─→ io.to(roomId).emit('game-finished', {
        winner: 1 or 2,
        reason: 'five-in-a-row',
        winningLine: [{row, col}, ...],
        score: { player1: X, player2: Y }
      })
        │
        └─→ Frontend: GameContext → 'game-finished' listener
              │
              ├─→ setGame({ winner, gameStatus: 'finished' })
              │
              └─→ saveGuestHistory() → localStorage for guest users
```

---

## Socket Event Reference Table

| Event Name | Direction | Emitted By | Listener | Payload |
|-----------|-----------|-----------|----------|---------|
| `join-room` | Client→Server | GameRoomPage.tsx | Backend socketService.ts | `{ roomId, playerId, isGuest }` |
| `room-joined` | Server→Client | Backend socketService.ts | GameContext.tsx | `{ roomId, players[], gameStatus, currentPlayer }` |
| `player-joined` | Server→Broadcast | Backend socketService.ts | GameContext.tsx | `{ player: PlayerInfo }` |
| `player-left` | Server→Broadcast | Backend socketService.ts | GameContext.tsx | `{ playerId, playerNumber, roomId, hostTransferred, game }` |
| `game-created` | Server→Broadcast | Backend gameController.ts | HomePage.tsx | `{ roomId, roomCode, boardSize, player1Username }` |
| `start-game` | Client→Server | GameRoomPage.tsx | Backend socketService.ts | `{ roomId }` |
| `game-started` | Server→Broadcast | Backend socketService.ts | GameContext.tsx | `{ currentPlayer }` |
| `make-move` | Client→Server | GameBoard.tsx | Backend socketService.ts | `{ roomId, row, col }` |
| `move-made` | Server→Broadcast | Backend socketService.ts | GameContext.tsx | `{ move, board[][], currentPlayer }` |
| `game-finished` | Server→Broadcast | Backend socketService.ts | GameContext.tsx | `{ winner, reason, winningLine, score }` |

---

## Player Name Data Flow Summary

### Name Stored In:
1. **Frontend sessionStorage** (highest priority for guest player)
   - Key: `caro_guest_name`
   - Set by: GuestNameDialog.tsx
   - Used by: `getGuestName()` in gameContextHelpers.ts

2. **Backend Database** (persists across tabs)
   - Table: Game
   - Fields: `player1GuestName`, `player2GuestName`
   - Set by: gameController.createGame() and joinGame()
   - Retrieved by: Backend socket handler for broadcasting

### Name Propagation:
```
User Input (Dialog)
  ↓
sessionStorage via setGuestName()
  ↓
API call includes guestName param
  ↓
Backend saves to Game.player1GuestName / player2GuestName
  ↓
Backend socket handler reads from DB
  ↓
Includes in PlayerInfo object
  ↓
Emitted in 'room-joined' / 'player-joined' events
  ↓
Frontend receives in GameContext listener
  ↓
updatePlayerWithGuestName() applies sessionStorage override
  ↓
setPlayers() updates state
  ↓
PlayersScoreSidebar renders updated names
```

---

## Important Notes

**sessionStorage Override:** `updatePlayerWithGuestName()` ensures my own guest name from sessionStorage takes priority over DB value. This handles cases where guest joins before DB is updated.

**Opponent Names:** Other player's guest name comes from DB (stored when they created/joined game), not their sessionStorage (which is isolated per tab).

**Reconnection:** If player refreshes:
- sessionStorage persists (same tab)
- guestId unchanged (same tab)
- Can rejoin with same identity

**Cross-Tab:** Each tab gets new guestId → treated as different player → multiple concurrent games possible

