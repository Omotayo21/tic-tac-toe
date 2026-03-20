// server/socketHandlers.js
const {
  createRoom,
  joinRoom,
  getRoom,
  makeMove,
  resetBoard,
  markReadyForRematch,
  removePlayer
} = require('./roomManager');

function registerHandlers(io, socket) {

  // 1. Create Room
  socket.on('create-room', (payload) => {
    const { playerName } = payload;
    if (!playerName) return;

    const roomCode = createRoom(playerName, socket.id);
    
    socket.join(roomCode);
      console.log('[CREATE-ROOM] socket', socket.id, 'joined room:', roomCode)
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;
    socket.emit('room-created', { 
      roomCode, 
      playerName: socket.data.playerName,
      yourSymbol: 'X'  // creator always gets X
    });
  });

  // 2. Join Room
  socket.on('join-room', (payload) => {
    
    const { playerName, roomCode } = payload;
      console.log('[JOIN-ROOM] received:', playerName, roomCode)
    if (!playerName || !roomCode) return;

    const result = joinRoom(roomCode, playerName, socket.id);
    
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    const { room } = result;

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;

    const yourSymbol = room.players.find(p => p.socketId === socket.id).symbol;

    socket.emit('room-joined', { 
      roomCode, 
      players: room.players, 
      board: room.board, 
      yourSymbol 
    });

    console.log('[OPPONENT-JOINED] emitting to room:', roomCode, 'opponentName:', playerName, 'opponentSymbol:', yourSymbol) 
    socket.to(roomCode).emit('opponent-joined', {
      opponentName: playerName,
      opponentSymbol: yourSymbol
    });
  });

  // 3. Make Move
  socket.on('make-move', (payload) => {
    const { cellIndex } = payload;
    const roomCode = socket.data.roomCode;
    
    if (!roomCode) return;

    const result = makeMove(roomCode, socket.id, cellIndex);
    
    if (!result.valid) {
      socket.emit('error', result.error);
      return;
    }

    io.to(roomCode).emit('board-updated', {
      board: result.board,
      nextTurn: result.nextTurn
    });

    if (result.winner || result.isDraw) {
      io.to(roomCode).emit('game-over', {
        winner: result.winner,
        isDraw: result.isDraw,
        scores: result.scores
      });
    }
  });

  // 4. New Game (Rematch)
  socket.on('new-game', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const { bothReady, room } = markReadyForRematch(roomCode, socket.id);
    if (!room) return;

    if (!bothReady) {
      socket.to(roomCode).emit('rematch-pending', { message: 'Your opponent wants a rematch!' });
      socket.emit('rematch-waiting', { message: "Waiting for opponent to confirm..." });
    } else {
      io.to(roomCode).emit('game-reset', {
        board: room.board,
        currentTurn: room.currentTurn,
        scores: room.scores
      });
    }
  });

  // 5. Disconnect
socket.on('disconnect', () => {
  console.log('[DISCONNECT]', socket.id)
  const { roomCode, remainingPlayerSocketId } = removePlayer(socket.id)
  console.log('[DISCONNECT] roomCode:', roomCode, 'remaining:', remainingPlayerSocketId)
  
  if (roomCode && remainingPlayerSocketId) {
    io.to(remainingPlayerSocketId).emit('player-left', { 
      message: 'Your opponent disconnected.' 
    })
  }
})

  // 6. Cancel Waiting
  socket.on('cancel-waiting', () => {
    removePlayer(socket.id);
  });

  // 7. Explicit Leave Room
  socket.on('leave-room', () => {
    const { roomCode, remainingPlayerSocketId } = removePlayer(socket.id);
    if (roomCode && remainingPlayerSocketId) {
      io.to(remainingPlayerSocketId).emit('player-left', { 
        message: 'Your opponent left the room.' 
      });
    }
  });

  // 8. Voice Chat Signaling
  socket.on('voice-ready', () => {
    const roomCode = socket.data.roomCode;
    if (roomCode) {
      socket.to(roomCode).emit('voice-ready', { from: socket.id });
    }
  });

  socket.on('webrtc-signal', (payload) => {
    const roomCode = socket.data.roomCode;
    if (roomCode && payload.signal) {
      socket.to(roomCode).emit('webrtc-signal', { 
        signal: payload.signal, 
        from: socket.id 
      });
    }
  });

  socket.on('voice-ended', () => {
    const roomCode = socket.data.roomCode;
    if (roomCode) {
      socket.to(roomCode).emit('voice-ended', { from: socket.id });
    }
  });
}

module.exports = { registerHandlers };
