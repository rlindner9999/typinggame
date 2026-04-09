export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

export const AVATAR_COLORS = [
  { bg: '#1e1b4b', fg: '#a78bfa' },
  { bg: '#0c4a6e', fg: '#38bdf8' },
  { bg: '#064e3b', fg: '#34d399' },
  { bg: '#78350f', fg: '#fbbf24' },
  { bg: '#4c0519', fg: '#f472b6' },
  { bg: '#1a1a3e', fg: '#818cf8' },
];

export const BAR_GRADIENTS = [
  'linear-gradient(90deg, #5b21b6, #7c3aed)',
  'linear-gradient(90deg, #0369a1, #0ea5e9)',
  'linear-gradient(90deg, #065f46, #059669)',
  'linear-gradient(90deg, #92400e, #d97706)',
  'linear-gradient(90deg, #9d174d, #db2777)',
  'linear-gradient(90deg, #3730a3, #4f46e5)',
];

export function medal(n: number): string {
  if (n === 1) return '\u{1F947}';
  if (n === 2) return '\u{1F948}';
  if (n === 3) return '\u{1F949}';
  return `#${n}`;
}

export function placeLabel(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `#${n}`;
}
