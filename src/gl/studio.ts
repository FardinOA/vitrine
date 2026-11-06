import * as THREE from "three";

/**
 * Polished steel and clear glass show nothing except the room they sit in, so the room is
 * designed for them: long hard strip lights make the bright streaks on bolts and rims, and
 * dark flags give those streaks an edge to stop at. No HDRI, nothing to download.
 */
export function bakeStudio(renderer: THREE.WebGLRenderer, base = 0.62) {
  const room = new THREE.Scene();
  room.background = new THREE.Color("#eef5f1").multiplyScalar(base);

  const panel = (w: number, h: number, x: number, y: number, z: number, power: number, color = "#ffffff") => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }),
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };

  panel(16, 7, 0, 9, 2, 3.4);
  panel(1.4, 15, -7, 1, 8, 9);
  panel(0.6, 15, 7.5, 0, 7, 7);
  panel(10, 0.7, 0, -5, 8, 3.2);
  panel(3, 11, -10, 1, -4, 3);
  panel(3, 11, 10, 1, -4, 3);
  panel(14, 12, 0, -9, 0, 0.5, "#cfe4da");
  // Behind the camera: flat faces looking straight back need something bright to mirror.
  panel(7, 7, 0, 0, 11, 0.86);
  // Flags: without these, chrome reads as flat grey.
  panel(2.2, 18, 5.2, 0, 8, 0.02);
  panel(2.2, 18, -4.6, 0, 8.5, 0.02);
  panel(18, 1.8, 0, 6.2, 8, 0.03);
  panel(18, 1.4, 0, -6, 8, 0.05);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(room, 0.03);
  pmrem.dispose();
  room.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return rt.texture;
}
