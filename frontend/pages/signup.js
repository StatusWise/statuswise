import React, { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async () => {
    setError('')
    
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true)
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/signup`, { 
        email: email.trim(), 
        password 
      })
      alert("Signup successful. Please login.")
      router.push('/login')
    } catch (err) {
      if (err.response?.status === 422) {
        setError("Invalid email format. Please enter a valid email address.");
      } else if (err.response?.status === 400) {
        setError("User with this email already exists. Please try logging in instead.");
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.");
      } else if (err.code === 'NETWORK_ERROR') {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-10 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Signup</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <input 
          type="email" 
          placeholder="Email" 
          className="border p-2 w-full mb-4" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="border p-2 w-full mb-4" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <button 
          className={`w-full py-2 rounded text-white ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`} 
          onClick={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
        
        <div className="text-center mt-4">
          <button 
            className="text-blue-500 hover:text-blue-700"
            onClick={() => router.push('/login')}
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  )
} 