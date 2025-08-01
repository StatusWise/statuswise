import React from 'react'

const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  style = {},
  ...props 
}) => {
  
  const getVariantStyles = (variant) => {
    const variants = {
      primary: {
        backgroundColor: '#3b82f6',
        color: '#ffffff'
      },
      secondary: {
        backgroundColor: '#6b7280',
        color: '#ffffff'
      },
      success: {
        backgroundColor: '#10b981',
        color: '#ffffff'
      },
      danger: {
        backgroundColor: '#ef4444',
        color: '#ffffff'
      },
      warning: {
        backgroundColor: '#f59e0b',
        color: '#ffffff'
      },
      info: {
        backgroundColor: '#06b6d4',
        color: '#ffffff'
      }
    }
    return variants[variant] || variants.primary
  }
  
  const getSizeStyles = (size) => {
    const sizes = {
      sm: {
        padding: '0.125rem 0.5rem',
        fontSize: '0.75rem'
      },
      md: {
        padding: '0.25rem 0.75rem',
        fontSize: '0.875rem'
      },
      lg: {
        padding: '0.375rem 1rem',
        fontSize: '1rem'
      }
    }
    return sizes[size] || sizes.md
  }
  
  const badgeStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    fontWeight: '500',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    ...getSizeStyles(size),
    ...getVariantStyles(variant),
    ...style
  }
  
  return (
    <span style={badgeStyles} {...props}>
      {children}
    </span>
  )
}

export default Badge