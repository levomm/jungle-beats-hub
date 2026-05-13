import { useRef, useState } from "react";
import { useBeatStore } from "@/store/useBeatStore";
import { cn } from "@/lib/utils";
import { Scissors, Upload } from "lucide-react";

/** Top-bar drop zone: load a break and immediately slice across Bank B. */
export function SampleDrop() {
  const loadFile = useBeatStore((s) => s.loadFileToPad);
  const slice = useBeatStore((s) => s.sliceBreakIntoPads);
  const select = useBeatStore((s) => s.selectPad);
  const [drag, setDrag] = useState(false);
  const [count, setCount] = useState<8 | 16>(8);
  const fileRef = useRef<HTMLInputElement>(null);

  const BREAK_PAD = 7; // last slot of bank A (the synth break)

  const handleFile = async (f: File) => {
    await loadFile(BREAK_PAD, f);
    slice(BREAK_PAD, count, 1);
    select(BREAK_PAD);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
      className={cn(
        "surface-1 rounded-2xl border border-dashed flex flex-wrap items-center gap-3 px-4 py-3 transition-colors",
        drag ? "border-[var(--primary)] bg-[var(--surface-3)]" : "border-[var(--border)]",
      )}
    >
      <Scissors size={14} className="text-[var(--primary)]" />
      <div className="flex-1 min-w-[160px]">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--foreground)]">
          Drop a break here
        </div>
        <div className="text-[10px] font-mono text-[var(--muted-foreground)]">
          Auto-slices across Bank B · or use the built-in Amen on pad 8
        </div>
      </div>
      <div className="flex gap-1 surface-2 rounded-md p-0.5 border border-[var(--border)]">
        {([8, 16] as const).map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={cn(
              "px-2 py-1 text-[11px] font-mono rounded-[4px]",
              count === n
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
            )}
          >
            ×{n}
          </button>
        ))}
      </div>
      <button
        onClick={() => { slice(BREAK_PAD, count, 1); select(BREAK_PAD); }}
        className="h-8 px-3 rounded-md surface-2 border border-[var(--border)] text-[11px] font-mono uppercase tracking-wider hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
      >
        Slice built-in
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="h-8 px-3 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-[11px] font-mono uppercase tracking-wider hover:bg-[var(--primary-glow)] transition-colors flex items-center gap-1.5"
      >
        <Upload size={12} /> Load
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}