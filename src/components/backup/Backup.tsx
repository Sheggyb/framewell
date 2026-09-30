"use client";

import { Archive, Download, FolderOpen, LoaderCircle, Share } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useT, type Locale } from "@/i18n";
import { BackupError, createBackup, restoreBackup, type Backup } from "@/lib/backup";
import { cn } from "@/lib/utils";

type Phase = { kind: "idle" } | { kind: "working" } | { kind: "ready"; backup: Backup } | { kind: "error"; error: unknown };

/** What went wrong, in the current language (kept as the error so a language change re-renders it). */
const errorText = (t: ReturnType<typeof useT>, e: unknown) =>
  e instanceof BackupError
    ? t(`errors.backup.${e.code}`, e.params)
    : t("errors.backup.failed");

const canShareFile = (file: File) =>
  typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

const megabytes = (bytes: number, locale: Locale) => {
  const digits = bytes < 10_000_000 ? 1 : 0;
  return (bytes / 1_000_000).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
};

/**
 * "Back up this project": builds a `.framewell` file (project + media), then offers the share
 * sheet (Save to Files, AirDrop…) or a download. Two taps, because phones only open the share
 * sheet straight from a tap, and building the file takes a moment.
 *
 * `beforeBackup` runs first, e.g. to save the latest edits.
 */
export function BackupAction({ projectId, beforeBackup, disabled }: { projectId: string; beforeBackup?: () => Promise<void>; disabled?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const file = phase.kind === "ready" ? phase.backup.file : null;
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const prepare = async () => {
    setPhase({ kind: "working" });
    try {
      await beforeBackup?.();
      setPhase({ kind: "ready", backup: await createBackup(projectId) });
    } catch (e) {
      setPhase({ kind: "error", error: e });
    }
  };

  const share = async (f: File) => {
    try {
      await navigator.share({ files: [f], title: f.name });
    } catch {
      // Closed the share sheet.
    }
  };

  if (phase.kind === "ready" && url) {
    const { backup } = phase;
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] p-3">
        <p className="flex items-center gap-2 text-sm text-neutral-100">
          <Archive className="size-4 text-gold" />
          <span className="min-w-0 flex-1 truncate">{backup.file.name}</span>
          <span className="shrink-0 font-mono text-xs text-neutral-400">{t("home.backup.size", { size: megabytes(backup.file.size, locale) })}</span>
        </p>
        {backup.missing.length > 0 && (
          <p className="text-xs text-amber-300">{t("home.backup.missing", { names: backup.missing.join(", ") })}</p>
        )}
        <div className="flex gap-2">
          {canShareFile(backup.file) && (
            <button
              type="button"
              onClick={() => void share(backup.file)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-semibold text-neutral-950"
            >
              <Share className="size-4" /> {t("home.backup.saveOrShare")}
            </button>
          )}
          <a
            href={url}
            download={backup.file.name}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold",
              canShareFile(backup.file) ? "border border-white/15 text-neutral-200" : "bg-white text-neutral-950",
            )}
          >
            <Download className="size-4" /> {t("home.backup.download")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled || phase.kind === "working"}
        onClick={() => void prepare()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-neutral-100 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
      >
        {phase.kind === "working" ? <LoaderCircle className="size-4 animate-spin text-gold" /> : <Archive className="size-4 text-gold" />}
        {phase.kind === "working" ? t("home.backup.preparing") : t("home.backup.backUp")}
      </button>
      {phase.kind === "error" && <p className="text-xs text-red-300">{errorText(t, phase.error)}</p>}
    </div>
  );
}

/** Opens a `.framewell` file as a new project. `onRestored` gets the new project's id. */
export function OpenBackupButton({ onRestored, className }: { onRestored: (projectId: string) => void; className?: string }) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ error: unknown } | null>(null);

  const open = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onRestored(await restoreBackup(file));
    } catch (e) {
      setError({ error: e });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* No `accept` filter: iPhone greys out file types it doesn't know. The file is checked on open. */}
      <input ref={input} type="file" className="hidden" onChange={(e) => void open(e.currentTarget.files?.[0])} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/[0.06] disabled:opacity-50",
          className,
        )}
      >
        {busy ? <LoaderCircle className="size-4 animate-spin text-gold" /> : <FolderOpen className="size-4 text-gold" />}
        {busy ? t("home.backup.opening") : t("home.backup.open")}
      </button>
      {error && <p className="text-xs text-red-300">{errorText(t, error.error)}</p>}
    </div>
  );
}
