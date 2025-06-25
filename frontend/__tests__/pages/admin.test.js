import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import axios from 'axios'
import { useRouter } from 'next/router'
import AdminDashboard from '../../pages/admin'

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

// Mock moment
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment')
  return (date) => ({
    format: (format) => {
      if (format === 'MMM DD, YYYY') return 'Jan 01, 2023'
      if (format === 'MMM DD, YYYY HH:mm') return 'Jan 01, 2023 12:00'
      if (format === 'LLL') return 'January 1, 2023 12:00 PM'
      return actualMoment(date).format(format)
    }
  })
})

describe('Admin Dashboard', () => {
  const mockPush = jest.fn()
  
  const mockStats = {
    total_users: 10,
    active_users: 8,
    pro_subscribers: 3,
    free_users: 7,
    total_projects: 15,
    total_incidents: 25,
    unresolved_incidents: 5
  }
  
  const mockUsers = [
    {
      id: 1,
      email: 'admin@example.com',
      is_active: true,
      is_admin: true,
      subscription_tier: 'pro',
      subscription_status: 'active',
      created_at: '2023-01-01T00:00:00Z'
    },
    {
      id: 2,
      email: 'user@example.com',
      is_active: true,
      is_admin: false,
      subscription_tier: 'free',
      subscription_status: null,
      created_at: '2023-01-02T00:00:00Z'
    }
  ]
  
  const mockSubscriptions = [
    {
      id: 1,
      user_email: 'pro@example.com',
      tier: 'pro',
      status: 'active',
      lemonsqueezy_customer_id: 'cus_123',
      trial_ends_at: null,
      billing_anchor: '2023-02-01T00:00:00Z',
      created_at: '2023-01-01T00:00:00Z'
    }
  ]
  
  const mockProjects = [
    {
      id: 1,
      name: 'Test Project',
      owner_email: 'user@example.com',
      incidents_count: 5,
      unresolved_incidents_count: 2
    },
    {
      id: 2,
      name: 'Another Project',
      owner_email: 'admin@example.com',
      incidents_count: 3,
      unresolved_incidents_count: 0
    }
  ]
  
  const mockIncidents = [
    {
      id: 1,
      title: 'Database Issue',
      description: 'Database is running slow',
      project_id: 1,
      resolved: false,
      created_at: '2023-01-01T12:00:00Z'
    },
    {
      id: 2,
      title: 'Server Maintenance',
      description: 'Scheduled server maintenance',
      project_id: 2,
      resolved: true,
      resolved_at: '2023-01-01T14:00:00Z',
      created_at: '2023-01-01T13:00:00Z'
    }
  ]
  
  // Helper function to create mock API responses
  const createMockImplementation = () => {
    return (url) => {
      if (url.includes('/admin/stats')) {
        return Promise.resolve({ data: mockStats })
      }
      if (url.includes('/admin/users')) {
        return Promise.resolve({ data: mockUsers })
      }
      if (url.includes('/admin/subscriptions')) {
        return Promise.resolve({ data: mockSubscriptions })
      }
      if (url.includes('/admin/projects')) {
        return Promise.resolve({ data: mockProjects })
      }
      if (url.includes('/admin/incidents')) {
        return Promise.resolve({ data: mockIncidents })
      }
      return Promise.resolve({ data: [] })
    }
  }
  
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush,
    })
    localStorageMock.getItem.mockReturnValue('fake-admin-token')
    mockedAxios.get.mockImplementation(createMockImplementation())
    mockedAxios.patch.mockResolvedValue({ data: { ...mockUsers[1], is_active: false } })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    test('redirects to login if no token', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
    
    test('shows admin access required error for non-admin users', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 403 }
      })
      
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin access required')).toBeInTheDocument()
      })
    })
    
    test('redirects to login on 401 error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 401 }
      })
      
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Dashboard Loading and Navigation', () => {
    test('renders admin dashboard with header', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'User Dashboard' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
      })
    })
    
    test('shows loading state initially', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument()
    })
    
    test('navigates between tabs', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Click on Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
    })
  })

  describe('Overview Tab', () => {
    test('displays system statistics', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument() // total_users
        expect(screen.getByText('8 active')).toBeInTheDocument() // active_users
        expect(screen.getByText('3')).toBeInTheDocument() // pro_subscribers
        expect(screen.getByText('7 free users')).toBeInTheDocument() // free_users
        expect(screen.getByText('15')).toBeInTheDocument() // total_projects
        expect(screen.getByText('25')).toBeInTheDocument() // total_incidents
        expect(screen.getByText('5 unresolved')).toBeInTheDocument() // unresolved_incidents
      })
    })
    
    test('displays system health metrics', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('System Health')).toBeInTheDocument()
        expect(screen.getByText('User Activation Rate')).toBeInTheDocument()
        expect(screen.getByText('Pro Conversion Rate')).toBeInTheDocument()
        expect(screen.getByText('Incident Resolution Rate')).toBeInTheDocument()
      })
    })
  })

  describe('Users Tab', () => {
    test('displays user management interface', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
        expect(screen.getByText('admin@example.com')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
      })
    })
    
    test('shows user details correctly', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('PRO')).toBeInTheDocument() // subscription tier
        expect(screen.getByText('FREE')).toBeInTheDocument() // subscription tier
        expect(screen.getByText('Admin')).toBeInTheDocument() // admin badge
        expect(screen.getByText('Active')).toBeInTheDocument() // status
      })
    })
    
    test('can activate/deactivate users', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
      
      // Find and click deactivate button for regular user
      const deactivateButtons = screen.getAllByText('Deactivate')
      await act(async () => {
        fireEvent.click(deactivateButtons[0])
      })
      
      await waitFor(() => {
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          expect.stringContaining('/admin/users/2'),
          { is_active: false },
          expect.any(Object)
        )
      })
    })
    
    test('can grant/remove admin privileges', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
      
      // Find and click make admin button for regular user
      const makeAdminButtons = screen.getAllByText('Make Admin')
      await act(async () => {
        fireEvent.click(makeAdminButtons[0])
      })
      
      await waitFor(() => {
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          expect.stringContaining('/admin/users/2'),
          { is_admin: true },
          expect.any(Object)
        )
      })
    })
  })

  describe('Subscriptions Tab', () => {
    test('displays subscription management interface', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Subscriptions tab
      const subscriptionsTab = screen.getByRole('button', { name: 'Subscriptions' })
      await act(async () => {
        fireEvent.click(subscriptionsTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Subscription Management')).toBeInTheDocument()
        expect(screen.getByText('pro@example.com')).toBeInTheDocument()
        expect(screen.getByText('cus_123')).toBeInTheDocument()
      })
    })
    
    test('shows subscription details correctly', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Subscriptions tab
      const subscriptionsTab = screen.getByRole('button', { name: 'Subscriptions' })
      await act(async () => {
        fireEvent.click(subscriptionsTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument() // status
        expect(screen.getByText('Next billing: Jan 01, 2023')).toBeInTheDocument() // billing info
      })
    })
  })

  describe('Projects Tab', () => {
    test('displays project management interface', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Projects tab
      const projectsTab = screen.getByRole('button', { name: 'Projects' })
      await act(async () => {
        fireEvent.click(projectsTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Project Management')).toBeInTheDocument()
        expect(screen.getByText('Test Project')).toBeInTheDocument()
        expect(screen.getByText('Another Project')).toBeInTheDocument()
      })
    })
    
    test('shows project health status', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Projects tab
      const projectsTab = screen.getByRole('button', { name: 'Projects' })
      await act(async () => {
        fireEvent.click(projectsTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Issues')).toBeInTheDocument() // Project with unresolved incidents
        expect(screen.getByText('Healthy')).toBeInTheDocument() // Project with no unresolved incidents
        expect(screen.getByText('Total: 5')).toBeInTheDocument() // Total incidents count
        expect(screen.getByText('Unresolved: 2')).toBeInTheDocument() // Unresolved incidents count
      })
    })
  })

  describe('Incidents Tab', () => {
    test('displays incident management interface', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Incidents tab
      const incidentsTab = screen.getByRole('button', { name: 'Incidents' })
      await act(async () => {
        fireEvent.click(incidentsTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Incident Management')).toBeInTheDocument()
        expect(screen.getByText('Database Issue')).toBeInTheDocument()
        expect(screen.getByText('Server Maintenance')).toBeInTheDocument()
      })
    })
    
    test('shows incident status correctly', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Incidents tab
      const incidentsTab = screen.getByRole('button', { name: 'Incidents' })
      await act(async () => {
        fireEvent.click(incidentsTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument() // Unresolved incident
        expect(screen.getByText('Resolved')).toBeInTheDocument() // Resolved incident
        expect(screen.getByText('Resolved: Jan 01, 2023')).toBeInTheDocument() // Resolution date
      })
    })
  })

  describe('Navigation and Actions', () => {
    test('navigates to user dashboard', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      const userDashboardButton = screen.getByRole('button', { name: 'User Dashboard' })
      await act(async () => {
        fireEvent.click(userDashboardButton)
      })
      
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
    
    test('logs out user', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      const logoutButton = screen.getByRole('button', { name: 'Logout' })
      await act(async () => {
        fireEvent.click(logoutButton)
      })
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/admin/stats')) {
          return Promise.resolve({ data: mockStats })
        }
        return Promise.reject(new Error('API Error'))
      })
      
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Users tab (which should fail)
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      // Should not crash the app
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
    
    test('handles user update errors', async () => {
      mockedAxios.patch.mockRejectedValueOnce(new Error('Update failed'))
      
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Navigate to Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      await waitFor(() => {
        expect(screen.getByText('User Management')).toBeInTheDocument()
      })
      
      // Try to update a user (should fail)
      const deactivateButtons = screen.getAllByText('Deactivate')
      await act(async () => {
        fireEvent.click(deactivateButtons[0])
      })
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update user status')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading States', () => {
    test('shows loading state while fetching data', async () => {
      // Mock a slow API response
      mockedAxios.get.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ data: mockStats }), 100)
      ))
      
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      expect(screen.getByText('Loading admin dashboard...')).toBeInTheDocument()
    })
    
    test('shows loading indicator for tab data', async () => {
      await act(async () => {
        render(<AdminDashboard />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
      })
      
      // Mock slow response for users
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/admin/stats')) {
          return Promise.resolve({ data: mockStats })
        }
        if (url.includes('/admin/users')) {
          return new Promise(resolve => 
            setTimeout(() => resolve({ data: mockUsers }), 100)
          )
        }
        return Promise.resolve({ data: [] })
      })
      
      // Navigate to Users tab
      const usersTab = screen.getByRole('button', { name: 'Users' })
      await act(async () => {
        fireEvent.click(usersTab)
      })
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })
})