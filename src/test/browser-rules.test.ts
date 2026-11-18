import { beforeEach, describe, expect, it } from "vitest";
import { resolveInput, groupByDay, INTERNAL, MAX_QUICK_LINKS } from "@/lib/browser/url";
import { evaluateFramingHeaders } from "@/lib/browser/embed";
import { initialData, useBrowserStore } from "@/lib/browser/store";

beforeEach(() => {
  localStorage.clear();
  useBrowserStore.setState(initialData());
});

describe("address bar", () => {
  it("sends search terms to DuckDuckGo by default", () => {
    expect(resolveInput("receita de pão")).toBe("https://duckduckgo.com/?q=receita%20de%20p%C3%A3o");
  });
  it("treats a bare domain as an address", () => {
    expect(resolveInput("pt.wikipedia.org/wiki/Brasil")).toBe("https://pt.wikipedia.org/wiki/Brasil");
  });
  it("uses the chosen search engine", () => {
    expect(resolveInput("gatos", "bing")).toBe("https://www.bing.com/search?q=gatos");
  });
});

describe("embedding check", () => {
  it("blocks sites with X-Frame-Options SAMEORIGIN", () => {
    expect(evaluateFramingHeaders("SAMEORIGIN", null).embeddable).toBe(false);
  });
  it("blocks restrictive frame-ancestors", () => {
    expect(evaluateFramingHeaders(null, "default-src 'self'; frame-ancestors 'self'").embeddable).toBe(false);
  });
  it("allows sites without framing restrictions", () => {
    expect(evaluateFramingHeaders(null, "script-src 'self'").embeddable).toBe(true);
  });
});

describe("anonymous mode", () => {
  it("does not record history in an anonymous tab", () => {
    const s = useBrowserStore.getState();
    const id = s.newTab(undefined, { incognito: true });
    useBrowserStore.getState().navigate(id, "https://example.com/");
    expect(useBrowserStore.getState().history).toHaveLength(0);
  });
  it("does not record history while global anonymous mode is on", () => {
    useBrowserStore.getState().updateSettings({ incognito: true });
    const id = useBrowserStore.getState().newTab();
    useBrowserStore.getState().navigate(id, "https://example.com/");
    expect(useBrowserStore.getState().history).toHaveLength(0);
  });
  it("records history in a normal tab", () => {
    const id = useBrowserStore.getState().newTab(undefined, { incognito: false });
    useBrowserStore.getState().navigate(id, "https://example.com/");
    expect(useBrowserStore.getState().history[0]?.url).toBe("https://example.com/");
  });
});

describe("quick access", () => {
  it("allows at most 12 shortcuts", () => {
    useBrowserStore.setState({ quickLinks: [] });
    for (let i = 0; i < 15; i++) useBrowserStore.getState().addQuickLink(`s${i}`, `https://s${i}.com/`);
    expect(MAX_QUICK_LINKS).toBe(12);
    expect(useBrowserStore.getState().quickLinks).toHaveLength(12);
  });
});

describe("tabs", () => {
  it("closing the last tab leaves a fresh new tab", () => {
    const { tabs, closeTab } = useBrowserStore.getState();
    closeTab(tabs[0]!.id);
    const after = useBrowserStore.getState().tabs;
    expect(after).toHaveLength(1);
    expect(after[0]?.history[0]).toBe(INTERNAL.newTab);
  });
});

describe("history grouping", () => {
  it("labels today and yesterday", () => {
    const now = new Date(2026, 10, 18, 15);
    const groups = groupByDay(
      [
        { visitedAt: new Date(2026, 10, 18, 9).getTime() },
        { visitedAt: new Date(2026, 10, 17, 22).getTime() },
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual(["Hoje", "Ontem"]);
  });
});
