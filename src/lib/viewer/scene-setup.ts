// Shared three.js scene boilerplate — extracted from Viewer.astro (Stage 5)
// so Generator.astro (Stage 7) doesn't duplicate it. Behavior-preserving:
// same camera/lights/resize/animation-loop as the original Viewer scene.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface ViewerScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  fitCameraToObject: (object: THREE.Object3D, offset?: number) => void;
}

export function createViewerScene(canvas: HTMLCanvasElement, stageEl: HTMLElement): ViewerScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f8fa);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  camera.position.set(150, 150, 150);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0x666666));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(1, 1.5, 1);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-1, -0.5, -1);
  scene.add(fillLight);

  function resizeRenderer() {
    const width = stageEl.clientWidth;
    const height = stageEl.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resizeRenderer).observe(stageEl);
  resizeRenderer();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  function fitCameraToObject(object: THREE.Object3D, offset = 1.6) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const fov = (camera.fov * Math.PI) / 180;
    const distance = (maxDim / 2 / Math.tan(fov / 2)) * offset;
    const direction = new THREE.Vector3(1, 0.8, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
  }

  return { scene, camera, renderer, controls, fitCameraToObject };
}
