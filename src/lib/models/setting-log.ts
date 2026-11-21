export interface SettingLog {
  id: number;
  fieldType: string;
  fieldName: string;
  fieldValidationType?: string | number | null;
  dateTime: string;
  oldValue: string;
  newValue: string;
  createdBy: string;
  roleName?: string;
  attributeId: number;
  moduleType: number;
  event: string | number;
  projectId: number;
}
