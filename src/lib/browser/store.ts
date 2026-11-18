import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  COMPATIBLE_SITES,
  INTERNAL,
  MAX_HISTORY,
  MAX_QUICK_LINKS,
  isInternal,
  shouldRecordHistory,
  titleFromUrl,
  type SearchEngineId,
} from "./url";

export type ThemeId = "light" | "dark" | "glass";

export interface Tab {
  id: string;
  history: string[];
  index: number;
  title: string;
  incognito: boolean;
  reloadKey: number;
}
export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  visitedAt: number;
}
export interface Folder {
  id: string;
  name: string;
}
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  folderId: string;
  createdAt: number;
}
export interface QuickLink {
  id: string;
  title: string;
  url: string;
}
export interface Settings {
  theme: ThemeId;
  accent: string;
  searchEngine: SearchEngineId;
  homePage: "newtab" | "custom";
  homeUrl: string;
  incognito: boolean;
}

export const DEFAULT_FOLDER_ID = "favoritos";
export const ACCENT_PRESETS = ["#ff6a3d", "#2f80ed", "#14b8a6", "#65a30d", "#f43f5e", "#f59e0b"];
export const DEFAULT_SETTINGS: Settings = {
  theme: "glass",
  accent: "#ff6a3d",
  searchEngine: "duckduckgo",
  homePage: "newtab",
  homeUrl: "",
  incognito: false,
};

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const currentUrl = (tab: Tab) => tab.history[tab.index] ?? INTERNAL.newTab;

const makeTab = (url: string = INTERNAL.newTab, incognito = false): Tab => ({
  id: uid(),
  history: [url],
  index: 0,
  title: titleFromUrl(url),
  incognito,
  reloadKey: 0,
});

export const homeTarget = (s: Settings) =>
  s.homePage === "custom" && s.homeUrl ? s.homeUrl : INTERNAL.newTab;

export interface PersistedData {
  tabs: Tab[];
  activeId: string;
  history: HistoryEntry[];
  folders: Folder[];
  bookmarks: Bookmark[];
  quickLinks: QuickLink[];
  settings: Settings;
}

interface Actions {
  newTab: (url?: string, opts?: { incognito?: boolean }) => string;
  openInternal: (url: string) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  activateIndex: (index: number) => void;
  cycleTab: (dir: 1 | -1) => void;
  reorderTabs: (tabs: Tab[]) => void;
  navigate: (tabId: string, url: string) => void;
  goBack: (tabId: string) => void;
  goForward: (tabId: string) => void;
  reload: (tabId: string) => void;
  goHome: (tabId: string) => void;
  setPageTitle: (url: string, title: string) => void;
  removeHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  toggleBookmark: (url: string, title: string) => void;
  addFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  renameBookmark: (id: string, title: string) => void;
  moveBookmark: (id: string, folderId: string) => void;
  deleteBookmark: (id: string) => void;
  addQuickLink: (title: string, url: string) => boolean;
  updateQuickLink: (id: string, patch: Partial<Omit<QuickLink, "id">>) => void;
  removeQuickLink: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  importData: (data: Partial<PersistedData>) => void;
}

export type BrowserState = PersistedData & Actions;

const firstTab = makeTab();

export const initialData = (): PersistedData => {
  const tab = makeTab();
  return {
    tabs: [tab],
    activeId: tab.id,
    history: [],
    folders: [{ id: DEFAULT_FOLDER_ID, name: "Favoritos" }],
    bookmarks: [],
    quickLinks: COMPATIBLE_SITES.map((s) => ({ id: uid(), title: s.title, url: s.url })),
    settings: { ...DEFAULT_SETTINGS },
  };
};

