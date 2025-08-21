export function init() {
  console.log('Game page loaded');

  const canvasEl = document.getElementById('pongCanvas');
  if (!(canvasEl instanceof HTMLCanvasElement)) return;
  
  // Initialize enhanced game system
  initializeEnhancedGame();
}

async function initializeEnhancedGame() {
  try {
    // Import the enhanced game services
    const { GameWebSocketService } = await import('../../services/game-websocket.service.js');
    const { GameRenderer } = await import('../../services/game-renderer.service.js');
    
    // Initialize game components
    const gameService = new GameWebSocketService();
    const renderer = new GameRenderer('pongCanvas');
    
    // Connect to WebSocket
    await gameService.connect();
    
    // Set up game event handlers
    setupGameEvents(gameService, renderer);
    
    // Set up UI controls
    setupGameControls(gameService);
    
    console.log('Enhanced game system initialized');
    
  } catch (error) {
    console.error('Failed to initialize enhanced game:', error);
    // Fallback to basic game
    initializeBasicGame();
  }
}

function setupGameEvents(gameService: any, renderer: any) {
  // Handle authentication
  gameService.on('authenticated', () => {
    console.log('Game WebSocket authenticated');
    // Auto-join a game room
    gameService.joinGame();
  });
  
  gameService.on('auth_error', (error: any) => {
    console.error('Authentication failed:', error);
    alert('Authentication failed. Please login again.');
    (window as any).router.navigate('login');
  });
  
  // Handle game state updates
  gameService.on('gameUpdate', (gameState: any) => {
    renderer.render(gameState);
    updateGameUI(gameState);
  });
  
  // Handle game events
  gameService.on('gameJoined', (data: any) => {
    console.log('Joined game room:', data);
    showGameMessage('Joined game room. Waiting for opponent...');
  });
  
  gameService.on('playerJoined', (data: any) => {
    console.log('Player joined:', data);
    showGameMessage(`${data.username} joined the game!`);
  });
  
  gameService.on('playerLeft', (data: any) => {
    console.log('Player left:', data);
    showGameMessage(`${data.username} left the game`);
  });
  
  gameService.on('gameStarted', (data: any) => {
    console.log('Game started:', data);
    showGameMessage('Game started! Use arrow keys to control your paddle.');
    hideGameControls();
  });
  
  gameService.on('gameEnded', (data: any) => {
    console.log('Game ended:', data);
    const winner = data.winner;
    showGameMessage(`Game finished! Winner: ${winner.username}`);
    showGameControls();
  });
  
  gameService.on('scoreUpdate', (data: any) => {
    console.log('Score update:', data);
    updateScoreDisplay(data.score);
  });
  
  gameService.on('gameError', (error: any) => {
    console.error('Game error:', error);
    showGameMessage(`Error: ${error.message}`);
  });
  
  gameService.on('connectionLost', () => {
    showGameMessage('Connection lost. Please refresh the page.');
  });
  
  // Set up keyboard controls
  setupKeyboardControls(gameService);
}

function setupGameControls(gameService: any) {
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const leaveBtn = document.getElementById('leaveBtn');

  startBtn?.addEventListener('click', () => {
    gameService.startGame();
  });

  pauseBtn?.addEventListener('click', () => {
    // Pause functionality can be added to backend
    showGameMessage('Pause functionality coming soon!');
  });

  resetBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the game?')) {
      gameService.leaveGame();
      gameService.joinGame(); // Join a new game
    }
  });
  
  leaveBtn?.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the game?')) {
      gameService.leaveGame();
      (window as any).router.navigate('home');
    }
  });
}

function setupKeyboardControls(gameService: any) {
  const keys: { [key: string]: boolean } = {};
  let lastMoveTime = 0;
  const moveThrottle = 50; // Throttle moves to prevent spam

  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    handleMovement(gameService, keys);
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  function handleMovement(gameService: any, keys: { [key: string]: boolean }) {
    const now = Date.now();
    if (now - lastMoveTime < moveThrottle) return;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
      gameService.sendMove('up');
      lastMoveTime = now;
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
      gameService.sendMove('down');
      lastMoveTime = now;
    }
  }
}

