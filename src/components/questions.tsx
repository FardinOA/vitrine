"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reducedMotion } from "@/lib/loop";
import { fontFamily } from "@/gl/textures";

const QUESTIONS = [
  {
    q: "What if Vitrine goes bust?",
    a: "Your money was never ours. The bills and reserves are held in trust in your name, so an administrator hands them back rather than sharing them out among creditors.",
    span: "wide",
  },
  {
    q: "Where do I get a mortgage?",
    a: "Somewhere else. We don't lend anything to anyone, not even a small overdraft. If you ever need that, keep an account at a lender and your savings here.",
    span: "tall",
  },
  {
    q: "What if the government doesn't pay its bills?",
    a: "That's the one risk left, and we say so. We hold nothing longer than 13 weeks, so we'd see it coming sooner than most, but no bank can be safer than the state it banks with.",
    span: "tall",
  },
  {
    q: "How do you make money?",
    a: "Six dollars a month from each account. There's no second line. If we ever add one, the books will show it the same morning.",
    span: "base",
  },
  {
    q: "Is my balance public?",
    a: "No. The public gets a fingerprint, not a figure. Only you can see your box, and only you can check that it's inside the fingerprint.",
    span: "base",
  },
  {
    q: "Someone stole my card.",
    a: "Freeze it in the app and it stops before you've put your phone down. We refund anything that went through, and the new card is with you in three days.",
    span: "wide",
  },
];

/** Room around the pane for falling glass to land in. */
const MARGIN = { x: 90, top: 30, bottom: 420 };

type Shard = { pts: [number, number][]; cx: number; cy: number; vx: number; vy: number; vr: number; a: number; x: number; y: number; delay: number };

/** Cuts the pane into wedges and rings around the point it was hit. */
function crack(w: number, h: number, px: number, py: number): Shard[] {
  const spokes = 13;
  const rings = [0.1, 0.27, 0.6, 2.2];
  const span = Math.hypot(w, h);
  const angles = Array.from({ length: spokes }, (_, i) => (i / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.3);
  const shards: Shard[] = [];
  const clip = (pts: [number, number][]) => {
    // Sutherland-Hodgman against the pane's rectangle.
    const edges: [(p: [number, number]) => boolean, (a: [number, number], b: [number, number]) => [number, number]][] = [
      [(p) => p[0] >= 0, (a, b) => { const t = (0 - a[0]) / (b[0] - a[0]); return [0, a[1] + t * (b[1] - a[1])]; }],
      [(p) => p[0] <= w, (a, b) => { const t = (w - a[0]) / (b[0] - a[0]); return [w, a[1] + t * (b[1] - a[1])]; }],
      [(p) => p[1] >= 0, (a, b) => { const t = (0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), 0]; }],
      [(p) => p[1] <= h, (a, b) => { const t = (h - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), h]; }],
    ];
    let out = pts;
    for (const [inside, cross] of edges) {
      const input = out;
      out = [];
      input.forEach((cur, i) => {
        const prev = input[(i + input.length - 1) % input.length];
        const ci = inside(cur);
        const pi = inside(prev);
        if (ci !== pi) out.push(cross(prev, cur));
        if (ci) out.push(cur);
      });
      if (!out.length) return out;
    }
    return out;
  };
  for (let s = 0; s < spokes; s++) {
    const a0 = angles[s];
    const a1 = angles[(s + 1) % spokes] + (s === spokes - 1 ? Math.PI * 2 : 0);
    let r0 = 0;
    rings.forEach((rf, ri) => {
      const r1 = rf * span * (0.88 + Math.random() * 0.24);
      const raw: [number, number][] = [
        [px + Math.cos(a0) * r0, py + Math.sin(a0) * r0],
        [px + Math.cos(a0) * r1, py + Math.sin(a0) * r1],
        [px + Math.cos(a1) * r1, py + Math.sin(a1) * r1],
        [px + Math.cos(a1) * r0, py + Math.sin(a1) * r0],
      ];
      const pts = clip(raw);
      r0 = r1;
      if (pts.length < 3) return;
      const cx = pts.reduce((v, p) => v + p[0], 0) / pts.length;
      const cy = pts.reduce((v, p) => v + p[1], 0) / pts.length;
      const dir = Math.atan2(cy - py, cx - px);
      const push = (1 - ri / rings.length) * 300 + 60;
      shards.push({
        pts, cx, cy,
        vx: Math.cos(dir) * push * (0.6 + Math.random() * 0.7),
        vy: Math.sin(dir) * push * 0.7 - 70 * Math.random(),
        vr: (Math.random() - 0.5) * 7,
        a: 0, x: 0, y: 0,
        delay: 0.09 + ri * 0.05 + Math.random() * 0.05,
      });
    });
  }
  return shards;
}

