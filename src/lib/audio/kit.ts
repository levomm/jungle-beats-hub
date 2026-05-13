import * as Tone from "tone";

/**
 * Synthesize a small jungle/DnB starter kit at runtime.
 * Returns AudioBuffers (no audio files shipped). Uses Tone.Offline for speed.
 */

export type KitSlot =
  | "kick"
  | "snare"
  | "hat"
  | "rim"
  | "sub"
  | "reese"
  | "vox"
  | "break";

export interface KitSample {
  name: string;
  buffer: AudioBuffer;
}

async function offline(durationSec: number, build: () => void): Promise<AudioBuffer> {
  const buf = await Tone.Offline(async () => {
    build();
  }, durationSec);
  return buf.get() as AudioBuffer;
}

async function makeKick(): Promise<AudioBuffer> {
  return offline(0.6, () => {
    const osc = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.1 },
    }).toDestination();
    osc.triggerAttackRelease("C1", "8n", 0);
  });
}

async function makeSnare(): Promise<AudioBuffer> {
  return offline(0.4, () => {
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
    }).toDestination();
    const body = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
    }).toDestination();
    body.volume.value = -6;
    body.triggerAttackRelease("G2", "16n", 0);
    noise.triggerAttackRelease("16n", 0.002);
  });
}

async function makeHat(): Promise<AudioBuffer> {
  return offline(0.18, () => {
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
    });
    const hp = new Tone.Filter({ frequency: 8000, type: "highpass" }).toDestination();
    noise.connect(hp);
    noise.triggerAttackRelease("32n", 0);
  });
}

async function makeRim(): Promise<AudioBuffer> {
  return offline(0.15, () => {
    const synth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    synth.volume.value = -16;
    synth.triggerAttackRelease("32n", 0);
  });
}

async function makeSub(): Promise<AudioBuffer> {
  return offline(0.9, () => {
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.005, decay: 0.7, sustain: 0.2, release: 0.2 },
    }).toDestination();
    synth.triggerAttackRelease("A1", "4n", 0);
  });
}

async function makeReese(): Promise<AudioBuffer> {
  return offline(1.2, () => {
    const a = new Tone.Oscillator({ frequency: 55, type: "sawtooth", detune: -10 });
    const b = new Tone.Oscillator({ frequency: 55, type: "sawtooth", detune: 12 });
    const filter = new Tone.Filter({ frequency: 800, type: "lowpass", Q: 4 });
    const lfo = new Tone.LFO(0.6, 200, 1400).start();
    lfo.connect(filter.frequency);
    const gain = new Tone.Gain(0.6).toDestination();
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain);
    a.start(0).stop(1.0);
    b.start(0).stop(1.0);
  });
}

async function makeVox(): Promise<AudioBuffer> {
  return offline(0.5, () => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.2 },
    });
    const formant = new Tone.Filter({ frequency: 900, type: "bandpass", Q: 6 }).toDestination();
    synth.connect(formant);
    synth.volume.value = -10;
    synth.triggerAttackRelease(["E3", "G3", "B3"], "8n", 0);
  });
}

/** A 2-bar 170BPM synthesized breakbeat suitable for chopping. ~1.41s */
async function makeBreak(): Promise<AudioBuffer> {
  // 170 BPM => quarter = 0.3529s, 16th = 0.0882s, 2 bars = ~2.82s
  const bar = (60 / 170) * 4;
  const len = bar * 2 + 0.2;
  return offline(len, () => {
    const out = new Tone.Gain(0.9).toDestination();

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 },
    });
    kick.connect(out);

    const snareNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
    });
    const snareHp = new Tone.Filter({ frequency: 1200, type: "highpass" });
    snareNoise.connect(snareHp);
    snareHp.connect(out);

    const hatNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
    });
    const hatHp = new Tone.Filter({ frequency: 8000, type: "highpass" });
    hatNoise.connect(hatHp);
    hatHp.connect(out);
    hatNoise.volume.value = -8;

    const sixteenth = (60 / 170) / 4;
    // Classic amen-style pattern across 16 sixteenths per bar, x2
    const kicks = [0, 6, 10];
    const snares = [4, 12, 14];
    const hats = [0, 2, 4, 6, 8, 10, 12, 14];

    for (let b = 0; b < 2; b++) {
      const offset = b * bar;
      kicks.forEach((s) => kick.triggerAttackRelease("C1", "16n", offset + s * sixteenth));
      snares.forEach((s) => snareNoise.triggerAttackRelease("16n", offset + s * sixteenth));
      hats.forEach((s) => hatNoise.triggerAttackRelease("32n", offset + s * sixteenth));
    }
  });
}

export async function buildKit(): Promise<Record<KitSlot, KitSample>> {
  const [kick, snare, hat, rim, sub, reese, vox, brk] = await Promise.all([
    makeKick(),
    makeSnare(),
    makeHat(),
    makeRim(),
    makeSub(),
    makeReese(),
    makeVox(),
    makeBreak(),
  ]);
  return {
    kick: { name: "Kick", buffer: kick },
    snare: { name: "Snare", buffer: snare },
    hat: { name: "Hat", buffer: hat },
    rim: { name: "Rim", buffer: rim },
    sub: { name: "Sub", buffer: sub },
    reese: { name: "Reese", buffer: reese },
    vox: { name: "Vox Stab", buffer: vox },
    break: { name: "Amen Brk", buffer: brk },
  };
}

/** Encode an AudioBuffer to a 16-bit PCM WAV Blob. */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const ab = new ArrayBuffer(length);
  const view = new DataView(ab);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length - 44, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

export function sliceBuffer(source: AudioBuffer, slices: number): AudioBuffer[] {
  const ctx = new OfflineAudioContext(source.numberOfChannels, source.length, source.sampleRate);
  // We don't actually need ctx; just allocate new buffers via AudioContext.
  void ctx;
  const audioCtx = (Tone.getContext().rawContext as unknown as AudioContext);
  const sliceLen = Math.floor(source.length / slices);
  const out: AudioBuffer[] = [];
  for (let i = 0; i < slices; i++) {
    const buf = audioCtx.createBuffer(source.numberOfChannels, sliceLen, source.sampleRate);
    for (let c = 0; c < source.numberOfChannels; c++) {
      const data = source.getChannelData(c).subarray(i * sliceLen, i * sliceLen + sliceLen);
      buf.copyToChannel(data, c, 0);
    }
    out.push(buf);
  }
  return out;
}

export async function decodeFile(file: File): Promise<AudioBuffer> {
  const arr = await file.arrayBuffer();
  const ctx = Tone.getContext().rawContext as unknown as AudioContext;
  return ctx.decodeAudioData(arr.slice(0));
}