function updateGameUI(gameState: any) {
  // Update player info
  const leftPlayer = document.getElementById('leftPlayer');
  const rightPlayer = document.getElementById('rightPlayer');
  
  if (leftPlayer && gameState.players.left) {
    leftPlayer.textContent = gameState.players.left.username;
  }
  
  if (rightPlayer && gameState.players.right) {
    rightPlayer.textContent = gameState.players.right.username;
  }
  
  // Update game status
  const statusEl = document.getElementById('gameStatus');
  if (statusEl) {
    statusEl.textContent = gameState.gameStatus;
  }
}

function updateScoreDisplay(score: any) {
  const leftScore = document.getElementById('leftScore');
  const rightScore = document.getElementById('rightScore');
  
  if (leftScore) leftScore.textContent = score.left.toString();
  if (rightScore) rightScore.textContent = score.right.toString();
}

function showGameMessage(message: string) {
  const messageEl = document.getElementById('gameMessage');
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }
}

function hideGameControls() {
  const controls = document.getElementById('gameControls');
  if (controls) {
    controls.style.display = 'none';
  }
}

function showGameControls() {
  const controls = document.getElementById('gameControls');
  if (controls) {
    controls.style.display = 'block';
  }
}

// Fallback basic game implementation
function initializeBasicGame() {
  console.log('Initializing basic game (fallback)');
  
  const canvasEl = document.getElementById('pongCanvas');
  if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) return;
  
  const canvas = canvasEl;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Game state
  let gameRunning = false;
  let player1Score = 0;
  let player2Score = 0;

  // Game objects
  const paddle = {
    width: 10,
    height: 80,
    player1Y: canvas.height / 2 - 40,
    player2Y: canvas.height / 2 - 40,
    speed: 5
  };

  const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    speedX: 3,
    speedY: 3
  };

  // Event listeners
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');

  startBtn?.addEventListener('click', startGame);
  pauseBtn?.addEventListener('click', pauseGame);
  resetBtn?.addEventListener('click', resetGame);

  // Keyboard controls
  const keys: { [key: string]: boolean } = {};

  document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  function gameLoop() {
    if (!gameRunning || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update paddles
    if ((keys['w'] || keys['W']) && paddle.player1Y > 0) {
      paddle.player1Y -= paddle.speed;
    }
    if ((keys['s'] || keys['S']) && paddle.player1Y < canvas.height - paddle.height) {
      paddle.player1Y += paddle.speed;
    }

    // Simple AI for player 2
    if (ball.y < paddle.player2Y + paddle.height / 2 && paddle.player2Y > 0) {
      paddle.player2Y -= paddle.speed * 0.7;
    }
    if (ball.y > paddle.player2Y + paddle.height / 2 && paddle.player2Y < canvas.height - paddle.height) {
      paddle.player2Y += paddle.speed * 0.7;
    }

    // Update ball
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Ball collision with top/bottom
    if (ball.y <= ball.radius || ball.y >= canvas.height - ball.radius) {
      ball.speedY = -ball.speedY;
    }

    // Ball collision with paddles
    if (ball.x <= 20 + paddle.width && 
        ball.y >= paddle.player1Y && 
        ball.y <= paddle.player1Y + paddle.height) {
      ball.speedX = -ball.speedX;
    }

    if (ball.x >= canvas.width - 20 - paddle.width && 
        ball.y >= paddle.player2Y && 
        ball.y <= paddle.player2Y + paddle.height) {
      ball.speedX = -ball.speedX;
    }

    // Scoring
    if (ball.x < 0) {
      player2Score++;
      resetBall();
    }
    if (ball.x > canvas.width) {
      player1Score++;
      resetBall();
    }

    // Draw everything
    drawGame();

    requestAnimationFrame(gameLoop);
  }

  function drawGame() {
    if (!ctx) return;
    
    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(20, paddle.player1Y, paddle.width, paddle.height);
    ctx.fillRect(canvas.width - 20 - paddle.width, paddle.player2Y, paddle.width, paddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw scores
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player1Score.toString(), canvas.width / 4, 50);
    ctx.fillText(player2Score.toString(), 3 * canvas.width / 4, 50);
  }

  function startGame() {
    gameRunning = true;
    gameLoop();
  }

  function pauseGame() {
    gameRunning = false;
  }

  function resetGame() {
    gameRunning = false;
    player1Score = 0;
    player2Score = 0;
    resetBall();
    drawGame();
  }

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = (Math.random() > 0.5 ? 1 : -1) * 3;
    ball.speedY = (Math.random() > 0.5 ? 1 : -1) * 3;
  }

  // Initial draw
  drawGame();
}