import { create } from "zustand";
import * as Tone from "tone";
import { engine, type CharacterMode } from "@/lib/audio/engine";
import { audioBufferToWav, buildKit, decodeFile, sliceBuffer, type KitSlot } from "@/lib/audio/kit";

export type PlaybackMode = "oneshot" | "loop";

export interface PadState {
  id: number; // 0..31
  name: string;
  buffer: AudioBuffer | null;
  volume: number; // 0..1.5
  pitch: number; // semitones, -24..24
  startTrim: number; // 0..1 fraction
  endTrim: number; // 0..1 fraction (>= start)
  reverse: boolean;
  chokeGroup: number; // 0 = none, 1..4
  mode: PlaybackMode;
  lpCutoff: number; // hz 200..20000
  reverbSend: number; // 0..1
  muted: boolean;
  soloed: boolean;
}

export interface PatternState {
  name: string;
  /** steps[padId] = boolean[] of length stepCount; stepCount may differ per pattern */
  steps: Record<number, boolean[]>;
  velocities: Record<number, number[]>; // 0..1 per step
  length: 16 | 32 | 64;
}

interface BeatStore {
  ready: boolean;
  loadingMessage: string;
  pads: PadState[];
  selectedPadId: number;
  activeBank: 0 | 1;

  patterns: PatternState[];
  activePatternIndex: number;

  bpm: number;
  swing: number; // 0..1
  isPlaying: boolean;
  isRecording: boolean;
  currentStep: number;

  character: CharacterMode;
  reverbAmount: number;
  compAmount: number;

  // actions
  init: () => Promise<void>;
  selectPad: (id: number) => void;
  setActiveBank: (b: 0 | 1) => void;
  triggerPad: (id: number, velocity?: number, time?: number) => void;
  loadFileToPad: (id: number, file: File) => Promise<void>;
  loadKitToPad: (id: number, slot: KitSlot) => void;
  updatePad: (id: number, patch: Partial<PadState>) => void;

  toggleStep: (padId: number, step: number, accent?: boolean) => void;
  clearPattern: () => void;
  copyPattern: () => void;
  pastePattern: () => void;
  duplicatePattern: () => void;
  selectPattern: (i: number) => void;
  renamePattern: (name: string) => void;
  setPatternLength: (l: 16 | 32 | 64) => void;

  setBpm: (n: number) => void;
  setSwing: (n: number) => void;
  tapTempo: () => void;
  play: () => Promise<void>;
  stop: () => void;
  toggleRecord: () => void;

  setCharacter: (m: CharacterMode) => void;
  setReverbAmount: (n: number) => void;
  setCompAmount: (n: number) => void;

  sliceBreakIntoPads: (sourcePadId: number, count?: number, startBank?: 0 | 1) => void;

  exportWav: (bars: number) => Promise<void>;
}

const PAD_COUNT = 32;

function emptyPad(id: number): PadState {
  return {
    id,
    name: `P${id + 1}`,
    buffer: null,
    volume: 1,
    pitch: 0,
    startTrim: 0,
    endTrim: 1,
    reverse: false,
    chokeGroup: 0,
    mode: "oneshot",
    lpCutoff: 20000,
    reverbSend: 0,
    muted: false,
    soloed: false,
  };
}

function emptyPattern(name: string): PatternState {
  return { name, steps: {}, velocities: {}, length: 16 };
}

let clipboard: PatternState | null = null;
const tapTimes: number[] = [];

/** Reverse a buffer (creates a new AudioBuffer). */
function reverseBuffer(src: AudioBuffer): AudioBuffer {
  const ctx = Tone.getContext().rawContext as unknown as AudioContext;
  const out = ctx.createBuffer(src.numberOfChannels, src.length, src.sampleRate);
  for (let c = 0; c < src.numberOfChannels; c++) {
    const dst = out.getChannelData(c);
    const data = src.getChannelData(c);
    for (let i = 0; i < data.length; i++) dst[i] = data[data.length - 1 - i];
  }
  return out;
}

