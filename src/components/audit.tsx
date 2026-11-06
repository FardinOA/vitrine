"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { money } from "@/lib/live";
import { onFrame, reducedMotion, smooth } from "@/lib/loop";
import { sha256 } from "@/lib/sha256";

const ACCOUNTS: [string, number][] = [
  ["1207", 1240000],
  ["2298", 356120],
  ["3051", 9182044],
  ["4821", 4821052],
  ["5560", 77310],
  ["6114", 2204500],
  ["7702", 618233],
  ["8839", 14500000],
];

const COLOURS = ["#07261d", "#0f6b4f", "#2fae84", "#a9d4c3", "#e6b53a", "#b98a1f", "#ee4323", "#d8ddd4"];

function build(amounts: number[]) {
  const levels: string[][] = [ACCOUNTS.map(([id], i) => sha256(`box:${id}|cents:${amounts[i]}`))];
  while (levels[levels.length - 1].length > 1) {
    const prev = levels[levels.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) next.push(sha256(prev[i] + prev[i + 1]));
    levels.push(next);
  }
  return levels;
}

function Print({ hash, delay, big, label }: { hash: string; delay: number; big?: boolean; label?: string }) {
  const cells = hash.slice(0, big ? 40 : 16);
  return (
    <div className={`hash${big ? " hash--big" : ""}`} title={hash} role="img" aria-label={label ?? `Fingerprint ${hash.slice(0, 12)}`}>
      {Array.from(cells).map((c, i) => (
        <i key={i} style={{ background: COLOURS[parseInt(c, 16) % 8], transitionDelay: `${delay + i * 7}ms` }} />
      ))}
    </div>
  );
}

const ORIGINAL = ACCOUNTS.map(([, a]) => a);
const PUBLISHED = build(ORIGINAL);
const YOURS = 3;

/** A real Merkle tree, hashed in the visitor's browser. Take one cent and watch which colours change. */
export function Audit() {
  const [amounts, setAmounts] = useState(ORIGINAL);
  const levels = useMemo(() => build(amounts), [amounts]);
  const root = levels[levels.length - 1][0];
  const published = PUBLISHED[PUBLISHED.length - 1][0];
  const ok = root === published;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reducedMotion()) return;
    return onFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      const tree = el.querySelector<HTMLElement>(".tree");
      if (!tree) return;
      const tr = tree.getBoundingClientRect();
      // The tree grows up from the leaves as it comes into view.
      const p = (window.innerHeight * 0.98 - tr.top) / (tr.height + window.innerHeight * 0.18);
      [3, 2, 1, 0].forEach((row, i) => {
        const a = 0.02 + i * 0.2;
        const k = smooth(a, a + 0.24, p);
        tree.style.setProperty(`--g${row}`, k.toFixed(3));
      });
    });
  }, []);

  const steal = () =>
    setAmounts((a) => a.map((v, i) => (i === YOURS ? v - 1 : v)));
  const restore = () => setAmounts(ORIGINAL);
  const changed = amounts.map((a, i) => a !== ORIGINAL[i]);
  // Which node on each level sits above a changed account.
  const hot = (level: number, i: number) =>
    changed.some((c, idx) => c && idx >> level === i);

  return (
    <section ref={ref} id="audit" className="audit stage stage--paper" data-tone="ink">
      <div className="audit-head">
        <h2>
          Don&rsquo;t trust us.
          <br />
          Steal a cent.
        </h2>
        <div className="audit-side">
          <p>
            Each morning we publish one fingerprint made from every box we hold. Change any figure anywhere and the
            fingerprint no longer matches. That&rsquo;s real SHA-256 running in your browser, not a film of it.
          </p>
          <div className="audit-act">
            <button type="button" className="btn btn--ink" onClick={steal}>
              Take 1¢ from box 4821
            </button>
            {!ok && (
              <button type="button" className="btn-text" onClick={restore}>
                Put it back
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="tree">
        <div className="tree-root" style={{ opacity: "var(--g0, 1)" }}>
          <div className="tree-root-col">
            <small>Published this morning</small>
            <Print hash={published} delay={0} big label="The published fingerprint" />
          </div>
          <div className={`tree-verdict${ok ? "" : " is-bad"}`} aria-live="polite">
            {ok ? "Books match" : "Books don’t match"}
          </div>
          <div className="tree-root-col">
            <small>Your browser, just now</small>
            <Print hash={root} delay={560} big label={ok ? "Your fingerprint, matching" : "Your fingerprint, not matching"} />
          </div>
        </div>

        {[2, 1].map((lv, row) => (
          <div key={lv} className={`tree-row tree-row--${lv}`} style={{ opacity: `var(--g${row + 1}, 1)`, transform: `translateY(calc((1 - var(--g${row + 1}, 1)) * 40px))` }}>
            {levels[lv].map((h, i) => (
              <div key={i} className={`tree-node${hot(lv, i) ? " is-hot" : ""}`}>
                <Print hash={h} delay={(lv) * 170} />
              </div>
            ))}
          </div>
        ))}

        <div className="tree-row tree-row--0" style={{ opacity: "var(--g3, 1)", transform: "translateY(calc((1 - var(--g3, 1)) * 40px))" }}>
          {ACCOUNTS.map(([id], i) => (
            <div key={id} className={`tree-leaf${i === YOURS ? " is-yours" : ""}${changed[i] ? " is-hot" : ""}`}>
              <small>Box {id}</small>
              <b>${money(amounts[i] / 100)}</b>
              <Print hash={levels[0][i]} delay={0} />
            </div>
          ))}
        </div>
      </div>
      <p className="audit-note">Other customers&rsquo; boxes are shown as numbers only. In the real thing, you see your own figure and the hashes beside it.</p>
    </section>
  );
}