const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useBrowserStore = create<BrowserState>()(
  persist(
    (set, get) => {
      const record = (history: HistoryEntry[], tab: Tab, url: string) =>
        shouldRecordHistory(url, tab.incognito, get().settings.incognito)
          ? [{ id: uid(), url, title: titleFromUrl(url), visitedAt: Date.now() }, ...history].slice(
              0,
              MAX_HISTORY,
            )
          : history;

      const updateTab = (id: string, fn: (t: Tab) => Tab) =>
        set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? fn(t) : t)) }));

      return {
        ...initialData(),
        tabs: [firstTab],
        activeId: firstTab.id,

        newTab: (url = INTERNAL.newTab, opts) => {
          const incognito = opts?.incognito ?? get().settings.incognito;
          const tab = makeTab(url, incognito);
          set((s) => ({
            tabs: [...s.tabs, tab],
            activeId: tab.id,
            history: record(s.history, tab, url),
          }));
          return tab.id;
        },
        openInternal: (url) => {
          const existing = get().tabs.find((t) => currentUrl(t) === url);
          const active = get().tabs.find((t) => t.id === get().activeId);
          if (existing) set({ activeId: existing.id });
          else if (active && currentUrl(active) === INTERNAL.newTab) get().navigate(active.id, url);
          else get().newTab(url, { incognito: false });
        },
        closeTab: (id) => {
          const { tabs, activeId } = get();
          const idx = tabs.findIndex((t) => t.id === id);
          if (idx < 0) return;
          const rest = tabs.filter((t) => t.id !== id);
          if (rest.length === 0) {
            const tab = makeTab(INTERNAL.newTab, false);
            set({ tabs: [tab], activeId: tab.id });
            return;
          }
          const nextActive = id === activeId ? rest[Math.min(idx, rest.length - 1)]!.id : activeId;
          set({ tabs: rest, activeId: nextActive });
        },
        activateTab: (id) => set({ activeId: id }),
        activateIndex: (index) => {
          const tabs = get().tabs;
          const tab = index >= tabs.length ? tabs[tabs.length - 1] : tabs[index];
          if (tab) set({ activeId: tab.id });
        },
        cycleTab: (dir) => {
          const { tabs, activeId } = get();
          const idx = tabs.findIndex((t) => t.id === activeId);
          const next = tabs[(idx + dir + tabs.length) % tabs.length];
          if (next) set({ activeId: next.id });
        },
        reorderTabs: (tabs) => set({ tabs }),

        navigate: (tabId, url) => {
          const tab = get().tabs.find((t) => t.id === tabId);
          if (!tab) return;
          if (currentUrl(tab) === url) return get().reload(tabId);
          set((s) => ({
            tabs: s.tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    history: [...t.history.slice(0, t.index + 1), url],
                    index: t.index + 1,
                    title: titleFromUrl(url),
                  }
                : t,
            ),
            history: record(s.history, tab, url),
          }));
        },
        goBack: (tabId) =>
          updateTab(tabId, (t) =>
            t.index > 0 ? { ...t, index: t.index - 1, title: titleFromUrl(t.history[t.index - 1] ?? INTERNAL.newTab) } : t,
          ),
        goForward: (tabId) =>
          updateTab(tabId, (t) =>
            t.index < t.history.length - 1
              ? { ...t, index: t.index + 1, title: titleFromUrl(t.history[t.index + 1] ?? INTERNAL.newTab) }
              : t,
          ),
        reload: (tabId) => updateTab(tabId, (t) => ({ ...t, reloadKey: t.reloadKey + 1 })),
        goHome: (tabId) => get().navigate(tabId, homeTarget(get().settings)),
        setPageTitle: (url, title) =>
          set((s) => {
            const i = s.history.findIndex((h) => h.url === url);
            const history =
              i >= 0 && s.history[i]?.title !== title
                ? s.history.map((h, j) => (j === i ? { ...h, title } : h))
                : s.history;
            return {
              history,
              tabs: s.tabs.map((t) => (currentUrl(t) === url && t.title !== title ? { ...t, title } : t)),
            };
          }),

        removeHistoryEntry: (id) => set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
        clearHistory: () => set({ history: [] }),

        toggleBookmark: (url, title) => {
          if (isInternal(url)) return;
          const existing = get().bookmarks.find((b) => b.url === url);
          if (existing) {
            set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== existing.id) }));
            return;
          }
          set((s) => ({
            bookmarks: [
              { id: uid(), url, title, folderId: DEFAULT_FOLDER_ID, createdAt: Date.now() },
              ...s.bookmarks,
            ],
          }));
        },
        addFolder: (name) => {
          const id = uid();
          set((s) => ({ folders: [...s.folders, { id, name: name.trim() || "Nova pasta" }] }));
          return id;
        },
        renameFolder: (id, name) =>
          set((s) => ({
            folders: s.folders.map((f) => (f.id === id && name.trim() ? { ...f, name: name.trim() } : f)),
          })),
        deleteFolder: (id) => {
          if (id === DEFAULT_FOLDER_ID) return;
          set((s) => ({
            folders: s.folders.filter((f) => f.id !== id),
            bookmarks: s.bookmarks.map((b) => (b.folderId === id ? { ...b, folderId: DEFAULT_FOLDER_ID } : b)),
          }));
        },
        renameBookmark: (id, title) =>
          set((s) => ({
            bookmarks: s.bookmarks.map((b) => (b.id === id && title.trim() ? { ...b, title: title.trim() } : b)),
          })),
        moveBookmark: (id, folderId) =>
          set((s) => ({ bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, folderId } : b)) })),
        deleteBookmark: (id) => set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

        addQuickLink: (title, url) => {
          if (get().quickLinks.length >= MAX_QUICK_LINKS) return false;
          set((s) => ({ quickLinks: [...s.quickLinks, { id: uid(), title, url }] }));
          return true;
        },
        updateQuickLink: (id, patch) =>
          set((s) => ({ quickLinks: s.quickLinks.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
        removeQuickLink: (id) => set((s) => ({ quickLinks: s.quickLinks.filter((q) => q.id !== id) })),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        importData: (data) =>
          set((s) => {
            const tabs = data.tabs?.length ? data.tabs : s.tabs;
            const activeId = tabs.some((t) => t.id === data.activeId) ? data.activeId! : tabs[0]!.id;
            const folders = data.folders ?? s.folders;
            return {
              tabs,
              activeId,
              history: data.history ?? s.history,
              folders: folders.some((f) => f.id === DEFAULT_FOLDER_ID)
                ? folders
                : [{ id: DEFAULT_FOLDER_ID, name: "Favoritos" }, ...folders],
              bookmarks: data.bookmarks ?? s.bookmarks,
              quickLinks: (data.quickLinks ?? s.quickLinks).slice(0, MAX_QUICK_LINKS),
              settings: { ...DEFAULT_SETTINGS, ...s.settings, ...data.settings },
            };
          }),
      };
    },
    {
      name: "janela-browser-v1",
      version: 1,
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage)),
      partialize: (s): PersistedData => ({
        tabs: s.tabs,
        activeId: s.activeId,
        history: s.history,
        folders: s.folders,
        bookmarks: s.bookmarks,
        quickLinks: s.quickLinks,
        settings: s.settings,
      }),
    },
  ),
);

export const useActiveTab = () =>
  useBrowserStore((s): Tab => s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0]!);
