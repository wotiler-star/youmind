import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createProject, deleteProject, listProjects, streamChat, updateProject, type Project } from './api'
import { useI18n, LANGS } from './i18n'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

export default function App() {
  const { lang, setLang, t, landingHref } = useI18n()
  const [projects, setProjects] = useState<Project[]>([])
  const [current, setCurrent] = useState<Project | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // 加载项目列表
  useEffect(() => {
    listProjects()
      .then((ps) => {
        setProjects(ps)
        if (ps.length) select(ps[0])
      })
      .finally(() => setLoading(false))
  }, [])

  // 聊天自动滚动到底
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function select(p: Project) {
    setCurrent(p)
    setTitle(p.title)
    setContent(p.content)
  }

  function scheduleSave(patch: Partial<Pick<Project, 'title' | 'content'>>) {
    if (!current) return
    const id = current.id
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateProject(id, patch).then((r) => {
        setCurrent(r)
        setProjects((prev) => prev.map((x) => (x.id === id ? r : x)))
      })
    }, 600)
  }

  function onChangeTitle(v: string) {
    setTitle(v)
    scheduleSave({ title: v })
  }

  function onChangeContent(v: string) {
    setContent(v)
    scheduleSave({ content: v })
  }

  async function onNew() {
    const p = await createProject('未命名项目')
    setProjects([p, ...projects])
    select(p)
  }

  async function onDelete(id: number) {
    await deleteProject(id)
    const next = projects.filter((x) => x.id !== id)
    setProjects(next)
    if (current?.id === id) {
      setCurrent(null)
      setTitle('')
      setContent('')
    }
  }

  async function onSend() {
    if (!input.trim() || streaming) return
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const userMsg: ChatMsg = { role: 'user', content: input }
    setMessages([...messages, userMsg, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)

    let acc = ''
    try {
      for await (const chunk of streamChat(input, history)) {
        acc += chunk
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 顶栏：语言切换器 + 返回官网落地页（内链到各语言独立 URL） */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#15171d] px-4 py-2">
        <Link to={landingHref()} className="text-base font-semibold text-brand">
          🧠 YouMind
        </Link>
        <nav className="flex items-center gap-2" aria-label={t('nav.langLabel')}>
          <Link to={landingHref()} className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/5">
            {t('app.viewSite')}
          </Link>
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-md px-2 py-1 text-xs ${
                l.code === lang ? 'bg-brand text-white' : 'text-white/60 hover:bg-white/5'
              }`}
              aria-current={l.code === lang ? 'true' : undefined}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏：项目列表 */}
        <aside className="flex w-64 flex-col border-r border-white/10 bg-[#15171d]">
          <button
            onClick={onNew}
            className="mx-3 my-3 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + {t('app.newProject')}
          </button>
          <div className="flex-1 overflow-y-auto px-2">
            {loading ? (
              <p className="px-2 py-3 text-sm text-white/40">{t('app.loading')}</p>
            ) : projects.length === 0 ? (
              <p className="px-2 py-3 text-sm text-white/40">{t('app.emptyHint')}</p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => select(p)}
                  className={`mb-1 block w-full truncate rounded-md px-2 py-2 text-left text-sm ${
                    current?.id === p.id ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  {p.title || t('app.untitled')}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* 中间：编辑器 */}
        <main className="flex flex-1 flex-col">
          {current ? (
            <>
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                <input
                  value={title}
                  onChange={(e) => onChangeTitle(e.target.value)}
                  className="flex-1 bg-transparent text-xl font-semibold outline-none"
                  placeholder={t('app.titlePlaceholder')}
                />
                <button
                  onClick={() => onDelete(current.id)}
                  className="rounded-md px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
                >
                  {t('app.delete')}
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => onChangeContent(e.target.value)}
                placeholder={t('app.editorPlaceholder')}
                className="flex-1 resize-none bg-transparent p-5 text-[15px] leading-relaxed outline-none"
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-white/40">
              {t('app.selectHint')}
            </div>
          )}
        </main>

        {/* 右侧：AI 对话 */}
        <aside className="flex w-96 flex-col border-l border-white/10 bg-[#15171d]">
          <div className="px-4 py-3 text-sm font-semibold text-white/80">{t('app.aiAssistant')}</div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
            {messages.length === 0 && (
              <p className="text-sm text-white/40">{t('app.aiHint')}</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-sm ${
                  m.role === 'user' ? 'bg-brand/20 text-white' : 'bg-white/5 text-white/90'
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? '▍' : '')}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder={t('app.askPlaceholder')}
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              onClick={onSend}
              disabled={streaming}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {t('app.send')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
