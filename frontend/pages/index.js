import React from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem' }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: '700', 
          marginBottom: '1rem', 
          color: '#f1f5f9',
          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          StatusWise
        </h1>
        <p style={{ 
          fontSize: '1.25rem', 
          marginBottom: '2rem', 
          color: '#94a3b8',
          lineHeight: '1.6'
        }}>
          Simple incident management for your projects
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#2563eb'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#3b82f6'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onClick={() => router.push('/login')}
          >
            Login
          </button>
          <button 
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#059669'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#10b981'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            onClick={() => router.push('/signup')}
          >
            Sign Up
          </button>
        </div>
        
        {/* Optional: Add some feature highlights */}
        <div style={{ 
          marginTop: '3rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{ 
            backgroundColor: '#1e293b',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155'
          }}>
            <div style={{ 
              fontSize: '2rem',
              marginBottom: '0.5rem'
            }}>📊</div>
            <h3 style={{ 
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '0.5rem'
            }}>
              Real-time Monitoring
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: '#94a3b8',
              lineHeight: '1.5'
            }}>
              Track your services and get instant notifications when issues arise.
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: '#1e293b',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155'
          }}>
            <div style={{ 
              fontSize: '2rem',
              marginBottom: '0.5rem'
            }}>👥</div>
            <h3 style={{ 
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '0.5rem'
            }}>
              Team Collaboration
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: '#94a3b8',
              lineHeight: '1.5'
            }}>
              Work together with your team to resolve incidents quickly and efficiently.
            </p>
          </div>
          
          <div style={{ 
            backgroundColor: '#1e293b',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            border: '1px solid #334155'
          }}>
            <div style={{ 
              fontSize: '2rem',
              marginBottom: '0.5rem'
            }}>🚀</div>
            <h3 style={{ 
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#f1f5f9',
              marginBottom: '0.5rem'
            }}>
              Easy Setup
            </h3>
            <p style={{ 
              fontSize: '0.875rem',
              color: '#94a3b8',
              lineHeight: '1.5'
            }}>
              Get started in minutes with our simple and intuitive interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}