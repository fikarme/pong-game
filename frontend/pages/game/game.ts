import { Router } from "../../core/router.js";
import { notify } from "../../core/notify.js";

declare global {
  var router: Router;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [userId: number]: { x: number; y: number; width: number; height: number } };
  score: { [userId: number]: number };
  gameOver: boolean;
}

// New constants system
const PADSPEED = 8; // Converted from your 0.09 to current scale
const BALLSPEEDXDEFAULT = 3; // Converted from your 0.09 to current scale
const BALLSPEEDZDEFAULT = 2; // Converted from your 0.07 to current scale
const BALLSPEEDMULTI = 1.10;

  function interpolateColors(color1: RGB, color2: RGB, factor: number): RGB {
    return {
      r: color1.r + (color2.r - color1.r) * factor,
      g: color1.g + (color2.g - color1.g) * factor,
      b: color1.b + (color2.b - color1.b) * factor
    };
  }

const COLORS = {
  BORDER: { r: 0, g: 0.8, b: 1 }, // Keeping current cyan
  LEFT_PADDLE: { r: 1, g: 0.2, b: 0.3 }, // Keeping current neon red
  RIGHT_PADDLE: { r: 0.2, g: 1, b: 0.2 }, // Keeping current neon green
  BORDER_FLASH: { r: 1, g: 0, b: 1 }, // Magenta flash
  PADDLE_FLASH: { r: 1, g: 1, b: 0 }, // Yellow flash
  BALL_COLORS: [
    { r: 1, g: 1, b: 1 }, // White (current)
    { r: 1, g: 0, b: 1 }, // Magenta
    { r: 0, g: 1, b: 1 }, // Cyan
    { r: 1, g: 0.5, b: 0 }, // Orange
    { r: 0.5, g: 0, b: 1 }, // Purple
    { r: 1, g: 1, b: 0 }, // Yellow
    { r: 0, g: 1, b: 0.5 } // Green-cyan
  ],
  TABLE: { r: 0.05, g: 0.05, b: 0.1 }, // Keeping current dark blue
  PARTICLES: {
    TRAIL: { r: 0.5, g: 0.8, b: 1 } // Blue trail particles (will be dynamic)
  }
};

// Enhanced 3D Game constants - updated to use new color system
const PONG_3D_CONFIG = {
  TABLE: { width: 12, height: 0.15, depth: 6 },
  PADDLE: { width: 0.2, height: 0.4, depth: 1.2 },
  BALL: { radius: 0.12 },
  BORDER_THICKNESS: 0.15,
  CAMERA: {
    DEFAULT_POSITION: { x: 0, y: 8, z: 6 },
    MIN_DISTANCE: 5,
    MAX_DISTANCE: 15,
    MIN_BETA: 0.1,
    MAX_BETA: Math.PI / 2 - 0.1
  }
};

// 3D Game variables
let engine: any = null;
let scene: any = null;
let camera: any = null;
let glowLayer: any = null;

// 3D Game objects
let table: any = null;
let borders: any[] = [];
let paddle1: any = null;
let paddle2: any = null;
let ball: any = null;

// Materials
let tableMat: any = null;
let borderMats: any[] = [];
let paddle1Mat: any = null;
let paddle2Mat: any = null;
let ballMat: any = null;

// Lights and effects
let mainLight: any = null;
let paddle1Light: any = null;
let paddle2Light: any = null;
let ballLight: any = null;
let ambientLight: any = null;

// Particle systems
let ballTrailParticles: any = null;

// Animation tracking
let borderFlashTimes: number[] = [0, 0, 0, 0]; // left, right, top, bottom
let paddleFlashTimes: number[] = [0, 0]; // paddle1, paddle2

// Local two-player game state
let localGameState: GameState = {
  ball: { x: 400, y: 200, dx: BALLSPEEDXDEFAULT, dy: BALLSPEEDZDEFAULT },
  paddles: {
    1: { x: 25, y: 150, width: 20, height: 100 },
    2: { x: 755, y: 150, width: 20, height: 100 }
  },
  score: { 1: 0, 2: 0 },
  gameOver: false
};

// Local game constants - updated to use new speed system
const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 400,
  PADDLE_SPEED: PADSPEED,
  BALL_SPEED_INCREMENT: BALLSPEEDMULTI,
  MAX_SCORE: 5
};

let player1Keys = { up: false, down: false };
let player2Keys = { up: false, down: false };

