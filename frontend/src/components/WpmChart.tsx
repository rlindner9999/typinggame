'use client';

import { useMemo } from 'react';

type WpmChartProps = {
  history: number[];
  currentWpm: number;
};

const WIDTH = 300;
const HEIGHT = 60;
const PADDING = 4;

export function WpmChart({ history, currentWpm }: WpmChartProps) {
  const points = history.length > 1 ? history : [0, currentWpm];

  const { path, areaPath, maxWpm, avgWpm } = useMemo(() => {
    const max = Math.max(...points, 20);
    const avg = points.length > 0 ? Math.round(points.reduce((a, b) => a + b, 0) / points.length) : 0;
    const w = WIDTH - PADDING * 2;
    const h = HEIGHT - PADDING * 2;
    const step = points.length > 1 ? w / (points.length - 1) : w;

    const coords = points.map((v, i) => ({
      x: PADDING + i * step,
      y: PADDING + h - (v / max) * h,
    }));

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const last = coords[coords.length - 1];
    const areaD = d + ` L ${last.x} ${HEIGHT - PADDING} L ${coords[0].x} ${HEIGHT - PADDING} Z`;

    return { path: d, areaPath: areaD, maxWpm: max, avgWpm: avg };
  }, [points]);

  const lastPoint = points[points.length - 1];
  const lastY = PADDING + (HEIGHT - PADDING * 2) - (lastPoint / Math.max(...points, 20)) * (HEIGHT - PADDING * 2);

  return (
    <div className="wpm-chart-wrap">
      <div className="wpm-chart-header">
        <span className="wpm-chart-title">WPM</span>
        <span className="wpm-chart-stats">
          avg <strong>{avgWpm}</strong> &middot; peak <strong>{maxWpm}</strong>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="wpm-chart-svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wpmGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary-b)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#wpmGrad)" />
        <path d={path} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" />
        {points.length > 1 && (
          <circle
            cx={WIDTH - PADDING}
            cy={lastY}
            r="3"
            fill="var(--accent)"
            className="wpm-chart-dot"
          />
        )}
      </svg>
    </div>
  );
}
