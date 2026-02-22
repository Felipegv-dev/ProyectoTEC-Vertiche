import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { RentAnalytics } from '@/lib/api'

interface RentChartProps {
  data: RentAnalytics[]
  loading: boolean
}

export function RentChart({ data, loading }: RentChartProps) {
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
        Renta Promedio por m² por Estado
      </h3>
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Sin datos de renta
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
              tickFormatter={(v) => `$${v}`}
            />
            <YAxis
              dataKey="estado"
              type="category"
              width={100}
              tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            />
            <Tooltip
              formatter={(value) => [
                formatCurrency(value as number) + '/m²',
                'Renta promedio',
              ]}
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="avg_rent_per_sqm"
              fill="#8b5cf6"
              radius={[0, 4, 4, 0]}
              name="Renta/m²"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
