import { FONT_INFO, FONT_WEIGHTS, fontFileName, type Density, type FontId } from "./constants";

/*
 * Дизайн-токены шаблонов. Размеры в пунктах (pt): react-pdf меряет в pt,
 * а HTML-предпросмотр задаёт те же значения в CSS-единицах pt — пропорции совпадают.
 */

export type DensityTokens = {
  pagePadding: number; // поля страницы
  sectionGap: number; // между разделами
  itemGap: number; // между записями в разделе
  lineHeight: number;
  baseSize: number; // основной текст
  smallSize: number; // даты, подписи
  headingSize: number; // заголовки разделов
  nameSize: number; // имя
};

export const DENSITY_TOKENS: Record<Density, DensityTokens> = {
  compact: { pagePadding: 30, sectionGap: 12, itemGap: 7, lineHeight: 1.3, baseSize: 9.5, smallSize: 8.5, headingSize: 11, nameSize: 22 },
  standard: { pagePadding: 40, sectionGap: 17, itemGap: 10, lineHeight: 1.42, baseSize: 10, smallSize: 9, headingSize: 12, nameSize: 25 },
  relaxed: { pagePadding: 48, sectionGap: 24, itemGap: 14, lineHeight: 1.58, baseSize: 10.5, smallSize: 9.5, headingSize: 12.5, nameSize: 28 },
};

/** A4 в пунктах и в CSS-пикселях (96 dpi). */
export const A4 = { widthPt: 595.28, heightPt: 841.89, widthPx: 794, heightPx: 1123 } as const;

export const fontStack = (font: FontId) => `"${FONT_INFO[font].family}", ${FONT_INFO[font].fallback}`;

/** @font-face для шрифта резюме. urlFor задаёт путь: /fonts/… в приложении, assets/fonts/… в ZIP. */
export function fontFaceCss(font: FontId, urlFor: (file: string) => string): string {
  return FONT_WEIGHTS.map(
    (weight) =>
      `@font-face{font-family:"${FONT_INFO[font].family}";src:url("${urlFor(fontFileName(font, weight))}") format("truetype");font-weight:${weight};font-style:normal;font-display:swap}`,
  ).join("\n");
}

// ---------- цвет ----------

function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Смешивает цвет с белым: amount = 0.9 → очень светлый оттенок для фона. */
export function tint(hex: string, amount: number): string {
  return toHex(parseHex(hex).map((c) => c + (255 - c) * amount));
}

/** Затемняет цвет: amount = 0.2 → на 20% темнее. */
export function shade(hex: string, amount: number): string {
  return toHex(parseHex(hex).map((c) => c * (1 - amount)));
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Цвет текста поверх акцента: белый или почти чёрный — что контрастнее. */
export function readableOn(hex: string): string {
  const l = luminance(hex);
  return (1.05 / (l + 0.05) >= (l + 0.05) / 0.05) ? "#ffffff" : "#111827";
}

/**
 * Акцент для текста на белом фоне: слишком светлый пользовательский цвет затемняется,
 * чтобы заголовки оставались читаемыми (контраст не ниже ~4.5:1).
 */
export function accentText(hex: string): string {
  let color = hex;
  for (let i = 0; i < 8 && (1.05 / (luminance(color) + 0.05)) < 4.5; i++) color = shade(color, 0.15);
  return color;
}
