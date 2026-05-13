import * as Tone from "tone";

export type CharacterMode = "hifi" | "standard" | "lofi" | "lofi2";

/**
 * Master signal chain. Each pad routes into `padBus` -> master FX -> destination.
 * We expose individual nodes so the UI can tweak them in real time.
 */
class AudioEngine {
  started = false;
  padBus!: Tone.Gain;
  reverbSend!: Tone.Gain;
  reverb!: Tone.Reverb;
  characterChain!: Tone.Gain;
  toneShaper!: Tone.Filter;
  bitCrusher!: Tone.BitCrusher;
  saturation!: Tone.Distortion;
  stereoWidth!: Tone.StereoWidener;
  comp!: Tone.Compressor;
  masterGain!: Tone.Gain;

  async ensureStarted() {
    if (this.started) return;
    if (typeof window === "undefined") return;
    await Tone.start();
    this.build();
    this.started = true;
  }

  private build() {
    this.padBus = new Tone.Gain(1);

    // Reverb send (parallel)
    this.reverbSend = new Tone.Gain(0);
    this.reverb = new Tone.Reverb({ decay: 2.4, preDelay: 0.02, wet: 1 });

    // Master character chain (serial)
    this.toneShaper = new Tone.Filter({ frequency: 18000, type: "lowpass", rolloff: -12 });
    this.bitCrusher = new Tone.BitCrusher({ bits: 16 });
    // BitCrusher in Tone v15 has a `wet` param via the effect base
    (this.bitCrusher as unknown as { wet: Tone.Param<"normalRange"> }).wet.value = 0;
    this.saturation = new Tone.Distortion({ distortion: 0, wet: 0 });
    this.stereoWidth = new Tone.StereoWidener(0.7);
    this.characterChain = new Tone.Gain(1);

    this.comp = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.005, release: 0.12, knee: 12 });
    this.masterGain = new Tone.Gain(0.9);

    // Wire dry path
    this.padBus.connect(this.toneShaper);
    this.toneShaper.chain(this.bitCrusher, this.saturation, this.stereoWidth, this.characterChain, this.comp, this.masterGain, Tone.getDestination());

    // Wire reverb send
    this.padBus.connect(this.reverbSend);
    this.reverbSend.chain(this.reverb, this.comp);
  }

  setCharacter(mode: CharacterMode) {
    if (!this.started) return;
    const bc = this.bitCrusher as unknown as { wet: Tone.Param<"normalRange">; bits: Tone.Param<"positive"> };
    switch (mode) {
      case "hifi":
        this.toneShaper.frequency.value = 19000;
        bc.wet.value = 0;
        this.saturation.distortion = 0;
        this.saturation.wet.value = 0;
        this.stereoWidth.width.value = 0.85;
        break;
      case "standard":
        this.toneShaper.frequency.value = 14000;
        bc.wet.value = 0.15;
        bc.bits.value = 14;
        this.saturation.distortion = 0.18;
        this.saturation.wet.value = 0.25;
        this.stereoWidth.width.value = 0.7;
        break;
      case "lofi":
        this.toneShaper.frequency.value = 7800;
        bc.wet.value = 0.5;
        bc.bits.value = 10;
        this.saturation.distortion = 0.32;
        this.saturation.wet.value = 0.45;
        this.stereoWidth.width.value = 0.5;
        break;
      case "lofi2":
        this.toneShaper.frequency.value = 4200;
        bc.wet.value = 0.85;
        bc.bits.value = 7;
        this.saturation.distortion = 0.55;
        this.saturation.wet.value = 0.7;
        this.stereoWidth.width.value = 0.25;
        break;
    }
  }

  setReverbAmount(amount: number) {
    if (!this.started) return;
    this.reverbSend.gain.rampTo(amount, 0.05);
  }

  setCompAmount(amount: number) {
    if (!this.started) return;
    // amount 0..1 -> threshold -6 .. -28
    const threshold = -6 - amount * 22;
    this.comp.threshold.value = threshold;
    this.comp.ratio.value = 1.5 + amount * 6;
  }
}

export const engine = new AudioEngine();