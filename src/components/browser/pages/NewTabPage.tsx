import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Favicon } from "../Favicon";
import { useBrowserStore, type QuickLink } from "@/lib/browser/store";
import { MAX_QUICK_LINKS, SEARCH_ENGINES, greetingFor, hostOf, resolveInput } from "@/lib/browser/url";
import { cn } from "@/lib/utils";

function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, type: "spring" as const, stiffness: 260, damping: 26 } }),
};

export function NewTabPage({ tabId }: { tabId: string }) {
  const now = useNow(1000);
  const engine = useBrowserStore((s) => s.settings.searchEngine);
  const navigate = useBrowserStore((s) => s.navigate);
  const quickLinks = useBrowserStore((s) => s.quickLinks);
  const history = useBrowserStore((s) => s.history);
  const removeQuickLink = useBrowserStore((s) => s.removeQuickLink);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; link?: QuickLink | undefined }>({ open: false });

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return history.filter((h) => (seen.has(h.url) ? false : (seen.add(h.url), true))).slice(0, 6);
  }, [history]);

  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 pt-12 pb-16 md:pt-20">
        <motion.p custom={0} variants={fadeUp} initial="hidden" animate="show" className="text-base font-medium text-muted-foreground md:text-lg">
          {greetingFor(now.getHours())} 👋
        </motion.p>
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-1 text-7xl font-semibold tracking-[-0.06em] text-foreground tabular-nums md:text-[7.5rem] md:leading-none"
        >
          {time}
        </motion.h1>
        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="mt-3 text-sm text-muted-foreground first-letter:uppercase">
          {date}
        </motion.p>

        <motion.form
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) navigate(tabId, resolveInput(query, engine));
          }}
          className="surface-card mt-10 flex w-full max-w-xl items-center gap-3 rounded-full px-5 py-1.5 focus-within:ring-2 focus-within:ring-primary/60"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Pesquise no ${SEARCH_ENGINES[engine].name} ou digite um endereço`}
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Pesquisar"
          />
          <Button type="submit" variant="glow" size="sm" className="rounded-full px-4">
            Ir
          </Button>
        </motion.form>

        <motion.section custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-14 w-full">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Acesso rápido{" "}
              <span className="font-normal text-muted-foreground">
                {quickLinks.length}/{MAX_QUICK_LINKS}
              </span>
            </h2>
            <Button variant={editing ? "soft" : "chrome"} size="sm" className="rounded-full" onClick={() => setEditing((v) => !v)}>
              {editing ? <Check /> : <Pencil />} {editing ? "Concluir" : "Editar"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {quickLinks.map((link, i) => (
              <motion.div
                key={link.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 0.25 + i * 0.03 } }}
                whileHover={{ y: -3 }}
                className="group relative"
              >
                <button
                  onClick={() => (editing ? setDialog({ open: true, link }) : navigate(tabId, link.url))}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl p-3 transition-colors hover:bg-tab-hover"
                >
                  <span className="surface-card flex size-14 items-center justify-center rounded-2xl">
                    <Favicon url={link.url} className="size-7" />
                  </span>
                  <span className="w-full truncate text-center text-xs font-medium text-foreground">{link.title}</span>
                </button>
                <button
                  aria-label={`Remover ${link.title}`}
                  onClick={() => removeQuickLink(link.id)}
                  className={cn(
                    "absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-popover text-popover-foreground shadow-soft transition-opacity",
                    editing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <X className="size-3.5" />
                </button>
                {!editing && (
                  <button
                    aria-label={`Editar ${link.title}`}
                    onClick={() => setDialog({ open: true, link })}
                    className="absolute top-1 left-1 flex size-6 items-center justify-center rounded-full bg-popover text-popover-foreground opacity-0 shadow-soft transition-opacity group-hover:opacity-100"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
              </motion.div>
            ))}
            {quickLinks.length < MAX_QUICK_LINKS && (
              <motion.button
                layout
                whileHover={{ y: -3 }}
                onClick={() => setDialog({ open: true })}
                className="flex flex-col items-center gap-2 rounded-2xl p-3 text-muted-foreground transition-colors hover:bg-tab-hover"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl border-2 border-dashed border-surface-border">
                  <Plus className="size-5" />
                </span>
                <span className="text-xs font-medium">Adicionar</span>
              </motion.button>
            )}
          </div>
        </motion.section>

        <motion.section custom={5} variants={fadeUp} initial="hidden" animate="show" className="mt-12 w-full">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Visitados recentemente</h2>
          {recent.length === 0 ? (
            <p className="surface-card px-5 py-6 text-center text-sm text-muted-foreground">
              Os sites que você visitar aparecem aqui.
            </p>
          ) : (
            <ul className="surface-card divide-y divide-surface-border overflow-hidden">
              {recent.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => navigate(tabId, h.url)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-tab-hover"
                  >
                    <Favicon url={h.url} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{h.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{hostOf(h.url)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(h.visitedAt, { locale: ptBR, addSuffix: true })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      <QuickLinkDialog
        open={dialog.open}
        link={dialog.link}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  );
}

function QuickLinkDialog({
  open,
  link,
  onOpenChange,
}: {
  open: boolean;
  link?: QuickLink | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const addQuickLink = useBrowserStore((s) => s.addQuickLink);
  const updateQuickLink = useBrowserStore((s) => s.updateQuickLink);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(link?.title ?? "");
      setUrl(link?.url ?? "");
    }
  }, [open, link]);

  const save = () => {
    if (!url.trim()) return;
    const full = resolveInput(url);
    const name = title.trim() || hostOf(full);
    if (link) updateQuickLink(link.id, { title: name, url: full });
    else addQuickLink(name, full);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{link ? "Editar atalho" : "Novo atalho"}</DialogTitle>
          <DialogDescription>O ícone é obtido automaticamente a partir do endereço.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <span className="surface-card flex size-12 shrink-0 items-center justify-center rounded-xl">
              {url ? <Favicon key={url} url={resolveInput(url)} className="size-6" /> : <Plus className="size-5 text-muted-foreground" />}
            </span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome (ex.: Wikipedia)" className="h-10 rounded-xl" />
          </div>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Endereço (ex.: wikipedia.org)" className="h-10 rounded-xl" autoFocus />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="glow" disabled={!url.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
