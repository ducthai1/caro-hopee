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
  { id: 'clown', emoji: '🤡', label: { en: 'Clown', vi: 'Hề' } },            // Trêu / chọc
  { id: 'lol', emoji: '🤣', label: { en: 'LOL', vi: 'Haha' } },               // Cười ra nước mắt
  { id: 'cry', emoji: '😭', label: { en: 'Crying', vi: 'Khóc' } }, 
  { id: 'dumb', emoji: '🙉', label: { en: 'Dumb', vi: 'Không hiểu' } },            // Buồn / thương
  { id: 'scared', emoji: '😱', label: { en: 'Scared', vi: 'Sợ' } },           // Sợ hãi / lo lắng
  { id: 'rage', emoji: '😠', label: { en: 'Rage', vi: 'Phẫn nộ' } },          // Phẫn nộ cau mày
  { id: 'skull', emoji: '💀', label: { en: 'Dead', vi: 'Chết cười' } },       // Buồn cười đến chết
  { id: 'chef', emoji: '🤌', label: { en: 'Perfect', vi: 'Tuyệt' } },         // Hoàn hảo / đỉnh
  { id: 'think', emoji: '🤔', label: { en: 'Hmm', vi: 'Hmm' } },              // Suy nghĩ / nghi ngờ
  { id: 'wow', emoji: '😮', label: { en: 'Wow', vi: 'Ồ' } },                  // Ngạc nhiên
  { id: 'eyes', emoji: '👀', label: { en: 'Eyes', vi: 'Liếc' } },              // Ánh mắt liếc
  { id: 'frozen', emoji: '🥶', label: { en: 'Frozen', vi: 'Đông cứng' } },    // Run sợ đóng băng
];

/** First N reactions shown in compact (mobile) mode */
export const COMPACT_REACTION_COUNT = 4;

/** Cooldown duration in milliseconds */
export const REACTION_COOLDOWN_MS = 10000;

/** How long the popup shows before auto-dismiss (ms) */
export const REACTION_POPUP_DURATION_MS = 3000;
