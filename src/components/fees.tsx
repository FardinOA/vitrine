"use client";

import { useEffect, useRef } from "react";
import { onFrame, pinProgress, reducedMotion, smooth } from "@/lib/loop";

const FEES = [
  "Overdraft fee", "Returned item fee", "Monthly maintenance", "Minimum balance fee", "Paper statement fee",
  "Stop payment fee", "Wire fee, domestic", "Wire fee, abroad", "Dormant account fee", "Early closure fee",
  "Foreign transaction fee", "Out-of-network cash fee", "Cashier’s check fee", "Excess withdrawal fee",
  "Card replacement fee", "Account research, per hour", "Legal process fee", "Coin counting fee",
  "Statement copy fee", "Check image fee", "Sustained overdraft fee", "Inactivity fee", "Teller visit fee", "Balance enquiry fee",
];

/** A real bank's fee schedule, struck off line by line with the scroll, until one price is left. */
export function Fees() {
  const root = useRef<HTMLElement>(null);
  const wall = useRef<HTMLDivElement>(null);
  const price = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = reducedMotion();
    return onFrame(() => {
      const el = root.current;
      if (!el || !wall.current || !price.current) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const t = reduced ? 1 : pinProgress(el);
      const items = wall.current.children;
      const n = items.length;
      const span = 0.62;
      for (let i = 0; i < n; i++) {
        const a = 0.03 + (i / n) * span;
        const k = smooth(a, a + 0.05, t);
        (items[i] as HTMLElement).style.setProperty("--k", k.toFixed(3));
      }
      const clearOut = smooth(0.7, 0.84, t);
      wall.current.style.opacity = String(1 - clearOut);
      wall.current.style.transform = `translate3d(0, ${-clearOut * 16}vh, 0) scale(${1 - clearOut * 0.06})`;
      const up = smooth(0.74, 0.9, t);
      price.current.style.opacity = String(up);
      price.current.style.transform = `translate3d(0, ${(1 - up) * 18}vh, 0)`;
      price.current.style.pointerEvents = up > 0.8 ? "auto" : "none";
    });
  }, []);

  return (
    <section ref={root} id="fees" className="fees" data-tone="light">
      <div className="fees-pin">
        <div className="fees-stage">
          <div ref={wall} className="fees-wall" aria-label="Fees other banks charge, which Vitrine doesn't">
            {FEES.map((f) => (
              <span key={f} className="fee">
                {f}
              </span>
            ))}
          </div>
          <div ref={price} className="fees-price">
            <p className="fees-big">
              $6<span>a month.</span>
            </p>
            <div className="fees-rest">
              <p>That&rsquo;s the whole list. We can&rsquo;t earn on your money, so we charge for looking after it, and everything your money earns goes to you.</p>
              <a className="btn btn--paper" href="#open">
                Open an account
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
