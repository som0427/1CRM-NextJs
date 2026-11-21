import React from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';

import Layout from '@/components/layout/Layout';
import { TailwindPageLayout } from '@/components/layout/TailwindPageLayout';
import DetailedActivityReportHeader from '@/components/detailed-activity-report/DetailedActivityReportHeader';
import DetailedActivityReportComponent from '@/components/detailed-activity-report/DetailedActivityReportComponent';
import DetailedActivityTypeModal from '@/components/detailed-activity-report/DetailedActivityTypeModal';
import ApprovalActionModal from '@/components/common/modals/ApprovalActionModal';
import {
  DetailedActivityReportProvider,
  useDetailedActivityReport,
} from '@/contexts/DetailedActivityReportContext';

const DetailedActivityReportPageContent: React.FC = () => {
  const { isDetailsModalOpen, closeDetailsModal } = useDetailedActivityReport();

  return (
    <>
      <TailwindPageLayout header={<DetailedActivityReportHeader />}>
        <div className="flex flex-col h-full">
          <DetailedActivityReportComponent />
        </div>
      </TailwindPageLayout>

      <DetailedActivityTypeModal />
      <ApprovalActionModal open={isDetailsModalOpen} onClose={closeDetailsModal} />
    </>
  );
};

const DetailedActivityReportPage: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Detailed Activity Report | 1Channel</title>
      </Head>

      <DetailedActivityReportProvider>
        <DetailedActivityReportPageContent />
      </DetailedActivityReportProvider>
    </Layout>
  );
};

export default DetailedActivityReportPage;
