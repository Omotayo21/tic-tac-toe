// server/roomManager.js

// In-memory state
// Map of roomCode -> roomObject
const rooms = new Map();

// Helper to generate 7-char alphanumeric code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 8 winning combinations (3 rows, 3 cols, 2 diagonals)
const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6]             // diagonals
];

/**
 * Creates a new room and adds the first player
 */
function createRoom(playerName, socketId) {
  let roomCode = generateCode();
  while (rooms.has(roomCode)) {
    roomCode = generateCode(); // Ensure uniqueness
  }

  const room = {
    code: roomCode,
    players: [
      { name: playerName, socketId, symbol: 'X' }
    ],
    board: Array(9).fill(null),
    currentTurn: 'X',
    startingTurn: 'X',
    scores: {
      [playerName]: { wins: 0, losses: 0, draws: 0 }
    },
    status: 'waiting', // 'waiting' | 'playing' | 'finished'
    readyForRematch: new Set()
  };

  rooms.set(roomCode, room);
  return roomCode;
}

/**
 * Joins an existing room
 */
function joinRoom(roomCode, playerName, socketId) {
  const room = rooms.get(roomCode);
  
  if (!room) {
    return { error: 'Room not found. Check your code and try again.' };
  }
  
  if (room.players.length >= 2) {
    return { error: 'Room is full. This game has already started.' };
  }

  // Pre-fill score tracker for second player
  room.scores[playerName] = { wins: 0, losses: 0, draws: 0 };
  
  room.players.push({
    name: playerName,
    socketId,
    // Assign 'O' since creator is always 'X'
    symbol: 'O' 
  });
  
  room.status = 'playing';
  return { room };
}

/**
 * Returns the room object
 */
function getRoom(roomCode) {
  return rooms.get(roomCode);
}

/**
 * Validates a move, updates the board, and checks win/draw condition
 */
function makeMove(roomCode, socketId, cellIndex) {
  const room = rooms.get(roomCode);
  
  if (!room || room.status !== 'playing') {
    return { valid: false, error: 'Game is not active.' };
  }
  
  // Find which player made the move
  const player = room.players.find(p => p.socketId === socketId);
  if (!player) {
    return { valid: false, error: 'Player not in room.' };
  }
  
  // Check if it's their turn
  if (player.symbol !== room.currentTurn) {
    return { valid: false, error: 'Not your turn.' };
  }
  
  // Check if cell is empty
  if (room.board[cellIndex] !== null) {
    return { valid: false, error: 'Cell already taken.' };
  }
  
  // Make the move
  room.board[cellIndex] = player.symbol;
  
  // Check for win
  const winnerSymbol = checkWin(room.board);
  const isDraw = !winnerSymbol && room.board.every(cell => cell !== null);
  
  let winner = null;
  
  if (winnerSymbol) {
    room.status = 'finished';
    const winningPlayer = room.players.find(p => p.symbol === winnerSymbol);
    const losingPlayer = room.players.find(p => p.symbol !== winnerSymbol);
    
    winner = winningPlayer.name;
    
    // Update scores
    room.scores[winningPlayer.name].wins += 1;
    room.scores[losingPlayer.name].losses += 1;
    
  } else if (isDraw) {
    room.status = 'finished';
    // Update draw scores
    room.players.forEach(p => {
      room.scores[p.name].draws += 1;
    });
  } else {
    // Switch turns
    room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';
  }
  
  return {
    valid: true,
    board: room.board,
    winner,
    isDraw,
    nextTurn: room.currentTurn,
    scores: room.scores
  };
}

/**
 * Clears board and readies for a back-to-back game
 */
function resetBoard(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return null;
  
  room.board = Array(9).fill(null);
  room.status = 'playing';
  
  // Pivot the starting turn for fairness
  const nextTargetStart = room.startingTurn === 'X' ? 'O' : 'X';
  room.startingTurn = nextTargetStart;
  room.currentTurn = nextTargetStart;
  
  return room;
}

/**
 * Used for mutual rematch confirmation.
 */
function markReadyForRematch(roomCode, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return { bothReady: false, room: null };

  room.readyForRematch.add(socketId);

  if (room.readyForRematch.size === 2) {
    resetBoard(roomCode);
    room.readyForRematch.clear();
    return { bothReady: true, room };
  }

  return { bothReady: false, room };
}

/**
 * Cleanup room if a socket disconnects. 
 * If remaining players exist, notifies them. If empty, deletes.
 */
function removePlayer(socketId) {
  let foundRoomCode = null;
  let remainingPlayerSocketId = null;

  for (const [code, room] of rooms.entries()) {
    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    
    if (playerIndex !== -1) {
      foundRoomCode = code;
      room.players.splice(playerIndex, 1);
      room.readyForRematch.clear();
      
      // If room is empty, delete it completely
      if (room.players.length === 0) {
        rooms.delete(code);
      } else {
        // Change status to finished so remaining player can't play alone
        room.status = 'finished';
        remainingPlayerSocketId = room.players[0].socketId;
      }
      break;
    }
  }

  return { roomCode: foundRoomCode, remainingPlayerSocketId };
}

// Internal win check logic
function checkWin(board) {
  for (let pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // return 'X' or 'O'
    }
  }
  return null;
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  makeMove,
  resetBoard,
  markReadyForRematch,
  removePlayer
};
