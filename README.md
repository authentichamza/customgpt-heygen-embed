# CustomGPT Chat with HeyGen Avatar

This project is a minimal **Next.js 15** application that recreates a ChatGPT‑style chat surface. Users can type or press a microphone icon to open a HeyGen avatar popup. Messages are sent to CustomGPT and the full conversation is stored remotely by CustomGPT—no local database is required. When the avatar is active, an OpenAI Realtime WebRTC session (managed via the `useWebRTCAudioSession` hook) handles transcriptions and assistant responses which are then spoken through HeyGen.

## Features
- Auto-expanding chat input that supports shift+enter for new lines.
- Message history display with typing indicators.
- Microphone button launches a modal showing a HeyGen streaming avatar.
- `/api/customgpt` proxies chat prompts to CustomGPT so you do not expose your keys client-side.
- `/api/heygen` generates streaming tokens for the avatar.
- `/api/session` creates ephemeral OpenAI Realtime sessions that power the WebRTC audio bridge.
- `useWebRTCAudioSession` hook negotiates the OpenAI Realtime WebRTC session and streams responses back to the avatar.
- `/embed` route renders a chrome-free version of the chat that is safe to iframe.
- `/public/embed.js` loader injects that iframe wherever you drop the script tag and accepts sizing + theming overrides.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required values:

| Variable | Description |
| --- | --- |
| `CUSTOMGPT_API_KEY` | CustomGPT API key with access to your project. |
| `CUSTOMGPT_PROJECT_ID` | ID of the CustomGPT project that should receive the conversation. |
| `HEYGEN_API_KEY` | HeyGen API key for streaming avatars. |
| `OPENAI_API_KEY` | OpenAI API key with access to Realtime models (used for WebRTC audio). |
| `NEXT_PUBLIC_HEYGEN_AVATAR_NAME` | (Optional) Default avatar name; fallback is `Ann_Therapist_public`. |
| `NEXT_PUBLIC_HEYGEN_VOICE_ID` | (Optional) Default voice ID; fallback is `f8c69e517f424cafaecde32dde57096b`. |

> The `NEXT_PUBLIC_` variables are exposed to the browser; customise them only if you want to switch the default avatar/voice.

### 3. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` to try the chat UI. Type a message and hit enter to send; use the microphone icon to start the HeyGen avatar.

## Project Structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Redirects to `/embed` so the lean view is the default entry point. |
| `app/embed/page.tsx` | Standalone embed view that renders only the chat UI and applies theme overrides from query params. |
| `components/chat/ChatApp.tsx` | Client component orchestrating chat state and API calls. |
| `components/chat/HeygenAvatarModal.tsx` | Popup modal that manages the HeyGen streaming lifecycle. |
| `hooks/use-webrtc.ts` | OpenAI Realtime WebRTC hook used when the avatar is active. |
| `app/api/session/route.ts` | Creates ephemeral OpenAI Realtime sessions for audio conversations. |
| `app/api/customgpt/route.ts` | Server route that forwards prompts to CustomGPT. |
| `app/api/heygen/route.ts` | Server route that requests HeyGen streaming tokens. |
| `app/globals.css` | Global styles for layout, chat bubbles, and modal. |
| `public/embed.js` | Lightweight script that injects the `/embed` iframe and forwards sizing/theme attributes. |

## Embedding the chatbot

Serve `public/embed.js` from your deployment and drop a script tag on any page:

```html
<script
  src="https://your-domain.com/embed.js"
  data-url="/embed"
  data-min-height="640px"
  data-theme-bg="#050b1a"
  data-theme-card="rgba(12,18,33,0.92)"
  data-theme-user="linear-gradient(135deg,#22d3ee,#818cf8)"
></script>
```

All `data-theme-*` attributes map to CSS variables exposed in `app/globals.css`. Use them to override background, bubble, input, modal, or avatar colors without rebuilding the widget. Width, max-width, min-height, border radius, and shadow can also be tweaked via `data-*` attributes on the script tag. If the script loads in `<head>`, the loader automatically appends the iframe to `<body>`.

Visiting `/` now redirects to `/embed`, so the standalone chatbot is the default experience locally and in production.

## Deployment Notes
- Deploy as a standard Next.js application (Vercel, Netlify, etc.).
- Make sure the environment variables are configured in your hosting provider.
- These routes rely on server-side fetch calls to third-party APIs; ensure outbound network access is allowed.

## Troubleshooting
- **401/403 from CustomGPT**: Verify the API key and project ID; ensure the key has write access.
- **HeyGen token errors**: Check that your HeyGen key is valid and streaming is enabled for your account.
- **Avatar not autoplaying**: Some browsers block autoplay; ensure the modal video remains muted to comply with autoplay policies.

## License
This project is provided as-is without an explicit license. Add one before distributing if needed.
