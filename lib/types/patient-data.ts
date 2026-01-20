export interface PatientRecord {
  // Demographics
  SubjectId: string;
  'E01_V1[1].SCR_01.VS[1].SEX': string;
  'E01_V1[1].SCR_01.VS[1].AGE': string;
  'E01_V1[1].SCR_01.VS[1].HEIGHT_VSORRES': string;
  'E01_V1[1].SCR_01.VS[1].WEIGHT_VSORRES': string;
  BMI: string;
  BSA: string;
  
  // Site Information
  SiteName: string;
  'Hospital ID': string;
  'Company ID': string;
  
  // Visit Information
  'E01_V1[1]..DATE': string;
  'E02_V2[1]..DATE': string;
  'E02_V2[1].PRO_01.PEP[1].PEPDAT': string;
  'E03_V3[1]..DATE': string;
  'E04_V4[1]..DATE': string;
  'E04_V41[1]..DATE': string;
  'E05_V5[1]..DATE': string;
  'E06_V6[1]..DATE': string;
  
  // Medications
  'E01_V1[1].SCR_01.CAM[1].CAM_ACSP': string;
  
  // Clinical Measurements - Baseline
  'E01_V1[1].SCR_02.ECHO[1].LVEFUT': string;
  'E01_V1[1].SCR_02.ECHO[2].LVEFUT': string;
  'E01_V1[1].SCR_02.NYHA[1].NYHAFCCD': string;
  'E01_V1[1].SCR_02.QSRISK[1].STS_QSORRES': string;
  'E01_V1[1].SCR_03.SC[1].NTPBNP_ORRES': string;
  'E01_V1[1].SCR_04._6MWT[1].TOTDIST': string;
  'E01_V1[1].SCR_04._6MWT[2].TOTDIST': string;
  'E01_V1[1].SCR_05.SE[1].MRGRADCD': string;
  'E01_V1[1].SCR_05.SE[1].SE_LVEF': string;
  'E01_V1[1].SCR_05.SE[1].SE_MG': string;
  'E01_V1[1].SCR_05.SE[1].SE_RAMCD': string;
  'E01_V1[1].SCR_05.SE[1].SE_REFID': string;
  
  // Discharge Data
  'Discharge_Data Locked': string;
  'Discharge_LVEF %_CA': string;
  'Discharge_LVEDV_CA': string;
  'Discharge_LVESV_CA': string;
  'Discharge_Mean Gradiet (mmHg) _CA': string;
  'Discharge_MR Grade_CA': string;
  
  // 30-Day Data
  '30-D_Data Locked': string;
  '30-D_LVEDV_CA': string;
  '30-D_LVEF %_CA': string;
  '30-D_LVESV_CA': string;
  '30-D_Mean Gradient (mmHg)_CA': string;
  ' 30-D_MR Grade_CA': string;
  
  // 3-Month Data
  '3-M_Data Locked': string;
  '3-M_LVEDV_CA': string;
  '3-M_LVEF %_CA': string;
  '3-M_LVESV_CA': string;
  '3-M_Mean Gradient (mmHg)_CA': string;
  '3-M_MR Grade_CA': string;
  
  // 6-Month Data
  '6-M_Data Locked': string;
  '6-M_LVEDV_CA': string;
  '6-M_LVEF %_CA': string;
  '6-M_LVESV_CA': string;
  '6-M_Mean Gradient (mmHg)_CA': string;
  '6-M_MR Grade_CA': string;
  
  // 1-Year Data
  '1Yr_Data Locked': string;
  '1Yr_LVEDV_CA': string;
  '1Yr_LVEF %_CA': string;
  '1Yr_LVESV_CA': string;
  '1Yr_Mean Gradient (mmHg)_CA': string;
  '1Yr_MR Grade_CA': string;
  '1 yr Diastolic Remodeling %': string;
  '1 yr Systolic Remodeling %': string;
  
  // 2-Year Data
  '2Yr_Data Locked': string;
  '2Yr_LVEDV_CA': string;
  '2Yr_LVEF %_CA': string;
  '2Yr_LVESV_CA': string;
  '2Yr_Mean Gradient (mmHg)_CA': string;
  '2Yr_MR Grade_CA': string;
  
  // Adverse Events
  'COMMON_AE[1].LOG_AE.AE[1].AEDECOD': string;
  'COMMON_AE[1].LOG_AE.AE[1].DTHDAT': string;
  'COMMON_AE[1].LOG_AE.AE[1].PRDAT': string;
  'COMMON_AE[2].LOG_AE.AE[1].AEDECOD': string;
  'COMMON_AE[2].LOG_AE.AE[1].DTHDAT': string;
  
  // Core Lab Data
  Corelab_Field: string;
  
  // Visit Details
  'Next Visit': string;
  'Next Visit Window Open': string;
  
  // Additional fields - using index signature for flexibility
  [key: string]: string | undefined;
}

export interface ColumnConfig {
  id: string;
  label: string;
  originalLabel: string;
  visible: boolean;
  dataType: 'text' | 'number' | 'date' | 'categorical';
  category?: 'demographics' | 'visits' | 'measurements' | 'adverse_events' | 'other';
  visitGroup?: string; // Visit group from CSV header mapping
  tableOrder?: number; // Table order for sorting
}

export interface VisitGroupSpan {
  visitGroup: string;
  startIndex: number;
  columnCount: number;
}

export interface TableHeaderConfig {
  columnConfigs: ColumnConfig[];
  visitGroupSpans: VisitGroupSpan[];
}

export interface FilterState {
  globalSearch: string;
  columnFilters: Record<string, string | string[] | [number, number] | null>;
  dateRanges: Record<string, { from?: Date; to?: Date }>;
}

export interface UploadedData {
  data: PatientRecord[];
  fileName: string;
  uploadedAt: Date;
  rowCount: number;
  columnCount: number;
}
