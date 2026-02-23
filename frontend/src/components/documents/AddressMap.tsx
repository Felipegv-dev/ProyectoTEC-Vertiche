import { useState, useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon (Leaflet + bundlers issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

interface AddressMapProps {
  address: string
}

export function AddressMap({ address }: AddressMapProps) {
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!address) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    // Build fallback queries: full address → simplified → city/state only
    const parts = address.split(',').map((p) => p.trim())
    const queries = [
      address,
      // Remove specific details like "No.", "LOCAL", "COLONIA" for a cleaner search
      address.replace(/\b(No\.|NUM\.?|LOCAL|COLONIA|COL\.?|INT\.?|EXT\.?|MZA\.?|LT\.?)\s*/gi, ''),
      // Last 2 parts (usually city + state)
      parts.length >= 2 ? parts.slice(-2).join(', ') : null,
    ].filter((q): q is string => q !== null)

    async function geocode() {
      for (const query of queries) {
        try {
          const encoded = encodeURIComponent(query)
          const url = `/nominatim/search?format=json&q=${encoded}&limit=1`
          console.log('[AddressMap] Trying:', query)
          const res = await fetch(url)
          const data = await res.json()
          if (data && data.length > 0) {
            console.log('[AddressMap] Found:', data[0].display_name)
            setCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)])
            return
          }
        } catch {
          // try next query
        }
      }
      console.log('[AddressMap] No results for any query')
      setError(true)
    }

    geocode().finally(() => setLoading(false))
  }, [address])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px] rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">Cargando mapa...</span>
        </div>
      </div>
    )
  }

  if (error || !coords) {
    return null
  }

  return (
    <div className="h-[200px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={coords}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coords}>
          <Popup>{address}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
