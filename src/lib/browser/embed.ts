export type FrameVerdict = { embeddable: boolean; reason: "x-frame-options" | "csp" | null };

/** Decides from response headers whether a page may be shown inside an iframe on another site. */
export function evaluateFramingHeaders(xfo: string | null, csp: string | null): FrameVerdict {
  const ancestors = csp?.match(/frame-ancestors\s+([^;,]*)/i)?.[1]?.trim();
  if (ancestors !== undefined) {
    const sources = ancestors.toLowerCase().split(/\s+/).filter(Boolean);
    const open = sources.some((s) => s === "*" || s === "https:" || s === "https://*");
    return open ? { embeddable: true, reason: null } : { embeddable: false, reason: "csp" };
  }
  const x = xfo?.toLowerCase() ?? "";
  if (/deny|sameorigin|allow-from/.test(x)) return { embeddable: false, reason: "x-frame-options" };
  return { embeddable: true, reason: null };
}

export function extractTitle(html: string): string | null {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!raw) return null;
  const decoded = raw
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return decoded ? decoded.slice(0, 140) : null;
}

export function isPrivateHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "::1" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    /^(127|10|0)\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}
