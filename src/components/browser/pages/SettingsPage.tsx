import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Download, Keyboard, Palette, Search, Shield, Upload, Home, Database, VenetianMask } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ACCENT_PRESETS, useBrowserStore, type ThemeId } from "@/lib/browser/store";
import { createBackup, parseBackup } from "@/lib/browser/backup";
import { focusAddressBar } from "@/lib/browser/loading";
import { SEARCH_ENGINES, resolveInput, type SearchEngineId } from "@/lib/browser/url";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemeId; name: string; desc: string }[] = [
  { id: "light", name: "Claro", desc: "Limpo e luminoso" },
  { id: "dark", name: "Escuro", desc: "Confortável à noite" },
  { id: "glass", name: "Vidro fosco", desc: "Translúcido sobre o fundo" },
];

const SHORTCUTS = [
  ["Nova aba", "Ctrl+T", "Alt+T"],
  ["Nova aba anônima", "Ctrl+Shift+N", "Alt+Shift+T"],
  ["Fechar aba", "Ctrl+W", "Alt+W"],
  ["Focar barra de endereço", "Ctrl+L", "Alt+L"],
  ["Próxima / anterior aba", "Ctrl+Tab", "Ctrl+Shift+Tab"],
  ["Ir para a aba 1–9", "Alt+1…9", ""],
];

function Section({ icon, title, children, i }: { icon: React.ReactNode; title: string; children: React.ReactNode; i: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
      className="surface-card p-5 md:p-6"
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-4">{icon}</span>
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

export function SettingsPage() {
  const settings = useBrowserStore((s) => s.settings);
  const update = useBrowserStore((s) => s.updateSettings);
  const newTab = useBrowserStore((s) => s.newTab);
  const importData = useBrowserStore((s) => s.importData);
  const counts = { h: useBrowserStore((s) => s.history.length), b: useBrowserStore((s) => s.bookmarks.length) };
  const fileRef = useRef<HTMLInputElement>(null);
  const [homeDraft, setHomeDraft] = useState(settings.homeUrl);

  const exportData = () => {
    const s = useBrowserStore.getState();
    const json = createBackup({
      tabs: s.tabs,
      activeId: s.activeId,
      history: s.history,
      folders: s.folders,
      bookmarks: s.bookmarks,
      quickLinks: s.quickLinks,
      settings: s.settings,
    });
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `janela-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Backup exportado");
  };

  const onImport = async (file: File) => {
    try {
      importData(parseBackup(await file.text()));
      toast.success("Dados importados");
    } catch {
      toast.error("Arquivo inválido", { description: "Escolha um backup JSON exportado pela Janela." });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 px-5 pt-10 pb-16">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-foreground">Configurações</h1>

        <Section i={0} icon={<Palette />} title="Aparência">
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => update({ theme: t.id })}
                className={cn(
                  "group rounded-2xl p-1.5 text-left ring-2 transition-all",
                  settings.theme === t.id ? "ring-primary" : "ring-transparent hover:ring-surface-border",
                )}
              >
                <div className={cn("relative h-20 overflow-hidden rounded-xl p-2", `theme-swatch-${t.id}`)}>
                  <div className={cn("h-full rounded-lg", `swatch-pane-${t.id}`)} />
                  {settings.theme === t.id && (
                    <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
                <p className="mt-2 px-1 text-sm font-medium text-foreground">{t.name}</p>
                <p className="px-1 text-xs text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-foreground">Cor de destaque</p>
            <div className="flex flex-wrap items-center gap-3">
              {ACCENT_PRESETS.map((c) => (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => update({ accent: c })}
                  aria-label={`Cor ${c}`}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
                    settings.accent.toLowerCase() === c && "ring-2 ring-foreground",
                  )}
                >
                  {settings.accent.toLowerCase() === c && <Check className="size-4 text-primary-foreground" />}
                </motion.button>
              ))}
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm text-foreground ring-1 ring-surface-border">
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                  className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
                Personalizada
              </label>
            </div>
          </div>
        </Section>

        <Section i={1} icon={<Search />} title="Mecanismo de busca">
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(SEARCH_ENGINES) as SearchEngineId[]).map((id) => {
              const e = SEARCH_ENGINES[id];
              const active = settings.searchEngine === id;
              return (
                <button
                  key={id}
                  onClick={() => update({ searchEngine: id })}
                  className={cn(
                    "rounded-xl px-4 py-3 text-left ring-1 transition-all",
                    active ? "bg-primary-soft ring-primary" : "ring-surface-border hover:bg-tab-hover",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.embeddable ? "Resultados aqui dentro" : "Abre em nova janela"}</p>
                </button>
              );
            })}
          </div>
        </Section>

        <Section i={2} icon={<Home />} title="Página inicial">
          <div className="space-y-2">
            {(["newtab", "custom"] as const).map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-tab-hover">
                <input
                  type="radio"
                  name="home"
                  checked={settings.homePage === opt}
                  onChange={() => update({ homePage: opt })}
                  className="size-4 accent-primary"
                />
                <span className="text-sm text-foreground">{opt === "newtab" ? "Página Nova aba" : "Um endereço específico"}</span>
              </label>
            ))}
            {settings.homePage === "custom" && (
              <form
                className="flex gap-2 pl-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const url = resolveInput(homeDraft, settings.searchEngine);
                  setHomeDraft(url);
                  update({ homeUrl: url });
                  toast.success("Página inicial salva");
                }}
              >
                <Input value={homeDraft} onChange={(e) => setHomeDraft(e.target.value)} placeholder="ex.: pt.wikipedia.org" className="h-10 rounded-xl" />
                <Button type="submit" variant="glow" className="h-10 rounded-xl">
                  Salvar
                </Button>
              </form>
            )}
          </div>
        </Section>

        <Section i={3} icon={<Shield />} title="Privacidade">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Modo anônimo</p>
              <p className="text-xs text-muted-foreground">Enquanto estiver ligado, nenhuma visita é gravada no histórico.</p>
            </div>
            <Switch checked={settings.incognito} onCheckedChange={(v) => update({ incognito: v })} aria-label="Modo anônimo" />
          </div>
          <Button
            variant="soft"
            className="mt-4 rounded-xl"
            onClick={() => {
              newTab(undefined, { incognito: true });
              focusAddressBar();
            }}
          >
            <VenetianMask /> Abrir aba anônima
          </Button>
        </Section>

        <Section i={4} icon={<Database />} title="Seus dados">
          <p className="mb-4 text-xs text-muted-foreground">
            Tudo fica salvo só neste aparelho: {counts.h} visitas e {counts.b} favoritos.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="surface" className="rounded-xl" onClick={exportData}>
              <Download /> Exportar JSON
            </Button>
            <Button variant="surface" className="rounded-xl" onClick={() => fileRef.current?.click()}>
              <Upload /> Importar JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
          </div>
        </Section>

        <Section i={5} icon={<Keyboard />} title="Atalhos de teclado">
          <ul className="divide-y divide-surface-border text-sm">
            {SHORTCUTS.map(([label, main, alt]) => (
              <li key={label} className="flex items-center justify-between gap-3 py-2">
                <span className="text-foreground">{label}</span>
                <span className="flex gap-1.5">
                  {[main, alt].filter(Boolean).map((k) => (
                    <kbd key={k} className="rounded-md bg-muted px-2 py-0.5 font-sans text-xs text-muted-foreground ring-1 ring-surface-border">
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Alguns navegadores reservam Ctrl+T e Ctrl+W para si — nesse caso, use a versão com Alt.
          </p>
        </Section>
      </div>
    </div>
  );
}
