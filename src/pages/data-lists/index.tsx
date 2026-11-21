import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import environment from '../../../environment';

const DataLists: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Data Lists | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
        header={
          <div className="flex flex-col space-y-4 bg-white px-2 py-2 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800">Data Lists</h1>
              </div>
              <div className="flex items-center space-x-3">
                {/* You can add action buttons here */}
              </div>
            </div>
          </div>
        }
      >
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Lists</h2>
            <p className="text-gray-600">This section is being upgraded, click <a href={environment.NEXT_PUBLIC_ANGULAR_URL+"/data-lists"} className="text-blue-500 hover:underline">here</a> for using old portal.</p>
          </div>
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default DataLists;
