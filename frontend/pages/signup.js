import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Signup() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login since we're using Google OAuth
    router.push('/login')
  }, [router])

  return (
    <>
      <Head>
        <title>Sign Up - StatusWise</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Redirecting to Sign In
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              StatusWise now uses Google OAuth for authentication
            </p>
            <div className="mt-4">
              <svg className="animate-spin h-6 w-6 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 