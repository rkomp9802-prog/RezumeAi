import type { CSSProperties, ReactNode } from "react";
import { accentText, DENSITY_TOKENS, fontStack, tint } from "@/lib/resume/design";
import type { ContactView, ResumeView, SectionView } from "@/lib/resume/selectors";
import "./resume.css";

/*
 * HTML-вид резюме для предпросмотра. Три шаблона используют один ResumeView и общие
 * блоки разделов; различаются шапкой, сеткой и оформлением (resume.css).
 */

type Props = {
  view: ResumeView;
  images: Record<string, string>; // imageId → object URL
};

function sheetStyle(view: ResumeView): CSSProperties {
  const t = DENSITY_TOKENS[view.design.density];
  const pt = (n: number) => `${n}pt`;
  return {
    "--r-font": fontStack(view.design.font),
    "--r-accent": view.design.accent,
    "--r-accent-text": accentText(view.design.accent),
    "--r-accent-tint": tint(view.design.accent, 0.9),
    "--r-pad": pt(t.pagePadding),
    "--r-section-gap": pt(t.sectionGap),
    "--r-item-gap": pt(t.itemGap),
    "--r-lh": String(t.lineHeight),
    "--r-base": pt(t.baseSize),
    "--r-small": pt(t.smallSize),
    "--r-heading": pt(t.headingSize),
    "--r-name": pt(t.nameSize),
  } as CSSProperties;
}

export function ResumeSheet({ view, images }: Props) {
  const photo = view.photoId ? images[view.photoId] : undefined;
  const Template = { classic: Classic, minimal: Minimal, modern: Modern }[view.design.template];
  return (
    <div className="r-sheet" style={sheetStyle(view)}>
      <Template view={view} photo={photo} />
    </div>
  );
}

type TemplateProps = { view: ResumeView; photo?: string };

// ---------- шаблоны ----------

function Classic({ view, photo }: TemplateProps) {
  return (
    <article className="tpl-classic">
      <header className="r-header">
        <div>
          <Identity view={view} />
          <Contacts view={view} />
        </div>
        {photo && <Photo src={photo} name={view.fullName} />}
      </header>
      {view.sections.map((s) => (
        <Section key={s.id} section={s} />
      ))}
    </article>
  );
}

function Minimal({ view, photo }: TemplateProps) {
  return (
    <article className="tpl-minimal">
      <header className="r-header">
        {photo && <Photo src={photo} name={view.fullName} />}
        <div>
          <Identity view={view} />
          <Contacts view={view} />
        </div>
      </header>
      {view.sections.map((s) => (
        <Section key={s.id} section={s} />
      ))}
    </article>
  );
}

// Навыки и языки — в цветной колонке, остальное — в основной. Порядок внутри колонок сохраняется
const SIDE_SECTIONS = new Set<SectionView["id"]>(["skills", "languages"]);

function Modern({ view, photo }: TemplateProps) {
  return (
    <article className="tpl-modern">
      <aside className="r-side">
        {photo && <Photo src={photo} name={view.fullName} />}
        <Contacts view={view} />
        {view.sections
          .filter((s) => SIDE_SECTIONS.has(s.id))
          .map((s) => (
            <Section key={s.id} section={s} chips />
          ))}
      </aside>
      <div className="r-main">
        <header className="r-main-header">
          <Identity view={view} />
        </header>
        {view.sections
          .filter((s) => !SIDE_SECTIONS.has(s.id))
          .map((s) => (
            <Section key={s.id} section={s} />
          ))}
      </div>
    </article>
  );
}

// ---------- общие блоки ----------

function Identity({ view }: { view: ResumeView }) {
  const meta = [view.city, view.birthDate && `Дата рождения: ${view.birthDate}`].filter(Boolean).join(" · ");
  return (
    <>
      <h1 className="r-name">{view.fullName || "Имя Фамилия"}</h1>
      {view.title && <p className="r-role">{view.title}</p>}
      {meta && <p className="r-muted r-small">{meta}</p>}
    </>
  );
}

