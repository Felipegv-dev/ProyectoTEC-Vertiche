import { useState, useMemo, useCallback } from 'react'
import { UploadZone } from '@/components/documents/UploadZone'
import { ContractTable } from '@/components/documents/ContractTable'
import { ContractDetail } from '@/components/documents/ContractDetail'
import { useContracts, useContractUpload } from '@/hooks/useContracts'
import { contractsApi } from '@/lib/api'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'

export function DocumentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [viewingId, setViewingId] = useState<string | null>(null)
  const pageSize = 10

  const params = useMemo(() => {
    const p: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    }
    if (search) p.search = search
    return p
  }, [page, search])

  const { data, loading, refetch } = useContracts(params)
  const { upload, uploading, error: uploadError } = useContractUpload()

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        await upload(file)
        refetch()
      } catch {
        // error handled in hook
      }
    },
    [upload, refetch]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('¿Eliminar este contrato?')) return
      try {
        await contractsApi.delete(id)
        refetch()
      } catch {
        // handle error
      }
    },
    [refetch]
  )

  if (viewingId) {
    return (
      <div className="p-6">
        <ContractDetail
          contractId={viewingId}
          onBack={() => {
            setViewingId(null)
            refetch()
          }}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tus contratos de arrendamiento
        </p>
      </div>

      {/* Upload */}
      <UploadZone
        onUpload={handleUpload}
        uploading={uploading}
        error={uploadError}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar contratos..."
          className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : (
        <ContractTable
          contracts={data?.contracts || []}
          total={data?.total || 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onView={setViewingId}
          onDelete={handleDelete}
        />
      )}
    </motion.div>
  )
}
