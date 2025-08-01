import React from 'react'

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  style = {},
  ...props
}, ref) => {
  
  const getVariantStyles = (variant) => {
    const variants = {
      primary: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: '1px solid #3b82f6',
        '&:hover': { backgroundColor: '#2563eb' }
      },
      secondary: {
        backgroundColor: '#6b7280',
        color: '#ffffff',
        border: '1px solid #6b7280',
        '&:hover': { backgroundColor: '#4b5563' }
      },
      success: {
        backgroundColor: '#10b981',
        color: '#ffffff',
        border: '1px solid #10b981',
        '&:hover': { backgroundColor: '#059669' }
      },
      danger: {
        backgroundColor: '#ef4444',
        color: '#ffffff',
        border: '1px solid #ef4444',
        '&:hover': { backgroundColor: '#dc2626' }
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#94a3b8',
        border: '1px solid #475569',
        '&:hover': { backgroundColor: '#334155', color: '#f1f5f9' }
      }
    }
    return variants[variant] || variants.primary
  }
  
  const getSizeStyles = (size) => {
    const sizes = {
      sm: {
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem'
      },
      md: {
        padding: '0.5rem 1rem',
        fontSize: '0.875rem'
      },
      lg: {
        padding: '0.75rem 1.5rem',
        fontSize: '1rem'
      }
    }
    return sizes[size] || sizes.md
  }
  
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.375rem',
    fontWeight: '500',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 0.2s ease-in-out',
    textDecoration: 'none',
    ...getSizeStyles(size),
    ...getVariantStyles(variant),
    ...style
  }
  
  const handleMouseOver = (e) => {
    if (disabled || loading) return
    const hoverStyles = getVariantStyles(variant)['&:hover']
    if (hoverStyles) {
      Object.assign(e.target.style, hoverStyles)
    }
  }
  
  const handleMouseOut = (e) => {
    if (disabled || loading) return
    const normalStyles = getVariantStyles(variant)
    Object.assign(e.target.style, {
      backgroundColor: normalStyles.backgroundColor,
      color: normalStyles.color
    })
  }
  
  const spinnerStyles = {
    width: '1rem',
    height: '1rem',
    marginRight: '0.5rem',
    animation: 'spin 1s linear infinite'
  }
  
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      style={baseStyles}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      {...props}
    >
      {loading && (
        <svg 
          style={spinnerStyles}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4" 
            fill="none"
            style={{ opacity: 0.25 }}
          />
          <path 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            style={{ opacity: 0.75 }}
          />
        </svg>
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button