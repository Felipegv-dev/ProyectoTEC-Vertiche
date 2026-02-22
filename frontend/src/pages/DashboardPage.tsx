import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { ExpirationTimeline } from '@/components/dashboard/ExpirationTimeline'
import { RentChart } from '@/components/dashboard/RentChart'
import { AlertsList } from '@/components/dashboard/AlertsList'
import {
  useDashboardStats,
  useDashboardAlerts,
  useRentAnalytics,
  useTimeline,
  useExpiringContracts,
} from '@/hooks/useDashboard'
import { formatDate, formatCurrency, formatRelativeDate } from '@/lib/utils'
import { Clock, MapPin, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

export function DashboardPage() {
  const { stats, loading: statsLoading } = useDashboardStats()
  const { alerts, loading: alertsLoading } = useDashboardAlerts()
  const { data: rentData, loading: rentLoading } = useRentAnalytics()
  const { data: timelineData, loading: timelineLoading } = useTimeline()
  const { contracts: expiringContracts, loading: expiringLoading } =
    useExpiringContracts()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de tus contratos de arrendamiento
        </p>
      </div>

      <StatsGrid stats={stats} loading={statsLoading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpirationTimeline data={timelineData} loading={timelineLoading} />
        <RentChart data={rentData} loading={rentLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsList alerts={alerts} loading={alertsLoading} />

        {/* Expiring soon */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-card-foreground mb-4">
            Próximos Vencimientos
          </h3>
          {expiringLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : expiringContracts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Sin contratos por vencer
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {expiringContracts.map((contract, i) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {contract.arrendatario || contract.file_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeDate(contract.fecha_vencimiento)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(contract.renta_mensual)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(contract.fecha_vencimiento)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