function Photo({ src, name }: { src: string; name: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- object URL из IndexedDB
  return <img className="r-photo" src={src} alt={name ? `Фото: ${name}` : "Фото"} />;
}

function Contacts({ view }: { view: ResumeView }) {
  if (!view.contacts.length) return null;
  return (
    <ul className="r-contacts" aria-label="Контакты">
      {view.contacts.map((c, i) => (
        <li key={`${c.kind}-${i}`}>
          <ContactLine contact={c} />
        </li>
      ))}
    </ul>
  );
}

function ContactLine({ contact }: { contact: ContactView }) {
  const label = contact.href ? (
    <a href={contact.href} target="_blank" rel="noreferrer">
      {contact.label}
    </a>
  ) : (
    contact.label
  );
  return contact.kind === "phone" || contact.kind === "email" || contact.kind === "website" ? (
    label
  ) : (
    <>
      <span className="r-contact-title">{contact.title}: </span>
      {label}
    </>
  );
}

function Section({ section, chips }: { section: SectionView; chips?: boolean }) {
  return (
    <section className="r-section">
      <h2 className="r-heading">{section.title}</h2>
      <div>{renderBody(section, chips)}</div>
    </section>
  );
}

function Period({ children }: { children: ReactNode }) {
  return children ? <span className="r-period">{children}</span> : null;
}

function joinDot(parts: string[]) {
  return parts.filter(Boolean).join(" · ");
}

function renderBody(section: SectionView, chips?: boolean): ReactNode {
  switch (section.id) {
    case "about":
      return <p className="r-text">{section.text}</p>;

    case "experience":
      return (
        <div className="r-items">
          {section.items.map((e) => (
            <div key={e.id} className="r-item">
              <div className="r-item-head">
                <p className="r-item-title">{e.position || e.company}</p>
                <Period>{e.period}</Period>
              </div>
              {(e.position ? [e.company, e.city] : [e.city]).some(Boolean) && (
                <p className="r-item-sub">{joinDot(e.position ? [e.company, e.city] : [e.city])}</p>
              )}
              {e.description && <p className="r-text">{e.description}</p>}
              {e.achievements.length > 0 && (
                <ul className="r-bullets">
                  {e.achievements.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
              {e.technologies.length > 0 && <p className="r-tags">Технологии: {e.technologies.join(", ")}</p>}
            </div>
          ))}
        </div>
      );

    case "skills":
      return chips ? (
        <div className="r-chips">
          {section.items.map((s) => (
            <span key={s.id} className="r-chip">
              {s.name}
              {s.level && <span className="r-muted"> · {s.level}</span>}
            </span>
          ))}
        </div>
      ) : (
        <p>{section.items.map((s) => (s.level ? `${s.name} (${s.level.toLowerCase()})` : s.name)).join(", ")}</p>
      );

    case "languages":
      return chips ? (
        <div className="r-items">
          {section.items.map((l) => (
            <p key={l.id}>
              {l.language} <span className="r-muted">— {l.level}</span>
            </p>
          ))}
        </div>
      ) : (
        <p>{section.items.map((l) => `${l.language} — ${l.level}`).join(", ")}</p>
      );

    case "projects":
      return (
        <div className="r-items">
          {section.items.map((p) => (
            <div key={p.id} className="r-item">
              <p className="r-item-title">{p.title}</p>
              {(p.summary || p.description) && <p className="r-text">{p.summary || p.description}</p>}
              {p.technologies.length > 0 && <p className="r-tags">Технологии: {p.technologies.join(", ")}</p>}
              {p.links.length > 0 && (
                <p className="r-links">
                  {p.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case "education":
      return (
        <div className="r-items">
          {section.items.map((e) => (
            <div key={e.id} className="r-item">
              <div className="r-item-head">
                <p className="r-item-title">{e.institution || e.specialty}</p>
                <Period>{e.period}</Period>
              </div>
              {e.institution && (e.specialty || e.degree) && <p className="r-item-sub">{joinDot([e.specialty, e.degree])}</p>}
              {e.description && <p className="r-text">{e.description}</p>}
            </div>
          ))}
        </div>
      );

    case "courses":
      return (
        <div className="r-items">
          {section.items.map((c) => (
            <div key={c.id} className="r-item">
              <div className="r-item-head">
                <p className="r-item-title">{c.title}</p>
                <Period>{c.date}</Period>
              </div>
              {c.organization && <p className="r-item-sub">{c.organization}</p>}
              {c.description && <p className="r-text">{c.description}</p>}
              {c.link && (
                <p className="r-links">
                  <a href={c.link.href} target="_blank" rel="noreferrer">
                    {c.link.label}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      );
  }
}
