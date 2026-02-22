import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `Venció hace ${Math.abs(diffDays)} días`
  if (diffDays === 0) return 'Vence hoy'
  if (diffDays === 1) return 'Vence mañana'
  if (diffDays <= 30) return `Vence en ${diffDays} días`
  if (diffDays <= 365) return `Vence en ${Math.floor(diffDays / 30)} meses`
  return `Vence en ${Math.floor(diffDays / 365)} años`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    processing_ocr: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    processing_extraction: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    processing_embeddings: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status] || colors.pending
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    processing_ocr: 'Procesando OCR',
    processing_extraction: 'Extrayendo datos',
    processing_embeddings: 'Indexando',
    ready: 'Listo',
    error: 'Error',
  }
  return labels[status] || status
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
