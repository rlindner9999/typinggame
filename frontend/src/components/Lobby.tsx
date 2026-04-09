'use client';

import { useMemo } from 'react';
import { useGame } from '@/hooks/useGameState';
import { useStaking } from '@/hooks/useStaking';
import { PlayerCard } from './PlayerCard';
import { StakeButton } from './StakeButton';
import { PrizeBar } from './PrizeBar';

export function Lobby() {
  const { state } = useGame();
  const { players, myId, countdownValue, stakingEnabled, activeGameId } = state;
  const { balance, entryFee, prizePool } = useStaking(activeGameId);

  const colorMap = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;
    players.forEach((p) => {
      if (map[p.id] === undefined) map[p.id] = counter++;
    });
    return map;
  }, [players]);

  const readyCount = players.filter((p) => p.ready).length;

  const hint = readyCount >= 2
    ? `${readyCount}/${players.length} ready — countdown starting!`
    : readyCount === 1
    ? `${readyCount}/${players.length} ready — need 1 more`
    : 'Need at least 2 players ready to start';

  const isCountingDown = countdownValue !== null && countdownValue > 0;

  return (
    <div className="wrap" style={{ paddingTop: '2.5rem' }}>
      <div className="lobby-top">
        <h2>Lobby</h2>
        <div className={`badge ${isCountingDown ? 'badge-start' : 'badge-wait'}`}>
          {isCountingDown ? 'Starting...' : 'Waiting'}
        </div>
      </div>

      {isCountingDown && (
        <div key={countdownValue} className="countdown-big">
          {countdownValue}
        </div>
      )}

      <div className="player-grid">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            isMe={p.id === myId}
            colorIndex={colorMap[p.id] ?? 0}
          />
        ))}
      </div>

      <hr className="div" />

      <div className="lobby-bottom">
        <StakeButton />
      </div>
      <div className="lobby-hint">{hint}</div>

      {stakingEnabled && (
        <PrizeBar
          fee={entryFee}
          pool={prizePool}
          balance={balance}
        />
      )}
    </div>
  );
}
