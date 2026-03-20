// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { registerHandlers } = require('./socketHandlers');

const app = express();
const port = 3001;

// Enable CORS for Express health check
app.use(cors({
  origin: 'https://rahman-xando.vercel.app',
  methods: ['GET', 'POST']
}));

// Basic health check
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.io with matching CORS policy
const io = new Server(server, {
  cors: {
    origin: 'https://rahman-xando.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Listen for connections
io.on('connection', (socket) => {
  console.log('[Socket Connected]', socket.id);
  
  // Register all game event handlers
  registerHandlers(io, socket);
});

// Start Server
server.listen(port, () => {
  console.log(`[Tic-Tac-Toe Server] listening on port ${port}`);
});
