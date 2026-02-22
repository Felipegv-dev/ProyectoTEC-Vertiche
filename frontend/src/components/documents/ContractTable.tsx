import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { FileText, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Contract } from '@/lib/api'

interface ContractTableProps {
  contracts: Contract[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onView: (id: string) => void
  onDelete: (id: string) => void
}

export function ContractTable({
  contracts,
  total,
  page,
  pageSize,
  onPageChange,
  onView,
  onDelete,
}: ContractTableProps) {
  const totalPages = Math.ceil(total / pageSize)

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium text-foreground">
          No hay contratos
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube un PDF para comenzar
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Archivo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Fecha
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contracts.map((contract, i) => (
              <motion.tr
                key={contract.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-xs">
                      {contract.file_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(contract.status)}`}
                  >
                    {getStatusLabel(contract.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(contract.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(contract.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(contract.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium text-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
