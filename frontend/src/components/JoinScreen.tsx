'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useGame } from '@/hooks/useGameState';
import { useStaking } from '@/hooks/useStaking';
import { WalletConnect } from './WalletConnect';
import { PrizeBar } from './PrizeBar';

type JoinScreenProps = {
  onJoin: (name: string, wallet: string | null) => void;
};

export function JoinScreen({ onJoin }: JoinScreenProps) {
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState<{ cls: string; text: string } | null>(null);
  const { address, isConnected } = useAccount();
  const { state } = useGame();
  const { balance, entryFee, prizePool } = useStaking(state.activeGameId);

  const handleJoin = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setJoining(true);
    setStatus(null);
    onJoin(trimmed, address?.toLowerCase() || null);
  }, [name, address, onJoin]);

  return (
    <div className="screen-join">
      <div className="logo">
        <h1>TYPE<em>RACER</em></h1>
        <div className="sub">Battle Royale</div>
      </div>
      <div className="join-card">
        <h2>Enter the Arena</h2>
        <input
          className="field"
          type="text"
          placeholder="Your racer name"
          maxLength={20}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <WalletConnect />
        {isConnected && address && (
          <div className="wallet-addr" style={{ marginBottom: '1rem' }}>
            {address}
          </div>
        )}
        {isConnected && (
          <PrizeBar
            fee={entryFee}
            pool={prizePool}
            balance={balance}
            feeLabel="Your Stake"
          />
        )}
        <button
          className="btn btn-purple"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? 'Connecting...' : 'Stake & Join Race'}
        </button>
        {status && (
          <div className={`stake-status ${status.cls}`} style={{ marginTop: '0.6rem' }}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
