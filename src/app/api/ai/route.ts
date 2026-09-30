import { AiError, generateJson } from "@/lib/ai/gemini";
import { buildPrompt, findNewNumbers, SYSTEM_INSTRUCTION } from "@/lib/ai/prompts";
import { aiRequestSchema, aiResultSchemas } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ai — единственная точка обращения к Gemini. Ключ живёт только здесь, на сервере.
 * Ответ: { result, warnings } или { error }.
 */
export async function POST(req: Request) {
  const parsed = aiRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Неверный запрос";
    return Response.json({ error: `Неверный запрос к AI: ${message}` }, { status: 400 });
  }

  const request = parsed.data;
  try {
    const schema = aiResultSchemas[request.action];
    const result = await generateJson(
      buildPrompt(request),
      SYSTEM_INSTRUCTION,
      (value) => {
        const checked = schema.safeParse(value);
        if (!checked.success) throw new Error("Модель вернула ответ в неверном формате");
        return checked.data;
      },
      req.signal,
    );

    const newNumbers = findNewNumbers(request.payload, result);
    const warnings = newNumbers.length
      ? [`В предложении есть числа, которых не было в ваших данных: ${newNumbers.join(", ")}. Проверьте их перед применением.`]
      : [];
    return Response.json({ result, warnings });
  } catch (err) {
    const error = err instanceof AiError ? err : new AiError("Не удалось получить ответ AI.");
    return Response.json({ error: error.message }, { status: error.status });
  }
}
