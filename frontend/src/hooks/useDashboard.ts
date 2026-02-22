import { useState, useEffect } from 'react'
import { dashboardApi } from '@/lib/api'
import type {
  DashboardStats,
  ExpiringContract,
  DashboardAlert,
  RentAnalytics,
  TimelineEntry,
} from '@/lib/api'

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { stats, loading }
}

export function useExpiringContracts() {
  const [contracts, setContracts] = useState<ExpiringContract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getExpiring()
      .then(setContracts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { contracts, loading }
}

export function useDashboardAlerts() {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getAlerts()
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { alerts, loading }
}

export function useRentAnalytics() {
  const [data, setData] = useState<RentAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getRentAnalytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

export function useTimeline() {
  const [data, setData] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getTimeline()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
