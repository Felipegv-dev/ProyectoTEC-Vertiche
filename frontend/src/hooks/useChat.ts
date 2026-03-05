import { useState, useEffect, useCallback, useRef } from 'react'
import { chatApi } from '@/lib/api'
import type { ChatSession, ChatMessage } from '@/lib/api'

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await chatApi.getSessions()
      setSessions(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createSession = useCallback(
    async (title: string, contractIds: string[]) => {
      const session = await chatApi.createSession(title, contractIds)
      setSessions((prev) => [session, ...prev])
      return session
    },
    []
  )

  const deleteSession = useCallback(async (id: string) => {
    await chatApi.deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const updateSessionTitle = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    )
  }, [])

  return { sessions, loading, refetch: fetch, createSession, deleteSession, updateSessionTitle }
}

export function useChatMessages(
  sessionId: string | null,
  onTitleUpdate?: (sessionId: string, title: string) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }
    setLoading(true)
    chatApi
      .getMessages(sessionId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || streaming) return

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        role: 'user',
        content,
        sources: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Start streaming
      setStreaming(true)
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: '',
        sources: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      try {
        const response = await chatApi.sendMessage(sessionId, content)
        if (!response.ok) throw new Error('Failed to send message')
        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''
        let sources: Array<{ contract_id: string; contract_name: string; section: string; chunk_text: string; relevance_score: number }> | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'token') {
                  fullContent += parsed.content
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: fullContent,
                      }
                    }
                    return updated
                  })
                } else if (parsed.type === 'sources') {
                  sources = parsed.sources
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        sources,
                      }
                    }
                    return updated
                  })
                } else if (parsed.type === 'title') {
                  // Update session title in sidebar
                  onTitleUpdate?.(sessionId, parsed.title)
                } else if (parsed.type === 'done') {
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        id: parsed.message_id || last.id,
                      }
                    }
                    return updated
                  })
                }
              } catch {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: 'Error al generar respuesta. Intenta de nuevo.',
            }
          }
          return updated
        })
      } finally {
        setStreaming(false)
      }
    },
    [sessionId, streaming, onTitleUpdate]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  return { messages, loading, streaming, sendMessage, stopStreaming }
}
