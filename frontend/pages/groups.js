import React, { useState, useEffect, useCallback} from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import moment from 'moment'
import logger from '../utils/logger'
import { Button, Card, Modal, Badge, Alert, Input } from '../components/ui'

export default function GroupsManagement() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('groups')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  // Groups data
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupDetails, setGroupDetails] = useState(null)

  // Invitations data
  const [invitations, setInvitations] = useState([])

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showGroupDetails, setShowGroupDetails] = useState(false)

  // Forms
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [inviteForm, setInviteForm] = useState({ 
    group_id: '', 
    invited_email: '', 
    role: 'member', 
    message: '' 
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  // Fetch current user admin status
  const fetchCurrentUser = useCallback(async () => {
    try {
      // Check admin status by trying to access admin stats
      await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // If successful, user is admin
      setCurrentUser(prev => {
        if (!prev || prev.is_admin !== true) {
          return { is_admin: true }
        }
        return prev
      })
    } catch {
      // If failed, user is not admin
      setCurrentUser(prev => {
        if (!prev || prev.is_admin !== false) {
          return { is_admin: false }
        }
        return prev
      })
    }
  }, [token])

  // Fetch user's groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/groups/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGroups(res.data)
    } catch (error) {
      logger.error('Error fetching groups:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    }
  }, [token, router])

  // Fetch group details
  const fetchGroupDetails = useCallback(async (groupId) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGroupDetails(res.data)
      setShowGroupDetails(true)
    } catch (error) {
      logger.error('Error fetching group details:', error)
      setError('Failed to load group details')
    }
  }, [token])

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/invitations/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setInvitations(res.data)
    } catch (error) {
      logger.error('Error fetching invitations:', error)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchGroups(),
        fetchCurrentUser(),
        activeTab === 'invitations' ? fetchInvitations() : Promise.resolve()
      ])
      setLoading(false)
    }

    loadData()
  }, [token, router, activeTab, fetchGroups, fetchInvitations, fetchCurrentUser])

  // Create group
  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/groups/`, groupForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Group created successfully')
      setGroupForm({ name: '', description: '' })
      setShowCreateGroup(false)
      await fetchGroups()
    } catch (error) {
      logger.error('Error creating group:', error)
      setError(error.response?.data?.detail || 'Failed to create group')
    }
  }

  // Send invitation
  const handleSendInvitation = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/groups/invitations/`, inviteForm, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Invitation sent successfully')
      setInviteForm({ group_id: '', invited_email: '', role: 'member', message: '' })
      setShowInviteModal(false)
    } catch (error) {
      logger.error('Error sending invitation:', error)
      setError(error.response?.data?.detail || 'Failed to send invitation')
    }
  }

  // Respond to invitation
  const handleInvitationResponse = async (invitationId, status) => {
    setError('')
    setSuccess('')

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/invitations/${invitationId}`, {
        status: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess(`Invitation ${status.toLowerCase()} successfully`)
      await fetchInvitations()
      await fetchGroups() // Refresh groups if accepted
    } catch (error) {
      logger.error('Error responding to invitation:', error)
      setError(error.response?.data?.detail || 'Failed to respond to invitation')
    }
  }

  // Update member role
  const handleUpdateMemberRole = async (memberId, role) => {
    setError('')
    setSuccess('')

    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${selectedGroup}/members/${memberId}`, {
        role: role
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Member role updated successfully')
      await fetchGroupDetails(selectedGroup)
    } catch (error) {
      logger.error('Error updating member role:', error)
      setError(error.response?.data?.detail || 'Failed to update member role')
    }
  }

  // Remove member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return
    
    setError('')
    setSuccess('')

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/groups/${selectedGroup}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Member removed successfully')
      await fetchGroupDetails(selectedGroup)
    } catch (error) {
      logger.error('Error removing member:', error)
      setError(error.response?.data?.detail || 'Failed to remove member')
    }
  }

  const openInviteModal = (groupId) => {
    setInviteForm({ ...inviteForm, group_id: groupId })
    setShowInviteModal(true)
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'owner': return 'danger'
      case 'admin': return 'primary'
      case 'member': return 'success'
      default: return 'secondary'
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'accepted': return 'success'
      case 'declined': return 'danger'
      case 'expired': return 'secondary'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '2rem', 
            height: '2rem', 
            margin: '0 auto 1rem auto',
            border: '2px solid #334155',
            borderTop: '2px solid #60a5fa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ fontSize: '1.125rem', color: '#cbd5e1' }}>Loading groups...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      {/* Navigation */}
      <nav style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f1f5f9' }}>StatusWise</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'transparent',
                  color: router.pathname === '/dashboard' ? '#60a5fa' : '#94a3b8',
                  backgroundColor: router.pathname === '/dashboard' ? '#1e3a8a' : 'transparent',
                  border: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => {
                  if (router.pathname !== '/dashboard') e.target.style.color = '#f1f5f9'
                }}
                onMouseOut={(e) => {
                  if (router.pathname !== '/dashboard') e.target.style.color = '#94a3b8'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/groups')}
                style={{
                  background: 'transparent',
                  color: router.pathname === '/groups' ? '#60a5fa' : '#94a3b8',
                  backgroundColor: router.pathname === '/groups' ? '#1e3a8a' : 'transparent',
                  border: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => {
                  if (router.pathname !== '/groups') e.target.style.color = '#f1f5f9'
                }}
                onMouseOut={(e) => {
                  if (router.pathname !== '/groups') e.target.style.color = '#94a3b8'
                }}
              >
                Groups
              </button>
              {currentUser?.is_admin && (
                <button
                  onClick={() => router.push('/admin')}
                  style={{
                    background: 'transparent',
                    color: router.pathname === '/admin' ? '#60a5fa' : '#94a3b8',
                    backgroundColor: router.pathname === '/admin' ? '#1e3a8a' : 'transparent',
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (router.pathname !== '/admin') e.target.style.color = '#f1f5f9'
                  }}
                  onMouseOut={(e) => {
                    if (router.pathname !== '/admin') e.target.style.color = '#94a3b8'
                  }}
                >
                  Admin
                </button>
              )}
              <button 
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
                onClick={() => {
                  localStorage.removeItem('token')
                  router.push('/login')
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>Groups</h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
              Manage your groups, members, and invitations
            </p>
          </div>
          <div>
            <Button
              variant="primary"
              onClick={() => setShowCreateGroup(true)}
            >
              Create Group
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Alert variant="error" dismissible onDismiss={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}
        {success && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Alert variant="success" dismissible onDismiss={() => setSuccess('')}>
              {success}
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <Card>
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #334155' }}>
            <nav style={{ display: 'flex', padding: '0 1.5rem', marginBottom: '-1px' }}>
              <button
                onClick={() => setActiveTab('groups')}
                style={{
                  padding: '0.75rem 0.5rem',
                  borderBottom: activeTab === 'groups' ? '2px solid #60a5fa' : '2px solid transparent',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  color: activeTab === 'groups' ? '#60a5fa' : '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                My Groups ({groups.length})
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                style={{
                  marginLeft: '2rem',
                  padding: '0.75rem 0.5rem',
                  borderBottom: activeTab === 'invitations' ? '2px solid #60a5fa' : '2px solid transparent',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  color: activeTab === 'invitations' ? '#60a5fa' : '#94a3b8',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Invitations ({invitations.filter(inv => inv.status === 'pending').length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'groups' && (
              <div>
                {/* Groups Grid */}
                {groups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <div style={{ width: '4rem', height: '4rem', backgroundColor: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <svg style={{ width: '2rem', height: '2rem', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#f1f5f9', marginBottom: '0.5rem' }}>No groups yet</h3>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Create your first group to get started with team collaboration.</p>
                    <Button onClick={() => setShowCreateGroup(true)}>
                      Create Your First Group
                    </Button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #475569' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#e2e8f0' }}>
                            Group Name
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#e2e8f0' }}>
                            Description
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>
                            Role
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>
                            Members
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>
                            Projects
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#e2e8f0' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((group) => (
                          <tr key={group.id} style={{ borderBottom: '1px solid #475569' }}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ fontWeight: '500', color: '#f1f5f9' }}>
                                {group.name}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '200px' }}>
                                {group.description || '—'}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                              <Badge variant={getRoleBadgeVariant(group.user_role)}>
                                {group.user_role?.toUpperCase()}
                              </Badge>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg 
                                  style={{ width: '1em', height: '1em', marginRight: '0.25rem' }} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                {group.members_count}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg 
                                  style={{ width: '1em', height: '1em', marginRight: '0.25rem' }} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                {group.projects_count}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedGroup(group.id)
                                    fetchGroupDetails(group.id)
                                  }}
                                >
                                  View Details
                                </Button>
                                {(group.user_role === 'owner' || group.user_role === 'admin') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openInviteModal(group.id)}
                                  >
                                    Invite
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invitations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Received Invitations</h2>
                </div>
                
                {invitations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <div style={{ 
                      width: '4rem', 
                      height: '4rem', 
                      backgroundColor: '#334155', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      margin: '0 auto 1rem auto' 
                    }}>
                      <svg style={{ width: '2rem', height: '2rem', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#f1f5f9', marginBottom: '0.5rem' }}>No invitations</h3>
                    <p style={{ color: '#94a3b8' }}>You don&apos;t have any pending invitations at the moment.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #475569' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#e2e8f0' }}>
                            Group Name
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#e2e8f0' }}>
                            Invited By
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>
                            Role
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>
                            Status
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#e2e8f0' }}>
                            Message
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#e2e8f0' }}>
                            Date
                          </th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#e2e8f0' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((invitation) => (
                          <tr key={invitation.id} style={{ borderBottom: '1px solid #475569' }}>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ fontWeight: '500', color: '#f1f5f9' }}>
                                {invitation.group_name}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                                {invitation.invited_by_name || invitation.invited_by_email}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                              <Badge variant={getRoleBadgeVariant(invitation.role)} size="sm">
                                {invitation.role.toUpperCase()}
                              </Badge>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                              <Badge variant={getStatusBadgeVariant(invitation.status)}>
                                {invitation.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <div style={{ fontSize: '0.875rem', color: '#94a3b8', fontStyle: 'italic', maxWidth: '200px' }}>
                                {invitation.message ? `"${invitation.message}"` : '—'}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {moment(invitation.created_at).fromNow()}
                                {invitation.expires_at && (
                                  <div>Expires {moment(invitation.expires_at).fromNow()}</div>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                              {invitation.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create Group Modal */}
      <Modal 
        isOpen={showCreateGroup} 
        onClose={() => setShowCreateGroup(false)}
        size="md"
      >
        <Modal.Header onClose={() => setShowCreateGroup(false)}>
          Create New Group
        </Modal.Header>
        <form onSubmit={handleCreateGroup}>
          <Modal.Body>
            <div className="space-y-4">
              <Input
                label="Group Name"
                type="text"
                required
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="Enter group name"
              />
              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="Enter group description (optional)"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateGroup(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Group
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)}
        size="md"
      >
        <Modal.Header onClose={() => setShowInviteModal(false)}>
          Send Invitation
        </Modal.Header>
        <form onSubmit={handleSendInvitation}>
          <Modal.Body>
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={inviteForm.invited_email}
                onChange={(e) => setInviteForm({ ...inviteForm, invited_email: e.target.value })}
                placeholder="Enter email address"
              />
              <div>
                <label className="form-label">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="form-input"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label">Message (Optional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="form-input"
                  rows="2"
                  placeholder="Add a personal message..."
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Invitation
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Group Details Modal */}
      <Modal 
        isOpen={showGroupDetails && groupDetails} 
        onClose={() => {
          setShowGroupDetails(false)
          setSelectedGroup(null)
          setGroupDetails(null)
        }}
        size="4xl"
      >
        <Modal.Header onClose={() => {
          setShowGroupDetails(false)
          setSelectedGroup(null)
          setGroupDetails(null)
        }}>
          {groupDetails?.name}
        </Modal.Header>
        <Modal.Body>
          {groupDetails && (
            <div className="space-y-6">
              {groupDetails.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{groupDetails.description}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  Members ({groupDetails.members_count})
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                          Member
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>
                          Role
                        </th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupDetails.members?.map((member) => (
                        <tr key={member.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '1rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {member.user_avatar_url && (
                                <img 
                                  src={member.user_avatar_url} 
                                  alt={member.user_name}
                                  style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%' }}
                                />
                              )}
                              <div>
                                <div style={{ fontWeight: '500', color: '#111827' }}>
                                  {member.user_name || member.user_email}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {member.user_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role.toUpperCase()}
                            </Badge>
                          </td>
                          <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                            {(groupDetails.owner_id === groupDetails.id || member.role !== 'owner') ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                  style={{ 
                                    fontSize: '0.875rem', 
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '0.25rem', 
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                  {groupDetails.owner_id === groupDetails.id && (
                                    <option value="owner">Owner</option>
                                  )}
                                </select>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
} 