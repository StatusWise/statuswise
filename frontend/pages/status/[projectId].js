import React from 'react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import axios from 'axios'
import moment from 'moment'

export default function PublicStatus() {
  const router = useRouter()
  const { projectId } = router.query
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return
    
    setLoading(true)
    setError(null)
    
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/public/${projectId}`)
      .then(res => {
        setIncidents(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching incidents:', err)
        setError(err.response?.data?.message || 'Failed to load incidents')
        setLoading(false)
      })
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen p-10 bg-white">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-10 bg-white">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
          <div className="text-red-600 text-center">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-10 bg-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Project Status</h1>
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Incidents</h2>
        <ul>
          {incidents.map((incident) => (
            <li key={incident.id} className="py-2 border-b">
              <div className="font-bold">{incident.title}</div>
              <div className="text-gray-600">{incident.description}</div>
              <div className="text-sm text-gray-500">Reported: {moment(incident.created_at).format('LLL')}</div>
              <div className={`mt-1 ${incident.resolved ? 'text-green-600' : 'text-red-500'}`}>
                {incident.resolved ? `Resolved at ${moment(incident.resolved_at).format('LLL')}` : 'Open' }
              </div>
            </li>
          ))}
          {incidents.length === 0 && (
            <div className="text-gray-500 text-center">No incidents reported</div>
          )}
        </ul>
      </div>
    </div>
  )
} 