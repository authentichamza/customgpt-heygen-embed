export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isFinal?: boolean;
  status?: "speaking" | "processing" | "waiting" | "final";
}
