import { z } from "zod";

/*
 * Контракт AI-маршрута /api/ai: какие действия есть, какие данные они принимают
 * и что возвращают. Одни и те же схемы проверяют запрос на сервере и ответ модели,
 * а на клиенте задают типы.
 */

export const TONES = ["professional", "concise", "confident", "technical", "friendly"] as const;
export type Tone = (typeof TONES)[number];
export const TONE_LABELS: Record<Tone, string> = {
  professional: "Профессиональный",
  concise: "Краткий",
  confident: "Уверенный",
  technical: "Технический",
  friendly: "Дружелюбный",
};

const str = (max: number) => z.string().max(max);
const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);

const experienceBrief = z.object({
  id: str(64),
  position: str(200),
  company: str(200),
  period: str(80),
  description: str(5000),
  achievements: list(str(300), 30),
  technologies: list(str(120), 40),
});

const profileBrief = z.object({
  title: str(200),
  experience: list(experienceBrief, 30),
  skills: list(str(120), 80),
  projects: list(z.object({ title: str(300), summary: str(300), technologies: list(str(120), 40) }), 30),
});

export const aiRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("about"), payload: profileBrief.extend({ currentAbout: str(5000) }) }),
  z.object({ action: z.literal("strengths"), payload: profileBrief }),
  z.object({
    action: z.literal("improve-experience"),
    payload: z.object({ position: str(200), company: str(200), description: str(5000), achievements: list(str(300), 30) }),
  }),
  z.object({ action: z.literal("fix"), payload: z.object({ text: str(5000).min(1) }) }),
  z.object({ action: z.literal("tone"), payload: z.object({ text: str(5000).min(1), tone: z.enum(TONES) }) }),
  z.object({
    action: z.literal("tailor"),
    payload: z.object({
      vacancy: str(8000).min(20, "Вставьте текст вакансии целиком"),
      title: str(200),
      about: str(5000),
      skills: list(str(120), 80),
      experience: list(experienceBrief.pick({ id: true, position: true, company: true, description: true }), 30),
    }),
  }),
]);

export type AiRequest = z.infer<typeof aiRequestSchema>;
export type AiAction = AiRequest["action"];
export type AiPayload<A extends AiAction> = Extract<AiRequest, { action: A }>["payload"];

// Ответы модели — тоже проверяются схемой, прежде чем попасть к пользователю
export const aiResultSchemas = {
  about: z.object({ text: z.string().max(5000) }),
  strengths: z.object({ items: z.array(z.string().max(300)).max(10) }),
  "improve-experience": z.object({ description: z.string().max(5000), achievements: z.array(z.string().max(300)).max(30) }),
  fix: z.object({ text: z.string().max(6000) }),
  tone: z.object({ text: z.string().max(6000) }),
  tailor: z.object({
    about: z.string().max(5000),
    experience: z.array(z.object({ id: z.string(), description: z.string().max(5000) })).max(30),
    notes: z.array(z.string().max(400)).max(10),
  }),
} satisfies Record<AiAction, z.ZodType>;

export type AiResult<A extends AiAction> = z.infer<(typeof aiResultSchemas)[A]>;
