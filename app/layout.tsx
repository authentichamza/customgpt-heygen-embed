import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CustomGPT Chat with HeyGen",
  description: "Chat interface powered by CustomGPT with optional HeyGen avatar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const primaryColor =
    process.env.NEXT_PUBLIC_PRIMARY_COLOR?.trim() || "#050505";
  const secondaryColor =
    process.env.NEXT_PUBLIC_SECONDARY_COLOR?.trim() || "#f7f7f7";

  const cssVariables: Record<string, string> = {
    "--chat-primary-color": primaryColor,
    "--chat-secondary-color": secondaryColor,
  };

  return (
    <html lang="en">
      <body style={cssVariables as CSSProperties}>{children}</body>
    </html>
  );
}
