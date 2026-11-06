import * as THREE from "three";
import { bakeStudio } from "./studio";
import { buildDoor, DOOR, doorMaterials } from "./door";
import { wallMaterial } from "./wall";
import { fontFamily, typeTexture } from "./textures";

const FOV = 28;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** The same door, from the outside, closing. Sign up and the bolts go home. */
export function createCloseScene(canvas: HTMLCanvasElement, field: string, ink: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.transmissionResolutionScale = 1;
  const env = bakeStudio(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(field);
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);

  const wallMat = wallMaterial(field, ink);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), wallMat);
  scene.add(wall);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshBasicMaterial({ color: "#e6b53a", toneMapped: false }));
  inside.position.z = -1;
  scene.add(inside);

  const door = buildDoor(doorMaterials(env, { lite: false }));
  scene.add(door.group);

  let width = 1;
  let height = 1;
  let baseD = 8;
  let visH = 4;
  let visW = 6;
  // Where the door's centre sits on screen, from the top. The dome rises from below the headline.
  const centreAt = () => (width / height < 1 ? 0.64 : 0.74);
  const drawType = () => {
    const aspect = width / height;
    wallMat.uniforms.uRect.value.set(visW, visH);
    wallMat.uniforms.uCenter.value.set(0, (centreAt() - 0.5) * visH);
    wallMat.uniforms.uMap.value?.dispose();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const tw = Math.min(4096, width * scale);
    wallMat.uniforms.uMap.value = typeTexture(renderer, tw, Math.round((tw * height) / width), (g, w, h) => {
      g.fillStyle = "#000";
      g.textAlign = "center";
      g.textBaseline = "middle";
      const words = aspect < 1 ? ["See for", "yourself."] : ["See for yourself."];
      g.font = `800 100px ${fontFamily()}`;
      const widest = Math.max(...words.map((x) => g.measureText(x).width));
      const f = Math.min((100 * w * (aspect < 1 ? 0.9 : 0.94)) / widest, h * 0.24);
      g.font = `800 ${f}px ${fontFamily()}`;
      g.letterSpacing = `${-f * 0.035}px`;
      words.forEach((word, i) => g.fillText(word, w / 2, f * 0.62 + h * 0.012 + i * f * 0.94));
    });
  };

  const resize = () => {
    width = canvas.clientWidth || 1;
    height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const k = Math.tan((FOV * Math.PI) / 360) * 2;
    const dia = (DOOR.frameOuter + 0.02) * 2;
    baseD = Math.max(dia / (camera.aspect < 1 ? 0.62 : 1.0) / k, dia / 1.16 / camera.aspect / k);
    visH = baseD * k;
    visW = visH * camera.aspect;
    // Slide the camera, not the door, so that wall, hole and door stay registered.
    const shift = (centreAt() - 0.5) * visH;
    camera.position.set(0, shift, baseD);
    camera.lookAt(0, shift, 0);
    camera.updateMatrixWorld();
    inside.position.y = 0;
    drawType();
  };
  resize();

  let t = 0;
  let locked = 0;
  let lockedTarget = 0;
  let wheel = 0;
  let tiltX = 0;
  let tiltY = 0;
  const pointer = new THREE.Vector2();
  const pointerT = new THREE.Vector2();
  let lens = 0;
  let inside2 = 0;

  return {
    resize,
    refreshType: drawType,
    setProgress(v: number) {
      t = v;
    },
    setPointer(x: number, y: number, on: boolean) {
      pointerT.set(x, y);
      inside2 = on ? 1 : 0;
    },
    /** Called when the visitor signs up: bolts go home with one more turn of the wheel. */
    lock() {
      lockedTarget = 1;
    },
    unlock() {
      lockedTarget = 0;
    },
    frame() {
      const shut = smooth(0, 0.82, t);
      const swing = (1 - shut) * 1.5;
      locked += (lockedTarget - locked) * 0.08;
      const thrown = Math.max(1 - smooth(0.74, 0.98, t) * 0.75 - locked * 0.25, 0);
      pointer.lerp(pointerT, 0.14);
      wheel += ((t * Math.PI * 4 + locked * Math.PI * 3 + pointer.x * 0.9) - wheel) * 0.14;
      door.pose(wheel, thrown, swing);
      tiltX += (-pointer.y * 0.14 * inside2 - tiltX) * 0.1;
      tiltY += (pointer.x * 0.18 * inside2 - tiltY) * 0.1;
      door.group.rotation.set(tiltX, tiltY, 0);

      wallMat.uniforms.uHole.value = DOOR.hole;
      wallMat.uniforms.uShadowR.value = 0.0001;
      // Type fills back in behind the glass as the door comes to.
      wallMat.uniforms.uWipe.value = 1 - smooth(0.55, 0.86, t);
      wallMat.uniforms.uPointer.value.set(pointer.x * visW * 0.5, pointer.y * visH * 0.5 + (centreAt() - 0.5) * visH);
      lens += (inside2 - lens) * 0.14;
      wallMat.uniforms.uLens.value = lens * 0.8;
      renderer.render(scene, camera);
    },
    dispose() {
      renderer.dispose();
    },
  };
}
