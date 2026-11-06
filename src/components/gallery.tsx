"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, onFrame, pinProgress, reducedMotion, smooth } from "@/lib/loop";

function Pay() {
  const [sent, setSent] = useState(false);
  return (
    <div className="ex ex--pay">
      <div className="ex-pay-who">
        <span className="ex-av">TM</span>
        <div>
          <b>Theo Marsh</b>
          <small>Box 2298</small>
        </div>
      </div>
      <p className="ex-pay-amt">$240.00</p>
      <p className="ex-pay-for">For Saturday&rsquo;s dinner</p>
      <button type="button" className={`ex-pay-btn${sent ? " is-sent" : ""}`} onClick={() => setSent((s) => !s)}>
        {sent ? "Arrived in 3.1 seconds" : "Send now"}
      </button>
      <small className="ex-pay-time">Any hour, any day. No cut-off times.</small>
    </div>
  );
}

function Shelves() {
  const rows = [
    { name: "Rent", amt: "$1,840", fill: 1, note: "Pays itself on the 1st" },
    { name: "Tax", amt: "$6,312", fill: 0.72, note: "21% of each invoice" },
    { name: "Lisbon", amt: "$940", fill: 0.47, note: "$2,000 by June" },
  ];
  return (
    <div className="ex ex--shelves">
      {rows.map((r) => (
        <div key={r.name} className="ex-shelf">
          <div className="ex-shelf-top">
            <b>{r.name}</b>
            <b>{r.amt}</b>
          </div>
          <div className="ex-shelf-bar">
            <i style={{ width: `${r.fill * 100}%` }} />
          </div>
          <small>{r.note}</small>
        </div>
      ))}
      <button type="button" className="ex-shelf-add">
        Add a shelf
      </button>
    </div>
  );
}

function Joint() {
  const [ok, setOk] = useState(false);
  return (
    <div className="ex ex--joint">
      <p className="ex-joint-q">Roof repair, Dale &amp; Sons</p>
      <p className="ex-joint-amt">$8,400.00</p>
      <div className="ex-joint-who">
        <div className="is-signed">
          <span className="ex-av">AO</span>
          <b>Amara</b>
          <small>Approved 10:14</small>
        </div>
        <div className={ok ? "is-signed" : ""}>
          <span className="ex-av ex-av--b">JO</span>
          <b>Jonah</b>
          <small>{ok ? "Approved just now" : "Waiting for you"}</small>
        </div>
      </div>
      <button type="button" className="ex-pay-btn" onClick={() => setOk((v) => !v)}>
        {ok ? "Sent. Undo?" : "Approve as Jonah"}
      </button>
    </div>
  );
}

function Abroad() {
  const rates: [string, string, number][] = [
    ["EUR", "Euro", 0.9213],
    ["JPY", "Yen", 149.82],
    ["GBP", "Pound", 0.7741],
    ["BDT", "Taka", 121.6],
  ];
  const [amt, setAmt] = useState(1000);
  return (
    <div className="ex ex--abroad">
      <label className="ex-abroad-in">
        <small>You spend, in dollars</small>
        <input
          inputMode="numeric"
          aria-label="Amount in dollars"
          value={amt.toLocaleString("en-US")}
          onChange={(e) => setAmt(Number(e.target.value.replace(/\D/g, "")) || 0)}
        />
      </label>
      <ul>
        {rates.map(([c, n, r]) => (
          <li key={c}>
            <span>
              <b>{c}</b> {n}
            </span>
            <b>{(amt * r).toLocaleString("en-US", { maximumFractionDigits: c === "JPY" || c === "BDT" ? 0 : 2 })}</b>
          </li>
        ))}
      </ul>
      <small>The rate you see on the news. Nothing added.</small>
    </div>
  );
}

function Freeze() {
  const [frozen, setFrozen] = useState(false);
  return (
    <div className={`ex ex--freeze${frozen ? " is-frozen" : ""}`}>
      <div className="ex-card">
        <span>vitrine</span>
        <small>Box 4821</small>
        <i className="ex-frost" />
      </div>
      <button type="button" role="switch" aria-checked={frozen} className="ex-toggle" onClick={() => setFrozen((f) => !f)}>
        <span>{frozen ? "Frozen. Nothing can go through." : "Card is on"}</span>
        <i />
      </button>
      <small>Takes effect before your thumb leaves the screen.</small>
    </div>
  );
}

