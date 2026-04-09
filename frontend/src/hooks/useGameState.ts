'use client';

import { createContext, useContext } from 'react';

export type PlayerData = {
  id: string;
  name: string;
  ready: boolean;
  staked: boolean;
  progress: number;
  wpm: number;
  finished: boolean;
  place: number | null;
  inGame: boolean;
  wallet: string | null;
};

export type ResultData = {
  id: string;
  name: string;
  place: number | null;
  wpm: number;
  progress: number;
};

export type GameScreen = 'join' | 'lobby' | 'race' | 'results';

export type GameState = {
  screen: GameScreen;
  myId: string | null;
  serverGameState: 'waiting' | 'racing' | 'results';
  players: PlayerData[];
  prompt: string;
  stakingEnabled: boolean;
  contractAddress: string | null;
  activeGameId: string | null;
  entryFeeEth: number;
  stakeJoined: boolean;
  pendingStake: boolean;
  countdownValue: number | null;
  results: ResultData[];
  notifications: { id: number; text: string }[];
};

export type GameAction =
  | { type: 'JOINED'; payload: { id: string; gameState: string; stakingEnabled: boolean; contractAddress: string | null; entryFee: string | null; gameId: string | null; players: PlayerData[]; prompt: string | null; hasWallet: boolean } }
  | { type: 'GAME_CREATED'; payload: { gameId: string } }
  | { type: 'PLAYER_JOINED'; payload: { players: PlayerData[]; playerName: string } }
  | { type: 'PLAYER_LEFT'; payload: { players: PlayerData[]; name: string } }
  | { type: 'LOBBY'; payload: { players: PlayerData[]; myId: string | null } }
  | { type: 'COUNTDOWN'; payload: { count: number } }
  | { type: 'COUNTDOWN_CANCELLED' }
  | { type: 'RACE_START'; payload: { prompt: string; players: PlayerData[] } }
  | { type: 'UPDATE'; payload: { players: PlayerData[] } }
  | { type: 'PLAYER_FINISHED'; payload: { players: PlayerData[]; id: string; name: string; place: number; wpm: number } }
  | { type: 'RESULTS'; payload: { results: ResultData[] } }
  | { type: 'SET_SCREEN'; payload: GameScreen }
  | { type: 'STAKE_JOINED' }
  | { type: 'SET_PENDING_STAKE'; payload: boolean }
  | { type: 'NOTIFY'; payload: string }
  | { type: 'REMOVE_NOTIFICATION'; payload: number };

export const initialGameState: GameState = {
  screen: 'join',
  myId: null,
  serverGameState: 'waiting',
  players: [],
  prompt: '',
  stakingEnabled: false,
  contractAddress: null,
  activeGameId: null,
  entryFeeEth: 0.00001,
  stakeJoined: false,
  pendingStake: false,
  countdownValue: null,
  results: [],
  notifications: [],
};

let notifCounter = 0;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'JOINED': {
      const { id, gameState: gs, stakingEnabled, contractAddress, entryFee, gameId, players, prompt, hasWallet } = action.payload;
      let screen: GameScreen = 'lobby';
      if (gs === 'racing') {
        screen = 'race';
      }
      return {
        ...state,
        myId: id,
        serverGameState: gs as GameState['serverGameState'],
        stakingEnabled,
        contractAddress,
        entryFeeEth: entryFee ? Number(entryFee) : state.entryFeeEth,
        activeGameId: gameId,
        players,
        prompt: prompt || '',
        screen,
        pendingStake: false,
      };
    }

    case 'GAME_CREATED': {
      return {
        ...state,
        activeGameId: action.payload.gameId,
        stakeJoined: false,
      };
    }

    case 'PLAYER_JOINED': {
      return {
        ...state,
        players: action.payload.players,
        notifications: [...state.notifications, { id: ++notifCounter, text: `${action.payload.playerName} joined the lobby` }],
      };
    }

    case 'PLAYER_LEFT': {
      return {
        ...state,
        players: action.payload.players,
        notifications: action.payload.name
          ? [...state.notifications, { id: ++notifCounter, text: `${action.payload.name} left` }]
          : state.notifications,
      };
    }

    case 'LOBBY': {
      const me = action.payload.players.find(p => p.id === action.payload.myId);
      return {
        ...state,
        serverGameState: 'waiting',
        players: action.payload.players,
        stakeJoined: me ? !!me.staked : false,
        activeGameId: null,
        countdownValue: null,
        screen: state.pendingStake ? state.screen : 'lobby',
      };
    }

    case 'COUNTDOWN':
      return { ...state, countdownValue: action.payload.count };

    case 'COUNTDOWN_CANCELLED':
      return { ...state, countdownValue: null };

    case 'RACE_START':
      return {
        ...state,
        serverGameState: 'racing',
        prompt: action.payload.prompt,
        players: action.payload.players,
        screen: 'race',
        countdownValue: null,
      };

    case 'UPDATE':
      return { ...state, players: action.payload.players };

    case 'PLAYER_FINISHED': {
      const { players, id, name, place, wpm } = action.payload;
      const isMe = id === state.myId;
      return {
        ...state,
        players,
        notifications: isMe
          ? state.notifications
          : [...state.notifications, { id: ++notifCounter, text: `${name} finished ${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `#${place}`} at ${wpm} WPM!` }],
      };
    }

    case 'RESULTS':
      return {
        ...state,
        serverGameState: 'results',
        results: action.payload.results,
        screen: 'results',
      };

    case 'SET_SCREEN':
      return { ...state, screen: action.payload };

    case 'STAKE_JOINED':
      return { ...state, stakeJoined: true, pendingStake: false };

    case 'SET_PENDING_STAKE':
      return { ...state, pendingStake: action.payload };

    case 'NOTIFY':
      return {
        ...state,
        notifications: [...state.notifications, { id: ++notifCounter, text: action.payload }],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    default:
      return state;
  }
}

export type GameContextType = {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  send: (data: Record<string, unknown>) => void;
};

export const GameContext = createContext<GameContextType>({
  state: initialGameState,
  dispatch: () => {},
  send: () => {},
});

export function useGame() {
  return useContext(GameContext);
}
