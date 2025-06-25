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
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(res.data)
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
      
      setLoading(false)
    }

    loadData()
  }, [token, router, activeTab, fetchStats, fetchUsers, fetchSubscriptions, fetchProjects, fetchIncidents])

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

  const StatusCard = ({ title, value, subtitle, color = "blue" }) => (
    <div className={`bg-white p-6 rounded-lg shadow border-l-4 border-${color}-500`}>
      <div className="flex items-center">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin dashboard...</div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              User Dashboard
            </button>
            <button 
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={() => {
                localStorage.removeItem('token')
                router.push('/login')
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users' },
              { id: 'subscriptions', label: 'Subscriptions' },
              { id: 'projects', label: 'Projects' },
              { id: 'incidents', label: 'Incidents' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">System Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>User Activation Rate</span>
                  <span className="font-medium">
                    {stats.total_users > 0 ? Math.round((stats.active_users / stats.total_users) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pro Conversion Rate</span>
                  <span className="font-medium">
                    {stats.total_users > 0 ? Math.round((stats.pro_subscribers / stats.total_users) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Incident Resolution Rate</span>
                  <span className="font-medium">
                    {stats.total_incidents > 0 ? Math.round(((stats.total_incidents - stats.unresolved_incidents) / stats.total_incidents) * 100) : 100}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">User Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.subscription_tier === 'pro' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.subscription_tier?.toUpperCase() || 'FREE'}
                        </span>
                        {user.subscription_status && (
                          <div className="text-xs text-gray-500 mt-1">{user.subscription_status}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {user.is_admin && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {moment(user.created_at).format('MMM DD, YYYY')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => updateUserStatus(user.id, { is_active: !user.is_active })}
                          className={`px-3 py-1 rounded text-xs ${
                            user.is_active 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => updateUserStatus(user.id, { is_admin: !user.is_admin })}
                          className={`px-3 py-1 rounded text-xs ${
                            user.is_admin 
                              ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' 
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Subscription Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{sub.user_email}</div>
                        <div className="text-sm text-gray-500">Customer: {sub.lemonsqueezy_customer_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sub.tier === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sub.tier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sub.status === 'active' ? 'bg-green-100 text-green-800' :
                          sub.status === 'on_trial' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sub.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sub.trial_ends_at && (
                          <div>Trial ends: {moment(sub.trial_ends_at).format('MMM DD, YYYY')}</div>
                        )}
                        {sub.billing_anchor && (
                          <div>Next billing: {moment(sub.billing_anchor).format('MMM DD, YYYY')}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Project Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incidents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{project.name}</div>
                        <div className="text-sm text-gray-500">ID: {project.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.owner_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Total: {project.incidents_count}
                        </div>
                        <div className="text-sm text-red-600">
                          Unresolved: {project.unresolved_incidents_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          project.unresolved_incidents_count > 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {project.unresolved_incidents_count > 0 ? 'Issues' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Incident Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incident</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{incident.title}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">{incident.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Project ID: {incident.project_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          incident.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {incident.resolved ? 'Resolved' : 'Open'}
                        </span>
                        {incident.resolved && incident.resolved_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Resolved: {moment(incident.resolved_at).format('MMM DD, YYYY')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {moment(incident.created_at).format('MMM DD, YYYY HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}
      </div>
    </div>
  )
}