let gameLoopInterval: number | null = null;
let gamePaused = false;

let resizeHandler: (() => void) | null = null;

export async function init() {
  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    notify('3D engine not available. Please refresh the page.');
    return;
  }

  const desktopCanvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const mobileCanvas = document.getElementById('mobile-game-canvas') as HTMLCanvasElement | null;

  if (!desktopCanvas && !mobileCanvas) {
    console.error('No canvas found');
    notify('Game canvas not found!');
    return;
  }

  // Get UI elements
  const player1NameEl = document.getElementById('player1-name');
  const player2NameEl = document.getElementById('player2-name');
  const player1InitialEl = document.getElementById('player1-initial');
  const player2InitialEl = document.getElementById('player2-initial');
  const player1ScoreEl = document.getElementById('player1-score');
  const player2ScoreEl = document.getElementById('player2-score');
  const roomIdEl = document.getElementById('room-id');
  const gameStatusEl = document.getElementById('game-status');
  const leaveGameBtn = document.getElementById('leave-game-btn');

  // Mobile elements
  const mobilePlayer1NameEl = document.getElementById('mobile-player1-name');
  const mobilePlayer2NameEl = document.getElementById('mobile-player2-name');
  const mobilePlayer1InitialEl = document.getElementById('mobile-player1-initial');
  const mobilePlayer2InitialEl = document.getElementById('mobile-player2-initial');
  const mobilePlayer1ScoreEl = document.getElementById('mobile-player1-score');
  const mobilePlayer2ScoreEl = document.getElementById('mobile-player2-score');
  const mobileGameStatusEl = document.getElementById('mobile-game-status');
  const mobileLeaveBtn = document.getElementById('mobile-leave-btn');

  // Set up local game
  if (roomIdEl) roomIdEl.textContent = 'LOCAL GAME';
  if (leaveGameBtn) leaveGameBtn.addEventListener('click', handleLeaveGame);
  if (mobileLeaveBtn) mobileLeaveBtn.addEventListener('click', handleLeaveGame);

  // Initialize 3D scene
  init3DScene();

  // Setup local controls
  setupLocalKeyboardControls();

  // Setup pause functionality for tab switching
  setupPauseOnTabSwitch();

  // Initialize player names
  initLocalPlayerNames();

  // Update initial scores
  updateLocalScores();

  // Start local game
  startLocalGame();

  function initLocalPlayerNames() {
    // Desktop elements
    if (player1NameEl) player1NameEl.textContent = 'PLAYER 1';
    if (player2NameEl) player2NameEl.textContent = 'PLAYER 2';
    if (player1InitialEl) player1InitialEl.textContent = 'P1';
    if (player2InitialEl) player2InitialEl.textContent = 'P2';

    // Mobile elements
    if (mobilePlayer1NameEl) mobilePlayer1NameEl.textContent = 'PLAYER 1';
    if (mobilePlayer2NameEl) mobilePlayer2NameEl.textContent = 'PLAYER 2';
    if (mobilePlayer1InitialEl) mobilePlayer1InitialEl.textContent = 'P1';
    if (mobilePlayer2InitialEl) mobilePlayer2InitialEl.textContent = 'P2';

    console.log('🎮 Local player names initialized');
  }

  function updateLocalScores() {
    const score1 = localGameState.score[1] || 0;
    const score2 = localGameState.score[2] || 0;

    // Update desktop scores
    if (player1ScoreEl) player1ScoreEl.textContent = score1.toString();
    if (player2ScoreEl) player2ScoreEl.textContent = score2.toString();

    // Update mobile scores
    if (mobilePlayer1ScoreEl) mobilePlayer1ScoreEl.textContent = score1.toString();
    if (mobilePlayer2ScoreEl) mobilePlayer2ScoreEl.textContent = score2.toString();
  }

  function startLocalGame() {
    if (gameStatusEl) gameStatusEl.textContent = '⚔️ LOCAL BATTLE ⚔️';
    if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚔️ BATTLE ⚔️';

    // Start local game loop
    gameLoopInterval = setInterval(updateLocalGame, 16) as any; // 60 FPS
    console.log('🎮 Local game started');
  }

  function updateLocalGame() {
    // Don't update if game is paused
    if (gamePaused) return;

    // Update paddle positions
    updatePaddles();

    // Update ball physics
    updateBall();

    // Update 3D scene
    update3DGameState();

    // Update scores
    updateLocalScores();

    // Check for game over
    checkGameOver();
  }

  function updatePaddles() {
    const paddleSpeed = GAME_CONFIG.PADDLE_SPEED;

    // Player 1 (W/S keys) - Allow paddles to go all the way to borders
    if (player1Keys.down) {
      localGameState.paddles[1].y = Math.max(-5, localGameState.paddles[1].y - paddleSpeed);
    }
    if (player1Keys.up) {
      localGameState.paddles[1].y = Math.min(GAME_CONFIG.CANVAS_HEIGHT - localGameState.paddles[1].height + 5, localGameState.paddles[1].y + paddleSpeed);
    }

    // Player 2 (Arrow keys) - Allow paddles to go all the way to borders
    if (player2Keys.down) {
      localGameState.paddles[2].y = Math.max(-5, localGameState.paddles[2].y - paddleSpeed);
    }
    if (player2Keys.up) {
      localGameState.paddles[2].y = Math.min(GAME_CONFIG.CANVAS_HEIGHT - localGameState.paddles[2].height + 5, localGameState.paddles[2].y + paddleSpeed);
    }
  }

  function updateBall() {
    localGameState.ball.x += localGameState.ball.dx;
    localGameState.ball.y += localGameState.ball.dy;

    // Calculate ball radius in 2D coordinates to match visual representation
    // 3D ball radius (0.12) mapped to 2D coordinate system
    const ballRadius = 9; // Calculated from 3D to 2D mapping

    if (localGameState.ball.y <= 0 || localGameState.ball.y >= GAME_CONFIG.CANVAS_HEIGHT) {
      localGameState.ball.dy = -localGameState.ball.dy;
      borderFlashTimes[localGameState.ball.y <= 0 ? 3 : 2] = 1.5; // Flash correct border for 3D view
    }

    // Ball collision with paddles - account for ball radius for precise visual collision
    const ball = localGameState.ball;
    const paddle1 = localGameState.paddles[1];
    const paddle2 = localGameState.paddles[2];

    // Left paddle collision - ball's left edge touches paddle's right edge
    if (ball.x - ballRadius <= paddle1.x + paddle1.width &&
        ball.x + ballRadius >= paddle1.x &&
        ball.y >= paddle1.y &&
        ball.y <= paddle1.y + paddle1.height &&
        ball.dx < 0) {
      ball.dx = -ball.dx;
      // Speed up ball using constant
      ball.dx *= BALLSPEEDMULTI;
      ball.dy *= BALLSPEEDMULTI;
      paddleFlashTimes[0] = 1.0;
    }

    // Right paddle collision - ball's right edge touches paddle's left edge
    if (ball.x + ballRadius >= paddle2.x &&
        ball.x - ballRadius <= paddle2.x + paddle2.width &&
        ball.y >= paddle2.y &&
        ball.y <= paddle2.y + paddle2.height &&
        ball.dx > 0) {
      ball.dx = -ball.dx;
      // Speed up ball using constant
      ball.dx *= BALLSPEEDMULTI;
      ball.dy *= BALLSPEEDMULTI;
      paddleFlashTimes[1] = 1.0;
    }

    // Score detection - ball touches borders, flash, then score
    if (ball.x <= 0) {
      // Ball touches left border - Player 2 scores
      borderFlashTimes[0] = 1.5; // Flash left border
      localGameState.score[2]++;
      resetBall();
    } else if (ball.x >= GAME_CONFIG.CANVAS_WIDTH) {
      // Ball touches right border - Player 1 scores
      borderFlashTimes[1] = 1.5; // Flash right border
      localGameState.score[1]++;
      resetBall();
    }
  }

  function resetBall() {
    localGameState.ball.x = GAME_CONFIG.CANVAS_WIDTH / 2;
    localGameState.ball.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
    // Random direction for both X and Y
    localGameState.ball.dx = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDXDEFAULT;
    localGameState.ball.dy = (Math.random() > 0.5 ? 1 : -1) * (BALLSPEEDZDEFAULT * (0.5 + Math.random() * 0.5));
  }

  function checkGameOver() {
    if (localGameState.score[1] >= GAME_CONFIG.MAX_SCORE || localGameState.score[2] >= GAME_CONFIG.MAX_SCORE) {
      const winner = localGameState.score[1] >= GAME_CONFIG.MAX_SCORE ? 'Player 1' : 'Player 2';

      if (gameStatusEl) gameStatusEl.textContent = `🏆 ${winner} WINS! 🏆`;
      if (mobileGameStatusEl) mobileGameStatusEl.textContent = `🏆 ${winner} WINS! 🏆`;

      localGameState.gameOver = true;

      if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
      }

      notify(`${winner} wins the game!`, 'green');

      // Reset game after 3 seconds
      setTimeout(() => {
        resetLocalGame();
      }, 3000);
    }
  }

  function resetLocalGame() {
    localGameState = {
      ball: { x: 400, y: 200, dx: 3, dy: 2 },
      paddles: {
        1: { x: 25, y: 150, width: 20, height: 100 },
        2: { x: 755, y: 150, width: 20, height: 100 }
      },
      score: { 1: 0, 2: 0 },
      gameOver: false
    };

    updateLocalScores();
    startLocalGame();
  }

  function setupLocalKeyboardControls() {
    document.addEventListener('keydown', handleLocalKeyDown);
    document.addEventListener('keyup', handleLocalKeyUp);
    console.log('🎮 Local keyboard controls set up');
  }

  function setupPauseOnTabSwitch() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab is now hidden, pause the game
        gamePaused = true;
        if (gameStatusEl) gameStatusEl.textContent = '⏸️ GAME PAUSED ⏸️';
        if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⏸️ PAUSED ⏸️';
        // Pause particle system
        if (ballTrailParticles) ballTrailParticles.stop();
        console.log('🎮 Game paused - tab hidden');
      } else {
        // Tab is now visible, resume the game
        if (!localGameState.gameOver) {
          gamePaused = false;
          if (gameStatusEl) gameStatusEl.textContent = '⚔️ LOCAL BATTLE ⚔️';
          if (mobileGameStatusEl) mobileGameStatusEl.textContent = '⚔️ BATTLE ⚔️';
          // Resume particle system
          if (ballTrailParticles) ballTrailParticles.start();
          console.log('🎮 Game resumed - tab visible');
        }
      }
    });
    console.log('🎮 Pause on tab switch set up');
  }

  function handleLocalKeyDown(e: KeyboardEvent) {
    switch(e.code) {
      case 'KeyW':
        player1Keys.up = true;
        break;
      case 'KeyS':
        player1Keys.down = true;
        break;
      case 'ArrowUp':
        e.preventDefault();
        player2Keys.up = true;
        break;
      case 'ArrowDown':
        e.preventDefault();
        player2Keys.down = true;
        break;
    }
  }

  function handleLocalKeyUp(e: KeyboardEvent) {
    switch(e.code) {
      case 'KeyW':
        player1Keys.up = false;
        break;
      case 'KeyS':
        player1Keys.down = false;
        break;
      case 'ArrowUp':
        e.preventDefault();
        player2Keys.up = false;
        break;
      case 'ArrowDown':
        e.preventDefault();
        player2Keys.down = false;
        break;
    }
  }

  function handleLeaveGame() {
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      gameLoopInterval = null;
    }
    cleanup3D();
    router.navigate('landing');
  }

  function init3DScene() {
    console.log('🎮 Initializing Enhanced 3D Pong Arena...');

    // If engine already exists, clean it up first
    if (engine) {
      console.log('🧹 Cleaning up existing engine...');
      cleanup3D();
    }

    const isMobile = window.innerWidth < 1024;
    const targetCanvas = (isMobile && mobileCanvas) ? mobileCanvas : desktopCanvas;

    if (!targetCanvas) {
      console.error('No target canvas available');
      return;
    }

    // Initialize Babylon.js engine with enhanced settings
    engine = new BABYLON.Engine(targetCanvas, true, {
      antialias: true,
      adaptToDeviceRatio: true,
      powerPreference: "high-performance",
      stencil: true
    });

    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    // Setup fixed camera - 45 degree view from the other side
    camera = new BABYLON.ArcRotateCamera('camera',
      -Math.PI / 2,          // Alpha: -90 degrees (opposite side view)
      Math.PI / 4,           // Beta: 45 degrees (45 degree angle from top)
      12,                    // Radius: distance from target
      BABYLON.Vector3.Zero(), // Target: center of the table
      scene
    );

    // Lock camera - no user controls
    camera.inputs.clear(); // Remove all camera inputs (mouse, keyboard, etc.)

    // Set camera target to center of game area
    camera.setTarget(BABYLON.Vector3.Zero());

    console.log('🎮 Fixed camera setup: 45° view from opposite side');

    // Setup glow layer - reduced intensity for better visibility
    glowLayer = new BABYLON.GlowLayer("glow", scene);
    glowLayer.intensity = 0.8;
    glowLayer.blurKernelSize = 64;

    // Create scene objects
    createEnhancedTable();
    createEnhancedBorders();
    createEnhancedPaddles();
    createEnhancedBall();
    createEnhancedLighting();
    createParticleSystems();

    // Setup responsive canvas
    setupResponsiveCanvas(targetCanvas);

    // Start render loop with enhanced animations
    engine.runRenderLoop(() => {
      handleEnhancedAnimations();
      scene.render();
    });

    // Handle window resize
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }

    resizeHandler = () => {
      if (engine) {
        engine.resize();
        setupResponsiveCanvas(targetCanvas);
      }
    };

    window.addEventListener('resize', resizeHandler);

    console.log('✅ Enhanced 3D Pong Arena initialized successfully');
  }

  // CRT post-processing removed for cleaner look
  // function setupPostProcessing(targetCanvas: HTMLCanvasElement) { ... }

  function createEnhancedTable() {
    table = BABYLON.MeshBuilder.CreateBox('table', {
      width: PONG_3D_CONFIG.TABLE.width,
      height: PONG_3D_CONFIG.TABLE.height,
      depth: PONG_3D_CONFIG.TABLE.depth
    }, scene);

    tableMat = new BABYLON.StandardMaterial('tableMat', scene);
    tableMat.diffuseColor = new BABYLON.Color3(COLORS.TABLE.r, COLORS.TABLE.g, COLORS.TABLE.b);
    tableMat.emissiveColor = new BABYLON.Color3(COLORS.TABLE.r, COLORS.TABLE.g, COLORS.TABLE.b);
    tableMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    tableMat.roughness = 0.8;
    table.material = tableMat;
    table.position.y = -PONG_3D_CONFIG.TABLE.height / 2;

    // Add center line
    const centerLine = BABYLON.MeshBuilder.CreateBox('centerLine', {
      width: 0.05,
      height: 0.02,
      depth: PONG_3D_CONFIG.TABLE.depth * 0.8
    }, scene);

    const centerLineMat = new BABYLON.StandardMaterial('centerLineMat', scene);
    centerLineMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
    centerLineMat.alpha = 0.6;
    centerLine.material = centerLineMat;
    centerLine.position.y = 0.01;
    glowLayer.addIncludedOnlyMesh(centerLine);
  }

  function createEnhancedBorders() {
    const borderThickness = PONG_3D_CONFIG.BORDER_THICKNESS;
    const tableWidth = PONG_3D_CONFIG.TABLE.width;
    const tableDepth = PONG_3D_CONFIG.TABLE.depth;

    const borderConfigs = [
      { name: 'left', size: { width: borderThickness, height: 0.3, depth: tableDepth + borderThickness * 2 }, pos: { x: -tableWidth/2 - borderThickness/2, y: 0.1, z: 0 } },
      { name: 'right', size: { width: borderThickness, height: 0.3, depth: tableDepth + borderThickness * 2 }, pos: { x: tableWidth/2 + borderThickness/2, y: 0.1, z: 0 } },
      { name: 'top', size: { width: tableWidth, height: 0.3, depth: borderThickness }, pos: { x: 0, y: 0.1, z: tableDepth/2 + borderThickness/2 } },
      { name: 'bottom', size: { width: tableWidth, height: 0.3, depth: borderThickness }, pos: { x: 0, y: 0.1, z: -tableDepth/2 - borderThickness/2 } }
    ];

    borders = [];
    borderMats = [];

    borderConfigs.forEach((config, index) => {
      const border = BABYLON.MeshBuilder.CreateBox(config.name + 'Border', config.size, scene);
      border.position = new BABYLON.Vector3(config.pos.x, config.pos.y, config.pos.z);

      const borderMat = new BABYLON.StandardMaterial(config.name + 'BorderMat', scene);
      borderMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      borderMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      borderMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      borderMat.alpha = 0.8;
      border.material = borderMat;

      borders.push(border);
      borderMats.push(borderMat);
      glowLayer.addIncludedOnlyMesh(border);
    });
  }

  function createEnhancedPaddles() {
    const paddleConfig = PONG_3D_CONFIG.PADDLE;

    // Left paddle (Player 1) - Enhanced design
    paddle1 = BABYLON.MeshBuilder.CreateBox('paddle1', {
      width: paddleConfig.width,
      height: paddleConfig.height,
      depth: paddleConfig.depth
    }, scene);

    paddle1Mat = new BABYLON.StandardMaterial('paddle1Mat', scene);
    paddle1Mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
    paddle1Mat.specularColor = new BABYLON.Color3(1, 1, 1);
    paddle1Mat.specularPower = 64;
    paddle1Mat.alpha = 0.9;
    paddle1.material = paddle1Mat;

    paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 0.5;
    paddle1.position.y = paddleConfig.height/2; // On table surface
    paddle1.position.z = paddleConfig.depth/2; // Half paddle depth toward user
    glowLayer.addIncludedOnlyMesh(paddle1);

    // Right paddle (Player 2) - Enhanced design
    paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', {
      width: paddleConfig.width,
      height: paddleConfig.height,
      depth: paddleConfig.depth
    }, scene);

    paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
    paddle2Mat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
    paddle2Mat.specularColor = new BABYLON.Color3(1, 1, 1);
    paddle2Mat.specularPower = 64;
    paddle2Mat.alpha = 0.9;
    paddle2.material = paddle2Mat;

    paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 0.5;
    paddle2.position.y = paddleConfig.height/2; // On table surface
    paddle2.position.z = paddleConfig.depth/2; // Half paddle depth toward user
    glowLayer.addIncludedOnlyMesh(paddle2);
  }

  function createEnhancedBall() {
    ball = BABYLON.MeshBuilder.CreateSphere('pongBall', {
      diameter: PONG_3D_CONFIG.BALL.radius * 2,
      segments: 16
    }, scene);

    ballMat = new BABYLON.StandardMaterial('ballMat', scene);
    ballMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ballMat.emissiveColor = new BABYLON.Color3(1, 1, 1); // Always white
    ballMat.specularColor = new BABYLON.Color3(1, 1, 1);
    ballMat.specularPower = 128;
    ball.material = ballMat;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;
    glowLayer.addIncludedOnlyMesh(ball);
  }

  function createEnhancedLighting() {
    // Main directional light
    mainLight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(-0.5, -1, -0.5), scene);
    mainLight.diffuse = new BABYLON.Color3(0.8, 0.9, 1);
    mainLight.intensity = 0.5;

    // Ambient light for overall illumination
    ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.diffuse = new BABYLON.Color3(0.2, 0.3, 0.4);
    ambientLight.intensity = 0.3;

    // Paddle lights - reduced intensity for better visibility
    paddle1Light = new BABYLON.PointLight("paddle1Light", new BABYLON.Vector3(-5, 2, 0), scene);
    paddle1Light.diffuse = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
    paddle1Light.intensity = 0.8;
    paddle1Light.range = 3;

    paddle2Light = new BABYLON.PointLight("paddle2Light", new BABYLON.Vector3(5, 2, 0), scene);
    paddle2Light.diffuse = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
    paddle2Light.intensity = 0.8;
    paddle2Light.range = 3;

    // Ball light - reduced intensity
    ballLight = new BABYLON.PointLight("ballLight", new BABYLON.Vector3(0, 1, 0), scene);
    ballLight.diffuse = new BABYLON.Color3(1, 1, 1); // Always white
    ballLight.intensity = 1.0;
    ballLight.range = 2;
  }

  function createParticleSystems() {
    // Make sure ball exists before creating particle system
    if (!ball) {
      console.error('Ball not created yet, cannot create particle system');
      return;
    }

    // Ball trail particles
    ballTrailParticles = new BABYLON.ParticleSystem("ballTrail", 50, scene);
    ballTrailParticles.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", scene);

    // Set ball as emitter
    ballTrailParticles.emitter = ball;
    ballTrailParticles.minEmitBox = new BABYLON.Vector3(-0.02, -0.02, -0.02);
    ballTrailParticles.maxEmitBox = new BABYLON.Vector3(0.02, 0.02, 0.02);

    // Always use white for trail
    ballTrailParticles.color1 = new BABYLON.Color4(1, 1, 1, 1);
    ballTrailParticles.color2 = new BABYLON.Color4(1, 1, 1, 0);
    ballTrailParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);

    // Particle settings
    ballTrailParticles.minSize = 0.02;
    ballTrailParticles.maxSize = 0.08;
    ballTrailParticles.minLifeTime = 0.1;
    ballTrailParticles.maxLifeTime = 0.3;
    ballTrailParticles.emitRate = 150;
    ballTrailParticles.minEmitPower = 0.2;
    ballTrailParticles.maxEmitPower = 0.5;
    ballTrailParticles.updateSpeed = 0.005;

    // Start the particle system
    ballTrailParticles.start();
    console.log('✅ Ball trail particles created and started');
  }

  function setupResponsiveCanvas(targetCanvas: HTMLCanvasElement) {
    const isMobile = window.innerWidth < 1024;

    if (isMobile && mobileCanvas) {
      const maxWidth = Math.min(window.innerWidth - 32, 400);
      const aspectRatio = 0.75; // Better aspect ratio for 3D view
      mobileCanvas.width = maxWidth;
      mobileCanvas.height = maxWidth * aspectRatio;

      console.log(`📱 Enhanced 3D Mobile canvas: ${mobileCanvas.width}x${mobileCanvas.height}`);
    } else if (desktopCanvas) {
      desktopCanvas.width = 1000;
      desktopCanvas.height = 600; // Enhanced resolution for desktop

      console.log(`🖥️ Enhanced 3D Desktop canvas: ${desktopCanvas.width}x${desktopCanvas.height}`);
    }

    if (engine) {
      engine.resize();
    }
  }

  function handleEnhancedAnimations() {
    if (!scene || !engine) return;

    const deltaTime = engine.getDeltaTime() / 1000;

    // Handle flash animations (continue even when paused for visual feedback)
    handleBorderFlashes(deltaTime);
    handlePaddleFlashes(deltaTime);

    // Update light positions
    if (paddle1Light && paddle1) {
      paddle1Light.position.x = paddle1.position.x;
      paddle1Light.position.z = paddle1.position.z;
    }
    if (paddle2Light && paddle2) {
      paddle2Light.position.x = paddle2.position.x;
      paddle2Light.position.z = paddle2.position.z;
    }
    if (ballLight && ball) {
      ballLight.position.x = ball.position.x;
      ballLight.position.y = ball.position.y;
      ballLight.position.z = ball.position.z;
    }

    // Only animate ball rotation if game is not paused
    if (ball && localGameState && !gamePaused) {
      ball.rotation.x += deltaTime * 5;
      ball.rotation.z += deltaTime * 3;
    }
  }

  function handleBorderFlashes(deltaTime: number) {
    borderFlashTimes.forEach((flashTime, index) => {
      if (flashTime > 0) {
        borderFlashTimes[index] -= deltaTime;
        const flashIntensity = Math.max(0, borderFlashTimes[index] / 1.5);

        if (borderMats[index]) {
          const interpolated = interpolateColors(COLORS.BORDER, COLORS.BORDER_FLASH, flashIntensity);
          borderMats[index].emissiveColor = new BABYLON.Color3(interpolated.r, interpolated.g, interpolated.b);
        }
      } else if (borderMats[index]) {
        borderMats[index].emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      }
    });
  }

  function handlePaddleFlashes(deltaTime: number) {
    // Paddle 1 flash
    if (paddleFlashTimes[0] > 0) {
      paddleFlashTimes[0] -= deltaTime;
      const flashIntensity = Math.max(0, paddleFlashTimes[0] / 1.0);

      if (paddle1Mat) {
        const interpolated = interpolateColors(COLORS.LEFT_PADDLE, COLORS.PADDLE_FLASH, flashIntensity);
        paddle1Mat.emissiveColor = new BABYLON.Color3(interpolated.r, interpolated.g, interpolated.b);
      }

      if (paddle1Light) {
        paddle1Light.intensity = 1.5 + 2.0 * flashIntensity;
      }
    } else if (paddle1Mat) {
      paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
      if (paddle1Light) paddle1Light.intensity = 1.5;
    }

    // Paddle 2 flash
    if (paddleFlashTimes[1] > 0) {
      paddleFlashTimes[1] -= deltaTime;
      const flashIntensity = Math.max(0, paddleFlashTimes[1] / 1.0);

      if (paddle2Mat) {
        const interpolated = interpolateColors(COLORS.RIGHT_PADDLE, COLORS.PADDLE_FLASH, flashIntensity);
        paddle2Mat.emissiveColor = new BABYLON.Color3(interpolated.r, interpolated.g, interpolated.b);
      }

      if (paddle2Light) {
        paddle2Light.intensity = 1.5 + 2.0 * flashIntensity;
      }
    } else if (paddle2Mat) {
      paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
      if (paddle2Light) paddle2Light.intensity = 1.5;
    }
  }

  function update3DGameState() {
    if (!localGameState || !ball || !paddle1 || !paddle2) return;

    // Update ball position - direct coordinate mapping for 45° view
    // Game coordinates: x: 0-800, y: 0-400
    // 3D coordinates: x: -4 to 4, z: -2 to 2 (table bounds)
    const ballX = ((localGameState.ball.x / 800) - 0.5) * PONG_3D_CONFIG.TABLE.width * 0.9; // Scale to table width
    const ballZ = ((localGameState.ball.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9; // Scale to table depth

    ball.position.x = ballX;
    ball.position.z = ballZ;
    ball.position.y = PONG_3D_CONFIG.BALL.radius;

    // Update paddle positions - proper coordinate mapping
    // Left paddle (Player 1)
    const paddle1Data = localGameState.paddles[1];
    if (paddle1Data) {
      // Map game Y (-5 to 305) to 3D Z - no artificial constraints, full range
      const paddleZ = ((paddle1Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;

      // Move paddle toward user (bottom of canvas) by half paddle depth
      const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
      paddle1.position.z = paddleZ + paddleOffset; // No artificial constraints!
      paddle1.position.y = PONG_3D_CONFIG.PADDLE.height/2;
      // Left side of table
      paddle1.position.x = -PONG_3D_CONFIG.TABLE.width/2 + 0.5;
    }

    // Right paddle (Player 2)
    const paddle2Data = localGameState.paddles[2];
    if (paddle2Data) {
      // Map game Y (-5 to 305) to 3D Z - no artificial constraints, full range
      const paddleZ = ((paddle2Data.y / 400) - 0.5) * PONG_3D_CONFIG.TABLE.depth * 0.9;

      // Move paddle toward user (bottom of canvas) by half paddle depth
      const paddleOffset = PONG_3D_CONFIG.PADDLE.depth / 2;
      paddle2.position.z = paddleZ + paddleOffset; // No artificial constraints!
      paddle2.position.y = PONG_3D_CONFIG.PADDLE.height/2;
      // Right side of table
      paddle2.position.x = PONG_3D_CONFIG.TABLE.width/2 - 0.5;
    }
  }

    function cleanup3D() {
    try {
      console.log('🧹 Starting complete cleanup of local game page...');

      // Clear game loop interval
      if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
        console.log('✅ Game loop interval cleared');
      }

      // Remove keyboard event listeners
      document.removeEventListener('keydown', handleLocalKeyDown);
      document.removeEventListener('keyup', handleLocalKeyUp);
      console.log('✅ Keyboard event listeners removed');

      // Remove visibility change listener
      document.removeEventListener('visibilitychange', setupPauseOnTabSwitch);

      // Clear keys pressed state
      player1Keys = { up: false, down: false };
      player2Keys = { up: false, down: false };

      // Clean up 3D scene
      if (ballTrailParticles) {
        ballTrailParticles.dispose();
        ballTrailParticles = null;
      }

      if (engine) {
        engine.stopRenderLoop();
        engine.dispose();
        engine = null;
      }

      // Remove window event listeners
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }

      // Reset all variables
      scene = null;
      camera = null;
      glowLayer = null;

      table = null;
      borders = [];
      paddle1 = null;
      paddle2 = null;
      ball = null;

      tableMat = null;
      borderMats = [];
      paddle1Mat = null;
      paddle2Mat = null;
      ballMat = null;

      mainLight = null;
      paddle1Light = null;
      paddle2Light = null;
      ballLight = null;
      ambientLight = null;

      ballTrailParticles = null;

      // Clear game state
      localGameState = {
        ball: { x: 400, y: 200, dx: 3, dy: 2 },
        paddles: {
          1: { x: 25, y: 150, width: 20, height: 100 },
          2: { x: 755, y: 150, width: 20, height: 100 }
        },
        score: { 1: 0, 2: 0 },
        gameOver: false
      };

      console.log('🧹 Local game cleanup completed');
    } catch (e) {
      console.error('Error cleaning up local game:', e);
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup3D);

  // Store cleanup function globally for external access
  (window as any).localGameCleanup = cleanup3D;

  // Export cleanup function for external use
  return { cleanup: cleanup3D };
}

// Export cleanup function globally
export function cleanup() {
  if ((window as any).localGameCleanup) {
    (window as any).localGameCleanup();
  }
}
