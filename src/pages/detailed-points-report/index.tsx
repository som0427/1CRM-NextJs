import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import DetailedPointsReportHeader from '@/components/detailed-points-report/DetailedPointsReportHeader';
import DetailedPointsReportComponent from '@/components/detailed-points-report/DetailedPointsReportComponent';
import { DetailedPointsReportProvider } from '@/contexts/DetailedPointsReportContext';

const DetailedPointsReport: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Detailed Points Report | 1Channel</title>
      </Head>
      
      <DetailedPointsReportProvider>
        <TailwindPageLayout
          header={<DetailedPointsReportHeader />}
        >
          <div className="flex flex-col h-full">
            <DetailedPointsReportComponent />
          </div>
        </TailwindPageLayout>
      </DetailedPointsReportProvider>
    </Layout>
  );
};

export default DetailedPointsReport;