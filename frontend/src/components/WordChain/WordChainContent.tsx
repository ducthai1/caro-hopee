/**
 * WordChainContent - View router based on state.view.
 * Entry point component rendered inside WordChainProvider.
 */
import React from 'react';
import { useWordChain } from './WordChainContext';
import { WordChainLobby } from './word-chain-lobby/WordChainLobby';
import { WordChainWaitingRoom } from './word-chain-lobby/WordChainWaitingRoom';
import { WordChainGame } from './word-chain-game/WordChainGame';

const WordChainContent: React.FC = () => {
  const { state } = useWordChain();

  switch (state.view) {
    case 'lobby':
      return <WordChainLobby />;

    case 'waiting':
      return <WordChainWaitingRoom />;

    case 'playing':
      return <WordChainGame />;

    default:
      return <WordChainLobby />;
  }
};

export default WordChainContent;
