import React, { useEffect, useState } from 'react'
import '../styles/globals.css'
import configService from '../utils/config'
import logger from '../utils/logger'

// Create a React context for configuration
export const ConfigContext = React.createContext({
  config: null,
  isLoaded: false,
  isBillingEnabled: () => false,
  isAdminEnabled: () => false,
  isFeatureEnabled: () => false
})

export default function MyApp({ Component, pageProps }) {
  const [config, setConfig] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('🚀 Initializing StatusWise application...')
        
        // Load configuration from backend
        const appConfig = await configService.loadConfig()
        setConfig(appConfig)
        setIsLoaded(true)
        
        logger.info('✅ Application initialized successfully')
      } catch (error) {
        logger.error('❌ Failed to initialize application:', error)
        // Still mark as loaded to continue with fallback config
        setIsLoaded(true)
      }
    }

    initializeApp()
  }, [])

  // Show loading screen while configuration is being loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading StatusWise</h2>
          <p className="text-gray-600">Initializing application configuration...</p>
        </div>
      </div>
    )
  }

  const contextValue = {
    config,
    isLoaded,
    isBillingEnabled: () => configService.isBillingEnabled(),
    isAdminEnabled: () => configService.isAdminEnabled(),
    isFeatureEnabled: (feature) => configService.isFeatureEnabled(feature)
  }

  return (
    <ConfigContext.Provider value={contextValue}>
      <Component {...pageProps} />
    </ConfigContext.Provider>
  )
} 