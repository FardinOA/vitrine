"use client";

import { useEffect, useRef, useState } from "react";
import { createRunScene, HELD } from "@/gl/run-scene";
import { clamp, enterProgress, onFrame, smooth } from "@/lib/loop";

const SPEED = 15;

/** A bank run you can start yourself. Hold the button and everyone asks for their money at once. */
export function Run() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const holding = useRef(false);
  const paid = useRef(0);
  const [shown, setShown] = useState(0);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let scene: ReturnType<typeof createRunScene> | null = null;
    let last = performance.now();
    let closed = 0;
    let shownNow = 0;
    const onResize = () => scene?.resize();
    window.addEventListener("resize", onResize);
    const off = onFrame((now) => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (r.bottom < -300 || r.top > window.innerHeight + 400) return;
      if (!scene) {
        try {
          scene = createRunScene(canvas.current!, "#e9ece5");
        } catch {
          return;
        }
      }
      if (holding.current && paid.current < 100) {
        // A run starts slowly and then doesn't.
        const pace = 0.5 + Math.min(1.5, paid.current / 22);
        paid.current = Math.min(100, paid.current + dt * SPEED * pace);
        // The hold button unmounts here, so its pointerup will never arrive.
        if (paid.current >= 100) {
          holding.current = false;
          el.classList.remove("is-holding");
        }
      }
      const n = Math.floor(paid.current);
      if (n !== shownNow) {
        shownNow = n;
        setShown(n);
      }
      const target = paid.current >= HELD ? 1 : 0;
      closed += (target - closed) * (target ? Math.min(1, dt * 7) : 0.2);
      const enter = smooth(0, 0.9, enterProgress(el, 0.3));
      scene.render(paid.current, closed, enter, pointer.current.x, pointer.current.y);
    });
    return () => {
      off();
      window.removeEventListener("resize", onResize);
      scene?.dispose();
    };
  }, []);

  const start = () => {
    if (paid.current >= 100) return;
    holding.current = true;
    root.current?.classList.add("is-holding");
  };
  const stop = () => {
    holding.current = false;
    root.current?.classList.remove("is-holding");
  };
  const reset = () => {
    paid.current = 0;
    setShown(0);
  };
  const done = shown >= 100;
  const leftPaid = Math.min(shown, HELD);

  return (
    <section
      ref={root}
      id="run"
      className="run stage stage--chalk"
      data-tone="ink"
      onPointerMove={(e) => {
        pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }}
    >
      <div className="run-head">
        <h2>Go on. Start a run.</h2>
        <p>
          In March 2023, customers of one American bank asked for $42 billion in a single day. It was closed by the next
          morning. The money wasn&rsquo;t missing. It was tied up in long-term loans and bonds.
        </p>
      </div>
      <div className="run-view">
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      <div className="run-foot">
        <div className={`run-tally${shown >= HELD ? " is-closed" : ""}`}>
          <strong>
            {leftPaid}
            <span> of 100 paid</span>
          </strong>
          <p>{shown >= HELD ? "Everyone else is standing in the street." : "A typical bank: about 12 in every 100 dollars on hand."}</p>
        </div>
        <div className="run-act">
          {done ? (
            <button type="button" className="run-btn run-btn--reset" onClick={reset}>
              Put it all back
            </button>
          ) : (
            <button
              type="button"
              className="run-btn"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                start();
              }}
              onPointerUp={stop}
              onPointerCancel={stop}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                  e.preventDefault();
                  start();
                }
              }}
              onKeyUp={stop}
              onBlur={stop}
            >
              <span className="run-fill" style={{ transform: `scaleX(${clamp(shown / 100)})` }} />
              <span className="run-label">{shown === 0 ? "Press and hold to panic" : "Keep holding"}</span>
            </button>
          )}
        </div>
        <div className="run-tally run-tally--r">
          <strong>
            {shown}
            <span> of 100 paid</span>
          </strong>
          <p>{done ? "Everyone paid. Doors still open." : "Vitrine: 100 in every 100 dollars on hand."}</p>
        </div>
      </div>
      <p className="run-note" aria-live="polite">
        {done ? "A run on Vitrine is just a very busy day." : "An illustration, not a forecast. Real banks also have deposit insurance and emergency lending."}
      </p>
    </section>
  );
}
