"use client";

import { useEffect, useRef, useState } from "react";
import { createCloseScene } from "@/gl/close-scene";
import { onFrame, pinProgress, reducedMotion } from "@/lib/loop";
import { signature } from "@/lib/signature";

const COLUMNS = [
  { title: "Accounts", links: ["Everyday", "Joint", "Business", "Shelves"] },
  { title: "The books", links: ["This morning's fingerprint", "Check your box", "Quarterly audit", "How the tree works"] },
  { title: "Vitrine", links: ["Why we don't lend", "Who runs it", "Press", "Write to us"] },
];

export function Close() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof createCloseScene> | null>(null);
  const [sig, setSig] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => signature.listen(setSig), []);

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
          scene.current = createCloseScene(canvas.current!, "#c9e6da", "#07261d");
          document.fonts?.ready.then(() => scene.current?.refreshType());
        } catch {
          return;
        }
      }
      scene.current.setProgress(reduced ? 1 : pinProgress(el));
      scene.current.frame();
    });
    return () => {
      off();
      window.removeEventListener("resize", onResize);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  return (
    <section
      ref={root}
      id="open"
      className="close"
      data-tone="ink"
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        scene.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, true);
      }}
      onPointerLeave={() => scene.current?.setPointer(0, 0, false)}
    >
      <div className="close-pin">
        <canvas ref={canvas} aria-hidden="true" />
        <h2 className="sr">See for yourself.</h2>
        <form
          className={`close-form${done ? " is-done" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
            scene.current?.lock();
          }}
        >
          {done ? (
            <div className="close-done" role="status">
              <strong>Box reserved.</strong>
              <p>We&rsquo;ll write to {email} with your box number and this morning&rsquo;s fingerprint.</p>
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setDone(false);
                  scene.current?.unlock();
                }}
              >
                Use a different address
              </button>
            </div>
          ) : (
            <>
              <div className="close-fields">
                <div className="close-sign">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {sig ? <img src={sig} alt="Your signature" /> : <a href="#card">Sign your card first</a>}
                </div>
                <label>
                  <span className="sr">Email address</span>
                  <input type="email" required placeholder="you@email.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <button className="btn btn--ink" type="submit">
                  Open an account
                </button>
              </div>
              <p className="close-small">$6 a month. Takes four minutes. Leave whenever you like, and your money leaves the same day.</p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot" data-tone="light">
      <div className="foot-top">
        <p className="foot-line">A bank should be able to show you its vault.</p>
        <nav className="foot-cols" aria-label="Footer">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h3>{c.title}</h3>
              <ul>
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#top">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="foot-mark" aria-hidden="true">
        
        vitrine
      </p>
      <div className="foot-base">
        <p className="foot-legal">
          Vitrine is a sample brand made for this template. It is not a bank, holds no deposits and offers no financial
          products. All names, figures and rates are illustrative.
        </p>
        <p>
          Created by{" "}
          <a href="https://fardin.website" target="_blank" rel="noopener">
            Fardin Omor Afnan
          </a>
        </p>
      </div>
    </footer>
  );
}
