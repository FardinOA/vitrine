"use client";

import { useEffect, useRef, useState } from "react";
import { createCardScene } from "@/gl/card-scene";
import { onFrame, pinProgress, reducedMotion, smooth } from "@/lib/loop";
import { signature } from "@/lib/signature";

/** The divider between two sections turns out to be the card, edge-on. */
export function Card() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createCardScene> | null>(null);
  const [signed, setSigned] = useState(false);
  const [touchSign, setTouchSign] = useState(false);

  useEffect(() => {
    const reduced = reducedMotion();
    const onResize = () => scene.current?.resize();
    window.addEventListener("resize", onResize);
    const off = onFrame(() => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 300) return;
      if (!scene.current) {
        try {
          scene.current = createCardScene(canvas.current!, "#07261d");
          scene.current.onFirstInk(() => setSigned(true));
          document.fonts?.ready.then(() => scene.current?.refreshType());
        } catch {
          return;
        }
      }
      const t = reduced ? 1 : pinProgress(el);
      pin.current?.style.setProperty("--in", smooth(0.34, 0.5, t).toFixed(3));
      scene.current.setProgress(t);
      scene.current.frame();
    });
    return () => {
      off();
      window.removeEventListener("resize", onResize);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  const commit = () => {
    signature.set(scene.current?.snapshot() ?? null);
  };

  return (
    <section ref={root} id="card" className="cardsec" data-tone="light">
      <div ref={pin} className="cardsec-pin">
        <canvas
          ref={canvas}
          className={touchSign ? "is-signing" : ""}
          aria-label="A clear glass payment card. Draw on it with a mouse or pen to sign it."
          role="img"
          onPointerMove={(e) => {
            const s = scene.current;
            if (!s) return;
            s.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
            s.penMove(e.clientX, e.clientY);
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch" && !touchSign) return;
            if (scene.current?.penDown(e.clientX, e.clientY)) e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerUp={() => {
            scene.current?.penUp();
            commit();
          }}
          onPointerCancel={() => scene.current?.penUp()}
        />
        <h2 className="cardsec-h">The card is glass too.</h2>
        <p className="cardsec-p">Clear enough to see the chip and the antenna. Your own signature is the only decoration, etched in before it ships.</p>
        <div className="cardsec-act">
          <p className="cardsec-hint">{signed ? "That’s going on your card." : "Draw on the card with your mouse."}</p>
          <button
            type="button"
            className="cardsec-touch"
            onClick={() => setTouchSign((v) => !v)}
          >
            {touchSign ? "Done signing" : "Sign with your finger"}
          </button>
          {signed && (
            <button
              type="button"
              className="cardsec-clear"
              onClick={() => {
                scene.current?.clear();
                signature.set(null);
                setSigned(false);
              }}
            >
              Wipe it clean
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
