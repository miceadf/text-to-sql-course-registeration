import { useEffect, useMemo, useRef, useState } from 'react'
import type { Course } from '../types/course'
import { cn } from '../utils/cn'
import Timetable from './Timetable'

type ChatMessage = {
  id: string
  role: 'user' | 'system'
  text: string
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export default function ChatPopup({
  open,
  onClose,
  allCourses,
  selectedCourses,
  selectedIds,
  onAddCourse,
  onOpenExpandedTimetable,
}: {
  open: boolean
  onClose: () => void
  allCourses: Course[]
  selectedCourses: Course[]
  selectedIds: Set<string>
  onAddCourse: (course: Course) => void
  onOpenExpandedTimetable: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId('sys'),
      role: 'system',
      text: '안녕하세요! 원하는 과목 키워드를 입력하면 검색 결과와 시간표를 보여드릴게요.',
    },
  ])
  const [input, setInput] = useState('')

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      setVisible(false)
      const t = window.setTimeout(() => setMounted(false), 180)
      return () => window.clearTimeout(t)
    }
    setMounted(true)
    const t = window.setTimeout(() => setVisible(true), 10)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mounted, onClose])

  useEffect(() => {
    if (!mounted) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [mounted, messages.length])

  const results = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.text ?? ''
    const q = lastUser.trim().toLowerCase()
    if (!q) return allCourses.slice(0, 5)
    const hits = allCourses.filter((c) => {
      const hay = `${c.id} ${c.name} ${c.professor} ${c.timeText}`.toLowerCase()
      return hay.includes(q) || (q.includes('db') && hay.includes('database'))
    })
    return (hits.length ? hits : allCourses.slice(0, 5)).slice(0, 6)
  }, [allCourses, messages])

  function send() {
    const text = input.trim()
    if (!text) return
    setInput('')

    setMessages((prev) => [
      ...prev,
      { id: makeId('usr'), role: 'user', text },
    ])

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId('sys'),
          role: 'system',
          text: '검색 결과: 데이터베이스 관련 강의 3개를 찾았습니다.',
        },
      ])
    }, 450)
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close assistant"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition duration-200',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="AI Course Assistant"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              AI Course Assistant
            </div>
            <div className="text-xs text-slate-500">
              Course search · timetable preview
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="flex max-h-[76vh] flex-col">
          <div className="px-4 pt-4">
            <div
              ref={scrollRef}
              className="h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex',
                      m.role === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                        m.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-800 ring-1 ring-slate-200',
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send()
                }}
                placeholder="e.g. 데이터베이스, 네트워크, ML..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={send}
                className="h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">
                Course results
              </div>
              <div className="text-xs text-slate-500">
                {results.length} items
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {results.map((c) => {
                const already = selectedIds.has(c.id)
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {c.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {c.timeText}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => onAddCourse(c)}
                      className={cn(
                        'h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition',
                        already
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                      )}
                    >
                      {already ? 'Added' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700">
                Mini timetable
              </div>
              <div className="text-xs text-slate-500">
                {selectedCourses.length} selected
              </div>
            </div>
            <Timetable
              courses={selectedCourses}
              variant="mini"
              onClick={onOpenExpandedTimetable}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

