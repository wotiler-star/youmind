export interface Project {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

// 若设置了 VITE_API_URL 则直连后端；否则走同源 /api（由 nginx 反代）
const API_BASE = import.meta.env.VITE_API_URL || ''

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(`请求失败: ${res.status}`)
  }
  return res
}

export const listProjects = () => req('/api/projects').then((r) => r.json() as Promise<Project[]>)

export const createProject = (title: string) =>
  req('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ title, content: '' }),
  }).then((r) => r.json() as Promise<Project>)

export const getProject = (id: number) =>
  req(`/api/projects/${id}`).then((r) => r.json() as Promise<Project>)

export const updateProject = (id: number, data: Partial<Pick<Project, 'title' | 'content'>>) =>
  req(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then((r) => r.json() as Promise<Project>)

export const deleteProject = (id: number) => req(`/api/projects/${id}`, { method: 'DELETE' })

/** 流式调用 /api/chat，逐块产出文本。 */
export async function* streamChat(message: string, history: { role: string; content: string }[]) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}
