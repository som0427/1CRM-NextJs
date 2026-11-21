/**
 * Models for General Settings
 * 
 * This file contains type definitions for general settings API responses and data structures.
 */

/**
 * Project Settings API Response
 */
export interface ProjectSettingsResponse {
  statusCode: number;
  message: string;
  responseData: ProjectSettingsData;
}

/**
 * Project Settings Data Structure
 */
export interface ProjectSettingsData {
  countryList: CountryItem[];
  timeZoneList: TimeZoneItem[];
  languageList: LanguageItem[];
  selectedCountryId: number;
  selectedTimeZoneId: number;
  selectedLanguageId: number;
  systemName: string;
  systemLogo: string | null;
  fullSystemLogo: string | null;
  systemId: string;
  selectCarouselFlag: number;
  userTargetFlag: number;
  customerTargetFlag: number;
  opportunityTargetFlag: number;
  carouselDetails: any[];
  restrictMultiDeviceLogin: number;
}

/**
 * Country Item
 */
export interface CountryItem {
  id: number;
  name: string;
}

/**
 * Time Zone Item
 */
export interface TimeZoneItem {
  id: number;
  name: string;
}

/**
 * Language Item
 */
export interface LanguageItem {
  id: number;
  name: string;
}

/**
 * Role Item
 */
export interface RoleItem {
  roleId: number;
  roleName: string;
  active: number;
  userCount: number;
  webSelectedMenus: any[];
  mobileSelectedMenus: any[];
}
