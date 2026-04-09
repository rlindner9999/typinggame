'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGameState';
import { medal } from '@/lib/constants';

export function Results() {
  const { state } = useGame();
  const { results, myId } = state;
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

  return (
    <div className="wrap" style={{ paddingTop: '3rem' }}>
      <div className="results-hdr">
        <div className="results-title">Race Over</div>
        <div className="results-sub">
          {winner ? `${winner.name} wins with ${winner.wpm} WPM!` : ''}
        </div>
      </div>

      {results.map((r, i) => {
        const place = r.place ?? i + 1;
        const isMe = r.id === myId;
        return (
          <div
            key={r.id}
            className={`result-row ${isMe ? 'me-row' : ''}`}
            style={{ animationDelay: `${0.08 * (i + 1)}s` }}
          >
            <div className="rplace">{medal(place)}</div>
            <div className="rname">
              {r.name}
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

      <div className="next-round">
        Returning to lobby in <span>{countdown}</span>s
      </div>
    </div>
  );
}
