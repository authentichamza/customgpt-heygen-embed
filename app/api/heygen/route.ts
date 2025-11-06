export async function GET() {
  try {
    const apiKey = process.env.HEYGEN_API_KEY;
    if (!apiKey) {
      console.error("Missing HEYGEN_API_KEY environment variable.");
      return new Response("Server misconfiguration.", { status: 500 });
    }

    const response = await fetch(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("HeyGen token request failed:", response.status, text);
      return new Response("Unable to obtain HeyGen token.", { status: 502 });
    }

    const { data } = (await response.json()) as { data: { token: string } };
    return new Response(JSON.stringify({ token: data.token }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("HeyGen token route error:", error);
    return new Response("Failed to create HeyGen token.", { status: 500 });
  }
}
