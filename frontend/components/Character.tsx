"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MonitorFace } from "./MonitorFace";

// Matches .character-placement widths (globals.css): about 52vh on phones, at most 78vh elsewhere.
const characterSizes = "(max-width: 900px) 52vh, 78vh";

export function Character({ motionEnabled }: { motionEnabled: boolean }) {
  const figure = useRef<HTMLDivElement>(null);
  const [screenReady, setScreenReady] = useState(false);
  return <div className="character-placement" aria-hidden="true">
    <div className="character-motion" ref={figure}>
      <div className="character-breath" style={motionEnabled ? undefined : { animation: "none" }}>
        {/* The page's largest paint: fetched first, sized to its drawn width (phones: about half the screen height). */}
        <Image className="character-image" src="/assets/character.png" alt="" width={1024} height={1536} preload fetchPriority="high" sizes={characterSizes} quality={80} draggable={false} />
        <div className="original-screen-glass" data-ready={screenReady}>
          <Image className="character-image" src="/assets/character-curly-v2.png" alt="" width={1024} height={1536} sizes={characterSizes} quality={80} draggable={false} onLoad={() => setScreenReady(true)} />
        </div>
        <MonitorFace motionEnabled={motionEnabled} ready={screenReady} figure={figure} />
      </div>
    </div>
  </div>;
}
