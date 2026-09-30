"use client";

import type { AiAction, AiPayload, AiResult } from "@/lib/ai/schemas";

export type AiResponse<A extends AiAction> = { result: AiResult<A>; warnings: string[] };

/** Запрос к серверному маршруту /api/ai. Ключ Gemini браузер не видит. */
export async function requestAi<A extends AiAction>(action: A, payload: AiPayload<A>, signal?: AbortSignal): Promise<AiResponse<A>> {
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new Error("Нет связи с сервером. Проверьте интернет.");
  }
  const data = (await res.json().catch(() => null)) as (AiResponse<A> & { error?: string }) | null;
  if (!res.ok || !data?.result) throw new Error(data?.error ?? `AI не ответил (ошибка ${res.status}).`);
  return { result: data.result, warnings: data.warnings ?? [] };
}
