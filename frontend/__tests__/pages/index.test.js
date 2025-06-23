import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Home from '../../pages/index'

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: '',
      asPath: '',
      push: mockPush,
    }
  },
}))

describe('Home Page', () => {
  test('renders the main heading', () => {
    render(<Home />)
    expect(screen.getByText('StatusWise')).toBeInTheDocument()
  })

  test('renders signup button', () => {
    render(<Home />)
    const signupButton = screen.getByText('Sign Up')
    expect(signupButton).toBeInTheDocument()
  })

  test('renders login button', () => {
    render(<Home />)
    const loginButton = screen.getByText('Login')
    expect(loginButton).toBeInTheDocument()
  })

  test('signup button navigates to signup page', () => {
    render(<Home />)
    const signupButton = screen.getByText('Sign Up')
    fireEvent.click(signupButton)
    expect(mockPush).toHaveBeenCalledWith('/signup')
  })

  test('login button navigates to login page', () => {
    render(<Home />)
    const loginButton = screen.getByText('Login')
    fireEvent.click(loginButton)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  test('has proper styling classes', () => {
    render(<Home />)
    const container = screen.getByText('StatusWise').closest('div.text-center')
    expect(container).toBeInTheDocument()

    const heading = screen.getByText('StatusWise')
    expect(heading).toHaveClass('text-4xl', 'font-bold', 'mb-4')

    const paragraph = screen.getByText(/Simple incident management/)
    expect(paragraph).toHaveClass('text-xl', 'mb-8')
  })
}) 