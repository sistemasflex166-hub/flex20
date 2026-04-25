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
import { NfeImportPage } from '@/pages/fiscal/NfeImportPage'
import { CfopMappingPage } from '@/pages/fiscal/CfopMappingPage'
import { PlanoContasPage } from '@/pages/contabilidade/PlanoContasPage'
import { LancamentosContabeisPage } from '@/pages/contabilidade/LancamentosContabeisPage'
import { CentroCustoPage } from '@/pages/contabilidade/CentroCustoPage'
import { HistoricoPadraoPage } from '@/pages/contabilidade/HistoricoPadraoPage'
import { ContaBancariaPage } from '@/pages/contabilidade/ContaBancariaPage'
import { SaldoInicialPage } from '@/pages/contabilidade/SaldoInicialPage'
import { BalancetePage } from '@/pages/contabilidade/BalancetePage'
import { RazaoPage } from '@/pages/contabilidade/RazaoPage'
import { FuncionariosPage } from '@/pages/folha/FuncionariosPage'
import { CargosPage } from '@/pages/folha/CargosPage'
import { DepartamentosPage } from '@/pages/folha/DepartamentosPage'
import { SindicatosPage } from '@/pages/folha/SindicatosPage'
import { EventosPage } from '@/pages/folha/EventosPage'

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
                <Route path="/fiscal/importar-nfe" element={<NfeImportPage />} />
                <Route path="/fiscal/mapeamento-cfop" element={<CfopMappingPage />} />
                <Route path="/contabilidade/plano-contas" element={<PlanoContasPage />} />
                <Route path="/contabilidade/lancamentos" element={<LancamentosContabeisPage />} />
                <Route path="/contabilidade/centros-custo" element={<CentroCustoPage />} />
                <Route path="/contabilidade/historicos-padrao" element={<HistoricoPadraoPage />} />
                <Route path="/contabilidade/contas-bancarias" element={<ContaBancariaPage />} />
                <Route path="/contabilidade/saldos-iniciais" element={<SaldoInicialPage />} />
                <Route path="/contabilidade/balancete" element={<BalancetePage />} />
                <Route path="/contabilidade/razao" element={<RazaoPage />} />
                <Route path="/folha/funcionarios" element={<FuncionariosPage />} />
                <Route path="/folha/cargos" element={<CargosPage />} />
                <Route path="/folha/departamentos" element={<DepartamentosPage />} />
                <Route path="/folha/sindicatos" element={<SindicatosPage />} />
                <Route path="/folha/eventos" element={<EventosPage />} />
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
