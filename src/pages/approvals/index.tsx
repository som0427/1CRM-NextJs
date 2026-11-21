import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import ApprovalsList from '../../components/approvals/ApprovalsList';

const Approvals: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Approvals | 1Channel</title>
      </Head>
      
      <TailwindPageLayout>
        <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 95px)' }}>
          <ApprovalsList />
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default Approvals;
