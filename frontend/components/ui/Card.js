import React from 'react'

const Card = ({ 
  children, 
  style = {},
  ...props 
}) => {
  const cardStyles = {
    backgroundColor: '#1e293b',
    border: '1px solid #475569',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    ...style
  }
  
  return (
    <div style={cardStyles} {...props}>
      {children}
    </div>
  )
}

const CardHeader = ({ 
  children, 
  style = {},
  ...props 
}) => {
  const headerStyles = {
    padding: '1.5rem 1.5rem 0 1.5rem',
    borderBottom: '1px solid #475569',
    marginBottom: '1.5rem',
    ...style
  }
  
  return (
    <div style={headerStyles} {...props}>
      {children}
    </div>
  )
}

const CardBody = ({ 
  children, 
  style = {},
  ...props 
}) => {
  const bodyStyles = {
    padding: '1.5rem',
    ...style
  }
  
  return (
    <div style={bodyStyles} {...props}>
      {children}
    </div>
  )
}

const CardFooter = ({ 
  children, 
  style = {},
  ...props 
}) => {
  const footerStyles = {
    padding: '1.5rem 1.5rem 1.5rem 1.5rem',
    borderTop: '1px solid #475569',
    marginTop: '1.5rem',
    ...style
  }
  
  return (
    <div style={footerStyles} {...props}>
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter

export default Card