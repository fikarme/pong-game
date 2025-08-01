export function init() {
  console.log('Home page loaded');

  // Use Babylon.js from window (CDN loaded in index.html)
  const BABYLON = (window as any).BABYLON;
  if (!BABYLON) {
    console.error('BABYLON is not loaded. Please include Babylon.js via CDN in your index.html.');
    return;
  }

  // Create a canvas for Babylon.js
  let canvas = document.getElementById('babylon-canvas');
  let realCanvas: HTMLCanvasElement;
  if (canvas instanceof HTMLCanvasElement) {
    realCanvas = canvas;
  } else {
    const createdCanvas = document.createElement('canvas');
    createdCanvas.id = 'babylon-canvas';
    createdCanvas.style.width = '320px';
    createdCanvas.style.height = '240px';
    createdCanvas.style.display = 'block';
    createdCanvas.style.margin = '0 auto';
    const container = document.getElementById('babylon-canvas-container');
    if (container) {
      container.appendChild(createdCanvas);
    } else {
      // fallback for SSR or if container not found
      (document.getElementById('app') || document.body).appendChild(createdCanvas);
    }
    realCanvas = createdCanvas;
  }

  // Babylon.js engine and scene
  const engine = new BABYLON.Engine(realCanvas, true);
  const scene = new BABYLON.Scene(engine);

  // Camera
  const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 2, Math.PI / 2.5, 6, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(realCanvas, true);

  // Light
  const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

  // Ball (sphere)
  const ball = BABYLON.MeshBuilder.CreateSphere('ball', { diameter: 2 }, scene);
  const mat = new BABYLON.StandardMaterial('mat', scene);
  mat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
  ball.material = mat;

  // Animation loop
  engine.runRenderLoop(() => {
    ball.rotation.y += 0.03;
    scene.render();
  });

  // Resize
  window.addEventListener('resize', () => {
    engine.resize();
  });
}
