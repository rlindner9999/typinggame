'use client';

import { useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useGame } from '@/hooks/useGameState';
import { useStaking } from '@/hooks/useStaking';

export function StakeButton() {
  const { state, dispatch, send } = useGame();
  const { address } = useAccount();
  const { stakingEnabled, activeGameId, stakeJoined, entryFeeEth } = state;

  const {
    balance,
    entryFee,
    stake,
    isStaking,
    isConfirming,
    isConfirmed,
    txHash,
    stakeError,
    resetStake,
  } = useStaking(activeGameId);

  // When tx confirmed, tell the server
  useEffect(() => {
    if (isConfirmed && txHash && !stakeJoined) {
      send({ type: 'staked', wallet: address?.toLowerCase() });
      dispatch({ type: 'STAKE_JOINED' });
    }
  }, [isConfirmed, txHash, stakeJoined, send, address, dispatch]);

  const handleStake = useCallback(() => {
    if (stakeJoined || !activeGameId) return;
    const ok = window.confirm(
      `Stake ${entryFee || entryFeeEth} ETH to enter the race?\n\nYour balance: ${balance || '?'} ETH`
    );
    if (!ok) return;
    stake();
  }, [stakeJoined, activeGameId, entryFee, entryFeeEth, balance, stake]);

  // Not staking mode — simple ready button
  if (!stakingEnabled) {
    return (
      <button
        className="btn btn-green"
        onClick={() => send({ type: 'ready' })}
        style={{ flex: 1, minWidth: 160 }}
      >
        Ready Up
      </button>
    );
  }

  // Already staked
  if (stakeJoined) {
    return (
      <div style={{ flex: 1, minWidth: 160 }}>
        <button className="btn btn-green active" disabled style={{ width: '100%' }}>
          {'\u2713'} Staked & Ready
        </button>
        <div className="stake-status ok" style={{ marginTop: '0.6rem' }}>
          You&apos;re in — win the race to claim the prize pool!
          {txHash && (
            <>
              {' '}
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                View transaction {'\u2197'}
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  // Need wallet
  if (!address) {
    return (
      <div style={{ flex: 1, minWidth: 160 }}>
        <button className="btn btn-gold" disabled style={{ width: '100%' }}>
          Connect Wallet to Stake
        </button>
        <div className="stake-status info" style={{ marginTop: '0.6rem' }}>
          Connect your wallet (Coinbase Wallet, etc.) to stake ETH and join the race.
        </div>
      </div>
    );
  }

  // No game round yet
  if (!activeGameId) {
    return (
      <div style={{ flex: 1, minWidth: 160 }}>
        <button className="btn btn-gold" disabled style={{ width: '100%' }}>
          Stake {entryFee || entryFeeEth} ETH — Waiting for Round
        </button>
        <div className="stake-status info" style={{ marginTop: '0.6rem' }}>
          A new round is being set up on-chain. Hang tight.
        </div>
      </div>
    );
  }

  // Ready to stake
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <button
        className="btn btn-gold"
        onClick={handleStake}
        disabled={isStaking || isConfirming}
        style={{ width: '100%' }}
      >
        {isStaking
          ? 'Confirm in wallet...'
          : isConfirming
          ? 'Confirming stake...'
          : `Stake ${entryFee || entryFeeEth} ETH & Ready Up`}
      </button>
      {stakeError && (
        <div className="stake-status err" style={{ marginTop: '0.6rem' }}>
          {(stakeError as any)?.shortMessage || stakeError.message || 'Transaction failed'}
        </div>
      )}
    </div>
  );
}
