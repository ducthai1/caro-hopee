import { useState, useEffect } from 'react';
import { getGuestName } from '../utils/guestName';

/**
 * Hook to get and sync guest name across components.
 * Listens for 'guest-name-changed' events dispatched by setGuestName in utils.
 */
export const useGuestName = (): string | null => {
  const [guestName, setGuestNameState] = useState<string | null>(getGuestName());

  useEffect(() => {
    const handleNameChange = () => {
      setGuestNameState(getGuestName());
    };

    window.addEventListener('guest-name-changed', handleNameChange);
    // Also listen to storage events for cross-tab sync if needed (though sessionStorage is per tab)
    // But local changes are more important here.
    
    return () => {
      window.removeEventListener('guest-name-changed', handleNameChange);
    };
  }, []);

  return guestName;
};
