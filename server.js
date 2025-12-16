const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { gameStore } = require('./lib/gameStore');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Routes
app.post('/api/session/create', (req, res) => {
  const session = gameStore.createSession();
  res.json(session);
});

app.get('/api/session/:id', (req, res) => {
  const session = gameStore.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.post('/api/session/:id/card', (req, res) => {
  const { id } = req.params;
  const { card } = req.body;

  // Validation
  if (!Array.isArray(card) || card.length !== 5) {
    return res.status(400).json({ error: 'Invalid card format' });
  }

  for (const row of card) {
    if (!Array.isArray(row) || row.length !== 5) {
      return res.status(400).json({ error: 'Invalid card format' });
    }
    for (const num of row) {
      if (typeof num !== 'number' || num < 1 || num > 90) {
        return res.status(400).json({ error: 'Numbers must be between 1 and 90' });
      }
    }
  }

  // Check for duplicates
  const allNumbers = [];
  for (const row of card) {
    for (const num of row) {
      if (allNumbers.includes(num)) {
        return res.status(400).json({ error: 'Duplicate numbers in card' });
      }
      allNumbers.push(num);
    }
  }

  // Check session exists
  const session = gameStore.getSession(id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Create player
  const player = gameStore.createPlayer(id, card);
  res.json(player);
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

app.get('/join/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_session', (data) => {
    if (data.sessionId) {
      socket.join(data.sessionId);
      console.log(`Socket ${socket.id} joined session ${data.sessionId}`);
    }
  });

  socket.on('start_game', (data) => {
    if (data.sessionId) {
      const session = gameStore.updateSession(data.sessionId, { status: 'active' });
      if (session) {
        io.to(data.sessionId).emit('session_started', { sessionId: data.sessionId });
      }
    }
  });

  socket.on('draw_number', (data) => {
    if (data.sessionId) {
      const number = gameStore.drawNumber(data.sessionId);
      if (number !== null) {
        gameStore.markNumberOnPlayerCards(data.sessionId, number);
        
        const session = gameStore.getSession(data.sessionId);
        io.to(data.sessionId).emit('number_drawn', {
          number,
          drawnNumbers: session?.drawnNumbers || [],
        });
      }
    }
  });

  socket.on('reset_game', (data) => {
    if (data.sessionId) {
      const session = gameStore.updateSession(data.sessionId, {
        status: 'waiting',
        drawnNumbers: [],
      });
      
      const players = gameStore.getPlayersBySession(data.sessionId);
      players.forEach(player => {
        const marked = Array(5).fill(null).map(() => Array(5).fill(false));
        gameStore.updatePlayer(player.id, { marked });
      });

      if (session) {
        io.to(data.sessionId).emit('session_reset', { sessionId: data.sessionId });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
