'use client';

import { useEffect } from 'react';
import { useGame } from '@/hooks/useGameState';

export function Notifications() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    if (state.notifications.length === 0) return;
    const latest = state.notifications[state.notifications.length - 1];
    const timer = setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: latest.id });
    }, 3100);
    return () => clearTimeout(timer);
  }, [state.notifications, dispatch]);

  return (
    <div className="notifs">
      {state.notifications.map((n) => (
        <div key={n.id} className="notif">{n.text}</div>
      ))}
    </div>
  );
}
