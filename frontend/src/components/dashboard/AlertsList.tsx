import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { DashboardAlert } from '@/lib/api'

interface AlertsListProps {
  alerts: DashboardAlert[]
  loading: boolean
}

const severityConfig = {
  critical: {
    icon: XCircle,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    border: 'border-l-red-500',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    border: 'border-l-orange-500',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
    border: 'border-l-amber-500',
  },
  low: {
    icon: Info,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    border: 'border-l-blue-500',
  },
}

export function AlertsList({ alerts, loading }: AlertsListProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-muted mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-muted mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">
        Alertas Activas
      </h3>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Info className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Sin alertas activas</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {alerts.map((alert, i) => {
            const config = severityConfig[alert.severity] || severityConfig.low
            const Icon = config.icon
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex items-start gap-3 rounded-lg border border-border border-l-4 p-3',
                  config.border
                )}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {alert.contract_name} · {formatDate(alert.alert_date)}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
