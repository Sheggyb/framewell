"use client";

import dynamic from "next/dynamic";

// Server-rendered, so it shows even if the editor's JavaScript never arrives.
// The hint fades in via CSS alone after a delay, so it needs no JS to appear.
function LoadingScreen({ error }: { error?: Error | null }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center text-neutral-300">
      {error ? (
        <>
          <p className="text-sm font-medium text-neutral-100">The editor failed to load.</p>
          <p className="max-w-xs text-xs text-neutral-500">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white"
          >
            Reload
          </button>
        </>
      ) : (
        <>
          <div className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-white" />
          <p className="text-sm">Loading editor…</p>
          <p className="max-w-xs text-xs text-neutral-500 opacity-0 animate-[fw-reveal_0.3s_ease_8s_forwards]">
            Taking a while? Check your connection and reload the page.
          </p>
        </>
      )}
    </div>
  );
}

// The editor touches WebCodecs, canvas and file APIs, so it never renders on the server.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: ({ error }) => <LoadingScreen error={error} />,
});

export function EditorLoader() {
  return <Editor />;
}
