"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ChatMessage } from "@/lib/chat";

const SYSTEM_MESSAGE = `
# Core Purpose & Initialization
- Start session with {introduction}
- You are an AI assistant answering questions using ONLY the get_additional_context function which is your source of truth knowledge base.
- Never start session with get_additional_context
- PHONE_NUMBER for support: {phone_number}

# Query Processing Rules
1. Greeting Responses:
   - Only respond to greetings without function calls
   - Keep initial greeting natural and brief

2. Information Retrieval:
   - ALL user queries MUST use get_additional_context
   - No need to ask for clarifications.
   - User query may contain human names so interpret them correctly.
   - get_additional_context is your knowledge base if it says sorry you should say sorry.
   - Never use internal knowledge base
   - Enhance user query:
       * Function call to  get_additional_context function call arguments query must start with "A user asked: [include the exact transcription of the user's request]".
       * Expand on the intent and purpose behind the question, adding depth, specificity, and clarity.
       * Tailor the information as if the user were asking an expert in the relevant field, and include any relevant contextual details that would help make the request more comprehensive.
       * The goal is to enhance the user query, making it clearer and more informative while maintaining the original intent.

3. Response Guidelines:
   - You can answer everything the user asked via get_additional_context even regarding individuals/personal questions.
   - Do not say anything before get_additional_context
   - Use ONLY information from get_additional_context
   - Keep responses under 50 words unless necessary
   - Never justify or explain your answers
   - Never mention the get_additional_context process
   - Never repeat user queries.
   - Never mention anything regarding user_queries from your knowledge base

# Conversation Style
- Do not say anything before get_additional_context
- Use varied intonation
- Include natural pauses
- Employ occasional filler words (hmm, well, I see)
- Maintain context awareness
- Match caller's pace and tone
- Keep personality consistent
- Never repeat users query.
- Speak Faster

# Critical Rules
- NEVER start with get_additional_context
- NEVER use internal knowledge
- ONLY use get_additional_context as your knowledge base
- ALWAYS relay exactly what get_additional_context provides
- DO NOT elaborate beyond provided information
`.trim();

