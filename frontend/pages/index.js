import React from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">StatusWise</h1>
        <p className="text-xl mb-8">Simple incident management for your projects</p>
        <div className="space-x-4">
          <button 
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            onClick={() => router.push('/login')}
          >
            Login
          </button>
          <button 
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
            onClick={() => router.push('/signup')}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}