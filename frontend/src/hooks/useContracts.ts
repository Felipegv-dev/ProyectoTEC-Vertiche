import { useState, useEffect, useCallback } from 'react'
import { contractsApi } from '@/lib/api'
import type { Contract, ContractDetail, ContractListResponse } from '@/lib/api'

export function useContracts(params?: Record<string, string>) {
  const [data, setData] = useState<ContractListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await contractsApi.list(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading contracts')
    } finally {
      setLoading(false)
    }
  }, [params ? JSON.stringify(params) : ''])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useContractDetail(id: string | undefined) {
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    contractsApi
      .get(id)
      .then(setContract)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false))
  }, [id])

  return { contract, loading, error }
}

export function useContractStatus(id: string | undefined, enabled: boolean) {
  const [status, setStatus] = useState<string>('pending')

  useEffect(() => {
    if (!id || !enabled) return

    const interval = setInterval(async () => {
      try {
        const result = await contractsApi.getStatus(id)
        setStatus(result.status)
        if (result.status === 'ready' || result.status === 'error') {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [id, enabled])

  return status
}

export function useContractUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const result = await contractsApi.upload(file)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      throw err
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, error }
}
