// Справочники модели резюме. Схемы, форма, шаблоны, PDF и портфолио берут значения отсюда.

export const SCHEMA_VERSION = 1;

export const SECTION_IDS = ["about", "experience", "skills", "projects", "education", "courses", "languages"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  about: "О себе",
  experience: "Опыт работы",
  skills: "Навыки",
  projects: "Проекты",
  education: "Образование",
  courses: "Курсы и сертификаты",
  languages: "Языки",
};

export const SKILL_LEVELS = ["", "basic", "intermediate", "advanced", "expert"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  "": "Без уровня",
  basic: "Базовый",
  intermediate: "Средний",
  advanced: "Продвинутый",
  expert: "Эксперт",
};

export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  A1: "A1 — начальный",
  A2: "A2 — элементарный",
  B1: "B1 — средний",
  B2: "B2 — выше среднего",
  C1: "C1 — продвинутый",
  C2: "C2 — в совершенстве",
  Native: "Родной",
};

export const SOCIAL_NETWORKS = ["github", "linkedin", "telegram", "behance", "dribbble", "x", "instagram", "other"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  behance: "Behance",
  dribbble: "Dribbble",
  x: "X",
  instagram: "Instagram",
  other: "Другое",
};

export const TEMPLATES = ["classic", "minimal", "modern"] as const;
export type TemplateId = (typeof TEMPLATES)[number];
export const TEMPLATE_INFO: Record<TemplateId, { label: string; description: string }> = {
  classic: { label: "Classic", description: "Строгий и традиционный — для корпоративных вакансий" },
  minimal: { label: "Minimal", description: "Много воздуха и акцент на типографику" },
  modern: { label: "Modern", description: "Выразительная сетка и цветовые акценты" },
};

// Одни и те же TTF-файлы (400 и 700, с кириллицей) используют предпросмотр, PDF и ZIP
export const FONTS = ["inter", "geist", "roboto", "source-sans-3", "merriweather"] as const;
export type FontId = (typeof FONTS)[number];
export const FONT_INFO: Record<FontId, { label: string; family: string; fallback: string }> = {
  inter: { label: "Inter", family: "Resume Inter", fallback: "Arial, sans-serif" },
  geist: { label: "Geist", family: "Resume Geist", fallback: "Arial, sans-serif" },
  roboto: { label: "Roboto", family: "Resume Roboto", fallback: "Arial, sans-serif" },
  "source-sans-3": { label: "Source Sans 3", family: "Resume Source Sans 3", fallback: "Arial, sans-serif" },
  merriweather: { label: "Merriweather", family: "Resume Merriweather", fallback: "Georgia, serif" },
};
export const FONT_WEIGHTS = [400, 700] as const;
export const fontFileName = (font: FontId, weight: (typeof FONT_WEIGHTS)[number]) => `${font}-${weight}.ttf`;

export const DENSITIES = ["compact", "standard", "relaxed"] as const;
export type Density = (typeof DENSITIES)[number];
export const DENSITY_LABELS: Record<Density, string> = {
  compact: "Компактная",
  standard: "Стандартная",
  relaxed: "Свободная",
};

export const ACCENT_PRESETS = [
  { value: "#2563eb", label: "Синий" },
  { value: "#0f766e", label: "Бирюзовый" },
  { value: "#15803d", label: "Зелёный" },
  { value: "#7c3aed", label: "Фиолетовый" },
  { value: "#be123c", label: "Малиновый" },
  { value: "#c2410c", label: "Терракотовый" },
  { value: "#334155", label: "Графит" },
] as const;
export const DEFAULT_ACCENT = ACCENT_PRESETS[0].value;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const HISTORY_LIMIT = 50;
export const AUTOSAVE_DELAY_MS = 700;

// Ограничения длины — защита от случайной вставки мегабайтов текста
export const LIMITS = {
  short: 120,
  medium: 300,
  url: 500,
  text: 5000,
  listItems: 100,
} as const;

// Шаги пошагового редактора. Прогресс ссылается на них, чтобы подсказка вела к нужному шагу
export const STEP_IDS = [
  "personal",
  "about",
  "experience",
  "skills",
  "education",
  "courses",
  "languages",
  "contacts",
  "projects",
  "design",
  "export",
] as const;
export type StepId = (typeof STEP_IDS)[number];
export const STEP_TITLES: Record<StepId, string> = {
  personal: "Основная информация",
  about: "О себе",
  experience: "Опыт",
  skills: "Навыки",
  education: "Образование",
  courses: "Курсы",
  languages: "Языки",
  contacts: "Контакты",
  projects: "Проекты",
  design: "Дизайн",
  export: "Экспорт",
};
