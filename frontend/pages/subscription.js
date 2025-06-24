import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import logger from '../utils/logger'

export default function Subscription() {
  const router = useRouter()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubscription(response.data)
    } catch (error) {
      logger.error('Error fetching subscription:', error)
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      } else {
        setError('Failed to load subscription information')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/subscription/create-checkout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Redirect to Lemon Squeezy checkout
      window.location.href = response.data.checkout_url
    } catch (error) {
      logger.error('Error creating checkout:', error)
      setError('Failed to create checkout session. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  const getTierColor = (tier) => {
    return tier === 'pro' ? 'text-purple-600' : 'text-gray-600'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'on_trial': return 'text-blue-600'
      case 'canceled': return 'text-red-600'
      case 'past_due': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {subscription && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Current Plan */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Tier:</span>
                    <span className={`font-semibold uppercase ${getTierColor(subscription.tier)}`}>
                      {subscription.tier}
                    </span>
                  </div>
                  
                  {subscription.status && (
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <span className={`font-semibold ${getStatusColor(subscription.status)}`}>
                        {subscription.status.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  
                  {subscription.expires_at && (
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {subscription.status === 'on_trial' ? 'Trial Ends:' : 'Next Billing:'}
                      </span>
                      <span className="text-gray-700">
                        {new Date(subscription.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage & Limits */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Usage & Limits</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Projects</span>
                      <span className="text-sm text-gray-600">
                        {subscription.usage.projects} / {subscription.limits.max_projects}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min((subscription.usage.projects / subscription.limits.max_projects) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p><strong>Incidents per project:</strong> {subscription.limits.max_incidents_per_project}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="md:col-span-2 bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Features</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {subscription.limits.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm capitalize">
                        {feature.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Section */}
          {subscription?.tier === 'free' && (
            <div className="mt-8 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg p-8 text-white">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Upgrade to Pro</h2>
                <p className="text-lg mb-6 opacity-90">
                  Get more projects, incidents, and advanced features
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mb-8 text-sm">
                  <div className="bg-white bg-opacity-20 rounded-lg p-4">
                    <div className="font-semibold">10 Projects</div>
                    <div className="opacity-75">vs 1 on Free</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4">
                    <div className="font-semibold">100 Incidents</div>
                    <div className="opacity-75">per project</div>
                  </div>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4">
                    <div className="font-semibold">Advanced Features</div>
                    <div className="opacity-75">Custom domain & more</div>
                  </div>
                </div>
                
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-white text-purple-600 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upgrading ? 'Creating checkout...' : 'Upgrade to Pro'}
                </button>
              </div>
            </div>
          )}

          {/* Pro Plan Active */}
          {subscription?.tier === 'pro' && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-center">
                <div className="text-green-600 text-2xl font-bold mb-2">Pro Plan Active</div>
                <p className="text-green-700">
                  You have access to all StatusWise features. 
                  {subscription.status === 'on_trial' && ' Your trial is active!'}
                </p>
                {subscription.status === 'canceled' && (
                  <p className="text-yellow-700 mt-2">
                    Your subscription is canceled but remains active until the end of your billing period.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 