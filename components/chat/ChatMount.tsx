"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary for the chat widget.
 *
 * `ssr: false` cannot be used from a Server Component in Next 16, so the
 * dynamic import lives here and the layout renders this instead. The effect is
 * what matters: the widget, react-markdown and remark-gfm are a separate chunk
 * fetched after the page has painted, so a marketing page that nobody chats on
 * pays nothing for it in its initial bundle.
 *
 * Nothing is rendered on the server either, which is correct — the widget's
 * first job is to read localStorage, and there is no session on the server to
 * hydrate against.
 */
const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });

export default function ChatMount() {
  return <ChatWidget />;
}
