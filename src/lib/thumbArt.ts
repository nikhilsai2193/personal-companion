// Generates the poster art for a finalized film: flat editorial typography
// on the app's dark palette (fixed colors — posters shouldn't change with
// the viewer's theme). Topics show their title; My Day shows the date.

const INK = "#0e0e0c";
const INK_3 = "#242017";
const BONE = "#f2f1ec";
const BONE_MUTED = "#a19d90";
const EMBER = "#d85a30";

function displayFontFamily() {
  const el = document.createElement("span");
  el.className = "font-display";
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const family = getComputedStyle(el).fontFamily;
  el.remove();
  return family || "sans-serif";
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !line) {
      line = attempt;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const rest = words.slice(lines.join(" ").split(/\s+/).length);
    if (rest.length > 0) lines[maxLines - 1] += "…";
  }
  return lines;
}

export async function makeTitleArt({
  title,
  kind,
  dateStr,
}: {
  title: string;
  kind: "DAY" | "TOPIC";
  dateStr: string;
}): Promise<Blob> {
  await document.fonts.ready;
  const family = displayFontFamily();

  const W = 1280;
  const H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const dateLabel = new Date(`${dateStr}T12:00:00`)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
    .toUpperCase();

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  // Frame hairline + ember accent bar, echoing the app's editorial cards.
  ctx.strokeStyle = INK_3;
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.fillStyle = EMBER;
  ctx.fillRect(80, 96, 56, 10);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = BONE_MUTED;
  ctx.font = `500 24px ${family}`;
  ctx.fillText(
    kind === "DAY" ? `MY DAY — ${dateLabel}` : `DAYFILM — ${dateLabel}`,
    160,
    106
  );

  const main = kind === "DAY" ? dateLabel.replace(/, \d{4}$/, "") : title;
  ctx.fillStyle = BONE;
  let size = kind === "DAY" ? 200 : 150;
  ctx.font = `${size}px ${family}`;
  let lines = wrapLines(ctx, main.toUpperCase(), W - 200, 3);
  while (lines.length > 2 && size > 90) {
    size -= 20;
    ctx.font = `${size}px ${family}`;
    lines = wrapLines(ctx, main.toUpperCase(), W - 200, 3);
  }
  const lineHeight = size * 1.04;
  const blockHeight = lines.length * lineHeight;
  let y = H / 2 + lineHeight / 2 - blockHeight / 2 + size * 0.18;
  for (const line of lines) {
    ctx.fillText(line, 80, y);
    y += lineHeight;
  }

  ctx.fillStyle = EMBER;
  ctx.font = `500 22px ${family}`;
  ctx.fillText("ONE FILM A DAY", 80, H - 88);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Poster render failed"))),
      "image/jpeg",
      0.92
    );
  });
}
