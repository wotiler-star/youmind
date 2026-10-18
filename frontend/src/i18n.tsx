// 轻量 i18n：在工作台 SPA 内提供多语言文案与语言切换器。
// 注意：面向 SEO 的「可抓取独立 URL + 完整译文 + 内链」由构建脚本
// scripts/build-i18n-pages.mjs 预渲染的 dist/<lang>/index.html 落地页承担；
// 本 provider 负责 /app 工作台内的界面文案与指向各语言落地页的内链。
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'
import ja from './locales/ja.json'
import es from './locales/es.json'
import fr from './locales/fr.json'

export const LANGS = [
  { code: 'zh-CN', hreflang: 'zh-CN', label: '中文' },
  { code: 'en', hreflang: 'en', label: 'English' },
  { code: 'ja', hreflang: 'ja', label: '日本語' },
  { code: 'es', hreflang: 'es', label: 'Español' },
  { code: 'fr', hreflang: 'fr', label: 'Français' },
] as const

const DICTS: Record<string, typeof zhCN> = { 'zh-CN': zhCN, en, ja, es, fr }
const DEFAULT_LANG = 'zh-CN'

function detectLang(): string {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const l = navigator.language.toLowerCase()
    if (l.startsWith('zh')) return 'zh-CN'
    if (DICTS[l]) return l
    const base = l.split('-')[0]
    const hit = LANGS.find((x) => x.code.split('-')[0] === base)
    if (hit) return hit.code
  }
  return DEFAULT_LANG
}

type Dict = typeof zhCN
type Path = string

function resolve(dict: Dict, path: string): string {
  const val = path.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), dict)
  return typeof val === 'string' ? val : path
}

interface I18nCtx {
  lang: string
  setLang: (c: string) => void
  t: (path: Path) => string
  /** 跳转到某语言的 SEO 落地页（独立可抓取 URL） */
  landingHref: (code?: string) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(detectLang)
  const dict = DICTS[lang] ?? DICTS[DEFAULT_LANG]

  const value = useMemo<I18nCtx>(
    () => ({
      lang,
      setLang: (c: string) => {
        if (DICTS[c]) setLangState(c)
      },
      t: (path: Path) => resolve(dict, path),
      landingHref: (code?: string) => `/${code ?? lang}/`,
    }),
    [lang, dict],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
