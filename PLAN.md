# Plan: React/Next.js Frontend Rewrite + Deploy & Fix Staking

## Context

The game works end-to-end as vanilla HTML/JS + Express/WebSocket. Two blockers remain:

1. **Contract not deployed** — no `.env` exists → `stakingEnabled=false` → staking bypassed
2. **Server startup bug** — no initial `createGame()` on startup → first players get stuck

The user wants the frontend rewritten to React/Next.js using **OnchainKit**, **Wagmi**, and **Viem** as recommended by Coinbase documentation. The Express+WebSocket server stays as-is (runs locally, holds PRIVATE_KEY).

---

## Phase 1: Fix server startup bug (prerequisite)

**File:** `server.js` line 52

Replace `initContract();` with:

```js
initContract().then(async () => {
  if (contract) {
    console.log('[contract] Creating initial game on startup...');
    const gameId = await onChainCreateGame();
    if (gameId !== null) {
      currentGameId = gameId;
      console.log(`[contract] Initial game ready, gameId=${gameId}`);
    }
  }
});
```

---

## Phase 2: Deploy contract to Base Sepolia

1. User provides PRIVATE_KEY for a funded Base Sepolia wallet
2. Create `.env` with PRIVATE_KEY + BASE_SEPOLIA_RPC_URL
3. Run `npm run deploy:baseSepolia`
4. Add CONTRACT_ADDRESS to `.env`
5. Restart server with `npm start`

---

## Phase 3: React/Next.js Frontend Rewrite

### 3a. Project structure

Create a `frontend/` directory (Next.js app) alongside the existing server:

```
cbtypinggame/
├── server.js              (unchanged — Express + WS backend)
├── contracts/             (unchanged)
├── frontend/              (NEW — Next.js app)
│   ├── package.json
│   ├── next.config.js
│   ├── .env.local         (NEXT_PUBLIC_* vars only)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── providers.tsx
│   │   ├── components/
│   │   │   ├── JoinScreen.tsx
│   │   │   ├── Lobby.tsx
│   │   │   ├── Race.tsx
│   │   │   ├── Results.tsx
│   │   │   ├── PlayerCard.tsx
│   │   │   ├── RaceTrack.tsx
│   │   │   ├── PrizeBar.tsx
│   │   │   ├── StakeButton.tsx
│   │   │   ├── WalletConnect.tsx
│   │   │   └── Notifications.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useGameState.ts
│   │   │   ├── useTypingEngine.ts
│   │   │   └── useStaking.ts
│   │   ├── lib/
│   │   │   ├── contract.ts      (ABI + address + config)
│   │   │   └── constants.ts     (colors, prompts, chain config)
│   │   └── styles/
│   │       └── globals.css      (port existing CSS vars + styles)
```

### 3b. Dependencies

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "@coinbase/onchainkit": "latest",
    "wagmi": "^2",
    "viem": "^2",
    "@tanstack/react-query": "^5"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20"
  }
}
```

### 3c. Provider setup (`providers.tsx`)

- `WagmiProvider` with Base Sepolia chain config
- `QueryClientProvider` (required by Wagmi)
- `OnchainKitProvider` with apiKey + chain

### 3d. State management (`useGameState.ts`)

Single React context/hook that replaces all vanilla global state:

| Vanilla global | React equivalent |
|---|---|
| `ws`, `myId`, `gameState` | `useWebSocket()` hook returns `{ ws, myId, gameState, players, prompt, ... }` |
| `walletAddress`, `stakingEnabled` | Wagmi's `useAccount()` + server `joined` msg |
| `activeGameId`, `stakeJoined`, `entryFeeEth` | `useGameState()` context |
| `colorMap`, `colorCounter` | Derived in component via `useMemo` |
| typing state (`typingInput.value`, cursor pos) | `useTypingEngine()` hook |

### 3e. WebSocket hook (`useWebSocket.ts`)

- Connect on mount, reconnect on close
- Parse all message types (joined, gameCreated, lobby, countdown, raceStart, update, playerFinished, results, etc.)
- Dispatch to `useGameState` reducer
- `send(data)` helper returned from hook

### 3f. Staking with Wagmi + Viem (`useStaking.ts`)

Replace raw `ethers.BrowserProvider` / `ethers.Contract` calls with:

```ts
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';

