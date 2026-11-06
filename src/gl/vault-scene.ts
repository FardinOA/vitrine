import * as THREE from "three";
import { bakeStudio } from "./studio";
import { buildDoor, DOOR, doorMaterials } from "./door";
import { wallMaterial } from "./wall";
import { buildRoom } from "./vault-room";
import { fontFamily, typeTexture } from "./textures";

const FOV = 28;
/** How far the door sits above centre on a phone, as a share of the screen. */
const LIFT = 0.035;
const FIELD = "#c9e6da";
const INK = "#07261d";
export const BRASS = "#e6b53a";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (t: number) => {
  const c = 1.9;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

export type VaultScene = {
  setProgress(t: number): void;
  setPointer(x: number, y: number, inside: boolean): void;
  kick(): void;
  frame(now: number): void;
  resize(): void;
  /** After the web font arrives, redraw the headline with it. */
  refreshType(): void;
  dispose(): void;
};

export function createVaultScene(canvas: HTMLCanvasElement): VaultScene {
  const narrow = () => window.innerWidth < 760;
  const lite = narrow() && window.devicePixelRatio > 2.5 && (navigator.hardwareConcurrency ?? 8) < 6;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.transmissionResolutionScale = 1;

  const env = bakeStudio(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FIELD);
  scene.environment = env;

  const key = new THREE.DirectionalLight("#ffffff", 1.4);
  key.position.set(-3, 5, 6);
  scene.add(key);
  scene.add(new THREE.HemisphereLight("#ffffff", "#bcd6ca", 0.7));

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);

  // Wall.
  const wallMat = wallMaterial(FIELD, INK);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), wallMat);
  scene.add(wall);

  // Door.
  const mats = doorMaterials(env, { lite });
  const door = buildDoor(mats);
  scene.add(door.group);

  // Room.
  const room = buildRoom(renderer, env, lite);
  scene.add(room.group);

  // Box 4821: the one that comes out.
  const drawer = new THREE.Group();
  drawer.position.copy(room.drawerAt);
  drawer.rotation.y = Math.PI / 2;
  scene.add(drawer);
  const plateMat = new THREE.MeshStandardMaterial({ color: "#e6b53a", metalness: 1, roughness: 0.32, envMap: env, envMapIntensity: 1.1 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(1, room.drawerH, 0.05), plateMat);
  drawer.add(plate);
  const flatMat = new THREE.MeshBasicMaterial({ color: BRASS, transparent: true, opacity: 0, toneMapped: false });
  const flat = new THREE.Mesh(new THREE.PlaneGeometry(1, room.drawerH), flatMat);
  flat.position.z = 0.0275;
  drawer.add(flat);
  const labelMat = new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, color: "#3a2a06" });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), labelMat);
  label.position.set(0, 0, 0.0285);
  drawer.add(label);
  const drawLabel = () => {
    labelMat.alphaMap?.dispose();
    labelMat.alphaMap = typeTexture(renderer, 1080, 360, (g, w, h) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff";
      g.font = `800 150px ${fontFamily()}`;
      g.letterSpacing = "-4px";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("Box 4821", w / 2, h * 0.34);
      g.font = `600 84px ${fontFamily()}`;
      g.letterSpacing = "-1px";
      g.fillText("Yours", w / 2, h * 0.76);
    });
    labelMat.needsUpdate = true;
  };
  drawLabel();
  const sides = new THREE.Mesh(
    new THREE.BoxGeometry(1, room.drawerH - 0.02, 1.6),
    new THREE.MeshStandardMaterial({ color: "#dfe5e2", metalness: 1, roughness: 0.35, envMap: env }),
  );
  sides.position.z = -0.82;
  drawer.add(sides);

  // State.
  let width = 1;
  let height = 1;
  let baseD = 8;
  let viewLift = -1;
  let progress = 0;
  const pointerTarget = new THREE.Vector2(0, 0);
  const pointer = new THREE.Vector2(0, 0);
  let pointerInside = 0;
  let lens = 0;
  let wheelTarget = 0;
  let wheel = -Math.PI * 2;
  let lastBearing: number | null = null;
  let tiltX = 0;
  let tiltY = 0;
  let play = 0;
  let kickT = -10;
  let kickSpin = 0;
  const started = performance.now();

  const drawType = () => {
    const aspect = width / height;
    const visH = 2 * baseD * Math.tan((FOV * Math.PI) / 360);
    const visW = visH * aspect;
    wallMat.uniforms.uRect.value.set(visW, visH);
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.min(4096, width * scale);
    const th = Math.round((tw * height) / width);
    wallMat.uniforms.uMap.value?.dispose();
    wallMat.uniforms.uMap.value = typeTexture(renderer, tw, th, (g, w, h) => {
      g.textBaseline = "alphabetic";
      g.fillStyle = "#000";
      const font = (px: number) => `800 ${px}px ${fontFamily()}`;
      if (aspect < 1) {
        // A phone is too narrow to read type through the door, so the headline stands above it
        // and only its last line dips behind the glass rim.
        const lines = ["Look inside", "your bank."];
        g.font = font(100);
        const widest = Math.max(...lines.map((x) => g.measureText(x).width));
        const f = (100 * w * 0.9) / widest;
        g.font = font(f);
        g.letterSpacing = `${-f * 0.03}px`;
        g.textAlign = "center";
        const top = h * 0.09 + h * LIFT + f;
        lines.forEach((line, i) => g.fillText(line, w / 2, top + i * f * 0.98));
        return;
      }
      // The two lines break across the wheel: left words end at the hub, right words start from it.
      g.font = font(100);
      const gap = 0.54;
      const leftW = Math.max(g.measureText("Look").width, g.measureText("your").width) / 100;
      const rightW = Math.max(g.measureText("inside").width, g.measureText("bank.").width) / 100;
      const room = w * 0.47;
      const f = Math.min((room / (rightW + gap / 2)), h * 0.34);
      void leftW;
      g.font = font(f);
      const lh = f * 0.97;
      const baseline1 = h / 2 - lh * 0.17;
      const baseline2 = baseline1 + lh;
      g.letterSpacing = `${-f * 0.035}px`;
      g.textAlign = "right";
      g.fillText("Look", w / 2 - (gap / 2) * f, baseline1);
      g.fillText("your", w / 2 - (gap / 2) * f, baseline2);
      g.textAlign = "left";
      g.fillText("inside", w / 2 + (gap / 2) * f, baseline1);
      g.fillText("bank.", w / 2 + (gap / 2) * f, baseline2);
    });
  };

  const resize = () => {
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow() ? 1.5 : 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const k = Math.tan((FOV * Math.PI) / 360) * 2;
    const dia = (DOOR.frameOuter + 0.02) * 2;
    const fitH = dia / 0.93 / k;
    const fitW = dia / (camera.aspect < 1 ? 0.92 : 1.06) / camera.aspect / k;
    baseD = Math.max(fitH, fitW);
    viewLift = -1;
    drawType();
  };
  resize();

  const worldOnWall = new THREE.Vector3();
  const raycastWall = (nx: number, ny: number) => {
    worldOnWall.set(nx, ny, 0.5).unproject(camera);
    const dir = worldOnWall.sub(camera.position).normalize();
    const d = -camera.position.z / dir.z;
    return { x: camera.position.x + dir.x * d, y: camera.position.y + dir.y * d };
  };

  const camFrom = new THREE.Vector3();
  const look = new THREE.Vector3();

  const lerp = THREE.MathUtils.lerp;
  const placeCamera = (t: number) => {
    // The lens opens wide as it passes the door, so the room arrives all at once.
    const wide = smooth(0.3, 0.5, t);
    const dive = smooth(0.8, 0.965, t);
    const portrait = width / height < 1;
    const fov = lerp(lerp(FOV, portrait ? 72 : 52, wide), FOV, smooth(0.8, 0.94, t));
    if (Math.abs(camera.fov - fov) > 0.001) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    // On a phone the door sits high, to leave room for the copy under it, and settles as you leave.
    const lift = portrait ? Math.round(height * LIFT * (1 - smooth(0.02, 0.2, t))) : 0;
    if (lift !== viewLift) {
      viewLift = lift;
      if (lift) camera.setViewOffset(width, height, 0, lift, width, height);
      else camera.clearViewOffset();
    }

    // Through the door and down the room.
    const enter = smooth(0.2, 0.52, t);
    const z0 = lerp(baseD, -0.9, enter ** 1.3);
    // Turn to face the left wall and drift along it.
    const turn = smooth(0.62, 0.8, t);
    const x1 = lerp(0, -5.6, turn);
    const y1 = lerp(0, 0.1, turn);
    const z1 = lerp(z0, -1.7, turn);
    const lx = lerp(0, room.drawerAt.x, turn);
    const ly = lerp(0, room.drawerAt.y, turn);
    const lz = lerp(z0 > 0 ? 0 : -9, room.drawerAt.z - 0.6, turn);
    const zLook = lerp(0, -9, smooth(0.2, 0.42, t));
    // Close on box 4821 until its plate is the whole screen.
    const fill = room.drawerH / (2 * Math.tan((FOV * Math.PI) / 360));
    const plateX = room.drawerAt.x + 1.5 + 0.03;
    camFrom.set(
      lerp(x1, plateX + fill, dive),
      lerp(y1, room.drawerAt.y, dive),
      lerp(z1, room.drawerAt.z, dive),
    );
    look.set(
      lerp(lx, plateX, dive),
      lerp(ly, room.drawerAt.y, dive),
      lerp(turn > 0 ? lz : zLook, room.drawerAt.z, dive),
    );
    camera.position.copy(camFrom);
    camera.lookAt(look);
  };

  return {
    setProgress(t) {
      progress = t;
    },
    setPointer(nx, ny, inside) {
      pointerTarget.set(nx, ny);
      pointerInside = inside ? 1 : 0;
    },
    kick() {
      kickT = performance.now();
      kickSpin += Math.PI * 2;
    },
    refreshType() {
      drawType();
      drawLabel();
    },
    resize,
    frame(now) {
      const t = progress;
      const since = (now - started) / 1000;

      // Bolts shoot out when the page opens.
      const intro = clamp(since / 1.25);
      const introThrown = 1 - easeOutBack(clamp((since - 0.15) / 0.8));

      pointer.lerp(pointerTarget, 0.16);
      const engaged = 1 - smooth(0.0, 0.08, t);

      // The wheel follows the hand round its hub.
      const worldP = raycastWall(pointer.x, pointer.y);
      const bearing = Math.atan2(worldP.y, worldP.x);
      if (lastBearing !== null && pointerInside) {
        let db = bearing - lastBearing;
        if (db > Math.PI) db -= Math.PI * 2;
        if (db < -Math.PI) db += Math.PI * 2;
        wheelTarget += db * engaged;
      }
      lastBearing = bearing;

      const scrollSpin = smooth(0.0, 0.2, t) * Math.PI * 5;
      const prev = wheel;
      const target = wheelTarget + kickSpin + (intro < 1 ? -((1 - intro) ** 2) * Math.PI * 2 : 0);
      wheel += (target - wheel) * 0.17;
      const speed = Math.abs(wheel - prev);
      // Spin it fast and the bolts rattle back; let go and they shoot home.
      play += (Math.min(0.42, speed * 2.4) - play) * (speed * 2.4 > play ? 0.3 : 0.14);

      const kicked = (now - kickT) / 1000;
      const kickThrow = kicked < 1.1 ? Math.sin(clamp(kicked / 1.1) * Math.PI) ** 0.7 : 0;

      const thrown = clamp(Math.max(introThrown * 0.999, play, kickThrow * 0.9, smooth(0.015, 0.16, t)));
      const swing = smooth(0.15, 0.42, t);
      door.pose(wheel + scrollSpin, thrown, swing * 1.86);

      // The whole door leans to the hand, far enough to slide the lens across the headline.
      const tx = -pointer.y * 0.2 * engaged;
      const ty = pointer.x * 0.26 * engaged;
      tiltX += (tx - tiltX) * 0.14;
      tiltY += (ty - tiltY) * 0.14;
      door.group.rotation.set(tiltX, tiltY, 0);

      wallMat.uniforms.uWipe.value = smooth(0.012, 0.17, t) * 1.02;
      wallMat.uniforms.uHole.value = DOOR.hole;
      wallMat.uniforms.uShadowR.value = DOOR.frameOuter;
      lens += (pointerInside * engaged - lens) * 0.14;
      wallMat.uniforms.uLens.value = lens;
      wallMat.uniforms.uPointer.value.set(worldP.x, worldP.y);

      // Inside, box 4821 slides out to meet the camera.
      const pull = smooth(0.76, 0.9, t);
      drawer.position.x = room.drawerAt.x + pull * 1.5;
      const aspect = width / height;
      const endW = room.drawerH * aspect;
      const baseW = room.drawerH * 1.38;
      const w = THREE.MathUtils.lerp(baseW, endW, smooth(0.86, 0.97, t));
      plate.scale.x = w;
      flat.scale.x = w;
      sides.scale.x = Math.min(w, baseW);
      flatMat.opacity = smooth(0.89, 0.96, t);
      labelMat.opacity = 1 - smooth(0.88, 0.94, t);

      placeCamera(t);
      camera.updateMatrixWorld();

      // Nothing behind the wall needs drawing until the glass has cleared.
      room.group.visible = t > 0.008;
      drawer.visible = room.group.visible;
      door.group.visible = t < 0.56;
      wall.visible = t < 0.56;

      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
    },
  };
}
