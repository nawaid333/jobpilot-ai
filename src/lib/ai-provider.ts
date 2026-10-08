type AiProvider = "modal" | "openai";

type AiResult = {
  text: string;
  provider: AiProvider;
  model: string;
};

type ChatArgs = {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

const DEFAULT_MODAL_BASE_URL = "https://api.modal.com/v1";
const DEFAULT_MODAL_MODEL = "auto";
const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function timeoutSignal(ms: number) {
  return AbortSignal.timeout(ms);
}

async function callChatCompletions(
  baseUrl: string,
  apiKey: string,
  model: string,
  args: ChatArgs,
): Promise<string | null> {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: args.prompt }],
      temperature: args.temperature ?? 0.2,
      max_tokens: args.maxTokens ?? 1800,
    }),
    signal: timeoutSignal(25_000),
  });

  if (!response.ok) {
    console.error("AI provider request failed", {
      provider: baseUrl.includes("modal") ? "modal" : "openai",
      status: response.status,
    });
    return null;
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

/**
 * Try Modal first when configured, then fall back to OpenAI.
 *
 * Both providers use an OpenAI-compatible chat-completions contract, so
 * application features do not need to know which inference backend is active.
 */
export async function runAiText(args: ChatArgs): Promise<AiResult | null> {
  const modalKey = process.env.MODAL_AI_API_KEY?.trim();
  if (modalKey) {
    const modalBaseUrl = process.env.MODAL_AI_BASE_URL?.trim() || DEFAULT_MODAL_BASE_URL;
    const modalModel = process.env.MODAL_AI_MODEL?.trim() || DEFAULT_MODAL_MODEL;
    try {
      const text = await callChatCompletions(modalBaseUrl, modalKey, modalModel, args);
      if (text) return { text, provider: "modal", model: modalModel };
    } catch (error) {
      console.error("Modal AI request failed", error);
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) return null;

  const openAiModel = process.env.OPENAI_AI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  try {
    const text = await callChatCompletions("https://api.openai.com/v1", openAiKey, openAiModel, args);
    if (text) return { text, provider: "openai", model: openAiModel };
  } catch (error) {
    console.error("OpenAI AI request failed", error);
  }

  return null;
}

export function hasAiProvider() {
  return Boolean(process.env.MODAL_AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
}
