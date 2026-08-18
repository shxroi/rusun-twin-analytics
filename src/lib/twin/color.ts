/**
 * Resolve a CSS design token to a hex color three.js can parse.
 * Browsers serialise oklch() tokens back as `oklch(...)`, which three.js cannot
 * read, so we convert oklch → sRGB ourselves.
 */
function srgbChannel(c: number) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

export function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const hex = (n: number) => srgbChannel(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

/** Convert any computed CSS color string into something three.js accepts. */
export function cssColorToHex(value: string, fallback = "#888888"): string {
  const v = value.trim();
  if (!v) return fallback;
  if (v.startsWith("#") || v.startsWith("rgb")) return v;
  const ok = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)/i);
  if (ok) {
    const num = (raw: string, pctBase: number) =>
      raw.endsWith("%") ? (parseFloat(raw) / 100) * pctBase : parseFloat(raw);
    return oklchToHex(num(ok[1]!, 1), num(ok[2]!, 0.4), parseFloat(ok[3]!));
  }
  return fallback;
}
