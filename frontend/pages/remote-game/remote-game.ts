import '../landing/crtShader.js';
import { WebSocketManager } from '../../core/WebSocketManager.js';
import { GameService } from '../../services/GameService.js';
import { AppState } from '../../core/AppState.js';

const PADSPEED = 0.09;
const BALLSPEEDXDEFAULT = 0.09;
const BALLSPEEDZDEFAULT = 0.07;

// Color Configuration
const COLORS = {
  BORDER: { r: 0, g: 1, b: 0 },
  LEFT_PADDLE: { r: 1, g: 0, b: 0 },
  RIGHT_PADDLE: { r: 0, g: 0, b: 1 },
  BORDER_FLASH: { r: 1, g: 0, b: 1 },
  PADDLE_FLASH: { r: 1, g: 1, b: 0 },
  BALL_COLORS: [
    { r: 1, g: 1, b: 1 },
    { r: 1, g: 0, b: 1 },
    { r: 0, g: 1, b: 1 },
    { r: 1, g: 0.5, b: 0 },
    { r: 0.5, g: 0, b: 1 },
    { r: 1, g: 1, b: 0 },
    { r: 0, g: 1, b: 0.5 }
  ],
  BACKGROUND: { r: 1, g: 1, b: 1 },
  TABLE: { r: 0, g: 0, b: 0 }
};

let currentBallColorIndex = 0;

