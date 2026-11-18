import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  History,
  Home,
  MoreVertical,
  RotateCw,
  Settings,
  Star,
  VenetianMask,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddressBar } from "./AddressBar";
import { currentUrl, useActiveTab, useBrowserStore } from "@/lib/browser/store";
import { focusAddressBar, useLoadingStore } from "@/lib/browser/loading";
import { INTERNAL, isInternal } from "@/lib/browser/url";
import { cn } from "@/lib/utils";

export function Toolbar({ compact }: { compact: boolean }) {
  const tab = useActiveTab();
  const url = currentUrl(tab);
  const s = useBrowserStore();
  const loading = useLoadingStore((st) => !!st.loading[tab.id]);
  const canBack = tab.index > 0;
  const canForward = tab.index < tab.history.length - 1;
  const bookmarked = s.bookmarks.some((b) => b.url === url);

  const anonTab = () => {
    s.newTab(undefined, { incognito: true });
    focusAddressBar();
  };

  return (
    <div className="relative bg-chrome">
      <div className={cn("flex items-center gap-1 px-2 pb-2", compact ? "pt-2" : "pt-0.5 px-3")}>
        <Button variant="chrome" size="icon-sm" disabled={!canBack} onClick={() => s.goBack(tab.id)} aria-label="Voltar" title="Voltar">
          <ArrowLeft />
        </Button>
        {!compact && (
          <>
            <Button variant="chrome" size="icon-sm" disabled={!canForward} onClick={() => s.goForward(tab.id)} aria-label="Avançar" title="Avançar">
              <ArrowRight />
            </Button>
            <Button variant="chrome" size="icon-sm" onClick={() => s.reload(tab.id)} aria-label="Recarregar" title="Recarregar">
              <RotateCw className={cn(loading && "animate-spin")} />
            </Button>
            <Button variant="chrome" size="icon-sm" onClick={() => s.goHome(tab.id)} aria-label="Página inicial" title="Página inicial">
              <Home />
            </Button>
          </>
        )}
        <div className="mx-1 min-w-0 flex-1">
          <AddressBar />
        </div>
        {!compact && (
          <>
            <Button variant="chrome" size="icon-sm" onClick={anonTab} aria-label="Nova aba anônima" title="Nova aba anônima">
              <VenetianMask />
            </Button>
            <Button variant="chrome" size="icon-sm" onClick={() => s.openInternal(INTERNAL.bookmarks)} aria-label="Favoritos" title="Favoritos">
              <Star />
            </Button>
            <Button variant="chrome" size="icon-sm" onClick={() => s.openInternal(INTERNAL.history)} aria-label="Histórico" title="Histórico">
              <History />
            </Button>
            <Button variant="chrome" size="icon-sm" onClick={() => s.openInternal(INTERNAL.settings)} aria-label="Configurações" title="Configurações">
              <Settings />
            </Button>
          </>
        )}
        {compact && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="chrome" size="icon-sm" aria-label="Menu">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem disabled={!canForward} onSelect={() => s.goForward(tab.id)}>
                <ArrowRight /> Avançar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => s.reload(tab.id)}>
                <RotateCw /> Recarregar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => s.goHome(tab.id)}>
                <Home /> Página inicial
              </DropdownMenuItem>
              {!isInternal(url) && (
                <DropdownMenuItem onSelect={() => s.toggleBookmark(url, tab.title)}>
                  <Star className={cn(bookmarked && "fill-primary text-primary")} />
                  {bookmarked ? "Remover favorito" : "Favoritar"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={anonTab}>
                <VenetianMask /> Nova aba anônima
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => s.openInternal(INTERNAL.bookmarks)}>
                <Star /> Favoritos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => s.openInternal(INTERNAL.history)}>
                <History /> Histórico
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => s.openInternal(INTERNAL.settings)}>
                <Settings /> Configurações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
              className="load-bar"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