function Accountant() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ex ex--key">
      <p className="ex-key-t">Read-only access</p>
      <ul>
        <li>
          <span className="ex-av">PL</span>
          <div>
            <b>Priya Lund</b>
            <small>Accountant, until 31 Jan</small>
          </div>
        </li>
      </ul>
      <div className="ex-key-can">
        <span>Can see moves and statements</span>
        <span className="no">Can&rsquo;t move a cent</span>
      </div>
      <button type="button" className="ex-pay-btn" onClick={() => setCopied((c) => !c)}>
        {copied ? "Link copied" : "Share a read-only link"}
      </button>
    </div>
  );
}

const EXHIBITS: { title: string; body: string; ui: React.ReactNode }[] = [
  { title: "Payments", body: "Money moves in seconds, at any hour, because it was already sitting there.", ui: <Pay /> },
  { title: "Shelves", body: "Name a pile, feed it automatically, and see it held separately.", ui: <Shelves /> },
  { title: "Joint accounts", body: "Two people, one box. Set the sum above which you both have to agree.", ui: <Joint /> },
  { title: "Abroad", body: "Thirty-one currencies at the mid-market rate, with nothing added on.", ui: <Abroad /> },
  { title: "The freeze", body: "It works on your card, on a stolen card, and on your own late nights.", ui: <Freeze /> },
  { title: "Your accountant", body: "Give someone sight of the books without giving them the keys.", ui: <Accountant /> },
];

const GAP = 1500;

/** A walk down a gallery. Each feature stands in its own case with a museum label, and works when you reach it. */
export function Gallery() {
  const root = useRef<HTMLElement>(null);
  const world = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    const flat = () => window.innerWidth < 860;
    return onFrame(() => {
      const el = root.current;
      const w = world.current;
      if (!el || !w) return;
      if (flat()) {
        w.style.transform = "";
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const t = pinProgress(el);
      const total = GAP * (EXHIBITS.length + 1);
      const z = t * total - 200;
      // The room is drawn at one size and fitted to the window.
      const fit = Math.min(1.2, window.innerHeight / 860, window.innerWidth / 1240);
      w.style.transform = `scale3d(${fit},${fit},${fit}) translate3d(0,0,${z}px)`;
      w.querySelectorAll<HTMLElement>("[data-z]").forEach((n) => {
        const nz = Number(n.dataset.z);
        const d = nz + z; // 0 at the viewer's focus, negative when ahead.
        // Only the next case shows in the distance; the one after stays out of the way.
        const fadeIn = smooth(-GAP * 1.02, -GAP * 0.72, d);
        const fadeOut = 1 - smooth(150, 520, d);
        const op = clamp(fadeIn * fadeOut);
        n.style.opacity = op.toFixed(3);
        n.style.visibility = op < 0.01 ? "hidden" : "visible";
        n.style.pointerEvents = Math.abs(d) < 460 ? "auto" : "none";
      });
    });
  }, []);

  return (
    <section ref={root} id="everyday" className="gallery" data-tone="ink">
      <div className="gallery-pin">
        <div className="gallery-floor" aria-hidden="true" />
        <div className="gallery-space">
          <div ref={world} className="gallery-world">
            {Array.from({ length: (EXHIBITS.length + 2) * 3 }, (_, i) => (
              <i key={i} className="gallery-seam" aria-hidden="true" style={{ transform: `translate3d(-15000px, 372px, ${800 - i * (GAP / 3)}px) rotateX(90deg)` }} />
            ))}
            <div className="gallery-title" data-z={0} style={{ transform: "translate3d(-50%,-50%,0)" }}>
              <h2>Everything else a bank does.</h2>
            </div>
            {EXHIBITS.map((e, i) => {
              const z = -(i + 1) * GAP;
              const side = i % 2 === 0 ? -1 : 1; // Which wall the case stands against.
              return (
                <article
                  key={e.title}
                  className="case"
                  data-z={z}
                  data-side={side}
                  style={{ transform: `translate3d(-50%, -50%, ${z}px)` }}
                >
                  <div className="case-stand">
                    <div className="case-glass">{e.ui}</div>
                    <div className="case-plinth" aria-hidden="true" />
                  </div>
                  <div className="case-label">
                    <h3>{e.title}</h3>
                    <p>{e.body}</p>
                  </div>
                </article>
              );
            })}
            <div
              className="gallery-title gallery-title--end"
              data-z={-(EXHIBITS.length + 1) * GAP}
              style={{ transform: `translate3d(-50%,-50%,${-(EXHIBITS.length + 1) * GAP}px)` }}
            >
              <p>Except lend.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
