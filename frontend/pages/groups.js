import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import moment from 'moment'
import logger from '../utils/logger'

export default function GroupsManagement() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('groups')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Groups data
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupDetails, setGroupDetails] = useState(null)

  // Invitations data
  const [invitations, setInvitations] = useState([])

  // Forms
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [inviteForm, setInviteForm] = useState({ 
    group_id: '', 
    invited_email: '', 
    role: 'member', 
    message: '' 
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

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
      await fetchGroups()
      if (activeTab === 'invitations') {
        await fetchInvitations()
      }
      setLoading(false)
    }

    loadData()
  }, [token, router, activeTab, fetchGroups, fetchInvitations])

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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-lg">Loading groups...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your groups, members, and invitations
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="mx-6 mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex px-6">
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`py-2 px-4 border-b-2 font-medium text-sm ${
                    activeTab === 'groups'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Groups ({groups.length})
                </button>
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                    activeTab === 'invitations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Invitations ({invitations.filter(inv => inv.status === 'pending').length})
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'groups' && (
                <div>
                  {/* Create Group Button */}
                  <div className="mb-6">
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Create New Group
                    </button>
                  </div>

                  {/* Groups List */}
                  {groups.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No groups yet. Create your first group!</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {groups.map((group) => (
                        <div key={group.id} className="bg-white border rounded-lg shadow-sm p-6">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(group.user_role)}`}>
                              {group.user_role?.toUpperCase()}
                            </span>
                          </div>
                          
                          {group.description && (
                            <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                          )}
                          
                          <div className="flex justify-between text-sm text-gray-500 mb-4">
                            <span>{group.members_count} members</span>
                            <span>{group.projects_count} projects</span>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedGroup(group.id)
                                fetchGroupDetails(group.id)
                              }}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm px-3 py-1 rounded"
                            >
                              View Details
                            </button>
                            {(group.user_role === 'owner' || group.user_role === 'admin') && (
                              <button
                                onClick={() => openInviteModal(group.id)}
                                className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm px-3 py-1 rounded"
                              >
                                Invite
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invitations' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Received Invitations</h2>
                  {invitations.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No invitations</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {invitations.map((invitation) => (
                        <div key={invitation.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{invitation.group_name}</h3>
                              <p className="text-sm text-gray-600">
                                Invited by {invitation.invited_by_name || invitation.invited_by_email}
                              </p>
                              <p className="text-sm text-gray-500">
                                Role: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(invitation.role)}`}>
                                  {invitation.role.toUpperCase()}
                                </span>
                              </p>
                              {invitation.message && (
                                <p className="text-sm text-gray-600 mt-2 italic">&quot;{invitation.message}&quot;</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Sent {moment(invitation.created_at).fromNow()}
                                {invitation.expires_at && ` • Expires ${moment(invitation.expires_at).fromNow()}`}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(invitation.status)}`}>
                                {invitation.status.toUpperCase()}
                              </span>
                              {invitation.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleInvitationResponse(invitation.id, 'accepted')}
                                    className="bg-green-500 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleInvitationResponse(invitation.id, 'declined')}
                                    className="bg-red-500 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Group</h3>
              <form onSubmit={handleCreateGroup}>
                <div className="mb-4">
                  <label htmlFor="group-name" className="block text-gray-700 text-sm font-bold mb-2">
                    Group Name *
                  </label>
                  <input
                    id="group-name"
                    type="text"
                    required
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="group-description" className="block text-gray-700 text-sm font-bold mb-2">
                    Description
                  </label>
                  <textarea
                    id="group-description"
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="3"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Invitation</h3>
              <form onSubmit={handleSendInvitation}>
                <div className="mb-4">
                  <label htmlFor="invite-email" className="block text-gray-700 text-sm font-bold mb-2">
                    Email Address *
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteForm.invited_email}
                    onChange={(e) => setInviteForm({ ...inviteForm, invited_email: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="invite-role" className="block text-gray-700 text-sm font-bold mb-2">
                    Role
                  </label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="invite-message" className="block text-gray-700 text-sm font-bold mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    id="invite-message"
                    value={inviteForm.message}
                    onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="2"
                    placeholder="Add a personal message..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {selectedGroup && groupDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">{groupDetails.name}</h3>
                <button
                  onClick={() => {
                    setSelectedGroup(null)
                    setGroupDetails(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              {groupDetails.description && (
                <p className="text-gray-600 mb-4">{groupDetails.description}</p>
              )}
              
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3">Members ({groupDetails.members_count})</h4>
                <div className="space-y-2">
                  {groupDetails.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        {member.user_avatar_url && (
                          <img 
                            src={member.user_avatar_url} 
                            alt={member.user_name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium">{member.user_name || member.user_email}</p>
                          <p className="text-sm text-gray-500">{member.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                          {member.role.toUpperCase()}
                        </span>
                        {(groupDetails.owner_id === groupDetails.id || member.role !== 'owner') && (
                          <div className="flex space-x-1">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                              className="text-xs border rounded px-2 py-1"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                              {groupDetails.owner_id === groupDetails.id && (
                                <option value="owner">Owner</option>
                              )}
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 