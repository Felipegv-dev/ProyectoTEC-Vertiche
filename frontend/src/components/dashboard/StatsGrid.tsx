import { FileText, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { DashboardStats } from '@/lib/api'

interface StatsGridProps {
  stats: DashboardStats | null
  loading: boolean
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
  const cards = [
    {
      label: 'Total Contratos',
      value: stats?.total_contracts ?? 0,
      icon: FileText,
      color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Contratos Activos',
      value: stats?.active_contracts ?? 0,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Por Vencer (90 días)',
      value: stats?.expiring_soon ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
      format: (v: number) => v.toString(),
    },
    {
      label: 'Renta Mensual Total',
      value: stats?.total_monthly_rent ?? 0,
      icon: DollarSign,
      color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
      format: (v: number) => formatCurrency(v),
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-card-foreground">
            {card.format(card.value)}
          </p>
        </motion.div>
      ))}
    </div>
  )
}
