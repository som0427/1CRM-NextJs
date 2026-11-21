/**
 * Loyalty Settings Models
 *
 * TypeScript interfaces for loyalty settings API requests and responses
 */

export interface LoyaltySettingsData {
  id?: number;
  projectId: number;
  maxRedeemablePercentage: number;
  allowRedemption: number; // 1 = 'Any time', 2 = 'Once in a quarter'
  minMembershipAgeDays: number;
}

export interface LoyaltySettingsResponse {
  statusCode: number;
  message: string;
  responseData: LoyaltySettingsData;
}

export interface LoyaltySettingsUpdateRequest {
  projectId: number;
  maxRedeemablePercentage: number;
  allowRedemption: number;
  minMembershipAgeDays: number;
  userTime: string;
  transTimeZone: string;
}

export const redemptionOptions = [
  { value: 1, label: 'Any time' },
  { value: 2, label: 'Once in a quarter' }
];
