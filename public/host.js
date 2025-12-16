let socket;
let sessionId;

function generateQRCode(url) {
  const qrImg = document.getElementById('qrCode');
  const qrWrapper = document.getElementById('qrWrapper');
  const joinUrlElement = document.getElementById('joinUrl');
  
  if (!qrImg || !qrWrapper) {
    console.error('QR code elements not found');
    if (joinUrlElement) {
      joinUrlElement.textContent = url;
    }
    return;
  }

  // Always show URL
  if (joinUrlElement) {
    joinUrlElement.textContent = url;
  }

  // Use online QR code API (reliable and works everywhere)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  qrImg.src = qrUrl;
  qrImg.style.display = 'block';
  
  qrImg.onload = () => {
    console.log('QR Code loaded successfully');
  };
  
  qrImg.onerror = () => {
    console.error('Failed to load QR code image');
    // Show URL as fallback
    if (joinUrlElement) {
      joinUrlElement.style.fontSize = '1.2rem';
      joinUrlElement.style.fontWeight = 'bold';
      joinUrlElement.style.padding = '1rem';
      joinUrlElement.style.background = 'rgba(255, 255, 255, 0.2)';
      joinUrlElement.style.borderRadius = '8px';
    }
  };
}

async function init() {
  // Create session
  const response = await fetch('/api/session/create', { method: 'POST' });
  const session = await response.json();
  sessionId = session.id;

  // Generate QR code
  const joinUrl = `${window.location.origin}/join/${sessionId}`;
  console.log('Generating QR code for URL:', joinUrl);
  
  // Generate QR code immediately (using online API)
  generateQRCode(joinUrl);

  // Initialize socket
  socket = io();
  
  socket.on('connect', () => {
    document.getElementById('statusText').textContent = '✅ Подключено';
    socket.emit('join_session', { sessionId });
    updatePlayersCount();
    // Update players count every 2 seconds
    setInterval(updatePlayersCount, 2000);
  });

  socket.on('disconnect', () => {
    document.getElementById('statusText').textContent = '❌ Отключено';
  });

  socket.on('session_started', () => {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'inline-block';
    document.getElementById('gameInfo').style.display = 'block';
  });

  socket.on('session_reset', () => {
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('resetBtn').style.display = 'none';
    document.getElementById('gameInfo').style.display = 'none';
  });
}

function startGame() {
  if (socket && sessionId) {
    socket.emit('start_game', { sessionId });
  }
}

function resetGame() {
  if (socket && sessionId) {
    socket.emit('reset_game', { sessionId });
  }
}

async function updatePlayersCount() {
  if (!sessionId) return;
  
  try {
    const response = await fetch(`/api/session/${sessionId}/players`);
    const data = await response.json();
    const count = data.count || 0;
    
    const countElement = document.getElementById('playersCount');
    const valueElement = document.getElementById('playersCountValue');
    
    if (countElement && valueElement) {
      valueElement.textContent = count;
      countElement.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating players count:', error);
  }
}

// Initialize when page is ready and QRCode library is loaded
function waitForQRCode() {
  if (typeof QRCode !== 'undefined') {
    init();
  } else {
    // Check every 100ms for up to 5 seconds
    let attempts = 0;
    const maxAttempts = 50;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof QRCode !== 'undefined') {
        clearInterval(checkInterval);
        init();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.warn('QRCode library not loaded, using fallback');
        init(); // Still init, fallback will handle QR code
      }
    }, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForQRCode);
} else {
  waitForQRCode();
}

