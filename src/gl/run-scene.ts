import * as THREE from "three";
import { bakeStudio } from "./studio";
import { noteTexture, typeTexture, fontFamily } from "./textures";

const CASE_W = 3.1;
const CASE_H = 3.1;
const COLS = 10;
const ROWS = 10;
export const HELD = 12;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * Two glass cases of a hundred customers' money. The first really has twelve bundles in it;
 * everything else is a slip of paper saying who it was lent to. Paid-out bundles fly at the lens.
 */
export function createRunScene(canvas: HTMLCanvasElement, field: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const env = bakeStudio(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(field);
  scene.environment = env;
  scene.add(new THREE.HemisphereLight("#ffffff", "#c7d8d0", 1.1));
  const key = new THREE.DirectionalLight("#ffffff", 1.5);
  key.position.set(-2, 4, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);

  const steel = new THREE.MeshStandardMaterial({ color: "#c7cecc", metalness: 1, roughness: 0.22, envMap: env });
  const shelfMat = new THREE.MeshStandardMaterial({ color: "#f4f6f1", metalness: 0, roughness: 0.5, envMap: env, envMapIntensity: 0.8 });
  const backMat = new THREE.MeshBasicMaterial({ color: "#123f30", toneMapped: false });
  const glassMat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: 0.03, envMap: env, envMapIntensity: 1.1, transparent: true, opacity: 0.1, depthWrite: false });

  const paper = new THREE.MeshStandardMaterial({ color: "#eef3e2", roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ map: noteTexture(renderer), roughness: 0.7, envMap: env, envMapIntensity: 0.6 });
  const bundleGeo = new THREE.BoxGeometry(0.26, 0.2, 0.09);

  const slipTex = typeTexture(renderer, 256, 200, (g, w, h) => {
    g.fillStyle = "#fbfaf4";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ee4323";
    g.font = `800 58px ${fontFamily()}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("LENT", w / 2, h / 2 + 3);
    g.strokeStyle = "#ee4323";
    g.lineWidth = 6;
    g.strokeRect(18, 40, w - 36, h - 80);
  });
  slipTex.colorSpace = THREE.SRGBColorSpace;
  const slipMat = new THREE.MeshBasicMaterial({ map: slipTex, toneMapped: false, side: THREE.DoubleSide });
  const slipGeo = new THREE.PlaneGeometry(0.23, 0.17);

  const shutterTex = typeTexture(renderer, 1024, 1024, (g, w, h) => {
    g.fillStyle = "#ee4323";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(7,38,29,0.16)";
    for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 3);
    g.fillStyle = "#fff";
    g.font = `800 188px ${fontFamily()}`;
    g.letterSpacing = "-6px";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Closed", w / 2, h * 0.46);
    g.font = `600 52px ${fontFamily()}`;
    g.letterSpacing = "0px";
    g.fillText("until further notice", w / 2, h * 0.6);
  });
  shutterTex.colorSpace = THREE.SRGBColorSpace;

  const slot = (i: number) => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    return {
      x: (c - (COLS - 1) / 2) * 0.294,
      y: ((ROWS - 1) / 2 - r) * 0.294,
    };
  };

  const makeCase = (x: number, real: number) => {
    const g = new THREE.Group();
    g.position.x = x;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(CASE_W, CASE_H), backMat);
    back.position.z = -0.22;
    g.add(back);
    for (let r = 0; r <= ROWS; r++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(CASE_W, 0.022, 0.4), shelfMat);
      s.position.set(0, (r - ROWS / 2) * 0.294 - 0.04 + 0.03, -0.03);
      g.add(s);
    }
    const edge = (w: number, h: number, ex: number, ey: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.46), steel);
      m.position.set(ex, ey, 0);
      g.add(m);
    };
    const t = 0.07;
    edge(CASE_W + t * 2, t, 0, CASE_H / 2 + t / 2);
    edge(CASE_W + t * 2, t, 0, -CASE_H / 2 - t / 2);
    edge(t, CASE_H, -CASE_W / 2 - t / 2, 0);
    edge(t, CASE_H, CASE_W / 2 + t / 2, 0);

    const bundles = new THREE.InstancedMesh(bundleGeo, [paper, paper, paper, paper, face, paper], real);
    bundles.frustumCulled = false;
    bundles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.add(bundles);

    if (real < 100) {
      const slips = new THREE.InstancedMesh(slipGeo, slipMat, 100 - real);
      const o = new THREE.Object3D();
      let seed = 3;
      for (let i = real; i < 100; i++) {
        seed = (seed * 16807) % 2147483647;
        const s = slot(i);
        o.position.set(s.x, s.y - 0.05, -0.04);
        o.rotation.z = ((seed / 2147483647) - 0.5) * 0.2;
        o.updateMatrix();
        slips.setMatrixAt(i - real, o.matrix);
      }
      g.add(slips);
    }

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(CASE_W, CASE_H), glassMat);
    glass.position.z = 0.2;
    glass.renderOrder = 2;
    g.add(glass);
    scene.add(g);
    return { g, bundles, real };
  };

  const left = makeCase(-1.95, HELD);
  const right = makeCase(1.95, 100);

  const shutter = new THREE.Mesh(
    new THREE.PlaneGeometry(CASE_W + 0.14, CASE_H + 0.14),
    new THREE.MeshBasicMaterial({ map: shutterTex, toneMapped: false }),
  );
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), CASE_H / 2 + 0.07);
  (shutter.material as THREE.MeshBasicMaterial).clippingPlanes = [clip];
  renderer.localClippingEnabled = true;
  shutter.position.set(left.g.position.x, CASE_H + 0.14, 0.24);
  scene.add(shutter);

  const o = new THREE.Object3D();
  const placeBundles = (c: typeof left, paid: number) => {
    for (let i = 0; i < c.real; i++) {
      const s = slot(i);
      const f = clamp(paid - i);
      // Off the shelf, a tumble, and straight past the lens.
      const k = f * f;
      o.position.set(
        s.x * (1 - k * 0.3) + Math.sin(i * 2.4) * k * 0.5,
        s.y - 0.044 - k * 0.8,
        -0.02 + k * 7.5,
      );
      o.rotation.set(k * (1.4 + (i % 3)), k * ((i % 5) - 2) * 0.8, k * ((i % 4) - 1.5));
      const sc = f >= 1 ? 0.0001 : 1;
      o.scale.setScalar(sc);
      o.updateMatrix();
      c.bundles.setMatrixAt(i, o.matrix);
    }
    c.bundles.instanceMatrix.needsUpdate = true;
  };

  let width = 1;
  let height = 1;
  let baseZ = 9;
  const resize = () => {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    baseZ = Math.max(3.65 / tan / 2 / 1, 7.2 / tan / 2 / camera.aspect) * 1.02;
  };
  resize();

  return {
    resize,
    /** paid: customers paid so far. closed: 0 to 1, how far the shutter has dropped. */
    render(paid: number, closed: number, enter: number, px: number, py: number) {
      placeBundles(left, Math.min(paid, HELD));
      placeBundles(right, paid);
      shutter.position.y = (1 - closed) * (CASE_H + 0.14);
      camera.position.set(px * 0.6, py * 0.3, baseZ + (1 - enter) * 2.4);
      camera.lookAt(0, 0, 0);
      left.g.position.x = -1.95 - (1 - enter) * 1.2;
      right.g.position.x = 1.95 + (1 - enter) * 1.2;
      shutter.position.x = left.g.position.x;
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
    },
  };
}
