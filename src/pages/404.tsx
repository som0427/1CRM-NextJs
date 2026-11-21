import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

const NotFound: NextPage = () => {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <>
      <Head>
        <title>Page Not Found | 1Channel</title>
        <meta name="description" content="The page you're looking for doesn't exist" />
      </Head>

      {/* Beautiful Modern 404 Design */}
      <div className="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-40 left-40 w-60 h-60 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>

          {/* Interactive floating elements */}
          <div
            className="absolute w-4 h-4 bg-blue-400 rounded-full opacity-30 transition-all duration-1000 ease-out"
            style={{
              left: mousePosition.x * 0.02 + 100,
              top: mousePosition.y * 0.02 + 100,
            }}
          ></div>
          <div
            className="absolute w-6 h-6 bg-indigo-400 rounded-full opacity-20 transition-all duration-1500 ease-out"
            style={{
              right: mousePosition.x * 0.01 + 150,
              bottom: mousePosition.y * 0.01 + 150,
            }}
          ></div>
        </div>

        {/* Main Content Card */}
        <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-4 w-full max-w-2xl text-center">
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-3xl"></div>

          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <Image
                src="/logos/assistive_logo-200.png"
                alt="1Channel Logo"
                width={56}
                height={56}
                priority
              />
            </div>
          </div>

          {/* Animated 404 Text */}
          <div className="mb-8">
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4 animate-pulse">
              404
            </h1>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Oops! Page Not Found
              </h2>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-10">
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              The page you're looking for seems to have wandered off into the digital void.
            </p>
            <p className="text-base text-gray-500">
              Don't worry, even the best explorers sometimes take a wrong turn!
            </p>
          </div>

          {/* Interactive Illustration */}
          <div className="mb-10">
            <div
              className="inline-block p-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl transition-transform duration-300 hover:scale-105 cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <div className="relative">
                {/* Animated Search Icon */}
                <svg
                  className={`w-24 h-24 text-blue-500 transition-all duration-500 ${isHovering ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
                    }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {/* Floating question marks */}
                <div className={`absolute -top-2 -right-2 text-2xl transition-all duration-700 ${isHovering ? 'opacity-100 transform rotate-12 scale-125' : 'opacity-60 transform rotate-0 scale-100'
                  }`}>
                  ❓
                </div>
                <div className={`absolute -bottom-1 -left-2 text-lg transition-all duration-500 delay-200 ${isHovering ? 'opacity-100 transform -rotate-12 scale-110' : 'opacity-40 transform rotate-0 scale-100'
                  }`}>
                  ❓
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGoBack}
              className="group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Go Back</span>
            </button>


          </div>

          {/* Fun fact */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 italic">
              💡 Fun fact: The first 404 error was at CERN in 1992!
            </p>
          </div>
        </div>


      </div>
    </>
  );
};

export default NotFound;
