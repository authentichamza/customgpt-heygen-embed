import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionId } = (await req.json()) as {
      prompt?: string;
      sessionId?: string;
    };

    if (!prompt || !prompt.trim() || !sessionId) {
      return new Response("Invalid payload.", { status: 400 });
    }

    const apiKey = process.env.CUSTOMGPT_API_KEY;
    const projectId = process.env.CUSTOMGPT_PROJECT_ID;

    if (!apiKey || !projectId) {
      console.error("Missing CustomGPT credentials.");
      return new Response(
        "Server misconfiguration: missing CustomGPT credentials.",
        { status: 500 }
      );
    }

    const url = `https://app.customgpt.ai/api/v1/projects/${projectId}/conversations/${sessionId}/messages`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        custom_persona:
          "You are a helpful assistant. Provide concise, friendly responses suitable for both chat and voice delivery.",
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("CustomGPT API error:", upstream.status, text);
      return new Response(
        JSON.stringify({
          response: "CustomGPT is unavailable right now. Please try again soon.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = (await upstream.json()) as {
      data: { openai_response: string };
    };

    return new Response(
      JSON.stringify({ response: data.data.openai_response ?? "" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("CustomGPT route error:", error);
    return new Response(
      JSON.stringify({
        response: "We could not reach CustomGPT. Please retry in a moment.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}
