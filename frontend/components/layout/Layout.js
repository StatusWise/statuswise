import React from 'react'
import Navigation from './Navigation'

const Layout = ({ children, currentUser, subscription, showNavigation = true }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && (
        <Navigation currentUser={currentUser} subscription={subscription} />
      )}
      <main className={showNavigation ? 'pt-0' : ''}>
        {children}
      </main>
    </div>
  )
}

export default Layout