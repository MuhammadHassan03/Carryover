"use client";

import dynamic from "next/dynamic";

// The story engine (scroll progress, Three.js scenes, DOM interactions) only runs in the browser.
// All chapter text is already in the server-rendered HTML; this adds motion on top.
const StoryEngine = dynamic(() => import("./StoryEngine"), { ssr: false });

export default function StoryClient() {
  return <StoryEngine />;
}
