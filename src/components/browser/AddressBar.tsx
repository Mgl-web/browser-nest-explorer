import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Lock, LockOpen, Search, Sparkles, Star } from "lucide-react";
import { Favicon } from "./Favicon";
import { currentUrl, useActiveTab, useBrowserStore } from "@/lib/browser/store";
import { FOCUS_ADDRESS_EVENT } from "@/lib/browser/loading";
import {
  INTERNAL,
  SEARCH_ENGINES,
  hostOf,
  isInternal,
  looksLikeUrl,
  resolveInput,
} from "@/lib/browser/url";
import { cn } from "@/lib/utils";

interface Suggestion {
  kind: "typed" | "site";
  url: string;
  title: string;
}

export function AddressBar() {
  const tab = useActiveTab();
  const url = currentUrl(tab);
  const engine = useBrowserStore((s) => s.settings.searchEngine);
  const navigate = useBrowserStore((s) => s.navigate);
  const history = useBrowserStore((s) => s.history);
  const bookmarks = useBrowserStore((s) => s.bookmarks);
  const toggleBookmark = useBrowserStore((s) => s.toggleBookmark);
  const isBookmarked = bookmarks.some((b) => b.url === url);

  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const onFocus = () => {
      const el = inputRef.current;
      el?.focus();
      el?.select();
    };
    window.addEventListener(FOCUS_ADDRESS_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_ADDRESS_EVENT, onFocus);
  }, []);

  const shown = focused ? draft : url === INTERNAL.newTab ? "" : url;

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = draft.trim().toLowerCase();
    if (!focused || !q) return [];
    const typed: Suggestion = {
      kind: "typed",
      url: resolveInput(draft, engine),
      title: looksLikeUrl(draft) ? draft.trim() : `Buscar "${draft.trim()}" no ${SEARCH_ENGINES[engine].name}`,
    };
    const seen = new Set<string>([typed.url]);
    const pool = [...bookmarks, ...history];
    const matches: Suggestion[] = [];
    for (const item of pool) {
      if (matches.length >= 6) break;
      if (seen.has(item.url)) continue;
      if (item.url.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)) {
        seen.add(item.url);
        matches.push({ kind: "site", url: item.url, title: item.title });
      }
    }
    return [typed, ...matches];
  }, [draft, focused, engine, bookmarks, history]);

  const go = (target: string) => {
    navigate(tab.id, target);
    inputRef.current?.blur();
  };

  const LeadIcon = focused
    ? draft && !looksLikeUrl(draft)
      ? Search
      : Globe
    : isInternal(url)
      ? Sparkles
      : url.startsWith("https://")
        ? Lock
        : LockOpen;

  return (
    <div className="relative min-w-0 flex-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const pick = suggestions[highlight];
          go(pick ? pick.url : resolveInput(draft, engine));
        }}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl bg-omnibox px-3 transition-shadow",
          focused ? "ring-2 ring-primary/60 shadow-soft" : "ring-1 ring-surface-border",
        )}
      >
        <LeadIcon className={cn("size-3.5 shrink-0", focused ? "text-primary" : "text-muted-foreground")} />
        <input
          ref={inputRef}
          value={shown}
          onChange={(e) => {
            setDraft(e.target.value);
            setHighlight(0);
          }}
          onFocus={(e) => {
            setDraft(url === INTERNAL.newTab ? "" : url);
            setFocused(true);
            const el = e.currentTarget;
            requestAnimationFrame(() => {
              if (document.activeElement === el) el.select();
            });
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") inputRef.current?.blur();
            if (e.key === "ArrowDown" && suggestions.length) {
              e.preventDefault();
              setHighlight((h) => (h + 1) % suggestions.length);
            }
            if (e.key === "ArrowUp" && suggestions.length) {
              e.preventDefault();
              setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
            }
          }}
          placeholder={`Pesquise no ${SEARCH_ENGINES[engine].name} ou digite um endereço`}
          spellCheck={false}
          autoComplete="off"
          aria-label="Barra de endereço"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        {!focused && !isInternal(url) && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
            onClick={() => toggleBookmark(url, tab.title)}
            aria-label={isBookmarked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            title={isBookmarked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className="flex size-6 items-center justify-center rounded-md hover:bg-tab-hover"
          >
            <Star
              className={cn(
                "size-4 transition-colors",
                isBookmarked ? "fill-primary text-primary" : "text-muted-foreground",
              )}
            />
          </motion.button>
        )}
      </form>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute inset-x-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-soft"
          >
            {suggestions.map((s, i) => (
              <li key={s.url}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(s.url)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px]",
                    i === highlight && "bg-accent",
                  )}
                >
                  {s.kind === "typed" ? (
                    <Search className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Favicon url={s.url} />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                  {s.kind === "site" && (
                    <span className="shrink-0 truncate text-xs text-muted-foreground">{hostOf(s.url)}</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
