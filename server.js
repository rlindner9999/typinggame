require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { ethers } = require('ethers');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

// CORS for Next.js dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// === CONTRACT SETUP ===
let contract = null;
let currentGameId = null; // on-chain game id for the active race

const CONTRACT_ABI = [
  "function createGame() external returns (uint256)",
  "function startGame(uint256 gameId) external",
  "function declareWinner(uint256 gameId, address winner) external",
  "function cancelGame(uint256 gameId) external",
  "function entryFee() external view returns (uint256)",
  "function getGame(uint256 gameId) external view returns (uint8 status, address[] players, address winner, uint256 prizePool)",
  "event GameCreated(uint256 indexed gameId, uint256 entryFee)",
  "event WinnerDeclared(uint256 indexed gameId, address indexed winner, uint256 prize)",
];

async function initContract() {
  const pk = process.env.PRIVATE_KEY;
  const addr = process.env.CONTRACT_ADDRESS;
  const rpc = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

  if (!pk || !addr) {
    console.log('[contract] PRIVATE_KEY or CONTRACT_ADDRESS not set — running without crypto staking');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(pk, provider);
    contract = new ethers.Contract(addr, CONTRACT_ABI, wallet);
    const fee = await contract.entryFee();
    console.log(`[contract] Connected to TypeRacerGame at ${addr}`);
    console.log(`[contract] Entry fee: ${ethers.formatEther(fee)} ETH`);
  } catch (err) {
    console.error('[contract] Failed to connect:', err.message);
  }
}

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

// === PROMPTS ===
const PROMPTS = [
  "The human brain contains approximately eighty-six billion neurons, each connected to thousands of others. These connections form a vast network that processes information faster than any supercomputer ever built. Scientists are still discovering new ways the brain adapts and changes throughout a person's lifetime. The plasticity of the brain allows humans to learn entirely new skills at virtually any age.",

  "Deep in the Amazon rainforest, new species of plants and animals are discovered every few weeks by researchers. The dense canopy blocks most sunlight from reaching the forest floor below. Thousands of unique organisms have evolved remarkable adaptations to survive in this complex environment. Many of these undiscovered species may hold secrets that could revolutionize modern medicine.",

  "Artificial intelligence is rapidly transforming nearly every industry and profession around the world today. Machines can now recognize faces, translate languages, and even compose music with remarkable accuracy. The pace of these advancements has left many experts both amazed and genuinely concerned about the future. Society must carefully consider how best to harness this extraordinary technology responsibly.",

  "The universe is estimated to be about thirteen point eight billion years old and is still expanding outward. Within this vast expanse exist hundreds of billions of galaxies, each containing billions of individual stars. Scientists believe that dark matter and dark energy make up the overwhelming majority of the universe. Understanding these cosmic mysteries remains one of the greatest challenges in modern physics.",

  "The printing press, invented by Johannes Gutenberg in the fifteenth century, forever changed the course of civilization. Before its invention, books were copied entirely by hand and available only to the wealthy and powerful. The press made knowledge accessible to ordinary people across Europe and eventually the entire world. This single invention is credited with sparking both the Renaissance and the Scientific Revolution.",

  "Coffee is one of the most widely traded agricultural commodities in the world, second only to crude petroleum oil. The drink originated in Ethiopia, where legend says a goat herder noticed his animals had unusual energy after eating certain berries. Today billions of people around the globe rely on coffee to start their mornings and power through long afternoons. The complex flavor of coffee can vary dramatically depending on where the beans were grown.",

  "The ocean covers more than seventy percent of the Earth's total surface area and remains largely unexplored by science. More is currently known about the surface of the moon than about the deep sea floor below. Strange and extraordinary creatures inhabit the crushing darkness at the bottom of the deepest ocean trenches. Each new deep sea expedition reveals species that continually challenge our understanding of life.",

  "Ancient philosophers debated what truly makes a human life good, meaningful, and worth living to the fullest. Aristotle firmly believed that genuine happiness comes from living in accordance with virtue and practical reason. Others throughout history have argued that pleasure, deep relationships, or personal purpose are the true sources of human flourishing. This profound debate continues vigorously in both academic philosophy and everyday human conversations.",

  "The Great Wall of China stretches across thousands of miles of rugged terrain in northern China. Construction began over two thousand years ago and continued for many centuries under different ruling dynasties. The wall was built primarily to protect Chinese states from invasions by nomadic groups from the north. Today it stands as one of the most impressive architectural achievements in all of human history.",

  "Every year, millions of monarch butterflies migrate from Canada and the United States to central Mexico. These delicate creatures navigate thousands of miles using the sun as a compass and sensing Earth's magnetic field. Scientists are still unraveling the mystery of how such a tiny insect can complete this incredible journey. The survival of this migration depends on the health of ecosystems across an entire continent.",
];

