import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  streaming?: boolean
}

export function ChatInput({ onSend, onStop, disabled, streaming }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  const handleSubmit = () => {
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre tus contratos..."
            disabled={disabled || streaming}
            rows={1}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>

        {streaming ? (
          <button
            onClick={onStop}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            title="Detener"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
