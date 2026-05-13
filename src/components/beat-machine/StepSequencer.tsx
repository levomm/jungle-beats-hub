import { useBeatStore } from "@/store/useBeatStore";
import { cn } from "@/lib/utils";

export function StepSequencer() {
  const padId = useBeatStore((s) => s.selectedPadId);
  const pad = useBeatStore((s) => s.pads[padId]);
  const pattern = useBeatStore((s) => s.patterns[s.activePatternIndex]);
  const toggle = useBeatStore((s) => s.toggleStep);
  const currentStep = useBeatStore((s) => s.currentStep);
  const isPlaying = useBeatStore((s) => s.isPlaying);
  const setLength = useBeatStore((s) => s.setPatternLength);

  const len = pattern.length;
  const steps = pattern.steps[padId] ?? Array(len).fill(false);
  const vels = pattern.velocities[padId] ?? Array(len).fill(1);

  return (
    <div className="surface-1 rounded-2xl p-4 border border-[var(--border)] flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Sequencer
          </div>
          <div className="text-xs font-mono text-[var(--primary)]">
            {pad?.name ?? "—"}
          </div>
        </div>
        <div className="flex gap-1 surface-2 rounded-md p-0.5 border border-[var(--border)]">
          {([16, 32, 64] as const).map((n) => (
            <button
              key={n}
              onClick={() => setLength(n)}
              className={cn(
                "px-2 py-1 text-[11px] font-mono rounded-[4px] transition-colors",
                len === n
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(16, len)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: len }, (_, i) => {
          const on = steps[i];
          const accent = (vels[i] ?? 1) > 1.05;
          const isCurrent = isPlaying && currentStep === i;
          const beatHead = i % 4 === 0;
          return (
            <button
              key={i}
              onMouseDown={(e) => toggle(padId, i, e.shiftKey)}
              className={cn(
                "relative h-9 rounded-[6px] border transition-all duration-75",
                on
                  ? accent
                    ? "bg-[var(--warn)] border-[var(--warn)]"
                    : "bg-[var(--primary)] border-[var(--primary)]"
                  : "surface-2 border-[var(--border)] hover:border-[var(--border-strong)]",
                isCurrent && "ring-1 ring-[var(--primary-glow)]",
                beatHead && !on && "surface-3",
              )}
              title={`Step ${i + 1}${accent ? " · accent" : ""}`}
            >
              {beatHead && (
                <span className="absolute top-0.5 left-1 text-[8px] font-mono opacity-50">
                  {i / 4 + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider">
        Click a step to toggle · Shift+click for accent
      </div>
    </div>
  );
}