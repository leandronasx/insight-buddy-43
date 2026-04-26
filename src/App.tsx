import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { MonthProvider } from "@/contexts/MonthContext";
import Index from "./pages/Index.tsx";
import LeadsPage from "./pages/LeadsPage.tsx";
import VendasPage from "./pages/VendasPage.tsx";
import SetupPage from "./pages/SetupPage.tsx";
import MinhaEmpresaPage from "./pages/MinhaEmpresaPage.tsx";
import AdminEmpresasPage from "./pages/AdminEmpresasPage.tsx";
import KanbanPage from "./pages/KanbanPage.tsx";
import AgendaPage from "./pages/AgendaPage.tsx";
import WhatsappPage from "./pages/WhatsappPage.tsx";
import AutomacoesPage from "./pages/AutomacoesPage.tsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MonthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/kanban" element={<KanbanPage />} />
              <Route path="/vendas" element={<VendasPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/whatsapp" element={<WhatsappPage />} />
              <Route path="/automacoes" element={<AutomacoesPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/minha-empresa" element={<MinhaEmpresaPage />} />
              <Route path="/admin" element={<AdminEmpresasPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </MonthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;