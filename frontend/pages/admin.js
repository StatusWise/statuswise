import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import moment from 'moment'
import logger from '../utils/logger'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [projects, setProjects] = useState([])
  const [incidents, setIncidents] = useState([])
  const [groups, setGroups] = useState([])
  const [groupStats, setGroupStats] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, groupStatsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/groups/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { total_groups: 0, active_groups: 0, total_members: 0, pending_invitations: 0 } }))
      ])
      
      setStats(statsRes.data)
      setGroupStats(groupStatsRes.data)
    } catch (error) {
      logger.error('Error fetching stats:', error)
      if (error.response?.status === 403) {
        setError('Admin access required')
      } else if (error.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
    }
  }, [token, router])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/users?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (error) {
      logger.error('Error fetching users:', error)
    }
  }, [token])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/subscriptions?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscriptions(res.data)
    } catch (error) {
      logger.error('Error fetching subscriptions:', error)
    }
  }, [token])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/projects?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProjects(res.data)
    } catch (error) {
      logger.error('Error fetching projects:', error)
    }
  }, [token])

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/incidents?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncidents(res.data)
    } catch (error) {
      logger.error('Error fetching incidents:', error)
    }
  }, [token])

  const fetchGroups = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/groups?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setGroups(res.data)
    } catch (error) {
      logger.error('Error fetching groups:', error)
    }
  }, [token])



  const fetchInvitations = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/invitations?limit=50`, {
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
      await fetchStats()
      
      if (activeTab === 'users') await fetchUsers()
      else if (activeTab === 'subscriptions') await fetchSubscriptions()
      else if (activeTab === 'projects') await fetchProjects()
      else if (activeTab === 'incidents') await fetchIncidents()
      else if (activeTab === 'groups') await fetchGroups()
      else if (activeTab === 'invitations') await fetchInvitations()
      
      setLoading(false)
    }

    loadData()
  }, [token, router, activeTab, fetchStats, fetchUsers, fetchSubscriptions, fetchProjects, fetchIncidents, fetchGroups, fetchInvitations])

  const updateUserStatus = async (userId, updates) => {
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users/${userId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      })
      await fetchUsers()
      setError('')
    } catch (error) {
      logger.error('Error updating user:', error)
      setError('Failed to update user status')
    }
  }

  const StatusCard = ({ title, value, subtitle, color = "blue" }) => {
    const colorMap = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      red: '#ef4444',
      indigo: '#6366f1',
      teal: '#14b8a6',
      orange: '#f59e0b',
      cyan: '#06b6d4'
    }
    
    return (
      <div style={{ 
        backgroundColor: '#1e293b', 
        padding: '1.5rem', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
        borderLeft: `4px solid ${colorMap[color] || colorMap.blue}` 
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#94a3b8' }}>{title}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f1f5f9' }}>{value}</p>
            {subtitle && <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{subtitle}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (loading && !stats) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '1.25rem', color: '#f1f5f9' }}>Loading admin dashboard...</div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#ef4444', fontSize: '1.25rem', marginBottom: '1rem' }}>{error}</div>
          <button 
            onClick={() => router.push('/dashboard')}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Back to Dashboard
          </button>
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
                  color: '#94a3b8',
                  border: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#f1f5f9'}
                onMouseOut={(e) => e.target.style.color = '#94a3b8'}
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/groups')}
                style={{
                  background: 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = '#f1f5f9'}
                onMouseOut={(e) => e.target.style.color = '#94a3b8'}
              >
                Groups
              </button>
              <button
                onClick={() => router.push('/admin')}
                style={{
                  backgroundColor: '#1e3a8a',
                  color: '#60a5fa',
                  border: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Admin
              </button>
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

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
              System administration and user management
            </p>
          </div>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#7f1d1d', 
            border: '1px solid #dc2626', 
            color: '#fca5a5', 
            padding: '0.75rem 1rem', 
            borderRadius: '0.375rem', 
            marginBottom: '1.5rem' 
          }}>
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ borderBottom: '1px solid #475569', marginBottom: '2rem' }}>
          <nav style={{ display: 'flex', gap: '2rem', marginBottom: '-1px' }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users' },
              { id: 'subscriptions', label: 'Subscriptions' },
              { id: 'projects', label: 'Projects' },
              { id: 'incidents', label: 'Incidents' },
              { id: 'groups', label: 'Groups' },
              { id: 'invitations', label: 'Invitations' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 0.25rem',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  color: activeTab === tab.id ? '#60a5fa' : '#94a3b8',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#f1f5f9'
                    e.target.style.borderBottomColor = '#64748b'
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.color = '#94a3b8'
                    e.target.style.borderBottomColor = 'transparent'
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '1.5rem', 
              marginBottom: '2rem' 
            }}>
              <StatusCard 
                title="Total Users" 
                value={stats.total_users} 
                subtitle={`${stats.active_users} active`}
                color="blue"
              />
              <StatusCard 
                title="Pro Subscribers" 
                value={stats.pro_subscribers} 
                subtitle={`${stats.free_users} free users`}
                color="green"
              />
              <StatusCard 
                title="Total Projects" 
                value={stats.total_projects} 
                color="purple"
              />
              <StatusCard 
                title="Total Incidents" 
                value={stats.total_incidents} 
                subtitle={`${stats.unresolved_incidents} unresolved`}
                color="red"
              />
            </div>

            {/* Group Statistics */}
            {groupStats && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '1.5rem', 
                marginBottom: '2rem' 
              }}>
                <StatusCard 
                  title="Total Groups" 
                  value={groupStats.total_groups} 
                  subtitle={`${groupStats.active_groups} active`}
                  color="indigo"
                />
                <StatusCard 
                  title="Group Members" 
                  value={groupStats.total_members} 
                  color="teal"
                />
                <StatusCard 
                  title="Pending Invitations" 
                  value={groupStats.pending_invitations} 
                  color="orange"
                />
                <StatusCard 
                  title="Avg Members/Group" 
                  value={groupStats.total_groups > 0 ? Math.round(groupStats.total_members / groupStats.total_groups * 10) / 10 : 0} 
                  color="cyan"
                />
              </div>
            )}

            <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#f1f5f9' }}>System Health</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#e2e8f0' }}>User Activation Rate</span>
                  <span style={{ fontWeight: '500', color: '#f1f5f9' }}>
                    {stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#e2e8f0' }}>Pro Conversion Rate</span>
                  <span style={{ fontWeight: '500', color: '#f1f5f9' }}>
                    {stats.total_users > 0 ? Math.round((stats.pro_subscribers / stats.total_users) * 100) : 0}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#e2e8f0' }}>Incident Resolution Rate</span>
                  <span style={{ fontWeight: '500', color: '#f1f5f9' }}>
                    {stats.total_incidents > 0 ? Math.round(((stats.total_incidents - stats.unresolved_incidents) / stats.total_incidents) * 100) : 100}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #475569' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>User Management</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                    <tr style={{ backgroundColor: '#334155', borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        User
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Subscription
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Created
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                <tbody>
                                      {users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #475569' }}>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f1f5f9' }}>{user.email}</div>
                            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>ID: {user.id}</div>
                          </div>
                        </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: user.subscription_tier === 'pro' ? '#f3e8ff' : '#f3f4f6',
                          color: user.subscription_tier === 'pro' ? '#7c3aed' : '#374151'
                        }}>
                          {user.subscription_tier?.toUpperCase() || 'FREE'}
                        </span>
                        {user.subscription_status && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{user.subscription_status}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '0.125rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            borderRadius: '9999px',
                            backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2',
                            color: user.is_active ? '#166534' : '#dc2626'
                          }}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {user.is_admin && (
                            <span style={{
                              display: 'inline-flex',
                              padding: '0.125rem 0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              borderRadius: '9999px',
                              backgroundColor: '#dbeafe',
                              color: '#1d4ed8'
                            }}>
                              Admin
                            </span>
                          )}
                        </div>
                                              </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                          {moment(user.created_at).format('MMM DD, YYYY')}
                        </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => updateUserStatus(user.id, { is_active: !user.is_active })}
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: user.is_active ? '#fee2e2' : '#dcfce7',
                              color: user.is_active ? '#dc2626' : '#166534'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = user.is_active ? '#fecaca' : '#bbf7d0'}
                            onMouseOut={(e) => e.target.style.backgroundColor = user.is_active ? '#fee2e2' : '#dcfce7'}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => updateUserStatus(user.id, { is_admin: !user.is_admin })}
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: user.is_admin ? '#f3f4f6' : '#dbeafe',
                              color: user.is_admin ? '#374151' : '#1d4ed8'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = user.is_admin ? '#e5e7eb' : '#bfdbfe'}
                            onMouseOut={(e) => e.target.style.backgroundColor = user.is_admin ? '#f3f4f6' : '#dbeafe'}
                          >
                            {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #475569' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Subscription Management</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                    <tr style={{ backgroundColor: '#334155', borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        User
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Plan
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Billing
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Created
                      </th>
                    </tr>
                  </thead>
                <tbody>
                                      {subscriptions.map((sub) => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #475569' }}>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f1f5f9' }}>{sub.user_email}</div>
                          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Customer: {sub.lemonsqueezy_customer_id}</div>
                        </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: sub.tier === 'pro' ? '#f3e8ff' : '#f3f4f6',
                          color: sub.tier === 'pro' ? '#7c3aed' : '#374151'
                        }}>
                          {sub.tier.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: sub.status === 'active' ? '#dcfce7' : sub.status === 'on_trial' ? '#dbeafe' : '#fef3c7',
                          color: sub.status === 'active' ? '#166534' : sub.status === 'on_trial' ? '#1d4ed8' : '#d97706'
                        }}>
                          {sub.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                                              <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                          {sub.trial_ends_at && (
                            <div>Trial ends: {moment(sub.trial_ends_at).format('MMM DD, YYYY')}</div>
                          )}
                          {sub.billing_anchor && (
                            <div>Next billing: {moment(sub.billing_anchor).format('MMM DD, YYYY')}</div>
                          )}
                          {!sub.trial_ends_at && !sub.billing_anchor && <span>—</span>}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
                          {moment(sub.created_at).format('MMM DD, YYYY')}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #475569' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Project Management</h3>
            </div>
            {projects.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.125rem', fontWeight: '500', color: '#f1f5f9', marginBottom: '0.5rem' }}>No projects found</div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>There are no projects in the system yet.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#334155', borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Project
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Owner
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Incidents
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} style={{ borderBottom: '1px solid #475569' }}>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f1f5f9' }}>{project.name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>ID: {project.id}</div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                          {project.owner_email}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', color: '#f1f5f9' }}>
                            Total: {project.incidents_count || 0}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#fca5a5' }}>
                            Unresolved: {project.unresolved_incidents_count || 0}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            padding: '0.125rem 0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            borderRadius: '9999px',
                            backgroundColor: (project.unresolved_incidents_count || 0) > 0 ? '#fee2e2' : '#dcfce7',
                            color: (project.unresolved_incidents_count || 0) > 0 ? '#dc2626' : '#166534'
                          }}>
                            {(project.unresolved_incidents_count || 0) > 0 ? 'Issues' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #475569' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Incident Management</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                    <tr style={{ backgroundColor: '#334155', borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Incident
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Project
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Created
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{incident.title}</div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.description}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                        Project ID: {incident.project_id}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: incident.resolved ? '#dcfce7' : '#fee2e2',
                          color: incident.resolved ? '#166534' : '#dc2626'
                        }}>
                          {incident.resolved ? 'Resolved' : 'Open'}
                        </span>
                        {incident.resolved && incident.resolved_at && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            Resolved: {moment(incident.resolved_at).format('MMM DD, YYYY')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                        {moment(incident.created_at).format('MMM DD, YYYY HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #475569' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Group Management</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                    <tr style={{ backgroundColor: '#334155', borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Group
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Owner
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Members
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Projects
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Created
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{group.name}</div>
                        {group.description && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ID: {group.id}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#111827' }}>{group.owner_name || group.owner_email}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{group.owner_email}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: '#111827' }}>{group.members_count}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {group.members?.filter(m => m.role === 'owner').length || 0} owners, {' '}
                          {group.members?.filter(m => m.role === 'admin').length || 0} admins
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#111827' }}>
                        {group.projects_count}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: group.is_active ? '#dcfce7' : '#fee2e2',
                          color: group.is_active ? '#166534' : '#dc2626'
                        }}>
                          {group.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                        {moment(group.created_at).format('MMM DD, YYYY')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #475569' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Group Invitation Management</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                    <tr style={{ backgroundColor: '#334155', borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Invitation
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Group
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Invited By
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Role
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Created
                      </th>
                    </tr>
                  </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {invitation.invited_email}
                        </div>
                        {invitation.message && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
                            &quot;{invitation.message}&quot;
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ID: {invitation.id}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#111827' }}>{invitation.group_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Group ID: {invitation.group_id}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#111827' }}>
                          {invitation.invited_by_name || invitation.invited_by_email}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{invitation.invited_by_email}</div>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: invitation.role === 'owner' ? '#fee2e2' : invitation.role === 'admin' ? '#dbeafe' : '#dcfce7',
                          color: invitation.role === 'owner' ? '#dc2626' : invitation.role === 'admin' ? '#1d4ed8' : '#166534'
                        }}>
                          {invitation.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          borderRadius: '9999px',
                          backgroundColor: invitation.status === 'pending' ? '#fef3c7' : invitation.status === 'accepted' ? '#dcfce7' : invitation.status === 'declined' ? '#fee2e2' : '#f3f4f6',
                          color: invitation.status === 'pending' ? '#d97706' : invitation.status === 'accepted' ? '#166534' : invitation.status === 'declined' ? '#dc2626' : '#374151'
                        }}>
                          {invitation.status.toUpperCase()}
                        </span>
                        {invitation.expires_at && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            Expires: {moment(invitation.expires_at).format('MMM DD, YYYY')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                        {moment(invitation.created_at).format('MMM DD, YYYY')}
                        {invitation.responded_at && (
                          <div style={{ fontSize: '0.75rem' }}>
                            Responded: {moment(invitation.responded_at).format('MMM DD')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ color: '#94a3b8' }}>Loading...</div>
          </div>
        )}
      </div>
    </div>
  )
}