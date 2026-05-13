import { useEffect } from "react";
import { useBeatStore } from "@/store/useBeatStore";
import { Pad } from "./Pad";
import { cn } from "@/lib/utils";

const HOTKEYS = ["1","2","3","4","Q","W","E","R","A","S","D","F","Z","X","C","V"];

export function PadGrid() {
  const pads = useBeatStore((s) => s.pads);
  const bank = useBeatStore((s) => s.activeBank);
  const setBank = useBeatStore((s) => s.setActiveBank);
  const trigger = useBeatStore((s) => s.triggerPad);

  // Keyboard triggering
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toUpperCase();
      if (k === "TAB") {
        e.preventDefault();
        setBank(bank === 0 ? 1 : 0);
        return;
      }
      const idx = HOTKEYS.indexOf(k);
      if (idx >= 0) {
        const id = bank * 16 + idx;
        trigger(id, 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bank, setBank, trigger]);

  const visible = pads.slice(bank * 16, bank * 16 + 16);

  return (
    <div className="surface-1 rounded-2xl p-4 border border-[var(--border)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Pads · Bank {bank === 0 ? "A" : "B"}
        </div>
        <div className="flex gap-1 surface-2 rounded-md p-0.5 border border-[var(--border)]">
          {(["A", "B"] as const).map((label, i) => (
            <button
              key={label}
              onClick={() => setBank(i as 0 | 1)}
              className={cn(
                "px-3 py-1 text-xs font-mono rounded-[4px] transition-colors",
                bank === i
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {visible.map((pad, i) => (
          <Pad key={pad.id} pad={pad} index={i} hotkey={HOTKEYS[i]} />
        ))}
      </div>

      <div className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
        Click to play · Right-click to load · Drag audio file onto pad · Tab to switch bank
      </div>
    </div>
  );
}