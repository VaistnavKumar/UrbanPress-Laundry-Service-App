// src/components/AddressAutocomplete.jsx
import { useState, useRef, useEffect } from 'react'
import { useGeoapify } from '../hooks/useGeoapify'
import { MapPin, Loader2, Search, X } from 'lucide-react'

export default function AddressAutocomplete({ onSelect, placeholder = 'Search your address...', defaultValue = '' }) {
  const [query, setQuery] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const { suggestions, loading, searchAddress, clearSuggestions } = useGeoapify()
  const containerRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        searchAddress(query)
        setOpen(true)
      } else {
        clearSuggestions()
        setOpen(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (s) => {
    setQuery(s.label)
    setOpen(false)
    clearSuggestions()
    onSelect(s)
  }

  const handleClear = () => {
    setQuery('')
    clearSuggestions()
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-slate-200 bg-slate-50 rounded-xl pl-9 pr-10 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-all"
        />
        {loading ? (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary animate-spin" />
        ) : query.length > 0 ? (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 mt-1 overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 px-4 py-3 text-sm cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
              onClick={() => handleSelect(s)}
            >
              <MapPin size={14} className="text-brand-primary mt-0.5 shrink-0" />
              <span className="text-gray-700 leading-snug">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
