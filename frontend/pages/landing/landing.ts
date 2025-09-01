import './crtShader.js';
import { WebSocketManager } from '../../core/WebSocketManager.js';
import { GameService } from '../../services/GameService.js';
import { AppState } from '../../core/AppState.js';

// Speeds are units per second (time-based)
const PADSPEED = 1.8;
const BALLSPEEDXDEFAULT = 1.8;
const BALLSPEEDZDEFAULT = 1.4;

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

enum ControlState { Idle = 'Idle', Human = 'Human', AI = 'AI' }

type GameController = {
  start: () => void;
  stop: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const nowMs = () => Date.now();

function startTypingEffect() {
  const typingElement = document.querySelector('.typing-text') as HTMLElement | null;
  if (!typingElement) return;
  const text = 'PONG';
  typingElement.textContent = '';
  let i = 0;
  const typeChar = () => {
    if (i < text.length && typingElement) {
      typingElement.textContent += text[i++];
      setTimeout(typeChar, 250);
    }
  };
  setTimeout(typeChar, 500);
}

// --- Builders ---
function buildEngineAndScene(BABYLON: any) {
  let canvas = document.getElementById('babylon-canvas');
  let createdCanvas = false;
  let realCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement) {
    realCanvas = canvas;
  } else {
    const created = document.createElement('canvas');
    created.id = 'babylon-canvas';
    created.style.position = 'fixed';
    created.style.top = '0';
    created.style.left = '0';
    created.style.width = '100vw';
    created.style.height = '100vh';
    created.style.zIndex = '-1';
    created.style.pointerEvents = 'none';
    created.style.display = 'block';
    created.style.background = 'black';
    const appDiv = document.getElementById('app');
    (appDiv || document.body).appendChild(created);
    realCanvas = created;
    createdCanvas = true;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
  }

  const engine = new BABYLON.Engine(realCanvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 0.5);

  const resizeCanvas = () => {
    realCanvas.width = window.innerWidth;
    realCanvas.height = window.innerHeight;
    realCanvas.style.width = '100vw';
    realCanvas.style.height = '100vh';
    engine.resize();
  };
  resizeCanvas();

  const onResize = () => resizeCanvas();
  window.addEventListener('resize', onResize);

  const disposeCanvas = () => {
    window.removeEventListener('resize', onResize);
    if (createdCanvas && realCanvas.parentNode) realCanvas.parentNode.removeChild(realCanvas);
  };

  return { engine, scene, canvas: realCanvas, disposeCanvas };
}

function buildCameraAndPostFX(BABYLON: any, scene: any, canvas: HTMLCanvasElement) {
  const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, 0, 8, BABYLON.Vector3.Zero(), scene);
  camera.setPosition(new BABYLON.Vector3(0, 6, 0));
  camera.setTarget(BABYLON.Vector3.Zero());

  const crtFragmentShader = (window as any).crtFragmentShader;
  BABYLON.Effect.ShadersStore['crtFragmentShader'] = crtFragmentShader;

  const crtPostProcess = new BABYLON.PostProcess(
    'CRTShaderPostProcess', 'crt', ['curvature', 'screenResolution', 'scanLineOpacity', 'vignetteOpacity', 'brightness', 'vignetteRoundness'],
    null, 1.0, camera
  );
  crtPostProcess.onApply = (effect: any) => {
    effect.setFloat2('curvature', 2.5, 2.5);
    effect.setFloat2('screenResolution', canvas.width, canvas.height);
    effect.setFloat2('scanLineOpacity', 1, 1);
    effect.setFloat('vignetteOpacity', 1);
    effect.setFloat('brightness', 1.2);
    effect.setFloat('vignetteRoundness', 1.5);
  };

  const glowLayer = new BABYLON.GlowLayer('glow', scene);
  glowLayer.intensity = 1.5;
  glowLayer.blurKernelSize = 64;
  return { camera, crtPostProcess, glowLayer };
}

function buildTableAndBorders(BABYLON: any, scene: any, glowLayer: any) {
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

  return { table, borderThickness, leftBorder, rightBorder, topBorder, bottomBorder, leftMat, rightMat, topMat, bottomMat };
}

