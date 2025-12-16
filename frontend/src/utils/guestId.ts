// Per-tab instance cache - each tab gets its own unique guest ID
// Use sessionStorage to persist guest ID across page reloads in the same tab
const GUEST_ID_KEY = 'caro_guest_id';

export const getGuestId = (): string => {
  // Try to get from sessionStorage first
  let guestId = sessionStorage.getItem(GUEST_ID_KEY);
  
  if (!guestId) {
    // Generate new guest ID
    guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Store in sessionStorage for persistence
    sessionStorage.setItem(GUEST_ID_KEY, guestId);
  }
  
  return guestId;
};

