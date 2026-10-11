type AiProvider = "gemini";

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

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function timeoutSignal(ms: number) {
  return AbortSignal.timeout(ms);
}

function getProviderErrorDetails(body: string) {
  if (!body.trim()) return { responseBody: "empty" };

  try {
    const parsed = JSON.parse(body) as {
      error?: { status?: unknown; code?: unknown; message?: unknown };
    };
    const error = parsed.error;
    if (error && typeof error === "object") {
      return {
        ...(typeof error.status === "string" ? { errorStatus: error.status.slice(0, 80) } : {}),
        ...(typeof error.code === "number" ? { errorCode: error.code } : {}),
        ...(typeof error.message === "string" ? { errorMessage: error.message.slice(0, 160) } : {}),
      };
    }
  } catch {
    // Never log the raw provider response; it may contain request-specific data.
  }

  return { responseBody: "non-json", responseLength: body.length };
}

async function callGemini(
  apiKey: string,
  model: string,
  args: ChatArgs,
): Promise<string | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: args.prompt }] }],
        generationConfig: {
          temperature: args.temperature ?? 0.2,
          maxOutputTokens: args.maxTokens ?? 1800,
        },
      }),
      signal: timeoutSignal(25_000),
    },
  );

  const responseBody = await response.text();
  if (!response.ok) {
    console.error("Gemini API request failed", {
      status: response.status,
      ...getProviderErrorDetails(responseBody),
    });
    return null;
  }

  if (!responseBody.trim()) {
    console.error("Gemini API returned an empty successful response", {
      status: response.status,
      contentType: response.headers.get("content-type"),
    });
    return null;
  }

  let data: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    promptFeedback?: { blockReason?: string };
  };
  try {
    data = JSON.parse(responseBody) as typeof data;
  } catch {
    console.error("Gemini API returned invalid JSON", {
      status: response.status,
      contentType: response.headers.get("content-type"),
      responseLength: responseBody.length,
    });
    return null;
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    console.error("Gemini API response contained no message text", {
      status: response.status,
      blockReason: data.promptFeedback?.blockReason,
      hasCandidates: Array.isArray(data.candidates) && data.candidates.length > 0,
    });
    return null;
  }

  return text;
}

/** Generate application AI text through the Google Gemini API. */
export async function runAiText(args: ChatArgs): Promise<AiResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("Gemini API is not configured: GEMINI_API_KEY is missing");
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  try {
    const text = await callGemini(apiKey, model, args);
    if (text) return { text, provider: "gemini", model };
  } catch (error) {
    console.error("Gemini API request failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message.slice(0, 160) : "Unknown error",
    });
  }

  return null;
}

export function hasAiProvider() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
