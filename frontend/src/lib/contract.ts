export const GAME_ABI = [
  {
    name: 'joinGame',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'entryFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getPlayerCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getGame',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [
      { name: 'status', type: 'uint8' },
      { name: 'players', type: 'address[]' },
      { name: 'winner', type: 'address' },
      { name: 'prizePool', type: 'uint256' },
    ],
  },
  {
    name: 'hasJoined',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'gameId', type: 'uint256' },
      { name: 'player', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export function getContractAddress(): `0x${string}` | null {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr) return null;
  return addr as `0x${string}`;
}
