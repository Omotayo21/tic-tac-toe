# Live Multiplayer Tic-Tac-Toe 🎙️
A robust, real-time multiplayer Tic-Tac-Toe game featuring live peer-to-peer WebRTC voice chat, room-based matchmaking, and seamless rematch flows.

## 🚀 Features
- **Real-Time Gameplay**: Instant, low-latency move synchronization powered by Socket.io.
- **WebRTC Voice Chat**: Built-in peer-to-peer voice calling so you can talk trash while you play! 
- **Room Matchmaking**: Create private rooms and share 7-character session codes to invite friends.
- **Live State Management**: Server-authoritative game loops preventing client-side cheating.
- **Robust Teardowns**: Full UI synchronization for drops, connection losses, and explicit "End Call" WebRTC hooks.
- **Rematch System**: Mutual confirmation flows for keeping the same lobby alive across multiple rounds.

## 💻 Tech Stack
- **Frontend**: React, Vite, Vanilla CSS.
- **Backend**: Node.js, Express.js.
- **Networking**: Socket.io (WebSocket game state), Simple-Peer (WebRTC Audio).

## 🛠️ Local Setup
1. Clone the repository.
2. Open two terminals.

**Start the Backend (Terminal 1)**
```bash
cd server
npm install
npm start
```

**Start the Frontend (Terminal 2)**
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Open a second tab or window to play against yourself!

## 🌍 Deployment Guide
Because this game relies heavily on persistent WebSocket connections for real-time play, your backend and frontend need different hosting environments for optimal performance.

### Deploying the Frontend (Vercel)
The `client` directory is perfectly suited for Vercel. 
1. Connect your repository to Vercel.
2. Set the Root Directory to `client`.
3. Vercel will automatically detect Vite and configure the build settings.
4. *(Note: `client/vercel.json` is included to permanently route any 404s back to `index.html` for React SPA fallback).*

### Deploying the Backend (Render / Railway)
**Do NOT deploy the `server` to Vercel.** Vercel is a Serverless environment that will aggressively shut down your Socket.io WebSocket connections after every HTTP request.
1. Deploy the `server` directory to a persistent host like **Render** (Web Service), **Railway**, or **Fly.io**.
2. Make sure to update your frontend Socket connection URL in `client/src/hooks/useSocket.js` immediately before pushing!

```javascript
// client/src/hooks/useSocket.js
// Change this line to your live backend URL:
const SOCKET_URL = 'https://your-live-backend-url.onrender.com';
```

## 🎙️ Note on Voice Chat
The voice chat subsystem utilizes Google's free STUN servers (`stun:stun.l.google.com:19302`) to traverse NAT gateways and establish direct peer-to-peer WebRTC audio streams without funneling massive audio loads through your backend Node server.
