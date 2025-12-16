let socket;
let sessionId;
let card = Array(5).fill(null).map(() => Array(5).fill(0));
let marked = Array(5).fill(null).map(() => Array(5).fill(false));
let isEditing = true;

function init() {
  // Get sessionId from URL
  const path = window.location.pathname;
  sessionId = path.split('/').pop();

  if (!sessionId) {
    alert('Неверная ссылка');
    return;
  }

  // Render card immediately
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

  socket.on('number_drawn', (data) => {
    const number = data.number;
    let found = false;
    const newMarked = marked.map(row => [...row]);

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (card[i][j] === number) {
          newMarked[i][j] = true;
          found = true;
        }
      }
    }

    if (found) {
      marked = newMarked;
      renderCard();
    }
  });

  socket.on('session_started', () => {
    isEditing = false;
    document.getElementById('saveBtn').style.display = 'none';
    document.getElementById('info').style.display = 'block';
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
  
  container.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const row = document.createElement('div');
    row.className = 'row';

    for (let j = 0; j < 5; j++) {
      const cell = document.createElement('div');
      cell.className = `cell ${marked[i][j] ? 'marked' : ''}`;

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
      }

      row.appendChild(cell);
    }

    container.appendChild(row);
  }
  
  console.log('Card rendered:', container.children.length, 'rows');
}

function handleCardChange(row, col, value) {
  const num = parseInt(value) || 0;
  card[row][col] = num;
  hideErrors();
}

function validateCard() {
  const errors = [];
  const allNumbers = [];

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
      if (allNumbers.includes(num)) {
        errors.push('Числа не должны повторяться');
        showErrors(errors);
        return false;
      }
      allNumbers.push(num);
    }
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

    isEditing = false;
    document.getElementById('saveBtn').style.display = 'none';
    renderCard();
  } catch (error) {
    showErrors(['Ошибка при сохранении карточки']);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

