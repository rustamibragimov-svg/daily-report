import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, History, ChevronRight, PanelLeftClose, PanelLeftOpen, BarChart3, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Ежедневный отчёт', icon: ClipboardList, end: true },
  { to: '/history', label: 'История отчётов', icon: History, end: false },
  { to: '/analytics', label: 'Аналитика', icon: BarChart3, end: false },
  { to: '/settings', label: 'Настройки', icon: Settings2, end: false },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F4F6F9]">
      {/* Sidebar */}
      <aside className={cn(
        'shrink-0 bg-[#1C1C2E] flex flex-col min-h-screen sticky top-0 h-screen transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}>
        {/* Collapse button */}
        <div className={cn(
          'flex items-center border-b border-white/10 h-14',
          collapsed ? 'justify-center px-0' : 'px-4 justify-end'
        )}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        {/* Section label */}
        {!collapsed && (
          <div className="px-5 pt-5 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Операции
            </span>
          </div>
        )}
        {collapsed && <div className="pt-3" />}

        {/* Nav */}
        <nav className={cn('flex-1 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg text-sm transition-colors',
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={cn('shrink-0', isActive ? 'text-white' : 'text-white/50')} />
                  {!collapsed && <span className="flex-1">{label}</span>}
                  {!collapsed && isActive && <ChevronRight size={13} className="text-white/40" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-5 py-4 border-t border-white/10">
            <p className="text-[11px] text-white/25">3PL Department · Antria Group</p>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 h-14 flex items-center gap-3 sticky top-0 z-20">
          <img src="/favicon.png" alt="Antria" className="h-7 w-7 shrink-0" />
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
