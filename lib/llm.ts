/**
 * Groq-only LLM wrapper.
 * Uses GROQ_API_KEY from environment — OpenAI-compatible endpoint.
 * Falls back to deterministic logic if key is missing or call fails.
 */

interface ChatParams {
  system: string;
  user: string;
  maxTokens: number;
}

export function llmConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function chatCompletion(
  params: ChatParams
): Promise<{ text: string | null; error: string | null }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { text: null, error: null };
  return callGroq(params, apiKey);
}

async function callGroq(
  { system, user, maxTokens }: ChatParams,
  apiKey: string
): Promise<{ text: string | null; error: string | null }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user",   content: user },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { text: null, error: `Groq API error ${res.status}: ${detail.slice(0, 200)}` };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return {
      text:  typeof text === "string" && text.trim() ? text.trim() : null,
      error: null,
    };
  } catch (err) {
    return { text: null, error: `Groq request failed: ${(err as Error).message}` };
  }
}

export function resolveProvider() {
  return process.env.GROQ_API_KEY ? { provider: "groq" as const } : null;
}
