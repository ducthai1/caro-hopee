/**
 * GameContext Helpers - Utility functions for game context
 */
import { Game, PlayerInfo } from '../types/game.types';
import { getGuestId } from '../utils/guestId';
import { getGuestName } from '../utils/guestName';

/**
 * Convert game object to players array
 * Uses guest name from sessionStorage if available
 */
export const gameToPlayers = (game: Game | null | undefined): PlayerInfo[] => {
  const players: PlayerInfo[] = [];

  // Safety check: ensure game object is valid
  if (!game || typeof game !== 'object') {
    return players;
  }

  try {
    if (game.player1) {
      players.push({
        id: game.player1,
        username: 'Player 1',
        isGuest: false,
        playerNumber: 1,
      });
    } else if (game.player1GuestId) {
      // Use guest name from game (stored in DB) if available, otherwise fallback to sessionStorage or default
      const guestId = getGuestId();
      const isMyGuestId = guestId === game.player1GuestId;
      let username: string;
      
      // Safety check: ensure player1GuestId is a valid string
      const guestIdStr = String(game.player1GuestId || '');
      const guestIdSuffix = guestIdStr.length >= 6 ? guestIdStr.slice(-6) : guestIdStr || 'unknown';
      
      // Safety check: use guest name from DB if available and valid
      if (game.player1GuestName && typeof game.player1GuestName === 'string' && game.player1GuestName.trim()) {
        // Use name from database (set by the guest player)
        username = game.player1GuestName;
      } else if (isMyGuestId) {
        // If it's me and no name in DB, use my sessionStorage name
        const guestName = getGuestName();
        username = guestName || `Guest ${guestIdSuffix}`;
      } else {
        // Other player, no name in DB, use default
        username = `Guest ${guestIdSuffix}`;
      }
      
      players.push({
        id: game.player1GuestId,
        username,
        isGuest: true,
        playerNumber: 1,
      });
    }

    if (game.player2) {
      players.push({
        id: game.player2,
        username: 'Player 2',
        isGuest: false,
        playerNumber: 2,
      });
    } else if (game.player2GuestId) {
      // Use guest name from game (stored in DB) if available, otherwise fallback to sessionStorage or default
      const guestId = getGuestId();
      const isMyGuestId = guestId === game.player2GuestId;
      let username: string;
      
      // Safety check: ensure player2GuestId is a valid string
      const guestIdStr = String(game.player2GuestId || '');
      const guestIdSuffix = guestIdStr.length >= 6 ? guestIdStr.slice(-6) : guestIdStr || 'unknown';
      
      // Safety check: use guest name from DB if available and valid
      if (game.player2GuestName && typeof game.player2GuestName === 'string' && game.player2GuestName.trim()) {
        // Use name from database (set by the guest player)
        username = game.player2GuestName;
      } else if (isMyGuestId) {
        // If it's me and no name in DB, use my sessionStorage name
        const guestName = getGuestName();
        username = guestName || `Guest ${guestIdSuffix}`;
      } else {
        // Other player, no name in DB, use default
        username = `Guest ${guestIdSuffix}`;
      }
      
      players.push({
        id: game.player2GuestId,
        username,
        isGuest: true,
        playerNumber: 2,
      });
    }
  } catch (error) {
    // Safety: catch any errors during player conversion
    console.error('[gameToPlayers] Error converting game to players:', error);
    return players;
  }

  return players;
};

/**
 * Update player username with guest name from sessionStorage if available
 */
export const updatePlayerWithGuestName = (player: PlayerInfo): PlayerInfo => {
  // Safety check: validate player object
  if (!player || typeof player !== 'object') {
    console.error('[updatePlayerWithGuestName] Invalid player object:', player);
    return player;
  }
  
  if (!player.isGuest) return player;
  
  const guestId = getGuestId();
  const guestName = getGuestName();
  
  if (player.id === guestId && guestName) {
    return { ...player, username: guestName };
  }
  
  return player;
};

