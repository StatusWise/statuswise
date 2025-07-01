import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/dashboard')
      return
    }

    // Load Google Identity Services
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: false
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: '100%'
          }
        )
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [router])

  const handleGoogleResponse = async (response) => {
    setError('')
    setIsLoading(true)
    
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        google_token: response.credential
      })
      
      // Store the token and user info
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Google OAuth error:', err)
      
      if (err.response?.status === 401) {
        setError("Google authentication failed. Please try again.")
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.")
      } else if (err.code === 'NETWORK_ERROR') {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Authentication failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt()
    }
  }

  return (
    <>
      <Head>
        <title>Login - StatusWise</title>
        <style>{`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0f172a;
            color: #f1f5f9;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .login-container {
            min-height: 100vh;
            background-color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem 1rem;
          }
          
          .login-card-wrapper {
            max-width: 28rem;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }
          
          .login-header {
            text-align: center;
          }
          
          .login-title {
            margin-top: 1.5rem;
            font-size: 1.875rem;
            font-weight: 800;
            color: #f1f5f9;
            margin-bottom: 0.5rem;
          }
          
          .login-subtitle {
            font-size: 0.875rem;
            color: #94a3b8;
          }
          
          .login-card {
            background-color: #1e293b;
            padding: 2rem 1.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border-radius: 0.5rem;
            border: 1px solid #334155;
          }
          
          .error-container {
            margin-bottom: 1.5rem;
            background-color: #450a0a;
            border: 1px solid #7f1d1d;
            color: #fca5a5;
            padding: 0.75rem 1rem;
            border-radius: 0.375rem;
            border-left: 4px solid #dc2626;
          }
          
          .error-content {
            display: flex;
            align-items: flex-start;
          }
          
          .error-icon {
            flex-shrink: 0;
          }
          
          .error-icon svg {
            height: 1.25rem;
            width: 1.25rem;
            color: #f87171;
          }
          
          .error-text {
            margin-left: 0.75rem;
            font-size: 0.875rem;
          }
          
          .form-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .form-label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #e2e8f0;
            margin-bottom: 0.5rem;
          }
          
          .google-button-container {
            width: 100%;
          }
          
          .loading-container {
            text-align: center;
          }
          
          .loading-content {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            border: 1px solid transparent;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 0.375rem;
            color: #94a3b8;
          }
          
          .loading-spinner {
            animation: spin 1s linear infinite;
            margin-left: -0.25rem;
            margin-right: 0.75rem;
            height: 1rem;
            width: 1rem;
            color: #94a3b8;
          }
          
          .help-container {
            text-align: center;
          }
          
          .help-button {
            font-size: 0.875rem;
            color: #60a5fa;
            font-weight: 500;
            background: transparent;
            border: none;
            cursor: pointer;
            text-decoration: none;
            transition: color 0.2s;
          }
          
          .help-button:hover:not(:disabled) {
            color: #93c5fd;
          }
          
          .help-button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }
          
          .footer-text {
            margin-top: 1.5rem;
            text-align: center;
            font-size: 0.75rem;
            color: #64748b;
          }
          
          .footer-link {
            color: #60a5fa;
            text-decoration: none;
            transition: color 0.2s;
          }
          
          .footer-link:hover {
            color: #93c5fd;
          }
          
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </Head>
      <div className="login-container">
        <div className="login-card-wrapper">
          <div className="login-header">
            <h2 className="login-title">
              Sign in to StatusWise
            </h2>
            <p className="login-subtitle">
              Manage your status pages and incidents
            </p>
          </div>
          
          <div className="login-card">
            {error && (
              <div className="error-container">
                <div className="error-content">
                  <div className="error-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="error-text">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="form-container">
              <div>
                <label className="form-label">
                  Sign in with Google
                </label>
                <div 
                  id="google-signin-button" 
                  className="google-button-container"
                  style={{
                    opacity: isLoading ? 0.5 : 1,
                    pointerEvents: isLoading ? 'none' : 'auto'
                  }}
                ></div>
              </div>
              
              {isLoading && (
                <div className="loading-container">
                  <div className="loading-content">
                    <svg 
                      className="loading-spinner"
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                </div>
              )}
              
              <div className="help-container">
                <button
                  onClick={handleManualSignIn}
                  className="help-button"
                  disabled={isLoading}
                >
                  Having trouble? Click here to sign in
                </button>
              </div>
            </div>
            
            <div className="footer-text">
              By signing in, you agree to our{' '}
              <a href="#" className="footer-link">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="#" className="footer-link">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 