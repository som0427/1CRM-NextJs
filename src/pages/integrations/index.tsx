import React, { useRef, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import IntegrationsMain, { IntegrationsMainRef } from '../../components/integrations/IntegrationsMain';

const Integrations: NextPage = () => {
  const integrationsRef = useRef<IntegrationsMainRef>(null);

  return (
    <Layout>
      <Head>
        <title>Integrations | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
        header={
          <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800">Integrations</h1>
              </div>
            </div>
          </div>
        }
      >
        <div>
          <IntegrationsMain ref={integrationsRef} />
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default Integrations;
