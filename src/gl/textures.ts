import * as THREE from "three";

/** A note for a currency that doesn't exist. Only ever seen small, inside a glass-fronted box. */
export function noteTexture(renderer: THREE.WebGLRenderer) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#cfe0c9";
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#3f6f58";
  g.lineWidth = 7;
  g.strokeRect(13, 13, 486, 230);
  g.lineWidth = 1.1;
  for (let i = 0; i < 26; i++) {
    g.beginPath();
    for (let a = 0; a <= 360; a += 3) {
      const t = (a * Math.PI) / 180;
      const r = 26 + i * 2.8 + Math.sin(t * 8 + i * 0.5) * (4 + i * 0.3);
      const x = 256 + Math.cos(t) * r * 1.2;
      const y = 128 + Math.sin(t) * r;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    g.stroke();
  }
  g.fillStyle = "#cfe0c9";
  g.beginPath();
  g.arc(256, 128, 42, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1f5240";
  g.font = "800 44px 'Inter Tight', system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("V", 256, 130);
  g.font = "800 40px 'Inter Tight', system-ui, sans-serif";
  g.fillText("1", 56, 60);
  g.fillText("1", 456, 196);
  // The paper band round the bundle.
  g.fillStyle = "#f2d27a";
  g.fillRect(226, 0, 60, 256);
  g.fillStyle = "#b98a1f";
  g.fillRect(226, 0, 2.5, 256);
  g.fillRect(283.5, 0, 2.5, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

export type TextLine = { text: string; x: number; y: number; align?: CanvasTextAlign };

/** Draws type into a texture so that it can sit in the scene and be bent by real glass. */
export function typeTexture(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
) {
  const c = document.createElement("canvas");
  c.width = Math.min(4096, Math.round(width));
  c.height = Math.min(4096, Math.round(height));
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, c.width, c.height);
  draw(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export function fontFamily() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-inter").trim();
  return v ? `${v}, "Inter Tight", system-ui, sans-serif` : `"Inter Tight", system-ui, sans-serif`;
}
