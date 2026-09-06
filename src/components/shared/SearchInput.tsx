import { Search, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  debounceMs?: number
  className?: string
}

export default function SearchInput({
  placeholder = 'Search...',
  value: externalValue,
  onChange,
  debounceMs = 300,
  className = '',
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(externalValue || '')

  useEffect(() => {
    if (externalValue !== undefined) {
      setLocalValue(externalValue)
    }
  }, [externalValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs, onChange])

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('')
            onChange('')
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
