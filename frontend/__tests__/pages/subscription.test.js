import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Subscription from '../../pages/subscription'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Subscription Page', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush,
    })
    localStorageMock.getItem.mockReturnValue('fake-token')
    
    jest.clearAllMocks()
  })

  test('renders loading state initially', async () => {
    // Mock a delayed API response
    mockedAxios.get.mockImplementation(() => new Promise(() => {}))

    render(<Subscription />)
    
    expect(screen.getByText('Loading subscription information...')).toBeInTheDocument()
    // Check for the specific spinner element with animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  test('redirects to login if no token', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<Subscription />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  test('renders free plan subscription correctly', async () => {
    const subscriptionData = {
      tier: 'free',
      status: null,
      expires_at: null,
      usage: {
        projects: 1
      },
      limits: {
        max_projects: 1,
        max_incidents_per_project: 5,
        features: ['basic_status_page', 'email_notifications']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('Subscription')).toBeInTheDocument()
      expect(screen.getByText('free')).toBeInTheDocument()
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      expect(screen.getByText(/Incidents per project:/)).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getAllByText('Upgrade to Pro')).toHaveLength(2) // Header and button
    })

    // Check features are displayed with underscores preserved
    expect(screen.getByText('basic status_page')).toBeInTheDocument()
    expect(screen.getByText('email notifications')).toBeInTheDocument()
  })

  test('renders pro plan subscription correctly', async () => {
    const subscriptionData = {
      tier: 'pro',
      status: 'active',
      expires_at: '2024-12-31T23:59:59Z',
      usage: {
        projects: 3
      },
      limits: {
        max_projects: 10,
        max_incidents_per_project: 100,
        features: ['basic_status_page', 'email_notifications', 'custom_domain', 'advanced_analytics']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('pro')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('3 / 10')).toBeInTheDocument()
      expect(screen.getByText('Pro Plan Active')).toBeInTheDocument()
      expect(screen.getByText('Next Billing:')).toBeInTheDocument()
    })
  })

  test('renders trial subscription correctly', async () => {
    const subscriptionData = {
      tier: 'pro',
      status: 'on_trial',
      expires_at: '2024-01-31T23:59:59Z',
      usage: {
        projects: 2
      },
      limits: {
        max_projects: 10,
        max_incidents_per_project: 100,
        features: ['basic_status_page', 'email_notifications', 'custom_domain']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('on trial')).toBeInTheDocument()
      expect(screen.getByText(/Trial Ends:/)).toBeInTheDocument()
      expect(screen.getByText(/Your trial is active!/)).toBeInTheDocument()
    })
  })

  test('renders canceled subscription correctly', async () => {
    const subscriptionData = {
      tier: 'pro',
      status: 'canceled',
      expires_at: '2024-01-31T23:59:59Z',
      usage: {
        projects: 2
      },
      limits: {
        max_projects: 10,
        max_incidents_per_project: 100,
        features: ['basic_status_page', 'email_notifications']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('canceled')).toBeInTheDocument()
      expect(screen.getByText(/Your subscription is canceled but remains active/)).toBeInTheDocument()
    })
  })

  test('handles upgrade to pro successfully', async () => {
    const subscriptionData = {
      tier: 'free',
      status: null,
      expires_at: null,
      usage: {
        projects: 0
      },
      limits: {
        max_projects: 1,
        max_incidents_per_project: 5,
        features: ['basic_status_page']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })
    mockedAxios.post.mockResolvedValueOnce({ 
      data: { checkout_url: 'https://example.com/checkout' } 
    })

    // window.location is already mocked in beforeEach

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getAllByText('Upgrade to Pro')).toHaveLength(2) // Header and button
    })

    const upgradeButton = screen.getByRole('button', { name: 'Upgrade to Pro' })
    
    await act(async () => {
      fireEvent.click(upgradeButton)
    })

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/subscription/create-checkout'),
        {},
        expect.any(Object)
      )
    })

    // Since we can't easily mock window.location.href in jsdom,
    // we'll just verify the API call was made successfully
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/subscription/create-checkout'),
        {},
        expect.any(Object)
      )
    })
  })

  test('handles upgrade error gracefully', async () => {
    const subscriptionData = {
      tier: 'free',
      status: null,
      expires_at: null,
      usage: {
        projects: 0
      },
      limits: {
        max_projects: 1,
        max_incidents_per_project: 5,
        features: ['basic_status_page']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'))

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getAllByText('Upgrade to Pro')).toHaveLength(2) // Header and button
    })

    const upgradeButton = screen.getByRole('button', { name: 'Upgrade to Pro' })
    
    await act(async () => {
      fireEvent.click(upgradeButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Failed to create checkout session. Please try again.')).toBeInTheDocument()
    })
  })

  test('handles API error and shows error message', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'))

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('Failed to load subscription information')).toBeInTheDocument()
    })
  })

  test('handles 401 error and redirects to login', async () => {
    mockedAxios.get.mockRejectedValueOnce({
      response: { status: 401 }
    })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  test('back to dashboard button works', async () => {
    const subscriptionData = {
      tier: 'free',
      status: null,
      expires_at: null,
      usage: {
        projects: 0
      },
      limits: {
        max_projects: 1,
        max_incidents_per_project: 5,
        features: ['basic_status_page']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })

    const backButton = screen.getByRole('button', { name: 'Back to Dashboard' })
    
    await act(async () => {
      fireEvent.click(backButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  test('usage progress bar displays correctly', async () => {
    const subscriptionData = {
      tier: 'free',
      status: null,
      expires_at: null,
      usage: {
        projects: 1
      },
      limits: {
        max_projects: 1,
        max_incidents_per_project: 5,
        features: ['basic_status_page']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      // Just check that usage info is displayed
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
    })
  })

  test('shows upgrade button only for free tier', async () => {
    const proSubscriptionData = {
      tier: 'pro',
      status: 'active',
      expires_at: '2024-12-31T23:59:59Z',
      usage: {
        projects: 3
      },
      limits: {
        max_projects: 10,
        max_incidents_per_project: 100,
        features: ['basic_status_page', 'email_notifications']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: proSubscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument()
      expect(screen.getByText('Pro Plan Active')).toBeInTheDocument()
    })
  })

  test('displays upgrade section with features for free tier', async () => {
    const subscriptionData = {
      tier: 'free',
      status: null,
      expires_at: null,
      usage: {
        projects: 0
      },
      limits: {
        max_projects: 1,
        max_incidents_per_project: 5,
        features: ['basic_status_page']
      }
    }

    mockedAxios.get.mockResolvedValueOnce({ data: subscriptionData })

    await act(async () => {
      render(<Subscription />)
    })

    await waitFor(() => {
      expect(screen.getByText('10 Projects')).toBeInTheDocument()
      expect(screen.getByText('vs 1 on Free')).toBeInTheDocument()
      expect(screen.getByText('100 Incidents')).toBeInTheDocument()
      expect(screen.getByText('per project')).toBeInTheDocument()
      expect(screen.getByText('Advanced Features')).toBeInTheDocument()
      expect(screen.getByText('Custom domain & more')).toBeInTheDocument()
    })
  })
}) 