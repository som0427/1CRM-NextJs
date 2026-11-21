import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import PointBalanceReportHeader from '@/components/point-balance-report/PointBalanceReportHeader';
import PointBalanceReportComponent from '@/components/point-balance-report/PointBalanceReportComponent';
import { PointBalanceReportProvider } from '@/contexts/PointBalanceReportContext';

const PointBalanceReport: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Point Balance Report | 1Channel</title>
      </Head>
      
      <PointBalanceReportProvider>
        <TailwindPageLayout
          header={<PointBalanceReportHeader />}
        >
          <div className="flex flex-col h-full">
            <PointBalanceReportComponent />
          </div>
        </TailwindPageLayout>
      </PointBalanceReportProvider>
    </Layout>
  );
};

export default PointBalanceReport;
