import { cn } from '@/lib/utils'
import { Bot, User, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import type { ChatMessage as ChatMessageType, ChatSource } from '@/lib/api'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3 px-4 py-4', isUser ? 'justify-end' : '')}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] space-y-2',
          isUser ? 'order-first' : ''
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block h-4 w-1.5 animate-pulse bg-primary ml-0.5" />
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </motion.div>
  )
}

function RelevanceBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  let color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (percentage >= 70) {
    color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  } else if (percentage >= 45) {
    color = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  }

  return (
    <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium', color)}>
      {percentage}%
    </span>
  )
}

function SourceCitations({ sources }: { sources: ChatSource[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          {sources.length} fuente{sources.length !== 1 ? 's' : ''} consultada{sources.length !== 1 ? 's' : ''}
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-2 space-y-2"
        >
          {sources.map((source, i) => (
            <div
              key={i}
              className="rounded-lg bg-muted p-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground truncate">
                  {source.contract_name}
                </p>
                <RelevanceBadge score={source.relevance_score} />
              </div>
              {source.section && source.section !== 'General' && (
                <p className="mt-0.5 text-[10px] font-medium text-primary/70">
                  {source.section}
                </p>
              )}
              <p className="mt-1 text-muted-foreground line-clamp-3">
                {source.chunk_text}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
