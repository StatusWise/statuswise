import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import Dashboard from '../../pages/dashboard'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter() {
    return {
      push: mockPush,
    }
  },
}))

describe('Dashboard Page', () => {
  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'fake-token')
    // Mock console.error to suppress error messages during tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Restore console.error after each test
    console.error.mockRestore()
  })

  test('renders dashboard and fetches projects', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockResolvedValue({ data: projects })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(await screen.findByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  test('creates a new project', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockResolvedValue({ data: projects })
    mockedAxios.post.mockResolvedValue({ data: {} })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    // Wait for initial projects to load
    await screen.findByText('Test Project')

    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText('New Project Name'), 'New Test Project')
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    })

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/projects/'),
        { name: 'New Test Project' },
        expect.any(Object)
      )
    })
  })

  test('fetches incidents for a project', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [{ 
      id: 1, 
      title: 'Test Incident', 
      description: 'Test desc',
      created_at: new Date().toISOString(),
      resolved: false
    }]
    
    // Mock the sequence of API calls
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/incidents/1')) {
        return Promise.resolve({ data: incidents })
      }
      if (url.includes('/projects')) {
        return Promise.resolve({ data: projects })
      }
      return Promise.resolve({ data: [] })
    })

    await act(async () => {
      render(<Dashboard />)
    })
    
    // Wait for the project to appear first
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })

    // Click the button to trigger the incident fetch
    await act(async () => {
      fireEvent.click(incidentsButton)
    })

    // Wait for the incidents to be rendered
    expect(await screen.findByText('Incidents for Project 1')).toBeInTheDocument()
    expect(await screen.findByText('Test Incident')).toBeInTheDocument()
  })

  test('shows validation error when creating a project with empty name', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument()
    })
  })

  test('shows validation error when creating a project with short name', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText('New Project Name'), 'A')
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Project name must be at least 2 characters long')).toBeInTheDocument()
    })
  })

  test('shows validation errors when creating an incident with missing fields', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Incident title is required')).toBeInTheDocument()
      expect(screen.getByText('Incident description is required')).toBeInTheDocument()
    })
  })

  test('shows validation error for short incident title', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText('Incident Title'), 'Hi')
      await userEvent.type(screen.getByPlaceholderText(/Description/), 'Valid description here')
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Incident title must be at least 3 characters long')).toBeInTheDocument()
    })
  })

  test('shows validation error for short incident description', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText('Incident Title'), 'Valid Title')
      await userEvent.type(screen.getByPlaceholderText(/Description/), 'Short')
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    
    await waitFor(() => {
      expect(screen.getByText('Incident description must be at least 10 characters long')).toBeInTheDocument()
    })
  })

  test('can resolve an open incident', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [{ 
      id: 1, 
      title: 'Test Incident', 
      description: 'desc', 
      created_at: new Date().toISOString(), 
      resolved: false 
    }]
    
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: incidents })
      return Promise.resolve({ data: [] })
    })
    mockedAxios.post.mockResolvedValue({ data: {} })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    const resolveButton = await screen.findByRole('button', { name: 'Resolve' })
    await act(async () => {
      fireEvent.click(resolveButton)
    })
    
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/1/resolve'),
      {},
      expect.any(Object)
    )
  })

  test('renders with no projects message', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('No projects yet. Create your first project above!')).toBeInTheDocument()
  })

  test('renders with no incidents message', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    expect(screen.getByText('Incidents for Project 1')).toBeInTheDocument()
    expect(screen.getByText('No incidents reported for this project yet.')).toBeInTheDocument()
  })

  test('renders scheduled incidents correctly', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const scheduledDate = new Date('2024-01-01T10:00:00Z')
    const incidents = [{ 
      id: 1, 
      title: 'Scheduled Incident', 
      description: 'desc', 
      created_at: new Date().toISOString(),
      scheduled_start: scheduledDate.toISOString(),
      resolved: false 
    }]
    
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: incidents })
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    expect(await screen.findByText(/Scheduled for:/)).toBeInTheDocument()
  })

  test('renders resolved incidents correctly', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const resolvedDate = new Date('2024-01-01T12:00:00Z')
    const incidents = [{ 
      id: 1, 
      title: 'Resolved Incident', 
      description: 'desc', 
      created_at: new Date().toISOString(),
      resolved: true,
      resolved_at: resolvedDate.toISOString()
    }]
    
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: incidents })
      return Promise.resolve({ data: [] })
    })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    expect(await screen.findByText(/Resolved at/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
  })

  test('creates incident with scheduled start', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    mockedAxios.post.mockResolvedValue({ data: {} })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const incidentsButton = await screen.findByRole('button', { name: /View Incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    
    await act(async () => {
      await userEvent.type(screen.getByPlaceholderText('Incident Title'), 'Test Incident')
      await userEvent.type(screen.getByPlaceholderText(/Description/), 'Test Description Here')
      const datetimeInput = screen.getByPlaceholderText('Scheduled Start (optional)')
      fireEvent.change(datetimeInput, { target: { value: '2024-01-01T10:00' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/'),
      expect.objectContaining({
        project_id: 1,
        title: 'Test Incident',
        description: 'Test Description Here',
        scheduled_start: expect.any(String)
      }),
      expect.any(Object)
    )
  })

  test('handles logout correctly', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    mockedAxios.get.mockResolvedValue({ data: projects })
    Storage.prototype.removeItem = jest.fn()
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    const logoutButton = await screen.findByRole('button', { name: 'Logout' })
    await act(async () => {
      fireEvent.click(logoutButton)
    })
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  test('handles 401 error by redirecting to login', async () => {
    mockedAxios.get.mockRejectedValue({ 
      response: { status: 401 } 
    })
    Storage.prototype.removeItem = jest.fn()
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    await waitFor(() => {
      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
}) 