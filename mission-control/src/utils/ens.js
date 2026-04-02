// Simple ENS reverse lookup with in-memory cache
const cache = new Map()

export async function resolveEns(address) {
  if (!address || address === 'unassigned') return null
  const key = address.toLowerCase()
  if (cache.has(key)) return cache.get(key)

  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${key}`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) { cache.set(key, null); return null }
    const data = await res.json()
    const name = data.name || null
    cache.set(key, name)
    return name
  } catch {
    cache.set(key, null)
    return null
  }
}

export function shortAddr(address) {
  if (!address) return '—'
  return address.slice(0, 6) + '...' + address.slice(-4)
}
