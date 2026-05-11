import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
          <span className="font-bold text-brand-700 text-lg tracking-tight">3PL Daily Report</span>
          <nav className="flex items-center gap-1 ml-4">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')
              }
            >
              <ClipboardList size={15} />
              Отчёт
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100')
              }
            >
              <History size={15} />
              История
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
