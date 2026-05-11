import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, Loader2, AlertCircle, Trash2, Trash } from 'lucide-react';
import { useReportHistory, useDeleteReport, useDeleteAllReports } from '@/hooks/useReport';
import { exportReportToExcel } from '@/utils/excel';
import { formatDateRu } from '@/lib/utils';
import type { DailyReport } from '@/types/report';

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />;
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 w-80 space-y-4">
        <p className="text-sm text-gray-800">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportRow({
  report,
  onExport,
  onDelete,
}: {
  report: DailyReport;
  onExport: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const dataOk = report.data_accuracy.includes('своевременно');
  const incOk = report.incidents_status === 'Без инцидентов';
  const uzumOk =
    report.uzum_china_status === 'Без инцидентов' &&
    report.uzum_transit_status === 'Без инцидентов' &&
    report.uzum_lastmile_status === 'Без инцидентов';
  const cainiaoOk =
    report.cainiao_china_status === 'Без инцидентов' &&
    report.cainiao_transit_status === 'Без инцидентов' &&
    report.cainiao_lastmile_status === 'Без инцидентов';

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
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 hover:bg-white transition-colors"
            title="Скачать Excel"
          >
            <Download size={12} />
            Excel
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title="Удалить"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function HistoryPage() {
  const { data: reports, isLoading, isError } = useReportHistory();
  const deleteOne = useDeleteReport();
  const deleteAll = useDeleteAllReports();

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; date: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

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
      {confirmDelete && (
        <ConfirmDialog
          message={`Удалить отчёт за ${formatDateRu(confirmDelete.date)}?`}
          onConfirm={() => {
            deleteOne.mutate(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmClear && (
        <ConfirmDialog
          message={`Удалить все ${reports.length} отчётов? Это действие нельзя отменить.`}
          onConfirm={() => {
            deleteAll.mutate();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">История отчётов</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{reports.length} отчётов</span>
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash size={14} />
            Очистить всё
          </button>
        </div>
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
                <th className="metrics-th w-28"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <ReportRow
                  key={report.id}
                  report={report}
                  onExport={() => void exportReportToExcel(report)}
                  onDelete={() => setConfirmDelete({ id: report.id, date: report.report_date })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
