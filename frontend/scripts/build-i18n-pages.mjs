// 多语言静态预渲染脚本
// 为每种语言生成「可被搜索引擎抓取」的独立落地页：
//   dist/<lang>/index.html  —— 完整译文 + hreflang 备用链接 + canonical + JSON-LD + 内链(语言切换器)
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

// 完整 JSON-LD：WebSite + SoftwareApplication，含 availableLanguage 与每页 inLanguage
function jsonLd(code) {
  const available = LANGS.map((l) => l.hreflang)
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
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
    ],
  }
  return JSON.stringify(data)
}

function render(lang) {
  const t = loadLocale(lang.code)
  const m = t.meta
  const nav = t.nav
  const L = t.landing
  const f = t.footer

  const features = L.features
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
  <style>
    :root { --brand: ${BRAND}; --bg: #0f1115; --fg: #e6e7ea; --muted: rgba(230,231,234,.6); --card: #15171d; --border: rgba(255,255,255,.08); }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.6; }
    a { color: inherit; text-decoration: none; }
    .ym-wrap { max-width: 1040px; margin: 0 auto; padding: 0 20px; }
    header.ym-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; }
    .ym-logo { font-size: 20px; font-weight: 700; color: var(--brand); }
    .ym-langs { display: flex; gap: 6px; flex-wrap: wrap; }
    .ym-lang { padding: 6px 12px; border-radius: 999px; font-size: 13px; color: var(--muted); border: 1px solid var(--border); }
    .ym-lang:hover { color: var(--fg); border-color: var(--brand); }
    .ym-lang--active { color: #fff; background: var(--brand); border-color: var(--brand); }
    .ym-hero { text-align: center; padding: 70px 0 40px; }
    .ym-badge { display: inline-block; padding: 6px 14px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; color: var(--muted); margin-bottom: 22px; }
    .ym-hero h1 { font-size: clamp(30px, 5vw, 52px); line-height: 1.15; margin: 0 0 18px; }
    .ym-hero h1 b { color: var(--brand); }
    .ym-hero p { font-size: 18px; color: var(--muted); max-width: 720px; margin: 0 auto 30px; }
    .ym-cta { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .ym-btn { padding: 12px 26px; border-radius: 12px; font-size: 15px; font-weight: 600; }
    .ym-btn--primary { background: var(--brand); color: #fff; }
    .ym-btn--ghost { border: 1px solid var(--border); color: var(--fg); }
    .ym-section { padding: 60px 0; }
    .ym-section h2 { text-align: center; font-size: 30px; margin: 0 0 36px; }
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
    footer.ym-foot { border-top: 1px solid var(--border); padding: 30px 0; text-align: center; color: var(--muted); font-size: 14px; }
    footer.ym-foot .ym-langs { justify-content: center; margin-top: 12px; }
    @media (max-width: 760px) { .ym-grid, .ym-steps { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="ym-wrap">
    <header class="ym-head">
      <div class="ym-logo">🧠 YouMind</div>
      ${langSwitcher(lang.code)}
    </header>

    <section class="ym-hero">
      <div class="ym-badge">${esc(L.badge)}</div>
      <h1>${esc(L.heroTitle)}</h1>
      <p>${esc(L.heroSubtitle)}</p>
      <div class="ym-cta">
        <a class="ym-btn ym-btn--primary" href="/app">${esc(L.ctaPrimary)}</a>
        <a class="ym-btn ym-btn--ghost" href="/${lang.code}/#features">${esc(L.ctaSecondary)}</a>
      </div>
    </section>

    <section class="ym-section" id="features">
      <h2>${esc(L.featuresTitle)}</h2>
      <div class="ym-grid">${features}</div>
    </section>

    <section class="ym-section" id="how">
      <h2>${esc(L.howTitle)}</h2>
      <ul class="ym-steps">${steps}</ul>
    </section>

    <footer class="ym-foot">
      <div>${esc(f.tagline)}</div>
      <div>${esc(f.copyright)}</div>
      <div style="margin-top:10px;color:var(--muted);font-size:13px;">${esc(f.languages)}</div>
      ${langSwitcher(lang.code)}
    </footer>
  </div>
  <script type="application/ld+json">${jsonLd(lang.code)}</script>
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
