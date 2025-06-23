import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import Login from '../../pages/login'

// Mock axios
jest.mock('axios')

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter() {
    return {
      push: mockPush,
    }
  },
}))

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders login form', () => {
    render(<Login />)
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  test('shows error on empty fields', async () => {
    render(<Login />)
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByText('Email and password are required')).toBeInTheDocument()
  })

  test('handles successful login', async () => {
    axios.post.mockResolvedValue({
      data: { access_token: 'fake-token' },
    })
    
    render(<Login />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.any(URLSearchParams))
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('handles failed login', async () => {
    axios.post.mockRejectedValue({
      response: { status: 401 },
    })

    render(<Login />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Invalid email or password. Please check your credentials and try again.')).toBeInTheDocument()
  })

  test('shows error on 500 server error', async () => {
    axios.post.mockRejectedValue({ response: { status: 500 } })
    render(<Login />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByText('Server error. Please try again later.')).toBeInTheDocument()
  })

  test('shows error on network error', async () => {
    axios.post.mockRejectedValue({ code: 'NETWORK_ERROR' })
    render(<Login />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
  })

  test('shows error on generic error', async () => {
    axios.post.mockRejectedValue({})
    render(<Login />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(await screen.findByText('Login failed. Please try again.')).toBeInTheDocument()
  })

  test('navigates to signup page when clicking sign up button', () => {
    render(<Login />)
    const signupButton = screen.getByText(/sign up/i)
    fireEvent.click(signupButton)
    expect(mockPush).toHaveBeenCalledWith('/signup')
  })
}) 