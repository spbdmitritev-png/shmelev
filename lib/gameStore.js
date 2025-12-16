// CommonJS version for server.js

const sessions = new Map();
const players = new Map();

const gameStore = {
  // Sessions
  createSession() {
    const id = Math.random().toString(36).substring(2, 15);
    const session = {
      id,
      status: 'waiting',
      drawnNumbers: [],
      createdAt: Date.now(),
    };
    sessions.set(id, session);
    return session;
  },

  getSession(id) {
    return sessions.get(id);
  },

  updateSession(id, updates) {
    const session = sessions.get(id);
    if (!session) return undefined;
    const updated = { ...session, ...updates };
    sessions.set(id, updated);
    return updated;
  },

  drawNumber(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Generate available numbers (1-90)
    const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
    const available = allNumbers.filter(n => !session.drawnNumbers.includes(n));
    
    if (available.length === 0) return null;

    // Random selection
    const randomIndex = Math.floor(Math.random() * available.length);
    const number = available[randomIndex];

    session.drawnNumbers.push(number);
    sessions.set(sessionId, session);
    return number;
  },

  // Players
  createPlayer(sessionId, card) {
    const id = Math.random().toString(36).substring(2, 15);
    const marked = Array(5).fill(null).map(() => Array(5).fill(false));
    
    const player = {
      id,
      sessionId,
      card,
      marked,
      createdAt: Date.now(),
    };
    players.set(id, player);
    console.log(`Player created: ${id} for session ${sessionId}. Total players in session: ${this.getPlayersBySession(sessionId).length}`);
    return player;
  },

  getPlayer(id) {
    return players.get(id);
  },

  getPlayersBySession(sessionId) {
    return Array.from(players.values()).filter(p => p.sessionId === sessionId);
  },

  updatePlayer(id, updates) {
    const player = players.get(id);
    if (!player) return undefined;
    const updated = { ...player, ...updates };
    players.set(id, updated);
    return updated;
  },

  markNumberOnPlayerCards(sessionId, number) {
    const sessionPlayers = this.getPlayersBySession(sessionId);
    sessionPlayers.forEach(player => {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          if (player.card[i][j] === number) {
            player.marked[i][j] = true;
          }
        }
      }
      players.set(player.id, player);
    });
  },
};

module.exports = { gameStore };

