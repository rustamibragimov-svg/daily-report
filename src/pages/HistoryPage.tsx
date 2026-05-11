import { useNavigate } from 'react-router-dom';
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useReportHistory } from '@/hooks/useReport';
import { exportReportToExcel } from '@/utils/excel';
import { formatDateRu } from '@/lib/utils';
import type { DailyReport } from '@/types/report';

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />;
}

function ReportRow({ report, onExport }: { report: DailyReport; onExport: () => void }) {
  const navigate = useNavigate();
  const dataOk = report.data_accuracy.includes('своевременно');
  const incOk = report.incidents_status === 'Без инцидентов';
  const uzumOk = report.uzum_china_status === 'Без инцидентов' && report.uzum_transit_status === 'Без инцидентов' && report.uzum_lastmile_status === 'Без инцидентов';
  const cainiaoOk = report.cainiao_china_status === 'Без инцидентов' && report.cainiao_transit_status === 'Без инцидентов' && report.cainiao_lastmile_status === 'Без инцидентов';

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer group transition-colors"
      onClick={() => navigate(`/report/${report.report_date}`)}
    >
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatDateRu(report.report_date)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{report.week_number}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs">
          <StatusDot ok={dataOk} />
          <span className={dataOk ? 'text-green-700' : 'text-red-700'}>
            {dataOk ? 'OK' : 'Нарушение'}
          </span>
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs">
          <StatusDot ok={incOk} />
          <span className={incOk ? 'text-green-700' : 'text-red-700'}>
            {incOk ? 'Без инцидентов' : 'Присутствуют'}
          </span>
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="font-medium text-gray-500">UZUM</span>
            <StatusDot ok={uzumOk} />
          </span>
          <span className="flex items-center gap-1">
            <span className="font-medium text-gray-500">Cainiao</span>
            <StatusDot ok={cainiaoOk} />
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{report.cs_total}</td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onExport(); }}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 hover:bg-white transition-all"
          title="Скачать Excel"
        >
          <Download size={12} />
          Excel
        </button>
      </td>
    </tr>
  );
}

export default function HistoryPage() {
  const { data: reports, isLoading, isError } = useReportHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" />
        Загрузка...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-red-600 py-12 justify-center">
        <AlertCircle size={18} />
        Ошибка загрузки данных
      </div>
    );
  }

  if (!reports?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <FileText size={40} strokeWidth={1} />
        <p className="text-sm">Отчётов пока нет</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">История отчётов</h1>
        <span className="text-sm text-gray-400">{reports.length} отчётов</span>
      </div>

      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="metrics-th text-left">Дата</th>
                <th className="metrics-th text-left">Неделя</th>
                <th className="metrics-th text-left">Точность данных</th>
                <th className="metrics-th text-left">Инциденты</th>
                <th className="metrics-th text-left">Операции</th>
                <th className="metrics-th text-left">Заявок CS</th>
                <th className="metrics-th w-20"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onExport={() => void exportReportToExcel(report)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
