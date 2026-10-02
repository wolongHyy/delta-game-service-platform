"use client"

import { useEffect, useRef, useState } from 'react'
import type { Companion, CommunityPost } from '@/lib/types'
import { api } from '@/lib/client'
import { Btn, Field, HudPanel, IconBack, IconImage, IconPlus, IconTrash, Select, Skeleton, TextArea, TextInput, cn } from '@/components/ui'

const DEFAULT_TOPICS = ['三角洲行动', '干员攻略', '地图路线', '装备搭配', '新手上路', '战报分享']

function SectionIndex({ value, label, hint }: { value: string; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-line px-4 py-4 sm:px-5">
      <span className="editorial-number mt-0.5 text-2xl text-primary/70">{value}</span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink">{label}</h2>
        <p className="mt-0.5 font-data text-[9px] uppercase tracking-[0.16em] text-ink-faint">{hint}</p>
      </div>
    </div>
  )
}

export default function PostComposer({
  postId,
  onCancel,
  onSaved,
  onNotice,
}: {
  postId?: string
  onCancel: () => void
  onSaved: (post: CommunityPost) => void
  onNotice: (message: string) => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [topic, setTopic] = useState(DEFAULT_TOPICS[0])
  const [serviceId, setServiceId] = useState('')
  const [tags, setTags] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [companions, setCompanions] = useState<Companion[]>([])
  const [topics, setTopics] = useState<string[]>(DEFAULT_TOPICS)
  const [loading, setLoading] = useState(Boolean(postId))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<Companion[]>('/api/companions').then(setCompanions).catch(() => setCompanions([]))
    api<{ topics: { topic: string; count: number }[] }>('/api/community/topics')
      .then((result) => setTopics([...new Set([...DEFAULT_TOPICS, ...(result.topics || []).map((item) => item.topic)])].slice(0, 14)))
      .catch(() => setTopics(DEFAULT_TOPICS))
  }, [])

  useEffect(() => {
    if (!postId) return
    api<CommunityPost>(`/api/community/posts/${postId}`)
      .then((post) => {
        setTitle(post.title)
        setContent(post.content)
        setTopic(post.topic)
        setServiceId(post.serviceId)
        setTags(post.tags.join(', '))
        setImages(post.images)
      })
      .catch((reason) => setError(reason.message || '帖子加载失败'))
      .finally(() => setLoading(false))
  }, [postId])

  async function upload(file: File) {
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/uploads', { method: 'POST', body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || '图片上传失败')
      setImages((current) => [...current, result.url].slice(0, 6))
    } catch (reason: any) {
      setError(reason.message || '图片上传失败')
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError('请填写标题和正文')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        topic: topic.trim(),
        serviceId,
        images,
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8),
      }
      const post = postId
        ? await api<CommunityPost>(`/api/community/posts/${postId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await api<CommunityPost>('/api/community/posts', { method: 'POST', body: JSON.stringify(payload) })
      onNotice(postId ? '帖子已更新，等待重新审核' : '帖子已提交，等待审核')
      onSaved(post)
    } catch (reason: any) {
      setError(reason.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="void-shell min-h-screen pb-28">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur-xl">
          <button type="button" onClick={onCancel} className="flex h-11 w-11 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
          <div><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-2.5 w-40" /></div>
        </header>
        <div className="mx-auto grid max-w-[1180px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-8"><Skeleton className="h-[520px] w-full" /><Skeleton className="hidden h-80 w-full lg:block" /></div>
      </div>
    )
  }

  const previewTitle = title.trim() || '未命名战术情报'
  const previewContent = content.trim() || '在这里写下路线、干员、装备、时间节点和实战结果。越具体，越容易形成可复用的战术资产。'
  const checklist = [
    { label: '标题已填写', done: Boolean(title.trim()) },
    { label: '正文不少于 40 字', done: content.trim().length >= 40 },
    { label: '已选择频道', done: Boolean(topic.trim()) },
    { label: '至少一张配图', done: images.length > 0 },
  ]

  return (
    <div className="void-shell min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-14 max-w-[1180px] items-center justify-between gap-3 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={onCancel} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-dim hover:bg-surface hover:text-ink" aria-label="返回"><IconBack size={20} /></button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-ink">{postId ? '编辑情报' : '撰写情报'}</h1>
              <p className="truncate font-data text-[9px] tracking-[0.16em] text-ink-faint">{postId ? 'REVISION MODE / RESUBMIT' : 'FIELD REPORT COMPOSER / DRAFT 01'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden font-data text-[9px] tracking-[0.14em] text-ink-faint sm:block">AUTOSAVED LOCALLY</span>
            <span className="border border-warn/30 bg-warn/[0.06] px-2 py-1 font-data text-[9px] tracking-[0.12em] text-warn">MODERATED</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pt-4 lg:px-8 lg:pt-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <section className="command-panel page-enter">
              <SectionIndex value="01" label="核心情报" hint="CORE INTELLIGENCE" />
              <div className="space-y-5 p-4 sm:p-5">
                <Field label="标题" hint={`${title.length}/80`}>
                  <TextInput value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="一句话说明这条战术情报的价值" className="text-base font-medium" />
                </Field>
                <Field label="正文" hint={`${content.length}/5000`}>
                  <TextArea value={content} onChange={(event) => setContent(event.target.value)} rows={12} maxLength={5000} placeholder="建议包含：对局背景 / 路线或打法 / 关键装备 / 风险点 / 最终结果" className="min-h-72 leading-7" />
                </Field>
              </div>
            </section>

            <section className="command-panel">
              <SectionIndex value="02" label="归档与关联" hint="CLASSIFICATION / SERVICE LINK" />
              <div className="space-y-5 p-4 sm:p-5">
                <div>
                  <p className="mb-2 text-xs text-ink-dim">选择频道</p>
                  <div className="flex flex-wrap gap-2">
                    {topics.slice(0, 10).map((item) => (
                      <button key={item} type="button" onClick={() => setTopic(item)} className={cn('press-command min-h-touch border px-3 text-xs transition-command', topic === item ? 'border-primary bg-primary text-onPrimary' : 'border-line bg-surface2/65 text-ink-dim hover:border-primary/40 hover:text-ink')}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="频道归档" hint="也可使用上方快捷选择"><Select value={topic} onChange={(event) => setTopic(event.target.value)}>{topics.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
                  <Field label="关联服务" hint="可选，发布后可直接下单"><Select value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">不关联服务</option>{companions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
                </div>
                <Field label="标签" hint="用逗号分隔，最多 8 个"><TextInput value={tags} onChange={(event) => setTags(event.target.value)} placeholder="新手, 路线, 上分" /></Field>
              </div>
            </section>

            <section className="command-panel">
              <SectionIndex value="03" label="视觉证据" hint="VISUAL EVIDENCE / MAX 06" />
              <div className="p-4 sm:p-5">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = '' }} />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((image, index) => (
                    <div key={image} className="group relative aspect-square overflow-hidden border border-line bg-surface2">
                      <img src={image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute bottom-1 left-1 bg-bg/75 px-1.5 py-0.5 font-data text-[8px] text-white/75">F{String(index + 1).padStart(2, '0')}</span>
                      <button type="button" onClick={() => setImages((current) => current.filter((item) => item !== image))} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center bg-bg/80 text-danger opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="删除图片"><IconTrash size={14} /></button>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={cn('flex aspect-square flex-col items-center justify-center gap-2 border border-dashed border-lineStrong text-ink-faint transition-command hover:border-primary/55 hover:text-primary', uploading && 'opacity-50')}>
                      {uploading ? <span className="font-data text-[9px] tracking-[0.12em]">UPLOADING</span> : <><IconImage size={22} /><span className="text-[11px]">添加图片</span><span className="font-data text-[8px] tracking-[0.1em]">JPG / PNG</span></>}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {error && <div className="border border-danger/30 bg-danger/[0.07] px-4 py-3 text-sm text-danger">{error}</div>}
          </div>

          <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-[76px] lg:self-start">
            <div className="command-panel trace-scan overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div><p className="text-sm font-semibold text-ink">实时预览</p><p className="mt-0.5 font-data text-[9px] tracking-[0.16em] text-ink-faint">LIVE SIGNAL PREVIEW</p></div>
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgb(var(--primary-rgb))]" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center border border-line bg-surface2 font-data text-[11px] text-primary">D1</div>
                  <div><p className="text-xs font-medium text-ink">VOID OPERATOR</p><p className="font-data text-[9px] tracking-[0.1em] text-ink-faint">JUST NOW / {topic || 'GENERAL'}</p></div>
                </div>
                <h2 className="mt-4 text-lg font-semibold leading-7 tracking-[-0.025em] text-ink">{previewTitle}</h2>
                <p className="mt-2 line-clamp-5 text-xs leading-6 text-ink-dim">{previewContent}</p>
                {images[0] && <div className="image-frame mt-4 border border-line"><img src={images[0]} alt="" className="aspect-[16/9] w-full object-cover" /></div>}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="border border-primary/30 bg-primary/[0.06] px-2 py-1 text-[10px] text-primary">{topic}</span>
                  {tags.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3).map((tag) => <span key={tag} className="border border-line px-2 py-1 text-[10px] text-ink-faint">#{tag}</span>)}
                </div>
              </div>
            </div>

            <div className="command-panel">
              <div className="border-b border-line px-4 py-3"><p className="text-sm font-semibold text-ink">发布检查</p><p className="mt-0.5 font-data text-[9px] tracking-[0.16em] text-ink-faint">PRE-FLIGHT CHECKLIST</p></div>
              <div className="divide-y divide-line">
                {checklist.map((item, index) => (
                  <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn('flex h-6 w-6 items-center justify-center border font-data text-[10px]', item.done ? 'border-ok/45 bg-ok/10 text-ok' : 'border-line text-ink-faint')}>{item.done ? 'OK' : String(index + 1).padStart(2, '0')}</span>
                    <span className={cn('text-xs', item.done ? 'text-ink' : 'text-ink-dim')}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-bg/25 px-4 py-3 text-[10px] leading-5 text-ink-faint">提交后进入人工审核。审核通过前不会出现在公共信息流中。</div>
            </div>
          </aside>
        </div>
      </main>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-primary/20 bg-surface/95 shadow-dock backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1180px] items-center justify-between gap-3 px-4 lg:px-8">
          <div className="hidden min-w-0 sm:block"><p className="font-data text-[9px] tracking-[0.14em] text-ink-faint">DRAFT STATUS</p><p className="mt-1 truncate text-xs text-ink-dim">{title.trim() ? title : '尚未填写标题'} · {content.length} 字</p></div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Btn variant="outline" onClick={onCancel}>取消</Btn>
            <Btn disabled={saving || uploading} onClick={() => void submit()}>{saving ? '保存中…' : postId ? '保存并重新送审' : '提交审核'}</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}