// === GAME STATE ===
let gameState = 'waiting'; // waiting | racing | results
let players = new Map();   // ws -> playerData
let currentPrompt = '';
let countdownTimer = null;
let countdownValue = 5;
let raceStartTime = null;
let finishPlace = 0;
let resultsTimeout = null;

// === HELPERS ===
function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function getSnapshot() {
  return [...players.values()].map(({ id, name, ready, staked, progress, wpm, finished, place, inGame, wallet }) =>
    ({ id, name, ready, staked, progress, wpm, finished, place, inGame, wallet })
  );
}

const stakingEnabled = !!(process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS);

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const [ws] of players) if (ws.readyState === 1) ws.send(msg);
}

// === CONTRACT HELPERS ===
async function onChainCreateGame() {
  if (!contract) return null;
  try {
    const tx = await contract.createGame();
    const receipt = await tx.wait();
    // Parse GameCreated event to get gameId
    const iface = new ethers.Interface(CONTRACT_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'GameCreated') {
          const gameId = parsed.args[0];
          console.log(`[contract] Game created on-chain, gameId=${gameId}`);
          return gameId;
        }
      } catch { /* skip unparseable logs */ }
    }
  } catch (err) {
    console.error('[contract] createGame failed:', err.message);
  }
  return null;
}

async function onChainStartGame(gameId) {
  if (!contract || gameId === null) return;
  try {
    const tx = await contract.startGame(gameId);
    await tx.wait();
    console.log(`[contract] startGame(${gameId}) confirmed`);
  } catch (err) {
    console.error('[contract] startGame failed:', err.message);
  }
}

async function onChainDeclareWinner(gameId, winnerAddress) {
  if (!contract || gameId === null || !winnerAddress) return;
  try {
    const tx = await contract.declareWinner(gameId, winnerAddress);
    await tx.wait();
    console.log(`[contract] declareWinner(${gameId}, ${winnerAddress}) confirmed`);
  } catch (err) {
    console.error('[contract] declareWinner failed:', err.message);
  }
}

async function onChainCancelGame(gameId) {
  if (!contract || gameId === null) return;
  try {
    const tx = await contract.cancelGame(gameId);
    await tx.wait();
    console.log(`[contract] cancelGame(${gameId}) confirmed`);
  } catch (err) {
    console.error('[contract] cancelGame failed:', err.message);
  }
}

// === GAME LOGIC ===
function checkCountdown() {
  if (gameState !== 'waiting') return;
  const readyCount = [...players.values()].filter(p => p.ready).length;
  const totalCount = players.size;
  const threshold = Math.ceil(totalCount * 2 / 3);


  if (readyCount >= 2 && readyCount >= threshold && !countdownTimer) {
    countdownValue = 5;
    broadcast({ type: 'countdown', count: countdownValue });
    countdownTimer = setInterval(() => {
      countdownValue--;
      if (countdownValue <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        startRace();
      } else {
        broadcast({ type: 'countdown', count: countdownValue });
      }
    }, 1000);

  } else if ((readyCount < 2 || readyCount < threshold) && countdownTimer) {

    clearInterval(countdownTimer);
    countdownTimer = null;
    broadcast({ type: 'countdownCancelled' });
  }
}

async function startRace() {
  const racers = [...players.values()].filter(p => p.ready);
  if (racers.length < 2) { gameState = 'waiting'; return; }

  gameState = 'racing';
  currentPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  raceStartTime = Date.now();
  finishPlace = 0;

  for (const p of players.values()) {
    if (p.ready) {
      Object.assign(p, { inGame: true, progress: 0, wpm: 0, finished: false, place: null });
    }
  }

  // Lock the on-chain game (already created at lobby reset)
  if (currentGameId !== null) {
    onChainStartGame(currentGameId);
  }

  broadcast({ type: 'raceStart', prompt: currentPrompt, players: getSnapshot() });
}

function checkRaceEnd() {
  if (gameState !== 'racing') return;
  const inGame = [...players.values()].filter(p => p.inGame);
  if (inGame.length === 0) { resetGame(); return; }
  if (inGame.every(p => p.finished)) endRace();
}

function endRace(winnerPlayer) {
  if (gameState !== 'racing') return;
  gameState = 'results';

  const results = [...players.values()]
    .filter(p => p.inGame)
    .sort((a, b) => (a.place ?? 999) - (b.place ?? 999))
    .map(({ id, name, place, wpm, progress }) => ({ id, name, place, wpm, progress }));

  broadcast({ type: 'results', results });

  // Declare winner on-chain, or cancel/refund if no valid winner
  if (winnerPlayer?.wallet && currentGameId !== null) {
    onChainDeclareWinner(currentGameId, winnerPlayer.wallet);
  } else if (currentGameId !== null) {
    onChainCancelGame(currentGameId);
  }
  currentGameId = null;

  resultsTimeout = setTimeout(resetGame, 12000);
}

