/**
 * TinhTuyContent — View router based on state.view.
 */
import React from 'react';
import { useTinhTuy } from './TinhTuyContext';
import { TinhTuyLobby } from './tinh-tuy-lobby/TinhTuyLobby';
import { TinhTuyWaitingRoom } from './tinh-tuy-lobby/TinhTuyWaitingRoom';
import { TinhTuyPlayView } from './tinh-tuy-play/TinhTuyPlayView';
import { TinhTuyResult } from './tinh-tuy-play/TinhTuyResult';

const TinhTuyContent: React.FC = () => {
  const { state } = useTinhTuy();

  switch (state.view) {
    case 'lobby':
      return <TinhTuyLobby />;
    case 'waiting':
      return <TinhTuyWaitingRoom />;
    case 'playing':
      return <TinhTuyPlayView />;
    case 'result':
      return <TinhTuyResult />;
    default:
      return <TinhTuyLobby />;
  }
};

export default TinhTuyContent;
