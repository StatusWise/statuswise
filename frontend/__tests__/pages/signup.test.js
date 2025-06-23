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
    expect(screen.getByPlaceholderText('Password (min 6 characters)')).toBeInTheDocument()
    expect(screen.getByText('Create Account')).toBeInTheDocument()
  })

  test('shows validation error for empty email on form submission', async () => {
    render(<Signup />)
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })
  })

  test('shows validation error for empty password on form submission', async () => {
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  test('shows validation error for invalid email format', async () => {
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  test('shows validation error for short password', async () => {
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, '123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
    })
  })

  test('successful signup', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { email: 'test@example.com' } })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/signup'),
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
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'existing@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('User with this email already exists. Please try logging in instead.')).toBeInTheDocument()
    })
  })

  test('handles backend validation errors (422)', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: { 
        status: 422,
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'Invalid email format' },
            { loc: ['body', 'password'], msg: 'Password too short' }
          ]
        }
      }
    })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
      expect(screen.getByText('Password too short')).toBeInTheDocument()
    })
  })

  test('handles network error', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      code: 'NETWORK_ERROR'
    })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
    })
  })

  test('shows loading state during signup', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
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

  test('trims and lowercases email on submission', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { email: 'test@example.com' } })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, '  TEST@EXAMPLE.COM  ')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/signup'),
        { email: 'test@example.com', password: 'password123' }
      )
    })
  })

  test('handles server error (500)', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 500 } })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Server error. Please try again later.')).toBeInTheDocument()
    })
  })

  test('handles generic error', async () => {
    mockedAxios.post.mockRejectedValue({})
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Signup failed. Please try again.')).toBeInTheDocument()
    })
  })

  test('supports form submission with Enter key', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { email: 'test@example.com' } })
    
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    
    await act(async () => {
      await userEvent.type(emailInput, 'test@example.com')
      await userEvent.type(passwordInput, 'password123')
      // Press Enter on the password field to submit
      await userEvent.keyboard('{Enter}')
    })
    
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/signup'),
        { email: 'test@example.com', password: 'password123' }
      )
    })
  })

  test('shows field-specific validation styling', async () => {
    render(<Signup />)
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password (min 6 characters)')
    const signupButton = screen.getByText('Create Account')
    
    await act(async () => {
      await userEvent.type(emailInput, 'invalid')
      await userEvent.type(passwordInput, '123')
      fireEvent.click(signupButton)
    })
    
    await waitFor(() => {
      expect(emailInput).toHaveClass('border-red-500')
      expect(passwordInput).toHaveClass('border-red-500')
    })
  })
}) 