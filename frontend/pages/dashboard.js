import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { useRouter } from 'next/router'
import moment from 'moment'

// Zod schemas for validation
const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters long')
    .max(100, 'Project name must be less than 100 characters')
    .transform(val => val.trim())
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
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  // Project form
  const projectForm = useForm({
    resolver: zodResolver(projectSchema),
    mode: 'onBlur'
  })

  // Incident form
  const incidentForm = useForm({
    resolver: zodResolver(incidentSchema),
    mode: 'onBlur'
  })

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscription(res.data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      // Don't set error for subscription fetch failures
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
      console.error('Error fetching projects:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      } else {
        setError('Failed to fetch projects. Please try again.')
      }
    }
  }, [token, router])

  useEffect(() => {
    if (!token) router.push('/login')
    else {
      fetchProjects()
      fetchSubscriptionStatus()
    }
  }, [token, router, fetchProjects, fetchSubscriptionStatus])

  // Check for subscription success/cancel messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const subscriptionStatus = urlParams.get('subscription')
    
    if (subscriptionStatus === 'success') {
      setError('')
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
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/projects/`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      projectForm.reset()
      await fetchProjects()
      await fetchSubscriptionStatus() // Refresh usage
    } catch (error) {
      console.error('Error creating project:', error)
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
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncidents(res.data)
    } catch (error) {
      console.error('Error fetching incidents:', error)
      setIncidents([])
      setError('Failed to fetch incidents. Please try again.')
    }
  }

  const onCreateIncident = async (data) => {
    setError('')
    
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/incidents/`, {
        project_id: selectedProject,
        ...data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      incidentForm.reset()
      await fetchIncidents(selectedProject)
    } catch (error) {
      console.error('Error creating incident:', error)
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

  return (
    <div className="min-h-screen p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          {subscription && (
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                subscription.tier === 'pro' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {subscription.tier?.toUpperCase() || 'FREE'}
              </span>
              {subscription.tier === 'free' && (
                <button
                  onClick={() => router.push('/subscription')}
                  className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => router.push('/subscription')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Subscription
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Subscription Status Card */}
      {subscription && (
        <div className="bg-white p-4 rounded shadow mb-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900">
                {subscription.tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
              </h3>
              <div className="text-sm text-gray-600 mt-1">
                Projects: {subscription.usage.projects} / {subscription.limits.max_projects}
                {subscription.tier === 'free' && subscription.usage.projects >= subscription.limits.max_projects && (
                  <span className="text-red-600 ml-2">Limit reached!</span>
                )}
              </div>
            </div>
            {subscription.tier === 'free' && (
              <div className="text-right">
                <button
                  onClick={() => router.push('/subscription')}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm"
                >
                  Upgrade to Pro
                </button>
                <div className="text-xs text-gray-500 mt-1">
                  Get 10 projects & more features
                </div>
              </div>
            )}
            {subscription.tier === 'pro' && subscription.status && (
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  subscription.status === 'active' ? 'text-green-600' : 
                  subscription.status === 'on_trial' ? 'text-blue-600' : 'text-yellow-600'
                }`}>
                  {subscription.status === 'on_trial' ? 'Trial Active' : 
                   subscription.status === 'active' ? 'Active' : subscription.status}
                </div>
                {subscription.expires_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    {subscription.status === 'on_trial' ? 'Trial ends' : 'Next billing'}: {' '}
                    {new Date(subscription.expires_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow mb-8">
        <h3 className="text-xl font-semibold mb-4">Projects</h3>
        
        <form onSubmit={projectForm.handleSubmit(onCreateProject)} className="mb-4">
          <div className="flex mb-2">
            <input 
              className={`border p-2 flex-1 mr-2 ${projectForm.formState.errors.name ? 'border-red-500' : 'border-gray-300'}`}
              type="text" 
              placeholder="New Project Name" 
              disabled={projectForm.formState.isSubmitting}
              {...projectForm.register('name')}
            />
            <button 
              type="submit"
              className={`px-4 py-2 rounded text-white ${projectForm.formState.isSubmitting ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
              disabled={projectForm.formState.isSubmitting}
            >
              {projectForm.formState.isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
          {projectForm.formState.errors.name && (
            <p className="text-red-500 text-sm">{projectForm.formState.errors.name.message}</p>
          )}
        </form>
        
        <ul>
          {projects.map((project) => (
            <li key={project.id} className="flex justify-between items-center py-2 border-b">
              <span className="font-medium">{project.name}</span>
              <button 
                className="bg-gray-300 hover:bg-gray-400 px-3 py-1 rounded"
                onClick={() => fetchIncidents(project.id)}
              >
                View Incidents
              </button>
            </li>
          ))}
        </ul>
        {projects.length === 0 && (
          <p className="text-gray-500 text-center py-4">No projects yet. Create your first project above!</p>
        )}
      </div>

      {selectedProject && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-4">Incidents for Project {selectedProject}</h3>
          
          <form onSubmit={incidentForm.handleSubmit(onCreateIncident)} className="mb-4">
            <div className="mb-2">
              <input 
                className={`border p-2 w-full ${incidentForm.formState.errors.title ? 'border-red-500' : 'border-gray-300'}`}
                type="text" 
                placeholder="Incident Title" 
                disabled={incidentForm.formState.isSubmitting}
                {...incidentForm.register('title')}
              />
              {incidentForm.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">{incidentForm.formState.errors.title.message}</p>
              )}
            </div>
            
            <div className="mb-2">
              <textarea 
                className={`border p-2 w-full h-24 resize-vertical ${incidentForm.formState.errors.description ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Description (detailed explanation of the incident)" 
                disabled={incidentForm.formState.isSubmitting}
                {...incidentForm.register('description')}
              />
              {incidentForm.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">{incidentForm.formState.errors.description.message}</p>
              )}
            </div>
            
            <div className="mb-2">
              <input
                className="border border-gray-300 p-2 w-full"
                type="datetime-local"
                placeholder="Scheduled Start (optional)"
                disabled={incidentForm.formState.isSubmitting}
                {...incidentForm.register('scheduled_start')}
              />
              <p className="text-gray-500 text-sm mt-1">Optional: Schedule this incident for a future maintenance window</p>
            </div>
            
            <button 
              type="submit"
              className={`px-4 py-2 rounded text-white ${incidentForm.formState.isSubmitting ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
              disabled={incidentForm.formState.isSubmitting}
            >
              {incidentForm.formState.isSubmitting ? 'Creating...' : 'Create Incident'}
            </button>
          </form>
          
          <ul>
            {incidents.map((incident) => (
              <li key={incident.id} className="py-4 border-b flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold text-lg">{incident.title}</div>
                  <div className="text-gray-600 mt-1">{incident.description}</div>
                  {incident.scheduled_start && (
                    <div className="text-sm text-yellow-600 mt-1">
                      Scheduled for: {moment(incident.scheduled_start).format('LLL')}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-1">Reported: {moment(incident.created_at).format('LLL')}</div>
                  <div className={`mt-1 font-medium ${incident.resolved ? 'text-green-600' : 'text-red-500'}`}>
                    {incident.resolved
                      ? `Resolved at ${moment(incident.resolved_at).format('LLL')}`
                      : 'Open'}
                  </div>
                </div>
                {!incident.resolved && (
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded ml-4 flex-shrink-0"
                    onClick={async () => {
                      try {
                        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${incident.id}/resolve`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        await fetchIncidents(selectedProject);
                      } catch (error) {
                        console.error('Error resolving incident:', error)
                        setError('Failed to resolve incident. Please try again.')
                      }
                    }}
                  >
                    Resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
          {incidents.length === 0 && (
            <p className="text-gray-500 text-center py-4">No incidents reported for this project yet.</p>
          )}
        </div>
      )}
    </div>
  )
} 