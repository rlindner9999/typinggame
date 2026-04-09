'use client';

import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { GAME_ABI, getContractAddress } from '@/lib/contract';
import { baseSepolia } from 'wagmi/chains';

export function useStaking(activeGameId: string | null) {
  const contractAddress = getContractAddress();
  const { address } = useAccount();

  // ETH balance
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId: baseSepolia.id,
  });

  // Entry fee from contract
  const { data: entryFee } = useReadContract({
    address: contractAddress ?? undefined,
    abi: GAME_ABI,
    functionName: 'entryFee',
    chainId: baseSepolia.id,
    query: { enabled: !!contractAddress },
  });

  // Prize pool from contract
  const { data: gameData, refetch: refetchPool } = useReadContract({
    address: contractAddress ?? undefined,
    abi: GAME_ABI,
    functionName: 'getGame',
    args: activeGameId ? [BigInt(activeGameId)] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: !!contractAddress && !!activeGameId },
  });

  // Write contract
  const { writeContract, data: txHash, isPending: isStaking, error: stakeError, reset: resetStake } = useWriteContract();

  // Wait for tx confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const stake = () => {
    if (!contractAddress || !activeGameId || !entryFee) return;
    writeContract({
      address: contractAddress,
      abi: GAME_ABI,
      functionName: 'joinGame',
      args: [BigInt(activeGameId)],
      value: entryFee as bigint,
      chainId: baseSepolia.id,
    });
  };

  const formattedBalance = balanceData ? Number(formatEther(balanceData.value)).toFixed(4) : null;
  const formattedFee = entryFee ? formatEther(entryFee as bigint) : null;
  const prizePool = gameData ? formatEther((gameData as [number, string[], string, bigint])[3]) : null;

  return {
    address,
    balance: formattedBalance,
    entryFee: formattedFee,
    prizePool,
    stake,
    isStaking,
    isConfirming,
    isConfirmed,
    txHash,
    stakeError,
    resetStake,
    refetchBalance,
    refetchPool,
  };
}
