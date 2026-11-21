import React, { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import TailwindPageLayout from '@/components/layout/TailwindPageLayout';
import Spinner from '@/components/common/Spinner';
import NoRecordsFound from '@/components/common/NoRecordsFound';
import ContentTopicHeader from '@/components/content-topic/ContentTopicHeader';
import ContentTopicDataGrid from '@/components/content-topic/ContentTopicDataGrid';
import AddEditContentTopic from '@/components/content-topic/sub-components/AddEditContentTopic';
import SequenceDecksModal from '@/components/content-topic/sub-components/SequenceDecksModal';
import { fetchContentTopicList, fetchContentTopicById, ContentTopicDetail } from '@/lib/services/contentTopicService';
import { getProjectId } from '@/lib/storage/sharedStorage';

const ContentTopicPage: React.FC = () => {
  const pageHeading = 'Content Topic';
  const projectId = getProjectId() || 0;

  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Add/Edit modal state — null means closed
  const [editModal, setEditModal] = useState<{ topicId?: number; data: ContentTopicDetail | null } | null>(null);

  // Sequence modal state — null means closed
  const [sequenceModal, setSequenceModal] = useState<{ topicId: number; topicName: string } | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContentTopicList(projectId);
      setTopics(data);
    } catch (e) {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleOpenAddModal = () => setEditModal({ data: null });

  const handleModalClose = () => setEditModal(null);

  const handleModalSuccess = () => {
    setEditModal(null);
    fetchTopics();
  };

  const handleEdit = useCallback(async (id: number) => {
    if (!projectId) return;
    setIsPreloading(true);
    try {
      const detail = await fetchContentTopicById(id, projectId);
      if (detail) {
        setEditModal({ topicId: id, data: detail });
      }
    } catch (error) {
      console.error('Error loading content topic detail:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [projectId]);

  const handleSequence = useCallback((id: number, topicName: string) => {
    setSequenceModal({ topicId: id, topicName });
  }, []);

  const handleSequenceClose = () => setSequenceModal(null);

  return (
    <>
      <Layout>
        <Head>
          <title>{pageHeading} | 1Channel</title>
        </Head>
        <TailwindPageLayout
          header={
            <ContentTopicHeader
              pageHeading={pageHeading}
              handleOpenAddModal={handleOpenAddModal}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          }
        >
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <Spinner />
            ) : topics.length === 0 ? (
              <NoRecordsFound heading={pageHeading} />
            ) : (
              <ContentTopicDataGrid
                data={topics}
                searchText={searchText}
                onEdit={handleEdit}
                onSequence={handleSequence}
              />
            )}
          </div>
        </TailwindPageLayout>
      </Layout>

      {/* Full-screen preloading spinner */}
      {isPreloading && (
        <Spinner version="fixed" blur={true} size="medium" zIndex={100} />
      )}

      <AddEditContentTopic
        open={editModal !== null}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        topicId={editModal?.topicId}
        preloadedData={editModal?.data ?? null}
      />

      <SequenceDecksModal
        open={sequenceModal !== null}
        onClose={handleSequenceClose}
        topicId={sequenceModal?.topicId ?? null}
        topicName={sequenceModal?.topicName ?? ''}
      />
    </>
  );
};

export default ContentTopicPage;
