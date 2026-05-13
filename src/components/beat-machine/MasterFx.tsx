import { useBeatStore } from "@/store/useBeatStore";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { CharacterMode } from "@/lib/audio/engine";

const MODES: { id: CharacterMode; label: string; sub: string }[] = [
  { id: "hifi", label: "HiFi", sub: "clean" },
  { id: "standard", label: "Std", sub: "warm" },
  { id: "lofi", label: "LoFi", sub: "tape" },
  { id: "lofi2", label: "LoFi 2", sub: "crushed" },
];

export function MasterFx() {
  const character = useBeatStore((s) => s.character);
  const setCharacter = useBeatStore((s) => s.setCharacter);
  const reverb = useBeatStore((s) => s.reverbAmount);
  const setReverb = useBeatStore((s) => s.setReverbAmount);
  const comp = useBeatStore((s) => s.compAmount);
  const setComp = useBeatStore((s) => s.setCompAmount);

  return (
    <div className="surface-1 rounded-2xl p-4 border border-[var(--border)] flex flex-col gap-4">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
        Master · Character
      </div>

      <div className="grid grid-cols-4 gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setCharacter(m.id)}
            className={cn(
              "h-14 rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all",
              character === m.id
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
                : "surface-2 border-[var(--border)] hover:border-[var(--border-strong)]",
            )}
          >
            <span className="text-[12px] font-mono font-medium">{m.label}</span>
            <span className={cn("text-[9px] font-mono uppercase tracking-wider", character === m.id ? "opacity-70" : "text-[var(--muted-foreground)]")}>
              {m.sub}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Reverb</span>
            <span className="text-[10px] font-mono">{Math.round(reverb * 100)}%</span>
          </div>
          <Slider value={[reverb]} min={0} max={1} step={0.01} onValueChange={(v) => setReverb(v[0])} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Compressor</span>
            <span className="text-[10px] font-mono">{Math.round(comp * 100)}%</span>
          </div>
          <Slider value={[comp]} min={0} max={1} step={0.01} onValueChange={(v) => setComp(v[0])} />
        </div>
      </div>
    </div>
  );
}