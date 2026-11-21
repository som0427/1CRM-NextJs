// Community Settings Models

export interface CommunitySettingsResponse {
  statusCode: number;
  message: string;
  responseData: CommunitySettingsData;
}

export interface CommunitySettingsData {
  userTime: string | null;
  transTimeZone: string | null;
  id: number;
  projectId: number;
  communityName: string;
  enableCommunity: number;
  enableFor: CommunityEnableFor[];
}

export interface CommunityEnableFor {
  roleId: number;
  addPost: boolean;
  deletePost: boolean;
  react: boolean;
}

export interface RoleItem {
  roleId: number;
  roleName: string;
  activeStatus: number;
}

export interface RolesResponse {
  statusCode: number;
  message: string;
  responseData: RoleItem[];
}

export interface CommunitySettingsUpdateRequest {
  projectId: number;
  id: number;
  communityName: string;
  enableCommunity: number;
  enableFor: CommunityEnableFor[];
  userTime: string;
  transTimeZone: string;
}