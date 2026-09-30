import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

/*
 * Только для сервера (импортируется в /api/ai). Ключ GEMINI_API_KEY читается здесь
 * и никогда не попадает в браузер: переменная без префикса NEXT_PUBLIC_.
 */

// Основная модель и запасные — на случай перегрузки Gemini (503) или лимитов (429)
const MODELS = [process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"].filter(
  (m, i, all) => all.indexOf(m) === i,
);
const ATTEMPT_TIMEOUT_MS = 20_000;

export class AiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError(
      process.env.VERCEL
        ? "AI не настроен: добавьте GEMINI_API_KEY в Vercel (Settings → Environment Variables) и сделайте Redeploy."
        : "AI не настроен: добавьте GEMINI_API_KEY в .env.local и перезапустите сервер.",
      503,
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

const retryable = (err: unknown) => !(err instanceof ApiError) || err.status === 429 || err.status >= 500;

function describe(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError) {
    const raw = err.message ?? "";
    console.error(`[gemini] ${err.status} ${raw.replace(/\s+/g, " ").slice(0, 300)}`);
    if (/api key not valid|API_KEY_INVALID/i.test(raw)) return new AiError("Ключ GEMINI_API_KEY не подходит. Проверьте его в .env.local.", 401);
    if (/location is not supported/i.test(raw)) return new AiError("Gemini API недоступен из вашего региона.", 403);
    if (err.status === 429) return new AiError("Превышен лимит запросов к Gemini. Подождите минуту и попробуйте снова.", 429);
    if (err.status >= 500) return new AiError("Gemini сейчас перегружен. Попробуйте через минуту.", 503);
    return new AiError("Gemini не смог обработать запрос. Попробуйте ещё раз.", 502);
  }
  console.error("[gemini]", err);
  return new AiError("Не удалось связаться с Gemini. Проверьте интернет и попробуйте снова.", 502);
}

/**
 * Запрос к Gemini с ответом в JSON. validate проверяет ответ схемой — если модель
 * вернула мусор, пробуем следующую модель.
 */
export async function generateJson<T>(prompt: string, systemInstruction: string, validate: (value: unknown) => T, signal: AbortSignal): Promise<T> {
  const ai = getClient();
  let lastError: unknown;
  for (const model of MODELS) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal.addEventListener("abort", onAbort);
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.4,
          responseMimeType: "application/json",
          thinkingConfig: model.startsWith("gemini-3") ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
          abortSignal: controller.signal,
        },
      });
      return validate(JSON.parse(res.text ?? ""));
    } catch (err) {
      if (signal.aborted) throw new AiError("Запрос отменён.", 499);
      lastError = err;
      if (!retryable(err)) break;
      console.warn(`[gemini] ${model}: ${err instanceof Error ? err.message.slice(0, 160) : err} — пробую следующую модель`);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    }
  }
  throw describe(lastError);
}
