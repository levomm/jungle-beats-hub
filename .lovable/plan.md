## Status

The instrument is already built and matches most of the brief: 32 pads / 2 banks, drag+drop and file picker sample loading, runtime-synth jungle starter kit, per‑pad volume / pitch / start–end trim / reverse / choke / one‑shot–loop / lowpass / reverb send, 8x slice → Bank B, 16/32/64 step sequencer with shift‑accents and live playhead, 8 pattern slots with copy/paste/dup/clear/rename, transport with BPM input, tap tempo, swing, live‑record into pattern, character (HiFi/Std/LoFi/LoFi2), master reverb + compressor, keyboard QWERTY triggering, offline WAV render. Visual style is dark + neon green + acid orange.

Rather than rebuild, I’ll close the remaining gaps from the brief and verify the audio path end‑to‑end.

## Gaps to close

1. **Mute / Solo per pad** — listed as “if practical”, currently missing. Add `muted` and `soloed` flags to `PadState`, two small toggle buttons in `PadEditor` (and a faint indicator dot on `Pad`), and respect them in `playPad` / sequencer step trigger (any solo active ⇒ only soloed pads sound; muted pads never sound).
2. **WAV download** — confirm `exportWav` actually triggers a browser download (Blob → object URL → `<a download>`), and that offline render uses each pad’s lowpass + reverb send (not just master). Patch if missing.
3. **Slice UX clarity** — add an “Auto‑slice 8 / 16 → Bank B” shortcut button directly in the Pad Editor header when the selected pad has a buffer longer than ~1s, plus a tiny waveform strip in the editor showing start/end trim handles for fast chopping. Keep simple: canvas with sample peaks + two draggable markers bound to `startTrim`/`endTrim`.
4. **Sample drop zone** — brief calls out `SampleDrop.tsx`. Add a thin top‑bar drop target (“Drop break here → auto‑slice into Bank B”) so users don’t have to first park a break on a pad. It loads to pad 8 (the “break” slot) and immediately calls `sliceBreakIntoPads(8, 8, 1)`.
5. **Verification pass** — boot the engine in the preview, trigger pads via mouse + keyboard, play the seeded pattern, toggle character modes, slice the built‑in break, export 2 bars, confirm a `.wav` file downloads and plays back.

## Out of scope

No song mode, no cloud save, no MIDI, no auth, no marketing chrome. No new dependencies.

## Files touched

- `src/store/useBeatStore.ts` — add `muted`/`soloed`, solo‑aware playback, fix WAV download + per‑pad fx in offline render.
- `src/components/beat-machine/PadEditor.tsx` — mute/solo buttons, mini waveform with trim handles, inline slice shortcut.
- `src/components/beat-machine/Pad.tsx` — small mute/solo indicator.
- `src/components/beat-machine/SampleDrop.tsx` — new top‑bar break drop zone.
- `src/components/beat-machine/BeatMachine.tsx` — mount `SampleDrop` above pad grid.
