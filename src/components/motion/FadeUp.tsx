"use client";

import { motion } from "framer-motion";

const EASE_FILM: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: EASE_FILM }}
    >
      {children}
    </motion.div>
  );
}
