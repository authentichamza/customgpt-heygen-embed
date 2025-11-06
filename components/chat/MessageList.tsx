"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  return (
    <div className="chat-scroll" ref={containerRef}>
      {messages.map((message) => {
        const isAssistant = message.role === "assistant";
        const bubbleClass = `chat-bubble chat-bubble--${message.role}`;
        const displayContent =
          message.content ||
          (isAssistant && message.status === "waiting"
            ? "Assistant is thinking…"
            : "");

        return (
          <div key={message.id} className={bubbleClass}>
            <span className="chat-bubble__role">
              {message.role === "user" ? "You" : "Assistant"}
            </span>
            <p className="chat-bubble__content">{displayContent}</p>
            <time className="chat-bubble__time">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        );
      })}
      {isLoading && (
        <div className="chat-bubble chat-bubble--assistant chat-bubble--pending">
          <span className="chat-bubble__role">CustomGPT</span>
          <div className="chat-typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  );
}
