import apiClient from './apiClient';
import { MenuApiResponse, MenuType } from '../models/menu.model';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class MenuService {
  // Get Web Portal menus
  async getWebPortalMenus(projectId: number, roleId: number = 0): Promise<MenuApiResponse> {
    try {
      const response = await apiClient.get<MenuApiResponse>(
        `${API_BASE_URL}/login/api/menu/web/v2?projectId=${projectId}&roleId=${roleId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching web portal menus:', error);
      throw error;
    }
  }

  // Get Mobile App menus
  async getMobileAppMenus(projectId: number, roleId: number = 0): Promise<MenuApiResponse> {
    try {
      const response = await apiClient.get<MenuApiResponse>(
        `${API_BASE_URL}/login/api/menu/mobile/v2?projectId=${projectId}&roleId=${roleId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching mobile app menus:', error);
      throw error;
    }
  }

  // Get Report Builder menus
  async getReportBuilderMenus(projectId: number, roleId: number = 0): Promise<MenuApiResponse> {
    try {
      const response = await apiClient.get<MenuApiResponse>(
        `${API_BASE_URL}/login/api/menu/reportBuilder?projectId=${projectId}&roleId=${roleId}`
      );
      return response;
    } catch (error) {
      console.error('Error fetching report builder menus:', error);
      throw error;
    }
  }

  // Get menus by type
  async getMenusByType(menuType: MenuType, projectId: number, roleId: number = 0): Promise<MenuApiResponse> {
    switch (menuType) {
      case MenuType.WEB_PORTAL:
        return this.getWebPortalMenus(projectId, roleId);
      case MenuType.MOBILE_APP:
        return this.getMobileAppMenus(projectId, roleId);
      case MenuType.REPORT_BUILDER:
        return this.getReportBuilderMenus(projectId, roleId);
      default:
        throw new Error(`Invalid menu type: ${menuType}`);
    }
  }
}

const menuService = new MenuService();
export default menuService;
