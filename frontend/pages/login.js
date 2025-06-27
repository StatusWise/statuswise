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
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to StatusWise
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Manage your status pages and incidents
            </p>
          </div>
          
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sign in with Google
                </label>
                <div 
                  id="google-signin-button" 
                  className={`w-full ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                ></div>
              </div>
              
              {isLoading && (
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <button
                  onClick={handleManualSignIn}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  disabled={isLoading}
                >
                  Having trouble? Click here to sign in
                </button>
              </div>
            </div>
            
            <div className="mt-6 text-center text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 