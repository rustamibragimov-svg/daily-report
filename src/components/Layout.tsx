import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, History, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Ежедневный отчёт', icon: ClipboardList, end: true },
  { to: '/history', label: 'История отчётов', icon: History, end: false },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-[#F4F6F9]">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-[#1C1C2E] flex flex-col min-h-screen sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <img src="/antria-logo-B23HqTGc.png" alt="Antria Group" className="h-12 w-auto brightness-0 invert" />
        </div>

        {/* Section label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Операции
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-white' : 'text-white/50'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="text-white/40" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[11px] text-white/25">3PL Department</p>
          <p className="text-[11px] text-white/20">Antria Group</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 h-14 flex items-center sticky top-0 z-20">
          <h1 className="text-sm font-semibold text-gray-800 tracking-tight">
            Операционный учёт · 3PL
          </h1>
        </header>

        <main className="flex-1 px-8 py-6 max-w-5xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
