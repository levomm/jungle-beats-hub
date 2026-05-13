import { useState } from "react";
import { useBeatStore } from "@/store/useBeatStore";
import { cn } from "@/lib/utils";
import { Copy, ClipboardPaste, Trash2, Files } from "lucide-react";

export function PatternBar() {
  const patterns = useBeatStore((s) => s.patterns);
  const active = useBeatStore((s) => s.activePatternIndex);
  const select = useBeatStore((s) => s.selectPattern);
  const rename = useBeatStore((s) => s.renamePattern);
  const copy = useBeatStore((s) => s.copyPattern);
  const paste = useBeatStore((s) => s.pastePattern);
  const dup = useBeatStore((s) => s.duplicatePattern);
  const clear = useBeatStore((s) => s.clearPattern);
  const [editing, setEditing] = useState(false);

  return (
    <div className="surface-1 rounded-2xl p-3 border border-[var(--border)] flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {patterns.map((p, i) => (
          <button
            key={i}
            onClick={() => select(i)}
            onDoubleClick={() => setEditing(true)}
            className={cn(
              "h-9 px-3 rounded-md text-[11px] font-mono uppercase tracking-wider border transition-colors",
              active === i
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                : "surface-2 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-[120px] mx-2">
        {editing ? (
          <input
            autoFocus
            value={patterns[active].name}
            onChange={(e) => rename(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
            className="w-full h-9 px-3 rounded-md surface-2 border border-[var(--primary)] text-[12px] font-mono"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="h-9 w-full px-3 rounded-md surface-2 border border-[var(--border)] text-left text-[12px] font-mono text-[var(--foreground)] hover:border-[var(--border-strong)]"
          >
            {patterns[active].name}
          </button>
        )}
      </div>

      <div className="flex gap-1">
        <PatternBtn icon={<Copy size={13} />} label="Copy" onClick={copy} />
        <PatternBtn icon={<ClipboardPaste size={13} />} label="Paste" onClick={paste} />
        <PatternBtn icon={<Files size={13} />} label="Dup" onClick={dup} />
        <PatternBtn icon={<Trash2 size={13} />} label="Clear" onClick={clear} danger />
      </div>
    </div>
  );
}

function PatternBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3 rounded-md surface-2 border border-[var(--border)] flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider hover:border-[var(--border-strong)] transition-colors",
        danger ? "text-[var(--warn)] hover:text-[var(--warn)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}