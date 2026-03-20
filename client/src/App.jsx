import { useState, useEffect, useRef } from 'react';
import './index.css';
import { useSocket } from './hooks/useSocket';
import { useVoiceChat } from './hooks/useVoiceChat';

// ═══════════════════════════════════════════
//  Landing Screen
// ═══════════════════════════════════════════
function LandingScreen({ 
  playerName, 
  setPlayerName, 
  joinCode, 
  setJoinCode, 
  onCreateRoom, 
  onJoinRoom,
  errorMsg
}) {
  const [showJoin, setShowJoin] = useState(false);
  const canProceed = playerName.trim().length > 0;
  return (
    <div className="screen">
      <div className="title">X and O</div>
      <div className="subtitle">Multiplayer</div>

      {errorMsg && (
        <div style={{ color: 'var(--loss-red)', textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      <div className="card">
        <input
          id="name-input"
          className="input-field"
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={16}
          autoComplete="off"
        />

        <div className="btn-group">
          <button
            id="create-room-btn"
            className="btn btn--primary"
            disabled={!canProceed}
            onClick={() => canProceed && onCreateRoom()}
          >
            Create Room
          </button>
          <button
            id="join-room-btn"
            className="btn btn--secondary"
            disabled={!canProceed}
            onClick={() => canProceed && setShowJoin(!showJoin)}
          >
            Join Room
          </button>
        </div>

        {/* Join room inline expand */}
        <div className={`join-expand ${showJoin && canProceed ? 'open' : ''}`}>
          <input
            id="code-input"
            className="input-field mt-lg"
            type="text"
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={7}
            autoComplete="off"
          />
          <button
            id="join-submit-btn"
            className="btn btn--primary btn--full mt-md"
            disabled={joinCode.trim().length === 0}
            onClick={() => onJoinRoom()}
          >
            Let&apos;s Go
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  Waiting Room Screen
// ═══════════════════════════════════════════
function WaitingRoomScreen({ roomCode, onCancel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="screen text-center">
      <div className="title" style={{ fontSize: '1.6rem' }}>Room Created</div>
      <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)', letterSpacing: '1px' }}>
        Share this code with your opponent
      </p>

      <div className="room-code-display" id="room-code">{roomCode}</div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          id="copy-code-btn"
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied!' : '⎘ Copy Code'}
        </button>
      </div>

      <div className="waiting-pulse">
        <span className="pulse-dot"></span>
        <span className="pulse-dot"></span>
        <span className="pulse-dot"></span>
        <span style={{ marginLeft: '4px' }}>Waiting for opponent to join...</span>
      </div>

      <div style={{ marginTop: 'var(--space-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
        <button
          id="cancel-btn"
          className="link-btn link-btn--danger"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  Game Room Screen
// ═══════════════════════════════════════════
function GameRoomScreen({ 
  players, 
  board, 
  scores, 
  currentTurn, 
  mySymbol, 
  gameOver, 
  rematchStatus,
  voiceStatus,
  isMuted,
  isReceivingCall,
  callEndedByOpponent,
  onStartVoice,
  onToggleMute,
  onStopVoice,
  onMakeMove, 
  onNewGame, 
  onLeave 
}) {
  const [micActive, setMicActive] = useState(false);

  // players is an array [{ name, symbol }, ...]. map to expected structure used previously
  const xPlayer = players.find(p => p.symbol === 'X') || { name: 'Player 1' };
  const oPlayer = players.find(p => p.symbol === 'O') || { name: 'Player 2' };
  
  const xScores = scores[xPlayer.name] || { wins: 0, losses: 0, draws: 0 };
  const oScores = scores[oPlayer.name] || { wins: 0, losses: 0, draws: 0 };
  
  // Whose turn string
  const turnPlayerName = players.find(p => p.symbol === currentTurn)?.name || '';

  return (
    <div className="screen game-room">
      {/* WebRTC Voice Chat Controls */}
      <div className="mic-section" style={{ marginBottom: 'var(--space-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {voiceStatus === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <button 
              className="btn btn--secondary" 
              onClick={onStartVoice} 
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.9rem', 
                animation: isReceivingCall ? 'pulse 1.5s infinite' : 'none', 
                boxShadow: isReceivingCall ? '0 0 15px var(--win-green)' : 'none',
                borderColor: isReceivingCall ? 'var(--win-green)' : ''
              }}
            >
              🎙️ {isReceivingCall ? 'Join Voice Chat' : 'Start Voice Chat'}
            </button>
            {isReceivingCall && (
              <span style={{ fontSize: '0.85rem', color: 'var(--win-green)', fontWeight: 'bold' }}>
                Opponent wants to speak!
              </span>
            )}
            {callEndedByOpponent && !isReceivingCall && (
              <span style={{ fontSize: '0.8rem', color: 'var(--loss-red)', opacity: 0.8 }}>
                Your opponent left the call.
              </span>
            )}
          </div>
        )}
        
        {voiceStatus === 'connecting' && (
          <button className="btn btn--secondary" disabled style={{ padding: '8px 16px', fontSize: '0.9rem', opacity: 0.7, animation: 'pulse 1.5s infinite' }}>
            Connecting...
          </button>
        )}
        
        {voiceStatus === 'connected' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--win-green)', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--win-green)' }}></span> Live
            </span>
            <button 
              className={`mic-btn ${!isMuted ? 'mic-btn--active' : ''}`} 
              onClick={onToggleMute}
              style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: isMuted ? 'rgba(255, 60, 60, 0.2)' : 'var(--bg-card)', border: `1px solid ${isMuted ? 'var(--loss-red)' : 'var(--border-color)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
            </button>
            <button 
              className="btn btn--danger" 
              onClick={onStopVoice}
              style={{ padding: '6px 12px', fontSize: '0.85rem', backgroundColor: 'var(--loss-red)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              End Call
            </button>
          </div>
        )}

        {voiceStatus === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--loss-red)', fontSize: '0.85rem' }}>Voice failed. Try again?</span>
            <button className="btn btn--secondary" onClick={onStartVoice} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Retry</button>
          </div>
        )}
      </div>

      {/* Player Bar */}
      <div className="player-bar">
        <div
          className={`player-block ${currentTurn === 'X' ? 'player-block--active' : ''}`}
          id="player-x-block"
        >
          <span className="player-name">
            {xPlayer.name} {mySymbol === 'X' ? '(You)' : ''}
          </span>
          <span className="player-symbol player-symbol--x">X</span>
        </div>

        <span className="vs-divider">VS</span>

        <div
          className={`player-block player-block--o ${currentTurn === 'O' ? 'player-block--active' : ''}`}
          id="player-o-block"
        >
          <span className="player-name">
            {oPlayer.name} {mySymbol === 'O' ? '(You)' : ''}
          </span>
          <span className="player-symbol player-symbol--o">O</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="score-bar" id="score-bar">
        {/* Shows YOUR score explicitly instead of tracking just X or just O statically */}
        <div className="score-item">
          <span className="score-label score-label--w">WIN</span>
          <span className="score-value">{mySymbol === 'X' ? xScores.wins : oScores.wins}</span>
        </div>
        <div className="score-separator" />
        <div className="score-item">
          <span className="score-label score-label--d">DRAW</span>
          <span className="score-value">{mySymbol === 'X' ? xScores.draws : oScores.draws}</span>
        </div>
        <div className="score-separator" />
        <div className="score-item">
          <span className="score-label score-label--l">LOSS</span>
          <span className="score-value">{mySymbol === 'X' ? xScores.losses : oScores.losses}</span>
        </div>
      </div>

      {/* Board */}
      <div className="board" id="game-board">
        {board.map((cell, i) => (
          <div
            key={i}
            className={`cell ${cell === 'X' ? 'cell--x' : cell === 'O' ? 'cell--o' : ''}`}
            id={`cell-${i}`}
            onClick={() => onMakeMove(i)}
          >
            {cell}
          </div>
        ))}
      </div>

      {/* Turn Indicator */}
      <div className="turn-indicator" id="turn-indicator">
        <span className="turn-dot"></span>
        <span>{turnPlayerName}&apos;s turn</span>
      </div>

      {/* Leave Game Button */}
      <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'center' }}>
        <button className="link-btn link-btn--danger" onClick={onLeave} style={{ fontSize: '0.9rem' }}>
          Leave Game
        </button>
      </div>

      {/* Win Overlay */}
      {gameOver && (
        <WinOverlay
          gameOver={gameOver}
          mySymbol={mySymbol}
          xPlayer={xPlayer}
          oPlayer={oPlayer}
          xScores={xScores}
          oScores={oScores}
          rematchStatus={rematchStatus}
          onNewGame={onNewGame}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  Win Overlay
// ═══════════════════════════════════════════
function WinOverlay({ gameOver, mySymbol, xPlayer, oPlayer, xScores, oScores, rematchStatus, onNewGame, onLeave }) {
  const { winner, isDraw } = gameOver; // winner is string playerName

  let headerText = '';
  let emoji = '🎉';

  if (isDraw) {
    headerText = "It's a Draw!";
    emoji = '🤝';
  } else {
    // Determine which player object won
    const winnerPlayer = winner === xPlayer.name ? xPlayer : oPlayer;
    if (winnerPlayer.symbol === mySymbol) {
      headerText = 'You Win!';
      emoji = '🏆';
    } else {
      headerText = `${winner} Wins!`;
      emoji = '💀';
    }
  }

  return (
    <div className="overlay-backdrop" id="win-overlay">
      <div className="overlay-content">
        <div className="overlay-emoji">{emoji}</div>
        <div className={`overlay-winner ${isDraw ? 'overlay-winner--draw' : ''}`}>
          {headerText}
        </div>
        <div className="overlay-score-summary">
          {xPlayer.name}: {xScores.wins}W &mdash; {oPlayer.name}: {oScores.wins}W
        </div>
        <div className="overlay-actions">
          <button
            id="new-game-btn"
            className="btn btn--primary"
            onClick={onNewGame}
            disabled={rematchStatus === 'waiting'}
            style={{
              opacity: rematchStatus === 'waiting' ? 0.6 : 1,
              cursor: rematchStatus === 'waiting' ? 'not-allowed' : 'pointer',
              boxShadow: rematchStatus === 'pending' ? '0 0 16px var(--win-green)' : '',
              border: rematchStatus === 'pending' ? '1.5px solid var(--win-green)' : 'none'
            }}
          >
            {rematchStatus === 'waiting' ? 'Waiting for opponent...' :
             rematchStatus === 'pending' ? 'Opponent wants a rematch! Click to confirm' :
             'New Game'}
          </button>
          <button
            id="leave-room-btn"
            className="link-btn link-btn--danger"
            onClick={onLeave}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  App Root
// ═══════════════════════════════════════════
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  
  // Game State
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState('X');
  const [scores, setScores] = useState({});
  const [mySymbol, setMySymbol] = useState('');
  const [gameOver, setGameOver] = useState(null); // { winner, isDraw, scores }
  const [rematchStatus, setRematchStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-clear errors
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Socket setup
  const socketHandlers = {
    'room-created': (payload) => {
      setRoomCode(payload.roomCode);
      setMySymbol(payload.yourSymbol || 'X');
      setPlayers([{ name: playerName, symbol: payload.yourSymbol || 'X' }]);
      setCurrentScreen('waiting');
    },
    'room-joined': (payload) => {
      setRoomCode(payload.roomCode);
      setPlayers(payload.players);
      setBoard(payload.board);
      setMySymbol(payload.yourSymbol);
      setCurrentScreen('game');
    },
    'opponent-joined': (payload) => {
      setPlayers(prev => {
        // Retrieve creator from state array, or inject safely if wiped by remounts
        const self = prev.find(p => p.name === playerName);
        const base = self ? prev : [{ name: playerName, symbol: mySymbol || 'X' }, ...prev];
        
        const already = base.find(p => p.name === payload.opponentName);
        if (already) return base;
        return [...base, { name: payload.opponentName, symbol: payload.opponentSymbol }];
      });
      setCurrentScreen('game');
    },
    'board-updated': (payload) => {
      setBoard(payload.board);
      setCurrentTurn(payload.nextTurn);
    },
    'game-over': (payload) => {
      setGameOver({
        winner: payload.winner,
        isDraw: payload.isDraw,
      });
      setScores(payload.scores);
    },
    'rematch-waiting': (payload) => {
      setRematchStatus('waiting');
    },
    'rematch-pending': (payload) => {
      setRematchStatus('pending');
    },
    'game-reset': (payload) => {
      setBoard(payload.board);
      setCurrentTurn(payload.currentTurn);
      setScores(payload.scores);
      setGameOver(null);
      setRematchStatus(null);
    },
    'player-left': (payload) => {
      setErrorMsg(payload.message || 'Opponent disconnected.');
      resetAllState();
    },
   'error': (payload) => {
  const msg = typeof payload === 'string'
    ? payload
    : payload.message || payload.error || 'Something went wrong.';
  setErrorMsg(msg);
},
  };

  const { socket, createRoom, joinRoom, makeMove, newGame, cancelWaiting, leaveRoom } = useSocket(socketHandlers);

  const { voiceStatus, isMuted, remoteAudioRef, startVoice, toggleMute, stopVoice, isReceivingCall, callEndedByOpponent } = useVoiceChat({
    socket,
    mySymbol,
    isInGame: currentScreen === 'game'
  });

  const resetAllState = () => {
    leaveRoom(); // explicitly notify backend this client is dropping out of the match
    setRoomCode('');
    setJoinCode('');
    setPlayers([]);
    setBoard(Array(9).fill(null));
    setCurrentTurn('X');
    setScores({});
    setMySymbol('');
    setGameOver(null);
    setRematchStatus(null);
    setCurrentScreen('landing');
  };

  const handleMakeMove = (cellIndex) => {
    if (board[cellIndex] !== null) return; // already taken local check
    if (currentTurn !== mySymbol) return; // not your turn
    if (gameOver) return; // game over
    
    makeMove(cellIndex);
  };

  return (
    <>
      {/* Atmospheric background */}
      <div className="bg-grid" />
      <div className="bg-glow bg-glow--cyan" />
      <div className="bg-glow bg-glow--pink" />

      {/* Screens */}
      {currentScreen === 'landing' && (
        <LandingScreen 
          playerName={playerName}
          setPlayerName={setPlayerName}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          errorMsg={errorMsg}
          onCreateRoom={() => createRoom(playerName)}
          onJoinRoom={() => joinRoom(playerName, joinCode)}
        />
      )}

      {currentScreen === 'waiting' && (
        <WaitingRoomScreen 
          roomCode={roomCode} 
          onCancel={() => {
            cancelWaiting();
            resetAllState();
          }} 
        />
      )}

      {/* Toast message for pending rematch when overlay is hidden */}
      {rematchStatus === 'pending' && !gameOver && currentScreen === 'game' && (
        <div style={{ position: 'fixed', bottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: 'var(--radius-md)', zIndex: 1000, fontWeight: 'bold', boxShadow: '0 4px 24px var(--accent-glow)' }}>
          Opponent wants a rematch! Finish or leave to confirm.
        </div>
      )}

      {currentScreen === 'game' && (
        <GameRoomScreen
          players={players}
          board={board}
          scores={scores}
          currentTurn={currentTurn}
          mySymbol={mySymbol}
          gameOver={gameOver}
          rematchStatus={rematchStatus}
          voiceStatus={voiceStatus}
          isMuted={isMuted}
          isReceivingCall={isReceivingCall}
          callEndedByOpponent={callEndedByOpponent}
          onStartVoice={startVoice}
          onToggleMute={toggleMute}
          onStopVoice={stopVoice}
          onMakeMove={handleMakeMove}
          onNewGame={newGame}
          onLeave={resetAllState}
        />
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
    </>
  );
}
