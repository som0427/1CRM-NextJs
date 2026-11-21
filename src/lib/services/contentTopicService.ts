import apiClient from './apiClient';

export interface ContentTopicItem {
  id: number;
  topicName: string;
  description: string;
  status: number;
  createdBy: number;
  createdByName: string;
  createdOn: string;
}

export interface ContentTopicDetail {
  id: number;
  topicName: string;
  description: string;
  status: number;
  certificateTemplateUrl: string | null;
  thumbnailUrl: string | null;
}

export interface SaveContentTopicPayload {
  id?: number | null;
  topicName: string;
  description: string;
  status: number;
  certificateTemplateUrl: string | null;
  thumbnailUrl: string;
}

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  responseData: T;
}

export async function fetchContentTopicList(projectId: number, signal?: AbortSignal): Promise<ContentTopicItem[]> {
  try {
    const response = await apiClient.get<ApiResponse<ContentTopicItem[]>>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/contentTopics?projectId=${projectId}`,
      undefined,
      { signal }
    );

    if (response.statusCode === 200) {
      return response.responseData ?? [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching content topic list:', error);
    return [];
  }
}

export async function fetchContentTopicById(topicId: number, projectId: number): Promise<ContentTopicDetail | null> {
  try {
    const response = await apiClient.get<ApiResponse<ContentTopicDetail>>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/contentTopics/${topicId}?projectId=${projectId}`
    );

    if (response.statusCode === 200) {
      return response.responseData ?? null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching content topic by id:', error);
    return null;
  }
}

export async function saveContentTopic(payload: SaveContentTopicPayload & { projectId: number }): Promise<any> {
  try {
    const response = await apiClient.post<ApiResponse<any>>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/contentTopics`,
      payload
    );

    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.responseData;
    }
    return null;
  } catch (error) {
    console.error('Error saving content topic:', error);
    throw error;
  }
}
