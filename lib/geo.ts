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

export async function routeGeometryFromStore(
  destination: GeoPoint,
): Promise<Array<GeoPoint> | null> {
  try {
    const url = `${OSRM_ENDPOINT}/route/v1/driving/${STORE_COORDS.lng},${STORE_COORDS.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const coords: Array<[number, number]> | undefined = data?.routes?.[0]?.geometry?.coordinates
    if (!coords || !Array.isArray(coords)) return null
    return coords.map(([lng, lat]) => ({ lat, lng }))
  } catch {
    return null
  }
}

function toMeters(point: GeoPoint): { x: number; y: number } {
  const latRad = (point.lat * Math.PI) / 180
  const x = point.lng * 111320 * Math.cos(latRad)
  const y = point.lat * 111320
  return { x, y }
}

function distPointToSegmentMeters(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const P = toMeters(p)
  const A = toMeters(a)
  const B = toMeters(b)
  const ABx = B.x - A.x
  const ABy = B.y - A.y
  const APx = P.x - A.x
  const APy = P.y - A.y
  const ab2 = ABx * ABx + ABy * ABy
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (APx * ABx + APy * ABy) / ab2))
  const Cx = A.x + t * ABx
  const Cy = A.y + t * ABy
  const dx = P.x - Cx
  const dy = P.y - Cy
  return Math.sqrt(dx * dx + dy * dy)
}

export function minDistanceToPolylineMeters(point: GeoPoint, polyline: Array<GeoPoint>): number | null {
  if (!polyline || polyline.length < 2) return null
  let min = Infinity
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distPointToSegmentMeters(point, polyline[i], polyline[i + 1])
    if (d < min) min = d
  }
  return isFinite(min) ? min : null
}
