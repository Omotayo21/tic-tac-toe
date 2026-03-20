import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

// 1. One true singleton socket outside the component
// This completely avoids React Strict Mode ghost connections
const socket = io(SERVER_URL, {
  withCredentials: true,
  autoConnect: true,
});

const ALL_EVENTS = [
  'room-created',
  'room-joined',
  'opponent-joined',
  'board-updated',
  'game-over',
  'game-reset',
  'rematch-waiting',
  'rematch-pending',
  'player-left',
  'error'
];

export function useSocket(handlers = {}) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Attach delegated listeners
    const listeners = {};
    ALL_EVENTS.forEach(event => {
      listeners[event] = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, listeners[event]);
    });

    // strict-mode secure cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      ALL_EVENTS.forEach(event => {
        socket.off(event, listeners[event]);
      });
    };
  }, []);

  const emit = (event, data) => {
    if (!socket.connected) {
      console.warn('[useSocket] tried to emit but socket not connected:', event);
      return;
    }
    socket.emit(event, data);
  };

  return {
    socket,
    isConnected,
    createRoom:    (playerName) => emit('create-room', { playerName }),
    joinRoom:      (playerName, roomCode) => emit('join-room', { playerName, roomCode }),
    makeMove:      (cellIndex) => emit('make-move', { cellIndex }),
    newGame:       () => emit('new-game'),
    cancelWaiting: () => emit('cancel-waiting'),
    leaveRoom:     () => emit('leave-room'),
  };
}