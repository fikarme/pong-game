import './crtShader.js';

const PADSPEED = 0.09;
const BALLSPEEDXDEFAULT = 0.09;
const BALLSPEEDZDEFAULT = 0.07;

function startTypingEffect() {
  const typingElement = document.querySelector('.typing-text') as HTMLElement;
  if (!typingElement) return;

  const text = 'PONG';
  typingElement.textContent = '';
  let i = 0;

  function typeChar() {
    if (i < text.length && typingElement) {
      typingElement.textContent += text[i];
      i++;
      setTimeout(typeChar, 250);
    }
  }

  setTimeout(typeChar, 500);
}

export function init() {
  console.log('Landing page loaded');

  startTypingEffect();

  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    return;
  }

  let canvas = document.getElementById('babylon-canvas');
  let realCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement)
    realCanvas = canvas;
  else {
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
    if (appDiv) {
      appDiv.appendChild(createdCanvas);
    } else {
      document.body.appendChild(createdCanvas);
    }

    realCanvas = createdCanvas;
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
  }

  (window as any).closeBabylonGame = function() {
    try {
      engine.stopRenderLoop();
      engine.dispose();
    } catch (e) {}
    if (realCanvas && realCanvas.parentNode)
      realCanvas.parentNode.removeChild(realCanvas);
  };

  const engine = new BABYLON.Engine(realCanvas, true);
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

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
  BABYLON.Effect.ShadersStore["crtFragmentShader"] = crtFragmentShader;

  const crtPostProcess = new BABYLON.PostProcess(
    "CRTShaderPostProcess", "crt", ["curvature", "screenResolution", "scanLineOpacity", "vignetteOpacity", "brightness", "vignetteRoundness"],
    null,
    1.0,
    camera
  );
  crtPostProcess.onApply = function (effect: any) {
    effect.setFloat2("curvature", 2.5, 2.5);
    effect.setFloat2("screenResolution", realCanvas.width, realCanvas.height);
    effect.setFloat2("scanLineOpacity", 1, 1);
    effect.setFloat("vignetteOpacity", 1);
    effect.setFloat("brightness", 1.2);
    effect.setFloat("vignetteRoundness", 1.5);
  };

  const glowLayer = new BABYLON.GlowLayer("glow", scene);
  glowLayer.intensity = 1.5;
  glowLayer.blurKernelSize = 64;

  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

  function createGlowMaterial(name: string, color: any) {
    const material = new BABYLON.StandardMaterial(name, scene);
    material.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    material.emissiveColor = color;
    material.specularColor = BABYLON.Color3.Black();
    return material;
  }

  let startTime = Date.now();
  const table = BABYLON.MeshBuilder.CreateBox('table', { width: 8, height: 0.1, depth: 4 }, scene);
  const tableMat = new BABYLON.StandardMaterial('tableMat', scene);
  tableMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  tableMat.emissiveColor = new BABYLON.Color3(0.08, 0.08, 0.08);
  tableMat.specularColor = new BABYLON.Color3(0,0,0);
  table.material = tableMat;
  table.position.y = -0.05;

  const borderThickness = 0.12;
  const leftBorder = BABYLON.MeshBuilder.CreateBox('leftBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  leftBorder.position.x = -4 + borderThickness/2;
  leftBorder.position.y = 0.01;
  const leftMat = new BABYLON.StandardMaterial('leftMat', scene);
  leftMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  leftMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  leftMat.specularColor = new BABYLON.Color3(1, 1, 1);
  leftMat.alpha = 0.6;
  leftBorder.material = leftMat;
  glowLayer.addIncludedOnlyMesh(leftBorder);

  const rightBorder = BABYLON.MeshBuilder.CreateBox('rightBorder', { width: borderThickness, height: 0.13, depth: 4.1 }, scene);
  rightBorder.position.x = 4 - borderThickness/2;
  rightBorder.position.y = 0.01;
  const rightMat = new BABYLON.StandardMaterial('rightMat', scene);
  rightMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  rightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  rightMat.specularColor = new BABYLON.Color3(1, 1, 1);
  rightMat.alpha = 0.6;
  rightBorder.material = rightMat;
  glowLayer.addIncludedOnlyMesh(rightBorder);
  const topBorder = BABYLON.MeshBuilder.CreateBox('topBorder', { width: 8, height: 0.13, depth: borderThickness }, scene);
  topBorder.position.z = 2 - borderThickness/2;
  topBorder.position.y = 0.01;
  const topMat = new BABYLON.StandardMaterial('topMat', scene);
  topMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  topMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  topMat.alpha = 0.6;
  topMat.specularColor = new BABYLON.Color3(1, 1, 1);
  topBorder.material = topMat;
  glowLayer.addIncludedOnlyMesh(topBorder);

  const bottomBorder = BABYLON.MeshBuilder.CreateBox('bottomBorder', { width: 8, height: 0.13, depth: borderThickness }, scene);
  bottomBorder.position.z = -2 + borderThickness/2;
  bottomBorder.position.y = 0.01;
  const bottomMat = new BABYLON.StandardMaterial('bottomMat', scene);
  bottomMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  bottomMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
  bottomMat.alpha = 0.6;
  bottomMat.specularColor = new BABYLON.Color3(1, 1, 1);
  bottomBorder.material = bottomMat;
  glowLayer.addIncludedOnlyMesh(bottomBorder);

  const paddleWidth = 0.3, paddleHeight = 0.5, paddleDepth = 0.9;
  const paddle1 = BABYLON.MeshBuilder.CreateBox('paddle1', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle2 = BABYLON.MeshBuilder.CreateBox('paddle2', { width: paddleWidth, height: paddleHeight, depth: paddleDepth }, scene);
  const paddle1Mat = new BABYLON.StandardMaterial('paddle1Mat', scene);
  paddle1Mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  paddle1Mat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08);
  paddle1Mat.specularColor = new BABYLON.Color3(0, 0, 0);
  paddle1Mat.alpha = 0.7;
  paddle1.material = paddle1Mat;
  const paddle2Mat = new BABYLON.StandardMaterial('paddle2Mat', scene);
  paddle2Mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
  paddle2Mat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08);
  paddle2Mat.specularColor = new BABYLON.Color3(0, 0, 0);
  paddle2Mat.alpha = 0.7;
  paddle2.material = paddle2Mat;
  glowLayer.addIncludedOnlyMesh(paddle1);
  glowLayer.addIncludedOnlyMesh(paddle2);
  paddle1.position.x = -3.6;
  paddle2.position.x = 3.6;
  paddle1.position.y = paddle2.position.y = paddleHeight/2 + 0.02;

  const leftBorderLight = new BABYLON.PointLight("leftBorderLight", new BABYLON.Vector3(-3.8, 0.5, 0), scene);
  leftBorderLight.diffuse = new BABYLON.Color3(1, 1, 1);
  leftBorderLight.intensity = 0.8;
  leftBorderLight.range = 3.0;

  const rightBorderLight = new BABYLON.PointLight("rightBorderLight", new BABYLON.Vector3(3.8, 0.5, 0), scene);
  rightBorderLight.diffuse = new BABYLON.Color3(1, 1, 1);
  rightBorderLight.intensity = 0.8;
  rightBorderLight.range = 3.0;

  const paddle1Light = new BABYLON.PointLight("paddle1Light", new BABYLON.Vector3(-3.6, 0.5, 0), scene);
  paddle1Light.diffuse = new BABYLON.Color3(0.22, 1, 0.08);
  paddle1Light.intensity = 1.2;
  paddle1Light.range = 2.5;

  const paddle2Light = new BABYLON.PointLight("paddle2Light", new BABYLON.Vector3(3.6, 0.5, 0), scene);
  paddle2Light.diffuse = new BABYLON.Color3(0.22, 1, 0.08);
  paddle2Light.intensity = 1.2;
  paddle2Light.range = 2.5;

  const ball = BABYLON.MeshBuilder.CreateSphere('pongBall', { diameter: 0.3 }, scene);
  const ballMat = new BABYLON.StandardMaterial('ballMat', scene);
  ballMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
  ballMat.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.9);
  ball.material = ballMat;
  ball.position.y = paddleHeight/2;
  glowLayer.addIncludedOnlyMesh(ball);

  function randomColor3() {
    return new BABYLON.Color3(Math.random(), Math.random(), Math.random());
  }

  let BALLSPEEDX = BALLSPEEDXDEFAULT;
  let BALLSPEEDZ = BALLSPEEDZDEFAULT;
  let ballDirX = BALLSPEEDX, ballDirZ = BALLSPEEDZ;
  let paddle1ToCorner: number | null = null;
  let paddle2ToCorner: number | null = null;

  const keys = {
    up: false,
    down: false
  };

  let userControlling = false;

  window.addEventListener('keydown', (event) => {
    switch(event.code) {
      case 'ArrowUp':
        keys.up = true;
        userControlling = true;
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = true;
        userControlling = true;
        event.preventDefault();
        break;
      case 'KeyG':
        (window as any).closeBabylonGame && (window as any).closeBabylonGame();
        (window as any).router && (window as any).router.navigate('login');
        event.preventDefault();
        break;
    }
  });

  window.addEventListener('keyup', (event) => {
    switch(event.code) {
      case 'ArrowUp':
        keys.up = false;
        event.preventDefault();
        break;
      case 'ArrowDown':
        keys.down = false;
        event.preventDefault();
        break;
    }
  });

  engine.runRenderLoop(() => {
    const currentTime = (Date.now() - startTime) / 1000.0;

    if (leftMat && leftMat.emissiveColor) {
      leftMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    }
    if (rightMat && rightMat.emissiveColor) {
      rightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    }
    if (paddle1Mat && paddle1Mat.emissiveColor) {
      paddle1Mat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08);
    }
    if (paddle2Mat && paddle2Mat.emissiveColor) {
      paddle2Mat.emissiveColor = new BABYLON.Color3(0.22, 1, 0.08);
    }

    leftBorderLight.intensity = 0.8;
    rightBorderLight.intensity = 0.8;
    paddle1Light.intensity = 1.2;
    paddle2Light.intensity = 1.2;

    paddle1Light.position.z = paddle1.position.z;
    paddle2Light.position.z = paddle2.position.z;

    if (!userControlling && paddle1ToCorner !== null) {
      const dz = paddle1ToCorner - paddle1.position.z;
      if (Math.abs(dz) < 0.1) {
        paddle1.position.z = paddle1ToCorner;
        paddle1ToCorner = null;
      } else
        paddle1.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else if (userControlling) {
      if (keys.up) {
        paddle1.position.z -= PADSPEED;
      }
      if (keys.down) {
        paddle1.position.z += PADSPEED;
      }
    } else {
      paddle1.position.z += Math.sign(ball.position.z - paddle1.position.z) * PADSPEED;
    }

    if (paddle2ToCorner !== null) {
      const dz = paddle2ToCorner - paddle2.position.z;
      if (Math.abs(dz) < 0.1) {
        paddle2.position.z = paddle2ToCorner;
        paddle2ToCorner = null;
      } else
        paddle2.position.z += Math.sign(dz) * PADSPEED * 1.2;
    } else
      paddle2.position.z += Math.sign(ball.position.z - paddle2.position.z) * PADSPEED;

    paddle1.position.z = Math.max(Math.min(paddle1.position.z, 1.5), -1.5);
    paddle2.position.z = Math.max(Math.min(paddle2.position.z, 1.5), -1.5);

    ball.position.x += ballDirX;
    ball.position.z += ballDirZ;

    if (ball.position.z > 1.85) {
      ball.position.z = 1.85;
      ballDirZ *= -1;
    }
    if (ball.position.z < -1.85) {
      ball.position.z = -1.85;
      ballDirZ *= -1;
    }

    let paddleHit = false;
    const paddleMargin = 0.28;
    const paddleLengthMargin = 0.5;

    if (ball.position.x < paddle1.position.x + paddleWidth/2 + paddleMargin &&
        ball.position.x > paddle1.position.x - paddleMargin &&
        Math.abs(ball.position.z - paddle1.position.z) < paddleDepth/2 + paddleLengthMargin
    ) {
      ball.position.x = paddle1.position.x + paddleWidth/2 + paddleMargin;
      BALLSPEEDX += 0.01;
      BALLSPEEDZ += 0.01;
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      if (!userControlling) {
        paddle1ToCorner = -1.5;
      }
    }

    if (ball.position.x > paddle2.position.x - paddleWidth/2 - paddleMargin &&
        ball.position.x < paddle2.position.x + paddleMargin &&
        Math.abs(ball.position.z - paddle2.position.z) < paddleDepth/2 + paddleLengthMargin
    ) {
      ball.position.x = paddle2.position.x - paddleWidth/2 - paddleMargin;
      BALLSPEEDX += 0.01;
      BALLSPEEDZ += 0.01;
      const norm = Math.sqrt(ballDirX * ballDirX + ballDirZ * ballDirZ);
      ballDirX = -Math.abs(ballDirX / norm) * BALLSPEEDX;
      ballDirZ = (ballDirZ / Math.abs(ballDirZ)) * Math.abs(ballDirZ / norm) * BALLSPEEDZ;
      paddleHit = true;
      paddle2ToCorner = 1.5;
    }

    const leftOut = ball.position.x < -3.85 && !(ball.position.x > paddle1.position.x - paddleMargin && ball.position.x < paddle1.position.x + paddleWidth/2 + paddleMargin && Math.abs(ball.position.z - paddle1.position.z) < paddleDepth/2 + paddleLengthMargin);
    const rightOut = ball.position.x > 3.85 && !(ball.position.x > paddle2.position.x - paddleWidth/2 - paddleMargin && ball.position.x < paddle2.position.x + paddleMargin && Math.abs(ball.position.z - paddle2.position.z) < paddleDepth/2 + paddleLengthMargin);
    if (!paddleHit && (leftOut || rightOut)) {
      const borderX = ball.position.x < 0 ? -3.85 : 3.85;
      const particleSystem = new BABYLON.ParticleSystem("borderHit", 80, scene);
      particleSystem.particleTexture = new BABYLON.Texture("https://playground.babylonjs.com/textures/flare.png", scene);
      particleSystem.emitter = new BABYLON.Vector3(borderX, ball.position.y, ball.position.z);
      particleSystem.minEmitBox = new BABYLON.Vector3(-0.1, -0.1, -0.2);
      particleSystem.maxEmitBox = new BABYLON.Vector3(0.1, 0.1, 0.2);
      particleSystem.color1 = borderX < 0 ? new BABYLON.Color4(1, 0.2, 0.2, 1) : new BABYLON.Color4(0.2, 0.6, 1, 1);
      particleSystem.color2 = borderX < 0 ? new BABYLON.Color4(1, 0.5, 0.5, 1) : new BABYLON.Color4(0.5, 0.8, 1, 1);
      particleSystem.minSize = 0.1;
      particleSystem.maxSize = 0.3;
      particleSystem.minLifeTime = 0.3;
      particleSystem.maxLifeTime = 0.6;
      particleSystem.emitRate = 120;
      particleSystem.direction1 = new BABYLON.Vector3(borderX < 0 ? 1 : -1, 0.3, 0.3);
      particleSystem.direction2 = new BABYLON.Vector3(borderX < 0 ? 1 : -1, -0.3, -0.3);
      particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0);
      particleSystem.targetStopDuration = 0.4;
      particleSystem.start();

      const flash = new BABYLON.PointLight("borderFlash", new BABYLON.Vector3(borderX, 1, ball.position.z), scene);
      flash.diffuse = borderX < 0 ? new BABYLON.Color3(1, 0.2, 0.2) : new BABYLON.Color3(0.2, 0.6, 1);
      flash.intensity = 5.0;
      flash.range = 5.0;
      setTimeout(() => { flash.dispose(); }, 500);

      ball.position.x = 0;
      ball.position.z = 0;
      BALLSPEEDX = BALLSPEEDXDEFAULT;
      BALLSPEEDZ = BALLSPEEDZDEFAULT;
      ballDirX = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDX;
      ballDirZ = (Math.random() > 0.5 ? 1 : -1) * BALLSPEEDZ;
      ball.material.diffuseColor = randomColor3();
      ballMat.emissiveColor = ball.material.diffuseColor;
      return scene.render();
    }

    scene.render();
  });

  window.addEventListener('resize', () => {
    resizeCanvas();
  });
}
