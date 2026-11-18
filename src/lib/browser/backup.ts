import { z } from "zod";
import type { PersistedData } from "./store";

const tab = z.object({
  id: z.string(),
  history: z.array(z.string()).min(1),
  index: z.number().int().min(0),
  title: z.string(),
  incognito: z.boolean().default(false),
  reloadKey: z.number().default(0),
});

const backupSchema = z.object({
  app: z.literal("janela"),
  version: z.number(),
  data: z.object({
    tabs: z.array(tab).optional(),
    activeId: z.string().optional(),
    history: z
      .array(z.object({ id: z.string(), url: z.string(), title: z.string(), visitedAt: z.number() }))
      .optional(),
    folders: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    bookmarks: z
      .array(
        z.object({
          id: z.string(),
          url: z.string(),
          title: z.string(),
          folderId: z.string(),
          createdAt: z.number(),
        }),
      )
      .optional(),
    quickLinks: z.array(z.object({ id: z.string(), title: z.string(), url: z.string() })).optional(),
    settings: z
      .object({
        theme: z.enum(["light", "dark", "glass"]),
        accent: z.string(),
        searchEngine: z.enum(["duckduckgo", "google", "bing"]),
        homePage: z.enum(["newtab", "custom"]),
        homeUrl: z.string(),
        incognito: z.boolean(),
      })
      .partial()
      .optional(),
  }),
});

export function createBackup(data: PersistedData) {
  return JSON.stringify({ app: "janela", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function parseBackup(text: string): Partial<PersistedData> {
  const parsed = backupSchema.parse(JSON.parse(text));
  const data = parsed.data as Partial<PersistedData>;
  if (data.tabs) data.tabs = data.tabs.map((t) => ({ ...t, index: Math.min(t.index, t.history.length - 1) }));
  return data;
}
