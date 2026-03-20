import { useState, useRef, useEffect } from 'react';
import SimplePeer from 'simple-peer';

export function useVoiceChat({ socket, mySymbol, isInGame }) {
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callEndedByOpponent, setCallEndedByOpponent] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // New critical synchronization flags
  const remoteVoiceReadyRef = useRef(false);
  const pendingSignalsRef = useRef([]);

  const cleanup = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    remoteVoiceReadyRef.current = false;
    pendingSignalsRef.current = [];
    setVoiceStatus('idle');
    setIsMuted(false);
    setIsReceivingCall(false);
  };

  const attachPeerHandlers = (peer) => {
    peer.on('signal', (data) => {
      socket.emit('webrtc-signal', { signal: data });
    });

    peer.on('stream', (remoteStream) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.error("Audio auto-play blocked", e));
      }
      setVoiceStatus('connected');
    });

    peer.on('error', (err) => {
      console.error('[WebRTC] Peer error emitted:', err, err?.code, err?.message);
      setVoiceStatus('error');
    });

    peer.on('close', () => {
      console.log('[WebRTC] Peer connection closed naturally');
      setVoiceStatus('idle');
      cleanup();
    });
  };

  const createPeer = () => {
    if (peerRef.current) return; // Prevent double creation
    
    console.log('[WebRTC] Both parties ready. Creating peer. initiator:', mySymbol === 'X');
    peerRef.current = new SimplePeer({
      initiator: mySymbol === 'X',
      stream: localStreamRef.current,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });
    attachPeerHandlers(peerRef.current);

    // Flush any buffered signals that arrived while we were waiting to get our own mic
    while (pendingSignalsRef.current.length > 0) {
      const bufferedSignal = pendingSignalsRef.current.shift();
      console.log('[WebRTC] Flushing buffered signal into newly minted peer...');
      peerRef.current.signal(bufferedSignal);
    }
  };

  const startVoice = async () => {
    console.log('[WebRTC] startVoice() called. mySymbol:', mySymbol);
    setCallEndedByOpponent(false);
    try {
      setVoiceStatus('connecting');
      console.log('[WebRTC] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log('[WebRTC] Microphone access granted!', stream.getAudioTracks());
      localStreamRef.current = stream;
      setIsReceivingCall(false);

      console.log('[WebRTC] Emitting socket voice-ready');
      socket.emit('voice-ready');

      // If the other person already clicked startVoice (or if we are late), create peer now
      if (remoteVoiceReadyRef.current) {
        console.log('[WebRTC] Remote is already ready. Creating peer immediately.');
        createPeer();
      } else {
        console.log('[WebRTC] Waiting for remote to click Start Voice...');
      }
    } catch (err) {
      console.error('[WebRTC] Error inside startVoice catch block. Full details:', err);
      if (err.name === 'NotAllowedError') {
         console.error('[WebRTC] You denied microphone permissions in your browser!');
      }
      setVoiceStatus('error');
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newMuted;
        });
      }
      return newMuted;
    });
  };

  useEffect(() => {
    if (!socket) return;

    const handleVoiceReady = () => {
      console.log('[WebRTC] Received voice-ready from opponent. mySymbol:', mySymbol);
      remoteVoiceReadyRef.current = true;
      
      // If we already have our own mic access, we can safely create the peer now
      if (localStreamRef.current && !peerRef.current) {
        console.log('[WebRTC] I have mic access and opponent is ready. Creating peer...');
        createPeer();
      } else if (!localStreamRef.current) {
        // We haven't clicked start yet, so notify UI
        setIsReceivingCall(true);
      }
    };

    const handleSignal = (payload) => {
      console.log('[WebRTC] Received webrtc-signal payload:', payload);
      if (peerRef.current && payload.signal) {
        console.log('[WebRTC] Injecting signal into peer directly...');
        peerRef.current.signal(payload.signal);
      } else if (payload.signal) {
        // Essential fallback: If opponent sends ICE candidate or Offer before we clicked Start Voice,
        // buffer it so we can ingest it cleanly when we create the peer!
        console.log('[WebRTC] Received signal but peer is not ready! Buffering signal...');
        pendingSignalsRef.current.push(payload.signal);
      }
    };

    const handleVoiceEnded = () => {
      console.log('[WebRTC] Output drop requested by remote opponent.');
      cleanup();
      setCallEndedByOpponent(true);
    };

    socket.on('voice-ready', handleVoiceReady);
    socket.on('webrtc-signal', handleSignal);
    socket.on('voice-ended', handleVoiceEnded);

    return () => {
      socket.off('voice-ready', handleVoiceReady);
      socket.off('webrtc-signal', handleSignal);
      socket.off('voice-ended', handleVoiceEnded);
    };
  }, [socket, mySymbol]);

  useEffect(() => {
    if (!isInGame) {
      // Broadcast drop to opponent if we navigate out of game mid-call
      if (voiceStatus !== 'idle') socket?.emit('voice-ended');
      cleanup();
    }
  }, [isInGame, socket, voiceStatus]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const stopVoice = () => {
    socket.emit('voice-ended');
    cleanup();
    setCallEndedByOpponent(false);
  };

  return {
    voiceStatus,
    isMuted,
    remoteAudioRef,
    startVoice,
    toggleMute,
    stopVoice,
    isReceivingCall,
    callEndedByOpponent
  };
}
