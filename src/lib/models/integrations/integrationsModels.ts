// API Response interfaces matching the actual API structure
export interface ConfiguredApp {
  appId: number;
  appName: string;
  integrationType: number;
  allowEdit: number;
  lastEdited: string;
  logo: string;
}

export interface AvailableIntegration {
  id: number;
  appName: string;
  appDescription: string;
  logoImage: string;
  isConfigured: number;
  integrationType: number;
  allowEdit: number;
  displayOrder: number;
}

export interface ApiResponseData {
  configuredApp: ConfiguredApp[];
  availableIntegration: AvailableIntegration[];
}

export interface IntegrationsApiResponse {
  statusCode: number;
  message: string;
  responseData: ApiResponseData;
}

// Normalized interfaces for component use
export interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: 'active' | 'inactive';
  lastEdited?: string;
  category: string;
  isConfigured: boolean;
  allowEdit: boolean;
  integrationType: number;
}

export interface ConfiguredIntegration extends Integration {
  isConfigured: true;
  lastEdited: string;
  integrationType: number;
}

export interface AvailableIntegrationNormalized extends Integration {
  isConfigured: false;
  displayOrder: number;
  integrationType: number;
}

export interface IntegrationsResponse {
  configured: ConfiguredIntegration[];
  available: AvailableIntegrationNormalized[];
}

export interface IntegrationConfigRequest {
  integrationId: string;
  projectId: number;
  configurationData: any;
}

export interface IntegrationConfigResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Configuration Field Models
export interface LookupValue {
  id: number;
  appId: number;
  fieldId: number;
  lookupValue: string;
  isActive: number;
}

export interface Section {
  id: number;
  applicationId: number;
  sectionId: number;
  sectionName: string;
  isActive: string;
}

export interface IntegrationConfigField {
  id: number;
  appId: number;
  fieldName: string;
  fieldType: number; // 1 = dropdown, 6 = text input
  section: Section;
  lookupValues: LookupValue[];
  displayOrder: number;
  isActive: number;
  isMandatory?: number; // 1 = required, 0 = optional
}

export interface ConfigSection {
  sectionName: string;
  sectionId: number;
  integrationConfigField: IntegrationConfigField[];
}

export interface ConfigFieldsApiResponse {
  statusCode: number;
  message: string;
  responseData: ConfigSection[];
}

// Save Configuration Models
export interface ConfigFieldSaveValue {
  id: number | null;
  fieldId: number;
  fieldValue: string;
}

export interface AppConfigModule {
  id: number | null;
  isActive: number;
  moduleId: number;
  attributeId: number;
}

export interface SaveConfigurationRequest {
  flagId: number;
  appId: number;
  projectId: number;
  integrationType: number;
  moduleType: number[];
  appConfigModule: AppConfigModule[];
  configFieldSaveValue: ConfigFieldSaveValue[];
}

export interface SaveConfigurationResponse {
  statusCode: number;
  message: string;
  responseData?: any;
}

// Get Configuration Details Models
export interface ConfigurationDetailsData {
  flagId: number | null;
  appId: number;
  integrationType: number | null;
  projectId: number;
  moduleType: number[];
  appConfigModule: AppConfigModule[];
  configFieldSaveValue: ConfigFieldSaveValue[];
}

export interface GetConfigurationDetailsResponse {
  statusCode: number;
  message: string;
  responseData: ConfigurationDetailsData;
}