/** Per-pad active player tracking for choke groups. */
const livePlayers = new Map<number, Tone.ToneBufferSource[]>();

/** Returns true if this pad should be audible given the global solo state. */
function isAudible(pad: PadState, pads: PadState[]): boolean {
  if (pad.muted) return false;
  const anySolo = pads.some((p) => p.soloed);
  if (anySolo && !pad.soloed) return false;
  return true;
}

function stopChokeGroup(pads: PadState[], group: number) {
  if (group <= 0) return;
  pads.forEach((p) => {
    if (p.chokeGroup === group) {
      const players = livePlayers.get(p.id);
      if (players) {
        players.forEach((pl) => {
          try {
            pl.stop();
          } catch {
            /* noop */
          }
        });
        livePlayers.set(p.id, []);
      }
    }
  });
}

function playPad(pad: PadState, velocity: number, time?: number) {
  if (!pad.buffer) return;
  const buf = pad.reverse ? reverseBuffer(pad.buffer) : pad.buffer;
  const tBuf = new Tone.ToneAudioBuffer(buf);
  const src = new Tone.ToneBufferSource({
    url: tBuf,
    playbackRate: Math.pow(2, pad.pitch / 12),
    loop: pad.mode === "loop",
  });
  // Per-pad effects: lowpass + reverb send via dedicated nodes
  const lp = new Tone.Filter({ frequency: pad.lpCutoff, type: "lowpass" });
  const gain = new Tone.Gain(pad.volume * velocity);
  src.chain(lp, gain, engine.padBus);
  // Per-pad reverb send
  if (pad.reverbSend > 0) {
    const sendGain = new Tone.Gain(pad.reverbSend);
    gain.connect(sendGain);
    sendGain.connect(engine.reverbSend);
  }

  const dur = pad.buffer.duration;
  const startSec = pad.startTrim * dur;
  const endSec = Math.max(startSec + 0.01, pad.endTrim * dur);
  const playLen = endSec - startSec;

  const t = time ?? Tone.now();
  src.start(t, startSec, playLen);

  const arr = livePlayers.get(pad.id) ?? [];
  arr.push(src);
  livePlayers.set(pad.id, arr);

  src.onended = () => {
    const list = livePlayers.get(pad.id) ?? [];
    livePlayers.set(
      pad.id,
      list.filter((p) => p !== src),
    );
    src.dispose();
    lp.dispose();
    gain.dispose();
  };
}

/** Tone.Transport sequencer */
let sequenceLoop: Tone.Loop | null = null;

