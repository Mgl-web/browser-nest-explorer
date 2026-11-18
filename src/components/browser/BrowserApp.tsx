import { useEffect } from "react";
import { motion } from "framer-motion";
import { Backdrop } from "./Backdrop";
import { TabStrip } from "./TabStrip";
import { Toolbar } from "./Toolbar";
import { Viewport } from "./Viewport";
import { MobileTabBar } from "./MobileTabBar";
import { useBrowserStore } from "@/lib/browser/store";
import { focusAddressBar } from "@/lib/browser/loading";
import { useIsMobile } from "@/hooks/use-mobile";

function useTheme() {
  const theme = useBrowserStore((s) => s.settings.theme);
  const accent = useBrowserStore((s) => s.settings.accent);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme !== "light");
    root.classList.toggle("glass", theme === "glass");
    root.style.setProperty("--user-accent", accent);
  }, [theme, accent]);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useBrowserStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const alt = e.altKey && !mod;
      const key = e.key.toLowerCase();

      if ((mod && e.shiftKey && key === "n") || (alt && e.shiftKey && key === "t")) {
        e.preventDefault();
        s.newTab(undefined, { incognito: true });
        focusAddressBar();
      } else if ((mod || alt) && !e.shiftKey && key === "t") {
        e.preventDefault();
        s.newTab();
        focusAddressBar();
      } else if ((mod || alt) && key === "w") {
        e.preventDefault();
        s.closeTab(s.activeId);
      } else if (((mod || alt) && key === "l") || e.key === "F6") {
        e.preventDefault();
        focusAddressBar();
      } else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        s.cycleTab(e.shiftKey ? -1 : 1);
      } else if (alt && /^Digit[1-9]$/.test(e.code)) {
        e.preventDefault();
        const n = Number(e.code.slice(5));
        s.activateIndex(n === 9 ? Number.MAX_SAFE_INTEGER : n - 1);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);
}

export function BrowserApp() {
  useTheme();
  useShortcuts();
  const isMobile = useIsMobile();

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Backdrop />
      <div className="relative z-10 flex h-full items-stretch justify-center md:p-6 lg:p-8">
        <motion.main
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="window-shell flex h-full w-full max-w-[1500px] flex-col overflow-hidden text-foreground md:rounded-[1.5rem]"
        >
          {!isMobile && <TabStrip />}
          <Toolbar compact={isMobile} />
          <Viewport />
          {isMobile && <MobileTabBar />}
        </motion.main>
      </div>
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Backdrop />
    </div>
  );
}
