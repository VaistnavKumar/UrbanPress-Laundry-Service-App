// src/utils/geoapify.js
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY

/**
 * Returns true if the API key is configured
 */
export const isGeoapifyReady = () => Boolean(GEOAPIFY_KEY && GEOAPIFY_KEY !== 'your_geoapify_api_key_here')

/**
 * Reverse geocode: lat/lng → human-readable address
 */
export const reverseGeocode = async (lat, lon) => {
  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  const props = data.features?.[0]?.properties
  if (!props) return 'Unknown location'
  return `${props.address_line1}, ${props.city} - ${props.postcode}`
}

/**
 * Forward geocode: address string → lat/lng
 */
export const forwardGeocode = async (address) => {
  const encoded = encodeURIComponent(address)
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&apiKey=${GEOAPIFY_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  const coords = data.features?.[0]?.geometry?.coordinates
  if (!coords) return null
  return { longitude: coords[0], latitude: coords[1] }
}

/**
 * Address Autocomplete: partial text → suggestions[]
 */
export const autocompleteAddress = async (text) => {
  if (text.length < 3) return []
  const encoded = encodeURIComponent(text)
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encoded}&filter=countrycode:in&limit=5&apiKey=${GEOAPIFY_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  return data.features?.map(f => ({
    label: f.properties.formatted,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  })) || []
}

/**
 * Show static map image for an address (no JS map needed)
 * Returns an <img> src URL
 */
export const staticMapUrl = (lat, lon, zoom = 15) => {
  // Ensure numbers (not strings) to prevent malformed URLs
  const la = parseFloat(lat)
  const lo = parseFloat(lon)
  if (isNaN(la) || isNaN(lo)) return ''
  return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=400&height=200&center=lonlat:${lo},${la}&zoom=${zoom}&marker=lonlat:${lo},${la};color:%23ff3b30;size:large&apiKey=${GEOAPIFY_KEY}`
}
