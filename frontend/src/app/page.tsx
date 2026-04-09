'use client';

import { useReducer, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  GameContext,
  gameReducer,
  initialGameState,
} from '@/hooks/useGameState';
import { useWebSocket } from '@/hooks/useWebSocket';
import { JoinScreen } from '@/components/JoinScreen';
import { Lobby } from '@/components/Lobby';
import { Race } from '@/components/Race';
import { Results } from '@/components/Results';
import { Notifications } from '@/components/Notifications';

export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const myIdRef = useRef<string | null>(null);
  const { address } = useAccount();

  const { send, connect } = useWebSocket(dispatch, myIdRef, !!address);

  const handleJoin = useCallback(
    (name: string, wallet: string | null) => {
      connect(name, wallet);
    },
    [connect],
  );

  const contextValue = { state, dispatch, send };

  return (
    <GameContext.Provider value={contextValue}>
      {state.screen === 'join' && <JoinScreen onJoin={handleJoin} />}
      {state.screen === 'lobby' && <Lobby />}
      {state.screen === 'race' && <Race />}
      {state.screen === 'results' && <Results />}
      <Notifications />
    </GameContext.Provider>
  );
}
