import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import communityService from '@/lib/services/communityService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import DownloadActionButton from '@/components/common/buttons/action-button/DownloadActionButton';
import DeleteActionButton from '@/components/common/buttons/action-button/DeleteActionButton';

interface CommunityActionsCellRendererProps {
  params: any;
  onCommunityEdit: (contact: any) => void;
}

const CommunityActionsCellRenderer: React.FC<CommunityActionsCellRendererProps> = ({
  params,
  onCommunityEdit,
}) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const projectId = getProjectId() || 0;
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const data = params.data;
  if (!data) {
    return null;
  }

  // Handler for action buttons
  const handleAction = async (action: string) => {
    switch (action) {
      case 'edit':
        if (onCommunityEdit) {
          onCommunityEdit(data);
        }
        break;
      case 'download': {
        try {
          if (downloading) return;
          if (!projectId) {
            enqueueSnackbar('Project not selected', { variant: 'error' });
            return;
          }
          setDownloading(true);
          const postId = data.postId;
          const resp = await communityService.downloadPost(projectId, postId);
          const url: string | undefined = resp?.responseData;
          if (!url) {
            enqueueSnackbar('Download link not available', { variant: 'error' });
            setDownloading(false);
            return;
          }
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          try {
            link.download = new URL(url).pathname.split('/').pop() || 'download';
          } catch {
            link.download = 'download';
          }
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setDownloading(false);
        } catch (e: any) {
          enqueueSnackbar(e?.message || 'Unable to download post. Please try again.', { variant: 'error' });
          setDownloading(false);
        }
        break;
      }
      case 'delete': {
        try {
          if (deleting) return;
          if (!projectId) {
            enqueueSnackbar('Project not selected', { variant: 'error' });
            return;
          }
          const confirmed = window.confirm('Are you sure you want to delete this post?');
          if (!confirmed) return;
          setDeleting(true);
          const postId = data.postId;
          const resp = await communityService.deletePost(projectId, postId);
          if (resp && resp.statusCode && resp.statusCode >= 400) {
            enqueueSnackbar('Unable to delete post. Please try again.', { variant: 'error' });
            setDeleting(false);
            return;
          }
          enqueueSnackbar('Post deleted successfully', { variant: 'success' });
          if (params?.api && params?.node) {
            params.api.applyTransaction({ remove: [params.node.data] });
          }
          setDeleting(false);
        } catch (e: any) {
          enqueueSnackbar(e?.message || 'Unable to delete post. Please try again.', { variant: 'error' });
          setDeleting(false);
        }
        break;
      }
    }
  };

  return (
    <div 
      className="flex items-center justify-end pr-2"
      style={{ 
        width: '100%',
        justifyContent: 'flex-end',
        textAlign: 'right' 
      }}
    >
        <DownloadActionButton 
          id={params.data.postId}
          onClick={() => handleAction('download')}
          loading={downloading}
          disabled={deleting}
          className="space-between-icon"
        />

        <DeleteActionButton
          id={params.data.postId}
          onClick={() => handleAction('delete')}
          loading={deleting}
          disabled={downloading}
          className="space-between-icon"
        />
    </div>
  );
};

export default CommunityActionsCellRenderer;
