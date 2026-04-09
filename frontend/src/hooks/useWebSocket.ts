'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '@/lib/constants';
import type { GameAction } from './useGameState';

type WSMessage = Record<string, unknown>;

export function useWebSocket(
  dispatch: React.Dispatch<GameAction>,
  myIdRef: React.MutableRefObject<string | null>,
  hasWallet: boolean,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const connectedRef = useRef(false);

  const send = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const connect = useCallback((name: string, wallet: string | null) => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', name, wallet }));
    };

    ws.onmessage = (e) => {
      let msg: WSMessage;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case 'joined':
          myIdRef.current = msg.id as string;
          dispatch({
            type: 'JOINED',
            payload: {
              id: msg.id as string,
              gameState: msg.gameState as string,
              stakingEnabled: !!msg.stakingEnabled,
              contractAddress: (msg.contractAddress as string) || null,
              entryFee: (msg.entryFee as string) || null,
              gameId: msg.gameId !== null && msg.gameId !== undefined ? String(msg.gameId) : null,
              players: msg.players as any[],
              prompt: (msg.prompt as string) || null,
              hasWallet: !!wallet,
            },
          });
          break;

        case 'gameCreated':
          dispatch({ type: 'GAME_CREATED', payload: { gameId: String(msg.gameId) } });
          break;

        case 'playerJoined':
          dispatch({
            type: 'PLAYER_JOINED',
            payload: {
              players: msg.players as any[],
              playerName: (msg.player as any)?.name || 'Someone',
            },
          });
          break;

        case 'playerLeft':
          dispatch({
            type: 'PLAYER_LEFT',
            payload: { players: msg.players as any[], name: (msg.name as string) || '' },
          });
          break;

        case 'lobby':
          dispatch({
            type: 'LOBBY',
            payload: { players: msg.players as any[], myId: myIdRef.current },
          });
          break;

        case 'countdown':
          dispatch({ type: 'COUNTDOWN', payload: { count: msg.count as number } });
          break;

        case 'countdownCancelled':
          dispatch({ type: 'COUNTDOWN_CANCELLED' });
          break;

        case 'raceStart':
          dispatch({
            type: 'RACE_START',
            payload: { prompt: msg.prompt as string, players: msg.players as any[] },
          });
          break;

        case 'update':
          dispatch({ type: 'UPDATE', payload: { players: msg.players as any[] } });
          break;

        case 'playerFinished':
          dispatch({
            type: 'PLAYER_FINISHED',
            payload: {
              players: msg.players as any[],
              id: msg.id as string,
              name: msg.name as string,
              place: msg.place as number,
              wpm: msg.wpm as number,
            },
          });
          break;

        case 'results':
          dispatch({ type: 'RESULTS', payload: { results: msg.results as any[] } });
          break;
      }
    };

    ws.onclose = () => {
      connectedRef.current = false;
      wsRef.current = null;
      dispatch({ type: 'NOTIFY', payload: 'Disconnected. Reload to reconnect.' });
      setTimeout(() => dispatch({ type: 'SET_SCREEN', payload: 'join' }), 800);
    };

    ws.onerror = () => {};
  }, [dispatch, myIdRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        connectedRef.current = false;
      }
    };
  }, []);

  return { send, connect, wsRef };
}
