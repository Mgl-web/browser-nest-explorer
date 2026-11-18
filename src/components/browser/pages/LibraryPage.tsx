import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Folder as FolderIcon,
  FolderInput,
  FolderPlus,
  History,
  MoreHorizontal,
  Pencil,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Favicon } from "../Favicon";
import { Segmented } from "./Segmented";
import { DEFAULT_FOLDER_ID, useBrowserStore, type Bookmark, type Folder } from "@/lib/browser/store";
import { groupByDay, hostOf } from "@/lib/browser/url";

type Section = "history" | "bookmarks";

export function LibraryPage({ tabId, section }: { tabId: string; section: Section }) {
  const [current, setCurrent] = useState<Section>(section);
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 pt-10 pb-16">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {current === "history" ? "Histórico" : "Favoritos"}
          </h1>
          <Segmented
            id="library"
            value={current}
            onChange={setCurrent}
            options={[
              { value: "history", label: "Histórico", icon: <History /> },
              { value: "bookmarks", label: "Favoritos", icon: <Star /> },
            ]}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: current === "history" ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {current === "history" ? <HistorySection tabId={tabId} /> : <BookmarksSection tabId={tabId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function HistorySection({ tabId }: { tabId: string }) {
  const history = useBrowserStore((s) => s.history);
  const navigate = useBrowserStore((s) => s.navigate);
  const removeHistoryEntry = useBrowserStore((s) => s.removeHistoryEntry);
  const clearHistory = useBrowserStore((s) => s.clearHistory);
  const incognito = useBrowserStore((s) => s.settings.incognito);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? history.filter((h) => h.title.toLowerCase().includes(term) || h.url.toLowerCase().includes(term))
      : history;
    return groupByDay(filtered);
  }, [history, q]);

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <div className="surface-card flex flex-1 items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-primary/60">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar no histórico"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="surface" className="h-10 rounded-xl" disabled={history.length === 0}>
              <Trash2 /> <span className="hidden sm:inline">Limpar tudo</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso apaga {history.length} {history.length === 1 ? "visita" : "visitas"} deste aparelho. Não dá para desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  clearHistory();
                  toast.success("Histórico apagado");
                }}
              >
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {incognito && (
        <p className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-foreground">
          O modo anônimo está ligado: novas visitas não estão sendo gravadas.
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyState icon={<History />} text={q ? "Nada encontrado." : "Seu histórico está vazio."} />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground first-letter:uppercase">
                {g.label}
              </h3>
              <ul className="surface-card divide-y divide-surface-border overflow-hidden">
                <AnimatePresence initial={false}>
                  {g.items.map((h) => (
                    <motion.li
                      key={h.id}
                      layout
                      exit={{ opacity: 0, height: 0 }}
                      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-tab-hover"
                    >
                      <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(h.visitedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Favicon url={h.url} />
                      <button onClick={() => navigate(tabId, h.url)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-medium text-foreground">{h.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{hostOf(h.url)}</span>
                      </button>
                      <Button
                        variant="chrome"
                        size="icon-sm"
                        aria-label="Excluir do histórico"
                        className="opacity-60 group-hover:opacity-100"
                        onClick={() => removeHistoryEntry(h.id)}
                      >
                        <X />
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarksSection({ tabId }: { tabId: string }) {
  const folders = useBrowserStore((s) => s.folders);
  const bookmarks = useBrowserStore((s) => s.bookmarks);
  const addFolder = useBrowserStore((s) => s.addFolder);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <div>
      <div className="mb-6 flex justify-end">
        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addFolder(name);
              setName("");
              setCreating(false);
            }}
            className="flex w-full gap-2 sm:w-auto"
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da pasta" className="h-10 rounded-xl sm:w-60" />
            <Button type="submit" variant="glow" className="h-10 rounded-xl">
              Criar
            </Button>
            <Button type="button" variant="ghost" className="h-10 rounded-xl" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
          </form>
        ) : (
          <Button variant="surface" className="h-10 rounded-xl" onClick={() => setCreating(true)}>
            <FolderPlus /> Nova pasta
          </Button>
        )}
      </div>
      {bookmarks.length === 0 && (
        <EmptyState icon={<Star />} text="Toque na estrela da barra de endereço para salvar um site aqui." />
      )}
      <div className="mt-4 space-y-4">
        {folders.map((f) => (
          <FolderCard key={f.id} folder={f} folders={folders} items={bookmarks.filter((b) => b.folderId === f.id)} tabId={tabId} />
        ))}
      </div>
    </div>
  );
}

function FolderCard({ folder, folders, items, tabId }: { folder: Folder; folders: Folder[]; items: Bookmark[]; tabId: string }) {
  const renameFolder = useBrowserStore((s) => s.renameFolder);
  const deleteFolder = useBrowserStore((s) => s.deleteFolder);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  return (
    <motion.section layout className="surface-card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <FolderIcon className="size-4" />
        </span>
        {renaming ? (
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              renameFolder(folder.id, name);
              setRenaming(false);
            }}
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { renameFolder(folder.id, name); setRenaming(false); }} className="h-8 rounded-lg" />
          </form>
        ) : (
          <h3 className="flex-1 truncate text-sm font-semibold text-foreground">
            {folder.name} <span className="font-normal text-muted-foreground">· {items.length}</span>
          </h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="chrome" size="icon-sm" aria-label={`Opções da pasta ${folder.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onSelect={() => { setName(folder.name); setRenaming(true); }}>
              <Pencil /> Renomear
            </DropdownMenuItem>
            {folder.id !== DEFAULT_FOLDER_ID && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  deleteFolder(folder.id);
                  toast(`Pasta "${folder.name}" excluída`, { description: items.length ? "Os favoritos dela foram para “Favoritos”." : undefined });
                }}
              >
                <Trash2 /> Excluir pasta
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-muted-foreground">Pasta vazia.</p>
      ) : (
        <ul className="divide-y divide-surface-border">
          <AnimatePresence initial={false}>
            {items.map((b) => (
              <BookmarkRow key={b.id} bookmark={b} folders={folders} tabId={tabId} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.section>
  );
}

function BookmarkRow({ bookmark, folders, tabId }: { bookmark: Bookmark; folders: Folder[]; tabId: string }) {
  const navigate = useBrowserStore((s) => s.navigate);
  const newTab = useBrowserStore((s) => s.newTab);
  const renameBookmark = useBrowserStore((s) => s.renameBookmark);
  const moveBookmark = useBrowserStore((s) => s.moveBookmark);
  const deleteBookmark = useBrowserStore((s) => s.deleteBookmark);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(bookmark.title);

  const commit = () => {
    renameBookmark(bookmark.id, title);
    setRenaming(false);
  };

  return (
    <motion.li layout exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-tab-hover">
      <Favicon url={bookmark.url} />
      {renaming ? (
        <form className="flex-1" onSubmit={(e) => { e.preventDefault(); commit(); }}>
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={commit} className="h-8 rounded-lg" />
        </form>
      ) : (
        <button onClick={() => navigate(tabId, bookmark.url)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-medium text-foreground">{bookmark.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{hostOf(bookmark.url)}</span>
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="chrome" size="icon-sm" aria-label={`Opções de ${bookmark.title}`} className="opacity-60 group-hover:opacity-100">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl">
          <DropdownMenuItem onSelect={() => newTab(bookmark.url)}>
            <ExternalLink /> Abrir em nova aba
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => { setTitle(bookmark.title); setRenaming(true); }}>
            <Pencil /> Renomear
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput /> Mover para
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-xl">
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} disabled={f.id === bookmark.folderId} onSelect={() => moveBookmark(bookmark.id, f.id)}>
                  <FolderIcon /> {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteBookmark(bookmark.id)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.li>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-12 text-center text-sm text-muted-foreground">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary [&_svg]:size-5">{icon}</span>
      {text}
    </div>
  );
}