function buildPaddlesAndLights(BABYLON: any, scene: any, glowLayer: any, borderThickness: number) {
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

  // Clamp computation
  const fieldHalfDepth = 2;
  const borderHalf = borderThickness / 2;
  const safetyGap = 0.02;
  const paddleHalfDepth = paddleDepth / 2;
  const paddleZClamp = fieldHalfDepth - borderHalf - paddleHalfDepth - safetyGap;

  // Lights
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

  return { paddleWidth, paddleHeight, paddleDepth, paddleZClamp, paddle1, paddle2, paddle1Mat, paddle2Mat, leftBorderLight, rightBorderLight, paddle1Light, paddle2Light };
}

function buildBall(BABYLON: any, scene: any, glowLayer: any) {
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
  ball.position.y = 0.3 / 2;
  glowLayer.addIncludedOnlyMesh(ball);
  return { ball, ballMat };
}

function buildInput() {
  const keys = { up: false, down: false };
  let state: ControlState = ControlState.Idle;
  let uiFaded = false;
  const fadeOutLandingUIOnce = () => {
    if (uiFaded) return;
    uiFaded = true;
    const ui = document.getElementById('landing-ui');
    if (ui) ui.classList.add('fade-out');
  };
  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
        keys.up = true;
        if (state !== ControlState.Human) { state = ControlState.Human; fadeOutLandingUIOnce(); }
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = true;
        if (state !== ControlState.Human) { state = ControlState.Human; fadeOutLandingUIOnce(); }
        event.preventDefault();
        break;
      case 'KeyG':
        (window as any).closeBabylonGame && (window as any).closeBabylonGame();
        (window as any).router && (window as any).router.navigate('login');
        event.preventDefault();
        break;
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
        keys.up = false;
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = false;
        event.preventDefault();
        break;
    }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  return { keys, getState: () => state, setState: (s: ControlState) => { state = s; }, detach: () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }};
}

