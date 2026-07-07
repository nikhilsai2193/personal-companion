// Key rotation across however many free-tier Groq keys are configured
// (GROQ_API_KEY_1..5). Groq's free tier is ~1,000 requests/day per key —
// wildly more than one person's occasional long-term planning needs, so
// this is deliberately simple: round-robin the starting key, fail over to
// the next on a 429/5xx. A DB-tracked quota system is a clean upgrade path
// if usage ever actually approaches the ceiling, but building it now would
// be solving a problem this app doesn't have yet.
//
// Model: gpt-oss-120b, not llama-3.3-70b-versatline — near-identical free
// limits, but gpt-oss-120b is one of only two Groq models supporting
// `strict: true` JSON Schema mode, which *guarantees* schema-conformant
// output instead of best-effort. See PLAN.md M12 for the full reasoning.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

function apiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

let rotation = 0;

export class GroqNotConfiguredError extends Error {
  constructor() {
    super("No GROQ_API_KEY_1..5 configured");
    this.name = "GroqNotConfiguredError";
  }
}

export class GroqExhaustedError extends Error {
  constructor() {
    super("All Groq keys are rate-limited right now — try again in a moment");
    this.name = "GroqExhaustedError";
  }
}

export async function groqStructuredCompletion<T>({
  system,
  user,
  schemaName,
  schema,
}: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const keys = apiKeys();
  if (keys.length === 0) throw new GroqNotConfiguredError();

  const start = rotation++ % keys.length;
  let lastError: unknown;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[(start + attempt) % keys.length];
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: schemaName, strict: true, schema },
          },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Groq ${res.status} on key ${attempt + 1}/${keys.length}`);
        continue; // failover to the next key
      }
      if (!res.ok) {
        throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("Groq returned no content");
      }
      return JSON.parse(content) as T;
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        lastError = e;
        continue;
      }
      if (attempt === keys.length - 1) throw e;
      lastError = e;
    }
  }

  throw lastError instanceof Error ? new GroqExhaustedError() : lastError;
}
