import React, { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { LoginErrorType, LoginError } from '../../lib/api/authApi';
import { useAuth } from '../../lib/auth';
import Footer from '../../components/layout/Footer';
import ProjectSelectionModal from '../../components/auth/ProjectSelectionModal';
import ConfirmLoginModal from '../../components/auth/ConfirmLoginModal';
import authService from '../../lib/services/authService';
import styles from '../../styles/Login.module.css';



// Error type for login errors
enum ErrorSource {
  API = 'api',
  VALIDATION = 'validation',
  NETWORK = 'network'
}

const Login: NextPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorSource, setErrorSource] = useState<ErrorSource | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const { login: authLogin, getUserMenu } = useAuth();
  
  // State for project selection modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [userDetail, setUserDetail] = useState<any>(null);
  
  // State for confirm login modal (409 conflict)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Ref for form and to mimic Angular's ChangeDetectorRef
  const formRef = useRef<HTMLFormElement>(null);
  
  // Form validation touched state
  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  
  // Return URL for redirect after login
  const [returnUrl, setReturnUrl] = useState('/');

  // Check if query params have a returnUrl
  useEffect(() => {
    const { returnUrl } = router.query;
    if (returnUrl && typeof returnUrl === 'string') {
      setReturnUrl(returnUrl);
    }
  }, [router.query]);
  
  // Auto-hide error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
        setErrorSource(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // Function to check if a form control has error (matching Angular's isControlHasError)
  const isControlHasError = (controlName: string, validationType: string): boolean => {
    const control = {
      email: { value: email, touched: touched.email },
      password: { value: password, touched: touched.password }
    }[controlName];
    
    if (!control) {
      return false;
    }
    
    // Only show errors for touched fields
    if (!control.touched) {
      return false;
    }
    
    // Check different validation types
    switch (validationType) {
      case 'required':
        return control.value.trim() === '';
      case 'email':
        // Only show email format error if field is not empty and format is invalid
        return controlName === 'email' && control.value.trim() !== '' && !/^\S+@\S+\.\S+$/.test(control.value);
      case 'minlength':
        return control.value.length < 3;
      case 'maxlength':
        return controlName === 'email' ? control.value.length > 320 : control.value.length > 100;
      default:
        return false;
    }
  };
  
  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return email.trim() !== '' && emailRegex.test(email);
  };
  
  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setIsEmailValid(validateEmail(newEmail));
  };
  
  // Mark a field as touched (for validation display)
  const markAsTouched = (field: 'email' | 'password') => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Function to select project (matching Angular's selectProject)
  const selectProject = (user: any) => {
    setUserDetail(user);
    setShowProjectModal(true);
  };
  
  // Handle project modal close
  const handleProjectModalClose = () => {
    setShowProjectModal(false);
  };
  
  // Handle confirm login modal actions
  const handleConfirmLogin = () => {
    setShowConfirmModal(false);
    submitLogin(true); // Pass true to indicate it's a confirmation login
  };
  
  const handleCancelLogin = () => {
    setShowConfirmModal(false);
    setLoading(false);
  };

  // Handle API response (similar to Angular handleApiResponse)
  const handleApiResponse = (res: any) => {
    if (res) {
      // Create user object and populate with response data
      const userObj = res.user || {};

      // Set token in user object
      userObj.token = res.token || res.accessToken;
      console.log(userObj);
      
      // Store token information
      sessionStorage.setItem('accessToken', userObj.token);
      localStorage.setItem('authToken', userObj.token);
      
      // Store base URL if available (matching Angular implementation)
      if (res.appServerUrl) {
        localStorage.setItem('baseUrl', res.appServerUrl);
      }

      // Create simplified user data for UserInfo component
      const userData = {
        name: userObj.firstName && userObj.lastName ? `${userObj.firstName} ${userObj.lastName}` : userObj.fullName || userObj.name || 'User',
        email: userObj.personalEmail || userObj.emailId || userObj.email || userObj.userId || '',
        id: userObj.userId || '',
        role: userObj.role || ''
      };
      
      // Store user data for reference
      localStorage.setItem('userData', JSON.stringify(userObj));
      localStorage.setItem('userInfo', JSON.stringify(userData));
      
      // Store defaultProjectId for direct access across the app
      if (userObj.defaultProjectId) {
        localStorage.setItem('selectedProject', userObj.defaultProjectId.toString());
      }
      
      // Always show project selection modal (matching Angular implementation)
      selectProject(userObj);
    } else {
      setError('Invalid login response');
      setErrorSource(ErrorSource.API);
    }
  };

  // Main form submit function (matching Angular's submit)
  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    submitLogin();
  };
  
  // Login submission function with optional confirmation flag
  const submitLogin = async (isConfirmation: boolean = false) => {
    // Mark all fields as touched for validation
    setTouched({
      email: true,
      password: true
    });
    
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      setErrorSource(ErrorSource.VALIDATION);
      return;
    }
    
    // Email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      setErrorSource(ErrorSource.VALIDATION);
      return;
    }
    
    setLoading(true);
    setError('');
    setErrorSource(null);
    
    try {
      // Call login API with the correct parameters
      // isConfirmation is a boolean, but the method expects a retry count number
      const retryCount = isConfirmation ? 1 : 0;
      const userData = await authService.login(email, password, retryCount);
      
      // Handle successful login
      if (userData) {
        handleApiResponse(userData);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error types
      if (error && error.statusCode === 409) {
        // User already logged in on another device - show confirmation modal
        setShowConfirmModal(true);
      } else if (error && error.message) {
        // Show the error message from the service
        setError(error.message);
      } else {
        // Default error message
        setError('Login failed. Please check your credentials and try again.');
      }
      
      setErrorSource(ErrorSource.API);
      setLoading(false);
    }
  };

  // Open forgot password dialog (matching Angular's openForgotPasswordDialog)
  const openForgotPasswordDialog = () => {
    // Handle forgot password redirect
    router.push('/auth/forgot-password');
  };

  // For component cleanup (matching Angular's ngOnDestroy)
  useEffect(() => {
    return () => {
      // Clear any error notifications on component unmount
      setError('');
      setLoading(false);
    };
  }, []);

  // Initialize form
  useEffect(() => {
    // Set default values and initialize form
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    setErrorSource(null);
    setTouched({
      email: false,
      password: false
    });
  }, []);

  return (
    <>
      <Head>
        <title>Login | 1Channel CRM</title>
        <meta name="description" content="Login to your account" />
      </Head>
      
      {/* Project Selection Modal */}
      {showProjectModal && userDetail && (
        <ProjectSelectionModal 
          userDetail={userDetail}
          selectionFlag="Login"
          onClose={handleProjectModalClose}
        />
      )}
      
      {/* Confirm Login Modal */}
      {showConfirmModal && (
        <ConfirmLoginModal
          onConfirm={handleConfirmLogin}
          onCancel={handleCancelLogin}
        />
      )}
      
      {/* Beautiful Modern Login Design */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 right-0 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-10 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-40 left-40 w-60 h-60 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
        </div>

        {/* Login Card */}
        <div className="relative bg-white backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md z-10 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-3xl"></div>
          
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <Image
                src="/logos/assistive_logo-200.png"
                alt="1Channel Logo"
                width={56}
                height={56}
                priority
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Welcome to 1Channel
            </h1>
            <p className="text-gray-600 text-sm">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={(e) => submit(e)} className="space-y-6" ref={formRef}>
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
                <span>Email Address</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-0 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                    loading 
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => markAsTouched('email')}
                  placeholder="Enter your email address"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              {isControlHasError('email', 'required') && (
                <p className="text-red-500 text-xs flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Email is required</span>
                </p>
              )}
              {isControlHasError('email', 'email') && (
                <p className="text-red-500 text-xs flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Please enter a valid email</span>
                </p>
              )}
            </div>
            
            {/* Password Field - Only show when email is valid */}
            <div className={`space-y-2 transition-all duration-500 ease-in-out transform ${
              isEmailValid 
                ? 'opacity-100 translate-y-0 max-h-96' 
                : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden'
            }`}>
              <label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-0 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-500 pr-12 ${
                    loading 
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markAsTouched('password')}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
                    loading 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {isControlHasError('password', 'required') && (
                <p className="text-red-500 text-xs flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Password is required</span>
                </p>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Request Demo Link */}
          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">New to 1Channel?</span>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="https://www.1channel.co/contact-us"
                target='_blank'
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors group cursor-pointer"
              >
                <span>Request a Demo</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0">
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Login;
