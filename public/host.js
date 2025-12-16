let socket;
let sessionId;
let drawnNumbers = [];

function generateQRCode(url) {
  const canvas = document.getElementById('qrCode');
  if (!canvas) {
    console.error('Canvas element not found');
    document.getElementById('joinUrl').textContent = url;
    return;
  }

  // Always show URL
  document.getElementById('joinUrl').textContent = url;

  if (typeof QRCode === 'undefined') {
    console.error('QRCode library not loaded, using fallback');
    // Fallback: use online QR code API
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    img.alt = 'QR Code';
    img.style.width = '300px';
    img.style.height = '300px';
    canvas.parentNode.replaceChild(img, canvas);
    return;
  }

  try {
    // Clear canvas first
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    QRCode.toCanvas(canvas, url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, function (error) {
      if (error) {
        console.error('QR Code generation error:', error);
        // Fallback: use online QR code API
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
        img.alt = 'QR Code';
        img.style.width = '300px';
        img.style.height = '300px';
        canvas.parentNode.replaceChild(img, canvas);
      } else {
        console.log('QR Code generated successfully');
      }
    });
  } catch (error) {
    console.error('QR Code generation exception:', error);
    // Fallback: use online QR code API
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    img.alt = 'QR Code';
    img.style.width = '300px';
    img.style.height = '300px';
    canvas.parentNode.replaceChild(img, canvas);
  }
}

async function init() {
  // Create session
  const response = await fetch('/api/session/create', { method: 'POST' });
  const session = await response.json();
  sessionId = session.id;

  // Generate QR code
  const joinUrl = `${window.location.origin}/join/${sessionId}`;
  document.getElementById('joinUrl').textContent = joinUrl;
  
  // Generate QR code if library is loaded
  if (typeof QRCode !== 'undefined') {
    generateQRCode(joinUrl);
  } else {
    // Wait for library to load
    const checkQRCode = setInterval(() => {
      if (typeof QRCode !== 'undefined') {
        clearInterval(checkQRCode);
        generateQRCode(joinUrl);
      }
    }, 50);
    
    // Timeout after 3 seconds
    setTimeout(() => {
      clearInterval(checkQRCode);
      if (typeof QRCode === 'undefined') {
        console.error('QRCode library failed to load');
      }
    }, 3000);
  }

  // Initialize socket
  socket = io();
  
  socket.on('connect', () => {
    document.getElementById('statusText').textContent = '✅ Подключено';
    socket.emit('join_session', { sessionId });
  });

  socket.on('disconnect', () => {
    document.getElementById('statusText').textContent = '❌ Отключено';
  });

  socket.on('number_drawn', (data) => {
    drawnNumbers = data.drawnNumbers;
    updateLastNumber(data.number);
    updateDrawnNumbers();
  });

  socket.on('session_started', () => {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('drawBtn').style.display = 'inline-block';
    document.getElementById('resetBtn').style.display = 'inline-block';
  });

  socket.on('session_reset', () => {
    drawnNumbers = [];
    document.getElementById('lastNumber').style.display = 'none';
    document.getElementById('drawnNumbers').style.display = 'none';
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('drawBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'none';
  });
}

function startGame() {
  if (socket && sessionId) {
    socket.emit('start_game', { sessionId });
  }
}

function drawNumber() {
  if (socket && sessionId) {
    socket.emit('draw_number', { sessionId });
  }
}

function resetGame() {
  if (socket && sessionId) {
    socket.emit('reset_game', { sessionId });
  }
}

function updateLastNumber(number) {
  document.getElementById('lastNumber').style.display = 'block';
  document.getElementById('lastNumberValue').textContent = number;
}

function updateDrawnNumbers() {
  const container = document.getElementById('drawnNumbers');
  const list = document.getElementById('numbersList');
  const count = document.getElementById('drawnCount');
  
  container.style.display = 'block';
  count.textContent = drawnNumbers.length;
  
  list.innerHTML = drawnNumbers.map(num => 
    `<span class="number-badge">${num}</span>`
  ).join('');
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

