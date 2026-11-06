import * as THREE from "three";

export const DOOR = {
  /** Clear aperture in the wall. */
  hole: 1.04,
  frameOuter: 1.14,
  glass: 0.985,
  /** Where the door hangs. Top and bottom right, clear of the headline. */
  hingeX: 1.02,
  hingeY: 0.86,
  hingeZ: 0.3,
};

const BOLTS = 14;
const CAM_R = 0.255;
const ROD_L = 0.46;
/** Crank angle at full retraction. */
const CAM_MAX = 1.16;

function lathe(profile: [number, number][], segments = 128) {
  // Lathe faces point outward only for a counter-clockwise profile. Fix the winding here, once.
  let area = 0;
  profile.forEach(([r, z], i) => {
    const [r2, z2] = profile[(i + 1) % profile.length];
    area += r * z2 - r2 * z;
  });
  const points = area < 0 ? [...profile].reverse() : profile;
  const g = new THREE.LatheGeometry(
    points.map(([r, z]) => new THREE.Vector2(Math.max(r, 0.0001), z)),
    segments,
  );
  g.rotateX(Math.PI / 2);
  return g;
}

function gear(teeth: number, outer: number, root: number, bore: number, depth: number) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [root, a],
      [root, a + step * 0.18],
      [outer, a + step * 0.3],
      [outer, a + step * 0.52],
      [root, a + step * 0.66],
    ];
    pts.forEach(([r, t], j) => {
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  if (bore > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, bore, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1,
    curveSegments: 18,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

export type DoorMaterials = {
  frame: THREE.MeshStandardMaterial;
  front: THREE.MeshStandardMaterial;
  frontBrass: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
  polished: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
};

export function doorMaterials(env: THREE.Texture, opts: { lite: boolean }): DoorMaterials {
  const steel = new THREE.MeshStandardMaterial({ color: "#c9d0d0", metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.05 });
  const polished = new THREE.MeshStandardMaterial({ color: "#eef2f2", metalness: 1, roughness: 0.09, envMap: env, envMapIntensity: 1.2 });
  const brass = new THREE.MeshStandardMaterial({ color: "#e0aa3e", metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 1.2 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.015,
    metalness: 0,
    ior: 1.5,
    transmission: opts.lite ? 0 : 1,
    thickness: 0.72,
    attenuationColor: new THREE.Color("#a9e4cf"),
    attenuationDistance: 2.6,
    dispersion: opts.lite ? 0 : 1.4,
    envMap: env,
    envMapIntensity: 1.25,
    specularIntensity: 1,
    transparent: opts.lite,
    opacity: opts.lite ? 0.22 : 1,
  });
  const frame = new THREE.MeshStandardMaterial({ color: "#b4bcba", metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 0.95 });
  // Anything in front of the glass must stay out of the refraction buffer, or the glass paints a
  // second, bent copy of it. Three leaves transparent materials out of that pass.
  const front = polished.clone();
  front.transparent = true;
  const frontBrass = brass.clone();
  frontBrass.transparent = true;
  return { frame, front, frontBrass, steel, polished, brass, glass };
}

export type VaultDoor = {
  group: THREE.Group;
  /** Hangs from the hinge. Tilt and swing are applied here. */
  leaf: THREE.Group;
  frame: THREE.Group;
  /** wheel: radians. thrown: 0 bolts out and locked, 1 bolts drawn. swing: radians. */
  pose(wheel: number, thrown: number, swing: number): void;
};

export function buildDoor(m: DoorMaterials): VaultDoor {
  const group = new THREE.Group();
  const frame = new THREE.Group();
  group.add(frame);

  // The frame stays in the wall.
  const collar = new THREE.Mesh(
    lathe([
      [DOOR.hole - 0.01, -1.1],
      [DOOR.hole - 0.01, 0.17],
      [DOOR.hole + 0.002, 0.2],
      [DOOR.hole + 0.016, 0.216],
      [DOOR.hole + 0.034, 0.222],
      [DOOR.frameOuter - 0.05, 0.204],
      [DOOR.frameOuter - 0.022, 0.184],
      [DOOR.frameOuter - 0.006, 0.15],
      [DOOR.frameOuter, 0.0],
    ]),
    m.frame,
  );
  frame.add(collar);

  // Hinges: two heavy knuckles, set where the headline isn't.
  const barrelGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.1, 40);
  const capGeo = new THREE.CylinderGeometry(0.044, 0.058, 0.02, 40);
  const hingeYs = [-DOOR.hingeY, DOOR.hingeY];
  hingeYs.forEach((y) => {
    [-0.11, 0.11].forEach((dy) => {
      const b = new THREE.Mesh(barrelGeo, m.polished);
      b.position.set(DOOR.hingeX, y + dy, DOOR.hingeZ);
      frame.add(b);
      const c = new THREE.Mesh(capGeo, m.polished);
      c.position.set(DOOR.hingeX, y + dy + Math.sign(dy) * 0.06, DOOR.hingeZ);
      if (dy < 0) c.rotation.x = Math.PI;
      frame.add(c);
    });
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.14), m.frame);
    foot.position.set(DOOR.hingeX - 0.02, y, 0.2);
    frame.add(foot);
  });

  const leaf = new THREE.Group();
  leaf.position.set(DOOR.hingeX, 0, DOOR.hingeZ);
  group.add(leaf);
  const body = new THREE.Group();
  body.position.set(-DOOR.hingeX, 0, -DOOR.hingeZ);
  leaf.add(body);

  // Hinge arms on the leaf: the middle knuckle, and a strap back to the door's band.
  hingeYs.forEach((y) => {
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.1, 40), m.polished);
    knuckle.position.set(DOOR.hingeX, y, DOOR.hingeZ);
    body.add(knuckle);
    const reach = DOOR.hingeX - Math.sqrt(Math.max(0, (DOOR.glass + 0.05) ** 2 - y * y));
    const strap = new THREE.Mesh(new THREE.BoxGeometry(reach, 0.07, 0.036), m.frame);
    strap.position.set(DOOR.hingeX - reach / 2, y, DOOR.hingeZ - 0.02);
    body.add(strap);
  });

  // The door is a domed slab of glass: the dome is what makes a lens of it.
  const dome: [number, number][] = [[0.0001, -0.1]];
  dome.push([DOOR.glass - 0.01, -0.1], [DOOR.glass, -0.09], [DOOR.glass, 0.1], [DOOR.glass - 0.012, 0.118]);
  for (let i = 1; i <= 24; i++) {
    const r = (DOOR.glass - 0.012) * (1 - i / 24);
    const k = 1 - (r / DOOR.glass) ** 2;
    dome.push([r, 0.118 + 0.125 * k]);
  }
  const glass = new THREE.Mesh(lathe(dome, 160), m.glass);
  glass.renderOrder = 2;
  body.add(glass);

  // Steel band round the glass.
  const band = new THREE.Mesh(
    lathe([
      [DOOR.glass - 0.006, -0.14],
      [DOOR.glass + 0.042, -0.14],
      [DOOR.glass + 0.05, -0.13],
      [DOOR.glass + 0.05, 0.13],
      [DOOR.glass + 0.042, 0.15],
      [DOOR.glass + 0.012, 0.155],
      [DOOR.glass - 0.006, 0.142],
      [DOOR.glass - 0.006, -0.14],
    ]),
    m.polished,
  );
  body.add(band);

  // Boltwork. A rotating cam draws fourteen bolts through crank rods, as on a real door.
  const works = new THREE.Group();
  works.position.z = -0.012;
  body.add(works);

  const boltGeo = new THREE.CapsuleGeometry(0.031, 0.26, 6, 20);
  boltGeo.rotateZ(Math.PI / 2);
  const rodGeo = new THREE.CylinderGeometry(0.0072, 0.0072, 1, 8);
  rodGeo.rotateZ(Math.PI / 2);
  const pinGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.024, 14);
  pinGeo.rotateX(Math.PI / 2);
  const guideGeo = new THREE.BoxGeometry(0.052, 0.082, 0.052);

  type Bolt = { a: number; bolt: THREE.Mesh; rod: THREE.Mesh; pin: THREE.Mesh };
  const bolts: Bolt[] = [];
  for (let i = 0; i < BOLTS; i++) {
    const a = (i / BOLTS) * Math.PI * 2 + Math.PI / BOLTS;
    const bolt = new THREE.Mesh(boltGeo, m.polished);
    const rod = new THREE.Mesh(rodGeo, m.steel);
    const pin = new THREE.Mesh(pinGeo, m.polished);
    const guide = new THREE.Mesh(guideGeo, m.brass);
    guide.position.set(Math.cos(a) * 0.905, Math.sin(a) * 0.905, 0);
    guide.rotation.z = a;
    works.add(bolt, rod, pin, guide);
    bolts.push({ a, bolt, rod, pin });
  }

  const cam = new THREE.Mesh(gear(56, 0.298, 0.283, 0.082, 0.024), m.brass);
  works.add(cam);
  const pinions = [0, 1, 2].map((i) => {
    const g = new THREE.Group();
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const r = 0.196;
    g.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.04);
    const gm = new THREE.Mesh(gear(18, 0.091, 0.075, 0.016, 0.02), m.steel);
    g.add(gm);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.02, 18).rotateX(Math.PI / 2), m.brass);
    cap.position.z = 0.016;
    g.add(cap);
    works.add(g);
    return g;
  });
  const sun = new THREE.Mesh(gear(16, 0.097, 0.081, 0.03, 0.02), m.brass);
  sun.position.z = 0.04;
  works.add(sun);

  // Wheel on the front of the glass: five spokes, so it hides as little of the view as it can.
  const wheel = new THREE.Group();
  wheel.position.z = 0.41;
  body.add(wheel);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.46, 24).rotateX(Math.PI / 2), m.front);
  shaft.position.z = -0.2;
  wheel.add(shaft);
  const hub = new THREE.Mesh(
    lathe(
      [
        [0.0001, 0.07],
        [0.045, 0.07],
        [0.062, 0.058],
        [0.074, 0.03],
        [0.116, 0.012],
        [0.122, -0.012],
        [0.112, -0.03],
        [0.04, -0.044],
      ],
      64,
    ),
    m.front,
  );
  wheel.add(hub);
  const hubCap = new THREE.Mesh(
    lathe(
      [
        [0.0001, 0.08],
        [0.03, 0.08],
        [0.044, 0.07],
      ],
      48,
    ),
    m.frontBrass,
  );
  wheel.add(hubCap);
  const spokeGeo = new THREE.CylinderGeometry(0.012, 0.021, 0.33, 20);
  spokeGeo.rotateZ(-Math.PI / 2);
  const gripGeo = new THREE.CapsuleGeometry(0.0235, 0.082, 8, 24);
  gripGeo.rotateZ(Math.PI / 2);
  const collarGeo = new THREE.CylinderGeometry(0.0265, 0.0265, 0.012, 24);
  collarGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    const s = new THREE.Group();
    s.rotation.z = a;
    const sp = new THREE.Mesh(spokeGeo, m.front);
    sp.position.x = 0.1 + 0.165;
    s.add(sp);
    const collarRing = new THREE.Mesh(collarGeo, m.frontBrass);
    collarRing.position.x = 0.43;
    s.add(collarRing);
    const grip = new THREE.Mesh(gripGeo, m.front);
    grip.position.x = 0.49;
    s.add(grip);
    wheel.add(s);
  }

  const pose: VaultDoor["pose"] = (wheelAngle, thrown, swing) => {
    wheel.rotation.z = wheelAngle;
    sun.rotation.z = wheelAngle;
    pinions.forEach((p) => {
      p.rotation.z = -wheelAngle * (16 / 18);
    });
    // Planet gears run the cam, so the whole train visibly answers the wheel.
    const camTurn = thrown * CAM_MAX + wheelAngle * 0.05;
    cam.rotation.z = camTurn;
    const theta = thrown * CAM_MAX;
    for (const b of bolts) {
      const px = Math.cos(b.a + camTurn) * CAM_R;
      const py = Math.sin(b.a + camTurn) * CAM_R;
      const sin = Math.sin(theta);
      const tail = CAM_R * Math.cos(theta) + Math.sqrt(ROD_L * ROD_L - (CAM_R * sin) ** 2);
      const dx = Math.cos(b.a);
      const dy = Math.sin(b.a);
      // Rest the bolt so its tip reaches into the frame when thrown.
      const tailX = dx * (tail + 0.05);
      const tailY = dy * (tail + 0.05);
      const mid = 0.161;
      b.bolt.position.set(tailX + dx * mid, tailY + dy * mid, 0);
      b.bolt.rotation.z = b.a;
      b.pin.position.set(px, py, 0.016);
      const rx = tailX - px;
      const ry = tailY - py;
      const len = Math.hypot(rx, ry);
      b.rod.position.set(px + rx / 2, py + ry / 2, 0.006);
      b.rod.rotation.z = Math.atan2(ry, rx);
      b.rod.scale.x = len;
    }
    leaf.rotation.y = swing;
  };
  pose(0, 0, 0);

  return { group, leaf, frame, pose };
}
