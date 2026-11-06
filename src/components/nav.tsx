"use client";

import { useEffect, useRef } from "react";
import { onFrame } from "@/lib/loop";

export function DoorMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.6" />
      <g className="door-spokes" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M16 16V6.5" />
        <path d="M16 16 25 19" />
        <path d="M16 16 21.6 23.7" />
        <path d="M16 16 10.4 23.7" />
        <path d="M16 16 7 19" />
      </g>
      <circle cx="16" cy="16" r="3.1" fill="currentColor" />
    </svg>
  );
}

const LINKS = [
  ["Where it is", "#where"],
  ["The run", "#run"],
  ["The audit", "#audit"],
  ["Fees", "#fees"],
  ["Questions", "#questions"],
];

/** No bar behind it. The small door in the logo and the button turns with the scroll, as the big one did. */
export function Nav() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const stages = () => Array.from(document.querySelectorAll<HTMLElement>("[data-tone]"));
    let list = stages();
    let n = 0;
    let lastY = window.scrollY;
    return onFrame(() => {
      const el = ref.current;
      if (!el) return;
      const y = window.scrollY;
      el.style.setProperty("--spin", `${(y / 9).toFixed(1)}deg`);
      // Headlines here run the full width, so the nav steps aside on the way down.
      if (Math.abs(y - lastY) > 6) {
        el.dataset.hide = y > lastY && y > 60 ? "1" : "0";
        lastY = y;
      }
      if (n++ % 12 !== 0) return;
      if (n % 240 === 1) list = stages();
      let tone = "ink";
      for (const s of list) {
        const r = s.getBoundingClientRect();
        if (r.top <= 34 && r.bottom > 34) tone = s.dataset.tone || "ink";
      }
      el.dataset.on = tone;
    });
  }, []);
  return (
    <header ref={ref} className="nav" data-on="ink">
      <a className="nav-logo" href="#top" aria-label="Vitrine, back to top">
        <DoorMark />
        <span>vitrine</span>
      </a>
      <nav className="nav-links" aria-label="Sections">
        {LINKS.map(([label, href]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
      <a className="nav-cta" href="#open">
        Open an account
      </a>
    </header>
  );
}
