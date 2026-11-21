import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchContentTopicList, ContentTopicItem } from '@/lib/services/contentTopicService';
import { getProjectId } from '@/lib/storage/sharedStorage';

export const CONTENT_TOPIC_QUERY_KEY = 'contentTopicList';

export const useContentTopicList = () => {
  const projectId = getProjectId();

  const query = useQuery<ContentTopicItem[]>({
    queryKey: [CONTENT_TOPIC_QUERY_KEY, projectId],
    queryFn: async ({ signal }) => {
      if (!projectId) {
        return [];
      }
      return fetchContentTopicList(projectId, signal);
    },
    enabled: !!projectId,
    retry: false,
  });

  return query;
};

export const useInvalidateContentTopicList = () => {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: [CONTENT_TOPIC_QUERY_KEY] });
  };
};
