import { useState, useRef, useEffect } from 'react'
import type { PlanoContas } from '@/api/contabilidade'

interface Props {
  contas: PlanoContas[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ContaSearch({ contas, value, onChange, placeholder = 'Código reduzido ou descrição', disabled }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = contas.find(c => String(c.id) === value)

  useEffect(() => {
    setQuery(selected ? `${selected.codigo_reduzido ?? selected.classificacao} — ${selected.descricao}` : '')
  }, [value, contas])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = query.length < 1 ? contas : contas.filter(c => {
    const q = query.toLowerCase()
    return (
      c.descricao.toLowerCase().includes(q) ||
      c.classificacao.toLowerCase().includes(q) ||
      (c.codigo_reduzido ?? '').toLowerCase().includes(q)
    )
  })

  function handleSelect(c: PlanoContas) {
    onChange(String(c.id))
    setQuery(`${c.codigo_reduzido ?? c.classificacao} — ${c.descricao}`)
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="input pr-8 disabled:bg-gray-50"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >✕</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.slice(0, 50).map(c => (
            <li
              key={c.id}
              onMouseDown={() => handleSelect(c)}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-brand-50"
            >
              <span className="w-14 shrink-0 font-mono text-xs text-gray-400">
                {c.codigo_reduzido ?? c.classificacao}
              </span>
              <span className="truncate text-gray-800">{c.descricao}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
