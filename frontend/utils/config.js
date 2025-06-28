import axios from 'axios'
import logger from './logger'

class ConfigService {
  constructor() {
    this.config = null
    this.loaded = false
    this.loading = false
  }

  async loadConfig() {
    if (this.loaded || this.loading) {
      return this.config
    }

    this.loading = true
    
    try {
      logger.info('🔧 Loading application configuration from backend...')
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/config`, {
        timeout: 5000
      })
      
      this.config = response.data
      this.loaded = true
      this.loading = false
      
      logger.info('✅ Configuration loaded successfully:', {
        billing: this.config.billing_enabled ? 'enabled' : 'disabled',
      })
      
      return this.config
    } catch (error) {
      this.loading = false
      logger.error('❌ Failed to load configuration from backend:', error)
      
      // Fallback to safe defaults when backend is unreachable
      this.config = {
        billing_enabled: false,
        features: {
          subscription_management: false,
          billing_webhooks: false,
          subscription_limits: false
        }
      }
      
      logger.warn('⚠️  Using fallback configuration with all features disabled')
      return this.config
    }
  }

  isBillingEnabled() {
    return this.config?.billing_enabled ?? false
  }

  isFeatureEnabled(featureName) {
    return this.config?.features?.[featureName] ?? false
  }

  getConfig() {
    return this.config
  }

  isLoaded() {
    return this.loaded
  }
}

// Singleton instance
const configService = new ConfigService()

export default configService 