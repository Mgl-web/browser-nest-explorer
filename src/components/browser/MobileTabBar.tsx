import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Favicon } from "./Favicon";
import { currentUrl, useBrowserStore } from "@/lib/browser/store";
import { useLoadingStore } from "@/lib/browser/loading";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const tabs = useBrowserStore((s) => s.tabs);
  const activeId = useBrowserStore((s) => s.activeId);
  const activateTab = useBrowserStore((s) => s.activateTab);
  const closeTab = useBrowserStore((s) => s.closeTab);
  const newTab = useBrowserStore((s) => s.newTab);
  const loading = useLoadingStore((s) => s.loading);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>(`[data-tab="${activeId}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId, tabs.length]);

  return (
    <div className="border-t border-surface-border bg-chrome px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="flex items-center gap-2">
        <div ref={scroller} className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-2 overflow-x-auto">
          <AnimatePresence initial={false}>
            {tabs.map((tab) => {
              const active = tab.id === activeId;
              return (
                <motion.div
                  key={tab.id}
                  data-tab={tab.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  onClick={() => activateTab(tab.id)}
                  className={cn(
                    "flex w-[44vw] max-w-[190px] shrink-0 snap-center items-center gap-2 rounded-xl px-3 py-2 text-[13px]",
                    active ? "bg-tab-active text-foreground shadow-tab" : "text-chrome-foreground bg-tab-hover",
                  )}
                >
                  {loading[tab.id] ? (
                    <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Favicon url={currentUrl(tab)} incognito={tab.incognito} />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{tab.title}</span>
                  <button
                    aria-label={`Fechar ${tab.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="flex size-5 items-center justify-center rounded-md opacity-70"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <Button variant="glow" size="icon" className="rounded-xl" aria-label="Nova aba" onClick={() => newTab()}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
