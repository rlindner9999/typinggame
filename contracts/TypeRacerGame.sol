// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TypeRacerGame
 * @notice Players pay a fixed ETH entry fee to join a race. The winner takes the entire prize pool.
 *         The server (operator/owner) controls game lifecycle: create, start, declare winner, cancel.
 */
contract TypeRacerGame is Ownable, ReentrancyGuard {

    // ── State ──────────────────────────────────────────────────────────────────

    uint256 public entryFee; // in wei

    enum GameStatus { Open, Started, Finished, Cancelled }

    struct Game {
        GameStatus status;
        address[] players;
        mapping(address => bool) hasJoined;
        address winner;
        uint256 prizePool;
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) private games;

    // ── Events ─────────────────────────────────────────────────────────────────

    event GameCreated(uint256 indexed gameId, uint256 entryFee);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameStarted(uint256 indexed gameId, uint256 prizePool);
    event WinnerDeclared(uint256 indexed gameId, address indexed winner, uint256 prize);
    event GameCancelled(uint256 indexed gameId);
    event EntryFeeUpdated(uint256 newFee);

    // ── Constructor ────────────────────────────────────────────────────────────

    constructor(uint256 _entryFee) Ownable(msg.sender) {
        require(_entryFee > 0, "Entry fee must be > 0");
        entryFee = _entryFee;
    }

    // ── Owner (server) functions ───────────────────────────────────────────────

    /**
     * @notice Create a new game. Called by the server when a lobby round starts.
     * @return gameId The ID of the newly created game.
     */
    function createGame() external onlyOwner returns (uint256 gameId) {
        gameId = nextGameId++;
        games[gameId].status = GameStatus.Open;
        emit GameCreated(gameId, entryFee);
    }

    /**
     * @notice Lock the game so no more players can join and the race begins.
     *         Requires at least 2 players.
     */
    function startGame(uint256 gameId) external onlyOwner {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Open, "Game not open");
        require(g.players.length >= 2, "Need at least 2 players");
        g.status = GameStatus.Started;
        emit GameStarted(gameId, g.prizePool);
    }

    /**
     * @notice Declare the winner and transfer the full prize pool to them.
     *         Only callable after the game has started.
     */
    function declareWinner(uint256 gameId, address winner) external onlyOwner nonReentrant {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Started, "Game not started");
        require(g.hasJoined[winner], "Winner did not join game");

        g.status = GameStatus.Finished;
        g.winner = winner;

        uint256 prize = g.prizePool;
        g.prizePool = 0;

        (bool sent, ) = winner.call{value: prize}("");
        require(sent, "ETH transfer failed");
        emit WinnerDeclared(gameId, winner, prize);
    }

    /**
     * @notice Cancel a game and refund all players. Usable in Open or Started state.
     */
    function cancelGame(uint256 gameId) external onlyOwner nonReentrant {
        Game storage g = games[gameId];
        require(
            g.status == GameStatus.Open || g.status == GameStatus.Started,
            "Cannot cancel this game"
        );
        g.status = GameStatus.Cancelled;

        uint256 refund = entryFee;
        for (uint256 i = 0; i < g.players.length; i++) {
            (bool sent, ) = g.players[i].call{value: refund}("");
            require(sent, "Refund failed");
        }

        emit GameCancelled(gameId);
    }

    /**
     * @notice Update the entry fee. Only affects future games.
     */
    function setEntryFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Fee must be > 0");
        entryFee = newFee;
        emit EntryFeeUpdated(newFee);
    }

    // ── Player functions ───────────────────────────────────────────────────────

    /**
     * @notice Pay the entry fee in ETH and join an open game.
     */
    function joinGame(uint256 gameId) external payable nonReentrant {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Open, "Game is not open for joining");
        require(!g.hasJoined[msg.sender], "Already joined this game");
        require(msg.value == entryFee, "Incorrect entry fee");

        g.hasJoined[msg.sender] = true;
        g.players.push(msg.sender);
        g.prizePool += msg.value;

        emit PlayerJoined(gameId, msg.sender);
    }

    // ── View functions ─────────────────────────────────────────────────────────

    function getGame(uint256 gameId) external view returns (
        GameStatus status,
        address[] memory players,
        address winner,
        uint256 prizePool
    ) {
        Game storage g = games[gameId];
        return (g.status, g.players, g.winner, g.prizePool);
    }

    function hasJoined(uint256 gameId, address player) external view returns (bool) {
        return games[gameId].hasJoined[player];
    }

    function getPlayerCount(uint256 gameId) external view returns (uint256) {
        return games[gameId].players.length;
    }

    /// @notice Allow contract to receive ETH (e.g. from player joins)
    receive() external payable {}
}
