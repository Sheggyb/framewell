"use client";

import { FileDown, FileUp, Hand, ListRestart, Play, Square, Trash } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAPTION_Y,
  captionClips,
  cuesFromProject,
  formatSrt,
  highlightCaptions,
  moveCaptions,
  parseSrt,
  setCaptions,
  splitScript,
  styleCaptions,
  timeEvenly,
  type CaptionCue,
} from "@/engine/model/captions";
import { getTrack, projectDuration, trackEnd } from "@/engine/model/ops";
import { CAPTION_PRESETS, presetStyle } from "@/engine/model/text";
import { secondsToUs, type Micros } from "@/engine/model/time";
import { t as translate, useT } from "@/i18n";
import { useEditor } from "@/store/editor";
import { Rich } from "@/components/i18n/Rich";
import { Chip, PanelShell, Section, Tabs } from "./controls";
import { previewCss, Swatches, usePresetLabel } from "./TextPanel";

type Tab = "write" | "style" | "file";

/** Time range captions should cover: the main video, or the whole timeline for text-only projects. */
function captionRange(): [Micros, Micros] {
  const { project } = useEditor.getState();
  const main = getTrack(project, "main");
  const end = (main && trackEnd(main)) || projectDuration(project);
  return [0, end];
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Manual captions: write the script, then tap along while it plays (each tap starts the
 * next line), or spread lines evenly. Stored as text clips on the caption track.
 */
export function CaptionsPanel() {
  const t = useT();
  const presetLabel = usePresetLabel();
  const project = useEditor((s) => s.project);
  const existing = captionClips(project);
  const [tab, setTab] = useState<Tab>("write");
  const [script, setScript] = useState(() => existing.map((c) => c.text).join("\n"));
  const [presetId, setPresetId] = useState("cap-bold");
  const [taps, setTaps] = useState<Micros[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const srtInput = useRef<HTMLInputElement>(null);

  const lines = splitScript(script);
  const tapping = taps !== null;

  const save = useCallback(
    (cues: CaptionCue[], label: string) => {
      useEditor.getState().edit(label, (d) => setCaptions(d, cues, presetId));
      setMessage(translate("text.captions.added", { count: cues.length }));
    },
    [presetId],
  );

  const finishTapping = useCallback(
    (times: Micros[]) => {
      const s = useEditor.getState();
      s.pause();
      setTaps(null);
      if (times.length === 0) return;
      const end = Math.max(s.playhead, times.at(-1)! + secondsToUs(0.5));
      const cues = lines.slice(0, times.length).map((text, i) => ({ start: times[i], end: times[i + 1] ?? end, text }));
      save(cues, translate("text.undo.timeCaptions"));
    },
    [lines, save],
  );

  const tap = useCallback(() => {
    if (!taps) return;
    const next = [...taps, useEditor.getState().playhead];
    // One tap per line start, plus a final tap to end the last line.
    if (next.length > lines.length) finishTapping(next.slice(0, lines.length));
    else setTaps(next);
  }, [taps, lines.length, finishTapping]);

  // Playback stopping (end of video, or paused) finishes the session with whatever was tapped.
  const latest = useRef({ taps, finishTapping });
  useEffect(() => {
    latest.current = { taps, finishTapping };
  });
  useEffect(() => {
    if (!tapping) return;
    return useEditor.subscribe((state, prev) => {
      const { taps: tapped, finishTapping: finish } = latest.current;
      if (prev.playing && !state.playing && tapped && tapped.length > 0) finish(tapped);
    });
  }, [tapping]);

  // Space taps while timing (instead of play/pause).
  useEffect(() => {
    if (!tapping) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      tap();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [tapping, tap]);

  const startTapping = () => {
    if (lines.length === 0) return;
    setMessage(null);
    setTaps([]);
    const s = useEditor.getState();
    s.play(s.playhead >= projectDuration(s.project) - 1 ? 0 : s.playhead);
  };

  const splitEvenly = () => {
    if (lines.length === 0) return;
    const [start, end] = captionRange();
    save(timeEvenly(lines, start, end || secondsToUs(2 * lines.length)), t("text.undo.captions"));
  };

  const importSrt = async (file: File | undefined) => {
    if (!file) return;
    const cues = parseSrt(await file.text());
    if (cues.length === 0) {
      setMessage(t("text.captions.noneInFile"));
      return;
    }
    setScript(cues.map((c) => c.text).join("\n"));
    save(cues, t("text.undo.importCaptions"));
  };

  if (tapping) {
    const current = taps.length - 1;
    const upcoming = lines[taps.length];
    return (
      <PanelShell title={t("text.captions.tapToTime")}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-400">
            {taps.length === 0
              ? t("text.captions.tapFirst")
              : taps.length < lines.length
                ? t("text.captions.tapNext", { line: taps.length, total: lines.length })
                : t("text.captions.tapLast")}
          </p>
          <div className="min-h-12 rounded-lg bg-white/5 p-3 text-base font-semibold text-white">
            {current >= 0 ? lines[current] : "…"}
          </div>
          {upcoming && <p className="truncate text-sm text-neutral-500">{t("text.captions.next", { line: upcoming })}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                tap();
              }}
              className="flex h-16 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-base font-bold text-neutral-950 active:bg-gold-soft"
            >
              <Hand className="size-5" /> {t("text.captions.tap")}
            </button>
            <button
              type="button"
              onClick={() => finishTapping(taps)}
              aria-label={t("text.captions.stop")}
              className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-white"
            >
              <Square className="size-5 fill-current" />
            </button>
          </div>
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell title={t("text.captions.title")}>
      <div className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            ["write", t("text.captions.write")],
            ["style", t("text.captions.style")],
            ["file", t("text.captions.file")],
          ]}
        />

        {tab === "write" && (
          <>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={4}
              // Arabic (or any right-to-left) captions are typed right to left.
              dir="auto"
              placeholder={t("text.captions.placeholder")}
              className="w-full resize-none rounded-lg border border-white/10 bg-neutral-900 p-3 text-base text-white outline-none focus:border-gold/60"
            />
            <div className="grid grid-cols-2 gap-2">
              <Chip onClick={startTapping} className={lines.length ? "" : "opacity-40"}>
                <Play /> {t("text.captions.tapToTime")}
              </Chip>
              <Chip onClick={splitEvenly} className={lines.length ? "" : "opacity-40"}>
                <ListRestart /> {t("text.captions.splitEvenly")}
              </Chip>
            </div>
            <p className="text-xs text-neutral-500">
              <Rich text={t("text.captions.linesHelp", { count: lines.length })} tags={{ b: (s) => <b>{s}</b> }} />
            </p>
            {existing.length > 0 && (
              <Chip
                onClick={() =>
                  useEditor.getState().ask({
                    title: t("text.captions.clearTitle", { count: existing.length }),
                    message: t("text.captions.clearMessage"),
                    confirmLabel: t("text.captions.clearConfirm"),
                    onConfirm: () => {
                      useEditor.getState().edit(translate("text.undo.clearCaptions"), (d) => setCaptions(d, [], presetId));
                      setMessage(translate("text.captions.cleared"));
                    },
                  })
                }
              >
                <Trash /> {t("text.captions.clearButton", { count: existing.length })}
              </Chip>
            )}
          </>
        )}

        {tab === "style" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {CAPTION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={presetId === preset.id}
                  onClick={() => {
                    setPresetId(preset.id);
                    useEditor.getState().edit(t("text.undo.captionStyle", { name: presetLabel(preset) }), (d) => styleCaptions(d, preset.id));
                  }}
                  className={`flex h-16 items-center justify-center overflow-hidden rounded-lg border bg-[linear-gradient(135deg,#3a3a3a,#1c1c1c)] px-1 ${
                    presetId === preset.id ? "border-gold" : "border-white/10"
                  }`}
                >
                  <span style={previewCss(presetStyle(preset), 16)}>
                    {presetLabel(preset)}{" "}
                    {preset.animation?.highlight && (
                      <span style={{ color: preset.animation.highlight }}>{t("text.captions.word")}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <Section title={t("text.captions.highlight")}>
              <Swatches
                allowNone
                value={existing[0]?.animation.highlight ?? null}
                onChange={(c) => useEditor.getState().edit(t("text.undo.captionHighlight"), (d) => highlightCaptions(d, c))}
              />
            </Section>
            <Section title={t("text.captions.position")}>
              <div className="flex gap-2">
                {(
                  [
                    [t("text.captions.top"), 0.2],
                    [t("text.captions.middle"), 0.5],
                    [t("text.captions.bottom"), CAPTION_Y],
                  ] as const
                ).map(([label, y]) => (
                  <Chip
                    key={y}
                    active={existing[0]?.transform.y === y}
                    onClick={() => useEditor.getState().edit(t("text.undo.captionsPosition", { position: label }), (d) => moveCaptions(d, y))}
                  >
                    {label}
                  </Chip>
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === "file" && (
          <div className="flex flex-col gap-2">
            <input
              ref={srtInput}
              type="file"
              accept=".srt,.vtt,text/plain"
              className="hidden"
              onChange={(e) => {
                void importSrt(e.currentTarget.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <Chip onClick={() => srtInput.current?.click()}>
              <FileUp /> {t("text.captions.importSrt")}
            </Chip>
            <Chip
              onClick={() => download("captions.srt", formatSrt(cuesFromProject(useEditor.getState().project)))}
              className={existing.length ? "" : "opacity-40"}
            >
              <FileDown /> {t("text.captions.exportSrt")}
            </Chip>
            <p className="text-xs text-neutral-500">
              {t("text.captions.fileHelp")}
            </p>
          </div>
        )}

        {message && <p className="text-xs text-emerald-400">{message}</p>}
      </div>
    </PanelShell>
  );
}
