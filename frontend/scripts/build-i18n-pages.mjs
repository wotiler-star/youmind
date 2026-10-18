// 多语言静态预渲染脚本
// 为每种语言生成「可被搜索引擎抓取」的独立落地页：
//   dist/<lang>/index.html  —— 完整译文 + hreflang 备用链接 + canonical + JSON-LD + 内链(语言切换器/页脚/导航)
//   dist/index.html         —— 默认语言(zh-CN)落地页，使根路径 / 也可抓取
//   dist/app.html           —— 复制自 Vite 构建的 SPA 外壳，供 /app 工作台使用
//
// 用法：在 `vite build` 之后执行，例如 package.json 的 build 脚本：
//   "build": "vite build && node scripts/build-i18n-pages.mjs"
//
// 站点域名（用于 absolute hreflang / canonical / sitemap）通过环境变量 SITE_URL 注入，
// 默认 https://youmind.app；生产部署前请设置 SITE_URL=https://你的域名

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const localesDir = join(root, 'src', 'locales')

// 语言清单：code 同时作为子目录名与 <html lang>；hreflang 用于 hreflang 备用链接
const LANGS = [
  { code: 'zh-CN', hreflang: 'zh-CN', label: '中文' },
  { code: 'en', hreflang: 'en', label: 'English' },
  { code: 'ja', hreflang: 'ja', label: '日本語' },
  { code: 'es', hreflang: 'es', label: 'Español' },
  { code: 'fr', hreflang: 'fr', label: 'Français' },
]
const DEFAULT_CODE = 'zh-CN'
const SITE_URL = (process.env.SITE_URL || 'https://youmind.app').replace(/\/+$/, '')
const BRAND = '#6d5efc'

