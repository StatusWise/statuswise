import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { useRouter } from 'next/router'
import axios from 'axios'
import GroupsManagement from '../pages/groups'

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}))

jest.mock('axios')

jest.mock('../utils/logger', () => ({
  error: jest.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock window.confirm
global.confirm = jest.fn()

describe('GroupsManagement', () => {
  const mockPush = jest.fn()
  const mockAxios = axios

  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush
    })
    localStorageMock.getItem.mockReturnValue('mock-token')
    mockAxios.get.mockClear()
    mockAxios.post.mockClear()
    mockAxios.patch.mockClear()
    mockAxios.delete.mockClear()
    mockPush.mockClear()
  })

  describe('Initial Loading', () => {
    test('redirects to login if no token', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      render(<GroupsManagement />)
      
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    test('shows loading state initially', () => {
      mockAxios.get.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<GroupsManagement />)
      
      expect(screen.getByText('Loading groups...')).toBeInTheDocument()
    })

    test('loads groups on mount', async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Test Group',
          description: 'A test group',
          user_role: 'owner',
          members_count: 2,
          projects_count: 1
        }
      ]
      
      mockAxios.get.mockResolvedValue({ data: mockGroups })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
      
      expect(mockAxios.get).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}/groups/`,
        { headers: { Authorization: 'Bearer mock-token' } }
      )
    })
  })

  describe('Groups Tab', () => {
    beforeEach(async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Test Group',
          description: 'A test group',
          user_role: 'owner',
          members_count: 2,
          projects_count: 1
        }
      ]
      
      mockAxios.get.mockResolvedValue({ data: mockGroups })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
    })

    test('displays groups correctly', () => {
      expect(screen.getByText('Test Group')).toBeInTheDocument()
      expect(screen.getByText('A test group')).toBeInTheDocument()
      expect(screen.getByText('2 members')).toBeInTheDocument()
      expect(screen.getByText('1 projects')).toBeInTheDocument()
      expect(screen.getByText('OWNER')).toBeInTheDocument()
    })

    test('shows create group button', () => {
      expect(screen.getByText('Create New Group')).toBeInTheDocument()
    })

    test('shows invite button for owners/admins', () => {
      expect(screen.getByText('Invite')).toBeInTheDocument()
    })

    test('shows view details button', () => {
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })
  })

  describe('Create Group Modal', () => {
    beforeEach(async () => {
      mockAxios.get.mockResolvedValue({ data: [] })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Create New Group')).toBeInTheDocument()
      })
    })

    test('opens create group modal', () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create New Group' }))
      
      expect(screen.getByRole('heading', { name: 'Create New Group' })).toBeInTheDocument()
      expect(screen.getByLabelText('Group Name *')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
    })

    test('creates group successfully', async () => {
      mockAxios.post.mockResolvedValue({ data: { id: 1, name: 'New Group' } })
      mockAxios.get.mockResolvedValue({ data: [] }) // For refresh
      
      fireEvent.click(screen.getByText('Create New Group'))
      
      fireEvent.change(screen.getByLabelText('Group Name *'), {
        target: { value: 'New Group' }
      })
      fireEvent.change(screen.getByLabelText('Description'), {
        target: { value: 'New group description' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Group' }))
      
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_API_URL}/groups/`,
          {
            name: 'New Group',
            description: 'New group description'
          },
          { headers: { Authorization: 'Bearer mock-token' } }
        )
      })
      
      await waitFor(() => {
        expect(screen.getByText('Group created successfully')).toBeInTheDocument()
      })
    })

    test('handles create group error', async () => {
      mockAxios.post.mockRejectedValue({
        response: { data: { detail: 'Group name already exists' } }
      })
      
      fireEvent.click(screen.getByText('Create New Group'))
      
      fireEvent.change(screen.getByLabelText('Group Name *'), {
        target: { value: 'Existing Group' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Group' }))
      
      await waitFor(() => {
        expect(screen.getByText('Group name already exists')).toBeInTheDocument()
      })
    })

    test('cancels group creation', () => {
      fireEvent.click(screen.getByText('Create New Group'))
      
      fireEvent.click(screen.getByText('Cancel'))
      
      expect(screen.queryByLabelText('Group Name *')).not.toBeInTheDocument()
    })
  })

  describe('Invitations Tab', () => {
    beforeEach(async () => {
      const mockInvitations = [
        {
          id: 1,
          group_name: 'Test Group',
          invited_by_name: 'John Doe',
          invited_by_email: 'john@example.com',
          role: 'member',
          status: 'pending',
          message: 'Join our team!',
          created_at: '2023-01-01T10:00:00Z',
          expires_at: '2023-01-08T10:00:00Z'
        }
      ]

      mockAxios.get.mockImplementation((url) => {
        if (url.includes('/groups/')) {
          return Promise.resolve({ data: [] })
        }
        if (url.includes('/invitations/')) {
          return Promise.resolve({ data: mockInvitations })
        }
        return Promise.resolve({ data: [] })
      })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('My Groups (0)')).toBeInTheDocument()
      })
    })

    test('switches to invitations tab', async () => {
      fireEvent.click(screen.getByText((content, element) => {
        return element.tagName === 'BUTTON' && content.includes('Invitations')
      }))
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
        expect(screen.getByText('Invited by John Doe')).toBeInTheDocument()
        expect(screen.getByText('MEMBER')).toBeInTheDocument()
        expect(screen.getByText('PENDING')).toBeInTheDocument()
      })
    })

    test('accepts invitation', async () => {
      mockAxios.patch.mockResolvedValue({ data: {} })
      
      fireEvent.click(screen.getByText((content, element) => {
        return element.tagName === 'BUTTON' && content.includes('Invitations')
      }))
      
      await waitFor(() => {
        expect(screen.getByText('Accept')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Accept'))
      
      // Mock updated invitations after accepting
      mockAxios.get.mockImplementation((url) => {
        if (url.includes('/invitations/')) {
          return Promise.resolve({ data: [] }) // Empty after accepting
        }
        return Promise.resolve({ data: [] })
      })
      
      await waitFor(() => {
        expect(mockAxios.patch).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_API_URL}/invitations/1`,
          { status: 'accepted' },
          { headers: { Authorization: 'Bearer mock-token' } }
        )
      })
    })

    test('declines invitation', async () => {
      mockAxios.patch.mockResolvedValue({ data: {} })
      
      fireEvent.click(screen.getByText((content, element) => {
        return element.tagName === 'BUTTON' && content.includes('Invitations')
      }))
      
      await waitFor(() => {
        expect(screen.getByText('Decline')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Decline'))
      
      // Mock updated invitations after declining
      mockAxios.get.mockImplementation((url) => {
        if (url.includes('/invitations/')) {
          return Promise.resolve({ data: [] }) // Empty after declining
        }
        return Promise.resolve({ data: [] })
      })
      
      await waitFor(() => {
        expect(mockAxios.patch).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_API_URL}/invitations/1`,
          { status: 'declined' },
          { headers: { Authorization: 'Bearer mock-token' } }
        )
      })
    })
  })

  describe('Invite Modal', () => {
    beforeEach(async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Test Group',
          user_role: 'owner',
          members_count: 1,
          projects_count: 0
        }
      ]
      
      mockAxios.get.mockResolvedValue({ data: mockGroups })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
    })

    test('opens invite modal', () => {
      fireEvent.click(screen.getByText('Invite'))
      
      expect(screen.getByRole('heading', { name: 'Send Invitation' })).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address *')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByLabelText('Message (Optional)')).toBeInTheDocument()
    })

    test('sends invitation successfully', async () => {
      mockAxios.post.mockResolvedValue({ data: { id: 1 } })
      
      fireEvent.click(screen.getByText('Invite'))
      
      fireEvent.change(screen.getByLabelText('Email Address *'), {
        target: { value: 'newmember@example.com' }
      })
      fireEvent.change(screen.getByLabelText('Role'), {
        target: { value: 'admin' }
      })
      fireEvent.change(screen.getByLabelText('Message (Optional)'), {
        target: { value: 'Welcome to our team!' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))
      
      await waitFor(() => {
        expect(mockAxios.post).toHaveBeenCalledWith(
          `${process.env.NEXT_PUBLIC_API_URL}/groups/invitations/`,
          {
            group_id: 1,
            invited_email: 'newmember@example.com',
            role: 'admin',
            message: 'Welcome to our team!'
          },
          { headers: { Authorization: 'Bearer mock-token' } }
        )
      })
      
      await waitFor(() => {
        expect(screen.getByText('Invitation sent successfully')).toBeInTheDocument()
      })
    })

    test('handles invitation error', async () => {
      mockAxios.post.mockRejectedValue({
        response: { data: { detail: 'User is already a member' } }
      })
      
      fireEvent.click(screen.getByText('Invite'))
      
      fireEvent.change(screen.getByLabelText('Email Address *'), {
        target: { value: 'existing@example.com' }
      })
      
      fireEvent.click(screen.getByRole('button', { name: 'Send Invitation' }))
      
      await waitFor(() => {
        expect(screen.getByText('User is already a member')).toBeInTheDocument()
      })
    })
  })

  describe('Group Details Modal', () => {
    beforeEach(async () => {
      const mockGroups = [
        {
          id: 1,
          name: 'Test Group',
          user_role: 'owner',
          members_count: 2,
          projects_count: 1
        }
      ]
      
      mockAxios.get.mockImplementation((url) => {
        if (url.includes('/groups/1')) {
          return Promise.resolve({
            data: {
              id: 1,
              name: 'Test Group',
              description: 'A test group',
              owner_id: 1,
              members_count: 2,
              projects_count: 1,
              members: [
                {
                  id: 1,
                  user_id: 1,
                  user_name: 'John Owner',
                  user_email: 'owner@example.com',
                  role: 'owner'
                },
                {
                  id: 2,
                  user_id: 2,
                  user_name: 'Jane Member',
                  user_email: 'member@example.com',
                  role: 'member'
                }
              ]
            }
          })
        }
        return Promise.resolve({ data: mockGroups })
      })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Group')).toBeInTheDocument()
      })
    })

    test('opens group details modal', async () => {
      fireEvent.click(screen.getByText('View Details'))
      
      await waitFor(() => {
        expect(screen.getByText('Members (2)')).toBeInTheDocument()
        expect(screen.getByText('John Owner')).toBeInTheDocument()
        expect(screen.getByText('Jane Member')).toBeInTheDocument()
      })
    })

    test('updates member role', async () => {
      mockAxios.patch.mockResolvedValue({ data: {} })
      
      fireEvent.click(screen.getByText('View Details'))
      
      await waitFor(() => {
        expect(screen.getByText('Jane Member')).toBeInTheDocument()
      })
      
      // Find all member containers and get the role select for Jane Member (second member)
      const memberContainers = screen.getAllByText('MEMBER').map(el => el.closest('[class*="flex items-center justify-between"]'))
      const janeContainer = memberContainers.find(container => container.textContent.includes('Jane Member'))
      const roleSelect = within(janeContainer).getByRole('combobox')
      fireEvent.change(roleSelect, { target: { value: 'admin' } })
      
      await waitFor(() => {
        expect(mockAxios.patch).toHaveBeenCalledWith(
          expect.stringContaining('/groups/1/members/2'),
          { role: 'admin' },
          { headers: { Authorization: 'Bearer mock-token' } }
        )
      })
    })

    test('removes member', async () => {
      mockAxios.delete.mockResolvedValue({ data: {} })
      global.confirm.mockReturnValue(true)
      
      fireEvent.click(screen.getByText('View Details'))
      
      await waitFor(() => {
        expect(screen.getByText('Jane Member')).toBeInTheDocument()
      })
      
      // Find Jane Member's container and click her Remove button
      const memberContainers = screen.getAllByText('MEMBER').map(el => el.closest('[class*="flex items-center justify-between"]'))
      const janeContainer = memberContainers.find(container => container.textContent.includes('Jane Member'))
      const removeButton = within(janeContainer).getByText('Remove')
      fireEvent.click(removeButton)
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to remove this member?')
        expect(mockAxios.delete).toHaveBeenCalledWith(
          expect.stringContaining('/groups/1/members/2'),
          { headers: { Authorization: 'Bearer mock-token' } }
        )
      })
    })

    test('cancels member removal', async () => {
      global.confirm.mockReturnValue(false)
      
      fireEvent.click(screen.getByText('View Details'))
      
      await waitFor(() => {
        expect(screen.getByText('Jane Member')).toBeInTheDocument()
      })
      
      // Find Jane Member's container and click her Remove button
      const memberContainers = screen.getAllByText('MEMBER').map(el => el.closest('[class*="flex items-center justify-between"]'))
      const janeContainer = memberContainers.find(container => container.textContent.includes('Jane Member'))
      const removeButton = within(janeContainer).getByText('Remove')
      fireEvent.click(removeButton)
      
      expect(global.confirm).toHaveBeenCalled()
      expect(mockAxios.delete).not.toHaveBeenCalled()
    })

    test('closes group details modal', async () => {
      fireEvent.click(screen.getByText('View Details'))
      
      await waitFor(() => {
        expect(screen.getByText('Members (2)')).toBeInTheDocument()
      })
      
      // Click the X button
      const closeButton = screen.getByRole('button', { name: '' })
      fireEvent.click(closeButton)
      
      expect(screen.queryByText('Members (2)')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'))
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(screen.queryByText('Loading groups...')).not.toBeInTheDocument()
      })
      
      // Should still render the page structure
      expect(screen.getByText('Group Management')).toBeInTheDocument()
    })

    test('redirects to login on 401 error', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 401 }
      })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Badge Colors', () => {
    test('displays correct role badge colors', async () => {
      const mockGroups = [
        { id: 1, name: 'Owner Group', user_role: 'owner', members_count: 1, projects_count: 0 },
        { id: 2, name: 'Admin Group', user_role: 'admin', members_count: 1, projects_count: 0 },
        { id: 3, name: 'Member Group', user_role: 'member', members_count: 1, projects_count: 0 }
      ]
      
      mockAxios.get.mockResolvedValue({ data: mockGroups })
      
      render(<GroupsManagement />)
      
      await waitFor(() => {
        const ownerBadge = screen.getByText('OWNER')
        const adminBadge = screen.getByText('ADMIN')
        const memberBadge = screen.getByText('MEMBER')
        
        expect(ownerBadge).toHaveClass('bg-red-100', 'text-red-800')
        expect(adminBadge).toHaveClass('bg-blue-100', 'text-blue-800')
        expect(memberBadge).toHaveClass('bg-green-100', 'text-green-800')
      })
    })
  })
}) 