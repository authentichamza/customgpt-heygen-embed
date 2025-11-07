(function () {
  const scriptEl = document.currentScript;

  function init() {
    if (!scriptEl) {
      return;
    }

    const parent = scriptEl.parentElement;

    const scriptUrl = (() => {
      try {
        return new URL(scriptEl.src, window.location.href);
      } catch {
        return new URL(window.location.href);
      }
    })();

    const embedPath = scriptEl.getAttribute("data-url") || "/embed";
    const iframeUrl = embedPath.startsWith("http")
      ? new URL(embedPath)
      : new URL(
          embedPath.startsWith("/") ? embedPath : `/${embedPath}`,
          scriptUrl.origin
        );

    const themeAttributeMap = {
      bg: "data-theme-bg",
      text: "data-theme-text",
      card: "data-theme-card",
      border: "data-theme-border",
      headerborder: "data-theme-header-border",
      subtitle: "data-theme-subtitle",
      bubble: "data-theme-bubble",
      bubbleborder: "data-theme-bubble-border",
      user: "data-theme-user",
      assistant: "data-theme-assistant",
      meta: "data-theme-meta",
      timestamp: "data-theme-timestamp",
      input: "data-theme-input",
      inputborder: "data-theme-input-border",
      button: "data-theme-button",
      buttonhover: "data-theme-button-hover",
      buttondisabled: "data-theme-button-disabled",
      buttondisabledtext: "data-theme-button-disabled-text",
      accent: "data-theme-accent",
      footer: "data-theme-footer",
      error: "data-theme-error",
      status: "data-theme-status",
      placeholder: "data-theme-placeholder",
      modalbackdrop: "data-theme-modal-backdrop",
      modalcard: "data-theme-modal-card",
      modalcardborder: "data-theme-modal-card-border",
      modalheaderborder: "data-theme-modal-header-border",
      modalclose: "data-theme-modal-close",
      modalclosecolor: "data-theme-modal-close-color",
      modalclosehover: "data-theme-modal-close-hover",
      modalshadow: "data-theme-modal-shadow",
      modalbody: "data-theme-modal-body",
      avatarborder: "data-theme-avatar-border",
      avatarbg: "data-theme-avatar-bg",
      avatarplaceholder: "data-theme-avatar-placeholder",
      avatortext: "data-theme-avatar-text",
      avatarspinnertrack: "data-theme-avatar-spinner-track",
      avatarspinnerhead: "data-theme-avatar-spinner-head",
      avatarstatebg: "data-theme-avatar-state-bg",
      avatarstateborder: "data-theme-avatar-state-border",
    };

    Object.entries(themeAttributeMap).forEach(([param, attr]) => {
      if (scriptEl.hasAttribute(attr)) {
        iframeUrl.searchParams.set(param, scriptEl.getAttribute(attr));
      }
    });

    const container = document.createElement("div");
    container.style.boxSizing = "border-box";
    const parentRect = parent?.getBoundingClientRect?.();
    const widthAttr = scriptEl.getAttribute("data-width");
    const heightAttr = scriptEl.getAttribute("data-height");
    const maxWidthAttr = scriptEl.getAttribute("data-max-width");
    const minHeightAttr = scriptEl.getAttribute("data-min-height");

    container.style.width =
      widthAttr || (parentRect?.width ? `${parentRect.width}px` : "100%");
    container.style.maxWidth = maxWidthAttr || "100%";
    container.style.height =
      heightAttr || (parentRect?.height ? `${parentRect.height}px` : "100%");
    if (minHeightAttr) {
      container.style.minHeight = minHeightAttr;
    }
    container.style.borderRadius =
      scriptEl.getAttribute("data-border-radius") || "24px";
    container.style.overflow = "hidden";
    const shadowAttr = scriptEl.getAttribute("data-shadow");
    container.style.boxShadow = shadowAttr || "none";

    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl.toString();
    iframe.title = "CustomGPT Chatbot";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.minHeight = "100%";
    iframe.style.border = "0";
    iframe.style.display = "block";
    iframe.setAttribute("allow", "microphone; autoplay");

    container.appendChild(iframe);

    const normalizedTag = parent?.tagName?.toLowerCase();
    const target =
      normalizedTag && normalizedTag !== "head"
        ? parent
        : document.body || document.getElementsByTagName("body")[0] || document.documentElement;

    if (!target) {
      return;
    }

    if (target === parent && parent) {
      parent.insertBefore(container, scriptEl);
      parent.removeChild(scriptEl);
    } else {
      target.appendChild(container);
      scriptEl.remove();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
