import React from 'react'

const Input = React.forwardRef(({
  label,
  error,
  id,
  required = false,
  style = {},
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  const containerStyles = {
    marginBottom: '0.25rem'
  }
  
  const labelStyles = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: '0.25rem'
  }
  
  const inputStyles = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: error ? '1px solid #ef4444' : '1px solid #475569',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    backgroundColor: '#334155',
    color: '#f1f5f9',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
    ...style
  }
  
  const errorStyles = {
    color: '#fca5a5',
    fontSize: '0.75rem',
    marginTop: '0.25rem'
  }
  
  const requiredStyles = {
    color: '#ef4444',
    marginLeft: '0.25rem'
  }
  
  const handleFocus = (e) => {
    e.target.style.outline = 'none'
    e.target.style.borderColor = '#60a5fa'
    e.target.style.boxShadow = '0 0 0 3px rgba(96, 165, 250, 0.1)'
  }
  
  const handleBlur = (e) => {
    e.target.style.borderColor = error ? '#ef4444' : '#475569'
    e.target.style.boxShadow = 'none'
  }
  
  return (
    <div style={containerStyles}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
          {required && <span style={requiredStyles}>*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        style={inputStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} style={errorStyles} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input