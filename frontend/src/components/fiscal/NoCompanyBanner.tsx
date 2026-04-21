import { Building2 } from 'lucide-react'

export function NoCompanyBanner() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Building2 size={16} className="shrink-0 text-amber-500" />
      Selecione uma empresa no seletor acima para visualizar e operar nesta rotina.
    </div>
  )
}
