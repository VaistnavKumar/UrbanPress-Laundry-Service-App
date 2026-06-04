// src/components/StarRating.jsx
import { useState } from 'react'
import { Star } from 'lucide-react'

export default function StarRating({ value = 0, onChange, size = 32, readOnly = false }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value)
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={`transition-all duration-150 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={`transition-colors duration-150 ${
                filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-gray-300'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
