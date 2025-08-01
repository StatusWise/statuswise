import React, { useState } from 'react'

const Alert = ({ 
  children, 
  variant = 'info', 
  dismissible = false,
  onDismiss,
  style = {},
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(true)
  
  const getVariantStyles = (variant) => {
    const variants = {
      success: {
        backgroundColor: '#064e3b',
        borderColor: '#059669',
        color: '#34d399'
      },
      error: {
        backgroundColor: '#450a0a',
        borderColor: '#dc2626',
        color: '#fca5a5'
      },
      warning: {
        backgroundColor: '#451a03',
        borderColor: '#d97706',
        color: '#fbbf24'
      },
      info: {
        backgroundColor: '#1e3a8a',
        borderColor: '#3b82f6',
        color: '#93c5fd'
      }
    }
    return variants[variant] || variants.info
  }
  
  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }
  
  if (!isVisible) return null
  
  const alertStyles = {
    padding: '1rem',
    borderRadius: '0.375rem',
    border: '1px solid',
    borderLeftWidth: '4px',
    animation: 'fadeIn 0.3s ease-in-out',
    ...getVariantStyles(variant),
    ...style
  }
  
  const buttonStyles = {
    marginLeft: '1rem',
    color: 'currentColor',
    opacity: 0.7,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '0.25rem',
    transition: 'opacity 0.2s'
  }
  
  return (
    <div style={alertStyles} role="alert" {...props}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            style={buttonStyles}
            onMouseOver={(e) => e.target.style.opacity = 1}
            onMouseOut={(e) => e.target.style.opacity = 0.7}
            aria-label="Dismiss alert"
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default Alert