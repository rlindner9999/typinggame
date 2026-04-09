'use client';

import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useEffect } from 'react';
import { useGame } from '@/hooks/useGameState';

type WalletConnectProps = {
  onConnected?: (address: string) => void;
};

export function WalletConnect({ onConnected }: WalletConnectProps) {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const { send } = useGame();

  // Auto-switch to Base Sepolia when connected to wrong chain
  useEffect(() => {
    if (isConnected && chain && chain.id !== baseSepolia.id) {
      switchChain({ chainId: baseSepolia.id });
    }
  }, [isConnected, chain, switchChain]);

  // Notify server and parent when wallet connects
  useEffect(() => {
    if (address) {
      send({ type: 'wallet', wallet: address.toLowerCase() });
      onConnected?.(address.toLowerCase());
    }
  }, [address, send, onConnected]);

  if (isConnected && address) {
    return (
      <div className="wallet-row">
        <button className="btn-wallet connected">
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-row">
      <button
        className="btn-wallet"
        onClick={() => {
          const connector = connectors[0];
          if (connector) connect({ connector, chainId: baseSepolia.id });
        }}
        disabled={isPending}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}
