"use client";

import { useState } from "react";
import { presetById, presetStyle } from "@/engine/model/text";
import { useLabel, useT, type MessageKey } from "@/i18n";
import { addSticker } from "@/store/actions";
import { PanelShell, Section, Tabs } from "./controls";
import { previewCss } from "./TextPanel";

const EMOJI_GROUPS: [MessageKey, string[]][] = [
  ["text.stickers.groups.popular", ["🔥", "😂", "😍", "🤯", "😱", "👀", "💯", "✨", "❤️", "👉", "👇", "⬇️", "✅", "❌", "⭐", "🎉", "💀", "😭", "🥹", "😎", "🤩", "🫶", "💥", "⚡", "🚨", "📍", "💰", "🎵"]],
  ["text.stickers.groups.faces", ["😀", "😅", "🤣", "😊", "😇", "🥰", "😘", "😜", "🤪", "🤔", "🤫", "🙄", "😬", "😴", "🤤", "😵", "🥳", "🤓", "🧐", "😤", "😡", "🥺", "😳", "🫠", "🤡", "👻", "👽", "🤖"]],
  ["text.stickers.groups.hands", ["👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "👌", "🤌", "💪", "👋", "☝️", "👆", "👈", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💖", "💘", "💋", "🫰"]],
  ["text.stickers.groups.things", ["📱", "🎬", "🎥", "📸", "🎤", "🎧", "🎮", "💻", "📦", "🛍️", "🍕", "🍔", "☕", "🍿", "🏋️", "⚽", "🏀", "🚗", "✈️", "🏝️", "🌙", "☀️", "🌈", "🌸", "🍀", "💎", "👑", "🏆"]],
];

/**
 * Label stickers: [id, English words, text style]. The words go into the video, in the app's
 * language (labels group "stickerText", by id).
 */
const LABELS: [string, string, string][] = [
  ["link-in-bio", "LINK IN BIO", "label-white"],
  ["part-2", "PART 2", "label-red"],
  ["wait-for-it", "WAIT FOR IT", "label-yellow"],
  ["follow-for-more", "FOLLOW FOR MORE", "label-black"],
  ["pov", "POV:", "label-white"],
  ["storytime", "STORYTIME", "label-black"],
  ["dont-skip", "DON'T SKIP", "label-red"],
  ["new", "NEW", "label-yellow"],
  ["sale", "SALE", "label-red"],
  ["day-1", "DAY 1", "label-black"],
  ["before", "BEFORE", "label-white"],
  ["after", "AFTER", "label-yellow"],
  ["tutorial", "TUTORIAL", "label-black"],
  ["tip", "TIP", "label-yellow"],
  ["grwm", "GRWM", "label-white"],
  ["subscribe", "SUBSCRIBE", "label-red"],
];

export function StickersPanel() {
  const t = useT();
  const L = useLabel();
  const [tab, setTab] = useState<"emoji" | "labels">("emoji");
  return (
    <PanelShell title={t("text.stickers.title")}>
      <div className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            ["emoji", t("text.stickers.emoji")],
            ["labels", t("text.stickers.labels")],
          ]}
        />
        {tab === "emoji" &&
          EMOJI_GROUPS.map(([title, emoji]) => (
            <Section key={title} title={t(title)}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
                {emoji.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={t("text.stickers.add", { emoji: e })}
                    onClick={() => addSticker(e, "emoji")}
                    className="flex aspect-square items-center justify-center rounded-lg text-[1.7rem] leading-none transition-transform hover:bg-white/5 active:scale-90"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Section>
          ))}
        {tab === "labels" && (
          <div className="grid grid-cols-2 gap-2">
            {LABELS.map(([id, english, presetId]) => {
              const text = L("stickerText", id, english);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => addSticker(text, presetId)}
                  className="flex h-14 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#3a3a3a,#1c1c1c)] px-1"
                >
                  <span className="truncate" style={previewCss(presetStyle(presetById(presetId)), 15)}>
                    {text}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
