let socket;
let sessionId;
let card = Array(5).fill(null).map(() => Array(5).fill(0));
let marked = Array(5).fill(null).map(() => Array(5).fill(false));
let isEditing = true;
let duplicateCells = []; // Array of {row, col} for duplicate numbers

function init() {
  console.log('Initializing player page...');
  
  // Get sessionId from URL
  const path = window.location.pathname;
  sessionId = path.split('/').pop();
  
  console.log('Session ID from URL:', sessionId);

  if (!sessionId || sessionId === 'player.html' || sessionId === '') {
    console.error('Invalid session ID');
    alert('Неверная ссылка');
    return;
  }

  // Render card immediately
  console.log('Rendering card...');
  renderCard();

  // Check session exists
  fetch(`/api/session/${sessionId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showErrors(['Сессия не найдена']);
        return;
      }
    })
    .catch(error => {
      console.error('Error checking session:', error);
      showErrors(['Ошибка при проверке сессии']);
    });

  // Initialize socket
  socket = io();
  
  socket.on('connect', () => {
    document.getElementById('statusText').textContent = '✅ Подключено';
    socket.emit('join_session', { sessionId });
  });

  socket.on('disconnect', () => {
    document.getElementById('statusText').textContent = '❌ Отключено';
  });

  socket.on('session_started', () => {
    isEditing = false;
    document.getElementById('saveBtn').style.display = 'none';
    const infoDiv = document.getElementById('info');
    if (infoDiv) {
      infoDiv.style.display = 'block';
      infoDiv.textContent = 'Игра началась! Нажимайте на числа, которые называет ведущий.';
      infoDiv.style.background = 'rgba(255, 255, 255, 0.1)';
    }
    renderCard();
  });

  socket.on('session_reset', () => {
    marked = Array(5).fill(null).map(() => Array(5).fill(false));
    isEditing = true;
    document.getElementById('saveBtn').style.display = 'block';
    document.getElementById('info').style.display = 'none';
    renderCard();
  });
}

function renderCard() {
  const container = document.getElementById('card');
  if (!container) {
    console.error('Card container not found');
    return;
  }
  
  try {
    container.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const row = document.createElement('div');
      row.className = 'row';

      for (let j = 0; j < 5; j++) {
        const cell = document.createElement('div');
        const isDuplicate = duplicateCells.some(d => d.row === i && d.col === j);
        cell.className = `cell ${marked[i][j] ? 'marked' : ''} ${isDuplicate ? 'duplicate' : ''}`;

        if (isEditing) {
          const input = document.createElement('input');
          input.type = 'number';
          input.min = '1';
          input.max = '90';
          input.value = card[i][j] > 0 ? card[i][j] : '';
          input.className = 'input';
          input.placeholder = '';
          input.oninput = (e) => handleCardChange(i, j, e.target.value);
          cell.appendChild(input);
        } else {
          const number = document.createElement('div');
          number.className = 'number';
          number.textContent = card[i][j] > 0 ? card[i][j] : '';
          cell.appendChild(number);
          
          // Make cell clickable to mark/unmark
          cell.classList.add('clickable');
          cell.onclick = () => toggleMark(i, j);
        }

        row.appendChild(cell);
      }

      container.appendChild(row);
    }
    
    console.log('Card rendered successfully:', container.children.length, 'rows');
  } catch (error) {
    console.error('Error rendering card:', error);
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: white;">Ошибка отображения карточки</div>';
  }
}

function handleCardChange(row, col, value) {
  const num = parseInt(value) || 0;
  card[row][col] = num;
  hideErrors();
  duplicateCells = []; // Clear duplicates when user changes input
  renderCard(); // Re-render to remove red highlighting
}

function toggleMark(row, col) {
  if (isEditing) return; // Can't mark during editing
  
  marked[row][col] = !marked[row][col];
  renderCard();
}

function validateCard() {
  const errors = [];
  const allNumbers = [];
  duplicateCells = []; // Reset duplicates

  // First pass: collect all numbers and find duplicates
  const numberPositions = {}; // Map number -> array of {row, col}
  
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const num = card[i][j];
      if (num === 0) {
        errors.push('Все клетки должны быть заполнены');
        showErrors(errors);
        return false;
      }
      if (num < 1 || num > 90) {
        errors.push('Числа должны быть от 1 до 90');
        showErrors(errors);
        return false;
      }
      
      // Track positions of each number
      if (!numberPositions[num]) {
        numberPositions[num] = [];
      }
      numberPositions[num].push({ row: i, col: j });
    }
  }

  // Find all duplicate numbers
  for (const num in numberPositions) {
    if (numberPositions[num].length > 1) {
      // This number appears multiple times
      duplicateCells.push(...numberPositions[num]);
    }
  }

  // If there are duplicates, highlight them and show error
  if (duplicateCells.length > 0) {
    errors.push('Найдены повторяющиеся числа. Исправьте выделенные красным клетки.');
    showErrors(errors);
    renderCard(); // Re-render to show red highlighting
    return false;
  }

  hideErrors();
  return true;
}

function showErrors(errors) {
  const container = document.getElementById('errors');
  container.style.display = 'block';
  container.innerHTML = errors.map(err => `<div>${err}</div>`).join('');
}

function hideErrors() {
  document.getElementById('errors').style.display = 'none';
}

async function saveCard() {
  if (!validateCard() || !sessionId) return;

  try {
    console.log('Saving card for session:', sessionId);
    const response = await fetch(`/api/session/${sessionId}/card`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card }),
    });

    const data = await response.json();
    if (data.error) {
      showErrors([data.error]);
      return;
    }

    console.log('Card saved successfully. Player ID:', data.id, 'Total players:', data.totalPlayers);
    isEditing = false;
    document.getElementById('saveBtn').style.display = 'none';
    renderCard();
    
    // Show success message
    const infoDiv = document.getElementById('info');
    if (infoDiv) {
      infoDiv.style.display = 'block';
      infoDiv.textContent = `Карточка сохранена! Ожидайте начала игры. (Игроков в сессии: ${data.totalPlayers || '?'})`;
      infoDiv.style.background = 'rgba(76, 175, 80, 0.3)';
    }
  } catch (error) {
    console.error('Error saving card:', error);
    showErrors(['Ошибка при сохранении карточки']);
  }
}

// Initialize when DOM is ready
function startInit() {
  console.log('Starting initialization...');
  console.log('Document ready state:', document.readyState);
  
  const cardContainer = document.getElementById('card');
  if (!cardContainer) {
    console.error('Card container not found in DOM');
    return;
  }
  
  try {
    init();
  } catch (error) {
    console.error('Initialization error:', error);
    cardContainer.innerHTML = '<div style="text-align: center; padding: 2rem; color: white;">Ошибка загрузки. Проверьте консоль браузера.</div>';
  }
}

// Wait for DOM and scripts to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startInit);
} else {
  // DOM already loaded, but wait a bit for scripts
  setTimeout(startInit, 100);
}

