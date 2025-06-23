import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useRouter } from 'next/router'

// Zod schema for signup validation
const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform(val => val.trim().toLowerCase()),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long')
})

export default function Signup() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFieldError
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur' // Validate on blur for better UX
  })

  const onSubmit = async (data) => {
    setError('')
    setIsLoading(true)
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/signup`, data)
      alert("Signup successful. Please login.")
      router.push('/login')
    } catch (err) {
      if (err.response?.status === 422) {
        const detail = err.response.data?.detail
        if (Array.isArray(detail)) {
          // Handle validation errors from backend
          detail.forEach(error => {
            const field = error.loc?.[error.loc.length - 1]
            if (field && ['email', 'password'].includes(field)) {
              setFieldError(field, { message: error.msg })
            }
          })
        } else {
          setError("Invalid input. Please check your email and password.")
        }
      } else if (err.response?.status === 400) {
        setError("User with this email already exists. Please try logging in instead.")
      } else if (err.response?.status >= 500) {
        setError("Server error. Please try again later.")
      } else if (err.code === 'NETWORK_ERROR') {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Signup failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isFormDisabled = isLoading || isSubmitting

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-10 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Signup</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <input 
              type="email" 
              placeholder="Email" 
              className={`border p-2 w-full ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isFormDisabled}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <input 
              type="password" 
              placeholder="Password (min 6 characters)" 
              className={`border p-2 w-full ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              disabled={isFormDisabled}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>
          
          <button 
            type="submit"
            className={`w-full py-2 rounded text-white ${isFormDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`} 
            disabled={isFormDisabled}
          >
            {isFormDisabled ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="text-center mt-4">
          <button 
            className="text-blue-500 hover:text-blue-700"
            onClick={() => router.push('/login')}
            disabled={isFormDisabled}
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  )
} 