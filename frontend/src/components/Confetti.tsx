'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

type ConfettiProps = {
  fire: boolean;
};

export function Confetti({ fire }: ConfettiProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!fire || firedRef.current) return;
    firedRef.current = true;

    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#6d28d9', '#8b5cf6', '#00d4ff', '#00ff88', '#ffd700', '#ff3366'];

    // Initial big burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      zIndex: 9999,
    });

    // Continuous shower
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors,
        zIndex: 9999,
      });
    }, 50);

    return () => clearInterval(interval);
  }, [fire]);

  return null;
}