export const useBeatStore = create<BeatStore>((set, get) => ({
  ready: false,
  loadingMessage: "",
  pads: Array.from({ length: PAD_COUNT }, (_, i) => emptyPad(i)),
  selectedPadId: 0,
  activeBank: 0,

  patterns: Array.from({ length: 8 }, (_, i) => emptyPattern(`PTN ${i + 1}`)),
  activePatternIndex: 0,

  bpm: 170,
  swing: 0.12,
  isPlaying: false,
  isRecording: false,
  currentStep: -1,

  character: "standard",
  reverbAmount: 0.18,
  compAmount: 0.4,

  init: async () => {
    if (get().ready) return;
    set({ loadingMessage: "Booting audio engine…" });
    await engine.ensureStarted();
    set({ loadingMessage: "Synthesising starter kit…" });
    const kit = await buildKit();

    // Map kit to first 8 pads of bank A
    const slots: KitSlot[] = ["kick", "snare", "hat", "rim", "sub", "reese", "vox", "break"];
    const pads = [...get().pads];
    slots.forEach((slot, i) => {
      const k = kit[slot];
      pads[i] = { ...pads[i], name: k.name, buffer: k.buffer };
    });
    // Make break loopable by default? keep oneshot for chopping; user can flip.

    // Apply master defaults
    engine.setCharacter(get().character);
    engine.setReverbAmount(get().reverbAmount);
    engine.setCompAmount(get().compAmount);

    Tone.getTransport().bpm.value = get().bpm;
    Tone.getTransport().swing = get().swing;
    Tone.getTransport().swingSubdivision = "16n";

    // Default seed pattern: kick on 1,5,9,13 ; snare on 5,13 ; hat every 2
    const seed = emptyPattern("PTN 1");
    seed.steps[0] = Array(16).fill(false); [0, 6, 10].forEach((s) => (seed.steps[0][s] = true));
    seed.steps[1] = Array(16).fill(false); [4, 12].forEach((s) => (seed.steps[1][s] = true));
    seed.steps[2] = Array(16).fill(false); for (let i = 0; i < 16; i += 2) seed.steps[2][i] = true;
    [0, 1, 2].forEach((id) => {
      seed.velocities[id] = Array(16).fill(1);
    });
    const patterns = [...get().patterns];
    patterns[0] = seed;

    set({ pads, patterns, ready: true, loadingMessage: "" });
  },

  selectPad: (id) => set({ selectedPadId: id }),
  setActiveBank: (b) => set({ activeBank: b }),

  triggerPad: (id, velocity = 1, time) => {
    const pad = get().pads[id];
    if (!pad) return;
    if (!isAudible(pad, get().pads)) return;
    if (pad.chokeGroup > 0) stopChokeGroup(get().pads, pad.chokeGroup);
    playPad(pad, velocity, time);

    if (get().isRecording && get().isPlaying) {
      // Quantise to nearest step
      const step = Math.round(Tone.getTransport().ticks / Tone.getTransport().PPQ * 4) % get().patterns[get().activePatternIndex].length;
      get().toggleStep(id, step, true);
    }
  },

  loadFileToPad: async (id, file) => {
    const buf = await decodeFile(file);
    const pads = [...get().pads];
    const name = file.name.replace(/\.[^/.]+$/, "").slice(0, 10);
    pads[id] = { ...pads[id], buffer: buf, name };
    set({ pads });
  },

  loadKitToPad: (id, slot) => {
    // Re-build kit on demand is heavy; expose only via init. Stub for future.
    void id; void slot;
  },

  updatePad: (id, patch) => {
    const pads = [...get().pads];
    pads[id] = { ...pads[id], ...patch };
    if (patch.endTrim !== undefined && patch.endTrim < pads[id].startTrim) {
      pads[id].endTrim = pads[id].startTrim;
    }
    set({ pads });
  },

  toggleStep: (padId, step, accent) => {
    const patterns = get().patterns.map((p) => ({ ...p, steps: { ...p.steps }, velocities: { ...p.velocities } }));
    const p = patterns[get().activePatternIndex];
    const len = p.length;
    if (!p.steps[padId]) p.steps[padId] = Array(len).fill(false);
    if (!p.velocities[padId]) p.velocities[padId] = Array(len).fill(1);
    p.steps[padId] = [...p.steps[padId]];
    p.velocities[padId] = [...p.velocities[padId]];
    if (accent) {
      p.steps[padId][step] = true;
      p.velocities[padId][step] = 1.2;
    } else {
      p.steps[padId][step] = !p.steps[padId][step];
      p.velocities[padId][step] = 1;
    }
    set({ patterns });
  },

  clearPattern: () => {
    const patterns = [...get().patterns];
    const i = get().activePatternIndex;
    patterns[i] = { ...emptyPattern(patterns[i].name), length: patterns[i].length };
    set({ patterns });
  },

  copyPattern: () => {
    const p = get().patterns[get().activePatternIndex];
    clipboard = JSON.parse(JSON.stringify(p));
  },

  pastePattern: () => {
    if (!clipboard) return;
    const patterns = [...get().patterns];
    patterns[get().activePatternIndex] = JSON.parse(JSON.stringify(clipboard));
    set({ patterns });
  },

  duplicatePattern: () => {
    const patterns = [...get().patterns];
    const i = get().activePatternIndex;
    const next = (i + 1) % patterns.length;
    patterns[next] = { ...JSON.parse(JSON.stringify(patterns[i])), name: `${patterns[i].name}+` };
    set({ patterns, activePatternIndex: next });
  },

  selectPattern: (i) => set({ activePatternIndex: i }),
  renamePattern: (name) => {
    const patterns = [...get().patterns];
    patterns[get().activePatternIndex] = { ...patterns[get().activePatternIndex], name };
    set({ patterns });
  },
  setPatternLength: (l) => {
    const patterns = [...get().patterns];
    const i = get().activePatternIndex;
    const p = { ...patterns[i], length: l };
    // Resize step arrays
    Object.keys(p.steps).forEach((key) => {
      const padId = Number(key);
      const arr = p.steps[padId] ?? [];
      const next = Array(l).fill(false);
      for (let s = 0; s < Math.min(l, arr.length); s++) next[s] = arr[s];
      p.steps[padId] = next;
      const va = p.velocities[padId] ?? [];
      const nv = Array(l).fill(1);
      for (let s = 0; s < Math.min(l, va.length); s++) nv[s] = va[s];
      p.velocities[padId] = nv;
    });
    patterns[i] = p;
    set({ patterns });
  },

  setBpm: (n) => {
    set({ bpm: n });
    Tone.getTransport().bpm.rampTo(n, 0.05);
  },
  setSwing: (n) => {
    set({ swing: n });
    Tone.getTransport().swing = n;
  },
  tapTempo: () => {
    const now = performance.now();
    tapTimes.push(now);
    while (tapTimes.length > 6) tapTimes.shift();
    if (tapTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avg);
      const clamped = Math.max(60, Math.min(240, bpm));
      get().setBpm(clamped);
    }
  },

  play: async () => {
    await engine.ensureStarted();
    if (get().isPlaying) return;
    const transport = Tone.getTransport();

    if (sequenceLoop) {
      sequenceLoop.dispose();
      sequenceLoop = null;
    }

    let stepIndex = 0;
    sequenceLoop = new Tone.Loop((time) => {
      const state = get();
      const p = state.patterns[state.activePatternIndex];
      const len = p.length;
      const step = stepIndex % len;

      Object.keys(p.steps).forEach((key) => {
        const padId = Number(key);
        if (p.steps[padId][step]) {
          const vel = (p.velocities[padId]?.[step] ?? 1);
          const pad = state.pads[padId];
          if (pad && isAudible(pad, state.pads)) {
            if (pad.chokeGroup > 0) stopChokeGroup(state.pads, pad.chokeGroup);
            playPad(pad, vel, time);
          }
        }
      });

      Tone.getDraw().schedule(() => {
        set({ currentStep: step });
      }, time);

      stepIndex++;
    }, "16n").start(0);

    transport.start();
    set({ isPlaying: true });
  },

  stop: () => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    if (sequenceLoop) {
      sequenceLoop.dispose();
      sequenceLoop = null;
    }
    set({ isPlaying: false, currentStep: -1 });
  },

  toggleRecord: () => set({ isRecording: !get().isRecording }),

  setCharacter: (m) => {
    set({ character: m });
    engine.setCharacter(m);
  },
  setReverbAmount: (n) => {
    set({ reverbAmount: n });
    engine.setReverbAmount(n);
  },
  setCompAmount: (n) => {
    set({ compAmount: n });
    engine.setCompAmount(n);
  },

  sliceBreakIntoPads: (sourcePadId, count = 8, startBank = 1) => {
    const src = get().pads[sourcePadId]?.buffer;
    if (!src) return;
    const slices = sliceBuffer(src, count);
    const pads = [...get().pads];
    const baseId = startBank === 1 ? 16 : 0;
    slices.forEach((buf, i) => {
      const id = baseId + i;
      pads[id] = { ...pads[id], buffer: buf, name: `Chop${i + 1}` };
    });
    set({ pads, activeBank: startBank });
  },

  exportWav: async (bars) => {
    const state = get();
    const secPerBar = (60 / state.bpm) * 4;
    const totalSec = secPerBar * bars + 0.4; // tail

    const rendered = await Tone.Offline(async (ctx) => {
      // Re-create master chain in offline context
      const reverb = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 1 });
      await reverb.generate();
      const reverbSend = new Tone.Gain(state.reverbAmount);
      const toneShaper = new Tone.Filter({ frequency: 14000, type: "lowpass" });
      const bc = new Tone.BitCrusher({ bits: 14 });
      (bc as unknown as { wet: Tone.Param<"normalRange"> }).wet.value = 0.15;
      const sat = new Tone.Distortion({ distortion: 0.18, wet: 0.25 });
      const sw = new Tone.StereoWidener(0.7);
      const comp = new Tone.Compressor({
        threshold: -6 - state.compAmount * 22,
        ratio: 1.5 + state.compAmount * 6,
        attack: 0.005,
        release: 0.12,
      });
      const out = new Tone.Gain(0.9).toDestination();

      // Apply current character to offline chain
      const map: Record<CharacterMode, () => void> = {
        hifi: () => { toneShaper.frequency.value = 19000; (bc as unknown as { wet: Tone.Param<"normalRange"> }).wet.value = 0; sat.wet.value = 0; sw.width.value = 0.85; },
        standard: () => { toneShaper.frequency.value = 14000; (bc as unknown as { wet: Tone.Param<"normalRange"> }).wet.value = 0.15; sat.wet.value = 0.25; sw.width.value = 0.7; },
        lofi: () => { toneShaper.frequency.value = 7800; (bc as unknown as { wet: Tone.Param<"normalRange">; bits: Tone.Param<"positive"> }).wet.value = 0.5; (bc as unknown as { bits: Tone.Param<"positive"> }).bits.value = 10; sat.wet.value = 0.45; sw.width.value = 0.5; },
        lofi2: () => { toneShaper.frequency.value = 4200; (bc as unknown as { wet: Tone.Param<"normalRange">; bits: Tone.Param<"positive"> }).wet.value = 0.85; (bc as unknown as { bits: Tone.Param<"positive"> }).bits.value = 7; sat.wet.value = 0.7; sw.width.value = 0.25; },
      };
      map[state.character]();

      const padBus = new Tone.Gain(1);
      padBus.chain(toneShaper, bc, sat, sw, comp, out);
      padBus.connect(reverbSend);
      reverbSend.chain(reverb, comp);

      const transport = ctx.transport;
      transport.bpm.value = state.bpm;
      transport.swing = state.swing;
      transport.swingSubdivision = "16n";

      const p = state.patterns[state.activePatternIndex];
      const stepDur = (60 / state.bpm) / 4;
      const stepsToPlay = bars * 16;

      for (let s = 0; s < stepsToPlay; s++) {
        const step = s % p.length;
        Object.keys(p.steps).forEach((key) => {
          const padId = Number(key);
          if (p.steps[padId][step]) {
            const pad = state.pads[padId];
            if (!pad?.buffer) return;
            if (!isAudible(pad, state.pads)) return;
            const vel = pad.volume * (p.velocities[padId]?.[step] ?? 1);
            const buf = pad.reverse ? reverseBuffer(pad.buffer) : pad.buffer;
            const tBuf = new Tone.ToneAudioBuffer(buf);
            const src = new Tone.ToneBufferSource({
              url: tBuf,
              playbackRate: Math.pow(2, pad.pitch / 12),
            });
            const lp = new Tone.Filter({ frequency: pad.lpCutoff, type: "lowpass" });
            const g = new Tone.Gain(vel);
            src.chain(lp, g, padBus);
            if (pad.reverbSend > 0) {
              const sg = new Tone.Gain(pad.reverbSend);
              g.connect(sg);
              sg.connect(reverbSend);
            }
            const dur = pad.buffer.duration;
            const startSec = pad.startTrim * dur;
            const endSec = Math.max(startSec + 0.01, pad.endTrim * dur);
            src.start(s * stepDur, startSec, endSec - startSec);
          }
        });
      }
      transport.start();
    }, totalSec);

    const wav = audioBufferToWav(rendered.get() as AudioBuffer);
    const url = URL.createObjectURL(wav);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loop-${state.bpm}bpm-${bars}bar.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
}));