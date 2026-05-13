import { useEffect, useRef, useState } from "react";
import { useBeatStore, type PadState } from "@/store/useBeatStore";
import { cn } from "@/lib/utils";

interface Props {
  pad: PadState;
  index: number; // 0..15 visible position
  hotkey?: string;
}

export function Pad({ pad, index, hotkey }: Props) {
  const trigger = useBeatStore((s) => s.triggerPad);
  const select = useBeatStore((s) => s.selectPad);
  const selected = useBeatStore((s) => s.selectedPadId === pad.id);
  const loadFile = useBeatStore((s) => s.loadFileToPad);
  const isPlaying = useBeatStore((s) => s.isPlaying);
  const currentStep = useBeatStore((s) => s.currentStep);
  const activePattern = useBeatStore((s) => s.patterns[s.activePatternIndex]);
  const [flash, setFlash] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isStepLit = isPlaying && activePattern.steps[pad.id]?.[currentStep];

  useEffect(() => {
    if (isStepLit) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 90);
      return () => clearTimeout(t);
    }
  }, [isStepLit, currentStep]);

  const handleClick = () => {
    select(pad.id);
    trigger(pad.id, 1);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(pad.id, f);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onMouseDown={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          fileRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={cn(
          "group relative aspect-square w-full rounded-[10px] border surface-2 transition-all duration-75",
          "flex flex-col justify-between p-2 text-left select-none",
          "border-[var(--border)] hover:border-[var(--border-strong)]",
          selected && "border-[var(--primary)] ring-1 ring-[var(--primary)]",
          flash && "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]",
          drag && "border-[var(--primary)] bg-[var(--surface-3)]",
          !pad.buffer && "opacity-70",
        )}
      >
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider opacity-70">
          <span>{(index + 1).toString().padStart(2, "0")}</span>
          {hotkey && <span className="opacity-60">{hotkey}</span>}
        </div>
        <div className="text-[11px] font-medium leading-tight truncate">
          {pad.buffer ? pad.name : "empty"}
        </div>
        {pad.chokeGroup > 0 && (
          <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--warn)]" />
        )}
        {(pad.muted || pad.soloed) && (
          <div className={cn(
            "absolute bottom-1 right-1 px-1 rounded-[3px] text-[8px] font-mono uppercase",
            pad.soloed ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--warn)] text-[var(--warn-foreground)]",
          )}>
            {pad.soloed ? "S" : "M"}
          </div>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadFile(pad.id, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}