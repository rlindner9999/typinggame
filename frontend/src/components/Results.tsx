'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/hooks/useGameState';
import { medal } from '@/lib/constants';
import { Confetti } from './Confetti';

export function Results() {
  const { state } = useGame();
  const { results, myId, stakingEnabled } = state;
  const [countdown, setCountdown] = useState(12);

  useEffect(() => {
    setCountdown(12);
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [results]);

  const winner = results[0];
  const iWon = winner?.id === myId;
  const myResult = results.find((r) => r.id === myId);
  const myPlace = myResult?.place ?? results.findIndex((r) => r.id === myId) + 1;

  const totalPlayers = results.length;

  const titles = useMemo(() => {
    if (iWon) return { title: 'Victory!', sub: 'You dominated the race!' };
    if (myPlace === 2) return { title: 'So Close!', sub: 'Almost had it — next time!' };
    if (myPlace === 3) return { title: 'Podium Finish!', sub: 'Bronze is still shiny!' };
    return { title: 'Race Over', sub: winner ? `${winner.name} wins with ${winner.wpm} WPM!` : '' };
  }, [iWon, myPlace, winner]);

  return (
    <div className="wrap" style={{ paddingTop: '3rem' }}>
      <Confetti fire={iWon} />

      <div className="results-hdr">
        <div className={`results-title ${iWon ? 'winner-glow' : ''}`}>{titles.title}</div>
        <div className="results-sub">{titles.sub}</div>
      </div>

      {iWon && stakingEnabled && (
        <div className="prize-won-banner">
          <div className="prize-won-icon">{'\u{1F3C6}'}</div>
          <div className="prize-won-text">
            <div className="prize-won-label">Prize Pool Claimed</div>
            <div className="prize-won-amount">Winner takes all!</div>
          </div>
        </div>
      )}

      {results.map((r, i) => {
        const place = r.place ?? i + 1;
        const isMe = r.id === myId;
        const isWinner = i === 0;
        return (
          <div
            key={r.id}
            className={`result-row ${isMe ? 'me-row' : ''} ${isWinner ? 'winner-row' : ''}`}
            style={{ animationDelay: `${0.08 * (i + 1)}s` }}
          >
            <div className="rplace">{medal(place)}</div>
            <div className="rname">
              {r.name}
              {isWinner && <span className="winner-badge">WINNER</span>}
              {isMe && (
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}> (you)</span>
              )}
            </div>
            <div className="rwpm">
              <div className="rwpm-val">{r.wpm}</div>
              <div className="rwpm-lbl">WPM</div>
            </div>
          </div>
        );
      })}

      {myResult && (
        <div className="my-stats-card">
          <div className="my-stats-item">
            <div className="my-stats-val">{myResult.wpm}</div>
            <div className="my-stats-lbl">WPM</div>
          </div>
          <div className="my-stats-divider" />
          <div className="my-stats-item">
            <div className="my-stats-val">{myPlace}/{totalPlayers}</div>
            <div className="my-stats-lbl">Place</div>
          </div>
          <div className="my-stats-divider" />
          <div className="my-stats-item">
            <div className="my-stats-val">{Math.round(myResult.progress)}%</div>
            <div className="my-stats-lbl">Completed</div>
          </div>
        </div>
      )}

      <div className="next-round">
        Returning to lobby in <span>{countdown}</span>s
      </div>
    </div>
  );
}
