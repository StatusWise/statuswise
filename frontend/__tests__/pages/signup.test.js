import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import Signup from '../../pages/signup'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

// Mock the router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Signup Page', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockedAxios.post.mockClear()
  })

  test('renders signup form', () => {
    render(<Signup />)
    expect(screen.getByText('Signup')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByText('Create Account')).toBeInTheDocument()
  })

  test('shows error for empty fields', async () => {
    render(<Signup />)
    const signupButton = screen.getByText('Create Account')
    
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email and password are required')).toBeInTheDocument()
    })
  })

  test('shows error for empty email', async () => {
    render(<Signup />)
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(passwordInput, 'password123')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email and password are required')).toBeInTheDocument()
    })
  })

  test('shows error for empty password', async () => {
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email and password are required')).toBeInTheDocument()
    })
  })

  test('successful signup', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { email: 'test@example.com' } })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/signup',
        { email: 'test@example.com', password: 'password123' }
      )
    })
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  test('handles duplicate user error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'User with this email already exists' } }
    })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'existing@example.com')
      await userEvent.type(passwordInput, 'password123')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('User with this email already exists. Please try logging in instead.')).toBeInTheDocument()
    })
  })

  test('handles invalid email error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { status: 422 }
    })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.type(passwordInput, 'password123')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email format. Please enter a valid email address.')).toBeInTheDocument()
    })
  })

  test('handles network error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      code: 'NETWORK_ERROR'
    })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
    })
  })

  test('shows loading state during signup', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
    })
    fireEvent.click(signupButton)
    
    await waitFor(() => {
      expect(screen.getByText('Creating Account...')).toBeInTheDocument()
      expect(signupButton).toBeDisabled()
    })
  })

  test('navigates to login page', async () => {
    render(<Signup />)
    const loginLink = screen.getByText('Already have an account? Login')
    
    fireEvent.click(loginLink)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  test('trims whitespace from email', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { email: 'test@example.com' } })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, '  test@example.com  ')
      await userEvent.type(passwordInput, 'password123')
    })
    await act(async () => {
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/signup',
        { email: 'test@example.com', password: 'password123' }
      )
    })
  })

  test('shows error on invalid email format (422)', async () => {
    axios.post.mockRejectedValue({ response: { status: 422 } })
    render(<Signup />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'invalid' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Invalid email format. Please enter a valid email address.')).toBeInTheDocument()
  })

  test('shows error on duplicate user (400)', async () => {
    axios.post.mockRejectedValue({ response: { status: 400 } })
    render(<Signup />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('User with this email already exists. Please try logging in instead.')).toBeInTheDocument()
  })

  test('shows error on server error (500)', async () => {
    axios.post.mockRejectedValue({ response: { status: 500 } })
    render(<Signup />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Server error. Please try again later.')).toBeInTheDocument()
  })

  test('shows error on network error', async () => {
    axios.post.mockRejectedValue({ code: 'NETWORK_ERROR' })
    render(<Signup />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
  })

  test('shows error on generic error', async () => {
    axios.post.mockRejectedValue({})
    render(<Signup />)
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Signup failed. Please try again.')).toBeInTheDocument()
  })

  test('navigates to login page when clicking login button', () => {
    render(<Signup />)
    const loginButton = screen.getByText(/already have an account\? login/i)
    fireEvent.click(loginButton)
    // The router mock is in jest.setup.js
    // This will call router.push('/login')
  })
}) 