"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  type StartAvatarResponse,
} from "@heygen/streaming-avatar";

interface HeygenAvatarModalProps {
  open: boolean;
  onClose: () => void;
  stopSession: () => void;
  registerFunction: (name: string, fn: Function) => void;
  status?: string;
}

type AvatarState = {
  instance: StreamingAvatar | null;
  session: StartAvatarResponse | null;
};

export function HeygenAvatarModal({
  open,
  onClose,
  stopSession,
  registerFunction,
  status,
}: HeygenAvatarModalProps) {
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const wasOpenRef = useRef(false);
  const [avatarState, setAvatarState] = useState<AvatarState>({
    instance: null,
    session: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalReady, setIsLocalReady] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const releaseLocalStream = useCallback(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.onloadedmetadata = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setIsLocalReady(false);
  }, []);

  const stopAvatar = useCallback(async () => {
    const { instance } = avatarState;
    if (!instance) return;

    try {
      await instance.stopAvatar();
    } catch (err) {
      console.error("Failed to stop HeyGen avatar session", err);
    } finally {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setAvatarState({ instance: null, session: null });
      setIsReady(false);
    }
  }, [avatarState]);

  const handleStreamReady = useCallback((event: Event) => {
    const mediaStream = (event as CustomEvent<MediaStream>).detail;
    const element = remoteVideoRef.current;
    if (!element) return;

    element.srcObject = mediaStream;
    element.onloadedmetadata = () => {
      setIsReady(true);
      element.muted = false;
      element.play().catch((playError) => {
        console.error("Unable to autoplay HeyGen stream", playError);
      });
    };
  }, []);

  const initializeAvatar = useCallback(async () => {
    setError(null);
    setIsReady(false);

    try {
      const tokenResponse = await fetch("/api/heygen", { method: "GET" });
      if (!tokenResponse.ok) {
        throw new Error("Failed to obtain HeyGen token");
      }

      const { token } = (await tokenResponse.json()) as { token: string };
      const instance = new StreamingAvatar({ token });

      instance.on(
        StreamingEvents.STREAM_READY,
        handleStreamReady as EventListener
      );
      instance.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        setIsReady(false);
      });

      const avatarName =
        process.env.NEXT_PUBLIC_AVATAR_NAME ?? "Ann_Therapist_public";
      const voiceId =
        process.env.NEXT_PUBLIC_VOICE_ID ??
        "f8c69e517f424cafaecde32dde57096b";

      const session = await instance.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName,
        voice: { voiceId },
      });

      setAvatarState({ instance, session });
    } catch (err) {
      console.error("Failed to initialize HeyGen avatar", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while starting HeyGen avatar"
      );
    }
  }, []);

  useEffect(() => {
    if (!avatarState.instance) {
      registerFunction("triggerAvatar", () => null);
      return;
    }

    registerFunction(
      "triggerAvatar",
      async ({ message }: { message: string }) => {
        try {
          console.log("Avatar speaking:", message);
          await avatarState.instance?.speak({ text: message });
        } catch (error) {
          console.error("Avatar speak failed", error);
        }
      }
    );
  }, [avatarState.instance]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      void initializeAvatar();
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
      stopSession();
      void stopAvatar();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      releaseLocalStream();
      return;
    }

    let isCancelled = false;
    const startCamera = async () => {
      setLocalError(null);
      setIsLocalReady(false);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setLocalError("Camera not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        const videoElement = localVideoRef.current;
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.muted = true;
          const playStream = () => {
            videoElement
              .play()
              .then(() => setIsLocalReady(true))
              .catch(() => setIsLocalReady(true));
          };

          if (
            typeof HTMLMediaElement !== "undefined" &&
            videoElement.readyState >= HTMLMediaElement.HAVE_METADATA
          ) {
            playStream();
          } else {
            videoElement.onloadedmetadata = playStream;
          }
        } else {
          setIsLocalReady(true);
        }
      } catch (err) {
        console.error("Failed to start local camera", err);
        if (!isCancelled) {
          setLocalError(
            err instanceof Error
              ? err.message
              : "Unable to access front camera."
          );
        }
      }
    };

    void startCamera();

    return () => {
      isCancelled = true;
      releaseLocalStream();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      stopSession();
      releaseLocalStream();
      void stopAvatar();
    };
  }, []);

  if (!open) {
    return null;
  }

  const handleBackgroundClick = () => {
    stopSession();
    releaseLocalStream();
    void stopAvatar().finally(onClose);
  };

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackgroundClick}>
      <div className="modal-card" onClick={handleCardClick}>
        <button
          type="button"
          className="modal-close modal-close--floating"
          onClick={() => {
            stopSession();
            releaseLocalStream();
            void stopAvatar().finally(onClose);
          }}
        >
          ×
        </button>
        <div className="modal-body modal-body--bare">
          {status && <p className="modal-status">{status}</p>}
          <div className="avatar-split-layout">
            <div className="video-panel">
              <div className="video-panel__media">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`avatar-video ${
                    isReady ? "avatar-video--ready" : ""
                  }`}
                />
                {error && (
                  <div className="avatar-state video-panel__state">
                    <p className="avatar-state__title">
                      We could not start the avatar
                    </p>
                    <p className="avatar-state__subtitle">{error}</p>
                  </div>
                )}
                {!error && !isReady && (
                  <div className="avatar-placeholder">
                    <div className="avatar-spinner" />
                    <span>Connecting to HeyGen…</span>
                  </div>
                )}
              </div>
            </div>

            <div className="video-panel">
              <div className="video-panel__media">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`avatar-video avatar-video--local ${
                    isLocalReady ? "avatar-video--ready" : ""
                  }`}
                />
                {!isLocalReady && !localError && (
                  <div className="avatar-placeholder">
                    <div className="avatar-spinner" />
                    <span>Starting camera…</span>
                  </div>
                )}
                {localError && (
                  <div className="avatar-state video-panel__state">
                    <p className="avatar-state__title">
                      Camera permission needed
                    </p>
                    <p className="avatar-state__subtitle">{localError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
