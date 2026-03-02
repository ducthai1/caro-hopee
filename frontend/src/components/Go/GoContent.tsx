/**
 * GoContent — View router based on state.view.
 * Rendered inside GoProvider.
 */
import React from 'react';
import { useGo } from './GoContext';
import { GoLobby } from './go-lobby/GoLobby';
import { GoWaitingRoom } from './go-lobby/GoWaitingRoom';
import GoPlayView from './go-play/GoPlayView';

const GoContent: React.FC = () => {
  const { state } = useGo();

  switch (state.view) {
    case 'lobby':
      return <GoLobby />;

    case 'waiting':
      return <GoWaitingRoom />;

    case 'playing':
    case 'scoring':
    case 'result':
      return <GoPlayView />;

    default:
      return <GoLobby />;
  }
};

export default GoContent;
