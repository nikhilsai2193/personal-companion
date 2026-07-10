// Varied on purpose — Fogg's research on habit celebration is explicit
// that a fixed, repeated message stops registering as genuine positive
// feedback. A random pick each time keeps it feeling real.
const CHECKPOINT_LINES = [
  "nice.",
  "that's the one.",
  "keep going.",
  "one more branch.",
  "the tree noticed.",
  "logged.",
  "good move.",
];

const NODE_LINES = [
  "a whole step, done.",
  "that's a real one.",
  "the tree grew.",
  "look at that.",
  "one closer.",
];

export function pickAffirmation(isNode: boolean): string {
  const pool = isNode ? NODE_LINES : CHECKPOINT_LINES;
  return pool[Math.floor(Math.random() * pool.length)];
}
