'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type TypingState = {
  typedText: string;
  correctLen: number;
  progress: number;
  wpm: number;
  finished: boolean;
};

export function useTypingEngine(
  prompt: string,
  isRacing: boolean,
  sendProgress: (progress: number, wpm: number) => void,
  sendFinished: (wpm: number, text: string) => void,
) {
  const [typedText, setTypedText] = useState('');
  const [finished, setFinished] = useState(false);
  const raceStartRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      raceStartRef.current = Date.now();

      // Start progress sending interval
      progressIntervalRef.current = setInterval(() => {
        if (inputRef.current) {
          const val = inputRef.current.value;
          sendProgress(
            prompt.length > 0 ? (getCorrectLen(val) / prompt.length) * 100 : 0,
            getWpm(val),
          );
        }
      }, 150);
    } else {
      raceStartRef.current = null;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isRacing, prompt, sendProgress, getCorrectLen, getWpm]);

  const handleInput = useCallback((value: string) => {
    if (!isRacing || finished) return;
    const clamped = value.slice(0, prompt.length);
    setTypedText(clamped);

    // Check if done
    if (clamped.length === prompt.length && getCorrectLen(clamped) === prompt.length) {
      const w = getWpm(clamped);
      sendFinished(w, clamped);
      setFinished(true);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [isRacing, finished, prompt, getCorrectLen, getWpm, sendFinished]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const state: TypingState = {
    typedText,
    correctLen: getCorrectLen(typedText),
    progress: getProgress(typedText),
    wpm: getWpm(typedText),
    finished,
  };

  return {
    ...state,
    handleInput,
    focusInput,
    inputRef,
    raceStartRef,
  };
}
