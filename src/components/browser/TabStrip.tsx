import { AnimatePresence, Reorder } from "framer-motion";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Favicon } from "./Favicon";
import { currentUrl, useBrowserStore, type Tab } from "@/lib/browser/store";
import { useLoadingStore, focusAddressBar } from "@/lib/browser/loading";
import { cn } from "@/lib/utils";

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  const activateTab = useBrowserStore((s) => s.activateTab);
  const closeTab = useBrowserStore((s) => s.closeTab);
  const loading = useLoadingStore((s) => s.loading[tab.id]);
  const url = currentUrl(tab);

  return (
    <Reorder.Item
      value={tab}
      id={tab.id}
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      whileDrag={{ scale: 1.03, zIndex: 20 }}
      onPointerDown={(e) => e.button === 0 && activateTab(tab.id)}
      onAuxClick={(e) => e.button === 1 && closeTab(tab.id)}
      title={tab.title}
      className={cn(
        "group relative flex h-8 min-w-[110px] max-w-[230px] flex-1 basis-0 cursor-default list-none items-center gap-2 rounded-xl px-2.5 text-[13px] select-none",
        active
          ? "bg-tab-active text-foreground shadow-tab"
          : "text-chrome-foreground hover:bg-tab-hover",
      )}
    >
      <span className="relative flex size-4 items-center justify-center">
        {loading ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Favicon url={url} incognito={tab.incognito} />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{tab.title}</span>
      <button
        aria-label={`Fechar ${tab.title}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md transition-opacity hover:bg-tab-hover",
          active ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70",
        )}
      >
        <X className="size-3.5" />
      </button>
    </Reorder.Item>
  );
}

export function TabStrip() {
  const tabs = useBrowserStore((s) => s.tabs);
  const activeId = useBrowserStore((s) => s.activeId);
  const reorderTabs = useBrowserStore((s) => s.reorderTabs);
  const newTab = useBrowserStore((s) => s.newTab);

  return (
    <div className="flex h-12 items-center gap-3 bg-chrome px-3 pt-1">
      <div className="flex items-center gap-2 pl-1 pr-2" aria-hidden>
        <span className="size-3 rounded-full bg-dot-close" />
        <span className="size-3 rounded-full bg-dot-min" />
        <span className="size-3 rounded-full bg-dot-max" />
      </div>
      <Reorder.Group
        axis="x"
        values={tabs}
        onReorder={reorderTabs}
        className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1"
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => (
            <TabItem key={tab.id} tab={tab} active={tab.id === activeId} />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <Button
        variant="chrome"
        size="icon-sm"
        aria-label="Nova aba (Ctrl+T)"
        title="Nova aba (Ctrl+T)"
        onClick={() => {
          newTab();
          focusAddressBar();
        }}
      >
        <Plus />
      </Button>
    </div>
  );
}
