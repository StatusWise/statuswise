import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  className = '',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  ...props 
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full mx-4'
  }

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose()
      }
    }

    const handleFocusTrap = (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('[data-modal]')
        if (!modal) return

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleFocusTrap)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleFocusTrap)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div 
      className="modal-overlay animate-fade-in" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`modal-content ${sizeClasses[size]} ${className}`}
        data-modal
        {...props}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

const ModalHeader = ({ children, onClose, className = '', ...props }) => {
  return (
    <div className={`modal-header ${className}`} {...props}>
      <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
        {children}
      </h3>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

const ModalBody = ({ children, className = '', ...props }) => {
  return (
    <div className={`modal-body ${className}`} {...props}>
      {children}
    </div>
  )
}

const ModalFooter = ({ children, className = '', ...props }) => {
  return (
    <div className={`modal-footer ${className}`} {...props}>
      {children}
    </div>
  )
}

Modal.Header = ModalHeader
Modal.Body = ModalBody
Modal.Footer = ModalFooter

export default Modal