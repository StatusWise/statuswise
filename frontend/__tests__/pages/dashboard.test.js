import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import axios from 'axios'
import Dashboard from '../../pages/dashboard'

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
    axios.get.mockResolvedValue({ data: projects })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
    expect(await screen.findByText('Test Project')).toBeInTheDocument()
  })

  test('creates a new project', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    axios.get.mockResolvedValue({ data: projects })
    axios.post.mockResolvedValue({ data: {} })
    
    await act(async () => {
      render(<Dashboard />)
    })
    
    // Wait for initial projects to load
    await screen.findByText('Test Project');

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('New Project Name'), { target: { value: 'New Test Project' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    })

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/projects/'),
        { name: 'New Test Project' },
        expect.any(Object)
      )
    })
  })

  test('fetches incidents for a project', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [{ id: 1, title: 'Test Incident', description: 'Test desc' }]
    
    // Mock the sequence of API calls
    axios.get.mockImplementation(url => {
      if (url.includes('/incidents/1')) {
        return Promise.resolve({ data: incidents });
      }
      if (url.includes('/projects')) {
        return Promise.resolve({ data: projects });
      }
      return Promise.resolve({ data: [] });
    });

    await act(async () => {
      render(<Dashboard />)
    })
    
    // 1. Wait for the project to appear first
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })

    // 2. Click the button to trigger the incident fetch
    await act(async () => {
      fireEvent.click(incidentsButton)
    })

    // 3. Wait for the incidents to be rendered
    expect(await screen.findByText('Incidents for Project 1')).toBeInTheDocument()
    expect(await screen.findByText('Test Incident')).toBeInTheDocument()
  })

  test('shows alert when creating a project with empty name', async () => {
    window.alert = jest.fn()
    axios.get.mockResolvedValue({ data: [] })
    await act(async () => {
      render(<Dashboard />)
    })
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('New Project Name'), { target: { value: '   ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    })
    expect(window.alert).toHaveBeenCalledWith('Project name is required')
  })

  test('shows alert when creating an incident with missing fields', async () => {
    window.alert = jest.fn()
    const projects = [{ id: 1, name: 'Test Project' }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    expect(window.alert).toHaveBeenCalledWith('Incident title and description are required')
  })

  test('can close an open incident', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const incidents = [{ id: 1, title: 'Test Incident', description: 'desc', created_at: new Date(), resolved: false }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: incidents })
      return Promise.resolve({ data: [] })
    })
    axios.post.mockResolvedValue({ data: {} })
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    const closeButton = await screen.findByRole('button', { name: 'Close' })
    await act(async () => {
      fireEvent.click(closeButton)
    })
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/1/resolve'),
      {},
      expect.any(Object)
    )
  })

  test('renders with no projects', async () => {
    axios.get.mockResolvedValue({ data: [] })
    await act(async () => {
      render(<Dashboard />)
    })
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  test('renders with no incidents', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    expect(screen.getByText('Incidents for Project 1')).toBeInTheDocument()
  })

  test('renders scheduled incidents correctly', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    const scheduledDate = new Date('2024-01-01T10:00:00Z')
    const incidents = [{ 
      id: 1, 
      title: 'Scheduled Incident', 
      description: 'desc', 
      created_at: new Date(),
      scheduled_start: scheduledDate.toISOString(),
      resolved: false 
    }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: incidents })
      return Promise.resolve({ data: [] })
    })
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
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
      created_at: new Date(),
      resolved: true,
      resolved_at: resolvedDate.toISOString()
    }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: incidents })
      return Promise.resolve({ data: [] })
    })
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    expect(await screen.findByText(/Resolved at/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  test('creates incident with scheduled start', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    axios.post.mockResolvedValue({ data: {} })
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Incident Title'), { target: { value: 'Test Incident' } })
      fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'Test Description' } })
      const datetimeInput = screen.getByPlaceholderText('Scheduled Start (optional)')
      fireEvent.change(datetimeInput, { target: { value: '2024-01-01T10:00' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/incidents/'),
      expect.objectContaining({
        project_id: 1,
        title: 'Test Incident',
        description: 'Test Description',
        scheduled_start: expect.any(String)
      }),
      expect.any(Object)
    )
  })

  test('handles API error when creating project', async () => {
    axios.get.mockResolvedValue({ data: [] })
    axios.post.mockRejectedValue(new Error('API Error'))
    await act(async () => {
      render(<Dashboard />)
    })
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('New Project Name'), { target: { value: 'Test Project' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    })
    // The error should be caught and not crash the component
    await waitFor(() => {
      expect(screen.getByPlaceholderText('New Project Name')).toBeInTheDocument()
    })
  })

  test('handles API error when creating incident', async () => {
    const projects = [{ id: 1, name: 'Test Project' }]
    axios.get.mockImplementation(url => {
      if (url.includes('/projects')) return Promise.resolve({ data: projects })
      if (url.includes('/incidents/1')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    axios.post.mockRejectedValue(new Error('API Error'))
    await act(async () => {
      render(<Dashboard />)
    })
    const incidentsButton = await screen.findByRole('button', { name: /incidents/i })
    await act(async () => {
      fireEvent.click(incidentsButton)
    })
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Incident Title'), { target: { value: 'Test Incident' } })
      fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'Test Description' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create Incident' }))
    })
    // The error should be caught and not crash the component
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Incident Title')).toBeInTheDocument()
    })
  })
}) 