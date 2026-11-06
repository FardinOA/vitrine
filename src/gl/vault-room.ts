import * as THREE from "three";
import { fontFamily, noteTexture, typeTexture } from "./textures";

export const CELL = { w: 0.46, h: 0.34, d: 0.34 };

function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export type Room = {
  group: THREE.Group;
  /** Centre of box 4821's opening, on the left wall. */
  drawerAt: THREE.Vector3;
  drawerH: number;
  halfW: number;
  backZ: number;
};

/**
 * The room behind the door: glass-fronted boxes on three walls, a bundle in every one, and a
 * statement printed on the end wall. Bright on purpose. A vault you're allowed to look into
 * shouldn't be a dark vault. The floor is real: everything is drawn a second time, mirrored
 * underneath it.
 */
export function buildRoom(renderer: THREE.WebGLRenderer, env: THREE.Texture, lite: boolean): Room {
  const group = new THREE.Group();
  const content = new THREE.Group();
  group.add(content);

  const rows = 15;
  const backCols = 40;
  const sideCols = 18;
  const backZ = -9;
  const halfW = (backCols * CELL.w) / 2;
  const halfH = (rows * CELL.h) / 2;
  const floorY = -halfH;

  // Shell: long enough below the floor to carry the reflection.
  const shellH = halfH * 4;
  const shell = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 2 + 0.9, shellH, 10.45),
    new THREE.MeshBasicMaterial({ color: "#e4efe9", side: THREE.BackSide, toneMapped: false }),
  );
  // Sits behind the box fronts so that every recess has room to be deep.
  shell.position.set(0, -halfH, backZ + 4.8);
  group.add(shell);

  // Long strip lights across the ceiling.
  const stripMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 - 2, 0.02, 0.14), stripMat);
    strip.position.set(0, halfH - 0.012, backZ + 0.9 + i * 1.4);
    group.add(strip);
  }

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2 + 0.02, 12),
    new THREE.MeshStandardMaterial({
      color: "#e9efe9",
      metalness: 0,
      roughness: 0.2,
      envMap: env,
      envMapIntensity: 0.4,
      transparent: !lite,
      opacity: lite ? 1 : 0.8,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, floorY, backZ + 6);
  floor.renderOrder = 1;
  group.add(floor);

  // Back wall: boxes around a blank panel. Left wall: a gap for box 4821.
  const panelCols = { from: 7, to: 32 };
  const panelRows = { from: 4, to: 11 };
  const gapCols = { from: 8, to: 10 };
  const gapRows = { from: 6, to: 8 };

  type Slot = { m: THREE.Matrix4; light: number };
  const slots: Slot[] = [];
  const o = new THREE.Object3D();
  const addWall = (cols: number, skip: (c: number, r: number) => boolean, place: (c: number, r: number) => void) => {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (skip(c, r)) continue;
        place(c, r);
        o.updateMatrix();
        slots.push({ m: o.matrix.clone(), light: 0.84 + 0.16 * (r / (rows - 1)) });
      }
    }
  };
  addWall(
    backCols,
    (c, r) => c >= panelCols.from && c <= panelCols.to && r >= panelRows.from && r <= panelRows.to,
    (c, r) => {
      o.position.set((c + 0.5) * CELL.w - halfW, (r + 0.5) * CELL.h - halfH, backZ);
      o.rotation.set(0, 0, 0);
    },
  );
  addWall(
    sideCols,
    (c, r) => c >= gapCols.from && c <= gapCols.to && r >= gapRows.from && r <= gapRows.to,
    (c, r) => {
      o.position.set(-halfW, (r + 0.5) * CELL.h - halfH, backZ + (c + 0.5) * CELL.w);
      o.rotation.set(0, Math.PI / 2, 0);
    },
  );
  addWall(
    sideCols,
    () => false,
    (c, r) => {
      o.position.set(halfW, (r + 0.5) * CELL.h - halfH, backZ + (c + 0.5) * CELL.w);
      o.rotation.set(0, -Math.PI / 2, 0);
    },
  );

  // The cell: a rounded frame with a deep opening, so each box has a real recess.
  const s = rounded(CELL.w - 0.004, CELL.h - 0.004, 0.016);
  const hole = rounded(CELL.w - 0.044, CELL.h - 0.044, 0.012);
  s.holes.push(new THREE.Path(hole.getPoints(4)));
  const frameGeo = new THREE.ExtrudeGeometry(s, { depth: CELL.d, bevelEnabled: false, curveSegments: 3 });
  frameGeo.translate(0, 0, -CELL.d + 0.03);
  const frameMat = new THREE.MeshStandardMaterial({ color: "#f8faf6", metalness: 0, roughness: 0.42, envMap: env, envMapIntensity: 0.85 });
  const frames = new THREE.InstancedMesh(frameGeo, frameMat, slots.length);

  const backGeo = new THREE.PlaneGeometry(CELL.w, CELL.h);
  const backMat = new THREE.MeshBasicMaterial({ color: "#123f30", toneMapped: false });
  const backs = new THREE.InstancedMesh(backGeo, backMat, slots.length);

  const bundleGeo = new THREE.BoxGeometry(0.33, 0.165, 0.09);
  const paper = new THREE.MeshStandardMaterial({ color: "#eef3e2", roughness: 0.9, metalness: 0 });
  const face = new THREE.MeshStandardMaterial({ map: noteTexture(renderer), roughness: 0.75, metalness: 0, envMap: env, envMapIntensity: 0.7 });
  const bundles = new THREE.InstancedMesh(bundleGeo, [paper, paper, paper, paper, face, paper], slots.length * 3);

  const paneGeo = new THREE.PlaneGeometry(CELL.w - 0.044, CELL.h - 0.044);
  const paneMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    metalness: 0,
    roughness: 0.03,
    envMap: env,
    envMapIntensity: 0.55,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
  });
  const panes = new THREE.InstancedMesh(paneGeo, paneMat, slots.length);

  const plateGeo = new THREE.BoxGeometry(0.07, 0.012, 0.004);
  const plateMat = new THREE.MeshStandardMaterial({ color: "#dba733", metalness: 1, roughness: 0.3, envMap: env });
  const plates = new THREE.InstancedMesh(plateGeo, plateMat, slots.length);

  const tmp = new THREE.Matrix4();
  const col = new THREE.Color();
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  let b = 0;
  slots.forEach((slot, i) => {
    frames.setMatrixAt(i, slot.m);
    col.setRGB(slot.light, slot.light, slot.light);
    frames.setColorAt(i, col);

    tmp.makeTranslation(0, 0, -CELL.d + 0.03);
    backs.setMatrixAt(i, tmp.clone().premultiply(slot.m));
    tmp.makeTranslation(0, 0, 0.012);
    panes.setMatrixAt(i, tmp.clone().premultiply(slot.m));
    tmp.makeTranslation(0, -CELL.h / 2 + 0.011, 0.033);
    plates.setMatrixAt(i, tmp.clone().premultiply(slot.m));

    // Boxes hold different sums: one bundle, two, sometimes three deep.
    const roll = rand();
    const count = roll > 0.7 ? 3 : roll > 0.25 ? 2 : 1;
    for (let n = 0; n < count; n++) {
      const dz = -0.02 - (count - 1 - n) * 0.09;
      const dy = -CELL.h / 2 + 0.022 + 0.0825 + n * 0.012;
      const dx = (rand() - 0.5) * 0.03;
      tmp.makeTranslation(dx, dy, dz - 0.05);
      bundles.setMatrixAt(b, tmp.clone().premultiply(slot.m));
      const tint = 0.9 + rand() * 0.1;
      col.setRGB(tint, tint, tint * 0.98);
      bundles.setColorAt(b, col);
      b++;
    }
  });
  bundles.count = b;
  const meshes = [frames, backs, bundles, plates];
  meshes.forEach((m) => {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.frustumCulled = false;
    content.add(m);
  });
  panes.instanceMatrix.needsUpdate = true;
  panes.frustumCulled = false;
  panes.renderOrder = 3;
  group.add(panes);

  // The statement on the end wall.
  const pw = (panelCols.to - panelCols.from + 1) * CELL.w;
  const ph = (panelRows.to - panelRows.from + 1) * CELL.h;
  const pcx = ((panelCols.from + panelCols.to + 1) / 2) * CELL.w - halfW;
  const pcy = ((panelRows.from + panelRows.to + 1) / 2) * CELL.h - halfH;
  const panelTex = typeTexture(renderer, 2048, Math.round((2048 * ph) / pw), (g, w, h) => {
    g.fillStyle = "#c9e6da";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#07261d";
    // On a phone only the middle of this wall is ever in shot.
    g.font = `800 100px ${fontFamily()}`;
    const portrait = window.innerWidth < window.innerHeight;
    const f = Math.min(h * 0.4, (100 * w * (portrait ? 0.4 : 0.8)) / g.measureText("One dollar here.").width);
    g.font = `800 ${f}px ${fontFamily()}`;
    g.letterSpacing = `${-f * 0.035}px`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("One dollar in.", w / 2, h / 2 - f * 0.52);
    g.fillText("One dollar here.", w / 2, h / 2 + f * 0.52);
  });
  panelTex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(pw - 0.02, ph - 0.02),
    new THREE.MeshBasicMaterial({ map: panelTex, toneMapped: false }),
  );
  panel.position.set(pcx, pcy, backZ + 0.03);
  content.add(panel);

  // Mirror everything under the floor.
  if (!lite) {
    const mirror = new THREE.Group();
    mirror.scale.y = -1;
    mirror.position.y = floorY * 2;
    meshes.forEach((m) => {
      const c = m.clone();
      c.frustumCulled = false;
      mirror.add(c);
    });
    mirror.add(panel.clone());
    group.add(mirror);
  }

  const drawerAt = new THREE.Vector3(
    -halfW,
    ((gapRows.from + gapRows.to + 1) / 2) * CELL.h - halfH,
    backZ + ((gapCols.from + gapCols.to + 1) / 2) * CELL.w,
  );
  return { group, drawerAt, drawerH: (gapRows.to - gapRows.from + 1) * CELL.h - 0.012, halfW, backZ };
}
