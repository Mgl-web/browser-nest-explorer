import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="inline-flex rounded-full bg-surface p-1 ring-1 ring-surface-border">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-full bg-primary shadow-glow"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative flex items-center gap-2 [&_svg]:size-4">
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}
