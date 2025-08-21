export interface GameState {
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  paddles: {
    left: { y: number; height: number };
    right: { y: number; height: number };
  };
  score: {
    left: number;
    right: number;
  };
  gameStatus: 'waiting' | 'playing' | 'paused' | 'finished';
  players: {
    left?: { id: string; username: string };
    right?: { id: string; username: string };
  };
}

export interface GameMessage {
  type: 'game';
  event: 'join' | 'move' | 'start' | 'state' | 'score' | 'leave';
  data: any;
}

export class GameWebSocketService {
  private ws: WebSocket | null = null;
  private gameState: GameState | null = null;
  private callbacks: { [event: string]: Function[] } = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  constructor() {
    this.setupEventHandlers();
  }
  
  // Connect to game WebSocket
  connect(gameId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          reject(new Error('Authentication token required'));
          return;
        }
        
        // Create WebSocket connection
        const wsUrl = `ws://localhost:3000/ws`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('Game WebSocket connected');
          this.reconnectAttempts = 0;
          
          // Send authentication
          this.send({
            type: 'auth',
            data: { token }
          });
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
          console.log('Game WebSocket disconnected');
          this.handleReconnection();
        };
        
        this.ws.onerror = (error) => {
          console.error('Game WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Disconnect from WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  // Join a game room
  joinGame(roomId?: string) {
    this.send({
      type: 'game',
      event: 'join',
      data: { roomId: roomId || null }
    });
  }
  
  // Send player move
  sendMove(direction: 'up' | 'down') {
    this.send({
      type: 'game',
      event: 'move',
      data: { direction }
    });
  }
  
  // Start game
  startGame() {
    this.send({
      type: 'game',
      event: 'start',
      data: {}
    });
  }
  
  // Leave game
  leaveGame() {
    this.send({
      type: 'game',
      event: 'leave',
      data: {}
    });
  }
  
  // Get current game state
  getGameState(): GameState | null {
    return this.gameState;
  }
  
  // Event listener registration
  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }
  
  // Remove event listener
  off(event: string, callback: Function) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }
  
  // Private methods
  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }
  
  private handleMessage(message: any) {
    console.log('Received message:', message);
    
    switch (message.type) {
      case 'game':
        this.handleGameMessage(message);
        break;
      case 'error':
        this.emit('error', message.data);
        break;
      case 'auth':
        if (message.event === 'success') {
          this.emit('authenticated');
        } else {
          this.emit('auth_error', message.data);
        }
        break;
    }
  }
  
  private handleGameMessage(message: any) {
    switch (message.event) {
      case 'state':
        this.gameState = message.data;
        this.emit('gameUpdate', this.gameState);
        break;
      case 'joined':
        this.emit('gameJoined', message.data);
        break;
      case 'playerJoined':
        this.emit('playerJoined', message.data);
        break;
      case 'playerLeft':
        this.emit('playerLeft', message.data);
        break;
      case 'gameStarted':
        this.emit('gameStarted', message.data);
        break;
      case 'gameEnded':
        this.emit('gameEnded', message.data);
        break;
      case 'score':
        this.emit('scoreUpdate', message.data);
        break;
      case 'error':
        this.emit('gameError', message.data);
        break;
    }
  }
  
  private emit(event: string, data?: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }
  
  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('connectionLost');
    }
  }
  
  private setupEventHandlers() {
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, pause game updates
        this.emit('gamePaused');
      } else {
        // Page is visible, resume game
        this.emit('gameResumed');
      }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.leaveGame();
      this.disconnect();
    });
  }
}