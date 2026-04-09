'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type TypingState = {
  typedText: string;
  correctLen: number;
  progress: number;
  wpm: number;
  finished: boolean;
  wpmHistory: number[];
  streak: number;
  maxStreak: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  accuracy: number;
};

export function useTypingEngine(
  prompt: string,
  isRacing: boolean,
  sendProgress: (progress: number, wpm: number) => void,
  sendFinished: (wpm: number, text: string) => void,
) {
  const [typedText, setTypedText] = useState('');
  const [finished, setFinished] = useState(false);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
  const raceStartRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wpmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getCorrectLen = useCallback((typed: string) => {
    let i = 0;
    while (i < typed.length && i < prompt.length && typed[i] === prompt[i]) i++;
    return i;
  }, [prompt]);

  const getProgress = useCallback((typed: string) => {
    if (prompt.length === 0) return 0;
    return (getCorrectLen(typed) / prompt.length) * 100;
  }, [prompt, getCorrectLen]);

  const getWpm = useCallback((typed: string) => {
    if (!raceStartRef.current) return 0;
    const mins = (Date.now() - raceStartRef.current) / 60000;
    if (mins < 0.005) return 0;
    return Math.round((getCorrectLen(typed) / 5) / mins);
  }, [getCorrectLen]);

  // Reset when race starts
  useEffect(() => {
    if (isRacing) {
      setTypedText('');
      setFinished(false);
      setWpmHistory([]);
      setStreak(0);
      setMaxStreak(0);
      setTotalKeystrokes(0);
      setCorrectKeystrokes(0);
      raceStartRef.current = Date.now();

      // Progress sending interval (150ms)
      progressIntervalRef.current = setInterval(() => {
        if (inputRef.current) {
          const val = inputRef.current.value;
          sendProgress(
            prompt.length > 0 ? (getCorrectLen(val) / prompt.length) * 100 : 0,
            getWpm(val),
          );
        }
      }, 150);

      // WPM history sampling (every 500ms)
      wpmIntervalRef.current = setInterval(() => {
        if (inputRef.current) {
          const w = getWpm(inputRef.current.value);
          setWpmHistory((prev) => [...prev, w]);
        }
      }, 500);
    } else {
      raceStartRef.current = null;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (wpmIntervalRef.current) {
        clearInterval(wpmIntervalRef.current);
        wpmIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (wpmIntervalRef.current) {
        clearInterval(wpmIntervalRef.current);
        wpmIntervalRef.current = null;
      }
    };
  }, [isRacing, prompt, sendProgress, getCorrectLen, getWpm]);

  const handleInput = useCallback((value: string) => {
    if (!isRacing || finished) return;

    // Block on errors: only allow typing the next correct character
    if (value.length > typedText.length) {
      setTotalKeystrokes((n) => n + 1);
      const newChar = value[typedText.length];

      if (newChar !== prompt[typedText.length]) {
        // Wrong key -- break streak, still count the attempt
        setStreak(0);
        return;
      }

      // Correct key
      setCorrectKeystrokes((n) => n + 1);
      setStreak((prev) => {
        const next = prev + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });

      const accepted = value.slice(0, typedText.length + 1);
      setTypedText(accepted);

      if (accepted.length === prompt.length) {
        const w = getWpm(accepted);
        sendFinished(w, accepted);
        setFinished(true);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        if (wpmIntervalRef.current) {
          clearInterval(wpmIntervalRef.current);
          wpmIntervalRef.current = null;
        }
      }
    } else {
      // Backspace -- always allowed, does not affect streak/accuracy
      setTypedText(value);
    }
  }, [isRacing, finished, prompt, typedText, getWpm, sendFinished]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const accuracy = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 100;

  const state: TypingState = {
    typedText,
    correctLen: getCorrectLen(typedText),
    progress: getProgress(typedText),
    wpm: getWpm(typedText),
    finished,
    wpmHistory,
    streak,
    maxStreak,
    totalKeystrokes,
    correctKeystrokes,
    accuracy,
  };

  return {
    ...state,
    handleInput,
    focusInput,
    inputRef,
    raceStartRef,
  };
}
