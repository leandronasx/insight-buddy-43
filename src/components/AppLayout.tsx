import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Settings, LogOut, Menu, X, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresa } from '@/hooks/useEmpresa';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { MonthSelector } from './MonthSelector';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/setup', icon: Settings, label: 'Setup Mensal' },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { empresa } = useEmpresa();
  const { isAdmin } = useIsAdmin();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allNavItems = isAdmin
    ? [...navItems, { to: '/admin', icon: Building2, label: 'Empresas' }]
    : navItems;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border p-4">
        <div className="mb-8">
          <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
            📊 TrackROI
          </h1>
          {empresa && (
            <p className="text-sm text-muted-foreground mt-1 truncate">{empresa.empresa_nome}</p>
          )}
        </div>
        <nav className="flex-1 space-y-1">
          {allNavItems.map(item => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
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
        <h1 className="font-display text-lg font-bold text-foreground">📊 TrackROI</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 pt-16 px-4">
          <nav className="space-y-1">
            {allNavItems.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    active ? 'bg-secondary text-primary' : 'text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
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
          <MonthSelector />
        </div>
        {children}
      </main>
    </div>
  );
}
