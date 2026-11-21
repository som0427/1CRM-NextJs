/**
 * SettingsMenuItem Model
 * 
 * This model represents the structure of settings assistant menu items
 * returned from the settings configuration API.
 */

/**
 * Settings Menu Item
 * Represents a menu item in the settings assistant hierarchy
 */
export interface SettingsMenuItem {
  menuId: number | null;
  menuName: string;
  menuDescription: string;
  menuIcon: string | null;
  urlPath: string | null;
  greenTick: boolean;
  childList: SettingsMenuItem[];
}

/**
 * Settings API Response
 * Represents the API response structure from the settings assistant endpoint
 */
export interface SettingsApiResponse {
  statusCode: number;
  message: string;
  responseData: SettingsMenuItem[];
}
