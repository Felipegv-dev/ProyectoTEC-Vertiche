import { supabase } from './supabase'

const API_BASE = '/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No authenticated session')
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || `API error: ${res.status}`)
  }

  return res.json()
}

// Contracts
export const contractsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<ContractListResponse>(`/contracts${qs}`)
  },
  get: (id: string) => request<ContractDetail>(`/contracts/${id}`),
  getStatus: (id: string) => request<{ status: string }>(`/contracts/${id}/status`),
  getDownloadUrl: (id: string) => request<{ url: string }>(`/contracts/${id}/download-url`),
  delete: (id: string) => request<void>(`/contracts/${id}`, { method: 'DELETE' }),
  upload: async (file: File) => {
    const headers = await getAuthHeaders()
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/contracts/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail || 'Upload failed')
    }
    return res.json()
  },
}

// Chat
export const chatApi = {
  getSessions: () => request<ChatSession[]>('/chat/sessions'),
  createSession: (title: string, contractIds: string[]) =>
    request<ChatSession>('/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, contract_ids: contractIds }),
    }),
  getMessages: (sessionId: string) =>
    request<ChatMessage[]>(`/chat/sessions/${sessionId}`),
  deleteSession: (sessionId: string) =>
    request<void>(`/chat/sessions/${sessionId}`, { method: 'DELETE' }),
  sendMessage: async (sessionId: string, content: string) => {
    const headers = await getAuthHeaders()
    return fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
  },
}

// Dashboard
export const dashboardApi = {
  getStats: () => request<DashboardStats>('/dashboard/stats'),
  getExpiring: () => request<ExpiringContract[]>('/dashboard/expiring'),
  getAlerts: () => request<DashboardAlert[]>('/dashboard/alerts'),
  getRentAnalytics: () => request<RentAnalytics[]>('/dashboard/rent-analytics'),
  getTimeline: () => request<TimelineEntry[]>('/dashboard/timeline'),
}

// Types
export interface ContractListResponse {
  contracts: Contract[]
  total: number
  page: number
  page_size: number
}

export interface Contract {
  id: string
  file_name: string
  status: string
  created_at: string
  updated_at: string
}

export interface ContractMetadata {
  arrendador: string | null
  arrendatario: string | null
  direccion: string | null
  ciudad: string | null
  estado: string | null
  codigo_postal: string | null
  metros_cuadrados: number | null
  fecha_inicio: string | null
  fecha_vencimiento: string | null
  duracion_meses: number | null
  renta_mensual: number | null
  incremento_anual: number | null
  deposito_garantia: number | null
  moneda: string | null
  uso_permitido: string | null
  clausula_renovacion: string | null
  penalizacion_terminacion_anticipada: string | null
  mantenimiento_responsable: string | null
  seguros_requeridos: string | null
  fiador: string | null
  notas_adicionales: string | null
}

export interface ContractDetail extends Contract {
  s3_key: string
  metadata: ContractMetadata | null
}

export interface ChatSession {
  id: string
  title: string
  contract_ids: string[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources: ChatSource[] | null
  created_at: string
}

export interface ChatSource {
  contract_id: string
  contract_name: string
  chunk_text: string
  relevance_score: number
}

export interface DashboardStats {
  total_contracts: number
  active_contracts: number
  expiring_soon: number
  total_monthly_rent: number
  avg_rent_per_sqm: number
}

export interface ExpiringContract {
  id: string
  file_name: string
  arrendatario: string
  fecha_vencimiento: string
  renta_mensual: number
  days_until_expiry: number
}

export interface DashboardAlert {
  id: string
  contract_id: string
  contract_name: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  alert_date: string
}

export interface RentAnalytics {
  estado: string
  avg_rent_per_sqm: number
  total_rent: number
  contract_count: number
}

export interface TimelineEntry {
  month: string
  count: number
  contracts: string[]
}
