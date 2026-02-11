/**
 * Game Reactions - Emoji reactions players can send to opponents
 * Used in GameRoom for social interaction
 */

export interface Reaction {
  id: string;
  emoji: string;
  label: {
    en: string;
    vi: string;
  };
}

export const REACTIONS: Reaction[] = [
  { id: 'gg', emoji: '👍', label: { en: 'GG', vi: 'Hay lắm' } },
  { id: 'wow', emoji: '😲', label: { en: 'Wow', vi: 'Ồ' } },
  { id: 'haha', emoji: '😂', label: { en: 'Haha', vi: 'Haha' } },
  { id: 'sad', emoji: '😢', label: { en: 'Sad', vi: 'Buồn' } },
  { id: 'angry', emoji: '😠', label: { en: 'Grr', vi: 'Tức' } },
  { id: 'heart', emoji: '❤️', label: { en: 'Love', vi: 'Thích' } },
  { id: 'fire', emoji: '🔥', label: { en: 'Fire', vi: 'Cháy' } },
  { id: 'clap', emoji: '👏', label: { en: 'Clap', vi: 'Vỗ tay' } },
  { id: 'think', emoji: '🤔', label: { en: 'Hmm', vi: 'Hmm' } },
  { id: 'skull', emoji: '💀', label: { en: 'Dead', vi: 'Chết' } },
  { id: 'eyes', emoji: '👀', label: { en: 'Eyes', vi: 'Nhìn' } },
  { id: 'cold', emoji: '🥶', label: { en: 'Cold', vi: 'Lạnh' } },
];

/** First N reactions shown in compact (mobile) mode */
export const COMPACT_REACTION_COUNT = 4;

/** Cooldown duration in milliseconds */
export const REACTION_COOLDOWN_MS = 10000;

/** How long the popup shows before auto-dismiss (ms) */
export const REACTION_POPUP_DURATION_MS = 3000;
