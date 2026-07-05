"use client";

import { motion } from "framer-motion";

export default function Checkbox({
  checked,
  onToggle,
  size = 20,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={checked ? "Mark incomplete" : "Mark complete"}
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-full border transition-colors duration-300 ${
        checked ? "border-ember bg-ember" : "border-bone-faint hover:border-bone"
      }`}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="absolute inset-0 text-ember-deep"
        initial={false}
        animate={{ opacity: checked ? 1 : 0, scale: checked ? 1 : 0.5 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <path
          d="M6 12.5L10 16.5L18 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </button>
  );
}