// Read entry fee
const { data: entryFee } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: GAME_ABI,
  functionName: 'entryFee',
});

// Read prize pool
const { data: gameData } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: GAME_ABI,
  functionName: 'getGame',
  args: [BigInt(activeGameId)],
  enabled: !!activeGameId,
});

// Player's ETH balance
const { data: balance } = useBalance({ address: walletAddress });

// Write: joinGame
const { writeContract } = useWriteContract();
const stake = () => writeContract({
  address: CONTRACT_ADDRESS,
  abi: GAME_ABI,
  functionName: 'joinGame',
  args: [BigInt(activeGameId)],
  value: entryFee,
});
```

For the join screen stake flow, use OnchainKit's `<Transaction>` component if batching is needed, or plain `useWriteContract` since it's a single call.

### 3g. Component mapping

| Screen | Component | Key behavior |
|---|---|---|
| Join | `JoinScreen.tsx` | Name input, `<WalletConnect>`, `<PrizeBar>` (fee/pool/balance), "Stake & Join" button |
| Lobby | `Lobby.tsx` | Player grid (`<PlayerCard>`), countdown, `<StakeButton>`, `<PrizeBar>`, ready status |
| Race | `Race.tsx` | Prompt display with char-by-char coloring, hidden input, timer, WPM, `<RaceTrack>` per player, finish banner |
| Results | `Results.tsx` | Sorted results list, medals, WPM, "next round" countdown |

### 3h. Wallet connection (`WalletConnect.tsx`)

Use Wagmi's `useConnect()` + `useAccount()`:
- Auto-switch to Base Sepolia via Wagmi chain config
- Show truncated address when connected
- On connect, send `{ type: 'wallet', wallet }` to WS server

### 3i. Typing engine (`useTypingEngine.ts`)

Port the vanilla typing logic:
- Track `typedText` via hidden input's `onChange`
- Calculate `correctLen`, `progress`, `wpm` as derived state
- `useEffect` to send progress updates every 150ms during racing
- Detect completion (all chars match) → send `{ type: 'finished', wpm }`
- Prevent paste, auto-focus during race

### 3j. CSS

Port all CSS custom properties and styles from `public/index.html` into `globals.css`. The theme (dark, purple/cyan/green accents) stays identical.

### 3k. WebSocket proxy (dev)

In `next.config.js`, proxy WS connections to the Express server:

```js
module.exports = {
  async rewrites() {
    return [{ source: '/ws', destination: 'http://localhost:3000' }];
  },
};
```

Or: connect directly to `ws://localhost:3000` in dev. In production, both would be behind a reverse proxy.

### 3l. Environment variables

`frontend/.env.local`:
```
NEXT_PUBLIC_ONCHAINKIT_API_KEY=<coinbase-api-key>
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_CONTRACT_ADDRESS=<from deploy>
NEXT_PUBLIC_CHAIN_ID=84532
```

---

## Phase 4: Server adjustment

Add CORS headers for Next.js dev server (port 3001) if needed. The Express server already serves static files from `public/` — that path remains as fallback but the primary frontend is now the Next.js app.

Update `server.js` to accept WebSocket upgrade on any path (already does — `wss` is attached to the HTTP server).

---

## Verification

1. **Server startup**: `node server.js` → logs "Connected to TypeRacerGame", "Initial game ready"
2. **Frontend dev**: `cd frontend && npm run dev` → Next.js on port 3001
3. **Connect wallet**: Click connect → Wagmi prompts wallet → Base Sepolia selected → address shown
4. **Stake**: Click "Stake & Join Race" → confirm dialog → wallet popup → ETH deducted → lobby shows "Staked & Ready"
5. **Race**: 2 players staked → countdown → type prompt → first finisher wins
6. **Payout**: Server calls `declareWinner` → winner receives prize pool on-chain
7. **New round**: Auto-reset → new game created → players can stake again