function loadLocale(code) {
  return JSON.parse(readFileSync(join(localesDir, `${code}.json`), 'utf-8'))
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 生成每个语言的 hreflang 备用链接 + canonical
function headLinks(code) {
  const out = []
  for (const l of LANGS) {
    out.push(`    <link rel="alternate" hreflang="${l.hreflang}" href="${SITE_URL}/${l.code}/" />`)
  }
  out.push(`    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/${DEFAULT_CODE}/" />`)
  out.push(`    <link rel="canonical" href="${SITE_URL}/${code}/" />`)
  return out.join('\n')
}

// 语言切换器：每个落地页都内链到其它语言的独立 URL（满足「内链」要求）
function langSwitcher(code) {
  const items = LANGS.map((l) => {
    const active = l.code === code ? ' aria-current="true" class="ym-lang ym-lang--active"' : ' class="ym-lang"'
    return `<a href="/${l.code}/"${active}>${esc(l.label)}</a>`
  }).join('')
  return `<nav class="ym-langs" aria-label="Languages">${items}</nav>`
}

// 完整 JSON-LD：WebSite + SoftwareApplication + FAQPage，含 availableLanguage 与每页 inLanguage
function jsonLd(code, L) {
  const available = LANGS.map((l) => l.hreflang)
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'YouMind',
      url: `${SITE_URL}/${code}/`,
      inLanguage: code,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/${code}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'YouMind · AI Creation Studio',
      operatingSystem: 'Web',
      applicationCategory: 'ProductivityApplication',
      inLanguage: code,
      availableLanguage: available,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      url: `${SITE_URL}/${code}/`,
    },
  ]
  if (Array.isArray(L.faq) && L.faq.length) {
    graph.push({
      '@type': 'FAQPage',
      inLanguage: code,
      mainEntity: L.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}

const CSS = `
  :root { --brand: ${BRAND}; --bg: #0f1115; --fg: #e6e7ea; --muted: rgba(230,231,234,.62); --card: #15171d; --border: rgba(255,255,255,.08); }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.6; }
  a { color: inherit; text-decoration: none; }
  .ym-wrap { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  header.ym-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; flex-wrap: wrap; }
  .ym-logo { font-size: 20px; font-weight: 700; color: var(--brand); }
  .ym-nav { display: flex; align-items: center; gap: 18px; font-size: 14px; color: var(--muted); }
  .ym-nav a:hover { color: var(--fg); }
  .ym-langs { display: flex; gap: 6px; flex-wrap: wrap; }
  .ym-lang { padding: 6px 12px; border-radius: 999px; font-size: 13px; color: var(--muted); border: 1px solid var(--border); }
  .ym-lang:hover { color: var(--fg); border-color: var(--brand); }
  .ym-lang--active { color: #fff; background: var(--brand); border-color: var(--brand); }
  .ym-hero { text-align: center; padding: 64px 0 36px; }
  .ym-badge { display: inline-block; padding: 6px 14px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; color: var(--muted); margin-bottom: 22px; }
  .ym-hero h1 { font-size: clamp(28px, 5vw, 50px); line-height: 1.15; margin: 0 0 18px; }
  .ym-hero p { font-size: 18px; color: var(--muted); max-width: 760px; margin: 0 auto 30px; }
  .ym-cta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
  .ym-btn { padding: 12px 26px; border-radius: 12px; font-size: 15px; font-weight: 600; display: inline-block; }
  .ym-btn--primary { background: var(--brand); color: #fff; }
  .ym-btn--primary:hover { opacity: .92; }
  .ym-btn--ghost { border: 1px solid var(--border); color: var(--fg); }
  .ym-btn--sm { padding: 8px 16px; font-size: 14px; }
  .ym-section { padding: 56px 0; border-top: 1px solid var(--border); }
  .ym-section h2 { text-align: center; font-size: 30px; margin: 0 0 36px; }
  .ym-section > .ym-sub { text-align: center; color: var(--muted); max-width: 640px; margin: -20px auto 36px; }
  .ym-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
  .ym-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; }
  .ym-card-no { color: var(--brand); font-weight: 700; font-size: 14px; margin-bottom: 8px; }
  .ym-card h3 { margin: 0 0 8px; font-size: 19px; }
  .ym-card p { margin: 0; color: var(--muted); }
  .ym-steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .ym-step { display: flex; gap: 14px; align-items: flex-start; }
  .ym-step-no { flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--brand); color: #fff; font-weight: 700; display: grid; place-items: center; }
  .ym-step h4 { margin: 4px 0 6px; font-size: 17px; }
  .ym-step p { margin: 0; color: var(--muted); }
  .ym-tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }
  .ym-tool { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
  .ym-tool h3 { margin: 0 0 6px; font-size: 17px; color: var(--brand); }
  .ym-tool p { margin: 0; color: var(--muted); font-size: 14px; }
  .ym-price { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; max-width: 760px; margin: 0 auto; }
  .ym-tier { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 26px; display: flex; flex-direction: column; }
  .ym-tier--hot { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand); }
  .ym-tier h3 { margin: 0 0 4px; font-size: 20px; }
  .ym-tier .ym-amt { font-size: 32px; font-weight: 700; margin: 8px 0; }
  .ym-tier .ym-amt small { font-size: 14px; color: var(--muted); font-weight: 400; }
  .ym-tier ul { list-style: none; padding: 0; margin: 12px 0 20px; color: var(--muted); font-size: 14px; }
  .ym-tier li { padding: 6px 0; border-bottom: 1px solid var(--border); }
  .ym-tier .ym-btn { text-align: center; margin-top: auto; }
  .ym-faq { max-width: 760px; margin: 0 auto; }
  .ym-faq details { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 4px 18px; margin-bottom: 12px; }
  .ym-faq summary { cursor: pointer; padding: 14px 0; font-weight: 600; }
  .ym-faq p { margin: 0 0 14px; color: var(--muted); }
  .ym-cta-final { text-align: center; padding: 64px 0; border-top: 1px solid var(--border); }
  .ym-cta-final h2 { font-size: 30px; margin: 0 0 14px; }
  .ym-cta-final p { color: var(--muted); max-width: 620px; margin: 0 auto 26px; }
  footer.ym-foot { border-top: 1px solid var(--border); padding: 40px 0 30px; }
  .ym-foot-cols { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 24px; }
  .ym-foot-cols .ym-tag { color: var(--muted); font-size: 14px; max-width: 240px; }
  .ym-foot h4 { font-size: 14px; margin: 0 0 12px; color: var(--fg); }
  .ym-foot li { list-style: none; margin: 0 0 8px; }
  .ym-foot a { color: var(--muted); font-size: 14px; }
  .ym-foot a:hover { color: var(--fg); }
  .ym-foot-legal { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 28px; color: var(--muted); font-size: 13px; }
  .ym-foot-legal .ym-langs { justify-content: flex-end; }
  @media (max-width: 760px) {
    .ym-grid, .ym-steps, .ym-price, .ym-foot-cols { grid-template-columns: 1fr; }
    .ym-nav { display: none; }
  }
`

function render(lang) {
  const t = loadLocale(lang.code)
  const m = t.meta
  const nav = t.nav
  const L = t.landing
  const f = t.footer

  const capabilities = L.capabilities
    .map(
      (x, i) =>
        `<article class="ym-card"><div class="ym-card-no">0${i + 1}</div><h3>${esc(
          x.title,
        )}</h3><p>${esc(x.desc)}</p></article>`,
    )
    .join('')

  const steps = L.steps
    .map(
      (x, i) =>
        `<li class="ym-step"><span class="ym-step-no">${i + 1}</span><div><h4>${esc(
          x.title,
        )}</h4><p>${esc(x.desc)}</p></div></li>`,
    )
    .join('')

  const usecases = L.usecases
    .map(
      (x) =>
        `<article class="ym-card"><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></article>`,
    )
    .join('')

  const tools = L.tools
    .map((x) => `<div class="ym-tool"><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div>`)
    .join('')

  const pricing = L.pricing
    .map(
      (p) =>
        `<div class="ym-tier${p.highlight ? ' ym-tier--hot' : ''}"><h3>${esc(
          p.name,
        )}</h3><div class="ym-amt">${esc(p.price)}<small>${esc(p.period)}</small></div><ul>${p.features
          .map((ft) => `<li>${esc(ft)}</li>`)
          .join('')}</ul><a class="ym-btn ${
          p.highlight ? 'ym-btn--primary' : 'ym-btn--ghost'
        }" href="/app">${esc(p.cta)}</a></div>`,
    )
    .join('')

  const faq = L.faq
    .map(
      (x) =>
        `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`,
    )
    .join('')

  const footCols = (f.columns || [])
    .map(
      (c) =>
        `<div><h4>${esc(c.title)}</h4><ul>${c.links
          .map((lk) => `<li><a href="${esc(lk.href)}">${esc(lk.label)}</a></li>`)
          .join('')}</ul></div>`,
    )
    .join('')

  return `<!doctype html>
<html lang="${lang.code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(m.title)}</title>
  <meta name="description" content="${esc(m.description)}" />
  <meta name="robots" content="index,follow" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(m.title)}" />
  <meta property="og:description" content="${esc(m.description)}" />
  <meta property="og:url" content="${SITE_URL}/${lang.code}/" />
  <meta property="og:locale" content="${lang.code}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(m.title)}" />
  <meta name="twitter:description" content="${esc(m.description)}" />
${headLinks(lang.code)}
  <style>${CSS}</style>
</head>
<body>
  <div class="ym-wrap">
    <header class="ym-head">
      <div class="ym-logo">🧠 YouMind</div>
      <nav class="ym-nav">
        <a href="#capabilities">${esc(nav.features)}</a>
        <a href="#tools">${esc(nav.tools)}</a>
        <a href="#pricing">${esc(nav.pricing)}</a>
        <a class="ym-btn ym-btn--primary ym-btn--sm" href="/app">${esc(nav.app)}</a>
      </nav>
      ${langSwitcher(lang.code)}
    </header>

    <section class="ym-hero">
      <div class="ym-badge">${esc(L.badge)}</div>
      <h1>${esc(L.heroTitle)}</h1>
      <p>${esc(L.heroSubtitle)}</p>
      <div class="ym-cta">
        <a class="ym-btn ym-btn--primary" href="/app">${esc(L.ctaPrimary)}</a>
        <a class="ym-btn ym-btn--ghost" href="#capabilities">${esc(L.ctaSecondary)}</a>
      </div>
    </section>

    <section class="ym-section" id="capabilities">
      <h2>${esc(L.capabilitiesTitle)}</h2>
      <div class="ym-grid">${capabilities}</div>
    </section>

    <section class="ym-section" id="how">
      <h2>${esc(L.howTitle)}</h2>
      <ul class="ym-steps">${steps}</ul>
    </section>

    <section class="ym-section" id="usecases">
      <h2>${esc(L.usecasesTitle)}</h2>
      <div class="ym-grid">${usecases}</div>
    </section>

    <section class="ym-section" id="tools">
      <h2>${esc(L.toolsTitle)}</h2>
      <div class="ym-tools">${tools}</div>
    </section>

    <section class="ym-section" id="pricing">
      <h2>${esc(L.pricingTitle)}</h2>
      <div class="ym-price">${pricing}</div>
    </section>

    <section class="ym-section" id="faq">
      <h2>${esc(L.faqTitle)}</h2>
      <div class="ym-faq">${faq}</div>
    </section>

    <section class="ym-cta-final">
      <h2>${esc(L.ctaFinalTitle)}</h2>
      <p>${esc(L.ctaFinalText)}</p>
      <div class="ym-cta">
        <a class="ym-btn ym-btn--primary" href="/app">${esc(L.ctaPrimary)}</a>
      </div>
    </section>

    <footer class="ym-foot">
      <div class="ym-foot-cols">
        <div>
          <div class="ym-logo" style="margin-bottom:10px;">🧠 YouMind</div>
          <p class="ym-tag">${esc(f.tagline)}</p>
        </div>
        ${footCols}
      </div>
      <div class="ym-foot-legal">
        <span>${esc(f.copyright)}</span>
        <span style="color:var(--muted);font-size:13px;">${esc(f.languages)}</span>
        ${langSwitcher(lang.code)}
      </div>
    </footer>
  </div>
  <script type="application/ld+json">${jsonLd(lang.code, L)}</script>
</body>
</html>`
}

// ---- 执行 ----
if (!existsSync(dist)) {
  console.error('[i18n] dist/ 不存在，请先运行 `vite build`。')
  process.exit(1)
}

// 1) 保存 SPA 外壳到 app.html（/app 工作台使用）
const spaShell = join(dist, 'index.html')
if (existsSync(spaShell)) {
  copyFileSync(spaShell, join(dist, 'app.html'))
}

// 2) 为每个语言生成独立可抓取落地页
for (const lang of LANGS) {
  const html = render(lang)
  const dir = join(dist, lang.code)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html, 'utf-8')
  console.log(`[i18n] 已生成 ${lang.code}/index.html (${html.length} bytes)`)
}

// 3) 根路径落地页 = 默认语言（使 / 也可被抓取，canonical 指向 /zh-CN/）
const defaultHtml = render(LANGS.find((l) => l.code === DEFAULT_CODE))
writeFileSync(join(dist, 'index.html'), defaultHtml, 'utf-8')
console.log(`[i18n] 已生成 index.html (默认 ${DEFAULT_CODE})`)
console.log(`[i18n] SITE_URL=${SITE_URL}`)
