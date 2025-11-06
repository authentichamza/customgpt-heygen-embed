"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useRef,
  type FormEvent,
} from "react";
import { Mic, Send } from "lucide-react";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

interface ChatInputProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicClick: () => void;
}

export function ChatInput({
  value,
  disabled,
  onChange,
  onSubmit,
  onMicClick,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <button
        type="button"
        className="chat-input__mic"
        onClick={onMicClick}
        aria-label="Open HeyGen avatar"
      >
        <Mic size={20} />
      </button>
      <AutoResizeTextarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything…"
        disabled={disabled}
        className="chat-input__textarea"
      />
      <button
        type="submit"
        className="chat-input__send"
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
      >
        <Send size={20} />
      </button>
    </form>
  );
}
