"use client";

import { Headphones, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { setPreviewMuted } from "@/engine/audio/player";
import { formatTimecode } from "@/engine/model/time";
import { addVoiceover } from "@/store/actions";
import { useEditor } from "@/store/editor";
import { Chip, PanelShell } from "./controls";

type Phase = { kind: "idle" } | { kind: "countdown"; n: number } | { kind: "recording"; since: number } | { kind: "saving" };

const MIME_TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

/**
 * Records a voiceover from the microphone onto its own audio lane, starting at the playhead.
 * The video plays along so you can talk over it.
 */
export function VoiceoverPanel() {
  const playhead = useEditor((s) => s.playhead);
  const fps = useEditor((s) => s.project.canvas.fps);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [playAlong, setPlayAlong] = useState(true);
  const [muteVideo, setMuteVideo] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const session = useRef<{
    stream: MediaStream;
    recorder?: MediaRecorder;
    chunks: Blob[];
    start: number;
    ctx?: AudioContext;
    raf?: number;
    timer?: ReturnType<typeof setInterval>;
  } | null>(null);

  const cleanup = () => {
    const s = session.current;
    if (!s) return;
    if (s.raf) cancelAnimationFrame(s.raf);
    if (s.timer) clearInterval(s.timer);
    s.stream.getTracks().forEach((t) => t.stop());
    void s.ctx?.close();
    session.current = null;
    setPreviewMuted(false);
    setLevel(0);
  };
  useEffect(() => cleanup, []);

  const begin = () => {
    const s = session.current;
    if (!s) return;
    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(s.stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => e.data.size && s.chunks.push(e.data);
    s.recorder = recorder;
    s.start = useEditor.getState().playhead;
    recorder.start(250);
    setPreviewMuted(muteVideo);
    if (playAlong) useEditor.getState().play(s.start);
    const since = performance.now();
    setPhase({ kind: "recording", since });
    s.timer = setInterval(() => setElapsed((performance.now() - since) / 1000), 200);
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      session.current = { stream, chunks: [], start: 0 };
      // Live input level so you can see the mic is picking you up.
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      session.current.ctx = ctx;
      const data = new Uint8Array(analyser.fftSize);
      const meter = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
        setLevel(peak);
        if (session.current) session.current.raf = requestAnimationFrame(meter);
      };
      meter();

      if (!countIn) return begin();
      for (let n = 3; n > 0; n--) {
        setPhase({ kind: "countdown", n });
        await new Promise((r) => setTimeout(r, 700));
        if (!session.current) return;
      }
      begin();
    } catch {
      cleanup();
      setPhase({ kind: "idle" });
      setError("Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.");
    }
  };

  const stop = () => {
    const s = session.current;
    if (!s?.recorder) {
      cleanup();
      setPhase({ kind: "idle" });
      return;
    }
    useEditor.getState().pause();
    setPhase({ kind: "saving" });
    const recorder = s.recorder;
    recorder.onstop = async () => {
      const type = recorder.mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const file = new File(s.chunks, `Voiceover.${ext}`, { type });
      const startAt = s.start;
      cleanup();
      try {
        await addVoiceover(file, startAt);
      } catch {
        setError("Couldn't save that recording. Please try again.");
      }
      setPhase({ kind: "idle" });
      setElapsed(0);
    };
    recorder.stop();
  };

  const busy = phase.kind !== "idle";

  return (
    <PanelShell title="Voiceover">
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={busy ? stop : () => void start()}
          disabled={phase.kind === "saving"}
          aria-label={busy ? "Stop recording" : "Start recording"}
          className="relative flex size-20 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_0_0_6px_rgba(239,68,68,0.15)] transition-transform active:scale-95 disabled:opacity-50"
          style={{ boxShadow: `0 0 0 ${6 + level * 18}px rgba(239,68,68,${0.15 + level * 0.3})` }}
        >
          {phase.kind === "countdown" ? (
            <span className="text-3xl font-bold">{phase.n}</span>
          ) : busy ? (
            <Square className="size-7 fill-current" />
          ) : (
            <Mic className="size-8" />
          )}
        </button>
        <p className="text-sm text-neutral-300">
          {phase.kind === "recording"
            ? `Recording… ${elapsed.toFixed(1)}s. Tap to stop.`
            : phase.kind === "countdown"
              ? "Get ready…"
              : phase.kind === "saving"
                ? "Saving…"
                : `Starts at ${formatTimecode(playhead, fps)} on the timeline`}
        </p>
        {!busy && (
          <div className="flex flex-wrap justify-center gap-2">
            <Chip active={playAlong} onClick={() => setPlayAlong(!playAlong)}>
              Play video while recording
            </Chip>
            <Chip active={muteVideo} onClick={() => setMuteVideo(!muteVideo)}>
              Mute video sound
            </Chip>
            <Chip active={countIn} onClick={() => setCountIn(!countIn)}>
              3-2-1 count-in
            </Chip>
          </div>
        )}
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Headphones className="size-3.5" /> With the video sound on, headphones stop it being recorded too.
        </p>
        {error && <p className="rounded-lg bg-red-500/15 p-3 text-xs text-red-300">{error}</p>}
      </div>
    </PanelShell>
  );
}
