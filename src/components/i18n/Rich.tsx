import { Fragment, type ReactNode } from "react";

/**
 * Renders a translated sentence that contains markup, so translators can move bold words and
 * links around freely: "Tap <b>Back up</b> to keep a copy" → Tap **Back up** to keep a copy.
 * Each tag name maps to a function that wraps its inner text. Unknown tags render as plain text.
 */
export function Rich({ text, tags }: { text: string; tags: Record<string, (inner: ReactNode) => ReactNode> }) {
  const parts: ReactNode[] = [];
  const re = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const wrap = tags[m[1]];
    parts.push(<Fragment key={m.index}>{wrap ? wrap(m[2]) : m[2]}</Fragment>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
