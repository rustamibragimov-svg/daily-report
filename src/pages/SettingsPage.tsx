import { useState } from 'react';
import { Settings2, Loader2, Save, Headphones } from 'lucide-react';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import type { AppSetting } from '@/hooks/useSettings';
import EmployeesSection from '@/components/settings/EmployeesSection';

function SettingRow({ setting }: { setting: AppSetting }) {
  const [val, setVal] = useState(setting.value);
  const update = useUpdateSetting();
  const dirty = val !== setting.value;

  const handleSave = () => {
    update.mutate({ key: setting.key, value: val });
  };

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{setting.label}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          step="0.1"
          min="0"
          value={val}
          onChange={e => setVal(e.target.value)}
          className="input-base w-24 text-center"
        />
        <button
          onClick={handleSave}
          disabled={!dirty || update.isPending}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#1C1C2E] text-white hover:bg-[#2a2a40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {update.isPending
            ? <Loader2 size={13} className="animate-spin" />
            : <Save size={13} />}
          Сохранить
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading, isError } = useSettings();

  const csSettings = settings?.filter(s => s.section === 'cs') ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings2 size={20} className="text-gray-400" />
          Настройки
        </h1>
        <p className="text-sm text-gray-400 mt-1">Целевые значения и параметры отчётности</p>
      </div>

      {/* CS Section */}
      <div className="section-card">
        <div className="section-header" style={{ backgroundColor: '#6D28D9' }}>
          <Headphones size={14} className="opacity-70" />
          Customer Service
        </div>
        <div className="px-5 py-1">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
              <Loader2 size={15} className="animate-spin" /> Загрузка...
            </div>
          )}
          {isError && (
            <p className="text-sm text-red-500 py-6 text-center">
              Ошибка загрузки настроек. Убедитесь что таблица <code>app_settings</code> создана в Supabase.
            </p>
          )}
          {!isLoading && !isError && (
            csSettings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                Настройки CS не найдены. Выполните SQL миграцию.
              </p>
            ) : (
              csSettings.map(s => <SettingRow key={s.key} setting={s} />)
            )
          )}
        </div>
      </div>

      <EmployeesSection />
    </div>
  );
}
