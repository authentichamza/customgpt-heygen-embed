import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          voice: "alloy",
          modalities: ["audio", "text"],
          instructions:
            "Respond concisely and friendly. Speak as if you are the HeyGen avatar representing the assistant.",
          tool_choice: "auto",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Failed to create OpenAI realtime session:",
        response.status,
        errorText
      );
      return NextResponse.json(
        { error: "Unable to create OpenAI realtime session." },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log(data)
    return NextResponse.json(data);
  } catch (error) {
    console.error("OpenAI realtime session error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating OpenAI realtime session." },
      { status: 500 }
    );
  }
}
