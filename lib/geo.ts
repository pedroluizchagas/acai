export type GeoPoint = { lat: number; lng: number }

const OSRM_ENDPOINT = process.env.NEXT_PUBLIC_OSRM_URL || 'https://router.project-osrm.org'
const STORE_COORDS: GeoPoint = {
  lat: Number(process.env.NEXT_PUBLIC_STORE_LAT || -30.0277),
  lng: Number(process.env.NEXT_PUBLIC_STORE_LNG || -51.2287),
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const base = process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
  const url = `${base}/search?format=json&q=${encodeURIComponent(address)}`
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data || data.length === 0) return null
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) }
  } catch {
    return null
  }
}

export async function estimateRouteFromStore(
  destination: GeoPoint,
): Promise<{ distanceKm: number; etaMin: number } | null> {
  try {
    const url = `${OSRM_ENDPOINT}/route/v1/driving/${STORE_COORDS.lng},${STORE_COORDS.lat};${destination.lng},${destination.lat}?overview=false`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) return null
    const distanceKm = route.distance / 1000
    const etaMin = route.duration / 60
    return { distanceKm, etaMin }
  } catch {
    return null
  }
}
