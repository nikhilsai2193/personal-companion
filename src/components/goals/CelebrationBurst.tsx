"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { pickAffirmation } from "@/lib/celebrationCopy";

export type Celebration = { tier: "checkpoint" | "node"; key: number };

// A genuine, immediate (Fogg's "Shine") beat right after a checkpoint or a
// whole step completes — deliberately brief and non-blocking (pointer
// events pass through) so it never gets in the way of the next click.
export default function CelebrationBurst({
  celebration,
  onDone,
}: {
  celebration: Celebration | null;
  onDone: () => void;
}) {
  const isNode = celebration?.tier === "node";

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(onDone, isNode ? 2200 : 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration]);

  const particleCount = isNode ? 14 : 8;

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key={celebration.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center"
        >
          <div className="relative flex items-center justify-center">
            <p
              className={`font-voice relative z-10 whitespace-nowrap italic text-bone ${
                isNode ? "text-2xl" : "text-lg"
              }`}
            >
              {pickAffirmation(isNode)}
            </p>
            {Array.from({ length: particleCount }, (_, i) => {
              const angle = (Math.PI * 2 * i) / particleCount;
              const dist = isNode ? 60 + Math.random() * 40 : 30 + Math.random() * 20;
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    scale: 0,
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="absolute h-1.5 w-1.5 rounded-full bg-ember"
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
