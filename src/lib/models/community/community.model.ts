// Community data model - matching API response structure
export interface CommunityData {
  id: number; // same as postId for grid id
  postId: number;
  communityName: string;
  title?: string;
  tag?: string;
  postedBy?: string;
  description?: string;
  postedTime?: string; // e.g. "25-09-2025 10:57 AM"
  reactions?: string;
  createdOn?: string;
  thumbnail?: string;
  attachment?: string;
  // Allow for additional fields
  [key: string]: any;
}

// Optional edit model placeholder (not used yet)
export interface CommunityEditModel {
  postId: number;
  communityName?: string;
  title?: string;
  tag?: string;
  description?: string;
  attachment?: string;
  thumbnail?: string;
  [key: string]: any;
}