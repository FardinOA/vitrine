/** One animation frame loop for the whole page. Lenis ticks first, then everyone reads scrollY. */
type Cb = (now: number) => void;
const subs = new Set<Cb>();
let raf = 0;

function tick(now: number) {
  subs.forEach((f) => f(now));
  raf = requestAnimationFrame(tick);
}

export function onFrame(cb: Cb) {
  subs.add(cb);
  if (!raf) raf = requestAnimationFrame(tick);
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 0 when the element's top reaches the top of the viewport, 1 when its bottom reaches the bottom. */
export function pinProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span <= 0 ? 0 : clamp(-r.top / span);
}

/** 0 when the element's top enters from below, 1 when its top reaches `end` of the viewport. */
export function enterProgress(el: HTMLElement, end = 0.2) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp((vh - r.top) / (vh * (1 - end)));
}

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
