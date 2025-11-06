"use client";

import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/lib/chat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { HeygenAvatarModal } from "./HeygenAvatarModal";
import { useWebRTCAudioSession } from "@/hooks/use-webrtc";

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const sessionId = useMemo(() => uuidv4(), []);

  const {
    isSessionActive,
    startSession,
    stopSession,
    registerFunction,
    sendTextMessage,
    status: voiceStatus,
  } = useWebRTCAudioSession({
    sessionId,
    messages,
    setMessages,
  });

  const handleSend = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt) return;

    if (isSessionActive) {
      const sent = sendTextMessage(prompt);
      if (!sent) {
        setErrorMessage(
          "Voice session is still connecting. Try again in a moment."
        );
        return;
      }
      setInputValue("");
      setErrorMessage(null);
      return;
    }

    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    setInputValue("");
    setErrorMessage(null);
    setMessages((previous) => [...previous, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/customgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { response: string };
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: data.response,
        createdAt: new Date().toISOString(),
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      console.error("Failed to send message", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isSessionActive, sendTextMessage, sessionId]);

  const handleMicClick = useCallback(() => {
    setErrorMessage(null);

    if (isSessionActive) {
      setIsAvatarOpen(true);
      return;
    }

    startSession()
      .then((ok) => {
        if (ok) {
          setIsAvatarOpen(true);
        } else {
          setErrorMessage(
            "Microphone access is required to use the avatar. Please enable it and try again."
          );
        }
      })
      .catch((error) => {
        console.error("Unable to start voice session:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to start the voice session."
        );
      });
  }, [isSessionActive, startSession]);

  return (
    <>
      <section className="chat-window">
        <MessageList
          messages={messages}
          isLoading={isSessionActive ? false : isLoading}
        />
      </section>
      <footer className="chat-footer">
        {errorMessage && <p className="chat-error">{errorMessage}</p>}
        {voiceStatus && (
          <p className="chat-status">{voiceStatus}</p>
        )}
        <ChatInput
          value={inputValue}
          disabled={isLoading}
          onChange={setInputValue}
          onSubmit={handleSend}
          onMicClick={handleMicClick}
        />
      </footer>
      <HeygenAvatarModal
        open={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        stopSession={stopSession}
        registerFunction={registerFunction}
        status={voiceStatus}
      />
    </>
  );
}
