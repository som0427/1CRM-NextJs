import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import Head from "next/head";
import Layout from "../../components/layout/Layout";
import { TailwindPageLayout } from "../../components/layout/TailwindPageLayout";
import Spinner from "@/components/common/Spinner";

const WorkflowDetails: NextPage = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <Head>
          <title>Workflow Actions | 1Channel</title>
        </Head>
        <Spinner blur={true} zIndex={9999} version="fixed" customLoadingName="Loading Workflow Actions..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Workflow Actions | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <div className="flex flex-col space-y-4 bg-white px-2 py-2 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800">Workflow Actions</h1>
              </div>
              <div className="flex items-center space-x-3">
              </div>
            </div>
          </div>
        }
      >
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Workflow Actions</h2>
            <p className="text-gray-600">This section is being upgraded, click <a href="/workflows" className="text-blue-500 hover:underline">here</a> for using old portal.</p>
          </div>
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default WorkflowDetails;
