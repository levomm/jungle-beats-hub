import { createFileRoute } from "@tanstack/react-router";
import { BeatMachine } from "@/components/beat-machine/BeatMachine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CHOPSHOP — Jungle & Drum and Bass Sampler" },
      { name: "description", content: "Browser-based pad sampler and step sequencer for chopping breaks and building DnB / jungle loops at 170 BPM." },
      { property: "og:title", content: "CHOPSHOP — Jungle & DnB Sampler" },
      { property: "og:description", content: "Chop breaks, sequence patterns, export WAV. All in the browser." },
    ],
  }),
  component: Index,
});

function Index() {
  return <BeatMachine />;
}
