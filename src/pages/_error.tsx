import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <Head>
        <title>Error {statusCode ? `${statusCode}` : ''} | 1Channel</title>
      </Head>
      
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          {statusCode
            ? `Error ${statusCode}`
            : 'An error occurred'}
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          {statusCode
            ? `A server-side error occurred`
            : 'A client-side error occurred'}
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