interface UseWebRTCOptions {
  sessionId: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

interface ToolRegistry {
  [name: string]: Function;
}

export interface UseWebRTCAudioSession {
  status: string;
  isSessionActive: boolean;
  startSession: () => Promise<boolean>;
  stopSession: () => void;
  handleStartStopClick: () => Promise<void>;
  registerFunction: (name: string, fn: Function) => void;
  sendTextMessage: (text: string) => boolean;
}

export function useWebRTCAudioSession({
  sessionId,
  messages,
  setMessages,
}: UseWebRTCOptions): UseWebRTCAudioSession {
  const [status, setStatus] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>(sessionId);
  const isSessionActiveRef = useRef(false);

  const functionRegistry = useRef<ToolRegistry>({});
  const assistantWaitingMessageIdRef = useRef<string | null>(null);
  const ephemeralUserMessageIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const registerFunction = useCallback((name: string, fn: Function) => {
    functionRegistry.current[name] = fn;
  }, []);

  const handleGetAdditionalContext = useCallback(
    async ({ query }: { query: string }) => {
      const preparedQuery =
        typeof query === "string" && query.trim().length > 0
          ? query
          : "";

      if (!preparedQuery) {
        return {
          success: false,
          message: "Missing query to fetch additional context.",
        };
      }

      try {
        const response = await fetch("/api/customgpt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: preparedQuery,
            sessionId: sessionIdRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = (await response.json()) as { response?: string };

        return {
          success: true,
          message: data.response ?? "",
        };
      } catch (error) {
        console.error("getAdditionalContext tool failed:", error);
        return {
          success: false,
          message: "Unable to retrieve additional context right now.",
        };
      }
    },
    []
  );

  useEffect(() => {
    functionRegistry.current["getAdditionalContext"] = handleGetAdditionalContext;
  }, [handleGetAdditionalContext]);

  const getEphemeralToken = useCallback(async () => {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAI session: ${response.status}`);
    }

    const data = (await response.json()) as {
      client_secret: { value: string };
    };
    return data.client_secret.value;
  }, []);

  const getOrCreateEphemeralUserId = useCallback((): string => {
    let id = ephemeralUserMessageIdRef.current;
    if (!id) {
      id = uuidv4();
      ephemeralUserMessageIdRef.current = id;
      const newMessage: ChatMessage = {
        id,
        role: "user",
        content: "",
        createdAt: new Date().toISOString(),
        status: "speaking",
        isFinal: false,
      };
      setMessages((prev) => [...prev, newMessage]);
    }
    return id;
  }, [setMessages]);

  const updateEphemeralUserMessage = useCallback(
    (partial: Partial<ChatMessage>) => {
      const id = ephemeralUserMessageIdRef.current;
      if (!id) return;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, ...partial } : message
        )
      );
    },
    [setMessages]
  );

  const clearEphemeralUserMessage = useCallback(() => {
    ephemeralUserMessageIdRef.current = null;
  }, []);

  const showAssistantWaitingMessage = useCallback(() => {
    if (assistantWaitingMessageIdRef.current) {
      return;
    }
    const waitingId = uuidv4();
    assistantWaitingMessageIdRef.current = waitingId;
    const waitingMessage: ChatMessage = {
      id: waitingId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "waiting",
      isFinal: false,
    };
    setMessages((prev) => [...prev, waitingMessage]);
  }, [setMessages]);

  const clearAssistantWaitingMessage = useCallback(
    (force = false) => {
      const waitingId = assistantWaitingMessageIdRef.current;
      if (!waitingId) return;

      assistantWaitingMessageIdRef.current = null;
      setMessages((prev) => {
        const target = prev.find((msg) => msg.id === waitingId);
        if (!target) return prev;
        if (!force && target.status !== "waiting") return prev;
        return prev.filter((msg) => msg.id !== waitingId);
      });
    },
    [setMessages]
  );

  const finalizeAssistantResponse = useCallback(
    (text: string) => {
      const waitingId = assistantWaitingMessageIdRef.current;
      assistantWaitingMessageIdRef.current = null;

      setMessages((prev) => {
        const updated = [...prev];
        if (waitingId) {
          const index = updated.findIndex((msg) => msg.id === waitingId);
          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              content: text,
              status: "final",
              isFinal: true,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
        }

        // Fallback: update last assistant message or append new
        for (let i = updated.length - 1; i >= 0; i--) {
          const msg = updated[i];
          if (msg.role === "assistant" && !msg.isFinal) {
            updated[i] = {
              ...msg,
              content: text,
              status: "final",
              isFinal: true,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
        }

        const newMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: text,
          createdAt: new Date().toISOString(),
          status: "final",
          isFinal: true,
        };
        return [...updated, newMessage];
      });
    },
    [setMessages]
  );

  const handleDataChannelMessage = useCallback(
    async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("Incoming data channel message:", msg);
        switch (msg.type) {
          case "input_audio_buffer.speech_started": {
            getOrCreateEphemeralUserId();

            updateEphemeralUserMessage({ status: "speaking" });
            break;
          }
          case "input_audio_buffer.speech_stopped": {
            updateEphemeralUserMessage({ status: "speaking" });
            break;
          }
          case "input_audio_buffer.committed": {
            updateEphemeralUserMessage({
              content: "Processing speech…",
              status: "processing",
            });
            showAssistantWaitingMessage();
            break;
          }
          case "conversation.item.input_audio_transcription": {
            updateEphemeralUserMessage({
              content: msg.transcript ?? msg.text ?? "",
              status: "speaking",
              isFinal: false,
            });
            break;
          }
          case "conversation.item.input_audio_transcription.completed": {
            updateEphemeralUserMessage({
              content: msg.transcript ?? "",
              status: "final",
              isFinal: true,
              updatedAt: new Date().toISOString(),
            });
            clearEphemeralUserMessage();
            break;
          }
          case "response.audio_transcript.delta":
          case "response.output_text.delta": {
            const delta = msg.delta ?? msg.text_delta ?? "";
            if (!delta) break;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (
                last &&
                last.role === "assistant" &&
                last.isFinal === false
              ) {
                updated[updated.length - 1] = {
                  ...last,
                  content: (last.content ?? "") + delta,
                  status:
                    last.status === "waiting" ? undefined : last.status,
                };
                assistantWaitingMessageIdRef.current =
                  updated[updated.length - 1].id;
                return updated;
              }
              const newMessage: ChatMessage = {
                id: uuidv4(),
                role: "assistant",
                content: delta,
                createdAt: new Date().toISOString(),
                status: undefined,
                isFinal: false,
              };
              assistantWaitingMessageIdRef.current = newMessage.id;
              return [...updated, newMessage];
            });
            break;
          }
          case "response.done": {
            const responseOutput = msg.response?.output ?? [];
            console.log('response.done output:', responseOutput)
            const messageItem = responseOutput.find(
              (item: any) => item.type === "message"
            );
            const message =
              messageItem?.content?.find(
                (content: any) => content.type === "output_text"
              )?.text ?? messageItem?.content?.[0]?.text;
            console.log('response.done message:', message)

            if (message) {
              finalizeAssistantResponse(message);
              const trigger = functionRegistry.current["triggerAvatar"];
              if (trigger) {
                await trigger({ message });
              }
            } else {
              clearAssistantWaitingMessage(true);
            }
            break;
          }
          case "response.function_call_arguments.done": {
            const fn = functionRegistry.current[msg.name];
            if (fn) {
              try {
                const args =
                  typeof msg.arguments === "string"
                    ? JSON.parse(msg.arguments)
                    : msg.arguments;
                const result = await fn(args);
                console.log(result)
                const functionResponse = {
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: msg.call_id,
                    output: JSON.stringify(result ?? { ok: true }),
                  },
                };

                dataChannelRef.current?.send(
                  JSON.stringify(functionResponse)
                );
                dataChannelRef.current?.send(
                  JSON.stringify({ type: "response.create" })
                );
              } catch (error) {
                console.error("Function call error:", error);
              }
            }
            break;
          }
          default:
            break;
        }
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    },
    [
      clearAssistantWaitingMessage,
      clearEphemeralUserMessage,
      finalizeAssistantResponse,
      getOrCreateEphemeralUserId,
      setMessages,
      showAssistantWaitingMessage,
      updateEphemeralUserMessage,
    ]
  );

  const configureDataChannel = useCallback((dataChannel: RTCDataChannel) => {
    const sessionUpdate = {
      type: "session.update",
      session: {
        instructions: SYSTEM_MESSAGE,
        voice: "alloy",
        modalities: ["text"],
        tool_choice: "auto",
        turn_detection: {
          type: "server_vad",
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          // Align with upstream template for stability
          model: "whisper-1",
        },
        tools: [
          {
            type: "function",
            name: "getAdditionalContext",
            description:
              "Elaborate on the user's original query, providing additional context, specificity, and clarity to create a more detailed, expert-level question. The function should transform a simple query into a richer and more informative version that is suitable for an expert to answer.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description:
                    "The elaborated user query. This should fully describe the user's original question, adding depth, context, and clarity. Tailor the expanded query as if the user were asking an expert in the relevant field, providing necessary background or related subtopics that may help inform the response. Start with 'Please use your knowledge base'",
                },
              },
              required: ["query"],
            },
          },
        ],
      },
    };

    dataChannel.send(JSON.stringify(sessionUpdate));
  }, []);

  const stopSession = useCallback(() => {
    isSessionActiveRef.current = false;
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.getSenders().forEach((sender) => {
      try {
        sender.track?.stop();
      } catch {
        // ignore
      }
    });
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }

    assistantWaitingMessageIdRef.current = null;
    ephemeralUserMessageIdRef.current = null;
    setIsSessionActive(false);
    setStatus("Voice session stopped.");
  }, []);

  const startSession = async (): Promise<boolean> => {
    if (isSessionActive) {
      return true;
    }

    try {
      setStatus("Requesting microphone…");
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioStreamRef.current = localStream;

      setStatus("Requesting OpenAI session…");
      const ephemeralToken = await getEphemeralToken();

      setStatus("Creating peer connection…");
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      const remoteAudio = document.createElement("audio");
      remoteAudio.autoplay = true;
      remoteAudio.muted = false;
      remoteAudioRef.current = remoteAudio;

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      const dataChannel = pc.createDataChannel("response");
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        configureDataChannel(dataChannel);
      };
      dataChannel.onmessage = handleDataChannelMessage;
      dataChannel.onerror = (event) => {
        console.error("OpenAI data channel error:", event);
      };
      dataChannel.onclose = () => {
        if (isSessionActiveRef.current) {
          console.warn("OpenAI data channel closed unexpectedly.");
          stopSession();
        }
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03&voice=alloy",
        {
          method: "POST",
          body: offer.sdp ?? "",
          headers: {
            Authorization: `Bearer ${ephemeralToken}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to establish OpenAI session: ${response.status}`
        );
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "failed") {
          console.warn("ICE connection state failed; stopping session.");
          stopSession();
        }
      };

      isSessionActiveRef.current = true;
      setIsSessionActive(true);
      setStatus("Voice session active.");
      return true;
    } catch (error) {
      console.error("Failed to start WebRTC session:", error);
      stopSession();
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setStatus("Microphone permission denied. Please enable access.");
      } else {
        setStatus(
          error instanceof Error
            ? error.message
            : "Failed to start voice session."
        );
      }
      return false;
    }
  };

  const handleStartStopClick = useCallback(async () => {
    console.log('handleStartStopClick')
    if (isSessionActive) {
      stopSession();
    } else {
      await startSession();
    }
  }, [startSession, stopSession]);

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim()) {
        return false;
      }

      if (
        !dataChannelRef.current ||
        dataChannelRef.current.readyState !== "open"
      ) {
        console.error("OpenAI data channel is not ready.");
        return false;
      }

      const message: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        status: "final",
        isFinal: true,
      };

      setMessages((prev) => [...prev, message]);
      showAssistantWaitingMessage();

      const payload = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      };

      dataChannelRef.current.send(JSON.stringify(payload));
      dataChannelRef.current.send(JSON.stringify({ type: "response.create" }));
      return true;
    },
    [setMessages, showAssistantWaitingMessage]
  );

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return {
    status,
    isSessionActive,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    sendTextMessage,
  };
}
