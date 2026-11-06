"use client";

import { useEffect, useRef } from "react";
import { createVaultScene, type VaultScene } from "@/gl/vault-scene";
import { onFrame, pinProgress, reducedMotion, smooth } from "@/lib/loop";

/** The hero and the walk into the vault are one pinned scene. */
export function Vault() {
  const pin = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const root = pin.current!;
    const reduced = reducedMotion();
    let scene: VaultScene | null = null;
    try {
      scene = createVaultScene(c);
    } catch (err) {
      console.warn("Vitrine: falling back to the plain hero.", err);
      document.documentElement.classList.add("no-gl");
      return;
    }
    document.fonts?.ready.then(() => scene?.refreshType());

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      scene?.setPointer(nx, ny, e.pointerType === "mouse");
    };
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("a,button,input")) return;
      if (root.getBoundingClientRect().top > -40) scene?.kick();
    };
    const onLeave = () => scene?.setPointer(0, 0, false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    const onResize = () => scene?.resize();
    window.addEventListener("resize", onResize);

    const off = onFrame((now) => {
      const r = root.getBoundingClientRect();
      if (r.bottom < -40 || r.top > window.innerHeight + 40) {
        stage.current?.style.setProperty("visibility", "hidden");
        return;
      }
      const t = reduced ? (pinProgress(root) > 0.5 ? 1 : 0) : pinProgress(root);
      const s = stage.current!;
      s.style.setProperty("--t", t.toFixed(4));
      s.style.visibility = t >= 0.999 ? "hidden" : "visible";
      // The plate has filled the screen by now; dissolve into the real stage underneath.
      s.style.opacity = (1 - smooth(0.985, 0.998, t)).toFixed(3);
      s.style.setProperty("--copy", (1 - smooth(0.0, 0.06, t)).toFixed(3));
      s.style.setProperty("--beat", (smooth(0.67, 0.71, t) * (1 - smooth(0.8, 0.83, t))).toFixed(3));
      scene?.setProgress(t);
      scene?.frame(now);
    });

    return () => {
      off();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
      scene?.dispose();
    };
  }, []);

  return (
    <section ref={pin} id="top" className="vault" aria-label="Vitrine">
      <div ref={stage} className="vault-stage">
        <canvas ref={canvas} className="vault-canvas" aria-hidden="true" />
        <h1 className="vault-h1">Look inside your bank.</h1>
        <div className="hero-foot">
          <p className="hero-lede">
            Vitrine holds every deposit in full, in reserves you can check yourself. We never lend a cent of it, so a run
            can&rsquo;t close us.
          </p>
          <div className="hero-act">
            <a className="btn btn--ink" href="#open">
              Open an account
            </a>
            <a className="btn-text" href="#run">
              See what happens in a run
            </a>
          </div>
        </div>
        <p className="vault-label">
          <strong>Your deposit, on its own shelf.</strong>
          Not lent, not pledged and not borrowed against. It stays put until you take it off.
        </p>
      </div>
    </section>
  );
}
