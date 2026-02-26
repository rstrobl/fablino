import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Mic, Volume2, Settings, LogOut, Menu, X } from 'lucide-react';
import { GlobalPlayer } from './GlobalPlayer';
import { useAuth } from '../auth';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/stories', icon: BookOpen, label: 'Stories' },
  { to: '/voices', icon: Mic, label: 'Voices' },
  { to: '/sfx', icon: Volume2, label: 'Soundeffekte' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-surface border-b border-border flex items-center px-4 z-40 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-text-muted hover:text-text">
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold text-brand ml-2">🧚 Fablino</h1>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-surface flex flex-col border-r border-border z-50 transition-transform duration-200 md:static md:translate-x-0 md:shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand">🧚 Fablino</h1>
            <p className="text-xs text-text-muted mt-1">Admin Dashboard</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-text-muted hover:text-text md:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand/15 text-brand font-medium'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:bg-surface-hover hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto pb-20 pt-14 md:pt-0">
        <Outlet />
      </main>
      <GlobalPlayer />
    </div>
  );
}