export function init() {
  console.log('Remote-game (Babylon) page loaded');

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    return;
  }

  let canvas = document.getElementById('babylon-canvas');
  let realCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement) {
    realCanvas = canvas;
  } else {
    const createdCanvas = document.createElement('canvas');
    createdCanvas.id = 'babylon-canvas';
    createdCanvas.style.position = 'fixed';
    createdCanvas.style.top = '0';
    createdCanvas.style.left = '0';
    createdCanvas.style.width = '100vw';
    createdCanvas.style.height = '100vh';
    createdCanvas.style.zIndex = '-1';
    createdCanvas.style.pointerEvents = 'none';
    createdCanvas.style.display = 'block';
    createdCanvas.style.background = 'black';
    const appDiv = document.getElementById('app');
    if (appDiv) appDiv.appendChild(createdCanvas); else document.body.appendChild(createdCanvas);
    realCanvas = createdCanvas;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
  }

  (window as any).closeBabylonGame = function() {
    try {
      engine.stopRenderLoop();
      engine.dispose();
    } catch (e) {}
    if (realCanvas && realCanvas.parentNode) realCanvas.parentNode.removeChild(realCanvas);
  };

  const engine = new BABYLON.Engine(realCanvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0.5);

  function resizeCanvas() {
    realCanvas.width = window.innerWidth;
    realCanvas.height = window.innerHeight;
    realCanvas.style.width = '100vw';
    realCanvas.style.height = '100vh';
    engine.resize();
  }
  resizeCanvas();

  const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, 0, 8, BABYLON.Vector3.Zero(), scene);
  camera.setPosition(new BABYLON.Vector3(0, 6, 0));
  camera.setTarget(BABYLON.Vector3.Zero());

  const crtFragmentShader = (window as any).crtFragmentShader;
  BABYLON.Effect.ShadersStore['crtFragmentShader'] = crtFragmentShader;

  const crtPostProcess = new BABYLON.PostProcess(
    'CRTShaderPostProcess', 'crt', ['curvature', 'screenResolution', 'scanLineOpacity', 'vignetteOpacity', 'brightness', 'vignetteRoundness'],
    null, 1.0, camera
  );
  crtPostProcess.onApply = function (effect: any) {
    effect.setFloat2('curvature', 2.5, 2.5);
    effect.setFloat2('screenResolution', realCanvas.width, realCanvas.height);
    effect.setFloat2('scanLineOpacity', 1, 1);
    effect.setFloat('vignetteOpacity', 1);
    effect.setFloat('brightness', 1.2);
    effect.setFloat('vignetteRoundness', 1.5);
  };

  const glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity = 1.5;
  glowLayer.blurKernelSize = 64;

  const table = BABYLON.MeshBuilder.CreateBox('table', { width: 8, height: 0.1, depth: 4 }, scene);
  const tableMat = new BABYLON.StandardMaterial('tableMat', scene);
  tableMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  tableMat.emissiveColor = new BABYLON.Color3(COLORS.TABLE.r, COLORS.TABLE.g, COLORS.TABLE.b);
  tableMat.specularColor = new BABYLON.Color3(0, 0, 0);
  table.material = tableMat;
  table.position.y = -0.05;

  const borderThickness = 0.12;
  const leftBorder = BABYLON.MeshBuilder.CreateBox('leftBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  leftBorder.position.x = -4 + borderThickness / 2;
  leftBorder.position.y = 0.01;
  const leftMat = new BABYLON.StandardMaterial('leftMat', scene);
  leftMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftMat.alpha = 0.8;
  leftBorder.material = leftMat;
  glowLayer.addIncludedOnlyMesh(leftBorder);

  const rightBorder = BABYLON.MeshBuilder.CreateBox('rightBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  rightBorder.position.x = 4 - borderThickness / 2;
  rightBorder.position.y = 0.01;
  const rightMat = new BABYLON.StandardMaterial('rightMat', scene);
  rightMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightMat.alpha = 0.8;
  rightBorder.material = rightMat;
  glowLayer.addIncludedOnlyMesh(rightBorder);

  const topBorder = BABYLON.MeshBuilder.CreateBox('topBorder', { width: 7.6, height: 0.13, depth: borderThickness }, scene);
  topBorder.position.z = 2 - borderThickness / 2;
  topBorder.position.y = 0.01;
  const topMat = new BABYLON.StandardMaterial('topMat', scene);
  topMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  topMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  topMat.alpha = 0.8;
  topMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  topBorder.material = topMat;
  glowLayer.addIncludedOnlyMesh(topBorder);

  const bottomBorder = BABYLON.MeshBuilder.CreateBox('bottomBorder', { width: 7.6, height: 0.13, depth: borderThickness }, scene);
  bottomBorder.position.z = -2 + borderThickness / 2;
  bottomBorder.position.y = 0.01;
  const bottomMat = new BABYLON.StandardMaterial('bottomMat', scene);
  bottomMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  bottomMat.diffuseColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  bottomMat.alpha = 0.8;
  bottomMat.specularColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  bottomBorder.material = bottomMat;
  glowLayer.addIncludedOnlyMesh(bottomBorder);

  const paddleWidth = 0.1, paddleHeight = 0.3, paddleDepth = 0.9;
  const paddle1 = BABYLON.MeshBuilder.CreateBox('paddle1', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle1Mat = new BABYLON.StandardMaterial('paddle1Mat', scene);
  paddle1Mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
  paddle1Mat.specularColor = new BABYLON.Color3(0, 0, 0);
  paddle1Mat.alpha = 0.7;
  paddle1.material = paddle1Mat;
  const paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
  paddle2Mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
  paddle2Mat.specularColor = new BABYLON.Color3(0, 0, 0);
  paddle2Mat.alpha = 0.7;
  paddle2.material = paddle2Mat;
  glowLayer.addIncludedOnlyMesh(paddle1);
  glowLayer.addIncludedOnlyMesh(paddle2);
  paddle1.position.x = -3.6;
  paddle2.position.x = 3.6;
  paddle1.position.y = paddle2.position.y = paddleHeight / 2 + 0.02;

  // Compute safe Z clamp so paddles don't overlap with top/bottom borders
  const fieldHalfDepth = 2; // half of table depth is 2
  const borderHalf = borderThickness / 2;
  const safetyGap = 0.02; // small visual gap from border
  const paddleHalfDepth = paddleDepth / 2;
  const paddleZClamp = fieldHalfDepth - borderHalf - paddleHalfDepth - safetyGap; // ~1.43

  const leftBorderLight = new BABYLON.PointLight('leftBorderLight', new BABYLON.Vector3(-3.8, 0.5, 0), scene);
  leftBorderLight.diffuse = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  leftBorderLight.intensity = 0.8;
  leftBorderLight.range = 3.0;

  const rightBorderLight = new BABYLON.PointLight('rightBorderLight', new BABYLON.Vector3(3.8, 0.5, 0), scene);
  rightBorderLight.diffuse = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
  rightBorderLight.intensity = 0.8;
  rightBorderLight.range = 3.0;

  const paddle1Light = new BABYLON.PointLight('paddle1Light', new BABYLON.Vector3(-3.6, 0.5, 0), scene);
  paddle1Light.diffuse = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
  paddle1Light.intensity = 1.2;
  paddle1Light.range = 2.5;

  const paddle2Light = new BABYLON.PointLight('paddle2Light', new BABYLON.Vector3(3.6, 0.5, 0), scene);
  paddle2Light.diffuse = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
  paddle2Light.intensity = 1.2;
  paddle2Light.range = 2.5;

  const ball = BABYLON.MeshBuilder.CreateSphere('pongBall', { diameter: 0.3 }, scene);
  const ballMat = new BABYLON.StandardMaterial('ballMat', scene);
  ballMat.diffuseColor = new BABYLON.Color3(
    COLORS.BALL_COLORS[currentBallColorIndex].r,
    COLORS.BALL_COLORS[currentBallColorIndex].g,
    COLORS.BALL_COLORS[currentBallColorIndex].b
  );
  ballMat.emissiveColor = new BABYLON.Color3(
    COLORS.BALL_COLORS[currentBallColorIndex].r,
    COLORS.BALL_COLORS[currentBallColorIndex].g,
    COLORS.BALL_COLORS[currentBallColorIndex].b
  );
  ball.material = ballMat;
  ball.position.y = paddleHeight / 2;
  glowLayer.addIncludedOnlyMesh(ball);

  let BALLSPEEDX = BALLSPEEDXDEFAULT;
  let BALLSPEEDZ = BALLSPEEDZDEFAULT;
  let ballDirX = BALLSPEEDX, ballDirZ = BALLSPEEDZ;
  let paddle1ToCorner: number | null = null;
  let paddle2ToCorner: number | null = null;
  let onlineMode = false;
  let currentRoomId: string | null = null;
  const wsManager = WebSocketManager.getInstance();
  const gameService = new GameService();
  const appState = AppState.getInstance();

  // Helper: mapping between server (800x400) and Babylon coordinates
  const toBabylonX = (serverX: number) => (serverX / 800) * 7.2 - 3.6; // [-3.6, 3.6]
  const toBabylonZ = (serverY: number) => ((serverY / 400) * (2 * paddleZClamp)) - paddleZClamp; // [-clamp, clamp]
  const toServerY = (z: number) => ((z + paddleZClamp) / (2 * paddleZClamp)) * 400; // [0, 400]

  // Flash tracking
  let leftBorderFlashTime = 0;
  let rightBorderFlashTime = 0;
  let topBorderFlashTime = 0;
  let bottomBorderFlashTime = 0;

  let paddle1FlashTime = 0;
  let paddle2FlashTime = 0;

  const keys = { up: false, down: false };
  let userControlling = false;
  let myPlayerId: number | null = null;
  let lerpFactor = 0.2; // interpolation for online updates

  window.addEventListener('keydown', (event) => {
    switch (event.code) {
      case 'ArrowUp':
        keys.up = true;
        userControlling = true;
        event.preventDefault();
        if (onlineMode && currentRoomId && myPlayerId !== null) {
          const nextZ = Math.max(Math.min(paddle1.position.z - PADSPEED, paddleZClamp), -paddleZClamp);
          gameService.movePlayer(currentRoomId, Math.max(0, Math.min(300, toServerY(nextZ))));
        }
        break;
      case 'ArrowDown':
        keys.down = true;
        userControlling = true;
        event.preventDefault();
        if (onlineMode && currentRoomId && myPlayerId !== null) {
          const nextZ = Math.max(Math.min(paddle1.position.z + PADSPEED, paddleZClamp), -paddleZClamp);
          gameService.movePlayer(currentRoomId, Math.max(0, Math.min(300, toServerY(nextZ))));
        }
        break;
    }
  });
  window.addEventListener('keyup', (event) => {
    switch (event.code) {
      case 'ArrowUp': keys.up = false; event.preventDefault(); break;
      case 'ArrowDown': keys.down = false; event.preventDefault(); break;
    }
  });

  engine.runRenderLoop(() => {
    const deltaTime = engine.getDeltaTime() / 1000;

    // Flash animations (borders/paddles)
    if (leftBorderFlashTime > 0) {
      leftBorderFlashTime -= deltaTime;
      const flash = leftBorderFlashTime / 2.0;
      if (flash > 0) {
        leftMat.emissiveColor = new BABYLON.Color3(
          COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flash,
          COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flash,
          COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flash
        );
        leftBorderLight.intensity = 0.8 + 3.0 * flash;
      } else {
        leftMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
        leftBorderLight.intensity = 0.8;
      }
    }
    if (rightBorderFlashTime > 0) {
      rightBorderFlashTime -= deltaTime;
      const flash = rightBorderFlashTime / 2.0;
      if (flash > 0) {
        rightMat.emissiveColor = new BABYLON.Color3(
          COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * flash,
          COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * flash,
          COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * flash
        );
        rightBorderLight.intensity = 0.8 + 3.0 * flash;
      } else {
        rightMat.emissiveColor = new BABYLON.Color3(COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
        rightBorderLight.intensity = 0.8;
      }
    }

    if (paddle1FlashTime > 0) {
      paddle1FlashTime -= deltaTime;
      const flash = paddle1FlashTime / 1.0;
      if (flash > 0) {
        paddle1Mat.emissiveColor = new BABYLON.Color3(
          COLORS.LEFT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.LEFT_PADDLE.r) * flash,
          COLORS.LEFT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.LEFT_PADDLE.g) * flash,
          COLORS.LEFT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.LEFT_PADDLE.b) * flash
        );
        paddle1Light.intensity = 1.2 + 2.0 * flash;
      } else {
        paddle1Mat.emissiveColor = new BABYLON.Color3(COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
        paddle1Light.intensity = 1.2;
      }
    }
    if (paddle2FlashTime > 0) {
      paddle2FlashTime -= deltaTime;
      const flash = paddle2FlashTime / 1.0;
      if (flash > 0) {
        paddle2Mat.emissiveColor = new BABYLON.Color3(
          COLORS.RIGHT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.RIGHT_PADDLE.r) * flash,
          COLORS.RIGHT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.RIGHT_PADDLE.g) * flash,
          COLORS.RIGHT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.RIGHT_PADDLE.b) * flash
        );
        paddle2Light.intensity = 1.2 + 2.0 * flash;
      } else {
        paddle2Mat.emissiveColor = new BABYLON.Color3(COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
        paddle2Light.intensity = 1.2;
      }
    }

    paddle1Light.position.z = paddle1.position.z;
    paddle2Light.position.z = paddle2.position.z;

    // Local control or AI only when not online
    if (!onlineMode && !userControlling && paddle1ToCorner !== null) {
      const dz = paddle1ToCorner - paddle1.position.z;
      if (Math.abs(dz) < 0.1) { paddle1.position.z = paddle1ToCorner; paddle1ToCorner = null; }
      else paddle1.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else if (!onlineMode && userControlling) {
      if (keys.up) paddle1.position.z -= PADSPEED;
      if (keys.down) paddle1.position.z += PADSPEED;
    } else if (!onlineMode) {
      paddle1.position.z += Math.sign(ball.position.z - paddle1.position.z) * PADSPEED;
    }

    if (!onlineMode && paddle2ToCorner !== null) {
      const dz = paddle2ToCorner - paddle2.position.z;
      if (Math.abs(dz) < 0.1) { paddle2.position.z = paddle2ToCorner; paddle2ToCorner = null; }
      else paddle2.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else if (!onlineMode) {
      paddle2.position.z += Math.sign(ball.position.z - paddle2.position.z) * PADSPEED;
    }

    paddle1.position.z = Math.max(Math.min(paddle1.position.z, paddleZClamp), -paddleZClamp);
    paddle2.position.z = Math.max(Math.min(paddle2.position.z, paddleZClamp), -paddleZClamp);

    if (!onlineMode) {
      ball.position.x += ballDirX;
      ball.position.z += ballDirZ;
    }

    if (!onlineMode && ball.position.z > 1.85) { ball.position.z = 1.85; ballDirZ *= -1; topBorderFlashTime = 1.0; }
    if (!onlineMode && ball.position.z < -1.85) { ball.position.z = -1.85; ballDirZ *= -1; bottomBorderFlashTime = 1.0; }

    let paddleHit = false;
    const paddleMargin = 0.2;
    const paddleLengthMargin = 0.1;

    if (!onlineMode && (
      ball.position.x < paddle1.position.x + paddleWidth / 2 + paddleMargin &&
      ball.position.x > paddle1.position.x - paddleMargin &&
      Math.abs(ball.position.z - paddle1.position.z) < paddleDepth / 2 + paddleLengthMargin
    )) {
      ball.position.x = paddle1.position.x + paddleWidth / 2 + paddleMargin;
      BALLSPEEDX += 0.01; BALLSPEEDZ += 0.01;
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle1FlashTime = 1.0;
      if (!userControlling) paddle1ToCorner = -paddleZClamp;
    }

    if (!onlineMode && (
      ball.position.x > paddle2.position.x - paddleWidth / 2 - paddleMargin &&
      ball.position.x < paddle2.position.x + paddleMargin &&
      Math.abs(ball.position.z - paddle2.position.z) < paddleDepth / 2 + paddleLengthMargin
    )) {
      ball.position.x = paddle2.position.x - paddleWidth / 2 - paddleMargin;
      BALLSPEEDX += 0.01; BALLSPEEDZ += 0.01;
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = -Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle2FlashTime = 1.0;
      paddle2ToCorner = paddleZClamp;
    }

    const leftOut = !onlineMode && ball.position.x < -3.85 && !(
      ball.position.x > paddle1.position.x - paddleMargin &&
      ball.position.x < paddle1.position.x + paddleWidth / 2 + paddleMargin &&
      Math.abs(ball.position.z - paddle1.position.z) < paddleDepth / 2 + paddleLengthMargin
    );
    const rightOut = !onlineMode && ball.position.x > 3.85 && !(
      ball.position.x > paddle2.position.x - paddleWidth / 2 - paddleMargin &&
      ball.position.x < paddle2.position.x + paddleMargin &&
      Math.abs(ball.position.z - paddle2.position.z) < paddleDepth / 2 + paddleLengthMargin
    );
    if (!onlineMode && !paddleHit && (leftOut || rightOut)) {
      if (leftOut) leftBorderFlashTime = 2.0; else rightBorderFlashTime = 2.0;
      currentBallColorIndex = (currentBallColorIndex + 1) % COLORS.BALL_COLORS.length;
      ball.position.x = 0; ball.position.z = 0;
      BALLSPEEDX = BALLSPEEDXDEFAULT; BALLSPEEDZ = BALLSPEEDZDEFAULT;
      ballDirX = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDX;
      ballDirZ = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDZ;
      ballMat.diffuseColor = new BABYLON.Color3(
        COLORS.BALL_COLORS[currentBallColorIndex].r,
        COLORS.BALL_COLORS[currentBallColorIndex].g,
        COLORS.BALL_COLORS[currentBallColorIndex].b
      );
      ballMat.emissiveColor = new BABYLON.Color3(
        COLORS.BALL_COLORS[currentBallColorIndex].r,
        COLORS.BALL_COLORS[currentBallColorIndex].g,
        COLORS.BALL_COLORS[currentBallColorIndex].b
      );
      return scene.render();
    }

    scene.render();
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // Online mode wiring
  try {
    const room = appState.getCurrentRoom();
    if (wsManager.isConnected() && room) {
      onlineMode = true;
      currentRoomId = room.roomId;
    }
    gameService.onStateUpdate((payload: any) => {
      const state = payload.state;
      if (!state) return;

      const playerIds = Object.keys(state.paddles || {}).map((id) => parseInt(id)).sort();
      if (playerIds.length >= 2) {
        const leftId = playerIds[0];
        const rightId = playerIds[1];
        const leftPad = state.paddles[leftId];
        const rightPad = state.paddles[rightId];
        if (leftPad) {
          const targetZ = toBabylonZ(leftPad.y);
          paddle1.position.z += (targetZ - paddle1.position.z) * lerpFactor;
        }
        if (rightPad) {
          const targetZ = toBabylonZ(rightPad.y);
          paddle2.position.z += (targetZ - paddle2.position.z) * lerpFactor;
        }
      }
      if (state.ball) {
        const targetX = toBabylonX(state.ball.x);
        const targetZ = toBabylonZ(state.ball.y);
        ball.position.x += (targetX - ball.position.x) * lerpFactor;
        ball.position.z += (targetZ - ball.position.z) * lerpFactor;
      }
      onlineMode = true;
    });
  } catch (e) {
    console.warn('Online mode not initialized:', e);
  }
}
