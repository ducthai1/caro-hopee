// Guest name management - stores in sessionStorage
const GUEST_NAME_KEY = 'caro_guest_name';

/**
 * Get guest name from sessionStorage
 * @returns Guest name or null if not set
 */
export const getGuestName = (): string | null => {
  return sessionStorage.getItem(GUEST_NAME_KEY);
};

/**
 * Set guest name in sessionStorage
 * @param name - Guest name to store
 */
export const setGuestName = (name: string): void => {
  if (name && name.trim().length > 0) {
    sessionStorage.setItem(GUEST_NAME_KEY, name.trim());
  }
};

/**
 * Clear guest name from sessionStorage
 */
export const clearGuestName = (): void => {
  sessionStorage.removeItem(GUEST_NAME_KEY);
};

/**
 * Check if guest name is set
 * @returns true if guest name exists
 */
export const hasGuestName = (): boolean => {
  return !!getGuestName();
};

