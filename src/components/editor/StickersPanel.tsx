"use client";

import { useState } from "react";
import { presetById, presetStyle } from "@/engine/model/text";
import { addSticker } from "@/store/actions";
import { PanelShell, Section, Tabs } from "./controls";
import { previewCss } from "./TextPanel";

const EMOJI_GROUPS: [string, string[]][] = [
  ["Popular", ["🔥", "😂", "😍", "🤯", "😱", "👀", "💯", "✨", "❤️", "👉", "👇", "⬇️", "✅", "❌", "⭐", "🎉", "💀", "😭", "🥹", "😎", "🤩", "🫶", "💥", "⚡", "🚨", "📍", "💰", "🎵"]],
  ["Faces", ["😀", "😅", "🤣", "😊", "😇", "🥰", "😘", "😜", "🤪", "🤔", "🤫", "🙄", "😬", "😴", "🤤", "😵", "🥳", "🤓", "🧐", "😤", "😡", "🥺", "😳", "🫠", "🤡", "👻", "👽", "🤖"]],
  ["Hands & hearts", ["👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "👌", "🤌", "💪", "👋", "☝️", "👆", "👈", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💖", "💘", "💋", "🫰"]],
  ["Things", ["📱", "🎬", "🎥", "📸", "🎤", "🎧", "🎮", "💻", "📦", "🛍️", "🍕", "🍔", "☕", "🍿", "🏋️", "⚽", "🏀", "🚗", "✈️", "🏝️", "🌙", "☀️", "🌈", "🌸", "🍀", "💎", "👑", "🏆"]],
];

const LABELS: [string, string][] = [
  ["LINK IN BIO", "label-white"],
  ["PART 2", "label-red"],
  ["WAIT FOR IT", "label-yellow"],
  ["FOLLOW FOR MORE", "label-black"],
  ["POV:", "label-white"],
  ["STORYTIME", "label-black"],
  ["DON'T SKIP", "label-red"],
  ["NEW", "label-yellow"],
  ["SALE", "label-red"],
  ["DAY 1", "label-black"],
  ["BEFORE", "label-white"],
  ["AFTER", "label-yellow"],
  ["TUTORIAL", "label-black"],
  ["TIP", "label-yellow"],
  ["GRWM", "label-white"],
  ["SUBSCRIBE", "label-red"],
];

export function StickersPanel() {
  const [tab, setTab] = useState<"emoji" | "labels">("emoji");
  return (
    <PanelShell title="Stickers">
      <div className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            ["emoji", "Emoji"],
            ["labels", "Labels"],
          ]}
        />
        {tab === "emoji" &&
          EMOJI_GROUPS.map(([title, emoji]) => (
            <Section key={title} title={title}>
              <div className="grid grid-cols-7 gap-1 sm:grid-cols-10">
                {emoji.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-label={`Add ${e}`}
                    onClick={() => addSticker(e, "emoji")}
                    className="flex aspect-square items-center justify-center rounded-lg text-3xl transition-transform hover:bg-white/5 active:scale-90"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Section>
          ))}
        {tab === "labels" && (
          <div className="grid grid-cols-2 gap-2">
            {LABELS.map(([text, presetId]) => (
              <button
                key={text}
                type="button"
                onClick={() => addSticker(text, presetId)}
                className="flex h-14 items-center justify-center overflow-hidden rounded-lg bg-[linear-gradient(135deg,#3a3a3a,#1c1c1c)] px-1"
              >
                <span className="truncate" style={previewCss(presetStyle(presetById(presetId)), 15)}>
                  {text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
