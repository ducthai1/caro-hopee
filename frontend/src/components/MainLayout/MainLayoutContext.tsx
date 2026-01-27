import React, { createContext, useContext } from 'react';

interface MainLayoutContextType {
  openHistoryModal: () => void;
  openGuestNameDialog: () => void;
}

const MainLayoutContext = createContext<MainLayoutContextType | undefined>(undefined);

export const MainLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const openHistoryModal = () => {
    window.dispatchEvent(new CustomEvent('openHistoryModal'));
  };
  
  const openGuestNameDialog = () => {
    window.dispatchEvent(new CustomEvent('openGuestNameDialog'));
  };

  return (
    <MainLayoutContext.Provider value={{ openHistoryModal, openGuestNameDialog }}>
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
