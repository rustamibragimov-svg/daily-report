export interface IncidentRow {
  responsible: string;
  details: string;
  resolution: string;
}

export interface ReportFormValues {
  report_date: string;

  // Section 1
  data_accuracy: string;
  accuracy_rows: IncidentRow[];
  incidents_status: string;
  incidents_rows: IncidentRow[];

  // Section 2
  cs_total: number;
  cs_overdue: number;
  cs_overdue_reason: string;
  cs_avg_week: string;
  cs_avg_month: number;

  // Section 3 UZUM
  uzum_sh_count: number;
  uzum_hk_count: number;
  uzum_sh_weight: number;
  uzum_hk_weight: number;
  uzum_sh_mko: number;
  uzum_hk_mko: number;
  uzum_sh_mpo: number;
  uzum_hk_mpo: number;
  uzum_sh_auto: number;
  uzum_hk_auto: number;
  uzum_sh_ratio: string;
  uzum_hk_ratio: string;
  uzum_china_status: string;
  uzum_china_incident: string;
  uzum_transit_status: string;
  uzum_transit_incident: string;
  uzum_lastmile_status: string;
  uzum_lastmile_incident: string;

  // Section 4 Cainiao
  cainiao_sh_count: number;
  cainiao_hk_count: number;
  cainiao_sh_weight: number;
  cainiao_hk_weight: number;
  cainiao_sh_mko: number;
  cainiao_hk_mko: number;
  cainiao_sh_mpo: number;
  cainiao_hk_mpo: number;
  cainiao_sh_auto: number;
  cainiao_hk_auto: number;
  cainiao_sh_ratio: string;
  cainiao_hk_ratio: string;
  cainiao_china_status: string;
  cainiao_china_incident: string;
  cainiao_transit_status: string;
  cainiao_transit_incident: string;
  cainiao_lastmile_status: string;
  cainiao_lastmile_incident: string;
}

export interface DailyReport extends ReportFormValues {
  id: string;
  week_number: string;
  created_at: string;
  updated_at: string;
}

export const RESPONSIBLE_OPTIONS = [
  'Наталья Матвиенко',
  'Идель Ибрагимов',
  'Рустам Ибрагимов',
];

export const DATA_ACCURACY_OPTIONS = [
  'Все данные в трекер занесены своевременно и корректно',
  'Есть нарушения по точности и своевременности занесения данных',
];

export const INCIDENT_STATUS_OPTIONS = ['Без инцидентов', 'Присутствуют'];

export const OPS_STATUS_OPTIONS = ['Без инцидентов', 'Инцидены присутствуют'];

export const EMPTY_INCIDENT_ROW: IncidentRow = { responsible: '', details: '', resolution: '' };

export const DEFAULT_FORM: ReportFormValues = {
  report_date: '',
  data_accuracy: DATA_ACCURACY_OPTIONS[0],
  accuracy_rows: [EMPTY_INCIDENT_ROW, EMPTY_INCIDENT_ROW, EMPTY_INCIDENT_ROW],
  incidents_status: INCIDENT_STATUS_OPTIONS[0],
  incidents_rows: [EMPTY_INCIDENT_ROW, EMPTY_INCIDENT_ROW, EMPTY_INCIDENT_ROW],
  cs_total: 0,
  cs_overdue: 0,
  cs_overdue_reason: '',
  cs_avg_week: 'Нет данных',
  cs_avg_month: 0,
  uzum_sh_count: 0, uzum_hk_count: 0,
  uzum_sh_weight: 0, uzum_hk_weight: 0,
  uzum_sh_mko: 0, uzum_hk_mko: 0,
  uzum_sh_mpo: 0, uzum_hk_mpo: 0,
  uzum_sh_auto: 0, uzum_hk_auto: 0,
  uzum_sh_ratio: 'Нет данных', uzum_hk_ratio: 'Нет данных',
  uzum_china_status: OPS_STATUS_OPTIONS[0], uzum_china_incident: '',
  uzum_transit_status: OPS_STATUS_OPTIONS[0], uzum_transit_incident: '',
  uzum_lastmile_status: OPS_STATUS_OPTIONS[0], uzum_lastmile_incident: '',
  cainiao_sh_count: 0, cainiao_hk_count: 0,
  cainiao_sh_weight: 0, cainiao_hk_weight: 0,
  cainiao_sh_mko: 0, cainiao_hk_mko: 0,
  cainiao_sh_mpo: 0, cainiao_hk_mpo: 0,
  cainiao_sh_auto: 0, cainiao_hk_auto: 0,
  cainiao_sh_ratio: 'Нет данных', cainiao_hk_ratio: 'Нет данных',
  cainiao_china_status: OPS_STATUS_OPTIONS[0], cainiao_china_incident: '',
  cainiao_transit_status: OPS_STATUS_OPTIONS[0], cainiao_transit_incident: '',
  cainiao_lastmile_status: OPS_STATUS_OPTIONS[0], cainiao_lastmile_incident: '',
};
