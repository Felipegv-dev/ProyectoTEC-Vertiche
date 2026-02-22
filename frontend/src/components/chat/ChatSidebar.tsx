import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { cn, truncate } from '@/lib/utils'
import type { ChatSession } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-72 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Conversaciones</h3>
        <button
          onClick={onNewSession}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Nueva conversación"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                No hay conversaciones
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                    activeSessionId === session.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm">
                      {truncate(session.title, 30)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                    className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
