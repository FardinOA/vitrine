import * as THREE from "three";
import { bakeStudio } from "./studio";
import { fontFamily, typeTexture } from "./textures";
import { wallMaterial } from "./wall";

const W = 3.37;
const H = 2.125;
const R = 0.14;
const T = 0.05;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function shape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * A clear card with its works on show, as the door has. It starts edge-on, a single hairline
 * across the page, and turns to face you. Then you sign it: the pointer draws straight on the glass.
 */
export function createCardScene(canvas: HTMLCanvasElement, field: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.transmissionResolutionScale = 1;
  const env = bakeStudio(renderer, 0.3);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(field);
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);

  // Type on the back wall, so the glass has something to bend.
  // It has to be opaque, or the refraction pass wouldn't see it.
  const fieldColour = new THREE.Color(field);
  const inkColour = new THREE.Color("#2a9a76");
  const wallMat = wallMaterial(field, field);
  wallMat.uniforms.uHole.value = 0;
  wallMat.uniforms.uShadowR.value = -2;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wallMat);
  wall.position.z = -1.1;
  scene.add(wall);

  const card = new THREE.Group();
  scene.add(card);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape(W, H, R), {
      depth: T,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 3,
      curveSegments: 18,
    }).translate(0, 0, -T / 2),
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transmission: 1,
      roughness: 0.03,
      ior: 1.5,
      thickness: 0.5,
      attenuationColor: new THREE.Color("#c4f0dd"),
      attenuationDistance: 3,
      envMap: env,
      envMapIntensity: 0.85,
      specularIntensity: 1,
    }),
  );
  card.add(body);

  // Edge light: what makes the hairline read at the start.
  const edgeMat = new THREE.MeshBasicMaterial({ color: "#9df0cd", toneMapped: false, transparent: true, opacity: 1 });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.012, T + 0.024), edgeMat);
  edge.position.y = -H / 2 - 0.006;
  card.add(edge);

  // The chip sits flush with the front face, and transparent keeps it out of the refraction tint.
  const brass = new THREE.MeshStandardMaterial({ color: "#f0c04a", metalness: 1, roughness: 0.24, envMap: env, envMapIntensity: 2.6, transparent: true });
  const copper = new THREE.MeshStandardMaterial({ color: "#d98a4a", metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.5 });

  // Chip, seen through the glass.
  const chip = new THREE.Group();
  chip.position.set(-W / 2 + 0.56, 0.16, T / 2 + 0.008);
  const pad = new THREE.Mesh(new THREE.ExtrudeGeometry(shape(0.46, 0.36, 0.05), { depth: 0.012, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.006), brass);
  chip.add(pad);
  const lineMat = new THREE.MeshBasicMaterial({ color: "#8a6410", toneMapped: false, transparent: true });
  [
    [0.46, 0.006, 0, 0.06],
    [0.46, 0.006, 0, -0.06],
    [0.006, 0.36, -0.09, 0],
    [0.006, 0.36, 0.09, 0],
  ].forEach(([w, h, x, y]) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
    l.position.set(x, y, 0.0065);
    chip.add(l);
  });
  card.add(chip);

  // The antenna: copper wound round the edge, usually laminated out of sight.
  const antenna = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const inset = 0.075 + i * 0.024;
    const pts = shape(W - inset * 2, H - inset * 2, Math.max(0.06, R - inset * 0.3)).getPoints(10);
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)), true, "catmullrom", 0.02);
    antenna.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 220, 0.0032, 6, true), copper));
  }
  card.add(antenna);

  // Printed marks, etched into the front.
  const printMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, color: "#ffffff", depthWrite: false });
  const print = new THREE.Mesh(new THREE.PlaneGeometry(W, H), printMat);
  print.position.z = T / 2 + 0.0135;
  print.renderOrder = 5;
  card.add(print);

  // The signature layer: a canvas the pointer draws on.
  const sigC = document.createElement("canvas");
  sigC.width = 1348;
  sigC.height = 850;
  const sig = sigC.getContext("2d")!;
  sig.lineCap = "round";
  sig.lineJoin = "round";
  const sigTex = new THREE.CanvasTexture(sigC);
  sigTex.colorSpace = THREE.SRGBColorSpace;
  sigTex.anisotropy = 8;
  const sigMat = new THREE.MeshBasicMaterial({ map: sigTex, transparent: true, toneMapped: false, depthWrite: false });
  const sigMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), sigMat);
  sigMesh.position.z = T / 2 + 0.014;
  sigMesh.renderOrder = 6;
  card.add(sigMesh);

  let width = 1;
  let height = 1;
  let visW = 1;
  let baseScale = 1;
  const camZ = 9;
  const drawPrint = () => {
    printMat.alphaMap?.dispose();
    printMat.map?.dispose();
    const t = typeTexture(renderer, 1348, 850, (g, w, h) => {
      g.fillStyle = "#fff";
      g.font = `700 76px ${fontFamily()}`;
      g.letterSpacing = "-2px";
      g.textBaseline = "alphabetic";
      g.fillText("vitrine", 74, 132);
      g.textAlign = "right";
      g.font = `500 40px ${fontFamily()}`;
      g.letterSpacing = "0px";
      g.fillText("Box 4821", w - 74, 124);
      g.font = `500 34px ${fontFamily()}`;
      g.fillText("Debit. There's no credit to give.", w - 74, h - 70);
      // Signature line.
      g.textAlign = "left";
      g.fillRect(250, h - 170, w - 324, 2.5);
      g.font = `600 42px ${fontFamily()}`;
      g.fillText("x", 208, h - 176);
    });
    t.colorSpace = THREE.SRGBColorSpace;
    printMat.map = t;
    printMat.needsUpdate = true;
  };
  const drawWall = () => {
    wallMat.uniforms.uMap.value?.dispose();
    const px = 2048;
    const asp = width / height;
    const hh = Math.round(px / Math.max(asp, 0.5));
    const t = typeTexture(renderer, px, hh, (g, w, h) => {
      g.fillStyle = "#fff";
      const f = asp < 1 ? w * 0.24 : w * 0.165;
      g.font = `800 ${f}px ${fontFamily()}`;
      g.letterSpacing = `${-f * 0.035}px`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      if (asp < 1) {
        g.fillText("Sign", w / 2, h / 2 - f * 0.5);
        g.fillText("here.", w / 2, h / 2 + f * 0.5);
      } else {
        g.fillText("Sign here.", w / 2, h / 2);
      }
    });
    wallMat.uniforms.uMap.value = t;
  };

  const resize = () => {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.position.set(0, 0, camZ);
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const visH = 2 * camZ * tan;
    visW = visH * camera.aspect;
    baseScale = Math.min((visW * 0.86) / W, (visH * 0.58) / H);
    const wallH = 2 * (camZ + 1.1) * tan;
    wall.scale.set(wallH * camera.aspect, wallH, 1);
    wallMat.uniforms.uRect.value.set(wallH * camera.aspect, wallH);
    drawWall();
  };
  resize();
  drawPrint();

  let t = 0;
  const tilt = new THREE.Vector2();
  const tiltT = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const local = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  let drawing = false;
  let lastPt: { x: number; y: number } | null = null;
  let hasInk = false;
  let onInk: (() => void) | null = null;
  const toCanvas = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    card.updateMatrixWorld();
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).transformDirection(card.matrixWorld), card.position);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    local.copy(hit);
    card.worldToLocal(local);
    if (Math.abs(local.x) > W / 2 + 0.02 || Math.abs(local.y) > H / 2 + 0.02) return null;
    return { x: ((local.x + W / 2) / W) * sigC.width, y: (1 - (local.y + H / 2) / H) * sigC.height };
  };

  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const speed = Math.hypot(b.x - a.x, b.y - a.y);
    // Pen pressure from speed: slow is thick, fast is thin, as in real handwriting.
    const width = THREE.MathUtils.clamp(9 - speed * 0.09, 2.6, 9);
    sig.strokeStyle = "rgba(255,255,255,0.98)";
    sig.lineWidth = width;
    sig.beginPath();
    sig.moveTo(a.x, a.y);
    sig.lineTo(b.x, b.y);
    sig.stroke();
    sigTex.needsUpdate = true;
    if (!hasInk) {
      hasInk = true;
      onInk?.();
    }
  };

  return {
    resize,
    refreshType() {
      drawPrint();
      drawWall();
    },
    setProgress(v: number) {
      t = v;
    },
    setPointer(nx: number, ny: number) {
      tiltT.set(nx, ny);
    },
    onFirstInk(cb: () => void) {
      onInk = cb;
    },
    canSign: () => t > 0.42,
    penDown(cx: number, cy: number) {
      if (t <= 0.42) return false;
      const p = toCanvas(cx, cy);
      if (!p) return false;
      drawing = true;
      lastPt = p;
      stroke(p, { x: p.x + 0.1, y: p.y + 0.1 });
      return true;
    },
    penMove(cx: number, cy: number) {
      if (!drawing) return;
      const p = toCanvas(cx, cy);
      if (!p || !lastPt) return;
      stroke(lastPt, p);
      lastPt = p;
    },
    penUp() {
      drawing = false;
      lastPt = null;
    },
    clear() {
      sig.clearRect(0, 0, sigC.width, sigC.height);
      sigTex.needsUpdate = true;
      hasInk = false;
    },
    snapshot() {
      return hasInk ? sigC.toDataURL("image/png") : null;
    },
    /** Lets the capture script and the empty state put a sample signature on the card. */
    frame() {
      const turn = smooth(0.0, 0.42, t);
      const eased = 1 - (1 - turn) ** 3;
      card.rotation.x = (1 - eased) * (Math.PI / 2);
      const spanScale = (visW * 1.04) / W;
      const s = THREE.MathUtils.lerp(spanScale, baseScale, smooth(0.04, 0.42, t));
      card.scale.set(s, s, s);
      edgeMat.opacity = 1 - smooth(0.05, 0.3, t);
      edge.visible = edgeMat.opacity > 0.01;
      wallMat.uniforms.uInk.value.copy(fieldColour).lerp(inkColour, smooth(0.2, 0.42, t));

      // While you're signing, the glass holds still so the pen doesn't skate.
      tilt.lerp(drawing ? new THREE.Vector2(0, 0) : tiltT, drawing ? 0.2 : 0.09);
      const live = smooth(0.3, 0.46, t);
      card.rotation.y = tilt.x * 0.2 * live;
      card.rotation.x += -tilt.y * 0.12 * live;
      card.position.y = 0;

      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
    },
  };
}
