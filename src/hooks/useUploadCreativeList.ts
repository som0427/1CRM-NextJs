import { useQuery, useQueryClient } from '@tanstack/react-query';
import uploadCreativeService, { UploadCreativeItem, UploadCreativeListResponse } from '@/lib/services/uploadCreativeService';
import { getProjectId } from '@/lib/storage/sharedStorage';

export const UPLOAD_CREATIVE_QUERY_KEY = 'uploadCreativeList';

export const useUploadCreativeList = () => {
  const projectId = getProjectId();

  const query = useQuery<UploadCreativeItem[]>({
    queryKey: [UPLOAD_CREATIVE_QUERY_KEY, projectId],
    queryFn: async ({ signal }) => {
      if (!projectId) {
        return [];
      }

      const response: UploadCreativeListResponse = await uploadCreativeService.getUploadCreativeList(projectId, signal);
      return response.responseData ?? [];
    },
    enabled: !!projectId,
    retry: false,
  });

  return query;
};

export const useInvalidateUploadCreativeList = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: [UPLOAD_CREATIVE_QUERY_KEY] });
  };
};
