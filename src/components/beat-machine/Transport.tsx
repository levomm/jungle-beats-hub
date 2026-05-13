import { useState } from "react";
import { useBeatStore } from "@/store/useBeatStore";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Play, Square, Circle, Download } from "lucide-react";

export function Transport() {
  const isPlaying = useBeatStore((s) => s.isPlaying);
  const isRecording = useBeatStore((s) => s.isRecording);
  const play = useBeatStore((s) => s.play);
  const stop = useBeatStore((s) => s.stop);
  const toggleRec = useBeatStore((s) => s.toggleRecord);
  const bpm = useBeatStore((s) => s.bpm);
  const setBpm = useBeatStore((s) => s.setBpm);
  const swing = useBeatStore((s) => s.swing);
  const setSwing = useBeatStore((s) => s.setSwing);
  const tap = useBeatStore((s) => s.tapTempo);
  const exportWav = useBeatStore((s) => s.exportWav);
  const [bars, setBars] = useState(2);
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportWav(bars);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="surface-1 rounded-2xl p-4 border border-[var(--border)] flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => (isPlaying ? stop() : play())}
          className={cn(
            "h-10 w-10 rounded-md flex items-center justify-center border transition-colors",
            isPlaying
              ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]"
              : "surface-2 border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]",
          )}
          title={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <button
          onClick={toggleRec}
          className={cn(
            "h-10 w-10 rounded-md flex items-center justify-center border transition-colors",
            isRecording
              ? "bg-[var(--warn)] text-[var(--warn-foreground)] border-[var(--warn)] animate-pulse"
              : "surface-2 border-[var(--border)] hover:border-[var(--warn)] hover:text-[var(--warn)]",
          )}
          title="Record live pad hits to pattern"
        >
          <Circle size={14} fill="currentColor" />
        </button>
      </div>

      <div className="flex items-center gap-3 surface-2 rounded-md px-3 py-2 border border-[var(--border)]">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">BPM</span>
          <input
            type="number"
            value={bpm}
            min={60}
            max={240}
            onChange={(e) => setBpm(Number(e.target.value) || 170)}
            className="w-16 bg-transparent text-[var(--primary)] font-mono text-xl font-medium outline-none"
          />
        </div>
        <button
          onClick={tap}
          className="h-9 px-3 rounded-md border border-[var(--border)] surface-3 text-[10px] font-mono uppercase tracking-wider hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
        >
          Tap
        </button>
      </div>

      <div className="flex-1 min-w-[180px] flex items-center gap-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] w-14">Swing</span>
        <Slider value={[swing]} min={0} max={0.5} step={0.01} onValueChange={(v) => setSwing(v[0])} />
        <span className="text-[10px] font-mono w-10 text-right">{Math.round(swing * 100)}%</span>
      </div>

      <div className="flex items-center gap-2 surface-2 rounded-md px-3 py-2 border border-[var(--border)]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Bars</span>
        <select
          value={bars}
          onChange={(e) => setBars(Number(e.target.value))}
          className="bg-transparent text-[var(--foreground)] font-mono text-sm outline-none"
        >
          {[1, 2, 4, 8, 16].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button
          onClick={onExport}
          disabled={exporting}
          className="h-8 px-3 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5 hover:bg-[var(--primary-glow)] transition-colors disabled:opacity-50"
        >
          <Download size={12} />
          {exporting ? "Rendering…" : "WAV"}
        </button>
      </div>
    </div>
  );
}