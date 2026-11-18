export type SearchEngineId = "duckduckgo" | "google" | "bing";

export interface SearchEngine {
  id: SearchEngineId;
  name: string;
  /** Whether results can be shown inside Janela (site allows embedding). */
  embeddable: boolean;
  build: (query: string) => string;
}

export const SEARCH_ENGINES: Record<SearchEngineId, SearchEngine> = {
  duckduckgo: {
    id: "duckduckgo",
    name: "DuckDuckGo",
    embeddable: false,
    build: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
  google: {
    id: "google",
    name: "Google",
    embeddable: true,
    build: (q) => `https://www.google.com/search?igu=1&q=${encodeURIComponent(q)}`,
  },
  bing: {
    id: "bing",
    name: "Bing",
    embeddable: true,
    build: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
};

export const INTERNAL = {
  newTab: "janela://nova-aba",
  history: "janela://historico",
  bookmarks: "janela://favoritos",
  settings: "janela://configuracoes",
} as const;

export const MAX_QUICK_LINKS = 12;
export const MAX_HISTORY = 2000;

export function isInternal(url: string) {
  return url.startsWith("janela://");
}

const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i;
const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?([/?#].*)?$/;
const LOCALHOST_RE = /^localhost(:\d+)?([/?#].*)?$/i;

export function looksLikeUrl(input: string) {
  const v = input.trim();
  if (!v || /\s/.test(v)) return false;
  if (/^https?:\/\//i.test(v) || isInternal(v)) return true;
  return DOMAIN_RE.test(v) || IPV4_RE.test(v) || LOCALHOST_RE.test(v);
}

/** Turns whatever the user typed into a URL: address, internal page or a search. */
export function resolveInput(raw: string, engine: SearchEngineId = "duckduckgo"): string {
  const input = raw.trim();
  if (!input) return INTERNAL.newTab;
  if (isInternal(input)) return input;
  if (looksLikeUrl(input)) {
    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    try {
      return new URL(withScheme).toString();
    } catch {
      /* fall through to search */
    }
  }
  return SEARCH_ENGINES[engine].build(input);
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const INTERNAL_TITLES: Record<string, string> = {
  [INTERNAL.newTab]: "Nova aba",
  [INTERNAL.history]: "Histórico",
  [INTERNAL.bookmarks]: "Favoritos",
  [INTERNAL.settings]: "Configurações",
};

export function titleFromUrl(url: string) {
  if (isInternal(url)) return INTERNAL_TITLES[url] ?? "Janela";
  const q = searchQueryOf(url);
  if (q) return `${q} — busca`;
  return hostOf(url);
}

export function faviconFor(url: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`;
}

/** Returns the search term when the URL is a search-results page. */
export function searchQueryOf(url: string): string | null {
  try {
    const u = new URL(url);
    const isSearchHost = /(duckduckgo|google|bing)\./.test(u.hostname);
    return isSearchHost ? u.searchParams.get("q") : null;
  } catch {
    return null;
  }
}

/** Visits are recorded only for real sites in non-anonymous tabs while global anonymous mode is off. */
export function shouldRecordHistory(url: string, tabIncognito: boolean, globalIncognito: boolean) {
  return !isInternal(url) && !tabIncognito && !globalIncognito;
}

export function greetingFor(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function groupByDay<T extends { visitedAt: number }>(items: T[], now = new Date()): DayGroup<T>[] {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y);
  const fmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const groups = new Map<string, DayGroup<T>>();
  for (const item of [...items].sort((a, b) => b.visitedAt - a.visitedAt)) {
    const d = new Date(item.visitedAt);
    const key = dayKey(d);
    let g = groups.get(key);
    if (!g) {
      const label = key === today ? "Hoje" : key === yesterday ? "Ontem" : fmt.format(d);
      g = { key, label, items: [] };
      groups.set(key, g);
    }
    g.items.push(item);
  }
  return [...groups.values()];
}

/** Sites that are known to work inside Janela. */
export const COMPATIBLE_SITES = [
  { title: "Wikipedia", url: "https://pt.wikipedia.org/wiki/Wikip%C3%A9dia:P%C3%A1gina_principal" },
  {
    title: "OpenStreetMap",
    url: "https://www.openstreetmap.org/export/embed.html?bbox=-46.75%2C-23.65%2C-46.55%2C-23.5&layer=mapnik",
  },
  { title: "Excalidraw", url: "https://excalidraw.com/" },
  { title: "tldraw", url: "https://www.tldraw.com/" },
  { title: "Internet Archive", url: "https://archive.org/" },
  { title: "Primeiro site da web", url: "https://info.cern.ch/" },
  { title: "Google", url: "https://www.google.com/webhp?igu=1" },
  { title: "Bing", url: "https://www.bing.com/" },
];
