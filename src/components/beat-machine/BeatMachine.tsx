import { useEffect } from "react";
import { useBeatStore } from "@/store/useBeatStore";
import { Transport } from "./Transport";
import { PadGrid } from "./PadGrid";
import { PadEditor } from "./PadEditor";
import { StepSequencer } from "./StepSequencer";
import { PatternBar } from "./PatternBar";
import { MasterFx } from "./MasterFx";
import { SampleDrop } from "./SampleDrop";

export function BeatMachine() {
  const ready = useBeatStore((s) => s.ready);
  const loading = useBeatStore((s) => s.loadingMessage);
  const init = useBeatStore((s) => s.init);

  useEffect(() => {
    // Pre-load (audio context starts on user gesture below)
    void 0;
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="surface-1 border border-[var(--border)] rounded-2xl p-10 max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--primary)]">
              Jungle · Drum & Bass · Sampler
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">CHOPSHOP</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              A browser-based pad sampler for chopping breaks at 170 BPM. Click below to boot the audio engine and synthesise the starter kit.
            </p>
          </div>
          <button
            onClick={() => init()}
            disabled={!!loading}
            className="w-full h-12 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] font-mono uppercase tracking-[0.2em] text-sm hover:bg-[var(--primary-glow)] transition-colors disabled:opacity-60"
          >
            {loading || "Boot Engine"}
          </button>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] leading-relaxed">
            32 pads · 8 patterns · live chop · WAV export
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] surface-1">
        <div className="max-w-[1400px] mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[var(--primary)] flex items-center justify-center">
              <span className="text-[var(--primary-foreground)] font-mono font-bold text-sm">CS</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight leading-none">CHOPSHOP</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)] mt-0.5">
                Jungle / DnB sampler
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
            <span>Web Audio · Tone.js</span>
            <span className="hidden sm:inline">Built for breaks</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 py-5 space-y-4">
        <Transport />
        <PatternBar />
        <SampleDrop />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <div className="space-y-4 min-w-0">
            <PadGrid />
            <StepSequencer />
          </div>
          <div className="space-y-4">
            <PadEditor />
            <MasterFx />
          </div>
        </div>

        <footer className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--muted-foreground)] py-4 text-center">
          Drag any audio file onto a pad · Right-click to browse · Slice breaks into bank B
        </footer>
      </main>
    </div>
  );
}