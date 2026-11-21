import { BasicUserDetails } from "../models/basic-user-details.model";
import { GeneralResponse } from "../models/general-response.model";
import apiClient from "./apiClient";

class UserService {
  getOwner(
    projectId: number,
    moduleId: number,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/fetchModuleOwnerOptions?projectId=${projectId}&moduleId=${moduleId}`,
    );
  }

  getOwnerAndUsersDownHierarchy(
    projectId: number,
  ): Promise<{ responseData: any[]; statusCode: number; message: string }> {
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/ownerAndDownHierarchyUsers?projectId=${projectId}`,
    );
  }

  getReportingHeadUserList(
    projectId: number,
    userId?: number,
  ): Promise<{ responseData: any[]; statusCode: number; message: string }> {
    const userParam = userId !== undefined && userId !== null ? `&userId=${userId}` : '';
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/reportsToOptions?projectId=${projectId}${userParam}`,
    );
  }

  getActiveUsers(
    projectId: number,
    signal?: AbortSignal,
  ): Promise<GeneralResponse<BasicUserDetails[]>> {
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/?projectId=${projectId}&activeStatus=1`,
      { signal },
    );
  }

  isUserTransactionExist(
    projectId: number,
    userId: number,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/common/is-user-transaction-exists?projectId=${projectId}&userId=${userId}`,
    );
  }

  /**
   * Get all users with activeStatus filter (2 = all users for Reports To dropdown)
   */
  getAllUsers(
    projectId: number,
    activeStatus: number = 2,
  ): Promise<{ responseData: any[]; statusCode: number; message: string }> {
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users?projectId=${projectId}&activeStatus=${activeStatus}`,
    );
  }

  /**
   * Check if email or mobile already exists
   */
  checkEmailOrMobileAlreadyExist(
    isEmail: boolean,
    emailOrMobile: string,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/checkForExistingEmailOrMobile?isEmail=${isEmail}&emailOrMobile=${encodeURIComponent(emailOrMobile)}`,
    );
  }
}

const userService = new UserService();

export default userService;
