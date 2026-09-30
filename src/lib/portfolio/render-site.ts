import { accentText, fontFaceCss, fontStack, readableOn, tint } from "@/lib/resume/design";
import type { ContactView, LinkView, ResumeView, SectionView } from "@/lib/resume/selectors";
import { escapeHtml as e } from "@/lib/resume/utils";

/*
 * Статический мини-сайт портфолио. Одна функция на предпросмотр и ZIP:
 * - предпросмотр показывает html в iframe (стили встроены, картинки — object URL);
 * - ZIP кладёт тот же html в index.html со styles.css и assets/ по относительным путям.
 * Сайт не использует JavaScript, Next.js и сеть — работает из распакованной папки.
 */

export type SiteAssets = {
  photo?: string; // адрес фото
  projectImages: Record<string, string>; // projectId → адрес картинки
  fontUrl: (file: string) => string; // адрес файла шрифта
  stylesheet: { inline: true } | { href: string };
};

export function renderPortfolioSite(view: ResumeView, assets: SiteAssets): { html: string; css: string } {
  const css = renderCss(view, assets);
  const about = view.sections.find((s) => s.id === "about");
  const title = view.fullName ? `${view.fullName} — портфолио` : "Портфолио";
  const description = about?.id === "about" ? about.text.slice(0, 160) : view.title;

  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${e(title)}</title>`,
    description ? `<meta name="description" content="${e(description)}">` : "",
    "stylesheet" in assets && "href" in assets.stylesheet
      ? `<link rel="stylesheet" href="${e(assets.stylesheet.href)}">`
      : `<style>${css}</style>`,
  ].join("\n    ");

  const body = [
    renderHero(view, assets),
    '<main class="container">',
    ...view.sections.filter((s) => s.id !== "about").map((s) => renderSection(s, assets)),
    renderContacts(view.contacts),
    "</main>",
    `<footer class="container footer">© ${new Date().getFullYear()} ${e(view.fullName || "Портфолио")}</footer>`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="ru">
  <head>
    ${head}
  </head>
  <body>
${body}
  </body>
</html>
`;
  return { html, css };
}

// ---------- разметка ----------

