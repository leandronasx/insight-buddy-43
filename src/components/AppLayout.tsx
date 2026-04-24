import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingCart, Settings, LogOut,
  Menu, X, Building2, Shield, KanbanSquare, CalendarDays,
  MessageCircle, RotateCcw, BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useApplyBranding } from '@/hooks/useApplyBranding';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { MonthSelector } from './MonthSelector';
import { NotificacoesBell } from './NotificacoesBell';

function BrandHeader({ logoUrl, name, compact = false }: { logoUrl?: string | null; name?: string | null; compact?: boolean }) {
  if (logoUrl) {
    return (
      <div className="flex items-center justify-center w-full">
        <img
          src={logoUrl}
          alt={name || 'Logo'}
          className={compact ? 'h-7 w-auto max-w-[120px] object-contain' : 'h-10 w-auto max-w-[180px] object-contain'}
        />
      </div>
    );
  }
  return (
    <h1 className={`font-display font-bold text-foreground tracking-tight ${compact ? 'text-lg' : 'text-xl'}`}>
      💰 Higi$Controle
    </h1>
  );
}

const navGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null as 'alert' | 'warn' | null },
      { to: '/vendas', icon: ShoppingCart, label: 'Vendas', badge: null as 'alert' | 'warn' | null },
    ],
  },
  {
    label: 'Leads',
    items: [
      { to: '/leads', icon: Users, label: 'Lista de Leads', badge: null as 'alert' | 'warn' | null },
      { to: '/leads/kanban', icon: KanbanSquare, label: 'Kanban', badge: null as 'alert' | 'warn' | null },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { to: '/agenda', icon: CalendarDays, label: 'Agenda', badge: null as 'alert' | 'warn' | null },
      { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp', badge: null as 'alert' | 'warn' | null },
      { to: '/automacoes', icon: RotateCcw, label: 'Automações', badge: null as 'alert' | 'warn' | null },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { to: '/setup', icon: Settings, label: 'Financeiro', badge: null as 'alert' | 'warn' | null },
      { to: '/minha-empresa', icon: Building2, label: 'Minha Empresa', badge: null as 'alert' | 'warn' | null },
    ],
  },
];

const adminItems = [
  { to: '/admin', icon: Shield, label: 'Empresas' },
  { to: '/admin/dashboard', icon: BarChart3, label: 'Dashboard Admin' },
];

function NavBadgeDot({ type }: { type: 'alert' | 'warn' }) {
  return (
    <span className={`ml-auto h-2 w-2 rounded-full flex-shrink-0 ${type === 'alert' ? 'bg-destructive' : 'bg-warning'}`} />
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { empresa } = useEmpresa();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notif } = useNotificacoes();
  useApplyBranding();

  // Determine badge type per route
  function getNavBadge(to: string): 'alert' | 'warn' | null {
    if (to === '/leads' || to === '/leads/kanban') {
      if ((notif?.leadsSemContato7dias.length ?? 0) > 0) return 'alert';
      if ((notif?.leadsSemContato3dias.length ?? 0) > 0) return 'warn';
    }
    if (to === '/agenda') {
      if ((notif?.agendadosHoje ?? 0) > 0) return 'warn';
    }
    return null;
  }

  const renderNav = (onClickItem?: () => void) => (
    <nav className="flex-1 space-y-4 overflow-y-auto">
      {navGroups.map(group => (
        <div key={group.label}>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {group.label}
          </p>
          {group.items.map(item => {
            const active = location.pathname === item.to;
            const badge = getNavBadge(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClickItem}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badge && <NavBadgeDot type={badge} />}
              </Link>
            );
          })}
        </div>
      ))}

      {isAdmin && (
        <div>
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Admin
          </p>
          {adminItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClickItem}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border p-4 gap-4">
        <div className="mb-2">
          <BrandHeader logoUrl={empresa?.logo_url} name={empresa?.empresa_nome} />
        </div>
        {renderNav()}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <BrandHeader logoUrl={empresa?.logo_url} name={empresa?.empresa_nome} compact />
        <div className="flex items-center gap-1">
          <NotificacoesBell />
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground p-1">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 pt-16 px-4 pb-4 overflow-y-auto">
          {renderNav(() => setMobileOpen(false))}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-3 mt-4 rounded-lg text-base font-medium text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:p-6 p-4 pt-16 md:pt-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            {empresa && (
              <h2 className="font-display text-2xl font-bold text-foreground">{empresa.empresa_nome}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!location.pathname.startsWith('/admin') && <MonthSelector />}
            <div className="hidden md:block">
              <NotificacoesBell />
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
