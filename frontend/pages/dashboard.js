import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import moment from 'moment'

export default function Dashboard() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState('')
  const [selectedProject, setSelectedProject] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [newIncidentTitle, setNewIncidentTitle] = useState('')
  const [newIncidentDescription, setNewIncidentDescription] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  const fetchProjects = useCallback(async () => {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/projects/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setProjects(res.data)
  }, [token])

  useEffect(() => {
    if (!token) router.push('/login')
    fetchProjects()
  }, [token, router, fetchProjects])

  const createProject = async () => {
    if (!newProject.trim()) {
      alert("Project name is required");
      return;
    }
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/projects/`, { name: newProject.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewProject('')
      fetchProjects()
    } catch (error) {
      console.error('Error creating project:', error)
      // Keep the form state intact on error
    }
  }

  const fetchIncidents = async (projectId) => {
    setSelectedProject(projectId)
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIncidents(res.data)
    } catch (error) {
      console.error('Error fetching incidents:', error)
      setIncidents([])
    }
  }

  const createIncident = async () => {
    if (!newIncidentTitle.trim() || !newIncidentDescription.trim()) {
      alert("Incident title and description are required");
      return;
    }
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/incidents/`, {
        project_id: selectedProject,
        title: newIncidentTitle.trim(),
        description: newIncidentDescription.trim(),
        scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewIncidentTitle('')
      setNewIncidentDescription('')
      setScheduledStart('')
      fetchIncidents(selectedProject)
    } catch (error) {
      console.error('Error creating incident:', error)
      // Keep the form state intact on error
    }
  }

  return (
    <div className="min-h-screen p-10">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="bg-white p-6 rounded shadow mb-8">
        <h3 className="text-xl font-semibold mb-4">Projects</h3>
        <div className="flex mb-4">
          <input className="border p-2 flex-1 mr-2" type="text" placeholder="New Project Name" value={newProject} onChange={e => setNewProject(e.target.value)} />
          <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={createProject}>Create</button>
        </div>
        <ul>
          {projects.map((project) => (
            <li key={project.id} className="flex justify-between items-center py-2">
              {project.name}
              <button className="bg-gray-300 px-2 py-1 rounded" onClick={() => fetchIncidents(project.id)}>Incidents</button>
            </li>
          ))}
        </ul>
      </div>

      {selectedProject && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-4">Incidents for Project {selectedProject}</h3>
          <input className="border p-2 w-full mb-2" type="text" placeholder="Incident Title" value={newIncidentTitle} onChange={e => setNewIncidentTitle(e.target.value)} />
          <textarea className="border p-2 w-full mb-2" placeholder="Description" value={newIncidentDescription} onChange={e => setNewIncidentDescription(e.target.value)} />
          <input
            className="border p-2 w-full mb-2"
            type="datetime-local"
            placeholder="Scheduled Start (optional)"
            onChange={(e) => setScheduledStart(e.target.value)}
          />
          <button className="bg-green-500 text-white px-4 py-2 rounded mb-4" onClick={createIncident}>
            Create Incident
          </button>
          <ul>
            {incidents.map((incident) => (
              <li key={incident.id} className="py-2 border-b flex justify-between items-center">
                <div>
                  <div className="font-bold">{incident.title}</div>
                  <div className="text-gray-600">{incident.description}</div>
                  {incident.scheduled_start && (
                    <div className="text-sm text-yellow-600">
                      Scheduled for: {moment(incident.scheduled_start).format('LLL')}
                    </div>
                  )}
                  <div className="text-sm text-gray-500">Reported: {moment(incident.created_at).format('LLL')}</div>
                  <div className={`mt-1 ${incident.resolved ? 'text-green-600' : 'text-red-500'}`}>
                    {incident.resolved
                      ? `Resolved at ${moment(incident.resolved_at).format('LLL')}`
                      : 'Open'}
                  </div>
                </div>
                {!incident.resolved && (
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded ml-4"
                    onClick={async () => {
                      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${incident.id}/resolve`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      fetchIncidents(selectedProject);
                    }}
                  >
                    Close
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
} 