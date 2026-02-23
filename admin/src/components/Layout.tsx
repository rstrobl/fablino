import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Wand2, Mic, Settings, LogOut } from 'lucide-react';
import { GlobalPlayer } from './GlobalPlayer';
import { useAuth } from '../auth';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/stories', icon: BookOpen, label: 'Stories' },
  { to: '/generate', icon: Wand2, label: 'Generator' },
  { to: '/voices', icon: Mic, label: 'Voices' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const { logout } = useAuth();
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 bg-surface flex flex-col border-r border-border shrink-0">
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-bold text-brand">🧚 Fablino</h1>
          <p className="text-xs text-text-muted mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
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
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <GlobalPlayer />
    </div>
  );
}
