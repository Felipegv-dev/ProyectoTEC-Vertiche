import { useEffect, useRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ChatWelcome } from './ChatWelcome'
import type { ChatMessage as ChatMessageType } from '@/lib/api'

interface ChatWindowProps {
  messages: ChatMessageType[]
  loading: boolean
  streaming: boolean
  onSendMessage: (content: string) => void
  onStopStreaming: () => void
}

export function ChatWindow({
  messages,
  loading,
  streaming,
  onSendMessage,
  onStopStreaming,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !loading ? (
          <ChatWelcome onSuggestion={onSendMessage} />
        ) : (
          <div className="mx-auto max-w-3xl py-4">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={
                  streaming &&
                  i === messages.length - 1 &&
                  msg.role === 'assistant'
                }
              />
            ))}
            {loading && (
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
                <span className="text-sm text-muted-foreground">
                  Cargando mensajes...
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSendMessage}
        onStop={onStopStreaming}
        streaming={streaming}
      />
    </div>
  )
}
