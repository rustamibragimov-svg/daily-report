import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Loader2, AlertCircle, BarChart3, TrendingUp, Paperclip, Download } from 'lucide-react';
import { useReportHistory } from '@/hooks/useReport';
import { useEmployees, UNKNOWN_EMPLOYEE_COLOR } from '@/hooks/useEmployees';
import { useAllAttachments, getFileUrl, formatFileSize } from '@/hooks/useAttachments';
import type { DailyReport, IncidentRow } from '@/types/report';
import type { EmployeeFilter, RosterEntry } from '@/lib/employees';
import { EMPLOYEE_FILTER_LABELS, buildRoster, filterRoster } from '@/lib/employees';
import { formatDateRu } from '@/lib/utils';

const FILTER_ORDER: EmployeeFilter[] = ['all', 'active', 'archived'];

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
      // Тримминг обязателен: справочник тоже хранит имена без краевых пробелов,
      // иначе «Иван Петров » не совпадёт с сотрудником и уедет в «не в справочнике».
      const responsible = row.responsible?.trim();
      if (!responsible) continue;
      entries.push({
        date: report.report_date,
        responsible,
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

function buildGrouped(
  violations: ViolationEntry[],
  roster: RosterEntry[],
  key: 'week' | 'monthSort',
): ChartRow[] {
  const sortKey = key === 'week' ? 'week' : 'monthSort';
  const labelKey = key === 'week' ? 'week' : 'month';

  const periods = [...new Set(violations.map(v => v[sortKey as keyof ViolationEntry] as string))].sort();

  return periods.map(period => {
    const subset = violations.filter(v => (v[sortKey as keyof ViolationEntry] as string) === period);
    const row: ChartRow = { label: subset[0][labelKey as keyof ViolationEntry] as string };
    let total = 0;
    // Ключ серии — ФИО, а не короткая подпись: две одинаковые подписи иначе
    // молча сливаются в один столбец.
    for (const emp of roster) {
      const count = subset.filter(v => v.responsible === emp.fullName).length;
      row[emp.fullName] = count;
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

function StackedBar({ data, roster }: { data: ChartRow[]; roster: RosterEntry[] }) {
  if (!data.length) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {roster.map(emp => (
          <Bar
            key={emp.fullName}
            dataKey={emp.fullName}
            name={emp.shortName}
            stackId="a"
            fill={emp.color}
            radius={[0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function FilterTabs({
  value,
  counts,
  onChange,
}: {
  value: EmployeeFilter;
  counts: Record<EmployeeFilter, number>;
  onChange: (next: EmployeeFilter) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
      {FILTER_ORDER.map(f => (
        <button
          key={f}
          type="button"
          onClick={() => onChange(f)}
          aria-pressed={value === f}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === f ? 'bg-[#1C1C2E] text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {EMPLOYEE_FILTER_LABELS[f]}
          <span className={value === f ? 'ml-1.5 text-white/60' : 'ml-1.5 text-gray-300'}>
            {counts[f]}
          </span>
        </button>
      ))}
    </div>
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

function AttachmentsBlock() {
  const { data: files, isLoading } = useAllAttachments();

  if (isLoading) return null;
  if (!files?.length) return (
    <p className="text-xs text-center text-gray-300 py-4">Вложений пока нет</p>
  );

  // Group by report_date
  const byDate = files.reduce<Record<string, typeof files>>((acc, f) => {
    (acc[f.report_date] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="section-card overflow-hidden">
      {Object.entries(byDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, dateFiles]) => (
          <div key={date} className="border-b border-gray-100 last:border-0">
            <div className="px-4 py-2 bg-gray-50/60 flex items-center gap-2">
              <Paperclip size={12} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">{formatDateRu(date)}</span>
              <span className="text-xs text-gray-400 ml-auto">{dateFiles.length} файл{dateFiles.length > 1 ? 'а' : ''}</span>
            </div>
            {dateFiles.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{f.file_name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(f.file_size)}</p>
                </div>
                <a
                  href={getFileUrl(f.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-gray-200 hover:bg-white text-gray-500 transition-colors"
                >
                  <Download size={11} /> Открыть
                </a>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: reports, isLoading, isError } = useReportHistory();
  const { data: employees, isLoading: employeesLoading, isError: employeesFailed } = useEmployees();
  const [filter, setFilter] = useState<EmployeeFilter>('all');

  if (isLoading || employeesLoading) {
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

  const allViolations = extractViolations(reports ?? []);

  // Справочник + имена, которые есть только в отчётах, — чтобы ни одно
  // нарушение не выпало из графиков незаметно.
  const roster = buildRoster(employees ?? [], allViolations.map(v => v.responsible));
  const byName = new Map(roster.map(e => [e.fullName, e]));
  const visibleRoster = filterRoster(roster, filter);
  const visibleNames = new Set(visibleRoster.map(e => e.fullName));
  const violations = allViolations.filter(v => visibleNames.has(v.responsible));

  const counts = { all: allViolations.length, active: 0, archived: 0 } satisfies Record<EmployeeFilter, number>;
  for (const v of allViolations) {
    const entry = byName.get(v.responsible);
    if (entry?.isActive) counts.active++;
    else if (entry) counts.archived++;
  }

  const weeklyAll = buildGrouped(violations, visibleRoster, 'week');
  const monthlyAll = buildGrouped(violations, visibleRoster, 'monthSort');

  const totalByEmp = visibleRoster.reduce<Record<string, number>>((acc, emp) => {
    acc[emp.fullName] = violations.filter(v => v.responsible === emp.fullName).length;
    return acc;
  }, {});

  const colorOf = (name: string) => byName.get(name)?.color ?? UNKNOWN_EMPLOYEE_COLOR;
  const shortOf = (name: string) => byName.get(name)?.shortName ?? name;

  if (!allViolations.length) {
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Аналитика по нарушениям</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Данные из раздела «Точность данных» ежедневных отчётов
          </p>
        </div>
        <FilterTabs value={filter} counts={counts} onChange={setFilter} />
      </div>

      {employeesFailed && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
          Справочник сотрудников недоступен — цвета, подписи и фильтр по статусу
          работают некорректно. Проверьте таблицу <code>employees</code> в Supabase.
        </p>
      )}

      {!visibleRoster.length || !violations.length ? (
        <div className="section-card flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <BarChart3 size={32} strokeWidth={1} />
          <p className="text-sm">Нет нарушений по фильтру «{EMPLOYEE_FILTER_LABELS[filter]}»</p>
          <p className="text-xs text-gray-300">Выберите другой фильтр выше</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Всего нарушений"
              value={violations.length}
              sub={`за ${(reports ?? []).length} отчётов`}
            />
            {visibleRoster.map(emp => (
              <KpiCard
                key={emp.fullName}
                label={emp.shortName}
                value={totalByEmp[emp.fullName]}
                sub={
                  emp.isActive
                    ? 'нарушений'
                    : `нарушений · ${emp.isOrphan ? 'не в справочнике' : 'уволен'}`
                }
              />
            ))}
          </div>

          {/* ── Общие графики ── */}
          <div className="space-y-3">
            <SectionTitle>Все сотрудники</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <ChartCard title="По неделям">
                <StackedBar data={weeklyAll} roster={visibleRoster} />
              </ChartCard>
              <ChartCard title="По месяцам">
                <StackedBar data={monthlyAll} roster={visibleRoster} />
              </ChartCard>
            </div>
          </div>

          {/* ── По каждому сотруднику ── */}
          <div className="space-y-3">
            <SectionTitle>По сотрудникам</SectionTitle>
            <div className="space-y-4">
              {visibleRoster.map(emp => (
                <div key={emp.fullName} className="section-card overflow-hidden">
                  <div
                    className="px-5 py-3 border-b border-gray-100 flex items-center justify-between"
                    style={{ borderLeftWidth: 4, borderLeftColor: emp.color }}
                  >
                    <span className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                      {emp.fullName}
                      {!emp.isActive && (
                        <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {emp.isOrphan ? 'не в справочнике' : 'уволен'}
                        </span>
                      )}
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: emp.color }}
                    >
                      {totalByEmp[emp.fullName]} нарушений
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                    <div className="p-5">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">По неделям</p>
                      <SingleBar data={buildForEmployee(violations, emp.fullName, 'week')} color={emp.color} />
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">По месяцам</p>
                      <SingleBar data={buildForEmployee(violations, emp.fullName, 'monthSort')} color={emp.color} />
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
                    <tr key={`${v.date}|${v.responsible}|${i}`} className="hover:bg-gray-50/60 transition-colors">
                      <td className="metrics-td text-gray-500 whitespace-nowrap">{formatDateRu(v.date)}</td>
                      <td className="metrics-td">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: colorOf(v.responsible) }}
                        >
                          {shortOf(v.responsible)}
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
        </>
      )}

      {/* ── Вложения по отчётам ── */}
      <div className="space-y-3">
        <SectionTitle>Вложения по отчётам</SectionTitle>
        <AttachmentsBlock />
      </div>
    </div>
  );
}
