import { Bot, FileSearch, Scale, Calculator, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChatWelcomeProps {
  onSuggestion: (text: string) => void
}

const suggestions = [
  {
    icon: FileSearch,
    text: '¿Cuál es la renta mensual del contrato de Colima?',
  },
  {
    icon: Scale,
    text: '¿Qué cláusulas de penalización tienen mis contratos?',
  },
  {
    icon: Calculator,
    text: '¿Cuánto pago en total de renta mensual?',
  },
  {
    icon: TrendingUp,
    text: '¿Qué contratos vencen en los próximos 6 meses?',
  },
]

export function ChatWelcome({ onSuggestion }: ChatWelcomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4 max-w-lg"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Bot className="h-8 w-8 text-primary" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">
            Asistente de Contratos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Pregúntame sobre tus contratos de arrendamiento. Puedo buscar
            información específica, comparar términos y analizar datos.
          </p>
        </div>

        <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              onClick={() => onSuggestion(suggestion.text)}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <suggestion.icon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
              <span className="text-sm text-foreground">{suggestion.text}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
