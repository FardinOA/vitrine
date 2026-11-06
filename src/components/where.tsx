"use client";

import { useEffect, useRef, useState } from "react";
import { BALANCE, interestPerSecond, liveBalance, money, RATE } from "@/lib/live";
import { clamp, onFrame, pinProgress, reducedMotion, smooth } from "@/lib/loop";
import { DoorMark } from "./nav";

const HOLDINGS = [
  { id: "Reserves", detail: "Overnight, at the central bank", when: "Tonight", amount: 12052.63, rate: "3.90%" },
  { id: "4-week bill", detail: "Government, matures 4 Dec", when: "4 Dec", amount: 8125.0, rate: "4.02%" },
  { id: "8-week bill", detail: "Government, matures 1 Jan", when: "1 Jan", amount: 10400.0, rate: "4.11%" },
  { id: "13-week bill", detail: "Government, matures 5 Feb", when: "5 Feb", amount: 12300.0, rate: "4.31%" },
  { id: "13-week bill", detail: "Government, matures 12 Feb", when: "12 Feb", amount: 5332.89, rate: "4.33%" },
];

const MOVES = [
  { who: "Harbour Rent Co", when: "Today, 09:02", amt: -1840, tag: "H" },
  { who: "Paid to you, Lindqvist Studio", when: "Yesterday", amt: 6200, tag: "L" },
  { who: "Market Hall", when: "Yesterday", amt: -62.4, tag: "M" },
  { who: "Northline Rail", when: "Mon", amt: -38, tag: "N" },
  { who: "Interest, last month", when: "1 Nov", amt: 164.27, tag: "%" },
  { who: "Vitrine, monthly fee", when: "1 Nov", amt: -6, tag: "V" },
  { who: "Tate & Rye", when: "30 Oct", amt: -21.5, tag: "T" },
];

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3.5 10.5 11 4l7.5 6.5V18a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" />,
  where: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="M11 3.5v15M3.5 11h15" />
    </>
  ),
  moves: <path d="M4 8h13l-3.5-3.5M18 14H5l3.5 3.5" />,
  proof: <path d="M11 3 4.5 5.5v5c0 4 2.8 7 6.5 8.5 3.7-1.5 6.5-4.5 6.5-8.5v-5zM8 11l2.2 2.2L14.3 9" />,
  card: (
    <>
      <rect x="3" y="5.5" width="16" height="11" rx="2" />
      <path d="M3 9.5h16" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Fingerprint({ seed }: { seed: string }) {
  const colours = ["#f5f5ef", "#1f8a68", "#2fae84", "#a9d4c3", "#e6b53a", "#b98a1f", "#ee4323", "#7fcdb0"];
  return (
    <div className="print" aria-hidden="true">
      {Array.from(seed).map((c, i) => (
        <i key={i} style={{ background: colours[parseInt(c, 16) % 8] }} />
      ))}
    </div>
  );
}

/** The account as a customer sees it. The main screen answers the one question a bank usually won't. */
function App() {
  const bal = useRef<HTMLSpanElement>(null);
  const sub = useRef<HTMLSpanElement>(null);
  const today = useRef<HTMLSpanElement>(null);
  const seen = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    return onFrame(() => {
      const v = liveBalance();
      if (bal.current) {
        const s = money(v, 6);
        const cut = s.indexOf(".") + 3;
        bal.current.textContent = s.slice(0, cut);
        sub.current!.textContent = s.slice(cut);
      }
      if (today.current) {
        const secs = 72000 + (v - BALANCE) / interestPerSecond(BALANCE);
        today.current.textContent = money(secs * interestPerSecond(BALANCE), 4);
      }
      if (seen.current) {
        seen.current.textContent = String(4 + Math.floor((performance.now() / 1000) % 60));
      }
    });
  }, []);

  const total = HOLDINGS.reduce((a, h) => a + h.amount, 0);
  const shades = ["#0f6b4f", "#2fae84", "#7fcdb0", "#a9d4c3", "#cfe7dd"];

  return (
    <div className="app" role="group" aria-label="The Vitrine app, showing where a sample balance is held tonight">
      <aside className="app-rail">
        <span className="app-rail-logo">
          <DoorMark size={28} />
        </span>
        {(["home", "where", "moves", "proof", "card"] as const).map((n, i) => (
          <span key={n} className={`app-rail-i${i === 1 ? " is-on" : ""}`}>
            <Icon name={n} />
          </span>
        ))}
        <span className="app-rail-me">AO</span>
      </aside>

      <div className="app-main">
        <div className="app-top">
          <div>
            <p className="app-eyebrow">Everyday, Box 4821</p>
            <p className="app-balance">
              <span className="app-cur">$</span>
              <span ref={bal}>48,210.52</span>
              <span ref={sub} className="app-dec" />
            </p>
          </div>
          <div className="app-earn">
            <p>Earned today</p>
            <strong>
              +$<span ref={today}>5.4400</span>
            </strong>
            <p className="app-earn-rate">{(RATE * 100).toFixed(2)}% a year, paid every second</p>
          </div>
        </div>

        <div className="app-where">
          <div className="app-where-head">
            <h3>Where it is tonight</h3>
            <span>
              {hover === null
                ? "All of it. Hover for each piece."
                : `${HOLDINGS[hover].detail}, earning ${HOLDINGS[hover].rate}`}
            </span>
          </div>
          <div className="app-strip">
            {HOLDINGS.map((h, i) => (
              <button
                key={h.when}
                type="button"
                className={`app-seg${hover === i ? " is-on" : ""}`}
                style={{ flexGrow: h.amount / total, background: shades[i], color: i < 2 ? "#fff" : "#07261d" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <b>${Math.round(h.amount / 100) / 10}k</b>
                <small>{h.when}</small>
              </button>
            ))}
          </div>
          <table className="app-table">
            <thead>
              <tr>
                <th>Held in</th>
                <th className="hide-s">Until</th>
                <th className="hide-s">Earning</th>
                <th className="r">Your share</th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h, i) => (
                <tr key={h.when} className={hover === i ? "is-on" : ""} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <td>
                    <i style={{ background: shades[i] }} />
                    {h.id}
                  </td>
                  <td className="hide-s">{h.when}</td>
                  <td className="hide-s">{h.rate}</td>
                  <td className="r">${money(h.amount)}</td>
                </tr>
              ))}
              <tr className="app-zero">
                <td>
                  <i />
                  Lent to anyone
                </td>
                <td className="hide-s">Never</td>
                <td className="hide-s">&mdash;</td>
                <td className="r">$0.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside className="app-side">
        <div className="app-box">
          <p>Box 4821 checked</p>
          <strong>
            <span ref={seen}>9</span> seconds ago
          </strong>
          <Fingerprint seed="a3f907c2e1d4586b" />
          <small>Matches this morning&rsquo;s published books</small>
        </div>
        <h3 className="app-side-h">Moves</h3>
        <ul className="app-moves">
          {MOVES.map((m) => (
            <li key={m.who}>
              <span className="app-tag">{m.tag}</span>
              <span className="app-move-who">
                {m.who}
                <small>{m.when}</small>
              </span>
              <b className={m.amt > 0 ? "is-in" : ""}>
                {m.amt > 0 ? "+" : "−"}${money(Math.abs(m.amt))}
              </b>
            </li>
          ))}
        </ul>
        <button type="button" className="app-pay">
          Pay someone
        </button>
      </aside>
    </div>
  );
}

/** The plate from the vault has become this stage. The app feeds out of a slot in it, like cash from a machine. */
export function Where() {
  const root = useRef<HTMLElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    return onFrame(() => {
      const el = root.current;
      if (!el || !lift.current || !head.current) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const t = pinProgress(el);
      const rise = smooth(0.04, 0.72, t);
      lift.current.style.transform = `translate3d(0, ${(1 - rise) * 100}%, 0)`;
      const fade = smooth(0.34, 0.66, t);
      head.current.style.transform = `translate3d(0, ${-fade * 26}vh, 0)`;
      head.current.style.opacity = String(clamp(1 - fade * 1.4));
    });
  }, []);

  return (
    <section ref={root} id="where" className="where stage stage--brass" data-tone="ink">
      <div className="where-pin">
        <div ref={head} className="where-head">
          <h2>Ask your bank where your money is tonight.</h2>
          <p>Ours answers to the cent, by name and by date, on the first screen of the app.</p>
        </div>
        <div className="where-slot">
          <div ref={lift} className="where-lift">
            <App />
          </div>
        </div>
      </div>
    </section>
  );
}
