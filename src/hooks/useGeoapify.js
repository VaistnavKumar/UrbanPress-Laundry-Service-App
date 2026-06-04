// src/hooks/useGeoapify.js
import { useState, useCallback } from 'react'
import { autocompleteAddress, reverseGeocode } from '../utils/geoapify'

export const useGeoapify = () => {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  const searchAddress = useCallback(async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const results = await autocompleteAddress(text)
      setSuggestions(results)
    } catch (err) {
      console.error('Geoapify autocomplete error:', err)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getLocationFromBrowser = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          try {
            const address = await reverseGeocode(latitude, longitude)
            resolve({ latitude, longitude, address })
          } catch (err) {
            reject(err)
          }
        },
        (err) => reject(err),
        { timeout: 10000 }
      )
    })
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return { suggestions, loading, searchAddress, getLocationFromBrowser, clearSuggestions }
}
