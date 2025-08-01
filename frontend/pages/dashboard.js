import React, { useState, useEffect, useCallback, useContext } from 'react'
import Head from 'next/head'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useRouter } from 'next/router'
import moment from 'moment'
import logger from '../utils/logger'
import { ConfigContext } from './_app'
import { Button, Card, Modal, Badge, Alert, Input } from '../components/ui'

// Zod schemas for validation
const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters long')
    .max(100, 'Project name must be less than 100 characters')
    .transform(val => val.trim()),
  is_public: z.boolean().default(false)
})

const incidentSchema = z.object({
  title: z
    .string()
    .min(1, 'Incident title is required')
    .min(3, 'Incident title must be at least 3 characters long')
    .transform(val => val.trim()),
  description: z
    .string()
    .min(1, 'Incident description is required')
    .min(10, 'Incident description must be at least 10 characters long')
    .transform(val => val.trim()),
  scheduled_start: z
    .string()
    .optional()
    .transform(val => val && val.trim() ? new Date(val).toISOString() : null)
})

export default function Dashboard() {
  const router = useRouter()
  const { isBillingEnabled } = useContext(ConfigContext)
  
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showCreateIncident, setShowCreateIncident] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  // Project form
  const projectForm = useForm({
    resolver: zodResolver(projectSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      is_public: false
    }
  })

  // Incident form
  const incidentForm = useForm({
    resolver: zodResolver(incidentSchema),
    mode: 'onBlur'
  })

  const fetchSubscriptionStatus = useCallback(async () => {
    // Only fetch subscription status if billing is enabled
    if (!isBillingEnabled()) {
      // Set a mock subscription for unlimited usage when billing is disabled
      setSubscription(prev => {
        const newSub = {
          tier: 'pro',  // Use "pro" as unlimited tier when billing disabled
          status: 'active',
          expires_at: null,
          limits: {
            max_projects: 999999,
            max_incidents_per_project: 999999,
            features: ['all_features_enabled']
          },
          usage: { projects: projects.length, max_projects: 999999 }
        }
        
        // Only update if different to prevent infinite loops
        if (!prev || prev.tier !== newSub.tier || prev.usage.projects !== newSub.usage.projects) {
          return newSub
        }
        return prev
      })
      return
    }
    
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscription(res.data)
    } catch (error) {
      logger.error('Error fetching subscription:', error)
      // Don't set error for subscription fetch failures
    }
  }, [token, isBillingEnabled, projects.length])

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

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/projects/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProjects(res.data)
      setError('')
    } catch (error) {
      logger.error('Error fetching projects:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      } else {
        setError('Failed to fetch projects. Please try again.')
      }
    }
  }, [token, router])

  useEffect(() => {
    if (!token) {
      router.push('/login')
    } else {
      const loadData = async () => {
        setLoading(true)
        await Promise.all([
          fetchProjects(),
          fetchSubscriptionStatus(),
          fetchCurrentUser()
        ])
        setLoading(false)
      }
      loadData()
    }
  }, [token, router, fetchProjects, fetchSubscriptionStatus, fetchCurrentUser])

  // Check for subscription success/cancel messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const subscriptionStatus = urlParams.get('subscription')
    
    if (subscriptionStatus === 'success') {
      setError('')
      setSuccess('Subscription upgraded successfully!')
      // Refresh subscription status
      setTimeout(() => {
        fetchSubscriptionStatus()
      }, 1000)
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (subscriptionStatus === 'cancelled') {
      setError('Subscription upgrade was cancelled.')
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [fetchSubscriptionStatus])

  const onCreateProject = async (data) => {
    setError('')
    setSuccess('')
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/projects/`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Project created successfully!')
      projectForm.reset()
      setShowCreateProject(false)
      await fetchProjects()
      await fetchSubscriptionStatus() // Refresh usage
    } catch (error) {
      logger.error('Error creating project:', error)
      if (error.response?.status === 422) {
        const detail = error.response.data?.detail
        if (Array.isArray(detail)) {
          detail.forEach(err => {
            const field = err.loc?.[err.loc.length - 1]
            if (field === 'name') {
              projectForm.setError('name', { message: err.msg })
            }
          })
        } else {
          projectForm.setError('name', { message: 'Invalid project name' })
        }
      } else if (error.response?.status === 400) {
        projectForm.setError('name', { message: 'Project with this name already exists' })
      } else if (error.response?.status === 403) {
        // Subscription limit reached
        setError(error.response.data?.detail || 'Project limit reached. Upgrade to create more projects.')
      } else {
        setError('Failed to create project. Please try again.')
      }
    }
  }

  const fetchIncidents = async (projectId) => {
    setSelectedProject(projectId)
    setError('')
    setSuccess('')
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncidents(res.data)
    } catch (error) {
      logger.error('Error fetching incidents:', error)
      setIncidents([])
      setError('Failed to fetch incidents. Please try again.')
    }
  }

  const onCreateIncident = async (data) => {
    setError('')
    setSuccess('')
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/incidents/`, {
        project_id: selectedProject,
        ...data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Incident created successfully!')
      incidentForm.reset()
      setShowCreateIncident(false)
      await fetchIncidents(selectedProject)
    } catch (error) {
      logger.error('Error creating incident:', error)
      if (error.response?.status === 422) {
        const detail = error.response.data?.detail
        if (Array.isArray(detail)) {
          detail.forEach(err => {
            const field = err.loc?.[err.loc.length - 1]
            if (['title', 'description'].includes(field)) {
              incidentForm.setError(field, { message: err.msg })
            }
          })
        } else {
          setError('Invalid incident data. Please check your input.')
        }
      } else if (error.response?.status === 403) {
        // Subscription limit reached
        setError(error.response.data?.detail || 'Incident limit reached. Upgrade to create more incidents.')
      } else {
        setError('Failed to create incident. Please try again.')
      }
    }
  }

  const toggleProjectPrivacy = async (projectId, isPublic) => {
    setError('')
    setSuccess('')
    
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
        is_public: isPublic
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setSuccess(`Project ${isPublic ? 'made public' : 'made private'} successfully!`)
      // Refresh projects list to show updated privacy status
      await fetchProjects()
    } catch (error) {
      logger.error('Error updating project privacy:', error)
      if (error.response?.status === 403) {
        setError('You do not have permission to modify this project.')
      } else if (error.response?.status === 404) {
        setError('Project not found.')
      } else {
        setError('Failed to update project privacy. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <Head>
        <title>StatusWise - Dashboard</title>
      </Head>
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
              {isBillingEnabled() && subscription && (
                <span style={{
                  backgroundColor: subscription.tier === 'pro' ? '#3b82f6' : '#6b7280',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {subscription.tier?.toUpperCase() || 'FREE'}
                </span>
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
        <div style={{ marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>Dashboard</h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>
              Manage your projects and monitor system status
            </p>
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

        {/* Subscription Status Card - only show if billing is enabled */}
        {isBillingEnabled() && subscription && (
          <div style={{ marginBottom: '2rem' }}>
            <Card style={{ borderLeft: '4px solid #3b82f6' }}>
              <Card.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontWeight: '600', color: '#f1f5f9', marginBottom: '0.25rem' }}>
                      {subscription.tier === 'pro' ? (isBillingEnabled() ? 'Pro Plan' : 'Unlimited Plan') : 'Free Plan'}
                    </h3>
                    <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                      Projects: <span style={{ fontWeight: '500' }}>{subscription.usage.projects}</span> / {subscription.limits.max_projects === 999999 ? '∞' : subscription.limits.max_projects}
                      {subscription.tier === 'free' && subscription.usage.projects >= subscription.limits.max_projects && (
                        <Badge variant="danger" style={{ marginLeft: '0.5rem' }}>Limit reached!</Badge>
                      )}
                    </div>
                  </div>
                  {subscription.tier === 'free' && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <Button onClick={() => router.push('/subscription')}>
                          Upgrade to Pro
                        </Button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Get 10 projects & more features
                      </div>
                    </div>
                  )}
                  {subscription.tier === 'pro' && subscription.status && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant={
                        subscription.status === 'active' ? 'success' : 
                        subscription.status === 'on_trial' ? 'primary' : 'warning'
                      }>
                        {subscription.status === 'on_trial' ? 'Trial Active' : 
                         subscription.status === 'active' ? 'Active' : subscription.status}
                      </Badge>
                      {subscription.expires_at && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          {subscription.status === 'on_trial' ? 'Trial ends' : 'Next billing'}: {' '}
                          {new Date(subscription.expires_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                  {subscription.tier === 'pro' && !isBillingEnabled() && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="success">
                        All Features Enabled
                      </Badge>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Billing disabled on this instance
                      </div>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Projects Section */}
        <div style={{ marginBottom: '2rem' }}>
          <Card>
            <Card.Header>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>Projects</h3>
                <Button onClick={() => setShowCreateProject(true)}>
                  Create Project
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
            {projects.length === 0 ? (
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#f1f5f9', marginBottom: '0.5rem' }}>No projects yet</h3>
                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Create your first project to start monitoring your services.</p>
                <Button onClick={() => setShowCreateProject(true)}>
                  Create Your First Project
                </Button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #475569' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#f1f5f9' }}>
                        Project Name
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9' }}>
                        Status
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#f1f5f9' }}>
                        Public Page
                      </th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#f1f5f9' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} style={{ borderBottom: '1px solid #475569' }}>
                        <td style={{ padding: '1rem 0.75rem' }}>
                          <div style={{ fontWeight: '500', color: '#f1f5f9' }}>
                            {project.name}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                          <Badge variant={project.is_public ? 'success' : 'warning'}>
                            {project.is_public ? 'Public' : 'Private'}
                          </Badge>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                          {project.is_public ? (
                            <a 
                              href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/status/${project.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                color: '#60a5fa', 
                                fontSize: '0.875rem',
                                textDecoration: 'none'
                              }}
                              onMouseOver={(e) => e.target.style.color = '#3b82f6'}
                              onMouseOut={(e) => e.target.style.color = '#60a5fa'}
                            >
                              View Page
                              <svg 
                                style={{ width: '1em', height: '1em', marginLeft: '0.25rem' }} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleProjectPrivacy(project.id, !project.is_public)}
                            >
                              Make {project.is_public ? 'Private' : 'Public'}
                            </Button>
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchIncidents(project.id)}
                            >
                              View Incidents
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </Card.Body>
          </Card>
        </div>

        {/* Incidents Section */}
        {selectedProject && (
          <Card style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <Card.Header>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#f1f5f9' }}>
                  Incidents - {projects.find(p => p.id === selectedProject)?.name}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(null)
                      setIncidents([])
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateIncident(true)}
                  >
                    Create Incident
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {incidents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ 
                    width: '3rem', 
                    height: '3rem', 
                    backgroundColor: '#334155', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 0.75rem auto' 
                  }}>
                    <svg style={{ width: '1.5rem', height: '1.5rem', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h4 style={{ fontWeight: '500', color: '#f1f5f9', marginBottom: '0.25rem' }}>No incidents</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>This project has no incidents yet.</p>
                  <Button size="sm" onClick={() => setShowCreateIncident(true)}>
                    Create First Incident
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {incidents.map((incident) => (
                    <div key={incident.id} style={{ 
                      padding: '1rem', 
                      border: '1px solid #475569', 
                      borderRadius: '0.5rem',
                      backgroundColor: '#334155'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontWeight: '500', color: '#f1f5f9' }}>{incident.title}</h4>
                        <Badge variant={
                          incident.status === 'resolved' ? 'success' :
                          incident.status === 'investigating' ? 'warning' :
                          incident.status === 'identified' ? 'primary' : 'danger'
                        }>
                          {incident.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{incident.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span>Created {moment(incident.created_at).fromNow()}</span>
                        {incident.scheduled_start && (
                          <span>Scheduled: {moment(incident.scheduled_start).format('MMM D, YYYY HH:mm')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal 
        isOpen={showCreateProject} 
        onClose={() => setShowCreateProject(false)}
        size="md"
      >
        <Modal.Header onClose={() => setShowCreateProject(false)}>
          Create New Project
        </Modal.Header>
        <form onSubmit={projectForm.handleSubmit(onCreateProject)}>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Project Name"
                error={projectForm.formState.errors.name?.message}
                disabled={projectForm.formState.isSubmitting}
                {...projectForm.register('name')}
                placeholder="Enter project name"
              />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="is_public"
                  style={{ 
                    width: '1rem', 
                    height: '1rem', 
                    accentColor: '#3b82f6',
                    marginRight: '0.5rem'
                  }}
                  disabled={projectForm.formState.isSubmitting}
                  {...projectForm.register('is_public')}
                />
                <label htmlFor="is_public" style={{ fontSize: '0.875rem', color: '#e2e8f0' }}>
                  Create public status page
                </label>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateProject(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              loading={projectForm.formState.isSubmitting}
            >
              Create Project
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Create Incident Modal */}
      <Modal 
        isOpen={showCreateIncident} 
        onClose={() => setShowCreateIncident(false)}
        size="lg"
      >
        <Modal.Header onClose={() => setShowCreateIncident(false)}>
          Create New Incident
        </Modal.Header>
        <form onSubmit={incidentForm.handleSubmit(onCreateIncident)}>
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Incident Title"
                error={incidentForm.formState.errors.title?.message}
                disabled={incidentForm.formState.isSubmitting}
                {...incidentForm.register('title')}
                placeholder="Brief description of the incident"
              />
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: '#e2e8f0', 
                  marginBottom: '0.25rem' 
                }}>Description</label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: incidentForm.formState.errors.description ? '1px solid #ef4444' : '1px solid #475569',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#334155',
                    color: '#f1f5f9',
                    resize: 'vertical'
                  }}
                  rows="4"
                  disabled={incidentForm.formState.isSubmitting}
                  {...incidentForm.register('description')}
                  placeholder="Detailed description of the incident"
                />
                {incidentForm.formState.errors.description && (
                  <p style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {incidentForm.formState.errors.description.message}
                  </p>
                )}
              </div>
              <Input
                label="Scheduled Start (Optional)"
                type="datetime-local"
                disabled={incidentForm.formState.isSubmitting}
                {...incidentForm.register('scheduled_start')}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowCreateIncident(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              loading={incidentForm.formState.isSubmitting}
            >
              Create Incident
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  )
} 