import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TimelineEntry } from '@/lib/api'

interface ExpirationTimelineProps {
  data: TimelineEntry[]
  loading: boolean
}

export function ExpirationTimeline({ data, loading }: ExpirationTimelineProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="h-4 w-48 animate-pulse rounded bg-muted mb-4" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">
        Vencimientos por Mes
      </h3>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Sin datos de vencimiento
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
              name="Contratos"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
