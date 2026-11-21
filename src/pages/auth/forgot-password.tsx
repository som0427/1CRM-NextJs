import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { requestPasswordReset } from '../../lib/api/authApi';
import styles from '../../styles/Login.module.css';
import { NextPage } from 'next';

const ForgotPassword: NextPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    setError('');
  };

  const validateForm = (): boolean => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await requestPasswordReset(email);
      setIsSuccess(true);
    } catch (error) {
      console.error('Password reset request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage || 'Failed to send password reset email. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password - {process.env.NEXT_PUBLIC_APP_NAME || 'Assistive'}</title>
        <meta name="description" content="Reset your password" />
      </Head>
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <div className={styles.logoContainer}>
            <Image
              src="/logos/assistive_logo.png"
              alt="Assistive Logo"
              width={180}
              height={60}
              priority
            />
          </div>
          
          {isSuccess ? (
            <>
              <h1 className={styles.title}>Email Sent</h1>
              <p className={styles.subtitle}>
                If an account exists with this email, you will receive password reset instructions.
              </p>
              <div className={styles.formActions} style={{ justifyContent: 'center', marginTop: '2rem' }}>
                <Link href="/login" className={`${styles.loginButton} cursor-pointer`}>
                  Back to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Forgot Password</h1>
              <p className={styles.subtitle}>
                Enter your email address and we'll send you instructions to reset your password.
              </p>
              
              {error && (
                <div className={styles.errorAlert}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleChange}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    placeholder="Your email"
                    autoComplete="email"
                  />
                </div>
                
                <div className={styles.formActions} style={{ justifyContent: 'space-between', marginTop: '2rem' }}>
                  <Link href="/login" className={`${styles.forgotLink} cursor-pointer`}>
                    Back to Login
                  </Link>
                  
                  <button 
                    type="submit" 
                    className={styles.loginButton}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