export function init(): GameController | void {
  console.log('Landing page loaded');
  startTypingEffect();

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    return;
  }

  const { engine, scene, canvas, disposeCanvas } = buildEngineAndScene(BABYLON);
  const { camera, glowLayer } = buildCameraAndPostFX(BABYLON, scene, canvas);
  const borders = buildTableAndBorders(BABYLON, scene, glowLayer);
  const paddles = buildPaddlesAndLights(BABYLON, scene, glowLayer, borders.borderThickness);
  const { ball, ballMat } = buildBall(BABYLON, scene, glowLayer);
  const input = buildInput();

  // State
  let BALLSPEEDX = BALLSPEEDXDEFAULT;
  let BALLSPEEDZ = BALLSPEEDZDEFAULT;
  let ballDirX = BALLSPEEDX, ballDirZ = BALLSPEEDZ;
  let paddle1ToCorner: number | null = null;
  let paddle2ToCorner: number | null = null;
  let onlineMode = false;
  let currentRoomId: string | null = null;
  let lastServerUpdateAt = 0;
  let lerpFactor = 0.2; // adaptive

  // Mapping
  const toBabylonX = (serverX: number) => (serverX / 800) * 7.2 - 3.6; // [-3.6, 3.6]
  const toBabylonZ = (serverY: number) => ((serverY / 400) * (2 * paddles.paddleZClamp)) - paddles.paddleZClamp; // [-clamp, clamp]
  const toServerY = (z: number) => ((z + paddles.paddleZClamp) / (2 * paddles.paddleZClamp)) * 400; // [0..400]

  // Flash timers
  let leftBorderFlashTime = 0;
  let rightBorderFlashTime = 0;
  let paddle1FlashTime = 0;
  let paddle2FlashTime = 0;

  // WS wiring
  const wsManager = WebSocketManager.getInstance();
  const gameService = new GameService();
  const appState = AppState.getInstance();

  // Reduce allocations: reuse material and light color objects
  const setMatEmissive = (mat: any, r: number, g: number, b: number) => {
    mat.emissiveColor.r = r; mat.emissiveColor.g = g; mat.emissiveColor.b = b;
  };
  const setLightDiffuse = (light: any, r: number, g: number, b: number) => {
    light.diffuse.r = r; light.diffuse.g = g; light.diffuse.b = b;
  };

  // Move throttling
  let lastMoveSentAt = 0;
  let lastSentY: number | null = null;
  const MOVE_MIN_INTERVAL = 50; // ms
  const maybeSendMove = (desiredY: number) => {
    const now = nowMs();
    const clampedY = clamp(desiredY, 0, 400);
    if (!onlineMode || !currentRoomId) return;
    if (now - lastMoveSentAt < MOVE_MIN_INTERVAL) return;
    if (lastSentY !== null && Math.abs(clampedY - lastSentY) < 0.5) return;
    gameService.movePlayer(currentRoomId, clampedY);
    lastMoveSentAt = now;
    lastSentY = clampedY;
  };

  // Disable auto redirect so the match can render here
  wsManager.setAutoRedirectEnabled(false);
  const room = appState.getCurrentRoom();
  if (wsManager.isConnected() && room) {
    onlineMode = true;
    currentRoomId = room.roomId;
  }

  // Adaptive interpolation based on update cadence
  const onStateUpdate = (payload: any) => {
    const state = payload?.state;
    if (!state) return;
    const now = nowMs();
    const dtMs = lastServerUpdateAt ? now - lastServerUpdateAt : 100;
    lastServerUpdateAt = now;
    // Map 30..200ms -> 0.08..0.3
    const t = clamp((dtMs - 30) / (200 - 30), 0, 1);
    lerpFactor = 0.08 + (0.3 - 0.08) * t;

    // Derive left/right paddles deterministically by id order
    const ids = Object.keys(state.paddles || {}).map((id) => parseInt(id, 10)).sort((a, b) => a - b);
    if (ids.length >= 2) {
      const leftPad = state.paddles[ids[0]];
      const rightPad = state.paddles[ids[1]];
      if (leftPad) {
        const targetZ = toBabylonZ(leftPad.y);
        paddles.paddle1.position.z += (targetZ - paddles.paddle1.position.z) * lerpFactor;
      }
      if (rightPad) {
        const targetZ = toBabylonZ(rightPad.y);
        paddles.paddle2.position.z += (targetZ - paddles.paddle2.position.z) * lerpFactor;
      }
    }
    if (state.ball) {
      const targetX = toBabylonX(state.ball.x);
      const targetZ = toBabylonZ(state.ball.y);
      ball.position.x += (targetX - ball.position.x) * lerpFactor;
      ball.position.z += (targetZ - ball.position.z) * lerpFactor;
    }
    onlineMode = true;
  };
  wsManager.on('state-update', onStateUpdate);

  // Update logic via onBeforeRenderObservable
  let logicObserver = scene.onBeforeRenderObservable.add(() => {
    const deltaTime = engine.getDeltaTime() / 1000; // seconds

    // Flash animations (no allocations)
    if (leftBorderFlashTime > 0) {
      leftBorderFlashTime = Math.max(0, leftBorderFlashTime - deltaTime);
      const k = leftBorderFlashTime / 2.0;
      const r = COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * k;
      const g = COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * k;
      const b = COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * k;
      setMatEmissive(borders.leftMat, r, g, b);
      paddles.leftBorderLight.intensity = 0.8 + 3.0 * k;
      setLightDiffuse(paddles.leftBorderLight, r, g, b);
    } else {
      setMatEmissive(borders.leftMat, COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      paddles.leftBorderLight.intensity = 0.8;
    }
    if (rightBorderFlashTime > 0) {
      rightBorderFlashTime = Math.max(0, rightBorderFlashTime - deltaTime);
      const k = rightBorderFlashTime / 2.0;
      const r = COLORS.BORDER.r + (COLORS.BORDER_FLASH.r - COLORS.BORDER.r) * k;
      const g = COLORS.BORDER.g + (COLORS.BORDER_FLASH.g - COLORS.BORDER.g) * k;
      const b = COLORS.BORDER.b + (COLORS.BORDER_FLASH.b - COLORS.BORDER.b) * k;
      setMatEmissive(borders.rightMat, r, g, b);
      paddles.rightBorderLight.intensity = 0.8 + 3.0 * k;
      setLightDiffuse(paddles.rightBorderLight, r, g, b);
    } else {
      setMatEmissive(borders.rightMat, COLORS.BORDER.r, COLORS.BORDER.g, COLORS.BORDER.b);
      paddles.rightBorderLight.intensity = 0.8;
    }

    if (paddle1FlashTime > 0) {
      paddle1FlashTime = Math.max(0, paddle1FlashTime - deltaTime);
      const k = paddle1FlashTime / 1.0;
      const r = COLORS.LEFT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.LEFT_PADDLE.r) * k;
      const g = COLORS.LEFT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.LEFT_PADDLE.g) * k;
      const b = COLORS.LEFT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.LEFT_PADDLE.b) * k;
      setMatEmissive(paddles.paddle1Mat, r, g, b);
      paddles.paddle1Light.intensity = 1.2 + 2.0 * k;
      setLightDiffuse(paddles.paddle1Light, r, g, b);
    } else {
      setMatEmissive(paddles.paddle1Mat, COLORS.LEFT_PADDLE.r, COLORS.LEFT_PADDLE.g, COLORS.LEFT_PADDLE.b);
      paddles.paddle1Light.intensity = 1.2;
    }
    if (paddle2FlashTime > 0) {
      paddle2FlashTime = Math.max(0, paddle2FlashTime - deltaTime);
      const k = paddle2FlashTime / 1.0;
      const r = COLORS.RIGHT_PADDLE.r + (COLORS.PADDLE_FLASH.r - COLORS.RIGHT_PADDLE.r) * k;
      const g = COLORS.RIGHT_PADDLE.g + (COLORS.PADDLE_FLASH.g - COLORS.RIGHT_PADDLE.g) * k;
      const b = COLORS.RIGHT_PADDLE.b + (COLORS.PADDLE_FLASH.b - COLORS.RIGHT_PADDLE.b) * k;
      setMatEmissive(paddles.paddle2Mat, r, g, b);
      paddles.paddle2Light.intensity = 1.2 + 2.0 * k;
      setLightDiffuse(paddles.paddle2Light, r, g, b);
    } else {
      setMatEmissive(paddles.paddle2Mat, COLORS.RIGHT_PADDLE.r, COLORS.RIGHT_PADDLE.g, COLORS.RIGHT_PADDLE.b);
      paddles.paddle2Light.intensity = 1.2;
    }

    paddles.paddle1Light.position.z = paddles.paddle1.position.z;
    paddles.paddle2Light.position.z = paddles.paddle2.position.z;

    // Control state machine
    const state = input.getState();
    if (!onlineMode) {
      if (state === ControlState.Idle && paddle1ToCorner !== null) {
        const dz = paddle1ToCorner - paddles.paddle1.position.z;
        const step = Math.sign(dz) * PADSPEED * 1.2 * deltaTime;
        if (Math.abs(dz) < Math.abs(step)) {
          paddles.paddle1.position.z = paddle1ToCorner;
          paddle1ToCorner = null;
        } else {
          paddles.paddle1.position.z += step;
        }
      } else if (state === ControlState.Human) {
        if (input.keys.up) paddles.paddle1.position.z -= PADSPEED * deltaTime;
        if (input.keys.down) paddles.paddle1.position.z += PADSPEED * deltaTime;
      } else if (state === ControlState.AI) {
        const dz = ball.position.z - paddles.paddle1.position.z;
        paddles.paddle1.position.z += Math.sign(dz) * PADSPEED * deltaTime;
      }

      if (paddle2ToCorner !== null) {
        const dz = paddle2ToCorner - paddles.paddle2.position.z;
        const step = Math.sign(dz) * PADSPEED * 1.2 * deltaTime;
        if (Math.abs(dz) < Math.abs(step)) {
          paddles.paddle2.position.z = paddle2ToCorner;
          paddle2ToCorner = null;
        } else {
          paddles.paddle2.position.z += step;
        }
      } else {
        const dz = ball.position.z - paddles.paddle2.position.z;
        paddles.paddle2.position.z += Math.sign(dz) * PADSPEED * deltaTime;
      }
    }

    // Clamp paddles
    paddles.paddle1.position.z = clamp(paddles.paddle1.position.z, -paddles.paddleZClamp, paddles.paddleZClamp);
    paddles.paddle2.position.z = clamp(paddles.paddle2.position.z, -paddles.paddleZClamp, paddles.paddleZClamp);

    // Ball offline sim
    if (!onlineMode) {
      ball.position.x += ballDirX * deltaTime;
      ball.position.z += ballDirZ * deltaTime;
    }

    if (!onlineMode && ball.position.z > 1.85) {
      ball.position.z = 1.85;
      ballDirZ *= -1;
      rightBorderFlashTime = 1.0; // top flash (reuse timer)
    }
    if (!onlineMode && ball.position.z < -1.85) {
      ball.position.z = -1.85;
      ballDirZ *= -1;
      leftBorderFlashTime = 1.0; // bottom flash (reuse timer)
    }

    // Paddle collision (offline)
    if (!onlineMode) {
      const marginX = 0.2;
      const lengthMarginZ = 0.1;
      const pW2 = paddles.paddleWidth / 2;
      const pD2 = paddles.paddleDepth / 2;
      let paddleHit = false;

      if (ball.position.x < paddles.paddle1.position.x + pW2 + marginX &&
          ball.position.x > paddles.paddle1.position.x - marginX &&
          Math.abs(ball.position.z - paddles.paddle1.position.z) < pD2 + lengthMarginZ) {
        ball.position.x = paddles.paddle1.position.x + pW2 + marginX;
        BALLSPEEDX += 0.2; BALLSPEEDZ += 0.15;
        const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ) || 1;
        ballDirX = Math.abs(ballDirX / norm) * BALLSPEEDX;
        ballDirZ = Math.sign(ballDirZ || 1) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
        paddle1FlashTime = 1.0;
        if (input.getState() !== ControlState.Human) paddle1ToCorner = -paddles.paddleZClamp;
        paddleHit = true;
      }

      if (ball.position.x > paddles.paddle2.position.x - pW2 - marginX &&
          ball.position.x < paddles.paddle2.position.x + marginX &&
          Math.abs(ball.position.z - paddles.paddle2.position.z) < pD2 + lengthMarginZ) {
        ball.position.x = paddles.paddle2.position.x - pW2 - marginX;
        BALLSPEEDX += 0.2; BALLSPEEDZ += 0.15;
        const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ) || 1;
        ballDirX = -Math.abs(ballDirX / norm) * BALLSPEEDX;
        ballDirZ = Math.sign(ballDirZ || 1) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
        paddle2FlashTime = 1.0;
        paddle2ToCorner = paddles.paddleZClamp;
        paddleHit = true;
      }

      const leftOut = ball.position.x < -3.85 && !(ball.position.x > paddles.paddle1.position.x - marginX && ball.position.x < paddles.paddle1.position.x + pW2 + marginX && Math.abs(ball.position.z - paddles.paddle1.position.z) < pD2 + lengthMarginZ);
      const rightOut = ball.position.x > 3.85 && !(ball.position.x > paddles.paddle2.position.x - pW2 - marginX && ball.position.x < paddles.paddle2.position.x + marginX && Math.abs(ball.position.z - paddles.paddle2.position.z) < pD2 + lengthMarginZ);
      if (!paddleHit && (leftOut || rightOut)) {
        if (leftOut) leftBorderFlashTime = 2.0; else rightBorderFlashTime = 2.0;
        currentBallColorIndex = (currentBallColorIndex + 1) % COLORS.BALL_COLORS.length;
        ball.position.x = 0; ball.position.z = 0;
        BALLSPEEDX = BALLSPEEDXDEFAULT; BALLSPEEDZ = BALLSPEEDZDEFAULT;
        ballDirX = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDX;
        ballDirZ = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDZ;
        // Update ball color without new allocations
        ballMat.diffuseColor.r = COLORS.BALL_COLORS[currentBallColorIndex].r;
        ballMat.diffuseColor.g = COLORS.BALL_COLORS[currentBallColorIndex].g;
        ballMat.diffuseColor.b = COLORS.BALL_COLORS[currentBallColorIndex].b;
        ballMat.emissiveColor.r = COLORS.BALL_COLORS[currentBallColorIndex].r;
        ballMat.emissiveColor.g = COLORS.BALL_COLORS[currentBallColorIndex].g;
        ballMat.emissiveColor.b = COLORS.BALL_COLORS[currentBallColorIndex].b;
      }
    }

    // Online input: send intents (throttled)
    if (onlineMode && input.getState() === ControlState.Human) {
      const desiredZ = paddles.paddle1.position.z + (input.keys.up ? -PADSPEED * deltaTime : 0) + (input.keys.down ? PADSPEED * deltaTime : 0);
      const clampedZ = clamp(desiredZ, -paddles.paddleZClamp, paddles.paddleZClamp);
      const desiredServerY = toServerY(clampedZ); // clamp inside maybeSendMove
      maybeSendMove(desiredServerY);
    }
  });

  // Render loop just renders; logic is in beforeRender
  engine.runRenderLoop(() => scene.render());

  // Controller
  const controller: GameController = {
    start: () => { /* already running */ },
    stop: () => {
      try {
        if (logicObserver) scene.onBeforeRenderObservable.remove(logicObserver);
        engine.stopRenderLoop();
        scene.dispose();
        engine.dispose();
      } catch {}
      disposeCanvas();
      // Cleanup input and WS listeners
      input.detach();
      const ws = WebSocketManager.getInstance();
      ws.off('state-update', onStateUpdate);
      // Restore auto-redirect
      ws.setAutoRedirectEnabled(true);
    }
  };

  (window as any).closeBabylonGame = controller.stop;
  return controller;
}
