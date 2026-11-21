import { useEffect, useMemo, useRef, useState } from 'react'
import ChevronDown from '@/components/common/icons/ChevronDown'

export type Option = { id: string | number; label: string }

type Props = {
  options: Option[]
  value: string
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  searchPlaceholder?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select',
  disabled = false,
  className = '',
  searchPlaceholder = 'Search...'
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const selected = useMemo(() => options.find((o) => String(o.id) === String(value)), [options, value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`h-11 w-full rounded-md border pr-8 px-3 text-left text-sm focus:border-blue-500 focus:outline-none ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} border-gray-300 relative`}
      >
        {selected ? selected.label : <span className="text-gray-400">{placeholder}</span>}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">No results</div>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={String(o.id)}
                onClick={() => {
                  onChange(String(o.id))
                  setOpen(false)
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${String(o.id) === String(value) ? 'bg-gray-50' : ''}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
