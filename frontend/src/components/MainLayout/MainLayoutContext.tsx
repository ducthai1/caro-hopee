import React, { createContext, useContext, useState, useCallback } from 'react';

interface MainLayoutContextType {
  openHistoryModal: () => void;
  openGuestNameDialog: () => void;
  /** Hide sidebar + mobile header for immersive game views */
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
}

const MainLayoutContext = createContext<MainLayoutContextType | undefined>(undefined);

export const MainLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fullscreen, setFullscreenState] = useState(false);

  const openHistoryModal = () => {
    window.dispatchEvent(new CustomEvent('openHistoryModal'));
  };

  const openGuestNameDialog = () => {
    window.dispatchEvent(new CustomEvent('openGuestNameDialog'));
  };

  const setFullscreen = useCallback((v: boolean) => setFullscreenState(v), []);

  return (
    <MainLayoutContext.Provider value={{ openHistoryModal, openGuestNameDialog, fullscreen, setFullscreen }}>
      {children}
    </MainLayoutContext.Provider>
  );
};

export const useMainLayout = () => {
  const context = useContext(MainLayoutContext);
  if (!context) {
    throw new Error('useMainLayout must be used within MainLayoutProvider');
  }
  return context;
};
