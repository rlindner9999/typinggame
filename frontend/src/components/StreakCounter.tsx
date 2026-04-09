'use client';

type StreakCounterProps = {
  streak: number;
  maxStreak: number;
  accuracy: number;
};

function getStreakTier(streak: number): { label: string; className: string } {
  if (streak >= 100) return { label: 'UNSTOPPABLE', className: 'streak-legendary' };
  if (streak >= 50) return { label: 'ON FIRE', className: 'streak-fire' };
  if (streak >= 25) return { label: 'HOT STREAK', className: 'streak-hot' };
  if (streak >= 10) return { label: 'COMBO', className: 'streak-warm' };
  return { label: '', className: '' };
}

export function StreakCounter({ streak, maxStreak, accuracy }: StreakCounterProps) {
  const tier = getStreakTier(streak);
  const showStreak = streak >= 10;

  return (
    <div className="streak-bar">
      <div className="streak-stat">
        <div className={`streak-accuracy ${accuracy === 100 ? 'perfect' : accuracy >= 95 ? 'great' : ''}`}>
          {accuracy}%
        </div>
        <div className="streak-label">Accuracy</div>
      </div>

      {showStreak && (
        <div className={`streak-combo ${tier.className}`}>
          <div className="streak-count">{streak}</div>
          <div className="streak-combo-label">{tier.label}</div>
        </div>
      )}

      <div className="streak-stat">
        <div className="streak-max">{maxStreak}</div>
        <div className="streak-label">Best Streak</div>
      </div>
    </div>
  );
}
