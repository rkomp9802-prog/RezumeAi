import { Document, Font, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { FONT_INFO, FONT_WEIGHTS, fontFileName, FONTS, type FontId } from "@/lib/resume/constants";
import { accentText, DENSITY_TOKENS, tint } from "@/lib/resume/design";
import type { ContactView, ResumeView, SectionView } from "@/lib/resume/selectors";

/*
 * PDF (A4) на @react-pdf/renderer. Те же ResumeView, токены плотности и шрифты, что у
 * HTML-предпросмотра, — поэтому PDF соответствует выбранному шаблону. Только резюме, без интерфейса.
 */

let fontsRegistered = false;

/** Регистрирует TTF с кириллицей (из /public/fonts) и отключает переносы по слогам. */
export function registerPdfFonts(origin: string) {
  if (fontsRegistered) return;
  for (const font of FONTS as readonly FontId[]) {
    Font.register({
      family: FONT_INFO[font].family,
      fonts: FONT_WEIGHTS.map((weight) => ({ src: `${origin}/fonts/${fontFileName(font, weight)}`, fontWeight: weight })),
    });
  }
  // Переносы react-pdf рассчитаны на английский — для русского текста слова не делим
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

type Props = { view: ResumeView; photo: string | null };

export function ResumePdf({ view, photo }: Props) {
  const s = makeStyles(view);
  const Template = { classic: Classic, minimal: Minimal, modern: Modern }[view.design.template];
  return (
    <Document title={view.fullName ? `Резюме — ${view.fullName}` : "Резюме"} author={view.fullName} language="ru" creator="Конструктор резюме">
      <Page size="A4" style={s.page} wrap>
        <Template view={view} photo={photo} s={s} />
        <Text style={s.pageNumber} fixed render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber} / ${totalPages}` : "")} />
      </Page>
    </Document>
  );
}

type Styles = ReturnType<typeof makeStyles>;
type TemplateProps = { view: ResumeView; photo: string | null; s: Styles };

function makeStyles(view: ResumeView) {
  const t = DENSITY_TOKENS[view.design.density];
  const accent = view.design.accent;
  const accentInk = accentText(accent);
  const tpl = view.design.template;
  const modern = tpl === "modern";
  const minimal = tpl === "minimal";
  const sideWidth = 595.28 * 0.34;

  return StyleSheet.create({
    page: {
      fontFamily: FONT_INFO[view.design.font].family,
      fontSize: t.baseSize,
      lineHeight: t.lineHeight,
      color: "#1f2328",
      paddingTop: minimal ? t.pagePadding * 1.25 : t.pagePadding,
      paddingBottom: t.pagePadding + 8,
      paddingLeft: modern ? sideWidth + t.pagePadding * 0.7 : minimal ? t.pagePadding * 1.3 : t.pagePadding,
      paddingRight: minimal ? t.pagePadding * 1.3 : t.pagePadding,
    },
    pageNumber: { position: "absolute", bottom: t.pagePadding / 2, right: t.pagePadding, fontSize: t.smallSize - 1, color: "#8a929e" },
    muted: { color: "#5b6370" },
    small: { fontSize: t.smallSize },
    bold: { fontWeight: 700 },

    // шапка
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: minimal ? "center" : "flex-start",
      gap: 16,
      marginBottom: minimal ? t.sectionGap * 1.6 : t.sectionGap,
      paddingBottom: tpl === "classic" ? t.itemGap * 1.2 : 0,
      borderBottomWidth: tpl === "classic" ? 1.5 : 0,
      borderBottomColor: accentInk,
    },
    name: {
      fontSize: minimal ? t.nameSize * 1.05 : modern ? t.nameSize * 1.08 : t.nameSize,
      fontWeight: minimal ? 400 : 700,
      lineHeight: 1.1,
      color: modern ? accentInk : "#1f2328",
    },
    role: {
      marginTop: 3,
      fontSize: t.baseSize * (minimal ? 1.15 : 1.22),
      color: tpl === "classic" ? accentInk : minimal ? "#5b6370" : "#1f2328",
      fontWeight: modern ? 700 : 400,
    },
    contacts: { flexDirection: modern ? "column" : "row", flexWrap: "wrap", marginTop: modern ? 0 : 8, fontSize: t.smallSize },
    contact: { marginRight: modern ? 0 : 12, marginBottom: modern ? 5 : 2 },
    photoClassic: { width: 78, height: 96, objectFit: "cover", borderRadius: 3 },
    photoRound: { width: minimal ? 64 : 110, height: minimal ? 64 : 110, objectFit: "cover", borderRadius: minimal ? 32 : 55 },

    // Modern: цветная колонка
    sideBg: { position: "absolute", top: 0, bottom: 0, left: 0, width: sideWidth, backgroundColor: tint(accent, 0.9) },
    side: { position: "absolute", top: t.pagePadding, left: t.pagePadding, width: sideWidth - t.pagePadding * 1.6 },

    // разделы
    section: { marginBottom: t.sectionGap },
    minimalSection: { flexDirection: "row", marginBottom: t.sectionGap * 1.3 },
    minimalLabel: { width: 92, marginRight: 18, paddingTop: 1.5, fontSize: t.smallSize, textTransform: "uppercase", letterSpacing: 1.1, color: "#6b7280" },
    heading: {
      fontSize: tpl === "classic" ? t.headingSize * 0.92 : t.headingSize,
      fontWeight: 700,
      lineHeight: 1.2,
      marginBottom: t.itemGap * 0.9,
      color: tpl === "classic" ? accentInk : "#111827",
      textTransform: tpl === "classic" ? "uppercase" : "none",
      letterSpacing: tpl === "classic" ? 0.9 : 0,
      paddingBottom: tpl === "classic" ? 3 : 0,
      borderBottomWidth: tpl === "classic" ? 0.75 : 0,
      borderBottomColor: "#d0d5dc",
    },
    headingRow: { flexDirection: "row", alignItems: "center", marginBottom: t.itemGap * 0.9 },
    headingBar: { width: 12, height: 3, borderRadius: 2, backgroundColor: accent, marginRight: 6 },
    item: { marginBottom: t.itemGap },
    itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    itemTitle: { fontWeight: 700, flex: 1, paddingRight: 10 },
    period: { fontSize: t.smallSize, color: modern ? accentInk : "#5b6370", fontWeight: modern ? 700 : 400 },
    bulletRow: { flexDirection: "row", marginTop: 1.5 },
    bullet: { width: 9, color: minimal ? "#9aa1ab" : accentInk },
    tags: { marginTop: 2, fontSize: t.smallSize, color: "#5b6370" },
    links: { flexDirection: "row", flexWrap: "wrap", marginTop: 2, fontSize: t.smallSize },
    link: { color: minimal ? "#1f2328" : accentInk, textDecoration: minimal ? "underline" : "none", marginRight: 10 },
    chip: { fontSize: t.smallSize, backgroundColor: "#ffffff", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1.5, marginRight: 4, marginBottom: 4 },
  });
}

// ---------- шаблоны ----------

function Classic({ view, photo, s }: TemplateProps) {
  return (
    <>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Identity view={view} s={s} />
          <Contacts contacts={view.contacts} s={s} />
        </View>
        {photo && <Image src={photo} style={s.photoClassic} />}
      </View>
      {view.sections.map((sec) => (
        <Section key={sec.id} section={sec} s={s} />
      ))}
    </>
  );
}

function Minimal({ view, photo, s }: TemplateProps) {
  return (
    <>
      <View style={s.header}>
        {photo && <Image src={photo} style={s.photoRound} />}
        <View style={{ flex: 1 }}>
          <Identity view={view} s={s} />
          <Contacts contacts={view.contacts} s={s} />
        </View>
      </View>
      {view.sections.map((sec) => (
        <View key={sec.id} style={s.minimalSection} wrap>
          <Text style={s.minimalLabel}>{sec.title}</Text>
          <View style={{ flex: 1 }}>
            <Body section={sec} s={s} />
          </View>
        </View>
      ))}
    </>
  );
}

// Навыки и языки — в цветной колонке (как в предпросмотре); остальное — в основной
const SIDE = new Set<SectionView["id"]>(["skills", "languages"]);

function Modern({ view, photo, s }: TemplateProps) {
  return (
    <>
      <View style={s.sideBg} fixed />
      <View style={s.side}>
        {photo && <Image src={photo} style={[s.photoRound, { marginBottom: 14 }]} />}
        <Contacts contacts={view.contacts} s={s} labeled />
        {view.sections
          .filter((sec) => SIDE.has(sec.id))
          .map((sec) => (
            <Section key={sec.id} section={sec} s={s} chips bar />
          ))}
      </View>
      <View style={{ marginBottom: 17 }}>
        <Identity view={view} s={s} />
      </View>
      {view.sections
        .filter((sec) => !SIDE.has(sec.id))
        .map((sec) => (
          <Section key={sec.id} section={sec} s={s} bar />
        ))}
    </>
  );
}

// ---------- общие блоки ----------

function Identity({ view, s }: { view: ResumeView; s: Styles }) {
  const meta = [view.city, view.birthDate && `Дата рождения: ${view.birthDate}`].filter(Boolean).join(" · ");
  return (
    <>
      <Text style={s.name}>{view.fullName || "Имя Фамилия"}</Text>
      {view.title ? <Text style={s.role}>{view.title}</Text> : null}
      {meta ? <Text style={[s.muted, s.small, { marginTop: 2 }]}>{meta}</Text> : null}
    </>
  );
}

function Contacts({ contacts, s, labeled }: { contacts: ContactView[]; s: Styles; labeled?: boolean }) {
  if (!contacts.length) return null;
  return (
    <View style={s.contacts}>
      {contacts.map((c, i) => {
        const titled = labeled || !(c.kind === "phone" || c.kind === "email" || c.kind === "website");
        const value = c.href ? (
          <Link src={c.href} style={{ color: "#1f2328", textDecoration: "none" }}>
            {c.label}
          </Link>
        ) : (
          c.label
        );
        return (
          <Text key={i} style={s.contact}>
            {titled ? <Text style={s.muted}>{c.title}: </Text> : null}
            {value}
          </Text>
        );
      })}
    </View>
  );
}

/** bar — цветная планка перед заголовком (шаблон Modern). */
function Section({ section, s, chips, bar }: { section: SectionView; s: Styles; chips?: boolean; bar?: boolean }) {
  return (
    <View style={s.section} wrap>
      {bar ? (
        <View style={s.headingRow} minPresenceAhead={40}>
          <View style={s.headingBar} />
          <Text style={[s.heading, { marginBottom: 0 }]}>{section.title}</Text>
        </View>
      ) : (
        <Text style={s.heading} minPresenceAhead={40}>
          {section.title}
        </Text>
      )}
      <Body section={section} s={s} chips={chips} />
    </View>
  );
}

function Head({ title, right, s }: { title: string; right: string; s: Styles }) {
  return (
    <View style={s.itemHead}>
      <Text style={s.itemTitle}>{title}</Text>
      {right ? <Text style={s.period}>{right}</Text> : null}
    </View>
  );
}

function Bullets({ items, s }: { items: string[]; s: Styles }) {
  return (
    <>
      {items.map((a, i) => (
        <View key={i} style={s.bulletRow} wrap={false}>
          <Text style={s.bullet}>•</Text>
          <Text style={{ flex: 1 }}>{a}</Text>
        </View>
      ))}
    </>
  );
}

const joinDot = (parts: string[]) => parts.filter(Boolean).join(" · ");
const Item = ({ s, children }: { s: Styles; children: ReactNode }) => (
  <View style={s.item} wrap={false}>
    {children}
  </View>
);

function Body({ section, s, chips }: { section: SectionView; s: Styles; chips?: boolean }): ReactNode {
  switch (section.id) {
    case "about":
      return <Text>{section.text}</Text>;
    case "experience":
      return section.items.map((e) => (
        <View key={e.id} style={s.item}>
          <View wrap={false}>
            <Head title={e.position || e.company} right={e.period} s={s} />
            {(e.position ? [e.company, e.city] : [e.city]).some(Boolean) ? (
              <Text style={s.muted}>{joinDot(e.position ? [e.company, e.city] : [e.city])}</Text>
            ) : null}
          </View>
          {e.description ? <Text style={{ marginTop: 2 }}>{e.description}</Text> : null}
          {e.achievements.length ? <Bullets items={e.achievements} s={s} /> : null}
          {e.technologies.length ? <Text style={s.tags}>Технологии: {e.technologies.join(", ")}</Text> : null}
        </View>
      ));
    case "skills":
      return chips ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {section.items.map((x) => (
            <Text key={x.id} style={s.chip}>
              {x.name}
              {x.level ? <Text style={s.muted}> · {x.level}</Text> : null}
            </Text>
          ))}
        </View>
      ) : (
        <Text>{section.items.map((x) => (x.level ? `${x.name} (${x.level.toLowerCase()})` : x.name)).join(", ")}</Text>
      );
    case "languages":
      return chips ? (
        section.items.map((l) => (
          <Text key={l.id} style={{ marginBottom: 3 }}>
            {l.language} <Text style={s.muted}>— {l.level}</Text>
          </Text>
        ))
      ) : (
        <Text>{section.items.map((l) => `${l.language} — ${l.level}`).join(", ")}</Text>
      );
    case "projects":
      return section.items.map((p) => (
        <Item key={p.id} s={s}>
          <Text style={s.bold}>{p.title}</Text>
          {p.summary || p.description ? <Text>{p.summary || p.description}</Text> : null}
          {p.technologies.length ? <Text style={s.tags}>Технологии: {p.technologies.join(", ")}</Text> : null}
          {p.links.length ? (
            <View style={s.links}>
              {p.links.map((l) => (
                <Link key={l.href} src={l.href} style={s.link}>
                  {l.label}
                </Link>
              ))}
            </View>
          ) : null}
        </Item>
      ));
    case "education":
      return section.items.map((e) => (
        <Item key={e.id} s={s}>
          <Head title={e.institution || e.specialty} right={e.period} s={s} />
          {e.institution && (e.specialty || e.degree) ? <Text style={s.muted}>{joinDot([e.specialty, e.degree])}</Text> : null}
          {e.description ? <Text style={{ marginTop: 2 }}>{e.description}</Text> : null}
        </Item>
      ));
    case "courses":
      return section.items.map((c) => (
        <Item key={c.id} s={s}>
          <Head title={c.title} right={c.date} s={s} />
          {c.organization ? <Text style={s.muted}>{c.organization}</Text> : null}
          {c.description ? <Text style={{ marginTop: 2 }}>{c.description}</Text> : null}
          {c.link ? (
            <Link src={c.link.href} style={[s.link, s.small]}>
              {c.link.label}
            </Link>
          ) : null}
        </Item>
      ));
  }
}
