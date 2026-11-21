import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const ServerError: NextPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <Head>
        <title>Server Error | 1Channel</title>
      </Head>
      
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">Server Error</h2>
        <p className="text-xl text-gray-600 mb-8">
          Sorry, something went wrong on our server.
        </p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 transition-colors cursor-pointer">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default ServerError;
