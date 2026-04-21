import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { PrivateRoute } from '@/components/layout/PrivateRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { CompaniesPage } from '@/pages/fiscal/CompaniesPage'
import { FiscalEntriesPage } from '@/pages/fiscal/FiscalEntriesPage'
import { PartnersPage } from '@/pages/fiscal/PartnersPage'
import { ProductsPage } from '@/pages/fiscal/ProductsPage'
import { ServicesPage } from '@/pages/fiscal/ServicesPage'
import { CFOPsPage } from '@/pages/fiscal/CFOPsPage'
import { OperationNaturesPage } from '@/pages/fiscal/OperationNaturesPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/configuracoes/empresas" element={<CompaniesPage />} />
                <Route path="/fiscal/lancamentos" element={<FiscalEntriesPage />} />
                <Route path="/fiscal/clientes-fornecedores" element={<PartnersPage />} />
                <Route path="/fiscal/produtos" element={<ProductsPage />} />
                <Route path="/fiscal/servicos" element={<ServicesPage />} />
                <Route path="/fiscal/cfops" element={<CFOPsPage />} />
                <Route path="/fiscal/natureza-operacao" element={<OperationNaturesPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </CompanyProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
