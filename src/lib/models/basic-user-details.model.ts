// Basic user details model matching the swap-data API response
export interface BasicUserDetails {
  userId: number;
  firstName: string;
  lastName: string;
  userName: string;
  roleName: string;
  serialNumber: string;
  active: number;
}
