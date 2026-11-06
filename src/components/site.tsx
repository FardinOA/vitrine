"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { onFrame, reducedMotion } from "@/lib/loop";
import { Nav } from "./nav";
import { Vault } from "./vault";
import { Where } from "./where";
import { Book } from "./book";
import { Run } from "./run";
import { Audit } from "./audit";
import { Gallery } from "./gallery";
import { Card } from "./card";
import { Fees } from "./fees";
import { Questions } from "./questions";
import { Close, Footer } from "./close";

export function Site() {
  useEffect(() => {
    document.documentElement.classList.add("js");
    if (reducedMotion()) document.documentElement.classList.add("calm");
    const lenis = reducedMotion() ? null : new Lenis({ lerp: 0.11, wheelMultiplier: 0.85, anchors: true });
    const off = onFrame((now) => lenis?.raf(now));
    return () => {
      off();
      lenis?.destroy();
    };
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Vault />
        <Where />
        <Book />
        <Run />
        <Audit />
        <Gallery />
        <Card />
        <Fees />
        <Questions />
        <Close />
      </main>
      <Footer />
    </>
  );
}
