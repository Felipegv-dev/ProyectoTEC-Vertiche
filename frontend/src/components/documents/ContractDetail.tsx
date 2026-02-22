import { useState, useEffect } from 'react'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { useContractDetail, useContractStatus } from '@/hooks/useContracts'
import {
  ArrowLeft,
  Download,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  User,
  Ruler,
  TrendingUp,
  Shield,
  FileText,
  Eye,
  Table,
} from 'lucide-react'
import { contractsApi } from '@/lib/api'
import { motion } from 'framer-motion'

interface ContractDetailProps {
  contractId: string
  onBack: () => void
}

type ViewTab = 'metadata' | 'preview'

export function ContractDetail({ contractId, onBack }: ContractDetailProps) {
  const { contract, loading, error } = useContractDetail(contractId)
  const pollingStatus = useContractStatus(
    contractId,
    !!contract && contract.status !== 'ready' && contract.status !== 'error'
  )
  const [activeTab, setActiveTab] = useState<ViewTab>('metadata')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const currentStatus = contract?.status === 'ready' || contract?.status === 'error'
    ? contract.status
    : pollingStatus

  useEffect(() => {
    if (activeTab === 'preview' && !pdfUrl && !pdfLoading) {
      setPdfLoading(true)
      contractsApi
        .getDownloadUrl(contractId)
        .then(({ url }) => setPdfUrl(url))
        .catch(() => {})
        .finally(() => setPdfLoading(false))
    }
  }, [activeTab, contractId, pdfUrl, pdfLoading])

  const handleDownload = async () => {
    try {
      const { url } = await contractsApi.getDownloadUrl(contractId)
      window.open(url, '_blank')
    } catch {
      // handle error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="py-16 text-center">
        <p className="text-destructive">{error || 'Contrato no encontrado'}</p>
        <button onClick={onBack} className="mt-4 text-sm text-primary hover:underline">
          Volver
        </button>
      </div>
    )
  }

  const meta = contract.metadata

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {contract.file_name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(currentStatus)}`}
              >
                {getStatusLabel(currentStatus)}
              </span>
              <span className="text-sm text-muted-foreground">
                Subido {formatDate(contract.created_at)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Descargar
        </button>
      </div>

      {/* Processing indicator */}
      {currentStatus !== 'ready' && currentStatus !== 'error' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <div>
              <p className="font-medium text-foreground">Procesando contrato...</p>
              <p className="text-sm text-muted-foreground">
                {getStatusLabel(currentStatus)} - esto puede tomar unos minutos
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width:
                  currentStatus === 'processing_ocr'
                    ? '33%'
                    : currentStatus === 'processing_extraction'
                      ? '66%'
                      : currentStatus === 'processing_embeddings'
                        ? '90%'
                        : '10%',
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'metadata'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Table className="h-4 w-4" />
          Datos Extraídos
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'preview'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="h-4 w-4" />
          Vista Previa PDF
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'metadata' && meta && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetaCard icon={User} label="Arrendador" value={meta.arrendador} />
          <MetaCard icon={Building} label="Arrendatario" value={meta.arrendatario} />
          <MetaCard
            icon={MapPin}
            label="Dirección"
            value={[meta.direccion, meta.ciudad, meta.estado]
              .filter(Boolean)
              .join(', ')}
          />
          <MetaCard
            icon={Ruler}
            label="Metros cuadrados"
            value={meta.metros_cuadrados ? `${meta.metros_cuadrados} m²` : null}
          />
          <MetaCard
            icon={Calendar}
            label="Vigencia"
            value={
              meta.fecha_inicio && meta.fecha_vencimiento
                ? `${formatDate(meta.fecha_inicio)} - ${formatDate(meta.fecha_vencimiento)}`
                : null
            }
          />
          <MetaCard
            icon={DollarSign}
            label="Renta mensual"
            value={meta.renta_mensual ? formatCurrency(meta.renta_mensual) : null}
          />
          <MetaCard
            icon={TrendingUp}
            label="Incremento anual"
            value={meta.incremento_anual ? `${meta.incremento_anual}%` : null}
          />
          <MetaCard
            icon={DollarSign}
            label="Depósito en garantía"
            value={meta.deposito_garantia ? formatCurrency(meta.deposito_garantia) : null}
          />
          <MetaCard icon={Shield} label="Uso permitido" value={meta.uso_permitido} />
          <MetaCard icon={FileText} label="Cláusula de renovación" value={meta.clausula_renovacion} />
          <MetaCard icon={FileText} label="Penalización por terminación" value={meta.penalizacion_terminacion_anticipada} />
          <MetaCard icon={FileText} label="Notas adicionales" value={meta.notas_adicionales} />
        </div>
      )}

      {activeTab === 'metadata' && !meta && currentStatus === 'ready' && (
        <div className="flex flex-col items-center py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron datos extraídos</p>
        </div>
      )}

      {activeTab === 'preview' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {pdfLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Cargando PDF...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full border-0"
              style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}
              title={`Vista previa de ${contract.file_name}`}
            />
          ) : (
            <div className="flex flex-col items-center py-32 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No se pudo cargar la vista previa</p>
              <button
                onClick={() => { setPdfUrl(null); setPdfLoading(false) }}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText
  label: string
  value: string | null | undefined
}) {
  if (!value) return null

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className="text-sm font-medium text-card-foreground">{value}</p>
    </div>
  )
}
