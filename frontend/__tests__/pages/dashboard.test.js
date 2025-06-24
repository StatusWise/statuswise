import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { useRouter } from 'next/router'
import Dashboard from '../../pages/dashboard'

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

describe('Dashboard Page', () => {
  const mockPush = jest.fn()
  
  // Helper function to create mock implementation
  const createMockImplementation = (projectsData = [], incidentsData = [], subscriptionOverrides = {}) => {
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
              projects: 0
            },
            ...subscriptionOverrides
          }
        })
      }
      if (url.includes('/projects/')) {
        return Promise.resolve({ data: projectsData })
      }
      if (url.includes('/incidents/')) {
        return Promise.resolve({ data: incidentsData })
      }
      return Promise.resolve({ data: [] })
    }
  }
  
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush,
    })
    localStorageMock.getItem.mockReturnValue('fake-token')
    
    // Default mock implementation
    mockedAxios.get.mockImplementation(createMockImplementation())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('renders dashboard and fetches projects', async () => {
    // Mock both endpoints
    mockedAxios.get.mockImplementation((url) => {
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
              projects: 0
            }
          }
        })
      }
      if (url.includes('/projects/')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('New Project Name')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/projects/'),
        expect.any(Object)
      )
    })
  })

  test('creates a new project', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    
    let callCount = 0
    // Mock both endpoints with proper call sequence
    mockedAxios.get.mockImplementation((url) => {
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
              projects: callCount === 0 ? 0 : 1 // Simulate usage increase after project creation
            }
          }
        })
      }
      if (url.includes('/projects/')) {
        callCount++
        return Promise.resolve({ data: callCount === 1 ? [] : projects })
      }
      return Promise.resolve({ data: [] })
    })
    
    mockedAxios.post.mockResolvedValueOnce({ data: { id: 1, name: 'Test Project' } })

    await act(async () => {
      render(<Dashboard />)
    })

    const input = screen.getByPlaceholderText('New Project Name')
    const button = screen.getByRole('button', { name: 'Create' })

    await act(async () => {
      await userEvent.type(input, 'Test Project')
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/projects/'),
        { name: 'Test Project' },
        expect.any(Object)
      )
    })
  })

  test('fetches incidents for a project', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [
      { 
        id: 1, 
        title: 'Test Incident', 
        description: 'Test Description',
        created_at: '2023-01-01T00:00:00Z',
        resolved: false
      }
    ]

    mockedAxios.get.mockImplementation((url) => {
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
              projects: 1
            }
          }
        })
      }
      if (url.includes('/projects/')) {
        return Promise.resolve({ data: projects })
      }
      if (url.includes('/incidents/1')) {
        return Promise.resolve({ data: incidents })
      }
      return Promise.resolve({ data: [] })
    })

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/incidents/1'),
        expect.any(Object)
      )
    })

    await waitFor(() => {
      expect(screen.getByText('Test Incident')).toBeInTheDocument()
    })
  })

  test('shows validation error when creating a project with empty name', async () => {
    mockedAxios.get.mockImplementation((url) => {
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
              projects: 0
            }
          }
        })
      }
      return Promise.resolve({ data: [] })
    })

    await act(async () => {
      render(<Dashboard />)
    })

    const button = screen.getByRole('button', { name: 'Create' })
    
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument()
    })
  })

  test('shows validation error when creating a project with short name', async () => {
    mockedAxios.get.mockImplementation((url) => {
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
              projects: 0
            }
          }
        })
      }
      return Promise.resolve({ data: [] })
    })

    await act(async () => {
      render(<Dashboard />)
    })

    const input = screen.getByPlaceholderText('New Project Name')
    const button = screen.getByRole('button', { name: 'Create' })

    await act(async () => {
      await userEvent.type(input, 'A')
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(screen.getByText('Project name must be at least 2 characters long')).toBeInTheDocument()
    })
  })

  test('shows validation errors when creating an incident with missing fields', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    
    mockedAxios.get.mockImplementation(createMockImplementation(projects, [], { usage: { projects: 1 } }))

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incidents for Project 1')).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: 'Create Incident' })
    
    await act(async () => {
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incident title is required')).toBeInTheDocument()
      expect(screen.getByText('Incident description is required')).toBeInTheDocument()
    })
  })

  test('shows validation error for short incident title', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    
    mockedAxios.get.mockImplementation(createMockImplementation(projects, [], { usage: { projects: 1 } }))

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incidents for Project 1')).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText('Incident Title')
    const createButton = screen.getByRole('button', { name: 'Create Incident' })

    await act(async () => {
      await userEvent.type(titleInput, 'AB')
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incident title must be at least 3 characters long')).toBeInTheDocument()
    })
  })

  test('shows validation error for short incident description', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    
    mockedAxios.get.mockImplementation(createMockImplementation(projects, [], { usage: { projects: 1 } }))

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incidents for Project 1')).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText('Incident Title')
    const descInput = screen.getByPlaceholderText('Description (detailed explanation of the incident)')
    const createButton = screen.getByRole('button', { name: 'Create Incident' })

    await act(async () => {
      await userEvent.type(titleInput, 'Valid Title')
      await userEvent.type(descInput, 'Short')
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incident description must be at least 10 characters long')).toBeInTheDocument()
    })
  })

  test('can resolve an open incident', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [
      { 
        id: 1, 
        title: 'Test Incident', 
        description: 'Test Description',
        created_at: '2023-01-01T00:00:00Z',
        resolved: false
      }
    ]
    const resolvedIncidents = [
      { 
        id: 1, 
        title: 'Test Incident', 
        description: 'Test Description',
        created_at: '2023-01-01T00:00:00Z',
        resolved: true,
        resolved_at: '2023-01-01T01:00:00Z'
      }
    ]

    let callCount = 0
    mockedAxios.get.mockImplementation((url) => {
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
              projects: 1
            }
          }
        })
      }
      if (url.includes('/projects/')) {
        return Promise.resolve({ data: projects })
      }
      if (url.includes('/incidents/1')) {
        callCount++
        return Promise.resolve({ data: callCount === 1 ? incidents : resolvedIncidents })
      }
      return Promise.resolve({ data: [] })
    })
    
    mockedAxios.post.mockResolvedValueOnce({})

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Incident')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
    })

    const resolveButton = screen.getByRole('button', { name: 'Resolve' })
    
    await act(async () => {
      fireEvent.click(resolveButton)
    })

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/incidents/1/resolve'),
        {},
        expect.any(Object)
      )
    })
  })

  test('renders with no projects message', async () => {
    mockedAxios.get.mockImplementation(createMockImplementation())

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('No projects yet. Create your first project above!')).toBeInTheDocument()
    })
  })

  test('renders with no incidents message', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    
    mockedAxios.get.mockImplementation(createMockImplementation(projects, [], { usage: { projects: 1 } }))

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('No incidents reported for this project yet.')).toBeInTheDocument()
    })
  })

  test('renders scheduled incidents correctly', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [
      { 
        id: 1, 
        title: 'Scheduled Maintenance', 
        description: 'Server maintenance',
        created_at: '2023-01-01T00:00:00Z',
        scheduled_start: '2023-01-02T00:00:00Z',
        resolved: false
      }
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(projects, incidents, { usage: { projects: 1 } }))

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument()
      expect(screen.getByText(/Scheduled for:/)).toBeInTheDocument()
    })
  })

  test('renders resolved incidents correctly', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [
      { 
        id: 1, 
        title: 'Resolved Issue', 
        description: 'Fixed issue',
        created_at: '2023-01-01T00:00:00Z',
        resolved: true,
        resolved_at: '2023-01-01T01:00:00Z'
      }
    ]

    mockedAxios.get.mockImplementation(createMockImplementation(projects, incidents, { usage: { projects: 1 } }))

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Resolved Issue')).toBeInTheDocument()
      expect(screen.getByText(/Resolved at/)).toBeInTheDocument()
    })
  })

  test('creates incident with scheduled start', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const newIncident = {
      id: 2,
      title: 'Scheduled Maintenance',
      description: 'Server maintenance window',
      created_at: '2023-01-01T00:00:00Z',
      scheduled_start: '2023-01-02T00:00:00Z',
      resolved: false
    }

    let callCount = 0
    mockedAxios.get.mockImplementation((url) => {
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
              projects: 1
            }
          }
        })
      }
      if (url.includes('/projects/')) {
        return Promise.resolve({ data: projects })
      }
      if (url.includes('/incidents/1')) {
        callCount++
        return Promise.resolve({ data: callCount === 1 ? [] : [newIncident] })
      }
      return Promise.resolve({ data: [] })
    })
    
    mockedAxios.post.mockResolvedValueOnce({ data: newIncident })

    await act(async () => {
      render(<Dashboard />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    const viewButton = screen.getByRole('button', { name: 'View Incidents' })
    
    await act(async () => {
      fireEvent.click(viewButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Incidents for Project 1')).toBeInTheDocument()
    })

    const titleInput = screen.getByPlaceholderText('Incident Title')
    const descInput = screen.getByPlaceholderText('Description (detailed explanation of the incident)')
    const scheduleInput = screen.getByPlaceholderText('Scheduled Start (optional)')
    const createButton = screen.getByRole('button', { name: 'Create Incident' })

    await act(async () => {
      await userEvent.type(titleInput, 'Scheduled Maintenance')
      await userEvent.type(descInput, 'Server maintenance window')
      await userEvent.type(scheduleInput, '2023-01-02T00:00')
      fireEvent.click(createButton)
    })

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/incidents/'),
        expect.objectContaining({
          project_id: 1,
          title: 'Scheduled Maintenance',
          description: 'Server maintenance window',
          scheduled_start: expect.any(String)
        }),
        expect.any(Object)
      )
    })
  })

  test('handles logout correctly', async () => {
    mockedAxios.get.mockImplementation(createMockImplementation())

    await act(async () => {
      render(<Dashboard />)
    })

    const logoutButton = screen.getByRole('button', { name: 'Logout' })
    
    await act(async () => {
      fireEvent.click(logoutButton)
    })

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})