const link = (l: LinkView, cls = "") =>
  `<a${cls ? ` class="${cls}"` : ""} href="${e(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${e(l.label)}</a>`;

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${e(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

const tags = (items: string[]) => (items.length ? `<ul class="tags">${items.map((t) => `<li>${e(t)}</li>`).join("")}</ul>` : "");

function renderHero(view: ResumeView, assets: SiteAssets): string {
  const about = view.sections.find((s) => s.id === "about");
  const quick = view.contacts.filter((c) => c.href).slice(0, 4);
  return `<header class="hero">
  <div class="container hero-inner">
    ${assets.photo ? `<img class="avatar" src="${e(assets.photo)}" alt="${e(view.fullName || "Фото")}">` : ""}
    <div>
      <h1>${e(view.fullName || "Имя Фамилия")}</h1>
      ${view.title ? `<p class="role">${e(view.title)}</p>` : ""}
      ${view.city ? `<p class="meta">${e(view.city)}</p>` : ""}
      ${about?.id === "about" ? `<div class="about">${paragraphs(about.text)}</div>` : ""}
      ${quick.length ? `<p class="actions">${quick.map((c) => link({ href: c.href as string, label: c.title }, "button")).join("")}</p>` : ""}
    </div>
  </div>
</header>`;
}

function section(id: string, title: string, content: string): string {
  return `<section class="section" id="${id}" aria-labelledby="${id}-title">
  <h2 id="${id}-title">${e(title)}</h2>
  ${content}
</section>`;
}

const period = (text: string) => (text ? `<span class="period">${e(text)}</span>` : "");

function renderSection(s: SectionView, assets: SiteAssets): string {
  switch (s.id) {
    case "about":
      return "";
    case "experience":
      return section(
        s.id,
        s.title,
        `<ol class="timeline">${s.items
          .map(
            (x) => `<li class="entry">
    <div class="entry-head"><h3>${e(x.position || x.company)}</h3>${period(x.period)}</div>
    ${x.position && (x.company || x.city) ? `<p class="sub">${e([x.company, x.city].filter(Boolean).join(" · "))}</p>` : ""}
    ${x.description ? paragraphs(x.description) : ""}
    ${x.achievements.length ? `<ul class="bullets">${x.achievements.map((a) => `<li>${e(a)}</li>`).join("")}</ul>` : ""}
    ${tags(x.technologies)}
  </li>`,
          )
          .join("")}</ol>`,
      );
    case "skills":
      return section(
        s.id,
        s.title,
        `<ul class="chips">${s.items.map((x) => `<li>${e(x.name)}${x.level ? ` <span>${e(x.level)}</span>` : ""}</li>`).join("")}</ul>`,
      );
    case "projects":
      return section(
        s.id,
        s.title,
        `<div class="projects">${s.items
          .map((p) => {
            const img = p.imageId ? assets.projectImages[p.id] : undefined;
            return `<article class="project">
    ${img ? `<img src="${e(img)}" alt="${e(p.title)}" loading="lazy">` : ""}
    <div class="project-body">
      <h3>${e(p.title)}</h3>
      ${p.summary ? `<p class="summary">${e(p.summary)}</p>` : ""}
      ${p.description ? paragraphs(p.description) : ""}
      ${tags(p.technologies)}
      ${p.links.length ? `<p class="links">${p.links.map((l) => link(l)).join("")}</p>` : ""}
    </div>
  </article>`;
          })
          .join("")}</div>`,
      );
    case "education":
      return section(
        s.id,
        s.title,
        s.items
          .map(
            (x) => `<div class="entry">
    <div class="entry-head"><h3>${e(x.institution || x.specialty)}</h3>${period(x.period)}</div>
    ${x.institution && (x.specialty || x.degree) ? `<p class="sub">${e([x.specialty, x.degree].filter(Boolean).join(" · "))}</p>` : ""}
    ${x.description ? paragraphs(x.description) : ""}
  </div>`,
          )
          .join(""),
      );
    case "courses":
      return section(
        s.id,
        s.title,
        s.items
          .map(
            (x) => `<div class="entry">
    <div class="entry-head"><h3>${e(x.title)}</h3>${period(x.date)}</div>
    ${x.organization ? `<p class="sub">${e(x.organization)}</p>` : ""}
    ${x.description ? paragraphs(x.description) : ""}
    ${x.link ? `<p class="links">${link({ ...x.link, label: "Сертификат" })}</p>` : ""}
  </div>`,
          )
          .join(""),
      );
    case "languages":
      return section(
        s.id,
        s.title,
        `<ul class="chips">${s.items.map((x) => `<li>${e(x.language)} <span>${e(x.level)}</span></li>`).join("")}</ul>`,
      );
  }
}

function renderContacts(contacts: ContactView[]): string {
  if (!contacts.length) return "";
  return section(
    "contacts",
    "Контакты",
    `<ul class="contacts">${contacts
      .map((c) => `<li><span>${e(c.title)}</span>${c.href ? link({ href: c.href, label: c.label }) : e(c.label)}</li>`)
      .join("")}</ul>`,
  );
}

// ---------- стили ----------

function renderCss(view: ResumeView, assets: SiteAssets): string {
  const { accent, font } = view.design;
  return `${fontFaceCss(font, assets.fontUrl)}
:root{--accent:${accent};--accent-text:${accentText(accent)};--accent-soft:${tint(accent, 0.9)};--on-accent:${readableOn(accent)};--ink:#1f2328;--muted:#5b6370;--line:#e5e7eb;--bg:#fafafa}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:${fontStack(font)};font-size:1rem;line-height:1.6;overflow-wrap:anywhere}
h1,h2,h3,p,ol,ul{margin:0}
a{color:var(--accent-text)}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}
img{max-width:100%;display:block}
.container{width:min(100% - 2rem,56rem);margin-inline:auto}
.hero{background:var(--accent-soft);padding:3.5rem 0 3rem}
.hero-inner{display:flex;gap:2rem;align-items:flex-start}
.avatar{width:9rem;height:9rem;border-radius:50%;object-fit:cover;flex:none;border:4px solid #fff}
.hero h1{font-size:clamp(1.9rem,5vw,2.8rem);line-height:1.1;letter-spacing:-.02em}
.role{margin-top:.4rem;font-size:1.25rem;color:var(--accent-text);font-weight:700}
.meta{color:var(--muted);margin-top:.2rem}
.about{margin-top:1.1rem;max-width:40rem}
.about p+p{margin-top:.6rem}
.actions{margin-top:1.4rem;display:flex;flex-wrap:wrap;gap:.5rem}
.button{display:inline-block;padding:.45rem .95rem;border-radius:999px;background:var(--accent);color:var(--on-accent);text-decoration:none;font-weight:700;font-size:.9rem}
.button:hover{filter:brightness(.92)}
main{padding:2.5rem 0 1rem}
.section{padding:1.75rem 0;border-top:1px solid var(--line)}
.section:first-child{border-top:0}
.section h2{font-size:1.35rem;letter-spacing:-.01em;margin-bottom:1.1rem}
.entry+.entry{margin-top:1.4rem}
.entry-head{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;flex-wrap:wrap}
.entry h3,.project h3{font-size:1.05rem}
.period{color:var(--muted);font-size:.9rem;white-space:nowrap}
.sub{color:var(--muted)}
.entry p+p{margin-top:.4rem}
.timeline{list-style:none;padding:0}
.bullets{margin-top:.4rem;padding-left:1.2rem}
.bullets li::marker{color:var(--accent)}
.tags{list-style:none;padding:0;margin-top:.6rem;display:flex;flex-wrap:wrap;gap:.35rem}
.tags li{font-size:.8rem;padding:.1rem .55rem;border-radius:999px;background:#fff;border:1px solid var(--line);color:var(--muted)}
.chips{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
.chips li{padding:.35rem .8rem;border-radius:999px;background:#fff;border:1px solid var(--line)}
.chips span{color:var(--muted);font-size:.85rem}
.projects{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))}
.project{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.project img{aspect-ratio:16/10;object-fit:cover;width:100%;background:var(--accent-soft)}
.project-body{padding:1rem 1.1rem 1.2rem}
.summary{color:var(--muted);margin-top:.2rem}
.project-body p+p{margin-top:.5rem}
.links{margin-top:.7rem;display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-weight:700;font-size:.9rem}
.contacts{list-style:none;padding:0;display:grid;gap:.6rem;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))}
.contacts li{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:12px;padding:.7rem .9rem}
.contacts span{font-size:.8rem;color:var(--muted)}
.footer{padding:2rem 0 3rem;color:var(--muted);font-size:.85rem}
@media (max-width:40rem){.hero{padding:2.25rem 0 2rem}.hero-inner{flex-direction:column;gap:1.25rem}.avatar{width:6.5rem;height:6.5rem}}
@media print{.hero{background:none}.button{border:1px solid var(--accent);color:var(--accent-text);background:none}}
`;
}
