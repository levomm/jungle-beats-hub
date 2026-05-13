import { useEffect, useRef } from "react";

interface Props {
  buffer: AudioBuffer | null;
  start: number; // 0..1
  end: number;   // 0..1
  onChange: (start: number, end: number) => void;
  height?: number;
}

export function Waveform({ buffer, start, end, onChange, height = 64 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);

  // Draw peaks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (!buffer) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(0, h / 2 - 0.5, w, 1);
      return;
    }
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let min = 1, max = -1;
      const base = x * step;
      for (let i = 0; i < step; i++) {
        const v = data[base + i] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const y1 = (1 - (max + 1) / 2) * h;
      const y2 = (1 - (min + 1) / 2) * h;
      ctx.moveTo(x + 0.5, y1);
      ctx.lineTo(x + 0.5, y2);
    }
    ctx.stroke();
  }, [buffer]);

  const setFromX = (clientX: number, which: "start" | "end") => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (which === "start") onChange(Math.min(frac, end - 0.001), end);
    else onChange(start, Math.max(frac, start + 0.001));
  };

  const onDown = (e: React.PointerEvent, which: "start" | "end") => {
    e.preventDefault();
    dragRef.current = which;
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setFromX(e.clientX, dragRef.current);
  };
  const onUp = () => { dragRef.current = null; };

  return (
    <div
      ref={wrapRef}
      className="relative w-full surface-3 rounded-md border border-[var(--border)] overflow-hidden"
      style={{ height }}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Trim shadows */}
      <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: `${start * 100}%` }} />
      <div className="absolute inset-y-0 right-0 bg-black/55" style={{ width: `${(1 - end) * 100}%` }} />
      {/* Handles */}
      <div
        onPointerDown={(e) => onDown(e, "start")}
        className="absolute top-0 bottom-0 w-1.5 -ml-[3px] bg-[var(--primary)] cursor-ew-resize"
        style={{ left: `${start * 100}%` }}
      />
      <div
        onPointerDown={(e) => onDown(e, "end")}
        className="absolute top-0 bottom-0 w-1.5 -ml-[3px] bg-[var(--primary)] cursor-ew-resize"
        style={{ left: `${end * 100}%` }}
      />
    </div>
  );
}