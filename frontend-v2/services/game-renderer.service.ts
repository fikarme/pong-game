import { GameState } from './game-websocket.service.js';

export interface PowerUp {
  id: string;
  type: 'speed' | 'size' | 'multiball';
  x: number;
  y: number;
  duration: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastRenderTime = 0;
  private targetFPS = 60;
  private frameInterval = 1000 / this.targetFPS;
  
  // Game styling
  private colors = {
    background: '#000000',
    paddle: '#ffffff',
    ball: '#ffffff',
    score: '#ffffff',
    centerLine: '#ffffff',
    powerUp: {
      speed: '#ff6b6b',
      size: '#4ecdc4',
      multiball: '#ffe66d'
    }
  };
  
  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas with id '${canvasId}' not found`);
    }
    
    this.canvas = canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;
    
    this.setupCanvas();
    this.startRenderLoop();
  }
  
  // Set up canvas properties
  private setupCanvas() {
    // Set canvas size
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = Math.min(800, container.clientWidth - 40);
      this.canvas.height = Math.min(400, container.clientHeight - 40);
    } else {
      this.canvas.width = 800;
      this.canvas.height = 400;
    }
    
    // Enable smooth rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }
  
  // Render game state
  render(gameState: GameState, powerUps: PowerUp[] = []) {
    this.clearCanvas();
    
    // Draw background elements
    this.drawCenterLine();
    this.drawScore(gameState.score);
    
    // Draw game objects
    this.drawPaddles(gameState.paddles);
    this.drawBall(gameState.ball);
    this.drawPowerUps(powerUps);
    
    // Draw game status overlay
    this.drawGameStatus(gameState.gameStatus, gameState.players);
  }
  
  // Clear the canvas
  private clearCanvas() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  // Draw center line
  private drawCenterLine() {
    this.ctx.strokeStyle = this.colors.centerLine;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]); // Reset line dash
  }
  
  // Draw score
  private drawScore(score: { left: number; right: number }) {
    this.ctx.fillStyle = this.colors.score;
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    // Left score
    this.ctx.fillText(
      score.left.toString(),
      this.canvas.width / 4,
      30
    );
    
    // Right score
    this.ctx.fillText(
      score.right.toString(),
      (this.canvas.width * 3) / 4,
      30
    );
  }
  
  // Draw paddles
  private drawPaddles(paddles: GameState['paddles']) {
    const paddleWidth = 10;
    const paddleHeight = paddles.left.height || 80;
    
    this.ctx.fillStyle = this.colors.paddle;
    
    // Left paddle
    this.ctx.fillRect(
      20,
      paddles.left.y - paddleHeight / 2,
      paddleWidth,
      paddleHeight
    );
    
    // Right paddle
    this.ctx.fillRect(
      this.canvas.width - 20 - paddleWidth,
      paddles.right.y - paddleHeight / 2,
      paddleWidth,
      paddleHeight
    );
  }
  
  // Draw ball
  private drawBall(ball: GameState['ball']) {
    const radius = 8;
    
    this.ctx.fillStyle = this.colors.ball;
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add ball trail effect
    this.drawBallTrail(ball);
  }
  
  // Draw ball trail for visual effect
  private drawBallTrail(ball: GameState['ball']) {
    const trailLength = 3;
    const trailSpacing = 8;
    
    for (let i = 1; i <= trailLength; i++) {
      const alpha = (trailLength - i) / trailLength * 0.3;
      const trailX = ball.x - (ball.velocityX * trailSpacing * i);
      const trailY = ball.y - (ball.velocityY * trailSpacing * i);
      const radius = 8 * (1 - i * 0.2);
      
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = this.colors.ball;
      this.ctx.beginPath();
      this.ctx.arc(trailX, trailY, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1; // Reset alpha
  }
  
  // Draw power-ups
  private drawPowerUps(powerUps: PowerUp[]) {
    powerUps.forEach(powerUp => {
      const size = 20;
      const color = this.colors.powerUp[powerUp.type];
      
      // Draw power-up with pulsing effect
      const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 1;
      const actualSize = size * pulse;
      
      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        powerUp.x - actualSize / 2,
        powerUp.y - actualSize / 2,
        actualSize,
        actualSize
      );
      
      // Draw power-up icon
      this.ctx.fillStyle = '#000000';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      const icon = powerUp.type === 'speed' ? '⚡' : 
                   powerUp.type === 'size' ? '🔺' : '⚾';
      
      this.ctx.fillText(icon, powerUp.x, powerUp.y);
    });
  }
  
  // Draw game status overlay
  private drawGameStatus(status: GameState['gameStatus'], players: GameState['players']) {
    if (status === 'waiting') {
      this.drawStatusOverlay('Waiting for players...', 'Connect to start playing');
    } else if (status === 'paused') {
      this.drawStatusOverlay('Game Paused', 'Press SPACE to resume');
    } else if (status === 'finished') {
      this.drawStatusOverlay('Game Finished!', 'Thanks for playing');
    }
    
    // Draw player names
    this.drawPlayerNames(players);
  }
  
  // Draw status overlay
  private drawStatusOverlay(title: string, subtitle: string) {
    // Draw semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 - 20);
    
    // Draw subtitle
    this.ctx.font = '18px Arial';
    this.ctx.fillText(subtitle, this.canvas.width / 2, this.canvas.height / 2 + 20);
  }
  
  // Draw player names
  private drawPlayerNames(players: GameState['players']) {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textBaseline = 'bottom';
    
    // Left player
    if (players.left) {
      this.ctx.textAlign = 'left';
      this.ctx.fillText(players.left.username, 20, this.canvas.height - 10);
    }
    
    // Right player
    if (players.right) {
      this.ctx.textAlign = 'right';
      this.ctx.fillText(players.right.username, this.canvas.width - 20, this.canvas.height - 10);
    }
  }
  
  // Start render loop
  private startRenderLoop() {
    const renderFrame = (currentTime: number) => {
      const deltaTime = currentTime - this.lastRenderTime;
      
      if (deltaTime >= this.frameInterval) {
        // Render frame would be called by game state updates
        this.lastRenderTime = currentTime;
      }
      
      this.animationId = requestAnimationFrame(renderFrame);
    };
    
    this.animationId = requestAnimationFrame(renderFrame);
  }
  
  // Stop render loop
  stopRenderLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  // Handle canvas resize
  resize() {
    this.setupCanvas();
  }
  
  // Cleanup
  destroy() {
    this.stopRenderLoop();
  }
}