async function resetGame() {
  clearTimeout(resultsTimeout);
  resultsTimeout = null;

  // Cancel any in-flight on-chain game (e.g. everyone disconnected)
  if (currentGameId !== null) {
    const gid = currentGameId;
    currentGameId = null;
    onChainCancelGame(gid);
  }

  gameState = 'waiting';
  currentPrompt = '';
  finishPlace = 0;

  for (const p of players.values()) {
    Object.assign(p, { ready: false, staked: false, progress: 0, wpm: 0, finished: false, place: null, inGame: false });
  }

  broadcast({ type: 'lobby', players: getSnapshot() });

  // Create a fresh on-chain game so players can stake immediately
  if (contract) {
    onChainCreateGame().then(gameId => {
      if (gameId !== null) {
        currentGameId = gameId;
        broadcast({ type: 'gameCreated', gameId: gameId.toString() });
      }
    });
  }
}

// === WEBSOCKET ===
wss.on('connection', (ws) => {
  const playerId = uid();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    const player = players.get(ws);

    switch (msg.type) {
      case 'join': {
        if (players.has(ws)) return;
        const name = String(msg.name ?? 'Anonymous').trim().slice(0, 20) || 'Anonymous';
        const wallet = msg.wallet ? String(msg.wallet).toLowerCase() : null;
        players.set(ws, { id: playerId, name, wallet, ready: false, staked: false, progress: 0, wpm: 0, finished: false, place: null, inGame: false });

        send(ws, {
          type: 'joined',
          id: playerId,
          gameState,
          prompt: gameState === 'racing' ? currentPrompt : null,
          players: getSnapshot(),
          contractAddress: process.env.CONTRACT_ADDRESS || null,
          stakingEnabled,
          entryFee: stakingEnabled ? '0.00001' : null,  // ETH, human-readable
          gameId: currentGameId !== null ? currentGameId.toString() : null,
        });

        const joined = players.get(ws);
        for (const [other] of players) {
          if (other !== ws && other.readyState === 1) {
            other.send(JSON.stringify({ type: 'playerJoined', player: { id: joined.id, name: joined.name }, players: getSnapshot() }));
          }
        }
        break;
      }

      case 'wallet': {
        // Player connected their wallet after joining
        if (!player) break;
        player.wallet = msg.wallet ? String(msg.wallet).toLowerCase() : null;
        broadcast({ type: 'lobby', players: getSnapshot() });
        break;
      }

      case 'ready': {
        if (!player || gameState !== 'waiting') break;
        // When staking is required, players must stake first (staked msg auto-readies them)
        if (stakingEnabled && !player.staked) break;
        player.ready = !player.ready;
        broadcast({ type: 'lobby', players: getSnapshot() });
        checkCountdown();
        break;
      }

      case 'staked': {
        // Client confirmed on-chain joinGame() succeeded
        if (!player || gameState !== 'waiting' || player.staked) break;
        const wallet = msg.wallet ? String(msg.wallet).toLowerCase() : player.wallet;
        player.wallet = wallet;
        player.staked = true;
        player.ready = true;  // staking = readying
        broadcast({ type: 'lobby', players: getSnapshot() });
        checkCountdown();
        break;
      }

      case 'progress': {
        if (!player || gameState !== 'racing' || !player.inGame || player.finished) break;
        player.progress = Math.min(100, Math.max(0, Number(msg.progress) || 0));
        player.wpm = Math.max(0, Number(msg.wpm) || 0);
        broadcast({ type: 'update', players: getSnapshot() });
        break;
      }

      case 'finished': {
        if (!player || gameState !== 'racing' || !player.inGame || player.finished) break;

        // Verify the player actually typed the full prompt
        const typedText = String(msg.text ?? '');
        if (typedText !== currentPrompt) break;

        // Compute server-side WPM and reject impossibly fast finishes (>300 WPM)
        const elapsedMs = Date.now() - raceStartTime;
        const wordCount = currentPrompt.split(/\s+/).length;
        const elapsedMin = elapsedMs / 60000;
        const serverWpm = elapsedMin > 0 ? Math.round(wordCount / elapsedMin) : Infinity;
        if (serverWpm > 300) break;

        player.finished = true;
        player.progress = 100;
        player.wpm = serverWpm;
        player.place = ++finishPlace;
        broadcast({ type: 'playerFinished', players: getSnapshot(), id: player.id, name: player.name, place: player.place, wpm: player.wpm });
        endRace(player);
        break;
      }
    }
  });

  ws.on('close', () => {
    const player = players.get(ws);
    if (player?.inGame && !player.finished && gameState === 'racing') {
      player.finished = true; // forfeit on disconnect
    }
    players.delete(ws);
    if (player) {
      broadcast({ type: 'playerLeft', name: player.name, players: getSnapshot() });
      if (gameState === 'racing') checkRaceEnd();
      else if (gameState === 'waiting') checkCountdown();
    }
  });

  ws.on('error', () => players.delete(ws));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TypeRacer Battle Royale running at http://localhost:${PORT}`);
});
