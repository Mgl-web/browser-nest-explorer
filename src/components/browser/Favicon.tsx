import { useState } from "react";
import { Globe, History, Settings, Sparkles, Star, VenetianMask } from "lucide-react";
import { INTERNAL, faviconFor, isInternal } from "@/lib/browser/url";
import { cn } from "@/lib/utils";

const INTERNAL_ICONS = {
  [INTERNAL.newTab]: Sparkles,
  [INTERNAL.history]: History,
  [INTERNAL.bookmarks]: Star,
  [INTERNAL.settings]: Settings,
} as Record<string, typeof Globe>;

export function Favicon({
  url,
  incognito,
  className,
}: {
  url: string;
  incognito?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const box = cn("size-4 shrink-0", className);
  if (incognito) return <VenetianMask className={cn(box, "text-primary")} />;
  if (isInternal(url)) {
    const Icon = INTERNAL_ICONS[url] ?? Sparkles;
    return <Icon className={cn(box, "text-primary")} />;
  }
  if (failed) return <Globe className={cn(box, "text-muted-foreground")} />;
  return (
    <img
      src={faviconFor(url)}
      alt=""
      className={cn(box, "rounded-[4px] object-contain")}
      onError={() => setFailed(true)}
      loading="lazy"
      draggable={false}
    />
  );
}
