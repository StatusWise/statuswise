import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import axios from 'axios'
import Dashboard from '../pages/dashboard'
import { ConfigContext } from '../pages/_app'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

// Mock next/router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
  }),
}))

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock config context
const mockConfigContext = {
  isBillingEnabled: () => false,
}

describe('Privacy Toggle Feature', () => {
  // Helper function to create comprehensive mock implementation
  const createMockImplementation = (projectsData = [], subscriptionOverrides = {}) => {
    return (url) => {
      if (url.includes('/subscription/status')) {
        return Promise.resolve({
          data: {
            tier: 'free',
            status: null,
            expires_at: null,
            limits: {
              max_projects: 1,
              max_incidents_per_project: 5,
              features: ['basic_status_page', 'email_notifications']
            },
            usage: {
              projects: projectsData.length
            },
            ...subscriptionOverrides
          }
        })
      }
      if (url.includes('/projects/')) {
        return Promise.resolve({ data: projectsData })
      }
      if (url.includes('/admin/stats')) {
        return Promise.reject({ response: { status: 403 } }) // Not admin by default
      }
      return Promise.resolve({ data: [] })
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('mock-token')
    // Set default comprehensive mock
    mockedAxios.get.mockImplementation(createMockImplementation())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const renderDashboard = () => {
    return render(
      <ConfigContext.Provider value={mockConfigContext}>
        <Dashboard />
      </ConfigContext.Provider>
    )
  }

  test('displays privacy status badges for projects', async () => {
    const mockProjects = [
      { id: 1, name: 'Public Project', is_public: true },
      { id: 2, name: 'Private Project', is_public: false },
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(mockProjects))

    await act(async () => {
      renderDashboard()
    })

    await waitFor(() => {
      expect(screen.getByText('Public')).toBeInTheDocument()
      expect(screen.getByText('Private')).toBeInTheDocument()
    })

    // Check for privacy toggle buttons
    expect(screen.getByText('Make Private')).toBeInTheDocument()
    expect(screen.getByText('Make Public')).toBeInTheDocument()
  })

  test('shows public page link for public projects only', async () => {
    const mockProjects = [
      { id: 1, name: 'Public Project', is_public: true },
      { id: 2, name: 'Private Project', is_public: false },
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(mockProjects))

    await act(async () => {
      renderDashboard()
    })

    await waitFor(() => {
      const publicLink = screen.getByText('View Public Page →')
      expect(publicLink).toBeInTheDocument()
      expect(publicLink.closest('a')).toHaveAttribute('href', expect.stringContaining('/status/1'))
      
      // Should only have one public link (for the public project)
      expect(screen.getAllByText('View Public Page →')).toHaveLength(1)
    })
  })

  test('privacy checkbox is present in project creation form', async () => {
    mockedAxios.get.mockImplementation(createMockImplementation([])) // Empty projects list

    await act(async () => {
      renderDashboard()
    })

    await waitFor(() => {
      const checkbox = screen.getByLabelText('Public status page')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked() // Should default to unchecked (private)
    })
  })

  test('can create private project using checkbox', async () => {
    const mockProjects = []
    const newProject = { id: 1, name: 'New Private Project', is_public: false }
    
    mockedAxios.get.mockImplementation(createMockImplementation(mockProjects))
    mockedAxios.post.mockResolvedValueOnce({ data: newProject })

    await act(async () => {
      renderDashboard()
    })

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('New Project Name')).toBeInTheDocument()
    })

    // Fill in project name
    const nameInput = screen.getByPlaceholderText('New Project Name')
    fireEvent.change(nameInput, { target: { value: 'New Private Project' } })

    // Checkbox should default to unchecked (private), so we don't need to click it
    const checkbox = screen.getByLabelText('Public status page')
    expect(checkbox).not.toBeChecked()

    // Submit form
    const createButton = screen.getByText('Create')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/projects/'),
        { name: 'New Private Project', is_public: false },
        expect.any(Object)
      )
    })
  })

  test('toggles project privacy when toggle button is clicked', async () => {
    const initialProject = { id: 1, name: 'Test Project', is_public: true }
    const toggledProject = { id: 1, name: 'Test Project', is_public: false }

    mockedAxios.get.mockImplementation(createMockImplementation([initialProject]))
    mockedAxios.patch.mockResolvedValueOnce({ data: toggledProject })

    await act(async () => {
      renderDashboard()
    })

    // Wait for the project to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('Make Private')).toBeInTheDocument()
    })

    // Click the toggle button
    const toggleButton = screen.getByText('Make Private')
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/projects/1'),
        { is_public: false },
        expect.any(Object)
      )
    })
  })

  test('displays error when privacy toggle fails', async () => {
    const mockProjects = [
      { id: 1, name: 'Test Project', is_public: true },
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(mockProjects))
    mockedAxios.patch.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Access denied' } }
    })

    await act(async () => {
      renderDashboard()
    })

    // Wait for the project to load
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('Make Private')).toBeInTheDocument()
    })

    // Click the toggle button
    const toggleButton = screen.getByText('Make Private')
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(screen.getByText('You do not have permission to modify this project.')).toBeInTheDocument()
    })
  })

  test('privacy status uses correct styling', async () => {
    const mockProjects = [
      { id: 1, name: 'Public Project', is_public: true },
      { id: 2, name: 'Private Project', is_public: false },
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(mockProjects))

    await act(async () => {
      renderDashboard()
    })

    await waitFor(() => {
      const publicBadge = screen.getByText('Public')
      const privateBadge = screen.getByText('Private')

      // Check for correct CSS classes
      expect(publicBadge).toHaveClass('bg-green-100', 'text-green-800')
      expect(privateBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
    })
  })

  test('toggle buttons have correct styling based on current state', async () => {
    const mockProjects = [
      { id: 1, name: 'Public Project', is_public: true },
      { id: 2, name: 'Private Project', is_public: false },
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(mockProjects))

    await act(async () => {
      renderDashboard()
    })

    await waitFor(() => {
      const makePrivateButton = screen.getByText('Make Private')
      const makePublicButton = screen.getByText('Make Public')

      // Check for correct CSS classes
      expect(makePrivateButton).toHaveClass('bg-yellow-100', 'text-yellow-800')
      expect(makePublicButton).toHaveClass('bg-green-100', 'text-green-800')
    })
  })
}) 