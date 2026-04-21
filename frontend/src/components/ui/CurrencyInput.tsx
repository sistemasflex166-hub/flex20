import { forwardRef, useEffect, useRef, useState } from 'react'

interface CurrencyInputProps {
  value?: number
  onChange?: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

function formatDisplay(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value = 0, onChange, className, placeholder = '0,00', disabled }, ref) => {
    const [display, setDisplay] = useState(() => formatDisplay(Math.round((value ?? 0) * 100)))
    const internalRef = useRef<HTMLInputElement>(null)
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? internalRef

    useEffect(() => {
      setDisplay(formatDisplay(Math.round((value ?? 0) * 100)))
    }, [value])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, '')
      const cents = parseInt(raw || '0', 10)
      setDisplay(formatDisplay(cents))
      onChange?.(cents / 100)
    }

    return (
      <input
        ref={resolvedRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
