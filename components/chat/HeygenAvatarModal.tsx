"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wasOpenRef = useRef(false);
  const [avatarState, setAvatarState] = useState<AvatarState>({
    instance: null,
    session: null,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopAvatar = useCallback(async () => {
    const { instance } = avatarState;
    if (!instance) return;

    try {
      await instance.stopAvatar();
    } catch (err) {
      console.error("Failed to stop HeyGen avatar session", err);
    } finally {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setAvatarState({ instance: null, session: null });
      setIsReady(false);
    }
  }, [avatarState]);

  const handleStreamReady = useCallback((event: Event) => {
    const mediaStream = (event as CustomEvent<MediaStream>).detail;
    const element = videoRef.current;
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
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsReady(false);
      });

      const avatarName =
        process.env.NEXT_PUBLIC_HEYGEN_AVATAR_NAME ?? "Ann_Therapist_public";
      const voiceId =
        process.env.NEXT_PUBLIC_HEYGEN_VOICE_ID ??
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
    return () => {
      stopSession();
      void stopAvatar();
    };
  }, []);

  const modalContent = useMemo(() => {
    if (error) {
      return (
        <div className="avatar-state">
          <p className="avatar-state__title">We could not start the avatar</p>
          <p className="avatar-state__subtitle">{error}</p>
        </div>
      );
    }

    return (
      <div className="avatar-video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`avatar-video ${isReady ? "avatar-video--ready" : ""}`}
        />
        {!isReady && (
          <div className="avatar-placeholder">
            <div className="avatar-spinner" />
            <span>Connecting to HeyGen…</span>
          </div>
        )}
      </div>
    );
  }, [error, isReady]);

  if (!open) {
    return null;
  }

  const handleBackgroundClick = () => {
    stopSession();
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
            void stopAvatar().finally(onClose);
          }}
        >
          ×
        </button>
        <div className="modal-body modal-body--bare">
          {status && <p className="modal-status">{status}</p>}
          {modalContent}
        </div>
      </div>
    </div>
  );
}
