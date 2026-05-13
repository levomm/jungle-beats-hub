import { useBeatStore } from "@/store/useBeatStore";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Knob({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; format?: (n: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
        <span className="text-[10px] font-mono text-[var(--foreground)]">{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

export function PadEditor() {
  const pad = useBeatStore((s) => s.pads[s.selectedPadId]);
  const update = useBeatStore((s) => s.updatePad);
  const slice = useBeatStore((s) => s.sliceBreakIntoPads);

  if (!pad) return null;

  return (
    <div className="surface-1 rounded-2xl p-4 border border-[var(--border)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Pad Editor
        </div>
        <div className="text-xs font-mono text-[var(--primary)]">
          {pad.name} {pad.buffer ? `· ${pad.buffer.duration.toFixed(2)}s` : "· empty"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Knob label="Volume" value={pad.volume} min={0} max={1.5} step={0.01} onChange={(n) => update(pad.id, { volume: n })} />
        <Knob label="Pitch" value={pad.pitch} min={-24} max={24} step={1} onChange={(n) => update(pad.id, { pitch: n })} format={(n) => `${n > 0 ? "+" : ""}${n} st`} />
        <Knob label="Start" value={pad.startTrim} min={0} max={1} step={0.001} onChange={(n) => update(pad.id, { startTrim: n })} format={(n) => `${(n * 100).toFixed(1)}%`} />
        <Knob label="End" value={pad.endTrim} min={0} max={1} step={0.001} onChange={(n) => update(pad.id, { endTrim: n })} format={(n) => `${(n * 100).toFixed(1)}%`} />
        <Knob label="LP Cutoff" value={pad.lpCutoff} min={200} max={20000} step={50} onChange={(n) => update(pad.id, { lpCutoff: n })} format={(n) => `${(n / 1000).toFixed(1)}k`} />
        <Knob label="Reverb Send" value={pad.reverbSend} min={0} max={1} step={0.01} onChange={(n) => update(pad.id, { reverbSend: n })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => update(pad.id, { reverse: !pad.reverse })}
          className={cn(
            "h-8 rounded-md text-xs font-mono uppercase tracking-wider border transition-colors",
            pad.reverse
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
              : "surface-2 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]",
          )}
        >
          Reverse
        </button>
        <button
          onClick={() => update(pad.id, { mode: pad.mode === "oneshot" ? "loop" : "oneshot" })}
          className={cn(
            "h-8 rounded-md text-xs font-mono uppercase tracking-wider border transition-colors",
            pad.mode === "loop"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
              : "surface-2 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]",
          )}
        >
          {pad.mode === "loop" ? "Loop" : "One-shot"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Choke Group</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((g) => (
            <button
              key={g}
              onClick={() => update(pad.id, { chokeGroup: g })}
              className={cn(
                "h-7 w-7 rounded-md text-[11px] font-mono border transition-colors",
                pad.chokeGroup === g
                  ? "bg-[var(--warn)] text-[var(--warn-foreground)] border-[var(--warn)]"
                  : "surface-2 text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)]",
              )}
            >
              {g === 0 ? "—" : g}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Break Slicer</div>
        <p className="text-[11px] text-[var(--muted-foreground)] leading-snug">
          Slice this pad's sample into 8 equal chops mapped across Bank B (pads 17–24).
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={!pad.buffer}
            onClick={() => slice(pad.id, 8, 1)}
            className="h-8 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-glow)] font-mono uppercase tracking-wider text-xs rounded-md"
          >
            Slice ×8 → Bank B
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!pad.buffer}
            onClick={() => slice(pad.id, 16, 1)}
            className="h-8 surface-2 border-[var(--border)] hover:bg-[var(--surface-3)] font-mono uppercase tracking-wider text-xs rounded-md"
          >
            Slice ×16
          </Button>
        </div>
      </div>
    </div>
  );
}