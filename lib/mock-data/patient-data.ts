import { PatientRecord } from '@/lib/types/patient-data';

// Mock data removed - all patient data comes from CSV upload
export const mockPatientData: PatientRecord[] = [];
/* Mock data intentionally removed - kept as empty for backward compatibility */

// Helper function to generate column configurations from the data
// Returns empty array when no data - all configuration comes from header mapping CSV
export function getColumnConfigurations(): Array<{
  id: string;
  label: string;
  originalLabel: string;
  visible: boolean;
  dataType: 'text' | 'number' | 'date' | 'categorical';
  category: 'demographics' | 'visits' | 'measurements' | 'adverse_events' | 'other';
}> {
  // No mock data - return empty array
  // Column configurations will be generated from uploaded header mapping CSV
  return [];
}