function Pane({ q, a, span, index }: { q: string; a: string; span: string; index: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [broken, setBroken] = useState(false);
  const raf = useRef(0);

  const paint = useCallback(() => {
    const c = canvas.current;
    const b = button.current;
    if (!c || !b) return null;
    const r = b.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = r.width;
    const h = r.height;
    c.width = Math.round((w + MARGIN.x * 2) * dpr);
    c.height = Math.round((h + MARGIN.top + MARGIN.bottom) * dpr);
    const img = document.createElement("canvas");
    img.width = Math.round(w * dpr);
    img.height = Math.round(h * dpr);
    const g = img.getContext("2d")!;
    g.scale(dpr, dpr);
    g.fillStyle = "#c9e6da";
    g.fillRect(0, 0, w, h);
    // A long diagonal sheen, as on any real pane.
    g.save();
    g.beginPath();
    g.moveTo(w * 0.52 + (index % 3) * 22, 0);
    g.lineTo(w * 0.72 + (index % 3) * 22, 0);
    g.lineTo(w * 0.72 - h * 0.34 + (index % 3) * 22, h);
    g.lineTo(w * 0.52 - h * 0.34 + (index % 3) * 22, h);
    g.closePath();
    g.fillStyle = "rgba(255,255,255,0.34)";
    g.fill();
    g.restore();
    g.strokeStyle = "rgba(255,255,255,0.8)";
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = "#07261d";
    const size = Math.max(26, Math.min(44, w * 0.082));
    g.font = `700 ${size}px ${fontFamily()}`;
    g.letterSpacing = `${-size * 0.022}px`;
    g.textBaseline = "top";
    const words = q.split(" ");
    const lines: string[] = [];
    let line = "";
    const pad = Math.max(20, Math.min(32, w * 0.05));
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (g.measureText(test).width > w - pad * 2 && line) {
        lines.push(line);
        line = word;
      } else line = test;
    });
    lines.push(line);
    lines.forEach((l, i) => g.fillText(l, pad, pad + i * size * 1.06));
    g.font = `600 15px ${fontFamily()}`;
    g.letterSpacing = "0px";
    g.textBaseline = "alphabetic";
    g.fillStyle = "rgba(7,38,29,0.66)";
    g.fillText("In case of doubt, break glass", pad, h - pad);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, MARGIN.x * dpr, MARGIN.top * dpr);
    return { img, ctx, dpr, w, h };
  }, [q, index]);

  // Paint only while the pane is whole, and never let a re-render cancel glass in mid-air.
  useEffect(() => {
    if (broken) return;
    paint();
    document.fonts?.ready.then(paint);
    const c = canvas.current;
    if (!c) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(c.parentElement!);
    return () => ro.disconnect();
  }, [paint, broken]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const smash = (clientX: number, clientY: number) => {
    const made = paint();
    const b = button.current;
    if (!made || !b) return;
    if (reducedMotion()) {
      setBroken(true);
      return;
    }
    const r = b.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    const { img, ctx, dpr, w, h } = made;
    const shards = crack(w, h, px, py);
    setBroken(true);
    const start = performance.now();
    let last = start;
    const step = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      let alive = false;
      const place = (sh: Shard) => {
        ctx.setTransform(dpr, 0, 0, dpr, MARGIN.x * dpr, MARGIN.top * dpr);
        ctx.translate(sh.cx + sh.x, sh.cy + sh.y);
        ctx.rotate(sh.a);
        ctx.translate(-sh.cx, -sh.cy);
      };
      for (const sh of shards) {
        if (t > sh.delay) {
          sh.vy += 2100 * dt;
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          sh.a += sh.vr * dt;
        }
        if (sh.cy + sh.y > h + MARGIN.bottom + 120) continue;
        alive = true;
        place(sh);
        ctx.beginPath();
        sh.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,0.86)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (alive && t < 2.4) raf.current = requestAnimationFrame(step);
      else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  return (
    <div className={`pane pane--${span}${broken ? " is-broken" : ""}`}>
      <div className="pane-answer" aria-hidden={!broken}>
        <h3>{q}</h3>
        <p>{a}</p>
        {broken && (
          <button
            type="button"
            className="pane-glaze"
            onClick={() => {
              cancelAnimationFrame(raf.current);
              setBroken(false);
              requestAnimationFrame(() => {
                paint();
                button.current?.focus();
              });
            }}
          >
            Reglaze
          </button>
        )}
      </div>
      <canvas ref={canvas} className="pane-glass" aria-hidden="true" />
      {!broken && (
        <button
          ref={button}
          type="button"
          className="pane-hit"
          aria-label={`${q} Break the glass to read the answer.`}
          onClick={(e) => {
            const fromKeyboard = e.detail === 0;
            const r = e.currentTarget.getBoundingClientRect();
            smash(fromKeyboard ? r.left + r.width / 2 : e.clientX, fromKeyboard ? r.top + r.height / 2 : e.clientY);
          }}
        />
      )}
    </div>
  );
}

/** The questions people are actually afraid to ask, each behind its own emergency glass. */
export function Questions() {
  return (
    <section id="questions" className="questions stage stage--paper" data-tone="ink">
      <div className="questions-head">
        <h2>The awkward questions, under glass.</h2>
        <p>Click to break one. Most banks would rather you didn&rsquo;t.</p>
      </div>
      <div className="panes">
        {QUESTIONS.map((x, i) => (
          <Pane key={x.q} q={x.q} a={x.a} span={x.span} index={i} />
        ))}
      </div>
    </section>
  );
}
