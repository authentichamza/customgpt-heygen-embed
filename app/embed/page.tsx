"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChatApp } from "@/components/chat/ChatApp";

function EmbedContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const root = document.documentElement;
    document.body.classList.add("embed-mode");

    const themeParamMap: Record<string, string> = {
      bg: "--chat-body-bg",
      text: "--chat-text-color",
      card: "--chat-card-bg",
      border: "--chat-card-border",
      headerborder: "--chat-header-border",
      subtitle: "--chat-subtitle-color",
      bubble: "--chat-bubble-bg",
      bubbleborder: "--chat-bubble-border",
      user: "--chat-user-bubble-bg",
      assistant: "--chat-assistant-bubble-bg",
      meta: "--chat-meta-color",
      timestamp: "--chat-timestamp-color",
      input: "--chat-input-bg",
      inputborder: "--chat-input-border",
      button: "--chat-input-button-bg",
      buttonhover: "--chat-input-button-hover-bg",
      buttondisabled: "--chat-input-button-disabled-bg",
      buttondisabledtext: "--chat-input-button-disabled-color",
      accent: "--chat-accent-color",
      footer: "--chat-footer-bg",
      error: "--chat-error-color",
      status: "--chat-status-color",
      placeholder: "--chat-placeholder-color",
      modalbackdrop: "--chat-modal-backdrop",
      modalcard: "--chat-modal-card-bg",
      modalcardborder: "--chat-modal-card-border",
      modalheaderborder: "--chat-modal-header-border",
      modalclose: "--chat-modal-close-bg",
      modalclosecolor: "--chat-modal-close-color",
      modalclosehover: "--chat-modal-close-hover-bg",
      modalshadow: "--chat-modal-shadow",
      modalbody: "--chat-modal-body-bg",
      avatarborder: "--chat-avatar-border",
      avatarbg: "--chat-avatar-bg",
      avatarplaceholder: "--chat-avatar-placeholder-bg",
      avatortext: "--chat-avatar-text-color",
      avatarspinnertrack: "--chat-avatar-spinner-track",
      avatarspinnerhead: "--chat-avatar-spinner-head",
      avatarstatebg: "--chat-avatar-state-bg",
      avatarstateborder: "--chat-avatar-state-border",
    };

    Object.entries(themeParamMap).forEach(([param, cssVar]) => {
      const value = searchParams.get(param);
      if (value) {
        root.style.setProperty(cssVar, value);
      }
    });

    return () => {
      document.body.classList.remove("embed-mode");
    };
  }, [searchParams]);

  return (
    <div className="embed-shell">
      <div className="embed-card">
        <ChatApp />
      </div>
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="embed-shell">
          <div className="embed-card" />
        </div>
      }
    >
      <EmbedContent />
    </Suspense>
  );
}
