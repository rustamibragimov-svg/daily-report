import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Loader2, AlertCircle, BarChart3, TrendingUp } from 'lucide-react';
import { useReportHistory } from '@/hooks/useReport';
import type { DailyReport, IncidentRow } from '@/types/report';
import { formatDateRu } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPLOYEES = ['Рустам Ибрагимов', 'Идель Ибрагимов', 'Наталья Матвиенко'];

const EMP_COLOR: Record<string, string> = {
  'Рустам Ибрагимов': '#3B82F6',
  'Идель Ибрагимов': '#F97316',
  'Наталья Матвиенко': '#A855F7',
};

const EMP_SHORT: Record<string, string> = {
  'Рустам Ибрагимов': 'Рустам',
  'Идель Ибрагимов': 'Идель',
  'Наталья Матвиенко': 'Наталья',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `W${String(week).padStart(2, '0')} ${utc.getUTCFullYear()}`;
}

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  const names = ['', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  return `${names[parseInt(m)]} ${y}`;
}

interface ViolationEntry {
  date: string;
  responsible: string;
  details: string;
  resolution: string;
  week: string;
  month: string;
  monthSort: string;
}

function extractViolations(reports: DailyReport[]): ViolationEntry[] {
  const entries: ViolationEntry[] = [];
  for (const report of reports) {
    const rows = (report.accuracy_rows ?? []) as IncidentRow[];
    for (const row of rows) {
      if (!row.responsible) continue;
      entries.push({
        date: report.report_date,
        responsible: row.responsible,
        details: row.details ?? '',
        resolution: row.resolution ?? '',
        week: isoWeekLabel(report.report_date),
        month: monthLabel(report.report_date),
        monthSort: report.report_date.slice(0, 7),
      });
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

type ChartRow = Record<string, string | number>;

function buildGrouped(violations: ViolationEntry[], key: 'week' | 'monthSort'): ChartRow[] {
  const sortKey = key === 'week' ? 'week' : 'monthSort';
  const labelKey = key === 'week' ? 'week' : 'month';

  const periods = [...new Set(violations.map(v => v[sortKey as keyof ViolationEntry] as string))].sort();

  return periods.map(period => {
    const subset = violations.filter(v => (v[sortKey as keyof ViolationEntry] as string) === period);
    const row: ChartRow = { label: subset[0][labelKey as keyof ViolationEntry] as string };
    let total = 0;
    for (const emp of EMPLOYEES) {
      const count = subset.filter(v => v.responsible === emp).length;
      row[EMP_SHORT[emp]] = count;
      total += count;
    }
    row['Всего'] = total;
    return row;
  });
}

function buildForEmployee(violations: ViolationEntry[], emp: string, key: 'week' | 'monthSort'): ChartRow[] {
  const sortKey = key;
  const labelKey = key === 'week' ? 'week' : 'month';
  // Get all periods from all violations (not just this employee) to show 0s
  const allPeriods = [...new Set(violations.map(v => v[sortKey as keyof ViolationEntry] as string))].sort();

  return allPeriods.map(period => {
    const subset = violations.filter(v => (v[sortKey as keyof ViolationEntry] as string) === period && v.responsible === emp);
    return {
      label: violations.find(v => (v[sortKey as keyof ViolationEntry] as string) === period)?.[labelKey as keyof ViolationEntry] as string ?? period,
      Нарушения: subset.length,
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
      <TrendingUp size={16} className="text-gray-400" />
      {children}
    </h2>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section-card p-5">
      <p className="text-sm font-medium text-gray-600 mb-4">{title}</p>
      {children}
    </div>
  );
}

function StackedBar({ data }: { data: ChartRow[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {EMPLOYEES.map(emp => (
          <Bar key={emp} dataKey={EMP_SHORT[emp]} stackId="a" fill={EMP_COLOR[emp]} radius={[0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function SingleBar({ data, color }: { data: ChartRow[]; color: string }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Bar dataKey="Нарушения" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={color} opacity={(data[i]['Нарушения'] as number) === 0 ? 0.2 : 0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-gray-300">
      Нет данных
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="section-card px-5 py-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: reports, isLoading, isError } = useReportHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Загрузка...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-12 justify-center">
        <AlertCircle size={18} /> Ошибка загрузки
      </div>
    );
  }

  const violations = extractViolations(reports ?? []);
  const weeklyAll = buildGrouped(violations, 'week');
  const monthlyAll = buildGrouped(violations, 'monthSort');

  const totalByEmp = EMPLOYEES.reduce<Record<string, number>>((acc, emp) => {
    acc[emp] = violations.filter(v => v.responsible === emp).length;
    return acc;
  }, {});

  if (!violations.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <BarChart3 size={40} strokeWidth={1} />
        <p className="text-sm">Нарушений пока не зафиксировано</p>
        <p className="text-xs text-gray-300">Заполняйте раздел «Точность данных» в ежедневных отчётах</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="page-title">Аналитика по нарушениям</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Данные из раздела «Точность данных» ежедневных отчётов
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Всего нарушений" value={violations.length} sub={`за ${(reports ?? []).length} отчётов`} />
        {EMPLOYEES.map(emp => (
          <KpiCard key={emp} label={EMP_SHORT[emp]} value={totalByEmp[emp]} sub="нарушений" />
        ))}
      </div>

      {/* ── Общие графики ── */}
      <div className="space-y-3">
        <SectionTitle>Все сотрудники</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="По неделям">
            <StackedBar data={weeklyAll} />
          </ChartCard>
          <ChartCard title="По месяцам">
            <StackedBar data={monthlyAll} />
          </ChartCard>
        </div>
      </div>

      {/* ── По каждому сотруднику ── */}
      <div className="space-y-3">
        <SectionTitle>По сотрудникам</SectionTitle>
        <div className="space-y-4">
          {EMPLOYEES.map(emp => (
            <div key={emp} className="section-card overflow-hidden">
              <div
                className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"
                style={{ borderLeftWidth: 4, borderLeftColor: EMP_COLOR[emp] }}
              >
                <span className="font-semibold text-sm text-gray-800">{emp}</span>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: EMP_COLOR[emp] }}
                >
                  {totalByEmp[emp]} нарушений
                </span>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                <div className="p-5">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">По неделям</p>
                  <SingleBar data={buildForEmployee(violations, emp, 'week')} color={EMP_COLOR[emp]} />
                </div>
                <div className="p-5">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">По месяцам</p>
                  <SingleBar data={buildForEmployee(violations, emp, 'monthSort')} color={EMP_COLOR[emp]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Детали нарушений ── */}
      <div className="space-y-3">
        <SectionTitle>Детали нарушений</SectionTitle>
        <div className="section-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="metrics-th text-left w-28">Дата</th>
                <th className="metrics-th text-left w-44">Ответственный</th>
                <th className="metrics-th text-left">Нарушение</th>
                <th className="metrics-th text-left w-48">Решение</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                  <td className="metrics-td text-gray-500 whitespace-nowrap">{formatDateRu(v.date)}</td>
                  <td className="metrics-td">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: EMP_COLOR[v.responsible] ?? '#6B7280' }}
                    >
                      {EMP_SHORT[v.responsible] ?? v.responsible}
                    </span>
                  </td>
                  <td className="metrics-td text-gray-700">{v.details || '—'}</td>
                  <td className="metrics-td text-gray-500 text-xs">{v.resolution || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
