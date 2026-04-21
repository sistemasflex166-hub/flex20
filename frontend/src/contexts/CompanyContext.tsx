import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Company } from '@/api/companies'

interface CompanyContextValue {
  company: Company | null
  setCompany: (company: Company | null) => void
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompanyState] = useState<Company | null>(() => {
    try {
      const stored = localStorage.getItem('active_company')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const setCompany = (c: Company | null) => {
    setCompanyState(c)
    if (c) {
      localStorage.setItem('active_company', JSON.stringify(c))
    } else {
      localStorage.removeItem('active_company')
    }
  }

  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
