'use client';

import { BAR_GRADIENTS } from '@/lib/constants';
import { medal } from '@/lib/constants';
import type { PlayerData } from '@/hooks/useGameState';

type RaceTrackProps = {
  player: PlayerData;
  isMe: boolean;
  colorIndex: number;
};

export function RaceTrack({ player, isMe, colorIndex }: RaceTrackProps) {
  const pct = Math.min(100, player.progress ?? 0);
  const gradient = BAR_GRADIENTS[colorIndex % BAR_GRADIENTS.length];
  const placeText = player.place ? medal(player.place) : '';

  return (
    <div className={`track ${isMe ? 'me' : ''} ${player.finished ? 'done' : ''}`}>
      <div className="track-name">
        {player.name}{isMe ? ' \u2605' : ''}
      </div>
      <div className="bar-wrap">
        <div
          className="bar-fill"
          style={{ width: `${pct}%`, background: gradient }}
        >
          {pct > 0 && <div className="bar-car">{'\u{1F3CE}\u{FE0F}'}</div>}
        </div>
      </div>
      <div className="track-wpm">
        {player.wpm > 0 ? `${player.wpm} WPM` : '\u2014'}
      </div>
      <div className="track-place">{placeText}</div>
    </div>
  );
}
