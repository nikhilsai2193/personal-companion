"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PHASES = [
  "reading your plan…",
  "finding what comes first…",
  "mapping the path…",
];

// Same cinematic register as FinalizeOverlay — a full-screen moment, not a
// spinner, for the one point in the app where an LLM call is genuinely in
// flight and worth a beat of anticipation.
export default function ProcessingOverlay({ title }: { title: string }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink px-6"
    >
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="text-eyebrow text-ember"
      >
        mapping a goal
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.1, ease: EASE }}
        className="font-display mt-4 max-w-3xl text-center text-[10vw] leading-none md:text-7xl"
      >
        {title.toUpperCase()}
      </motion.h1>
      <div className="mt-12 h-px w-full max-w-md bg-ink-3">
        <motion.div
          className="h-px bg-ember"
          animate={{ width: ["0%", "100%"] }}
          transition={{ duration: 5.4, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.p
        key={phase}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 text-xs tracking-[0.14em] text-bone-muted"
      >
        {PHASES[phase]}
      </motion.p>
    </motion.div>
  );
}
