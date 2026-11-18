import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Search, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Favicon } from "./Favicon";
import { NewTabPage } from "./pages/NewTabPage";
import { LibraryPage } from "./pages/LibraryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { currentUrl, useBrowserStore, type Tab } from "@/lib/browser/store";
import { useLoadingStore } from "@/lib/browser/loading";
import { checkEmbed, type EmbedCheck } from "@/lib/browser/embed.functions";
import { COMPATIBLE_SITES, INTERNAL, SEARCH_ENGINES, hostOf, isInternal, searchQueryOf } from "@/lib/browser/url";
import { cn } from "@/lib/utils";

export function Viewport() {
  const tabs = useBrowserStore((s) => s.tabs);
  const activeId = useBrowserStore((s) => s.activeId);
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-content">
      {tabs.map((tab) => (
        <TabView key={tab.id} tab={tab} active={tab.id === activeId} />
      ))}
    </div>
  );
}

function TabView({ tab, active }: { tab: Tab; active: boolean }) {
  const url = currentUrl(tab);
  return (
    <div className={cn("absolute inset-0", !active && "invisible pointer-events-none")} aria-hidden={!active}>
      {isInternal(url) ? (
        active && (
          <AnimatePresence mode="wait">
            <motion.div
              key={url}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <InternalPage url={url} tabId={tab.id} />
            </motion.div>
          </AnimatePresence>
        )
      ) : (
        <ExternalView key={`${url}#${tab.reloadKey}`} url={url} tabId={tab.id} />
      )}
    </div>
  );
}

function InternalPage({ url, tabId }: { url: string; tabId: string }) {
  if (url === INTERNAL.history) return <LibraryPage tabId={tabId} section="history" />;
  if (url === INTERNAL.bookmarks) return <LibraryPage tabId={tabId} section="bookmarks" />;
  if (url === INTERNAL.settings) return <SettingsPage />;
  return <NewTabPage tabId={tabId} />;
}

function ExternalView({ url, tabId }: { url: string; tabId: string }) {
  const check = useServerFn(checkEmbed);
  const setLoading = useLoadingStore((s) => s.setLoading);
  const setPageTitle = useBrowserStore((s) => s.setPageTitle);
  const [loaded, setLoaded] = useState(false);
  const [forced, setForced] = useState(false);

  const query = useQuery<EmbedCheck>({
    queryKey: ["embed-check", url],
    queryFn: () => check({ data: { url } }),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const blocked = query.data?.status === "blocked" && !forced;
  const showFrame = !query.isPending && !blocked;
  const loading = query.isPending || (showFrame && !loaded);

  useEffect(() => {
    setLoading(tabId, loading);
  }, [loading, tabId, setLoading]);
  useEffect(() => () => setLoading(tabId, false), [tabId, setLoading]);
  useEffect(() => {
    if (query.data?.title) setPageTitle(url, query.data.title);
  }, [query.data?.title, url, setPageTitle]);
  useEffect(() => {
    if (!showFrame) return;
    const t = setTimeout(() => setLoaded(true), 15_000);
    return () => clearTimeout(t);
  }, [showFrame]);

  if (query.isPending) return <Connecting url={url} />;
  if (blocked) return <BlockedNotice url={url} tabId={tabId} reason={query.data?.reason ?? null} onForce={() => setForced(true)} />;

  return (
    <iframe
      src={url}
      title={query.data?.title ?? hostOf(url)}
      onLoad={() => setLoaded(true)}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock"
      allow="fullscreen; clipboard-write; geolocation; autoplay"
      referrerPolicy="strict-origin-when-cross-origin"
      className={cn("h-full w-full border-0 bg-card transition-opacity duration-300", loaded ? "opacity-100" : "opacity-60")}
    />
  );
}

function Connecting({ url }: { url: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="surface-card flex size-16 items-center justify-center"
      >
        <Favicon url={url} className="size-7" />
      </motion.div>
      <p className="text-sm">
        Conectando a <span className="font-medium text-foreground">{hostOf(url)}</span>…
      </p>
    </div>
  );
}

function BlockedNotice({
  url,
  tabId,
  reason,
  onForce,
}: {
  url: string;
  tabId: string;
  reason: EmbedCheck["reason"];
  onForce: () => void;
}) {
  const navigate = useBrowserStore((s) => s.navigate);
  const query = searchQueryOf(url);
  const host = hostOf(url);
  const altEngines = Object.values(SEARCH_ENGINES).filter((e) => e.embeddable);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-5 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="surface-card w-full max-w-xl p-7 text-center md:p-10"
        >
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShieldOff className="size-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {host} prefere abrir sozinho
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Este site bloqueia a exibição dentro de outras páginas
            {reason === "csp" ? " (política de segurança CSP)" : reason ? " (X-Frame-Options)" : ""}. Você pode abri-lo
            numa janela de verdade ou escolher um site compatível.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="glow" size="pill" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
              <ExternalLink /> Abrir em nova janela
            </Button>
            <Button variant="surface" size="pill" onClick={onForce}>
              Tentar mesmo assim
            </Button>
          </div>

          {query && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Buscar aqui dentro com:</span>
              {altEngines.map((e) => (
                <Button key={e.id} variant="soft" size="sm" className="rounded-full" onClick={() => navigate(tabId, e.build(query))}>
                  <Search /> {e.name}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-8 border-t border-surface-border pt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sites que funcionam na Janela
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COMPATIBLE_SITES.slice(0, 6).map((site) => (
                <button
                  key={site.url}
                  onClick={() => navigate(tabId, site.url)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-tab-hover"
                >
                  <Favicon url={site.url} />
                  <span className="truncate">{site.title}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
