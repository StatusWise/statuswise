import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import PublicStatus from '../../pages/status/[projectId]'

// Mock axios
jest.mock('axios')

// Mock useRouter
const mockQuery = { projectId: '123' }
jest.mock('next/router', () => ({
  useRouter() {
    return {
      query: mockQuery,
    }
  },
}))

describe('Public Status Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders incidents for a project', async () => {
    const incidents = [
      { id: 1, title: 'Test Incident', description: 'Test desc', created_at: new Date(), resolved: false }
    ]
    axios.get.mockResolvedValue({ data: incidents })
    
    render(<PublicStatus />)
    
    expect(await screen.findByText('Project Status')).toBeInTheDocument()
    expect(await screen.findByText('Test Incident')).toBeInTheDocument()
  })

  test('renders with no incidents', async () => {
    axios.get.mockResolvedValue({ data: [] })
    
    render(<PublicStatus />)
    
    expect(await screen.findByText('No incidents reported')).toBeInTheDocument()
  })

  test('renders resolved incidents correctly', async () => {
    const resolvedDate = new Date('2024-01-01T12:00:00Z')
    const incidents = [
      { 
        id: 1, 
        title: 'Resolved Incident', 
        description: 'Test desc', 
        created_at: new Date(),
        resolved: true,
        resolved_at: resolvedDate.toISOString()
      }
    ]
    axios.get.mockResolvedValue({ data: incidents })
    
    render(<PublicStatus />)
    
    expect(await screen.findByText('Resolved Incident')).toBeInTheDocument()
    expect(await screen.findByText(/Resolved at/)).toBeInTheDocument()
  })

  test('renders open incidents correctly', async () => {
    const incidents = [
      { 
        id: 1, 
        title: 'Open Incident', 
        description: 'Test desc', 
        created_at: new Date(),
        resolved: false
      }
    ]
    axios.get.mockResolvedValue({ data: incidents })
    
    render(<PublicStatus />)
    
    expect(await screen.findByText('Open Incident')).toBeInTheDocument()
    expect(await screen.findByText('Open')).toBeInTheDocument()
  })

  test('does not fetch incidents when projectId is not available', async () => {
    mockQuery.projectId = undefined
    axios.get.mockResolvedValue({ data: [] })
    
    render(<PublicStatus />)
    
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled()
    })
  })
}) 