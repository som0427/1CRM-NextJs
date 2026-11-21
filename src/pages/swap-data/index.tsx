import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import { TailwindPageLayout } from '@/components/layout/TailwindPageLayout';
import SwapDataHeader from '@/components/swap-data/SwapDataHeader';
import SwapDataContainer from '@/components/swap-data/SwapDataContainer';


const SwapData: NextPage = () => {
  const pageHeading = 'Swap Data';

  return (
    <Layout>
      <Head>
        <title>Swap Data | 1Channel</title>
      </Head>
      <TailwindPageLayout
        header={<SwapDataHeader pageHeading={pageHeading} />}>
        <div className="pt-2 h-full flex min-h-0 overflow-hidden">
          <SwapDataContainer />
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default SwapData;
