'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useGame } from '@/hooks/useGameState';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { RaceTrack } from './RaceTrack';
import { WpmChart } from './WpmChart';
import { StreakCounter } from './StreakCounter';
import { medal, placeLabel } from '@/lib/constants';

export function Race() {
  const { state, send } = useGame();
  const { players, myId, prompt, serverGameState } = state;

  const isRacing = serverGameState === 'racing';

  const sendProgress = useCallback(
    (progress: number, wpm: number) => send({ type: 'progress', progress, wpm }),
    [send],
  );
  const sendFinished = useCallback(
    (wpm: number, text: string) => send({ type: 'finished', wpm, text }),
    [send],
  );

  const {
    typedText,
    correctLen,
    wpm,
    finished: myFinished,
    handleInput,
    focusInput,
    inputRef,
    raceStartRef,
    wpmHistory,
    streak,
    maxStreak,
    accuracy,
  } = useTypingEngine(prompt, isRacing, sendProgress, sendFinished);

  // Timer display
  const [elapsed, setElapsed] = useState('0.0s');
  useEffect(() => {
    if (!isRacing) return;
    const interval = setInterval(() => {
      if (raceStartRef.current) {
        setElapsed(((Date.now() - raceStartRef.current) / 1000).toFixed(1) + 's');
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isRacing, raceStartRef]);

  // Auto-focus on race start and keydown
  useEffect(() => {
    if (isRacing) focusInput();
  }, [isRacing, focusInput]);

  useEffect(() => {
    const handler = () => {
      if (isRacing && !myFinished) focusInput();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isRacing, myFinished, focusInput]);

  // Color mapping
  const colorMap = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;
    players.forEach((p) => {
      if (map[p.id] === undefined) map[p.id] = counter++;
    });
    return map;
  }, [players]);

  // Sort players for track display
  const sorted = useMemo(() => {
    return [...players]
      .filter((p) => p.inGame)
      .sort((a, b) => {
        if (a.finished && b.finished) return (a.place ?? 999) - (b.place ?? 999);
        if (a.finished) return -1;
        if (b.finished) return 1;
        return (b.progress ?? 0) - (a.progress ?? 0);
      });
  }, [players]);

  // My finish info
  const me = players.find((p) => p.id === myId);
  const myPlace = me?.place;
  const showFinishBanner = myFinished && myPlace;

  // Spectator mode (joined mid-race)
  const isSpectating = isRacing && me && !me.inGame;

  // Render prompt with char-by-char coloring
  const promptChars = useMemo(() => {
    return prompt.split('').map((ch, i) => {
      let cls = '';
      if (i < typedText.length) {
        cls = typedText[i] === ch ? 'c-correct' : 'c-wrong';
      } else if (i === typedText.length) {
        cls = 'c-cursor';
      }
      return (
        <span key={i} className={cls}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      );
    });
  }, [prompt, typedText]);

  return (
    <div className="wrap" style={{ paddingTop: '1.75rem' }}>
      <div className="race-top">
        <div className="stat">
          <div className="stat-val">{elapsed}</div>
          <div className="stat-lbl">Time</div>
        </div>
        <div className="race-label">Type Race</div>
        <div className="stat">
          <div className="stat-val">{wpm}</div>
          <div className="stat-lbl">WPM</div>
        </div>
      </div>

      <div className="prompt-box" onClick={focusInput}>
        {isSpectating ? (
          <span style={{ color: 'var(--muted)' }}>Race in progress — watch the leaderboard!</span>
        ) : (
          promptChars
        )}
      </div>

      <input
        ref={inputRef}
        className="typing-input"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={myFinished || isSpectating}
        maxLength={prompt.length}
        value={typedText}
        onChange={(e) => handleInput(e.target.value)}
        onPaste={(e) => e.preventDefault()}
      />

      <div className="focus-hint" onClick={focusInput}>
        Click here or start typing to focus
      </div>

      {!isSpectating && (
        <StreakCounter streak={streak} maxStreak={maxStreak} accuracy={accuracy} />
      )}

      {showFinishBanner && (
        <div className="finish-banner">
          <div className="emoji">{medal(myPlace!)}</div>
          <div className="finfo">
            <h3>You finished {placeLabel(myPlace!)}!</h3>
            <p>{wpm} WPM · {accuracy}% accuracy · {maxStreak} best streak</p>
          </div>
        </div>
      )}

      {!isSpectating && wpmHistory.length > 0 && (
        <WpmChart history={wpmHistory} currentWpm={wpm} />
      )}

      <div className="tracks-hdr">Racers</div>
      {sorted.map((p) => (
        <RaceTrack
          key={p.id}
          player={p}
          isMe={p.id === myId}
          colorIndex={colorMap[p.id] ?? 0}
        />
      ))}

      {isSpectating && (
        <div className="overlay">
          <div className="overlay-card">
            <div className="spinner" />
            <h3>Race in Progress</h3>
            <p>Hang tight — you&apos;ll join the next round.</p>
          </div>
        </div>
      )}
    </div>
  );
}
