"use client";

import { useEffect, useRef } from "react";
import { liveBook, money } from "@/lib/live";
import { onFrame, pinProgress, reducedMotion, smooth } from "@/lib/loop";

/**
 * The whole balance sheet in two lines. They arrive from opposite sides and only mean anything
 * once they line up, digit over digit. The figures themselves run from the clock, never from the scroll.
 */
export function Book() {
  const root = useRef<HTMLElement>(null);
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const tally = useRef<HTMLDivElement>(null);
  const rule = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = reducedMotion();
    return onFrame(() => {
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > window.innerHeight + 100) return;
      const v = `$${money(liveBook())}`;
      el.querySelectorAll<HTMLElement>("[data-book]").forEach((n) => {
        if (n.textContent !== v) n.textContent = v;
      });
      const t = reduced ? 1 : pinProgress(el);
      const meet = smooth(0.02, 0.56, t);
      a.current!.style.transform = `translate3d(${(meet - 1) * 58}vw, 0, 0)`;
      b.current!.style.transform = `translate3d(${(1 - meet) * 58}vw, 0, 0)`;
      const land = smooth(0.56, 0.74, t);
      rule.current!.style.transform = `scaleX(${land})`;
      tally.current!.style.opacity = String(smooth(0.6, 0.76, t));
      tally.current!.style.transform = `translate3d(0, ${(1 - smooth(0.6, 0.8, t)) * 40}px, 0)`;
    });
  }, []);

  return (
    <section ref={root} className="book" data-tone="ink">
      <div className="book-pin">
        <h2 className="book-h">Our whole balance sheet fits on two lines.</h2>
        <div className="book-lines">
          <div ref={a} className="book-line">
            <small>What we owe customers</small>
            <p data-book>$4,218,902,113.40</p>
          </div>
          <div ref={b} className="book-line">
            <small>What we hold for them</small>
            <p data-book>$4,218,902,113.40</p>
          </div>
          <div ref={rule} className="book-rule" />
        </div>
        <div ref={tally} className="book-tally">
          <div className="book-diff">
            <small>Difference</small>
            <strong>$0.00</strong>
          </div>
          <dl className="book-mix">
            <div>
              <dt>62.4%</dt>
              <dd>Government bills, 13 weeks or shorter</dd>
            </div>
            <div>
              <dt>37.6%</dt>
              <dd>Reserves at the central bank</dd>
            </div>
            <div className="is-zero">
              <dt>0.0%</dt>
              <dd>Loans. There are none to go bad.</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
