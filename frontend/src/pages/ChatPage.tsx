import { useState, useCallback } from 'react'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useChatSessions, useChatMessages } from '@/hooks/useChat'
import { motion } from 'framer-motion'

export function ChatPage() {
  const {
    sessions,
    loading: sessionsLoading,
    createSession,
    deleteSession,
  } = useChatSessions()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const {
    messages,
    loading: messagesLoading,
    streaming,
    sendMessage,
    stopStreaming,
  } = useChatMessages(activeSessionId)

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession('Nueva conversación', [])
      setActiveSessionId(session.id)
    } catch {
      // handle error
    }
  }, [createSession])

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id)
      if (activeSessionId === id) {
        setActiveSessionId(null)
      }
    },
    [deleteSession, activeSessionId]
  )

  const handleSendMessage = useCallback(
    async (content: string) => {
      // Auto-create session if none selected
      if (!activeSessionId) {
        try {
          const session = await createSession(
            content.slice(0, 50),
            []
          )
          setActiveSessionId(session.id)
          // Small delay to let state update
          setTimeout(() => sendMessage(content), 100)
        } catch {
          // handle error
        }
        return
      }
      sendMessage(content)
    },
    [activeSessionId, createSession, sendMessage]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full"
    >
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />
      <div className="flex-1">
        <ChatWindow
          messages={messages}
          loading={messagesLoading}
          streaming={streaming}
          onSendMessage={handleSendMessage}
          onStopStreaming={stopStreaming}
        />
      </div>
    </motion.div>
  )
}
