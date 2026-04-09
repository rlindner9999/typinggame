'use client';

import { AVATAR_COLORS } from '@/lib/constants';
import type { PlayerData } from '@/hooks/useGameState';

type PlayerCardProps = {
  player: PlayerData;
  isMe: boolean;
  colorIndex: number;
};

export function PlayerCard({ player, isMe, colorIndex }: PlayerCardProps) {
  const c = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const statusText = player.staked
    ? '\u{1F4B0} Staked & Ready'
    : player.ready
    ? 'Ready!'
    : 'Waiting...';

  return (
    <div className={`pcard ${player.ready ? 'ready' : ''}`}>
      <div
        className="avatar"
        style={{ background: c.bg, color: c.fg }}
      >
        {player.name[0]?.toUpperCase() || '?'}
      </div>
      <div className="pinfo">
        <div className="pname">
          {player.name}
          {isMe && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (you)</span>}
        </div>
        <div className={`pstatus ${player.ready ? 'ready' : ''}`}>
          {statusText}
        </div>
      </div>
      <div className="dot" />
    </div>
  );
}
