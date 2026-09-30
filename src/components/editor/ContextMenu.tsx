"use client";

import { ArrowLeftToLine, ArrowRightToLine, ClipboardPaste, Copy, CopyPlus, Layers, ListChecks, Scissors, SquareSplitHorizontal, Trash } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { clipEnd, findClip } from "@/engine/model/ops";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  copySelection,
  cutSelection,
  duplicateSelected,
  pasteClipboard,
  requestDeleteSelected,
  selectAll,
  splitAtPlayhead,
  toMain,
  toOverlay,
  trimAtPlayhead,
} from "@/store/actions";
import { useEditor } from "@/store/editor";

interface Item {
  id: string;
  label: string;
  icon: ReactNode;
  hint?: string;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * The right-click menu (desktop), for the selected clip(s) or the empty timeline. Opened by
 * `openContextMenu`; closes on a click elsewhere, Escape, scrolling or choosing an item.
 */
export function ContextMenu() {
  const t = useT();
  const at = useEditor((s) => s.contextMenu);
  const project = useEditor((s) => s.project);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const multi = useEditor((s) => s.multi);
  const playhead = useEditor((s) => s.playhead);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const close = () => useEditor.getState().openContextMenu(null);

  // Keep the menu on screen: flip it left/up when it would run off the edge.
  useLayoutEffect(() => {
    if (!at || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(at.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(at.y, window.innerHeight - height - 8)),
    });
  }, [at]);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    const onAway = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      close();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onAway, true);
    window.addEventListener("wheel", onAway, true);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onAway, true);
      window.removeEventListener("wheel", onAway, true);
      window.removeEventListener("blur", close);
    };
  }, [at]);

  if (!at) return null;

  const found = selectedClipId ? findClip(project, selectedClipId) : undefined;
  const single = found && multi.length === 0;
  const isVisual = found?.clip.type === "media" && project.assets[found.clip.assetId]?.kind !== "audio";
  const underPlayhead = found && playhead > found.clip.start && playhead < clipEnd(found.clip);

  const groups: Item[][] = found
    ? [
        [
          { id: "split", label: t("editor.menu.split"), icon: <SquareSplitHorizontal />, hint: "S", run: splitAtPlayhead, disabled: !single || !underPlayhead },
          { id: "trimStart", label: t("editor.menu.trimStart"), icon: <ArrowLeftToLine />, hint: "Q", run: () => trimAtPlayhead("start"), disabled: !single || !underPlayhead },
          { id: "trimEnd", label: t("editor.menu.trimEnd"), icon: <ArrowRightToLine />, hint: "W", run: () => trimAtPlayhead("end"), disabled: !single || !underPlayhead },
          { id: "copy", label: t("editor.menu.copy"), icon: <Copy />, hint: "Ctrl+C", run: copySelection },
          { id: "cut", label: t("editor.menu.cut"), icon: <Scissors />, hint: "Ctrl+X", run: cutSelection },
          { id: "paste", label: t("editor.menu.paste"), icon: <ClipboardPaste />, hint: "Ctrl+V", run: pasteClipboard },
          { id: "duplicate", label: t("editor.menu.duplicate"), icon: <CopyPlus />, hint: "Ctrl+D", run: duplicateSelected, disabled: !single },
        ],
        ...(single && isVisual && (found.track.kind === "main" || found.track.kind === "overlay")
          ? [
              [
                {
                  id: "layer",
                  label: found.track.kind === "main" ? t("editor.menu.toOverlay") : t("editor.menu.toMain"),
                  icon: <Layers />,
                  run: found.track.kind === "main" ? toOverlay : toMain,
                },
              ],
            ]
          : []),
        [{ id: "delete", label: t("editor.menu.delete"), icon: <Trash />, hint: "Del", run: requestDeleteSelected, danger: true }],
        [{ id: "all", label: t("editor.menu.selectAll"), icon: <ListChecks />, hint: "Ctrl+A", run: selectAll }],
      ]
    : [
        [
          { id: "paste", label: t("editor.menu.paste"), icon: <ClipboardPaste />, hint: "Ctrl+V", run: pasteClipboard },
          { id: "all", label: t("editor.menu.selectAll"), icon: <ListChecks />, hint: "Ctrl+A", run: selectAll },
        ],
      ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={t("editor.menu.label")}
      className="fixed z-[70] min-w-52 rounded-xl border border-white/10 bg-[#1a1a1f]/95 p-1 shadow-2xl backdrop-blur"
      style={{ left: pos?.left ?? at.x, top: pos?.top ?? at.y, visibility: pos ? "visible" : "hidden" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {groups.map((items, g) => (
        <div key={g} className={cn(g > 0 && "mt-1 border-t border-white/[0.06] pt-1")}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                close();
                item.run();
              }}
              className={cn(
                "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-[13px] transition-colors disabled:opacity-35 [&_svg]:size-4",
                item.danger ? "text-red-300 hover:bg-red-500/15" : "text-neutral-200 hover:bg-white/[0.08]",
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.hint && <kbd className="font-sans text-[11px] text-neutral-500">{item.hint}</kbd>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
